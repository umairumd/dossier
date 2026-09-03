import { getRecentActivity } from "@/lib/supabase/queries/admin/activity";
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
  const activity = await getRecentActivity(ACTIVITY_PAGE_LIMIT);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Activity">
        <p className="text-sm text-muted-foreground">
          Invitations, archives, new departments, and submitted reports across
          the organization.
        </p>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Derived from current records, not a persisted audit log — reversible
            changes (like restoring an archived employee) won&apos;t appear as
            their own event.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityFeed items={activity} />
        </CardContent>
      </Card>
    </div>
  );
}
