import { getOrganizationSummary } from "@/lib/supabase/queries/admin/overview";
import { getDeptCompletionToday } from "@/lib/supabase/queries/admin/dept-completion";
import { getAllDepartments } from "@/lib/supabase/queries/admin/departments";
import { getAllEmployees } from "@/lib/supabase/queries/admin/employees";
import { getRecentActivity } from "@/lib/supabase/queries/admin/activity";
import { getTodayReport } from "@/lib/supabase/queries/reports";
import { getOrganizationSettings, getDeadlineContext } from "@/lib/supabase/queries/organization-settings";
import { formatLongDate } from "@/lib/helpers/dates";
import { formatDeadlineHint } from "@/lib/helpers/time";
import { Building2, UserPlus } from "lucide-react";
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
import { ReportBanner } from "@/components/shared/report-banner";

const HOME_ACTIVITY_LIMIT = 8;

// Rendered at both "/" (Home, for the admin role) and "/admin" (kept
// reachable directly in case it's bookmarked) — one component, not two
// parallel implementations of the same org overview.
export async function AdminDashboard() {
  const [summary, deptCompletion, recentActivity, todayReport, settings, allDepartments, employees] =
    await Promise.all([
      getOrganizationSummary(),
      getDeptCompletionToday(),
      getRecentActivity(HOME_ACTIVITY_LIMIT),
      getTodayReport(),
      getOrganizationSettings(),
      getAllDepartments(),
      getAllEmployees(),
    ]);
  const today = formatLongDate(new Date());
  const deadline = getDeadlineContext(settings);
  const departmentOptions = allDepartments
    .filter((department) => department.archived_at === null)
    .map((department) => ({
      id: department.id,
      name: department.name,
      manager_name: department.manager_name,
    }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Organization Overview
        </h1>
        <p className="text-sm text-muted-foreground">{today}</p>
      </div>

      <ReportBanner
        todayReport={todayReport}
        deadlineHint={formatDeadlineHint(
          settings.reportDeadlineHourLocal,
          settings.timezone,
        )}
        deadline={deadline}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Members" value={summary.totalMembers} />
        <StatCard label="Submitted Today" value={summary.submittedToday} />
        <StatCard label="Missing Today" value={summary.missingToday} />
        <StatCard
          label="Today's Completion"
          value={`${summary.completionPercentageToday}%`}
        />
      </div>

      <DeptCompletionCard departments={deptCompletion} />

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <InviteEmployeeDialog
            departments={departmentOptions}
            candidates={employees}
            trigger={
              <button type="button" className="w-full text-left">
                <Card className="card-gradient cursor-pointer transition-colors hover:bg-muted/50">
                  <CardContent className="flex flex-col items-center justify-center gap-2 py-6">
                    <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                      <UserPlus className="size-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium">Invite Employee</span>
                  </CardContent>
                </Card>
              </button>
            }
          />
          <CreateDepartmentDialog
            trigger={
              <button type="button" className="w-full text-left">
                <Card className="card-gradient cursor-pointer transition-colors hover:bg-muted/50">
                  <CardContent className="flex flex-col items-center justify-center gap-2 py-6">
                    <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                      <Building2 className="size-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium">New Department</span>
                  </CardContent>
                </Card>
              </button>
            }
          />
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
