import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  FieldType,
  ReportTemplate,
  ReportTemplateWithFields,
  TemplateField,
} from "@/types/template";

interface TemplateRow {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_by: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  template_fields?: { id: string }[] | null;
}

interface TemplateFieldRow {
  id: string;
  template_id: string;
  key: string;
  label: string;
  placeholder: string | null;
  field_type: FieldType;
  is_required: boolean;
  is_preview: boolean;
  field_order: number;
  options: string[] | null;
  unit: string | null;
  min_value: number | null;
  max_value: number | null;
  created_at: string;
}

interface TemplateWithFieldsRow extends TemplateRow {
  template_fields: TemplateFieldRow[] | null;
}

function mapTemplate(row: TemplateRow): ReportTemplate {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    description: row.description,
    isDefault: row.is_default,
    createdBy: row.created_by,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    fieldCount: row.template_fields?.length,
  };
}

function mapField(row: TemplateFieldRow): TemplateField {
  return {
    id: row.id,
    templateId: row.template_id,
    key: row.key,
    label: row.label,
    placeholder: row.placeholder,
    fieldType: row.field_type,
    isRequired: row.is_required,
    isPreview: row.is_preview,
    fieldOrder: row.field_order,
    options: row.options,
    unit: row.unit,
    minValue: row.min_value,
    maxValue: row.max_value,
    createdAt: row.created_at,
  };
}

function mapTemplateWithFields(
  row: TemplateWithFieldsRow,
): ReportTemplateWithFields {
  return {
    ...mapTemplate(row),
    fields: (row.template_fields ?? [])
      .map(mapField)
      .sort((a, b) => a.fieldOrder - b.fieldOrder),
  };
}

export const getOrgTemplates = cache(async (): Promise<ReportTemplate[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("report_templates")
    .select("*, template_fields(id)")
    .order("is_default", { ascending: false })
    .order("archived_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("Failed to load templates.");
  }

  return ((data ?? []) as TemplateRow[]).map(mapTemplate);
});

export const getOrgTemplatesWithFields = cache(
  async (): Promise<ReportTemplateWithFields[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("report_templates")
      .select("*, template_fields (*)")
      .order("is_default", { ascending: false })
      .order("archived_at", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error("Failed to load templates.");
    }

    return ((data ?? []) as TemplateWithFieldsRow[]).map(mapTemplateWithFields);
  },
);

export const getTemplateWithFields = cache(
  async (templateId: string): Promise<ReportTemplateWithFields | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("report_templates")
      .select(
        `
        *,
        template_fields (*)
      `,
      )
      .eq("id", templateId)
      .single();

    if (error || !data) {
      return null;
    }

    return mapTemplateWithFields(data as TemplateWithFieldsRow);
  },
);

export const getDefaultTemplate = cache(
  async (): Promise<ReportTemplateWithFields | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("report_templates")
      .select(
        `
        *,
        template_fields (*)
      `,
      )
      .eq("is_default", true)
      .is("archived_at", null)
      .single();

    if (error || !data) {
      return null;
    }

    return mapTemplateWithFields(data as TemplateWithFieldsRow);
  },
);

type TemplateSource = "individual" | "department" | "default" | "none";

interface TemplateResolution {
  template: ReportTemplateWithFields | null;
  source: TemplateSource;
  sourceName: string | null;
}

// Keyed by a string so resolveTemplate and getTemplateResolutionInfo share
// one lookup per request (cache() compares arrays by identity).
const resolveTemplateByKey = cache(
  async (profileId: string, departmentKey: string): Promise<TemplateResolution> => {
    const supabase = await createClient();
    const departmentIds = departmentKey ? departmentKey.split(",") : [];

    // Look up the individual and department assignments and the org default
    // together, then load both candidate templates together: two rounds
    // instead of up to five. Priority: individual, then the first department
    // (by name) with a template, then the default.
    const [{ data: profile }, depts, defaultTmplP] = await Promise.all([
      supabase.from("profiles").select("template_id").eq("id", profileId).single(),
      departmentIds.length > 0
        ? supabase
            .from("departments")
            .select("template_id, name")
            .in("id", departmentIds)
            .not("template_id", "is", null)
            .order("name", { ascending: true })
            .limit(1)
            .then((result) => result.data)
        : Promise.resolve(null),
      getDefaultTemplate(),
    ]);

    const dept = depts?.[0] as { template_id: string; name: string } | undefined;
    const [individual, department] = await Promise.all([
      profile?.template_id ? getTemplateWithFields(profile.template_id) : null,
      dept?.template_id ? getTemplateWithFields(dept.template_id) : null,
    ]);

    if (individual && !individual.archivedAt) {
      return { template: individual, source: "individual", sourceName: null };
    }
    if (department && !department.archivedAt) {
      return { template: department, source: "department", sourceName: dept?.name ?? null };
    }

    const defaultTmpl = await defaultTmplP;
    if (defaultTmpl) {
      return { template: defaultTmpl, source: "default", sourceName: null };
    }

    // No individual, department, or default template is available. Callers
    // render a "template not configured" state instead of crashing.
    return { template: null, source: "none", sourceName: null };
  },
);

export const resolveTemplate = cache(
  async (
    profileId: string,
    departmentIds: string[],
  ): Promise<ReportTemplateWithFields | null> => {
    const resolution = await resolveTemplateByKey(profileId, departmentIds.join(","));
    return resolution.template;
  },
);

export async function getTemplateResolutionInfo(
  profileId: string,
  departmentIds: string[],
): Promise<TemplateResolution> {
  return resolveTemplateByKey(profileId, departmentIds.join(","));
}
