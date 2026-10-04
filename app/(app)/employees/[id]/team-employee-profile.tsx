import { Calendar, FileText, Flame, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/analytics/stat-card";
import { LeaveBalanceCard } from "@/components/attendance/leave-balance-card";
import { BreadcrumbLabel } from "@/components/layout/breadcrumb-label";
import { ReportHistoryBrowser } from "@/components/reports/report-history-browser";
import { EmptyState } from "@/components/shared/empty-state";
import { ProfileHeader } from "@/components/shared/profile-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getActiveLeaveBalance,
  getCurrentShift,
} from "@/lib/supabase/queries/attendance";
import {
  getDeadlineContext,
  getOrganizationSettings,
} from "@/lib/supabase/queries/organization-settings";
import {
  getOrgTemplatesWithFields,
  getTemplateResolutionInfo,
} from "@/lib/supabase/queries/templates";
import { formatDate, formatDaysAgoLong } from "@/lib/helpers/dates";
import { ensureLeaveBalanceRecord } from "@/lib/helpers/leave-balance";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { LeaveBalance } from "@/types/attendance";
import type { Profile } from "@/types/profile";
import type { TeamMemberOverview } from "@/types/team-member-overview";
import { AssignmentsCard } from "./assignments-card";
import { DetailsCard } from "./details-card";

// Everything here runs on the viewer's session, so RLS decides what comes
// back. Admin-only loaders and the service-role client must stay out.
export async function TeamEmployeeProfile({
  overview,
  viewer,
}: {
  overview: TeamMemberOverview;
  viewer: Profile;
}) {
  // profile_departments RLS only returns rows for departments the manager
  // shares with this person, so a non-empty list means same department.
  // Supervision-only viewers can't read department, shift, or leave rows.
  const inDepartment =
    viewer.role === "manager" && overview.department_ids.length > 0;

  const [settings, templates, resolution, currentShift, leaveBalance] =
    await Promise.all([
      getOrganizationSettings(),
      getOrgTemplatesWithFields(),
      inDepartment
        ? getTemplateResolutionInfo(overview.id, overview.department_ids)
        : Promise.resolve(null),
      inDepartment ? getCurrentShift(overview.id) : Promise.resolve(null),
      inDepartment ? getActiveLeaveBalance(overview.id) : Promise.resolve(null),
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
      overview.created_at.slice(0, 10),
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
          avatarUrl={overview.avatar_url}
          avatarSize="2xl"
          interactive={false}
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
        <div className="flex flex-row gap-2 sm:grid sm:grid-cols-3 sm:gap-6">
          <StatCard
            label="Current Streak"
            value={overview.current_streak}
            unit={overview.current_streak === 1 ? "day" : "days"}
            hint="Days in a row"
            icon={<Flame size={14} />}
            className="min-w-0 flex-1 card-gradient max-sm:[--card-spacing:--spacing(3)]"
            labelClassName="text-[10px] sm:text-sm"
            valueClassName="text-2xl sm:text-3xl"
          />
          <StatCard
            label="Submission Rate"
            value={
              overview.tenure_rate.expected === 0
                ? "—"
                : `${overview.tenure_rate.rate}%`
            }
            hint={`${overview.tenure_rate.submitted} of ${overview.tenure_rate.expected} working days`}
            icon={<TrendingUp size={14} />}
            className="min-w-0 flex-1 card-gradient max-sm:[--card-spacing:--spacing(3)]"
            labelClassName="text-[10px] sm:text-sm"
            valueClassName="text-2xl sm:text-3xl"
          />
          <StatCard
            label="Last Submitted"
            value={formatDaysAgoLong(overview.last_submitted_date)}
            hint={
              overview.last_submitted_date
                ? formatDate(overview.last_submitted_date)
                : "No reports yet"
            }
            icon={<Calendar size={14} />}
            className="min-w-0 flex-1 card-gradient max-sm:[--card-spacing:--spacing(3)]"
            labelClassName="text-[10px] sm:text-sm"
            valueClassName="text-2xl sm:text-3xl"
          />
        </div>
        {inDepartment && (
          <LeaveBalanceCard
            balance={resolvedLeaveBalance}
            profileId={overview.id}
            orgId={overview.organization_id ?? ""}
            joinDate={overview.created_at.slice(0, 10)}
            canAdjust={false}
          />
        )}
      </div>

      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="text-base">Last 10 Reports</CardTitle>
          <CardDescription>
            {overview.report_count} total{" "}
            {overview.report_count === 1 ? "report" : "reports"}
          </CardDescription>
        </CardHeader>
        <CardContent className="pr-0">
          {overview.recent_reports.length === 0 ? (
            <EmptyState
              size="sm"
              icon={<FileText className="size-4" />}
              title="No reports submitted yet."
            />
          ) : (
            <ReportHistoryBrowser
              reports={overview.recent_reports}
              userName={overview.full_name}
              deadline={getDeadlineContext(settings)}
              templates={templates}
              viewerRole={viewer.role}
              currentUserId={viewer.id}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
