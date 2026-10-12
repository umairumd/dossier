import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import {
  buildAttendanceStatusMap,
  computeReportStats,
  computeTenureSubmissionRate,
  type ReportStatsInput,
} from "@/lib/helpers/report-stats";
import { dateNDaysAgo } from "@/lib/helpers/dates";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import type { AttendanceStatus } from "@/types/attendance";
import type {
  EmployeeDetail,
  EmployeeListItem,
  EmployeeStatus,
} from "@/types/employee";

interface ProfileRow {
  id: string;
  full_name: string;
  role: EmployeeListItem["role"];
  organization_id: string | null;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
  designation: string | null;
  is_remote: boolean;
  employment_type: "full_time" | "part_time";
  avatar_url: string | null;
  avatar: unknown | null;
  template_id: string | null;
  date_of_birth: string | null;
  has_onboarded: boolean | null;
  exclude_from_attendance: boolean;
  is_reporting: boolean;
  leave_balance: number;
  last_seen_at: string | null;
}

interface AuthUserSummary {
  email: string | null;
  emailConfirmedAt: string | null;
  lastSignInAt: string | null;
  invitedAt: string | null;
}

function computeEmployeeStatus(
  isActive: boolean,
  archivedAt: string | null,
  hasOnboarded: boolean | null | undefined,
): EmployeeStatus {
  if (archivedAt) {
    return "archived";
  }

  if (!isActive) {
    return "disabled";
  }

  if (!hasOnboarded) {
    return "invited";
  }

  return "active";
}

// Shared by getAllEmployees and getEmployeeDetail: walks listUsers() once
// to build an id -> auth fields map. email/last_sign_in_at/invited_at all
// live on auth.users, which PostgREST never exposes, even to admins — the
// Admin API (service-role client) is the only way to read them.
async function loadAuthUsersById(): Promise<Map<string, AuthUserSummary>> {
  const adminClient = createAdminClient();
  const authUsersById = new Map<string, AuthUserSummary>();
  let page = 1;

  for (;;) {
    const { data, error: listError } = await adminClient.auth.admin.listUsers(
      { page, perPage: 200 },
    );

    if (listError) {
      throw new Error("Failed to load employee account status.");
    }

    for (const authUser of data.users) {
      authUsersById.set(authUser.id, {
        email: authUser.email ?? null,
        emailConfirmedAt: authUser.email_confirmed_at ?? null,
        lastSignInAt: authUser.last_sign_in_at ?? null,
        invitedAt: authUser.invited_at ?? null,
      });
    }

    if (data.users.length < 200) {
      break;
    }
    page += 1;
  }

  return authUsersById;
}

function toEmployeeListItem(
  profile: ProfileRow,
  authUser: AuthUserSummary | undefined,
): EmployeeListItem {
  return {
    id: profile.id,
    full_name: profile.full_name,
    email: authUser?.email ?? null,
    role: profile.role,
    department_ids: [],
    department_names: [],
    organization_id: profile.organization_id,
    supervisor_ids: [],
    is_active: profile.is_active,
    archived_at: profile.archived_at,
    invited_at: authUser?.invitedAt ?? null,
    last_sign_in_at: authUser?.lastSignInAt ?? null,
    last_seen_at: profile.last_seen_at ?? null,
    status: computeEmployeeStatus(
      profile.is_active,
      profile.archived_at,
      profile.has_onboarded,
    ),
    designation: profile.designation,
    is_remote: profile.is_remote,
    employment_type: profile.employment_type,
    avatar_url: profile.avatar_url,
    avatar: profile.avatar,
    template_id: profile.template_id,
    date_of_birth: profile.date_of_birth,
    exclude_from_attendance: profile.exclude_from_attendance,
    is_reporting: profile.is_reporting ?? true,
    leave_balance: Number(profile.leave_balance ?? 0),
    created_at: profile.created_at,
  };
}

type MembershipLookups = {
  departmentIdsByProfile: Map<string, string[]>;
  supervisorIdsByMember: Map<string, string[]>;
  nameByDepartmentId: Map<string, string>;
};

