import { ProfileNoticesCard } from "@/components/notices/profile-notices-card";
import { getPostingRights } from "@/lib/notices/server";
import { getPersonalNoticesFor } from "@/lib/supabase/queries/notices";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { todayInTimezone } from "@/lib/helpers/dates";
import type { Profile } from "@/types/profile";

/** Personal notices sent to someone, on their profile, with "Send a notice". */
export async function ProfileNotices({
  viewer,
  person,
}: {
  viewer: Profile;
  person: { id: string; full_name: string; designation: string | null };
}) {
  const [notices, rights, settings] = await Promise.all([
    getPersonalNoticesFor(person.id),
    getPostingRights(viewer),
    getOrganizationSettings(),
  ]);
  const canSend = viewer.id !== person.id && (rights.all || rights.personIds.includes(person.id));
  if (!canSend && notices.length === 0) return null;
  return (
    <ProfileNoticesCard
      person={person}
      canSend={canSend}
      today={todayInTimezone(settings.timezone)}
      notices={notices.map((notice) => ({
        id: notice.id,
        title: notice.title,
        bodyMd: notice.bodyMd,
        from: notice.createdByName,
        publishedAt: notice.publishedAt,
        ackedAt: notice.ackedAt,
        archived: Boolean(notice.archivedAt),
      }))}
    />
  );
}
