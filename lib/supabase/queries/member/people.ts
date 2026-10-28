import { cache } from "react";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { isWorkingDay, todayInTimezone } from "@/lib/helpers/dates";
import type { AttendanceStatus } from "@/types/attendance";
import type { UserRole } from "@/types/profile";

export type TodayPresence = "in" | "leave" | "off";

export type DirectoryPerson = {
  id: string;
  full_name: string;
  designation: string | null;
  role: UserRole;
  avatar: unknown | null;
  ask_me_about: string | null;
  /** Null when today's attendance isn't marked yet. */
  today: TodayPresence | null;
};

export type MyPeopleDirectory = {
  leadership: DirectoryPerson[];
  managers: DirectoryPerson[];
  supervisors: DirectoryPerson[];
};

type DirectoryRow = {
  id: string;
  full_name: string;
  designation: string | null;
  role: string;
  avatar: unknown | null;
  ask_me_about: string | null;
};

const DIRECTORY_SELECT = "id, full_name, designation, role, avatar, ask_me_about";

function presenceFor(
  status: AttendanceStatus | undefined,
  workingDay: boolean,
): TodayPresence | null {
  switch (status) {
    case "present":
    case "late_minor":
    case "late_major":
    case "work_from_home":
    case "half_leave":
      return "in";
    case "leave":
      return "leave";
    case "absent":
    case "weekly_off":
    case "holiday":
      return "off";
    default:
      return workingDay ? null : "off";
  }
}

type Client = Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>;

async function loadPeopleDirectory(
  supabase: Client,
  userId: string,
): Promise<MyPeopleDirectory> {
  const empty: MyPeopleDirectory = {
    leadership: [],
    managers: [],
    supervisors: [],
  };

  const [
    { data: me },
    { data: memberships },
    { data: supervisorRows },
    settings,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, organization_id, role")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("profile_departments")
      .select("department_id")
      .eq("profile_id", userId),
    supabase
      .from("member_supervisors")
      .select("supervisor_id")
      .eq("member_id", userId),
    getOrganizationSettings(),
  ]);

  if (!me?.organization_id) {
    return empty;
  }

  const departmentIds = (memberships ?? []).map((row) => row.department_id as string);
  const supervisorIds = (supervisorRows ?? []).map((row) => row.supervisor_id as string);

  const [{ data: leadershipRows }, { data: managerRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select(DIRECTORY_SELECT)
      .eq("organization_id", me.organization_id)
      .in("role", ["owner", "admin"])
      .eq("is_active", true)
      .is("archived_at", null)
      .order("full_name", { ascending: true }),
    departmentIds.length === 0
      ? Promise.resolve({ data: [] as { manager_id: string | null }[] })
      : supabase
          .from("departments")
          .select("manager_id")
          .in("id", departmentIds)
          .not("manager_id", "is", null),
  ]);

  const managerIdSet = new Set(
    (managerRows ?? [])
      .map((row) => row.manager_id as string | null)
      .filter((id): id is string => Boolean(id) && id !== userId),
  );

  const supervisorIdSet = new Set(supervisorIds.filter((id) => id !== userId));

  const needProfileIds = [...new Set([...managerIdSet, ...supervisorIdSet])];
  const statusIds = [
    ...new Set([
      ...((leadershipRows ?? []) as DirectoryRow[]).map((row) => row.id),
      ...needProfileIds,
    ]),
  ];
  const today = todayInTimezone(settings.timezone);

  // Attendance is read with the service role: plain members can't read
  // other people's records. The ids are limited to people this user can
  // already see in the directory.
  const [{ data: relatedProfiles }, { data: attendanceRows }] = await Promise.all([
    needProfileIds.length === 0
      ? Promise.resolve({ data: [] as DirectoryRow[] })
      : supabase
          .from("profiles")
          .select(DIRECTORY_SELECT)
          .in("id", needProfileIds)
          .eq("is_active", true)
          .is("archived_at", null),
    statusIds.length === 0
      ? Promise.resolve({ data: [] as { profile_id: string; status: string }[] })
      : createAdminClient()
          .from("attendance_records")
          .select("profile_id, status")
          .in("profile_id", statusIds)
          .eq("date", today),
  ]);

  const statusById = new Map(
    (attendanceRows ?? []).map((row) => [
      row.profile_id as string,
      row.status as AttendanceStatus,
    ]),
  );
  const workingDay = isWorkingDay(today, settings.workingDays);

  const toPerson = (row: DirectoryRow): DirectoryPerson => ({
    id: row.id,
    full_name: row.full_name,
    designation: row.designation,
    role: row.role as UserRole,
    avatar: row.avatar,
    ask_me_about: row.ask_me_about?.trim() || null,
    today: presenceFor(statusById.get(row.id), workingDay),
  });

  const byId = new Map(
    ((relatedProfiles ?? []) as DirectoryRow[]).map((row) => [row.id, toPerson(row)]),
  );

  const leadership = ((leadershipRows ?? []) as DirectoryRow[])
    .filter((row) => row.id !== userId)
    .map(toPerson);

  const leadershipIds = new Set(leadership.map((person) => person.id));

  const managers = [...managerIdSet]
    .map((id) => byId.get(id))
    .filter((person): person is DirectoryPerson => Boolean(person))
    .filter((person) => !leadershipIds.has(person.id))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  const managerTaken = new Set(managers.map((person) => person.id));

  const supervisors = [...supervisorIdSet]
    .map((id) => byId.get(id))
    .filter((person): person is DirectoryPerson => Boolean(person))
    .filter((person) => !leadershipIds.has(person.id) && !managerTaken.has(person.id))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  return { leadership, managers, supervisors };
}

/**
 * The people someone goes to with questions: org owners/admins, their
 * department manager(s) and their supervisors, with today's attendance.
 * Relies on profiles_select_directory_as_member + my_directory_profile_ids().
 */
export const getMyPeopleDirectory = cache(async (): Promise<MyPeopleDirectory> => {
  const user = await getAuthUser();
  if (!user) return { leadership: [], managers: [], supervisors: [] };
  return loadPeopleDirectory(await createClient(), user.id);
});

/**
 * The same directory for someone else, for an owner or admin previewing the
 * handbook as that person. Callers must check the viewer is an owner or
 * admin of the same organization first.
 */
export const getPeopleDirectoryFor = cache(
  async (profileId: string): Promise<MyPeopleDirectory> =>
    loadPeopleDirectory(createAdminClient(), profileId),
);
