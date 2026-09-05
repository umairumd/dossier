import { Calendar, Flame, TrendingUp } from "lucide-react";
import { getAllDepartments } from "@/lib/supabase/queries/admin/departments";
import {
  getAllEmployees,
  getEmployeeDetail,
} from "@/lib/supabase/queries/admin/employees";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import {
  getDeadlineContext,
  getOrganizationSettings,
} from "@/lib/supabase/queries/organization-settings";
import {
  getOrgTemplatesWithFields,
  getTemplateResolutionInfo,
} from "@/lib/supabase/queries/templates";
import { formatDate, formatDateTime, isWorkingDay, todayInTimezone } from "@/lib/helpers/dates";
import { getRoleLabel } from "@/lib/helpers/role-labels";
import { EmployeeActionsMenu } from "@/components/admin/employee-actions-menu";
import { StatCard } from "@/components/analytics/stat-card";
import { ProfileHeader } from "@/components/shared/profile-header";
import { ReportHistoryBrowser } from "@/components/reports/report-history-browser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssignmentsCard } from "./assignments-card";
import { notFound } from "next/navigation";
import type { EmployeeDetail } from "@/types/employee";

function countWorkingDaysThisMonth(
  timezone: string,
  workingDays: number[],
): number {
  const today = todayInTimezone(timezone);
  const [year, month] = today.split("-").map(Number);
  let count = 0;

  for (let day = 1; day <= 31; day += 1) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const parsed = new Date(`${date}T00:00:00Z`);
    if (parsed.getUTCMonth() + 1 !== month) {
      break;
    }
    if (isWorkingDay(date, workingDays)) {
      count += 1;
    }
  }

  return count;
}

function QuickInfoCard({ employee }: { employee: EmployeeDetail }) {
  return (
    <Card className="card-gradient h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Details</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-muted-foreground">Email</p>
          <p className="break-all text-sm font-medium">
            {employee.email ?? "—"}
          </p>
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-muted-foreground">Role</p>
          <span className="inline-flex w-fit items-center rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {getRoleLabel(employee.role)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-muted-foreground">Employment</p>
          <p className="text-sm font-medium">
            {employee.employment_type === "part_time"
              ? "Part-time"
              : "Full-time"}
          </p>
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-muted-foreground">Work Location</p>
          <p className="text-sm font-medium">
            {employee.is_remote ? "Remote" : "On-site"}
          </p>
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-muted-foreground">Member Since</p>
          <p className="text-sm font-medium">
            {formatDate(employee.created_at.slice(0, 10))}
          </p>
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-muted-foreground">Last Seen</p>
          <p className="text-sm font-medium">
            {employee.last_sign_in_at
              ? formatDateTime(employee.last_sign_in_at)
              : "—"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [employee, profile, allDepartments, employees, settings, templates] =
    await Promise.all([
      getEmployeeDetail(id),
      getCurrentProfile(),
      getAllDepartments(),
      getAllEmployees(),
      getOrganizationSettings(),
      getOrgTemplatesWithFields(),
    ]);

  if (!employee) {
    notFound();
  }

  const isSelf = employee.id === profile?.id;
  const departments = allDepartments
    .filter((department) => department.archived_at === null)
    .map((department) => ({
      id: department.id,
      name: department.name,
      manager_name: department.manager_name,
    }));
  const candidates = employees.filter((item) => item.id !== employee.id);

  const resolution = await getTemplateResolutionInfo(
    employee.id,
    employee.department_ids,
  );
  const workingDaysThisMonth = countWorkingDaysThisMonth(
    settings.timezone,
    settings.workingDays,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <ProfileHeader
          name={employee.full_name}
          designation={employee.designation}
          departmentNames={employee.department_names}
          isRemote={employee.is_remote}
          employmentType={employee.employment_type}
          avatarUrl={employee.avatar_url}
        />

        <EmployeeActionsMenu
          employee={employee}
          isSelf={isSelf}
          departments={departments}
          candidates={candidates}
          redirectOnDelete="/employees"
          templates={templates}
          currentTemplateSource={resolution.source}
          currentTemplateSourceName={resolution.sourceName}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AssignmentsCard
            employee={employee}
            departments={departments}
            candidates={candidates}
            templates={templates}
            templateInfo={resolution}
          />
        </div>
        <div className="lg:col-span-1">
          <QuickInfoCard employee={employee} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Current Streak"
          value={employee.stats.currentStreak}
          unit="days"
          hint="Consecutive days with a report"
          icon={<Flame className="size-4" />}
        />
        <StatCard
          label="30-Day Completion"
          value={`${employee.stats.completionPercentage}%`}
          hint="Reports submitted vs working days"
          icon={<TrendingUp className="size-4" />}
        />
        <StatCard
          label="This Month"
          value={employee.stats.reportsThisMonth}
          unit="reports"
          hint={`Out of ${workingDaysThisMonth} working days`}
          icon={<Calendar className="size-4" />}
        />
      </div>

      <Card className="card-gradient">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Report History</CardTitle>
            <span className="text-sm text-muted-foreground">
              {employee.report_count} total
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {employee.recent_reports.length === 0 ? (
            <p className="px-6 py-6 text-center text-sm text-muted-foreground">
              No reports submitted yet.
            </p>
          ) : (
            <ReportHistoryBrowser
              reports={employee.recent_reports}
              userName={employee.full_name}
              deadline={getDeadlineContext(settings)}
              adminView
              templates={templates}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
