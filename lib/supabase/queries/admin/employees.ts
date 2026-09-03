import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import type { DailyReport } from "@/types/report";
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
  avatar_url: string | null;
}

interface AuthUserSummary {
  email: string | null;
  emailConfirmedAt: string | null;
  lastSignInAt: string | null;
  invitedAt: string | null;
}

// Supabase's default invite/OTP expiry is 24h — not exposed via the Admin
// API, so this can't be read from the live project's config and is a
// best-effort assumption. Confirm it matches your project's actual Auth
// settings if "Pending" ever looks wrong.
const INVITE_EXPIRY_MS = 24 * 60 * 60 * 1000;

function computeEmployeeStatus(
  isActive: boolean,
  archivedAt: string | null,
  authUser: AuthUserSummary | undefined,
): EmployeeStatus {
  if (archivedAt) {
    return "archived";
  }

  if (!isActive) {
    return "disabled";
  }

  // Active means they have actually signed in. Admin-API invites set
  // email_confirmed_at immediately, so that field is not a signup signal.
  if (authUser?.lastSignInAt) {
    return "active";
  }

  if (authUser?.invitedAt) {
    const expired =
      Date.now() - new Date(authUser.invitedAt).getTime() > INVITE_EXPIRY_MS;
    return expired ? "pending" : "invited";
  }

  return "invited";
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
    status: computeEmployeeStatus(profile.is_active, profile.archived_at, authUser),
    designation: profile.designation,
    is_remote: profile.is_remote,
    avatar_url: profile.avatar_url,
    created_at: profile.created_at,
  };
}

async function attachMemberships(
  supabase: Awaited<ReturnType<typeof createClient>>,
  items: EmployeeListItem[],
): Promise<EmployeeListItem[]> {
  if (items.length === 0) {
    return items;
  }

  const ids = items.map((item) => item.id);

  const [
    { data: memberships, error: membershipError },
    { data: supervisors, error: supervisorError },
    { data: departments, error: departmentError },
  ] = await Promise.all([
    supabase
      .from("profile_departments")
      .select("profile_id, department_id")
      .in("profile_id", ids),
    supabase
      .from("member_supervisors")
      .select("member_id, supervisor_id")
      .in("member_id", ids),
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

  return items.map((item) => {
    const department_ids = departmentIdsByProfile.get(item.id) ?? [];
    return {
      ...item,
      department_ids,
      department_names: department_ids
        .map((id) => nameByDepartmentId.get(id))
        .filter((name): name is string => Boolean(name)),
      supervisor_ids: supervisorIdsByMember.get(item.id) ?? [],
    };
  });
}

const PROFILE_SELECT =
  "id, full_name, role, organization_id, is_active, archived_at, created_at, designation, is_remote, avatar_url";

// requireAdminUser() runs first specifically because this function is the
// reason the service-role client exists in a read path (email/status come
// from the Admin API, not RLS).
export const getAllEmployees = cache(async (): Promise<EmployeeListItem[]> => {
  await requireAdminUser();

  const supabase = await createClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .order("full_name", { ascending: true });

  if (error) {
    throw new Error("Failed to load employees.");
  }

  const authUsersById = await loadAuthUsersById();

  const employees = await attachMemberships(
    supabase,
    ((profiles as unknown as ProfileRow[]) ?? []).map((profile) =>
      toEmployeeListItem(profile, authUsersById.get(profile.id)),
    ),
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

    const { data: profile, error } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT)
      .eq("id", employeeId)
      .maybeSingle();

    if (error) {
      throw new Error("Failed to load employee.");
    }

    if (!profile) {
      return null;
    }

    // Unlike getAllEmployees (which needs every user, so paginating
    // listUsers() once is the efficient path), this needs exactly one —
    // getUserById() is a single Admin API call regardless of how many
    // accounts exist in the org, instead of walking every page of
    // listUsers() just to find one row.
    const { data: authUserData } = await createAdminClient().auth.admin.getUserById(
      employeeId,
    );
    const authUser: AuthUserSummary | undefined = authUserData.user
      ? {
          email: authUserData.user.email ?? null,
          emailConfirmedAt: authUserData.user.email_confirmed_at ?? null,
          lastSignInAt: authUserData.user.last_sign_in_at ?? null,
          invitedAt: authUserData.user.invited_at ?? null,
        }
      : undefined;

    const { data: reports, error: reportsError } = await supabase
      .from("daily_reports")
      .select(
        "id, author_id, report_date, content, blockers, additional_notes, submitted_at, created_at",
      )
      .eq("author_id", employeeId)
      .order("report_date", { ascending: false })
      .order("submitted_at", { ascending: false });

    if (reportsError) {
      throw new Error("Failed to load employee reports.");
    }

    const allReports = (reports as DailyReport[]) ?? [];

    const [item] = await attachMemberships(supabase, [
      toEmployeeListItem(profile as unknown as ProfileRow, authUser),
    ]);

    return {
      ...item,
      report_count: allReports.length,
      recent_reports: allReports.slice(0, 10),
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
