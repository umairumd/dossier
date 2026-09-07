import { getOrganizationSummary } from "@/lib/supabase/queries/admin/overview";
import { getDeptCompletionToday } from "@/lib/supabase/queries/admin/dept-completion";
import { getAllDepartments } from "@/lib/supabase/queries/admin/departments";
import { getAllEmployees } from "@/lib/supabase/queries/admin/employees";
import { getActivityLog } from "@/lib/supabase/queries/admin/activity";
import { getTodayReport } from "@/lib/supabase/queries/reports";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { resolveTemplate } from "@/lib/supabase/queries/templates";
import { getOrganizationName } from "@/lib/supabase/queries/organization";
import { getOrganizationSettings, getDeadlineContext } from "@/lib/supabase/queries/organization-settings";
import { formatDeadlineHint } from "@/lib/helpers/time";
import { Building2, UserPlus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ActivityFeed } from "@/components/analytics/activity-feed";
import { InviteEmployeeDialog } from "@/components/admin/invite-employee-dialog";
import { CreateDepartmentDialog } from "@/components/admin/create-department-dialog";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { DeptCompletionCard } from "@/components/dashboard/dept-completion-card";
import { ReportBanner } from "@/components/shared/report-banner";
import type { ReportTemplateWithFields } from "@/types/template";

const HOME_ACTIVITY_LIMIT = 8;

// Rendered at both "/" (Home, for the admin role) and "/admin" (kept
// reachable directly in case it's bookmarked) — one component, not two
// parallel implementations of the same org overview.
export async function AdminDashboard() {
  const [summary, deptCompletion, recentActivity, todayReport, settings, allDepartments, employees, profile, orgName] =
    await Promise.all([
      getOrganizationSummary(),
      getDeptCompletionToday(),
      getActivityLog(HOME_ACTIVITY_LIMIT),
      getTodayReport(),
      getOrganizationSettings(),
      getAllDepartments(),
      getAllEmployees(),
      getCurrentProfile(),
      getOrganizationName(),
    ]);
  const deadline = getDeadlineContext(settings);
  let template: ReportTemplateWithFields | undefined;
  if (profile) {
    try {
      template = await resolveTemplate(profile.id, profile.department_ids);
    } catch {
      template = undefined;
    }
  }

  let contextLine: string;
  if (summary.totalMembers === 0) {
    contextLine = "Start by inviting your first employee";
  } else if (summary.completionPercentageToday === 100) {
    contextLine = `✓ All ${summary.totalMembers} employees have submitted today`;
  } else if (summary.pendingInvites > 0) {
    contextLine = `${summary.pendingInvites} employee${summary.pendingInvites === 1 ? "" : "s"} haven't accepted their invitation yet`;
  } else if (summary.missingToday > 0) {
    contextLine = `${summary.submittedToday} of ${summary.totalMembers} employees have submitted today`;
  } else {
    contextLine = `Managing ${summary.totalMembers} member${summary.totalMembers === 1 ? "" : "s"} across ${summary.departments} department${summary.departments === 1 ? "" : "s"}`;
  }
  const departmentOptions = allDepartments
    .filter((department) => department.archived_at === null)
    .map((department) => ({
      id: department.id,
      name: department.name,
      manager_name: department.manager_name,
    }));

  return (
    <div className="flex flex-col gap-6">
      <DashboardHero
        userId={profile?.id ?? ""}
        name={profile?.full_name ?? "Admin"}
        designation={profile?.designation}
        departmentNames={[]}
        contextLine={contextLine}
        stats={[
          { label: "Total Members", value: String(summary.totalMembers) },
          { label: "Submitted Today", value: String(summary.submittedToday) },
          { label: "Missing Today", value: String(summary.missingToday) },
          {
            label: "Today's Completion",
            value: `${summary.completionPercentageToday}%`,
          },
        ]}
      />

      <ReportBanner
        todayReport={todayReport}
        deadlineHint={formatDeadlineHint(
          settings.reportDeadlineHourLocal,
          settings.timezone,
        )}
        deadline={deadline}
        template={template}
      />

      <div
        className="animate-in fade-in-0 duration-300 fill-mode-both"
        style={{ animationDelay: "0ms" }}
      >
        <DeptCompletionCard departments={deptCompletion} />
      </div>

      <div
        className="flex flex-col gap-3 animate-in fade-in-0 duration-300 fill-mode-both"
        style={{ animationDelay: "75ms" }}
      >
        <h2 className="text-sm font-medium text-muted-foreground">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <InviteEmployeeDialog
            departments={departmentOptions}
            candidates={employees}
            orgName={orgName}
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

      <Card
        className="animate-in fade-in-0 duration-300 fill-mode-both"
        style={{ animationDelay: "150ms" }}
      >
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
