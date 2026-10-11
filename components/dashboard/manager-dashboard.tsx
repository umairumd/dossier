import { getTodayReport, getReportStatsData } from "@/lib/supabase/queries/reports";
import { getOrgTemplatesWithFields, resolveTemplate } from "@/lib/supabase/queries/templates";
import { getTeamReportsForDate } from "@/lib/supabase/queries/manager/team";
import { getTeamInsights } from "@/lib/supabase/queries/manager/insights";
import { getDeadlineContext, getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { getReportCommentCounts } from "@/lib/supabase/queries/report-comments";
import { getAttendanceSettings, getMyTodayAttendanceStatus } from "@/lib/supabase/queries/attendance";
import { getForYouNotifications, getMyNotifications } from "@/lib/supabase/queries/notifications";
import { getAvatarsByProfileIds, type ProfileWithDepartment } from "@/lib/supabase/queries/profile";
import { createClient } from "@/lib/supabase/server";
import { getMyRewardStats, getMyUnlocks, syncMyUnlocks } from "@/lib/actions/avatar";
import { dateNDaysAgo, formatHourLabel, hourInTimeZone, isWorkingDay, todayInTimezone } from "@/lib/helpers/dates";
import {
  buildAttendanceStatusMap,
  computeReportStats,
} from "@/lib/helpers/report-stats";
import type { AttendanceStatus } from "@/types/attendance";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import type { HeroPanelId } from "@/components/dashboard/hero-controller";
import { HomeActivityCard } from "@/components/dashboard/home-activity-card";
import { CompletionLineChart } from "@/components/analytics/completion-line-chart";
import { getLeaveUntilByProfile } from "@/lib/supabase/queries/leave-until";
import { TeamHighlights } from "@/components/manager/team-highlights";

export async function ManagerDashboard({
  profile,
  initialPanel,
}: {
  profile: ProfileWithDepartment;
  initialPanel: HeroPanelId | null;
}) {
  const supabase = await createClient();
  const [todayReport, members, insights, settings, template, orgTemplates, statsRows, attendanceResult, notifications, forYou, rewardStats, unlocks, freshUnlocks, attendanceSettings] = await Promise.all([
    getTodayReport(),
    getTeamReportsForDate(),
    getTeamInsights(),
    getOrganizationSettings(),
    resolveTemplate(profile.id, profile.department_ids),
    getOrgTemplatesWithFields(),
    getReportStatsData(),
    supabase
      .from("attendance_records")
      .select("date, status")
      .eq("profile_id", profile.id)
      .gte("date", dateNDaysAgo(399)),
    getMyNotifications(),
    getForYouNotifications(),
    getMyRewardStats(),
    getMyUnlocks(),
    syncMyUnlocks(),
    getAttendanceSettings(),
  ]);
  const teamSize = members.length;
  const submittedToday = members.filter((member) => member.report).length;
  const missingToday = teamSize - submittedToday;
  const completionPercentage =
    teamSize === 0 ? 0 : Math.round((submittedToday / teamSize) * 100);
  const todayDate = todayInTimezone(settings.timezone);
  const commentCounts = await getReportCommentCounts(
    members.flatMap((member) => (member.report ? [member.report.id] : [])),
  );

  // Off-day awareness: weekends/non-working days from org config, plus
  // holidays recorded in attendance_records.
  const todayAttendanceStatus = await getMyTodayAttendanceStatus(todayDate);
  const isHoliday = todayAttendanceStatus === "holiday";
  const isOffDay = !isWorkingDay(todayDate, settings.workingDays) || isHoliday;
  const onFullDayLeave = todayAttendanceStatus === "leave";
  const isBirthday = profile.date_of_birth?.slice(5, 10) === todayDate.slice(5, 10);
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
  const leaveUntil = await getLeaveUntilByProfile(
    members.filter((member) => member.attendanceStatus === "leave").map((member) => member.employeeId),
    todayDate,
  );
  const unread = notifications
    .filter((note) => note.read_at == null)
    .map((note) => ({ type: note.type, created_at: note.created_at }));

  // Context line is team status only — report/off-day actions live in
  // HeroReportStatus below the divider.
  let contextLine: string;
  if (teamSize === 0) {
    contextLine = "No team members assigned yet";
  } else if (missingToday === 0) {
    contextLine = `Your entire team has submitted today`;
  } else {
    contextLine = `${submittedToday} of ${teamSize} team members have submitted today`;
  }

  return (
    <div className="flex flex-col gap-6">
      <DashboardHero
        userId={profile.id}
        name={profile.full_name}
        designation={profile.designation}
        departmentNames={profile.department_names}
        avatar={profile.avatar}
        hasReport={!!todayReport}
        isOffDay={isOffDay}
        onFullDayLeave={onFullDayLeave}
        isBirthday={isBirthday}
        orgDate={todayDate}
        timeZone={settings.timezone}
        deadlineHourLocal={settings.reportDeadlineHourLocal}
        currentStreak={currentStreak}
        teamComplete={missingToday === 0 && teamSize > 0}
        unread={unread}
        notifications={forYou}
        actorAvatars={actorAvatars}
        rewardStats={rewardStats}
        unlocks={unlocks}
        asOf={new Date().toISOString()}
        freshUnlocks={freshUnlocks}
        contextLine={contextLine}
        isReporting={profile.is_reporting}
        initialPanel={initialPanel}
        todayReport={todayReport}
        template={template ?? undefined}
        shiftFulltimeStart={attendanceSettings.shiftFulltimeStart}
        team={{
          label: "Team today",
          members: members.map((member) => ({
            ...member,
            leaveUntil: leaveUntil[member.employeeId] ?? null,
          })),
          commentCounts,
          teamPageHref: "/team-reports",
          orgOffDay: isOffDay,
          templates: orgTemplates,
          deadline: getDeadlineContext(settings),
          viewerRole: profile.role,
          currentUserId: profile.id,
        }}
        stats={
          isOffDay
            ? [
                { label: "Team size", value: String(teamSize) },
                { label: "Submitted", value: String(submittedToday) },
              ]
            : [
                { label: "Team size", value: String(teamSize) },
                { label: "Submitted", value: String(submittedToday) },
                { label: "Missing", value: String(missingToday) },
                { label: "Completion", value: `${completionPercentage}%` },
              ]
        }
      />

      <div className="animate-in fade-in-0 duration-300 fill-mode-both" style={{ animationDelay: "0ms" }}>
        <CompletionLineChart
          title="Team completion"
          trend={insights.trend}
          previousAverage={insights.previousAverage}
          today={todayDate}
        />
      </div>

      <div
        className="animate-in fade-in-0 duration-300 fill-mode-both"
        style={{ animationDelay: "75ms" }}
      >
        <TeamHighlights
          longestStreaks={insights.longestStreaks}
          frequentlyMissing={insights.frequentlyMissing}
        />
      </div>

      <HomeActivityCard
        mode="team"
        className="animate-in fade-in-0 duration-300 fill-mode-both"
        items={insights.recentActivity}
        timeZone={settings.timezone}
        today={{
          date: todayDate,
          submitted: submittedToday,
          expected: isOffDay ? 0 : teamSize,
          deadlineLabel: formatHourLabel(settings.reportDeadlineHourLocal),
          deadlinePassed:
            hourInTimeZone(settings.timezone) >= settings.reportDeadlineHourLocal,
        }}
        days={insights.trend}
        currentUserId={profile.id}
      />
    </div>
  );
}
