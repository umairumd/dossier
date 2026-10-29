import { AnnouncementsView } from "@/components/notices/announcements-view";
import { todayInTimezone } from "@/lib/helpers/dates";
import { getPostingRights, loadAudiencePool } from "@/lib/notices/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnnouncementsFeed } from "@/lib/supabase/queries/notices";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";

export const metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  const [me, feed, settings] = await Promise.all([
    getCurrentProfile(),
    getAnnouncementsFeed(),
    getOrganizationSettings(),
  ]);
  if (!me?.organization_id) return null;

  const rights = await getPostingRights(me);
  const canAnnounce = rights.all || rights.departmentIds.length > 0;
  const canSendPersonal = rights.all || rights.personIds.length > 0;

  let compose = null;
  if (canAnnounce || canSendPersonal) {
    const [pool, { data: departmentRows }] = await Promise.all([
      loadAudiencePool(me.organization_id),
      createAdminClient().from("departments").select("id, name, archived_at").order("name"),
    ]);
    const departments = (departmentRows ?? [])
      .filter((row) => !row.archived_at && (rights.all || rights.departmentIds.includes(row.id)))
      .map((row) => ({ id: row.id as string, name: row.name as string }));
    const people = pool
      .filter((person) => person.id !== me.id)
      .map((person) => ({
        id: person.id,
        full_name: person.full_name,
        designation: person.designation,
        role: person.role,
        employment_type: person.employment_type,
        is_remote: person.is_remote,
        department_ids: person.department_ids,
        is_supervisor: person.is_supervisor,
      }));
    const designations = [
      ...new Map(
        pool
          .map((person) => person.designation?.trim())
          .filter((value): value is string => Boolean(value))
          .map((value) => [value.toLowerCase(), value]),
      ).values(),
    ].sort((a, b) => a.localeCompare(b));
    compose = {
      canAnnounce,
      canSendPersonal,
      restricted: !rights.all,
      departments,
      people,
      personalTargets: rights.all ? people : people.filter((person) => rights.personIds.includes(person.id)),
      designations,
    };
  }

  const { data: allDepartments } = await createAdminClient().from("departments").select("id, name");

  return (
    <AnnouncementsView
      notices={feed}
      viewerId={me.id}
      leader={me.role === "owner" || me.role === "admin"}
      today={todayInTimezone(settings.timezone)}
      departmentNames={Object.fromEntries((allDepartments ?? []).map((row) => [row.id, row.name]))}
      compose={compose}
    />
  );
}
