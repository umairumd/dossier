import { Suspense } from "react";
import { LeaveBalanceCardSkeleton } from "@/components/attendance/skeletons";
import { getOrganizationSummary } from "@/lib/supabase/queries/admin/overview";
import { getDeptCompletionToday } from "@/lib/supabase/queries/admin/dept-completion";
import { getAllDepartments } from "@/lib/supabase/queries/admin/departments";
import { getAllEmployees } from "@/lib/supabase/queries/admin/employees";
import { getActivityLog } from "@/lib/supabase/queries/admin/activity";
import { getTodayReport, getReportStatsData } from "@/lib/supabase/queries/reports";
import { getAvatarsByProfileIds, getCurrentProfile } from "@/lib/supabase/queries/profile";
import { getOrgTemplatesWithFields, resolveTemplate } from "@/lib/supabase/queries/templates";
import { getOrganizationName } from "@/lib/supabase/queries/organization";
import { getDeadlineContext } from "@/lib/supabase/queries/organization-settings";
import { getForYouNotifications, getMyNotifications } from "@/lib/supabase/queries/notifications";
import { getMyRewardStats, getMyUnlocks } from "@/lib/actions/avatar";
import { formatHourLabel } from "@/lib/helpers/dates";
import {
  getActiveLeaveBalance,
  getAttendanceSettings,
} from "@/lib/supabase/queries/attendance";
import { getOrgReportsForDate } from "@/lib/supabase/queries/admin/org-reports";
import { getReportCommentCounts } from "@/lib/supabase/queries/report-comments";
import { getHomeDay, getMyAttendanceHistory } from "@/lib/supabase/queries/home";
import { buildAttendanceStatusMap, computeReportStats } from "@/lib/helpers/report-stats";
import { Building2, FileText, UserPlus } from "lucide-react";
import { HomeActivityCard } from "@/components/dashboard/home-activity-card";
import { HomeLeaveBalance } from "@/components/dashboard/home-leave-balance";
import { InviteEmployeeDialog } from "@/components/admin/invite-employee-dialog";
import { CreateDepartmentDialog } from "@/components/admin/create-department-dialog";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { ShortcutCard, ShortcutLink } from "@/components/dashboard/shortcut-card";
import { SHORTCUT_GRID } from "@/components/dashboard/shortcut-styles";
import type { HeroPanelId } from "@/components/dashboard/hero-controller";
import { CompletionLineChart } from "@/components/analytics/completion-line-chart";
import { getCompanyCompletion } from "@/lib/supabase/queries/admin/analytics";
import { getLeaveUntilByProfile } from "@/lib/supabase/queries/leave-until";
import { DeptCompletionCard } from "@/components/dashboard/dept-completion-card";
import {
  CompletionChartSkeleton,
  DeptCompletionSkeleton,
  HomeActivitySkeleton,
  HomeHeroSkeleton,
  ShortcutGridSkeleton,
} from "@/components/shared/skeletons";

const HOME_ACTIVITY_LIMIT = 40;

// Rendered at both "/" (Home, for the admin role) and "/admin" (kept
// reachable directly in case it's bookmarked) — one component, not two
// parallel implementations of the same org overview.
//
// Each card fetches its own data and streams in behind its own skeleton, so
// the page fills in card by card instead of waiting for the slowest query.
// Shared queries are cache()-wrapped and run once per request. The cards sit
// inside the hero's boundary: they all start fetching at once, but none can
// appear before the hero does.
export function AdminDashboard({ initialPanel }: { initialPanel: HeroPanelId | null }) {
  const chart = <CompletionChartSkeleton />;
  const departments = <DeptCompletionSkeleton />;
  const shortcuts = <ShortcutGridSkeleton />;
  const activity = <HomeActivitySkeleton />;

  return (
    <div className="flex flex-col gap-6">
      <Suspense
        fallback={
          <>
            <HomeHeroSkeleton />
            <LeaveBalanceCardSkeleton />
            {chart}
            {departments}
            {shortcuts}
            {activity}
          </>
        }
      >
        <AdminHero initialPanel={initialPanel} />
        <Suspense fallback={chart}>
          <CompanyCompletionSection />
        </Suspense>
        <Suspense fallback={departments}>
          <DepartmentsSection />
        </Suspense>
        <Suspense fallback={shortcuts}>
          <ShortcutsSection />
        </Suspense>
        <Suspense fallback={activity}>
          <CompanyActivitySection />
        </Suspense>
      </Suspense>
    </div>
  );
}

