import { Suspense } from "react";
import { Calendar, Flame, TrendingUp } from "lucide-react";
import { FigureStrip } from "@/components/shared/figure-strip";
import { LeaveBalanceCard } from "@/components/attendance/leave-balance-card";
import { BreadcrumbLabel } from "@/components/layout/breadcrumb-label";
import { ProfileHeader } from "@/components/shared/profile-header";
import {
  getActiveLeaveBalance,
  getLeaveBalanceAdjustments,
  getCurrentShift,
} from "@/lib/supabase/queries/attendance";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { getTemplateResolutionInfo } from "@/lib/supabase/queries/templates";
import { formatDate, formatDaysAgoLong, todayInTimezone } from "@/lib/helpers/dates";
import { ensureLeaveBalanceRecord } from "@/lib/helpers/leave-balance";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { LeaveBalance } from "@/types/attendance";
import type { Profile } from "@/types/profile";
import type { TeamMemberOverview } from "@/types/team-member-overview";
import { AssignmentsCard } from "./assignments-card";
import { DetailsCard } from "./details-card";
import { ProfileReportHistory, ProfileReportHistorySkeleton } from "./profile-report-history";

// Everything here runs on the viewer's session, so RLS decides what comes
// back. Admin-only loaders and the service-role client must stay out.
export async function TeamEmployeeProfile({
  overview,
  viewer,
  reportPage,
}: {
  overview: TeamMemberOverview;
  viewer: Profile;
  reportPage: number;
}) {
  // profile_departments RLS only returns rows for departments the manager
  // shares with this person, so a non-empty list means same department.
  // Supervision-only viewers can't read department, shift, or leave rows.
  const inDepartment =
    viewer.role === "manager" && overview.department_ids.length > 0;

  const [settings, resolution, currentShift, leaveBalance, leaveAdjustments] =
    await Promise.all([
      getOrganizationSettings(),
      inDepartment
        ? getTemplateResolutionInfo(overview.id, overview.department_ids)
        : Promise.resolve(null),
      inDepartment ? getCurrentShift(overview.id) : Promise.resolve(null),
      inDepartment ? getActiveLeaveBalance(overview.id) : Promise.resolve(null),
      // RLS returns only the viewer's own adjustments: a manager sees none
      // for a teammate (balances are private), a person sees their own.
      getLeaveBalanceAdjustments(overview.id),
    ]);

  // Auto-init leave balance if none exists yet. Mirrors the admin branch so
  // managers aren't shown "Not initialized" just because an admin hasn't
  // visited the page first. Uses the service-role client (safe here because
  // the write is idempotent and scoped to this employee's org).
  let resolvedLeaveBalance = leaveBalance;
  if (inDepartment && !resolvedLeaveBalance && overview.organization_id) {
    const adminClient = createAdminClient();
    await ensureLeaveBalanceRecord(
      adminClient,
      overview.id,
      overview.organization_id,
      overview.contract_start,
    );
    // Bypass React cache() from getActiveLeaveBalance for this request.
    const supabase = await createClient();
    const { data: fresh } = await supabase
      .from("leave_balances")
      .select("*")
      .eq("profile_id", overview.id)
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

  return (
    <div className="flex flex-col gap-6">
      <BreadcrumbLabel label={overview.full_name} />
      <div className="flex flex-col gap-1">
        <ProfileHeader
          userId={overview.id}
          name={overview.full_name}
          designation={overview.designation}
          isRemote={overview.is_remote}
          employmentType={overview.employment_type}
          avatar={overview.avatar}
          avatarSize="2xl"
        />
        {overview.department_names.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {overview.department_names.join(", ")}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {inDepartment && resolution && (
          <div className="lg:col-span-2">
            <AssignmentsCard
              readOnly
              employee={overview}
              templateInfo={resolution}
              currentShift={currentShift}
            />
          </div>
        )}
        <div className={inDepartment ? "lg:col-span-1" : "lg:col-span-3"}>
          <DetailsCard employee={overview} showAdminFields={false} />
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <FigureStrip
          figures={[
            {
              icon: <Flame />,
              label: "Current streak",
              value: overview.current_streak,
              unit: overview.current_streak === 1 ? "day" : "days",
            },
            {
              icon: <TrendingUp />,
              label: "Submission rate",
              value:
                overview.tenure_rate.expected === 0 ? "—" : `${overview.tenure_rate.rate}%`,
              hint: `${overview.tenure_rate.submitted} of ${overview.tenure_rate.expected} working days`,
            },
            {
              icon: <Calendar />,
              label: "Last report",
              value: formatDaysAgoLong(overview.last_submitted_date, todayInTimezone(settings.timezone)),
              hint: overview.last_submitted_date
                ? formatDate(overview.last_submitted_date)
                : "No reports yet",
            },
          ]}
        />
        {inDepartment && (
          <LeaveBalanceCard
            balance={resolvedLeaveBalance}
            profileId={overview.id}
            orgId={overview.organization_id ?? ""}
            contractStart={overview.contract_start}
            adjustments={leaveAdjustments}
            canAdjust={false}
          />
        )}
      </div>

      <Suspense fallback={<ProfileReportHistorySkeleton />}>
        <ProfileReportHistory
          authorId={overview.id}
          page={reportPage}
          reportCount={overview.report_count}
          userName={overview.full_name}
          avatar={overview.avatar}
          viewerRole={viewer.role}
          currentUserId={viewer.id}
        />
      </Suspense>
    </div>
  );
}
