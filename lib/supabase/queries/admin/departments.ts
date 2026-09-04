import { cache } from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import { dateNDaysAgo, todayInTimezone } from "@/lib/helpers/dates";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import {
  buildCompletionTrend,
  buildSubmittersByDate,
} from "@/lib/helpers/completion-trend";
import type { CompletionTrendPoint } from "@/types/team-insights";
import type {
  DepartmentListItem,
  DepartmentManager,
  DepartmentMember,
  ManagerCandidate,
} from "@/types/department";

// Logs the full Supabase error (message/code/details/hint are silent
// failure modes if dropped — "duplicate key", "permission denied", and
// "column does not exist" all surface as the same generic message
// otherwise) and throws a friendly error for the UI, with the original
// error attached via `cause` so the stack trace and full error object are
// still inspectable from wherever this is caught/logged upstream.
function logAndThrow(userMessage: string, error: PostgrestError): never {
  console.error(userMessage, {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  });
  throw new Error(userMessage, { cause: error });
}

export const getAllDepartments = cache(
  async (): Promise<DepartmentListItem[]> => {
    await requireAdminUser();

    const supabase = await createClient();

    const { data: departments, error: departmentsError } = await supabase
      .from("departments")
      .select(
        "id, name, organization_id, manager_id, archived_at, created_at, template_id, manager:profiles!departments_manager_id_fkey(full_name)",
      )
      .order("name", { ascending: true });

    if (departmentsError) {
      logAndThrow("Failed to load departments.", departmentsError);
    }

    const { data: memberships, error: countsError } = await supabase
      .from("profile_departments")
      .select("department_id, profiles(archived_at, is_active)");

    if (countsError) {
      logAndThrow("Failed to load department employee counts.", countsError);
    }

    const countByDepartment = new Map<string, number>();
    for (const row of memberships ?? []) {
      const embedded = row.profiles as unknown as
        | { archived_at: string | null; is_active: boolean }
        | { archived_at: string | null; is_active: boolean }[]
        | null;
      const profile = Array.isArray(embedded) ? embedded[0] : embedded;
      if (profile?.archived_at || !profile?.is_active) {
        continue;
      }
      countByDepartment.set(
        row.department_id,
        (countByDepartment.get(row.department_id) ?? 0) + 1,
      );
    }

    interface DepartmentRow {
      id: string;
      name: string;
      organization_id: string | null;
      manager_id: string | null;
      archived_at: string | null;
      created_at: string;
      template_id: string | null;
      manager: { full_name: string } | null;
    }

    return (
      (departments as unknown as DepartmentRow[]) ?? []
    ).map((department) => ({
      id: department.id,
      name: department.name,
      organization_id: department.organization_id,
      manager_id: department.manager_id,
      manager_name: department.manager?.full_name ?? null,
      employee_count: countByDepartment.get(department.id) ?? 0,
      archived_at: department.archived_at,
      created_at: department.created_at,
      template_id: department.template_id,
    }));
  },
);

// Only profiles already role = 'manager' and not archived —
// departments_manager_role_check rejects assigning anyone else, and an
// archived manager shouldn't be assignable to a department going forward.
export const getManagerCandidates = cache(
  async (): Promise<ManagerCandidate[]> => {
    await requireAdminUser();

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "manager")
      .is("archived_at", null)
      .order("full_name", { ascending: true });

    if (error) {
      logAndThrow("Failed to load manager candidates.", error);
    }

    return data ?? [];
  },
);

// Used by archiveDepartment to enforce "no active employees still
// assigned" before allowing the archive.
export const countActiveDepartmentMembers = async (
  departmentId: string,
): Promise<number> => {
  await requireAdminUser();

  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("profile_departments")
    .select("profile_id, profiles(archived_at)")
    .eq("department_id", departmentId);

  if (error) {
    logAndThrow("Failed to check department membership.", error);
  }

  return (rows ?? []).filter((row) => {
    const embedded = row.profiles as unknown as
      | { archived_at: string | null }
      | { archived_at: string | null }[]
      | null;
    const profile = Array.isArray(embedded) ? embedded[0] : embedded;
    return !profile?.archived_at;
  }).length;
};

