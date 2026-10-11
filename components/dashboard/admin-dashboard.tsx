import { getOrganizationSummary } from "@/lib/supabase/queries/admin/overview";
import { getDeptCompletionToday } from "@/lib/supabase/queries/admin/dept-completion";
import { getAllDepartments } from "@/lib/supabase/queries/admin/departments";
import { getAllEmployees } from "@/lib/supabase/queries/admin/employees";
import { getActivityLog } from "@/lib/supabase/queries/admin/activity";
import { getTodayReport, getReportStatsData } from "@/lib/supabase/queries/reports";
import { getAvatarsByProfileIds, getCurrentProfile } from "@/lib/supabase/queries/profile";
import { getOrgTemplatesWithFields, resolveTemplate } from "@/lib/supabase/queries/templates";
import { getOrganizationName } from "@/lib/supabase/queries/organization";
import { getDeadlineContext, getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { getForYouNotifications, getMyNotifications } from "@/lib/supabase/queries/notifications";
import { getMyRewardStats, getMyUnlocks, syncMyUnlocks } from "@/lib/actions/avatar";
import { dateNDaysAgo, formatHourLabel, hourInTimeZone, isWorkingDay, todayInTimezone } from "@/lib/helpers/dates";
import { getAttendanceSettings, getMyTodayAttendanceStatus } from "@/lib/supabase/queries/attendance";
import { getOrgReportsForDate } from "@/lib/supabase/queries/admin/org-reports";
import { getReportCommentCounts } from "@/lib/supabase/queries/report-comments";
import { createClient } from "@/lib/supabase/server";
import {
  buildAttendanceStatusMap,
  computeReportStats,
} from "@/lib/helpers/report-stats";
import type { AttendanceStatus } from "@/types/attendance";
import { Building2, FileText, UserPlus } from "lucide-react";
import { HomeActivityCard } from "@/components/dashboard/home-activity-card";
import { InviteEmployeeDialog } from "@/components/admin/invite-employee-dialog";
import { CreateDepartmentDialog } from "@/components/admin/create-department-dialog";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { ShortcutCard, ShortcutLink } from "@/components/dashboard/shortcut-card";
import type { HeroPanelId } from "@/components/dashboard/hero-controller";
import { CompletionLineChart } from "@/components/analytics/completion-line-chart";
import { getCompanyCompletion } from "@/lib/supabase/queries/admin/analytics";
import { getLeaveUntilByProfile } from "@/lib/supabase/queries/leave-until";
import { DeptCompletionCard } from "@/components/dashboard/dept-completion-card";
import type { ReportTemplateWithFields } from "@/types/template";

const HOME_ACTIVITY_LIMIT = 40;

// Rendered at both "/" (Home, for the admin role) and "/admin" (kept
// reachable directly in case it's bookmarked) — one component, not two
// parallel implementations of the same org overview.
export async function AdminDashboard({
  initialPanel,
}: {
  initialPanel: HeroPanelId | null;
}) {
  const supabase = await createClient();
  const [summary, deptCompletion, recentActivity, todayReport, settings, orgTemplates, allDepartments, employees, profile, orgName, notifications, forYou, rewardStats, unlocks, statsRows, attendanceResult, freshUnlocks, attendanceSettings] =
    await Promise.all([
      getOrganizationSummary(),
      getDeptCompletionToday(),
      getActivityLog(HOME_ACTIVITY_LIMIT),
      getTodayReport(),
      getOrganizationSettings(),
      getOrgTemplatesWithFields(),
      getAllDepartments(),
      getAllEmployees(),
      getCurrentProfile(),
      getOrganizationName(),
      getMyNotifications(),
      getForYouNotifications(),
      getMyRewardStats(),
      getMyUnlocks(),
      getReportStatsData(),
      (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return { data: [] };
        return supabase
          .from("attendance_records")
          .select("date, status")
          .eq("profile_id", user.id)
          .gte("date", dateNDaysAgo(399));
      })(),
      syncMyUnlocks(),
      getAttendanceSettings(),
    ]);
  const template: ReportTemplateWithFields | undefined = profile
    ? ((await resolveTemplate(profile.id, profile.department_ids)) ?? undefined)
    : undefined;

  const todayDate = todayInTimezone(settings.timezone);
  const { members: company } = await getOrgReportsForDate(todayDate);
  const leaveUntil = await getLeaveUntilByProfile(
    company.filter((member) => member.attendanceStatus === "leave").map((member) => member.employeeId),
    todayDate,
  );
  const companyCompletion = await getCompanyCompletion();
  const commentCounts = await getReportCommentCounts(
    company.flatMap((member) => (member.report ? [member.report.id] : [])),
  );
  const todayAttendanceStatus = await getMyTodayAttendanceStatus(todayDate);
  const isHoliday = todayAttendanceStatus === "holiday";
  const isOffDay = !isWorkingDay(todayDate, settings.workingDays) || isHoliday;
  const onFullDayLeave = todayAttendanceStatus === "leave";
  const isBirthday = profile?.date_of_birth?.slice(5, 10) === todayDate.slice(5, 10);
  const currentStreak = computeReportStats(statsRows, settings.timezone, {
    workingDays: settings.workingDays,
    attendanceByDate: buildAttendanceStatusMap(
      (attendanceResult.data as { date: string; status: AttendanceStatus }[]) ?? [],
    ),
  }).currentStreak;
  const actorAvatars = await getAvatarsByProfileIds(
    forYou.flatMap((note) =>
      note.entity_type === "employee" && note.entity_id ? [note.entity_id] : [],
    ),
  );
  const unread = notifications
    .filter((note) => note.read_at == null)
    .map((note) => ({ type: note.type, created_at: note.created_at }));

  // Context line is org status only — report/off-day actions live in
  // HeroReportStatus below the divider.
  let contextLine: string;
  if (summary.totalMembers === 0 && summary.pendingInvites > 0) {
    contextLine = `${summary.pendingInvites} invitation${summary.pendingInvites === 1 ? "" : "s"} pending. Waiting for your first employee to sign in`;
  } else if (summary.totalMembers === 0) {
    contextLine = "Start by inviting your first employee";
  } else if (summary.completionPercentageToday === 100) {
    contextLine = `All ${summary.totalMembers} employees have submitted today`;
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
        avatar={profile?.avatar}
        hasReport={!!todayReport}
        isOffDay={isOffDay}
        onFullDayLeave={onFullDayLeave}
        isBirthday={isBirthday}
        orgDate={todayDate}
        timeZone={settings.timezone}
        deadlineHourLocal={settings.reportDeadlineHourLocal}
        currentStreak={currentStreak}
        teamComplete={
          summary.completionPercentageToday === 100 && summary.totalMembers > 0
        }
        unread={unread}
        notifications={forYou}
        actorAvatars={actorAvatars}
        rewardStats={rewardStats}
        unlocks={unlocks}
        asOf={new Date().toISOString()}
        freshUnlocks={freshUnlocks}
        contextLine={contextLine}
        isReporting={profile?.is_reporting ?? true}
        initialPanel={initialPanel}
        todayReport={todayReport}
        template={template}
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
                { label: "Total Members", value: String(summary.totalMembers) },
                {
                  label: "Submitted Today",
                  value: String(summary.submittedToday),
                },
              ]
            : [
                { label: "Total Members", value: String(summary.totalMembers) },
                {
                  label: "Submitted Today",
                  value: String(summary.submittedToday),
                },
                {
                  label: "Missing Today",
                  value: String(summary.missingToday),
                },
                {
                  label: "Today's Completion",
                  value:
                    summary.totalMembers === 0
                      ? "—"
                      : `${summary.completionPercentageToday}%`,
                },
              ]
        }
      />

      <div
        className="animate-in fade-in-0 duration-300 fill-mode-both"
        style={{ animationDelay: "0ms" }}
      >
        <CompletionLineChart
          title="Company completion"
          trend={companyCompletion.trend}
          previousAverage={companyCompletion.previousAverage}
          today={todayDate}
        />
      </div>

      <div
        className="animate-in fade-in-0 duration-300 fill-mode-both"
        style={{ animationDelay: "75ms" }}
      >
        <DeptCompletionCard
          initialDepartments={deptCompletion}
          timezone={settings.timezone}
          initialDate={todayDate}
          workingDays={settings.workingDays}
          initialIsOffDay={isOffDay}
          deadlinePassedToday={hourInTimeZone(settings.timezone) >= settings.reportDeadlineHourLocal}
        />
      </div>

      <div
        className="grid gap-4 sm:grid-cols-3 animate-in fade-in-0 duration-300 fill-mode-both"
        style={{ animationDelay: "75ms" }}
      >
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

      <HomeActivityCard
        mode="company"
        className="animate-in fade-in-0 duration-300 fill-mode-both"
        items={recentActivity}
        timeZone={settings.timezone}
        today={{
          date: todayDate,
          submitted: summary.submittedToday,
          expected: isOffDay ? 0 : summary.totalMembers,
          deadlineLabel: formatHourLabel(settings.reportDeadlineHourLocal),
          deadlinePassed:
            hourInTimeZone(settings.timezone) >= settings.reportDeadlineHourLocal,
        }}
        days={companyCompletion.trend}
        currentUserId={profile?.id}
      />
    </div>
  );
}