// Department and supervisor links. With ids, only those people's rows;
// without, every row the viewer can see, so it can run alongside the
// profiles query instead of after it.
async function loadMembershipLookups(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids?: string[],
): Promise<MembershipLookups> {
  const membershipsQuery = supabase
    .from("profile_departments")
    .select("profile_id, department_id");
  const supervisorsQuery = supabase
    .from("member_supervisors")
    .select("member_id, supervisor_id");

  const [
    { data: memberships, error: membershipError },
    { data: supervisors, error: supervisorError },
    { data: departments, error: departmentError },
  ] = await Promise.all([
    ids ? membershipsQuery.in("profile_id", ids) : membershipsQuery,
    ids ? supervisorsQuery.in("member_id", ids) : supervisorsQuery,
    supabase.from("departments").select("id, name"),
  ]);

  if (membershipError || supervisorError || departmentError) {
    throw new Error("Failed to load employee department assignments.");
  }

  const nameByDepartmentId = new Map(
    (departments ?? []).map((department) => [department.id, department.name]),
  );

  const departmentIdsByProfile = new Map<string, string[]>();
  for (const row of memberships ?? []) {
    const list = departmentIdsByProfile.get(row.profile_id) ?? [];
    list.push(row.department_id);
    departmentIdsByProfile.set(row.profile_id, list);
  }

  const supervisorIdsByMember = new Map<string, string[]>();
  for (const row of supervisors ?? []) {
    const list = supervisorIdsByMember.get(row.member_id) ?? [];
    list.push(row.supervisor_id);
    supervisorIdsByMember.set(row.member_id, list);
  }

  return { departmentIdsByProfile, supervisorIdsByMember, nameByDepartmentId };
}

function withMemberships(
  items: EmployeeListItem[],
  lookups: MembershipLookups,
): EmployeeListItem[] {
  return items.map((item) => {
    const department_ids = lookups.departmentIdsByProfile.get(item.id) ?? [];
    return {
      ...item,
      department_ids,
      department_names: department_ids
        .map((id) => lookups.nameByDepartmentId.get(id))
        .filter((name): name is string => Boolean(name)),
      supervisor_ids: lookups.supervisorIdsByMember.get(item.id) ?? [],
    };
  });
}

async function attachMemberships(
  supabase: Awaited<ReturnType<typeof createClient>>,
  items: EmployeeListItem[],
): Promise<EmployeeListItem[]> {
  if (items.length === 0) {
    return items;
  }

  const lookups = await loadMembershipLookups(
    supabase,
    items.map((item) => item.id),
  );
  return withMemberships(items, lookups);
}

const PROFILE_SELECT =
  "id, full_name, role, organization_id, is_active, archived_at, created_at, designation, is_remote, employment_type, avatar_url, avatar, template_id, date_of_birth, has_onboarded, exclude_from_attendance, is_reporting, leave_balance, last_seen_at";

// requireAdminUser() runs first specifically because this function is the
// reason the service-role client exists in a read path (email/status come
// from the Admin API, not RLS).
export const getAllEmployees = cache(async (): Promise<EmployeeListItem[]> => {
  await requireAdminUser();

  const supabase = await createClient();

  // Profiles, account status and department/supervisor links in one round.
  const [{ data: profiles, error }, authUsersById, lookups] = await Promise.all([
    supabase
      .from("profiles")
      .select(PROFILE_SELECT)
      .eq("exclude_from_attendance", false)
      .order("full_name", { ascending: true }),
    loadAuthUsersById(),
    loadMembershipLookups(supabase),
  ]);

  if (error) {
    throw new Error("Failed to load employees.");
  }

  const employees = withMemberships(
    ((profiles as unknown as ProfileRow[]) ?? []).map((profile) =>
      toEmployeeListItem(profile, authUsersById.get(profile.id)),
    ),
    lookups,
  );

  const ROLE_ORDER = { owner: 0, admin: 1, manager: 2, member: 3 };

  employees.sort((a, b) => {
    const roleA = ROLE_ORDER[a.role as keyof typeof ROLE_ORDER] ?? 4;
    const roleB = ROLE_ORDER[b.role as keyof typeof ROLE_ORDER] ?? 4;
    if (roleA !== roleB) return roleA - roleB;
    return a.full_name.localeCompare(b.full_name);
  });

  return employees;
});