export interface DepartmentDetailData {
  id: string;
  name: string;
  manager_id: string | null;
  archived_at: string | null;
  organization_id: string | null;
  created_at: string;
  template_id: string | null;
  manager: DepartmentManager | null;
  members: DepartmentMember[];
  submittedAtByMemberId: Record<string, string>;
  trend: CompletionTrendPoint[];
}

export const getDepartmentDetail = cache(
  async (departmentId: string): Promise<DepartmentDetailData | null> => {
    await requireAdminUser();

    const supabase = await createClient();

    const { data: department, error: departmentError } = await supabase
      .from("departments")
      .select(
        "id, name, organization_id, manager_id, archived_at, created_at, template_id, manager:profiles!departments_manager_id_fkey(id, full_name, designation)",
      )
      .eq("id", departmentId)
      .maybeSingle();

    if (departmentError) {
      logAndThrow("Failed to load department.", departmentError);
    }

    if (!department) {
      return null;
    }

    const { data: memberships, error: membersError } = await supabase
      .from("profile_departments")
      .select(
        "profiles(id, full_name, designation, is_remote, is_active, archived_at, has_onboarded)",
      )
      .eq("department_id", departmentId);

    if (membersError) {
      logAndThrow("Failed to load department members.", membersError);
    }

    type EmbeddedProfile = {
      id: string;
      full_name: string;
      designation: string | null;
      is_remote: boolean;
      is_active: boolean;
      archived_at: string | null;
      has_onboarded: boolean;
    };

    const members: DepartmentMember[] = [];
    for (const row of memberships ?? []) {
      const embedded = row.profiles as unknown as
        | EmbeddedProfile
        | EmbeddedProfile[]
        | null;
      const profile = Array.isArray(embedded) ? embedded[0] : embedded;
      if (!profile || profile.archived_at || !profile.is_active) {
        continue;
      }
      members.push({
        id: profile.id,
        full_name: profile.full_name,
        designation: profile.designation,
        is_remote: profile.is_remote,
        has_onboarded: profile.has_onboarded,
      });
    }

    members.sort((a, b) => a.full_name.localeCompare(b.full_name));

    const memberIds = members.map((member) => member.id);
    const settings = await getOrganizationSettings();
    const submittedAtByMemberId: Record<string, string> = {};
    let trend: CompletionTrendPoint[] = buildCompletionTrend(7, new Map(), 0);

    if (memberIds.length > 0) {
      const today = todayInTimezone(settings.timezone);
      const [{ data: todayReports, error: todayError }, { data: trendReports, error: trendError }] =
        await Promise.all([
          supabase
            .from("daily_reports")
            .select("author_id, submitted_at")
            .eq("report_date", today)
            .in("author_id", memberIds),
          supabase
            .from("daily_reports")
            .select("author_id, report_date")
            .gte("report_date", dateNDaysAgo(6))
            .in("author_id", memberIds),
        ]);

      if (todayError) {
        logAndThrow("Failed to load today's department reports.", todayError);
      }
      if (trendError) {
        logAndThrow("Failed to load department report trend.", trendError);
      }

      for (const report of todayReports ?? []) {
        if (report.submitted_at) {
          submittedAtByMemberId[report.author_id] = report.submitted_at;
        }
      }

      trend = buildCompletionTrend(
        7,
        buildSubmittersByDate(trendReports ?? []),
        members.length,
        settings.workingDays,
        settings.timezone,
      );
    }

    const managerEmbed = department.manager as unknown as
      | DepartmentManager
      | DepartmentManager[]
      | null;
    const manager = Array.isArray(managerEmbed)
      ? (managerEmbed[0] ?? null)
      : managerEmbed;

    return {
      id: department.id,
      name: department.name,
      manager_id: department.manager_id,
      archived_at: department.archived_at,
      organization_id: department.organization_id,
      created_at: department.created_at,
      template_id: department.template_id,
      manager,
      members,
      submittedAtByMemberId,
      trend,
    };
  },
);