async function AdminHero({ initialPanel }: { initialPanel: HeroPanelId | null }) {
  // Dependent queries are chained inside one Promise.all, so each chain
  // starts as soon as its input is ready instead of after every other query.
  const dayP = getHomeDay();
  const profileP = getCurrentProfile();
  const forYouP = getForYouNotifications();
  const companyP = dayP.then((day) => getOrgReportsForDate(day.todayDate)).then((r) => r.members);

  const [
    day,
    profile,
    forYou,
    company,
    summary,
    todayReport,
    orgTemplates,
    notifications,
    rewardStats,
    unlocks,
    statsRows,
    attendanceRows,
    attendanceSettings,
    template,
    leaveUntil,
    commentCounts,
    leaveBalance,
    actorAvatars,
  ] = await Promise.all([
    dayP,
    profileP,
    forYouP,
    companyP,
    getOrganizationSummary(),
    getTodayReport(),
    getOrgTemplatesWithFields(),
    getMyNotifications(),
    getMyRewardStats(),
    getMyUnlocks(),
    getReportStatsData(),
    getMyAttendanceHistory(),
    getAttendanceSettings(),
    profileP.then((p) => (p ? resolveTemplate(p.id, p.department_ids) : null)),
    Promise.all([companyP, dayP]).then(([members, d]) =>
      getLeaveUntilByProfile(
        members.filter((member) => member.attendanceStatus === "leave").map((member) => member.employeeId),
        d.todayDate,
      ),
    ),
    companyP.then((members) =>
      getReportCommentCounts(members.flatMap((member) => (member.report ? [member.report.id] : []))),
    ),
    profileP.then((p) => (p ? getActiveLeaveBalance(p.id) : null)),
    forYouP.then((notes) =>
      getAvatarsByProfileIds(
        notes.flatMap((note) =>
          note.entity_type === "employee" && note.entity_id ? [note.entity_id] : [],
        ),
      ),
    ),
  ]);

  const { settings, todayDate, isOffDay, onFullDayLeave } = day;
  const isBirthday = profile?.date_of_birth?.slice(5, 10) === todayDate.slice(5, 10);
  const reportStats = computeReportStats(statsRows, settings.timezone, {
    workingDays: settings.workingDays,
    attendanceByDate: buildAttendanceStatusMap(attendanceRows),
    joinedOn: profile?.created_at,
  });
  const currentStreak = reportStats.currentStreak;
  const unread = notifications
    .filter((note) => note.read_at == null)
    .map((note) => ({ type: note.type, created_at: note.created_at }));

  // Context line is org status only — report/off-day actions live in
  // HeroReportStatus below the divider.
  let contextLine: string;
  if (
    summary.totalMembers === 0 &&
    summary.awayToday === 0 &&
    summary.pendingInvites > 0
  ) {
    contextLine = `${summary.pendingInvites} invitation${summary.pendingInvites === 1 ? "" : "s"} pending. Waiting for your first employee to sign in`;
  } else if (summary.totalMembers === 0 && summary.awayToday === 0) {
    contextLine = "Start by inviting your first employee";
  } else if (summary.totalMembers === 0 && summary.awayToday > 0) {
    contextLine = "Everyone expected today is on leave";
  } else if (summary.completionPercentageToday === 100) {
    contextLine = `All ${summary.totalMembers} employees have submitted today`;
  } else if (summary.pendingInvites > 0) {
    contextLine = `${summary.pendingInvites} employee${summary.pendingInvites === 1 ? "" : "s"} haven't accepted their invitation yet`;
  } else if (summary.missingToday > 0) {
    contextLine = `${summary.submittedToday} of ${summary.totalMembers} employees have submitted today`;
  } else {
    contextLine = `Managing ${summary.totalMembers} member${summary.totalMembers === 1 ? "" : "s"} across ${summary.departments} department${summary.departments === 1 ? "" : "s"}`;
  }

  // The hero reveals itself once its buddies are drawn (see DashboardHero).
  return (
    <div className="flex flex-col gap-6">
      <DashboardHero
        userId={profile?.id ?? ""}
        name={profile?.full_name ?? "Admin"}
        designation={profile?.designation}
        departmentNames={[]}
        avatar={profile?.avatar}
        hasReport={!!todayReport}
        isOffDay={isOffDay}
        onFullDayLeave={onFullDayLeave}
        isBirthday={isBirthday}
        orgDate={todayDate}
        timeZone={settings.timezone}
        deadlineHourLocal={settings.reportDeadlineHourLocal}
        currentStreak={currentStreak}
        submissionRate={reportStats.completionPercentage}
        teamComplete={summary.completionPercentageToday === 100 && summary.totalMembers > 0}
        unread={unread}
        notifications={forYou}
        actorAvatars={actorAvatars}
        rewardStats={rewardStats}
        unlocks={unlocks}
        asOf={new Date().toISOString()}
        contextLine={contextLine}
        isReporting={profile?.is_reporting ?? true}
        initialPanel={initialPanel}
        todayReport={todayReport}
        template={template ?? undefined}
        shiftFulltimeStart={attendanceSettings.shiftFulltimeStart}
        team={{
          label: "Company today",
          members: company.map((member) => ({
            ...member,
            leaveUntil: leaveUntil[member.employeeId] ?? null,
          })),
          commentCounts,
          teamPageHref: "/track-reports",
          orgOffDay: isOffDay,
          templates: orgTemplates,
          deadline: getDeadlineContext(settings),
          viewerRole: profile?.role ?? "admin",
          currentUserId: profile?.id ?? "",
        }}
        stats={
          isOffDay
            ? [
                { label: "Total members", value: String(summary.totalMembers) },
                { label: "Submitted today", value: String(summary.submittedToday) },
              ]
            : [
                { label: "Total members", value: String(summary.totalMembers) },
                { label: "Submitted today", value: String(summary.submittedToday) },
                { label: "Missing today", value: String(summary.missingToday) },
                {
                  label: "Today's completion",
                  value:
                    summary.totalMembers === 0 ? "—" : `${summary.completionPercentageToday}%`,
                },
              ]
        }
      />
      {profile ? (
        <HomeLeaveBalance
          balance={leaveBalance}
          profileId={profile.id}
          orgId={profile.organization_id ?? ""}
          contractStart={profile.contract_start}
        />
      ) : null}
    </div>
  );
}

