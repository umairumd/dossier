import { getActivityLog } from "@/lib/supabase/queries/admin/activity";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { ActivityPageClient } from "@/components/analytics/activity-page-client";
import { PageHeader } from "@/components/shared/page-header";

const ACTIVITY_PAGE_LIMIT = 100;

export default async function ActivityPage() {
  // getActivityLog enforces owner/admin access via requireAdminUser().
  const [activity, profile] = await Promise.all([
    getActivityLog(ACTIVITY_PAGE_LIMIT),
    getCurrentProfile(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Activity">
        <p className="text-sm text-muted-foreground">
          Complete audit trail of all actions in Dossier.
        </p>
      </PageHeader>

      <ActivityPageClient
        items={activity}
        canDelete={profile?.role === "owner"}
      />
    </div>
  );
}
