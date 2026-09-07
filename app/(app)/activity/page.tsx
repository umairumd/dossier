import { getActivityLog } from "@/lib/supabase/queries/admin/activity";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ActivityFeed } from "@/components/analytics/activity-feed";
import { PageHeader } from "@/components/shared/page-header";

const ACTIVITY_PAGE_LIMIT = 50;

export default async function ActivityPage() {
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

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Invitations, archives, departments, reports, attendance, and
            settings changes across the organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityFeed
            items={activity}
            canDelete={profile?.role === "owner"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
