import {
  getActivityLog,
  getMyActivityLog,
  getTeamActivityLog,
} from "@/lib/supabase/queries/admin/activity";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { ActivityPageClient } from "@/components/analytics/activity-page-client";
import { PageHeader } from "@/components/shared/page-header";

const ACTIVITY_PAGE_LIMIT = 30;

export default async function ActivityPage() {
  const profile = await getCurrentProfile();
  const isOwnerOrAdmin =
    profile?.role === "owner" || profile?.role === "admin";
  const isManager = profile?.role === "manager";

  const activity = isOwnerOrAdmin
    ? await getActivityLog(ACTIVITY_PAGE_LIMIT)
    : isManager
      ? await getTeamActivityLog(ACTIVITY_PAGE_LIMIT)
      : await getMyActivityLog(ACTIVITY_PAGE_LIMIT);

  const description = isOwnerOrAdmin
    ? "Complete audit trail of all actions in Dossier."
    : isManager
      ? "Recent activity across your team."
      : "Activity that involves you.";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Activity">
        <p className="text-sm text-muted-foreground">{description}</p>
      </PageHeader>

      <ActivityPageClient
        initialItems={activity}
        initialHasMore={activity.length === 30}
        canDelete={profile?.role === "owner"}
      />
    </div>
  );
}
