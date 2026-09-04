import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import type { DailyReport } from "@/types/report";
import type { TeamMemberReport } from "@/types/team";

const REPORT_SELECT =
  "id, author_id, report_date, content, blockers, additional_notes, submitted_at, created_at, template_id, field_responses";

export interface OrgMemberReport extends TeamMemberReport {
  departmentIds: string[];
  departmentNames: string[];
}

export interface OrgDepartment {
  id: string;
  name: string;
  managerId: string | null;
}

export const getOrgRosterSize = cache(async (): Promise<number> => {
  await requireAdminUser();

  const adminClient = createAdminClient();
  const { count, error } = await adminClient
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("has_onboarded", true)
    .is("archived_at", null)
    .neq("role", "owner");

  if (error) {
    throw new Error("Failed to load organization roster size.");
  }

  return count ?? 0;
});

export const getOrgReportsForDate = cache(
  async (
    date: string,
  ): Promise<{ members: OrgMemberReport[]; departments: OrgDepartment[] }> => {
    await requireAdminUser();

    const adminClient = createAdminClient();

    const [
      { data: employees, error: employeesError },
      { data: reports, error: reportsError },
      { data: departments, error: departmentsError },
    ] = await Promise.all([
      adminClient
        .from("profiles")
        .select("id, full_name, designation, avatar_url")
        .eq("has_onboarded", true)
        .eq("is_active", true)
        .is("archived_at", null)
        .neq("role", "owner")
        .order("full_name", { ascending: true }),
      adminClient
        .from("daily_reports")
        .select(REPORT_SELECT)
        .eq("report_date", date),
      adminClient
        .from("departments")
        .select("id, name, manager_id")
        .is("archived_at", null)
        .order("name", { ascending: true }),
    ]);

    if (employeesError) {
      throw new Error("Failed to load organization employees.");
    }

    if (reportsError) {
      throw new Error("Failed to load reports for that date.");
    }

    if (departmentsError) {
      throw new Error("Failed to load departments.");
    }

    const activeDepartments: OrgDepartment[] = (departments ?? []).map(
      (department) => ({
        id: department.id,
        name: department.name,
        managerId: department.manager_id,
      }),
    );
    const activeDepartmentIds = new Set(activeDepartments.map((department) => department.id));
    const nameByDepartment = new Map(
      activeDepartments.map((department) => [department.id, department.name]),
    );

    const employeeIds = (employees ?? []).map((employee) => employee.id);
    const departmentIdsByProfile = new Map<string, string[]>();

    if (employeeIds.length > 0) {
      const { data: memberships, error: membershipsError } = await adminClient
        .from("profile_departments")
        .select("profile_id, department_id")
        .in("profile_id", employeeIds);

      if (membershipsError) {
        throw new Error("Failed to load department assignments.");
      }

      for (const row of memberships ?? []) {
        if (!activeDepartmentIds.has(row.department_id)) {
          continue;
        }

        const ids = departmentIdsByProfile.get(row.profile_id) ?? [];
        ids.push(row.department_id);
        departmentIdsByProfile.set(row.profile_id, ids);
      }
    }

    const reportsByAuthor = new Map(
      ((reports as DailyReport[]) ?? []).map((report) => [
        report.author_id,
        report,
      ]),
    );

    const members: OrgMemberReport[] = (employees ?? []).map((employee) => {
      const departmentIds = departmentIdsByProfile.get(employee.id) ?? [];

      return {
        employeeId: employee.id,
        fullName: employee.full_name,
        designation: employee.designation,
        avatarUrl: employee.avatar_url,
        report: reportsByAuthor.get(employee.id) ?? null,
        departmentIds,
        departmentNames: departmentIds
          .map((id) => nameByDepartment.get(id))
          .filter((name): name is string => Boolean(name)),
      };
    });

    return { members, departments: activeDepartments };
  },
);
