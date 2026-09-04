"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import { createClient } from "@/lib/supabase/server";
import type { FieldType } from "@/types/template";

export type TemplateFieldInput = {
  key: string;
  label: string;
  placeholder: string | null;
  fieldType: FieldType;
  isRequired: boolean;
  isPreview: boolean;
  fieldOrder: number;
  options: string[] | null;
  unit: string | null;
  minValue: number | null;
  maxValue: number | null;
};

async function getCurrentOrganizationId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  return profile?.organization_id ?? null;
}

function toFieldRows(templateId: string, fields: TemplateFieldInput[]) {
  return fields.map((field, index) => ({
    template_id: templateId,
    key: field.key,
    label: field.label,
    placeholder: field.placeholder || null,
    field_type: field.fieldType,
    is_required: field.isRequired,
    is_preview: field.isPreview,
    field_order: field.fieldOrder ?? index,
    options: field.options || null,
    unit: field.unit || null,
    min_value: field.minValue,
    max_value: field.maxValue,
  }));
}

export async function createTemplate(input: {
  name: string;
  description?: string;
  isDefault?: boolean;
  fields: TemplateFieldInput[];
}): Promise<{ success: boolean; id?: string; error?: string }> {
  await requireAdminUser();
  const supabase = await createClient();

  if (!input.name.trim()) {
    return { success: false, error: "Template name is required." };
  }
  if (input.fields.length === 0) {
    return { success: false, error: "At least one field is required." };
  }

  const organizationId = await getCurrentOrganizationId();
  if (!organizationId) {
    return { success: false, error: "No organization found." };
  }

  if (input.isDefault) {
    await supabase
      .from("report_templates")
      .update({ is_default: false })
      .eq("organization_id", organizationId)
      .eq("is_default", true);
  }

  const { data: template, error: tmplError } = await supabase
    .from("report_templates")
    .insert({
      organization_id: organizationId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      is_default: input.isDefault ?? false,
    })
    .select("id")
    .single();

  if (tmplError || !template) {
    return { success: false, error: "Failed to create template." };
  }

  const { error: fieldsError } = await supabase
    .from("template_fields")
    .insert(toFieldRows(template.id, input.fields));

  if (fieldsError) {
    await supabase.from("report_templates").delete().eq("id", template.id);
    return { success: false, error: "Failed to save template fields." };
  }

  revalidatePath("/organization/templates");
  return { success: true, id: template.id };
}

export async function updateTemplate(input: {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  fields: TemplateFieldInput[];
}): Promise<{ success: boolean; error?: string }> {
  await requireAdminUser();
  const supabase = await createClient();

  if (!input.name.trim()) {
    return { success: false, error: "Template name is required." };
  }
  if (input.fields.length === 0) {
    return { success: false, error: "At least one field is required." };
  }

  const organizationId = await getCurrentOrganizationId();

  if (input.isDefault) {
    await supabase
      .from("report_templates")
      .update({ is_default: false })
      .eq("organization_id", organizationId ?? "")
      .eq("is_default", true)
      .neq("id", input.id);
  }

  const { error: tmplError } = await supabase
    .from("report_templates")
    .update({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      is_default: input.isDefault ?? false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);

  if (tmplError) {
    return { success: false, error: "Failed to update template." };
  }

  await supabase.from("template_fields").delete().eq("template_id", input.id);

  const { error: fieldsError } = await supabase
    .from("template_fields")
    .insert(toFieldRows(input.id, input.fields));

  if (fieldsError) {
    return { success: false, error: "Failed to update template fields." };
  }

  revalidatePath("/organization/templates");
  revalidatePath(`/organization/templates/${input.id}`);
  return { success: true };
}

export async function archiveTemplate(
  templateId: string,
): Promise<{ success: boolean; error?: string }> {
  await requireAdminUser();
  const supabase = await createClient();

  const { data: tmpl } = await supabase
    .from("report_templates")
    .select("is_default")
    .eq("id", templateId)
    .single();

  if (tmpl?.is_default) {
    return { success: false, error: "Cannot archive the default template." };
  }

  const { error } = await supabase
    .from("report_templates")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", templateId);

  if (error) {
    return { success: false, error: "Failed to archive template." };
  }

  revalidatePath("/organization/templates");
  return { success: true };
}

export async function restoreTemplate(
  templateId: string,
): Promise<{ success: boolean; error?: string }> {
  await requireAdminUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("report_templates")
    .update({ archived_at: null })
    .eq("id", templateId);

  if (error) {
    return { success: false, error: "Failed to restore template." };
  }

  revalidatePath("/organization/templates");
  return { success: true };
}