export async function getEmployeeLastSeen(
  employeeIds: string[],
): Promise<Record<string, string>> {
  await requireAdminUser();

  if (employeeIds.length === 0) {
    return {};
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_reports")
    .select("author_id, report_date")
    .in("author_id", employeeIds);

  if (error) {
    throw new Error("Failed to load last report dates.");
  }

  const lastSeen: Record<string, string> = {};
  for (const row of data ?? []) {
    const previous = lastSeen[row.author_id];
    if (!previous || row.report_date > previous) {
      lastSeen[row.author_id] = row.report_date;
    }
  }

  return lastSeen;
}

export const getEmployeeDetail = cache(
  async (employeeId: string): Promise<EmployeeDetail | null> => {
    await requireAdminUser();

    const supabase = await createClient();

    // Independent reads run together. Reports load only the two columns the
    // stats need; the report history card pages through full reports on its
    // own (getReportsForAuthor). getUserById is one Admin API call, instead
    // of walking every page of listUsers() to find one row.
    const [
      { data: profile, error },
      { data: authUserData },
      { data: reports, error: reportsError },
      settings,
      { data: attendanceRows },
    ] = await Promise.all([
      supabase.from("profiles").select(PROFILE_SELECT).eq("id", employeeId).maybeSingle(),
      createAdminClient().auth.admin.getUserById(employeeId),
      supabase
        .from("daily_reports")
        .select("report_date, submitted_at")
        .eq("author_id", employeeId)
        .order("report_date", { ascending: false })
        .order("submitted_at", { ascending: false }),
      getOrganizationSettings(),
      supabase
        .from("attendance_records")
        .select("date, status")
        .eq("profile_id", employeeId)
        .gte("date", dateNDaysAgo(399)),
    ]);

    if (error) {
      throw new Error("Failed to load employee.");
    }

    if (!profile) {
      return null;
    }

    if (reportsError) {
      throw new Error("Failed to load employee reports.");
    }

    const authUser: AuthUserSummary | undefined = authUserData.user
      ? {
          email: authUserData.user.email ?? null,
          emailConfirmedAt: authUserData.user.email_confirmed_at ?? null,
          lastSignInAt: authUserData.user.last_sign_in_at ?? null,
          invitedAt: authUserData.user.invited_at ?? null,
        }
      : undefined;

    const allReports = (reports as ReportStatsInput[]) ?? [];

    const [item] = await attachMemberships(supabase, [
      toEmployeeListItem(profile as unknown as ProfileRow, authUser),
    ]);

    const attendanceByDate = buildAttendanceStatusMap(
      (attendanceRows as { date: string; status: AttendanceStatus }[]) ?? [],
    );

    return {
      ...item,
      report_count: allReports.length,
      stats: computeReportStats(allReports, settings.timezone, {
        workingDays: settings.workingDays,
        attendanceByDate,
        joinedOn: item.created_at,
      }),
      tenure_rate: computeTenureSubmissionRate(
        allReports,
        item.created_at,
        settings.workingDays,
        settings.timezone,
        attendanceByDate,
      ),
    };
  },
);

// Backs the "protect the last owner" rule in
// lib/actions/admin/employees.ts: the org must always retain at least one
// owner who is both not deactivated and not archived.
export async function countActiveAdmins(): Promise<number> {
  await requireAdminUser();

  const supabase = await createClient();

  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "owner")
    .eq("is_active", true)
    .is("archived_at", null);

  if (error) {
    throw new Error("Failed to check administrator count.");
  }

  return count ?? 0;
}

// Used only by permanentlyDeleteEmployee's last-admin guard, which is
// stricter than "active": deletion is irreversible, so it must never leave
// the org with zero admin accounts at all — even an already-archived or
// deactivated one is still a recoverable admin (restoreEmployee can bring
// it back), whereas deleting the org's last one closes that door for good.
export async function countAllAdmins(): Promise<number> {
  await requireAdminUser();

  const supabase = await createClient();

  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "owner");

  if (error) {
    throw new Error("Failed to check administrator count.");
  }

  return count ?? 0;
}
