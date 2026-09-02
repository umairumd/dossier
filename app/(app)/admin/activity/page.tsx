import { getRecentActivity } from "@/lib/supabase/queries/admin/activity";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ActivityFeed } from "@/components/analytics/activity-feed";

const ACTIVITY_PAGE_LIMIT = 50;

export default async function ActivityPage() {
  const activity = await getRecentActivity(ACTIVITY_PAGE_LIMIT);

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-0 z-10 -mx-6 -mt-6 flex flex-col gap-1 border-b border-border bg-background px-6 pt-6 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="text-sm text-muted-foreground">
          Invitations, archives, new departments, and submitted reports across
          the organization.
        </p>
      </div>

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
