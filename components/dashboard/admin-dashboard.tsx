import { getOrganizationSummary } from "@/lib/supabase/queries/admin/overview";
import { getRecentActivity } from "@/lib/supabase/queries/admin/activity";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatCard } from "@/components/analytics/stat-card";
import { ActivityFeed } from "@/components/analytics/activity-feed";
import { InviteEmployeeDialog } from "@/components/admin/invite-employee-dialog";
import { CreateDepartmentDialog } from "@/components/admin/create-department-dialog";

const HOME_ACTIVITY_LIMIT = 8;

// Rendered at both "/" (Home, for the admin role) and "/admin" (kept
// reachable directly in case it's bookmarked) — one component, not two
// parallel implementations of the same org overview.
export async function AdminDashboard() {
  const [summary, recentActivity] = await Promise.all([
    getOrganizationSummary(),
    getRecentActivity(HOME_ACTIVITY_LIMIT),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Organization Overview
        </h1>
        <p className="text-sm text-muted-foreground">
          A snapshot of Dossier across every department.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Employees" value={summary.employees} />
        <StatCard label="Managers" value={summary.managers} />
        <StatCard label="Departments" value={summary.departments} />
        <StatCard label="Pending Invitations" value={summary.pendingInvites} />
        <StatCard
          label="Today's Completion"
          value={`${summary.completionPercentageToday}%`}
          hint="Report submission rate across the org today."
        />
        <StatCard label="Archived Employees" value={summary.archivedUsers} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Invitations, archives, new departments, and submitted reports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityFeed items={recentActivity} />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-2">
          <InviteEmployeeDialog />
          <CreateDepartmentDialog />
        </div>
      </div>
    </div>
  );
}
