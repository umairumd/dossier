import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Calendar, Flame, TrendingUp } from "lucide-react";
import { getAllDepartments } from "@/lib/supabase/queries/admin/departments";
import {
  getAllEmployees,
  getEmployeeDetail,
} from "@/lib/supabase/queries/admin/employees";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import {
  getOrgTemplatesWithFields,
  getTemplateResolutionInfo,
} from "@/lib/supabase/queries/templates";
import { formatDate, formatDaysAgoLong, todayInTimezone } from "@/lib/helpers/dates";
import { BreadcrumbLabel } from "@/components/layout/breadcrumb-label";
import { FigureStrip } from "@/components/shared/figure-strip";
import { EmployeeHeroClient } from "@/components/admin/employee-hero-client";
import { AssignmentsCard } from "./assignments-card";
import { DetailsCard } from "./details-card";
import { ProfileReportHistory, ProfileReportHistorySkeleton } from "./profile-report-history";
import {
  getActiveLeaveBalance,
  getLeaveBalanceAdjustments,
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
  reportPage,
}: {
  id: string;
  profile: Profile | null;
  reportPage: number;
}) {
  const employeeP = getEmployeeDetail(id);
  const [
    employee,
    allDepartments,
    employees,
    settings,
    templates,
    currentShift,
    leaveBalance,
    leaveAdjustments,
    resolution,
  ] = await Promise.all([
    employeeP,
    getAllDepartments(),
    getAllEmployees(),
    getOrganizationSettings(),
    getOrgTemplatesWithFields(),
    getCurrentShift(id),
    getActiveLeaveBalance(id),
    getLeaveBalanceAdjustments(id),
    // Starts as soon as the employee record arrives, not after everything.
    employeeP.then((e) =>
      e
        ? getTemplateResolutionInfo(e.id, e.department_ids)
        : { template: null, source: "none" as const, sourceName: null },
    ),
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

  const tenureRate = employee.tenure_rate;

  return (
    <div className="flex flex-col gap-6">
      <BreadcrumbLabel label={employee.full_name} />
      <EmployeeHeroClient
        name={employee.full_name}
        designation={employee.designation}
        isRemote={employee.is_remote}
        employmentType={employee.employment_type}
        avatar={employee.avatar}
        employee={employee}
        isSelf={isSelf}
        departments={departments}
        candidates={candidates}
        templates={templates}
        currentTemplateSource={resolution.source}
        currentTemplateSourceName={resolution.sourceName}
        exportRecord={
          isOwnerOrAdmin
            ? {
                joinedOn: employee.created_at.slice(0, 10),
                today: todayInTimezone(settings.timezone),
              }
            : undefined
        }
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
        <FigureStrip
          figures={[
            {
              icon: <Flame />,
              label: "Current streak",
              value: employee.stats.currentStreak,
              unit: employee.stats.currentStreak === 1 ? "day" : "days",
            },
            {
              icon: <TrendingUp />,
              label: "Submission rate",
              value: tenureRate.expected === 0 ? "—" : `${tenureRate.rate}%`,
              hint: `${tenureRate.submitted} of ${tenureRate.expected} working days`,
            },
            {
              icon: <Calendar />,
              label: "Last report",
              value: formatDaysAgoLong(employee.stats.lastSubmittedDate, todayInTimezone(settings.timezone)),
              hint: employee.stats.lastSubmittedDate
                ? formatDate(employee.stats.lastSubmittedDate)
                : "No reports yet",
            },
          ]}
        />
        {isOwnerOrAdmin && (
          <LeaveBalanceCard
            balance={resolvedLeaveBalance}
            profileId={employee.id}
            orgId={orgIdForLeave}
            joinDate={employee.created_at.slice(0, 10)}
            adjustments={leaveAdjustments}
            canAdjust
          />
        )}
      </div>

      <Suspense fallback={<ProfileReportHistorySkeleton />}>
        <ProfileReportHistory
          authorId={employee.id}
          page={reportPage}
          reportCount={employee.report_count}
          userName={employee.full_name}
          avatar={employee.avatar}
          adminView
          viewerRole={profile?.role}
          currentUserId={profile?.id}
        />
      </Suspense>
    </div>
  );
}
