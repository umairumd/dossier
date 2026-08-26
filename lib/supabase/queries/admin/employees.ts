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
  department_id: string | null;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
  department: { name: string } | null;
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
    department_id: profile.department_id,
    department_name: profile.department?.name ?? null,
    is_active: profile.is_active,
    archived_at: profile.archived_at,
    invited_at: authUser?.invitedAt ?? null,
    last_sign_in_at: authUser?.lastSignInAt ?? null,
    status: computeEmployeeStatus(profile.is_active, profile.archived_at, authUser),
    created_at: profile.created_at,
  };
}

const PROFILE_SELECT =
  // See lib/supabase/queries/profile.ts: two FKs exist between profiles
  // and departments, so the embed must name which one via !constraint or
  // PostgREST throws PGRST201.
  "id, full_name, role, department_id, is_active, archived_at, created_at, department:departments!profiles_department_id_fkey(name)";

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

  return ((profiles as unknown as ProfileRow[]) ?? []).map((profile) =>
    toEmployeeListItem(profile, authUsersById.get(profile.id)),
  );
});

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

    return {
      ...toEmployeeListItem(profile as unknown as ProfileRow, authUser),
      report_count: allReports.length,
      recent_reports: allReports.slice(0, 10),
    };
  },
);

// Backs the "protect the last administrator" rule in
// lib/actions/admin/employees.ts: the org must always retain at least one
// admin who is both not deactivated and not archived, since that's the
// only account guaranteed to still be able to sign in and administer the
// org. Not cached — callers check this immediately before a mutation that
// could invalidate it, so a stale count would defeat the whole point.
export async function countActiveAdmins(): Promise<number> {
  await requireAdminUser();

  const supabase = await createClient();

  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
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
    .eq("role", "admin");

  if (error) {
    throw new Error("Failed to check administrator count.");
  }

  return count ?? 0;
}
