"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import {
  getActorLogContext,
  logActivity,
} from "@/lib/helpers/activity-log";
import { createNotification } from "@/lib/actions/notifications";
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Profile not found." };
  }

  if (!["owner", "admin", "manager"].includes(profile.role)) {
    return { success: false, error: "Insufficient permissions." };
  }

  if (input.isDefault && profile.role === "manager") {
    return {
      success: false,
      error: "Only owners can set the default template.",
    };
  }

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

  try {
    void logActivity({
      orgId: organizationId,
      eventType: "template_created",
      actorId: user.id,
      actorName: profile.full_name,
      entityType: "template",
      entityId: template.id,
      entityName: input.name.trim(),
    });
  } catch (logError) {
    console.error("[activity-log] Failed to log template create:", logError);
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
  const admin = await requireAdminUser();
  const supabase = await createClient();

  if (!input.name.trim()) {
    return { success: false, error: "Template name is required." };
  }
  if (input.fields.length === 0) {
    return { success: false, error: "At least one field is required." };
  }

  const keys = input.fields.map((field) => field.key);
  if (keys.some((key) => !key || !key.trim())) {
    return { success: false, error: "Every field needs a key." };
  }
  if (new Set(keys).size !== keys.length) {
    return { success: false, error: "Field keys must be unique." };
  }

  const { data: current, error: currentError } = await supabase
    .from("report_templates")
    .select("organization_id, is_default")
    .eq("id", input.id)
    .maybeSingle();

  if (currentError || !current) {
    return { success: false, error: "Template not found." };
  }

  // The org must always keep a default template: demoting is only allowed
  // by promoting a different template.
  if (current.is_default && input.isDefault === false) {
    return {
      success: false,
      error: "Set another template as default first.",
    };
  }

  const nextIsDefault = input.isDefault ?? current.is_default;
  const promoting = nextIsDefault && !current.is_default;

  // Promote: the partial unique index allows one default per org, so the old
  // default has to be unset first (and restored if the update fails).
  let previousDefaultId: string | null = null;
  if (promoting) {
    const { data: previousDefault, error: previousError } = await supabase
      .from("report_templates")
      .select("id")
      .eq("organization_id", current.organization_id)
      .eq("is_default", true)
      .is("archived_at", null)
      .neq("id", input.id)
      .maybeSingle();

    if (previousError) {
      return { success: false, error: "Failed to update template." };
    }

    if (previousDefault) {
      const { error: unsetError } = await supabase
        .from("report_templates")
        .update({ is_default: false })
        .eq("id", previousDefault.id);

      if (unsetError) {
        return { success: false, error: "Failed to update template." };
      }
      previousDefaultId = previousDefault.id;
    }
  }

  const { error: tmplError } = await supabase
    .from("report_templates")
    .update({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      is_default: nextIsDefault,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);

  if (tmplError) {
    if (previousDefaultId) {
      const { error: restoreError } = await supabase
        .from("report_templates")
        .update({ is_default: true })
        .eq("id", previousDefaultId);

      if (restoreError) {
        console.error(
          "[templates] Failed to restore previous default template:",
          restoreError,
        );
      }
    }
    return { success: false, error: "Failed to update template." };
  }

  // Upsert by (template_id, key) so existing fields keep their ids; nothing
  // is deleted until the new definitions are safely written.
  const { error: fieldsError } = await supabase
    .from("template_fields")
    .upsert(toFieldRows(input.id, input.fields), {
      onConflict: "template_id,key",
    });

  if (fieldsError) {
    return { success: false, error: "Failed to update template fields." };
  }

  const { data: existingFields, error: existingFieldsError } = await supabase
    .from("template_fields")
    .select("key")
    .eq("template_id", input.id);

  if (existingFieldsError) {
    return { success: false, error: "Failed to update template fields." };
  }

  const keepKeys = new Set(keys);
  const removedKeys = (existingFields ?? [])
    .map((field) => field.key)
    .filter((key) => !keepKeys.has(key));

  if (removedKeys.length > 0) {
    const { error: removeError } = await supabase
      .from("template_fields")
      .delete()
      .eq("template_id", input.id)
      .in("key", removedKeys);

    if (removeError) {
      return { success: false, error: "Failed to update template fields." };
    }
  }

  try {
    const { orgId, actorName } = await getActorLogContext(admin.id);
    if (orgId) {
      void logActivity({
        orgId,
        eventType: "template_edited",
        actorId: admin.id,
        actorName: actorName ?? undefined,
        entityType: "template",
        entityId: input.id,
        entityName: input.name.trim(),
      });
    }
  } catch (logError) {
    console.error("[activity-log] Failed to log template edit:", logError);
  }

  revalidatePath("/organization");
  revalidatePath("/organization/templates");
  revalidatePath(`/organization/templates/${input.id}`);
  revalidatePath("/reports");
  revalidatePath("/");
  return { success: true };
}

export async function archiveTemplate(
  templateId: string,
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdminUser();
  const supabase = await createClient();

  const { data: tmpl } = await supabase
    .from("report_templates")
    .select("is_default, name")
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

  try {
    const { orgId, actorName } = await getActorLogContext(admin.id);
    if (orgId) {
      void logActivity({
        orgId,
        eventType: "template_archived",
        actorId: admin.id,
        actorName: actorName ?? undefined,
        entityType: "template",
        entityId: templateId,
        entityName: tmpl?.name ?? undefined,
      });
    }
  } catch (logError) {
    console.error("[activity-log] Failed to log template archive:", logError);
  }

  revalidatePath("/organization/templates");
  return { success: true };
}

export async function deleteTemplate(
  templateId: string,
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdminUser();
  const supabase = await createClient();

  const { data: tmpl } = await supabase
    .from("report_templates")
    .select("is_default, name")
    .eq("id", templateId)
    .single();

  if (tmpl?.is_default) {
    return {
      success: false,
      error: "Cannot delete the default template.",
    };
  }

  const { count } = await supabase
    .from("daily_reports")
    .select("id", { count: "exact", head: true })
    .eq("template_id", templateId);

  if (count && count > 0) {
    return {
      success: false,
      error: `This template has been used in ${count} report${count !== 1 ? "s" : ""}. Archive it instead of deleting.`,
    };
  }

  const { error } = await supabase
    .from("report_templates")
    .delete()
    .eq("id", templateId);

  if (error) {
    return { success: false, error: "Failed to delete template." };
  }

  // Log only once the delete has actually succeeded.
  try {
    const { orgId, actorName } = await getActorLogContext(admin.id);
    if (orgId) {
      void logActivity({
        orgId,
        eventType: "template_edited",
        actorId: admin.id,
        actorName: actorName ?? undefined,
        entityType: "template",
        entityName: tmpl?.name ?? undefined,
        metadata: { action: "deleted" },
      });
    }
  } catch (logError) {
    console.error("[activity-log] Failed to log template delete:", logError);
  }

  revalidatePath("/organization/templates");
  revalidatePath("/organization");
  return { success: true };
}

export async function restoreTemplate(
  templateId: string,
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdminUser();
  const supabase = await createClient();

  const { data: tmpl, error } = await supabase
    .from("report_templates")
    .update({ archived_at: null })
    .eq("id", templateId)
    .select("id, name")
    .single();

  if (error) {
    return { success: false, error: "Failed to restore template." };
  }

  try {
    const { orgId, actorName } = await getActorLogContext(admin.id);
    if (orgId) {
      void logActivity({
        orgId,
        eventType: "template_edited",
        actorId: admin.id,
        actorName: actorName ?? undefined,
        entityType: "template",
        entityId: tmpl?.id,
        entityName: tmpl?.name ?? undefined,
        metadata: { action: "restored" },
      });
    }
  } catch (logError) {
    console.error("[activity-log] Failed to log template restore:", logError);
  }

  revalidatePath("/organization/templates");
  return { success: true };
}

export async function assignDepartmentTemplate(input: {
  departmentId: string;
  templateId: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Profile not found." };
  }

  if (!["owner", "admin"].includes(profile.role)) {
    if (profile.role === "manager") {
      const adminClient = createAdminClient();
      const { data: dept } = await adminClient
        .from("departments")
        .select("manager_id")
        .eq("id", input.departmentId)
        .single();

      if (dept?.manager_id !== user.id) {
        return {
          success: false,
          error: "You can only assign templates to your own department.",
        };
      }
    } else {
      return { success: false, error: "Insufficient permissions." };
    }
  }

  const { error } = await supabase
    .from("departments")
    .update({ template_id: input.templateId })
    .eq("id", input.departmentId);

  if (error) {
    return { success: false, error: "Failed to assign template." };
  }

  try {
    const { orgId, actorName } = await getActorLogContext(user.id);
    const adminClient = createAdminClient();
    const [{ data: dept }, { data: tmpl }] = await Promise.all([
      adminClient
        .from("departments")
        .select("name")
        .eq("id", input.departmentId)
        .maybeSingle(),
      input.templateId
        ? adminClient
            .from("report_templates")
            .select("name")
            .eq("id", input.templateId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    if (orgId) {
      void logActivity({
        orgId,
        eventType: "template_assigned",
        actorId: user.id,
        actorName: actorName ?? profile.full_name,
        entityType: "template",
        entityId: input.templateId ?? undefined,
        entityName: tmpl?.name ?? "none",
        metadata: {
          departmentId: input.departmentId,
          departmentName: dept?.name,
        },
      });
    }
  } catch (logError) {
    console.error("[activity-log] Failed to log template assignment:", logError);
  }

  revalidatePath(`/departments/${input.departmentId}`);
  revalidatePath("/departments");
  revalidatePath("/manager/team");
  return { success: true };
}

export async function assignProfileTemplate(input: {
  profileId: string;
  templateId: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: "Profile not found." };
  }

  if (!["owner", "admin"].includes(profile.role)) {
    if (profile.role === "manager") {
      const departmentIds = profile.department_ids ?? [];
      if (departmentIds.length === 0) {
        return {
          success: false,
          error: "You can only assign templates to members of your department.",
        };
      }

      const { data: membership } = await supabase
        .from("profile_departments")
        .select("profile_id")
        .eq("profile_id", input.profileId)
        .in("department_id", departmentIds)
        .limit(1)
        .maybeSingle();

      if (!membership) {
        return {
          success: false,
          error: "You can only assign templates to members of your department.",
        };
      }
    } else {
      return { success: false, error: "Insufficient permissions." };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ template_id: input.templateId })
    .eq("id", input.profileId);

  if (error) {
    return { success: false, error: "Failed to assign template." };
  }

  try {
    const { orgId, actorName } = await getActorLogContext(user.id);
    const adminClient = createAdminClient();
    const [{ data: target }, { data: tmpl }] = await Promise.all([
      adminClient
        .from("profiles")
        .select("full_name")
        .eq("id", input.profileId)
        .maybeSingle(),
      input.templateId
        ? adminClient
            .from("report_templates")
            .select("name")
            .eq("id", input.templateId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    if (orgId) {
      void logActivity({
        orgId,
        eventType: "template_assigned",
        actorId: user.id,
        actorName: actorName ?? profile.full_name,
        targetId: input.profileId,
        targetName: target?.full_name ?? undefined,
        entityType: "template",
        entityId: input.templateId ?? undefined,
        entityName: tmpl?.name ?? "none",
      });

      // Skip notification for template removal (templateId null) and
      // department-wide (bulk) assignment, which has no target employee.
      if (input.templateId) {
        void createNotification({
          orgId,
          profileId: input.profileId,
          type: "template_assigned",
          title: "Your report template has been updated",
          body: tmpl?.name,
          entityType: "employee",
          entityId: input.profileId,
        });
      }
    }
  } catch (logError) {
    console.error("[activity-log] Failed to log template assignment:", logError);
  }

  revalidatePath(`/employees/${input.profileId}`);
  revalidatePath("/employees");
  revalidatePath("/manager/team");
  return { success: true };
}
