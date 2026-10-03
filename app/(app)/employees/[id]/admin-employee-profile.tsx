import { notFound } from "next/navigation";
import { Calendar, FileText, Flame, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { getAllDepartments } from "@/lib/supabase/queries/admin/departments";
import {
  getAllEmployees,
  getEmployeeDetail,
} from "@/lib/supabase/queries/admin/employees";
import {
  getDeadlineContext,
  getOrganizationSettings,
} from "@/lib/supabase/queries/organization-settings";
import {
  getOrgTemplatesWithFields,
  getTemplateResolutionInfo,
} from "@/lib/supabase/queries/templates";
import { formatDate, formatDaysAgoLong } from "@/lib/helpers/dates";
import { computeTenureSubmissionRate } from "@/lib/helpers/report-stats";
import { BreadcrumbLabel } from "@/components/layout/breadcrumb-label";
import { StatCard } from "@/components/analytics/stat-card";
import { ReportHistoryBrowser } from "@/components/reports/report-history-browser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeHeroClient } from "@/components/admin/employee-hero-client";
import { AssignmentsCard } from "./assignments-card";
import { DetailsCard } from "./details-card";
import {
  getActiveLeaveBalance,
  getCurrentShift,
} from "@/lib/supabase/queries/attendance";
import { ensureLeaveBalanceRecord } from "@/lib/helpers/leave-balance";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { LeaveBalanceCard } from "@/components/attendance/leave-balance-card";
import type { LeaveBalance } from "@/types/attendance";
import type { Profile } from "@/types/profile";

export async function AdminEmployeeProfile({
  id,
  profile,
}: {
  id: string;
  profile: Profile | null;
}) {
  const [
    employee,
    allDepartments,
    employees,
    settings,
    templates,
    currentShift,
    leaveBalance,
  ] = await Promise.all([
    getEmployeeDetail(id),
    getAllDepartments(),
    getAllEmployees(),
    getOrganizationSettings(),
    getOrgTemplatesWithFields(),
    getCurrentShift(id),
    getActiveLeaveBalance(id),
  ]);

  if (!employee) {
    notFound();
  }

  const isOwnerOrAdmin =
    profile?.role === "owner" || profile?.role === "admin";
  const orgIdForLeave =
    profile?.organization_id ?? employee.organization_id ?? "";

  // Auto-init leave balance for admins viewing the page (idempotent).
  let resolvedLeaveBalance = leaveBalance;
  if (isOwnerOrAdmin && !resolvedLeaveBalance && orgIdForLeave) {
    const adminClient = createAdminClient();
    await ensureLeaveBalanceRecord(
      adminClient,
      employee.id,
      orgIdForLeave,
      employee.created_at.slice(0, 10),
    );
    // Bypass React cache() from getActiveLeaveBalance for this request.
    const supabase = await createClient();
    const { data: fresh } = await supabase
      .from("leave_balances")
      .select("*")
      .eq("profile_id", employee.id)
      .eq("status", "active")
      .maybeSingle();
    if (fresh) {
      resolvedLeaveBalance = {
        ...(fresh as LeaveBalance),
        balance_remaining:
          Number(fresh.total_accrued) - Number(fresh.total_used),
      };
    }
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
  const tenureRate = computeTenureSubmissionRate(
    employee.recent_reports,
    employee.created_at,
    settings.workingDays,
    settings.timezone,
  );

  return (
    <div className="flex flex-col gap-6">
      <BreadcrumbLabel label={employee.full_name} />
      <EmployeeHeroClient
        name={employee.full_name}
        designation={employee.designation}
        isRemote={employee.is_remote}
        employmentType={employee.employment_type}
        avatarUrl={employee.avatar_url}
        employee={employee}
        isSelf={isSelf}
        departments={departments}
        candidates={candidates}
        templates={templates}
        currentTemplateSource={resolution.source}
        currentTemplateSourceName={resolution.sourceName}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AssignmentsCard
            employee={employee}
            departments={departments}
            candidates={candidates}
            templates={templates}
            templateInfo={resolution}
            currentShift={currentShift}
            orgId={profile?.organization_id ?? employee.organization_id ?? ""}
          />
        </div>
        <div className="lg:col-span-1">
          <DetailsCard employee={employee} />
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-row gap-2 sm:grid sm:grid-cols-3 sm:gap-6">
          <StatCard
            label="Current Streak"
            value={employee.stats.currentStreak}
            unit="days"
            hint="Days in a row"
            icon={<Flame className="size-4" />}
            className="min-w-0 flex-1 max-sm:[--card-spacing:--spacing(3)]"
            labelClassName="text-[10px] sm:text-sm"
            valueClassName="text-2xl sm:text-3xl"
          />
          <StatCard
            label="Submission Rate"
            value={
              tenureRate.expected === 0 ? "—" : `${tenureRate.rate}%`
            }
            hint={`${tenureRate.submitted} of ${tenureRate.expected} working days`}
            icon={<TrendingUp className="size-4" />}
            className="min-w-0 flex-1 max-sm:[--card-spacing:--spacing(3)]"
            labelClassName="text-[10px] sm:text-sm"
            valueClassName="text-2xl sm:text-3xl"
          />
          <StatCard
            label="Last Submitted"
            value={formatDaysAgoLong(employee.stats.lastSubmittedDate)}
            hint={
              employee.stats.lastSubmittedDate
                ? formatDate(employee.stats.lastSubmittedDate)
                : "No reports yet"
            }
            icon={<Calendar className="size-4" />}
            className="min-w-0 flex-1 max-sm:[--card-spacing:--spacing(3)]"
            labelClassName="text-[10px] sm:text-sm"
            valueClassName="text-2xl sm:text-3xl"
          />
        </div>
        {isOwnerOrAdmin && (
          <LeaveBalanceCard
            balance={resolvedLeaveBalance}
            profileId={employee.id}
            orgId={orgIdForLeave}
            joinDate={employee.created_at.slice(0, 10)}
            canAdjust
          />
        )}
      </div>

      <Card className="card-gradient">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Report History</CardTitle>
            <span className="text-sm text-muted-foreground">
              {employee.report_count} total
            </span>
          </div>
        </CardHeader>
        <CardContent className="pr-0">
          {employee.recent_reports.length === 0 ? (
            <EmptyState
              size="sm"
              icon={<FileText className="size-4" />}
              title="No reports submitted yet."
            />
          ) : (
            <ReportHistoryBrowser
              reports={employee.recent_reports}
              userName={employee.full_name}
              deadline={getDeadlineContext(settings)}
              adminView
              templates={templates}
              viewerRole={profile?.role}
              currentUserId={profile?.id}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