async function CompanyCompletionSection() {
  const [companyCompletion, day] = await Promise.all([getCompanyCompletion(), getHomeDay()]);
  return (
    <div className="rise-in">
      <CompletionLineChart
        title="Company completion"
        trend={companyCompletion.trend}
        previousAverage={companyCompletion.previousAverage}
        today={day.todayDate}
      />
    </div>
  );
}

async function DepartmentsSection() {
  const [deptCompletion, day] = await Promise.all([getDeptCompletionToday(), getHomeDay()]);
  return (
    <div className="rise-in">
      <DeptCompletionCard
        initialDepartments={deptCompletion}
        timezone={day.settings.timezone}
        initialDate={day.todayDate}
        workingDays={day.settings.workingDays}
        initialIsOffDay={day.isOffDay}
        deadlinePassedToday={day.deadlinePassed}
      />
    </div>
  );
}

async function ShortcutsSection() {
  const [allDepartments, employees, orgName] = await Promise.all([
    getAllDepartments(),
    getAllEmployees(),
    getOrganizationName(),
  ]);
  const departmentOptions = allDepartments
    .filter((department) => department.archived_at === null)
    .map((department) => ({
      id: department.id,
      name: department.name,
      manager_name: department.manager_name,
    }));

  return (
    <div className={`rise-in ${SHORTCUT_GRID}`}>
      <InviteEmployeeDialog
        departments={departmentOptions}
        candidates={employees}
        orgName={orgName}
        trigger={
          <ShortcutCard
            icon={<UserPlus className="size-4" />}
            title="Invite employee"
            hint="Send an invite by email"
          />
        }
      />
      <CreateDepartmentDialog
        trigger={
          <ShortcutCard
            icon={<Building2 className="size-4" />}
            title="New department"
            hint="Group people and assign a template"
          />
        }
      />
      <ShortcutLink
        href="/organization/templates/new"
        icon={<FileText className="size-4" />}
        title="New template"
        hint="Set the questions for daily reports"
      />
    </div>
  );
}

async function CompanyActivitySection() {
  const [recentActivity, summary, companyCompletion, day, profile] = await Promise.all([
    getActivityLog(HOME_ACTIVITY_LIMIT),
    getOrganizationSummary(),
    getCompanyCompletion(),
    getHomeDay(),
    getCurrentProfile(),
  ]);
  return (
    <HomeActivityCard
      mode="company"
      className="rise-in"
      items={recentActivity}
      timeZone={day.settings.timezone}
      today={{
        date: day.todayDate,
        submitted: summary.submittedToday,
        expected: day.isOffDay ? 0 : summary.totalMembers,
        away: day.isOffDay ? 0 : summary.awayToday,
        deadlineLabel: formatHourLabel(day.settings.reportDeadlineHourLocal),
        deadlinePassed: day.deadlinePassed,
      }}
      days={companyCompletion.trend}
      currentUserId={profile?.id}
    />
  );
}
