import { Suspense } from "react";
import {
  getActivityLog,
  getMyActivityLog,
  getTeamActivityLog,
} from "@/lib/supabase/queries/admin/activity";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { todayInTimezone } from "@/lib/helpers/dates";
import { ActivityPageClient } from "@/components/analytics/activity-page-client";
import { PageHeader } from "@/components/shared/page-header";
import { ActivityListSkeleton } from "./activity-list-skeleton";
import type { Profile } from "@/types/profile";

const ACTIVITY_PAGE_LIMIT = 30;

export default async function ActivityPage() {
  const profile = await getCurrentProfile();
  const isOwnerOrAdmin =
    profile?.role === "owner" || profile?.role === "admin";
  const isManager = profile?.role === "manager";

  const description = isOwnerOrAdmin
    ? "Complete audit trail of all actions in Dossier."
    : isManager
      ? "Recent activity across your team."
      : "Activity that involves you.";

  // The header renders straight away; the feed streams in behind it.
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Activity">
        <p className="text-sm text-muted-foreground">{description}</p>
      </PageHeader>

      <Suspense fallback={<ActivityListSkeleton />}>
        <ActivityFeedSection profile={profile} />
      </Suspense>
    </div>
  );
}

async function ActivityFeedSection({ profile }: { profile: Profile | null }) {
  const isOwnerOrAdmin =
    profile?.role === "owner" || profile?.role === "admin";
  const isManager = profile?.role === "manager";

  const [activity, settings] = await Promise.all([
    isOwnerOrAdmin
      ? getActivityLog(ACTIVITY_PAGE_LIMIT)
      : isManager
        ? getTeamActivityLog(ACTIVITY_PAGE_LIMIT)
        : getMyActivityLog(ACTIVITY_PAGE_LIMIT),
    getOrganizationSettings(),
  ]);

  return (
    <ActivityPageClient
      initialItems={activity}
      initialHasMore={activity.length === ACTIVITY_PAGE_LIMIT}
      canDelete={profile?.role === "owner"}
      currentUserId={profile?.id}
      foldReports={isOwnerOrAdmin || isManager}
      timeZone={settings.timezone}
      todayKey={todayInTimezone(settings.timezone)}
    />
  );
}
