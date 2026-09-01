import { getOrganizationSummary } from "@/lib/supabase/queries/admin/overview";
import { getDeptCompletionToday } from "@/lib/supabase/queries/admin/dept-completion";
import { getRecentActivity } from "@/lib/supabase/queries/admin/activity";
import { getTodayReport } from "@/lib/supabase/queries/reports";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { formatLongDate } from "@/lib/helpers/dates";
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
import { DeptCompletionCard } from "@/components/dashboard/dept-completion-card";
import { TodayReportCard } from "@/components/dashboard/today-report-card";

const HOME_ACTIVITY_LIMIT = 8;

// Rendered at both "/" (Home, for the admin role) and "/admin" (kept
// reachable directly in case it's bookmarked) — one component, not two
// parallel implementations of the same org overview.
export async function AdminDashboard() {
  const [summary, departments, recentActivity, todayReport, settings] =
    await Promise.all([
      getOrganizationSummary(),
      getDeptCompletionToday(),
      getRecentActivity(HOME_ACTIVITY_LIMIT),
      getTodayReport(),
      getOrganizationSettings(),
    ]);
  const today = formatLongDate(new Date());
  const deadlineHour = String(settings.reportDeadlineHourUtc).padStart(2, "0");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Organization Overview
        </h1>
        <p className="text-sm text-muted-foreground">{today}</p>
      </div>

      <TodayReportCard
        todayReport={todayReport}
        deadlineHint={`Due by ${deadlineHour}:00 UTC`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Members" value={summary.totalMembers} />
        <StatCard label="Submitted Today" value={summary.submittedToday} />
        <StatCard label="Missing Today" value={summary.missingToday} />
        <StatCard
          label="Today's Completion"
          value={`${summary.completionPercentageToday}%`}
        />
      </div>

      <DeptCompletionCard departments={departments} />

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-2">
          <InviteEmployeeDialog />
          <CreateDepartmentDialog />
        </div>
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
    </div>
  );
}
