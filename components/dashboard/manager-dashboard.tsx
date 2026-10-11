import { Suspense } from "react";
import { getTodayReport, getReportStatsData } from "@/lib/supabase/queries/reports";
import { getOrgTemplatesWithFields, resolveTemplate } from "@/lib/supabase/queries/templates";
import { getTeamReportsForDate } from "@/lib/supabase/queries/manager/team";
import { getTeamInsights } from "@/lib/supabase/queries/manager/insights";
import { getDeadlineContext } from "@/lib/supabase/queries/organization-settings";
import { getReportCommentCounts } from "@/lib/supabase/queries/report-comments";
import { getAttendanceSettings } from "@/lib/supabase/queries/attendance";
import { getForYouNotifications, getMyNotifications } from "@/lib/supabase/queries/notifications";
import { getAvatarsByProfileIds, type ProfileWithDepartment } from "@/lib/supabase/queries/profile";
import { getHomeDay, getMyAttendanceHistory } from "@/lib/supabase/queries/home";
import { getMyRewardStats, getMyUnlocks } from "@/lib/actions/avatar";
import { formatHourLabel } from "@/lib/helpers/dates";
import { buildAttendanceStatusMap, computeReportStats } from "@/lib/helpers/report-stats";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import type { HeroPanelId } from "@/components/dashboard/hero-controller";
import { HomeActivityCard } from "@/components/dashboard/home-activity-card";
import { CompletionLineChart } from "@/components/analytics/completion-line-chart";
import { getLeaveUntilByProfile } from "@/lib/supabase/queries/leave-until";
import { TeamHighlights } from "@/components/manager/team-highlights";
import {
  CompletionChartSkeleton,
  HomeActivitySkeleton,
  HomeHeroSkeleton,
  TeamHighlightsSkeleton,
} from "@/components/shared/skeletons";

// Each card fetches its own data and streams in behind its own skeleton.
// Shared queries are cache()-wrapped and run once per request. The cards sit
// inside the hero's boundary: they all start fetching at once, but none can
// appear before the hero does.
export function ManagerDashboard({
  profile,
  initialPanel,
}: {
  profile: ProfileWithDepartment;
  initialPanel: HeroPanelId | null;
}) {
  const chart = <CompletionChartSkeleton />;
  const highlights = <TeamHighlightsSkeleton />;
  const activity = <HomeActivitySkeleton />;

  return (
    <div className="flex flex-col gap-6">
      <Suspense
        fallback={
          <>
            <HomeHeroSkeleton />
            {chart}
            {highlights}
            {activity}
          </>
        }
      >
        <ManagerHero profile={profile} initialPanel={initialPanel} />
        <Suspense fallback={chart}>
          <TeamCompletionSection />
        </Suspense>
        <Suspense fallback={highlights}>
          <TeamHighlightsSection />
        </Suspense>
        <Suspense fallback={activity}>
          <TeamActivitySection profileId={profile.id} />
        </Suspense>
      </Suspense>
    </div>
  );
}

function teamCounts(members: { report: unknown }[]) {
  const teamSize = members.length;
  const submittedToday = members.filter((member) => member.report).length;
  return { teamSize, submittedToday, missingToday: teamSize - submittedToday };
}

async function ManagerHero({
  profile,
  initialPanel,
}: {
  profile: ProfileWithDepartment;
  initialPanel: HeroPanelId | null;
}) {
  // Dependent queries are chained inside one Promise.all, so each chain
  // starts as soon as its input is ready instead of after every other query.
  const dayP = getHomeDay();
  const membersP = getTeamReportsForDate();
  const forYouP = getForYouNotifications();

  const [
    day,
    members,
    forYou,
    todayReport,
    template,
    orgTemplates,
    statsRows,
    attendanceRows,
    notifications,
    rewardStats,
    unlocks,
    attendanceSettings,
    commentCounts,
    leaveUntil,
    actorAvatars,
  ] = await Promise.all([
    dayP,
    membersP,
    forYouP,
    getTodayReport(),
    resolveTemplate(profile.id, profile.department_ids),
    getOrgTemplatesWithFields(),
    getReportStatsData(),
    getMyAttendanceHistory(),
    getMyNotifications(),
    getMyRewardStats(),
    getMyUnlocks(),
    getAttendanceSettings(),
    membersP.then((team) =>
      getReportCommentCounts(team.flatMap((member) => (member.report ? [member.report.id] : []))),
    ),
    Promise.all([membersP, dayP]).then(([team, d]) =>
      getLeaveUntilByProfile(
        team.filter((member) => member.attendanceStatus === "leave").map((member) => member.employeeId),
        d.todayDate,
      ),
    ),
    forYouP.then((notes) =>
      getAvatarsByProfileIds(
        notes.flatMap((note) =>
          note.entity_type === "employee" && note.entity_id ? [note.entity_id] : [],
        ),
      ),
    ),
  ]);

  const { settings, todayDate, isOffDay, onFullDayLeave } = day;
  const { teamSize, submittedToday, missingToday } = teamCounts(members);
  const completionPercentage = teamSize === 0 ? 0 : Math.round((submittedToday / teamSize) * 100);
  const isBirthday = profile.date_of_birth?.slice(5, 10) === todayDate.slice(5, 10);
  const reportStats = computeReportStats(statsRows, settings.timezone, {
    workingDays: settings.workingDays,
    attendanceByDate: buildAttendanceStatusMap(attendanceRows),
  });
  const currentStreak = reportStats.currentStreak;
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

  // The hero reveals itself once its buddies are drawn (see DashboardHero).
  return (
    <div>
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
        submissionRate={reportStats.completionPercentage}
        teamComplete={missingToday === 0 && teamSize > 0}
        unread={unread}
        notifications={forYou}
        actorAvatars={actorAvatars}
        rewardStats={rewardStats}
        unlocks={unlocks}
        asOf={new Date().toISOString()}
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
    </div>
  );
}

async function TeamCompletionSection() {
  const [insights, day] = await Promise.all([getTeamInsights(), getHomeDay()]);
  return (
    <div className="rise-in">
      <CompletionLineChart
        title="Team completion"
        trend={insights.trend}
        previousAverage={insights.previousAverage}
        today={day.todayDate}
      />
    </div>
  );
}

async function TeamHighlightsSection() {
  const insights = await getTeamInsights();
  return (
    <div className="rise-in">
      <TeamHighlights
        longestStreaks={insights.longestStreaks}
        frequentlyMissing={insights.frequentlyMissing}
      />
    </div>
  );
}

async function TeamActivitySection({ profileId }: { profileId: string }) {
  const [insights, members, day] = await Promise.all([
    getTeamInsights(),
    getTeamReportsForDate(),
    getHomeDay(),
  ]);
  const { teamSize, submittedToday } = teamCounts(members);
  return (
    <HomeActivityCard
      mode="team"
      className="rise-in"
      items={insights.recentActivity}
      timeZone={day.settings.timezone}
      today={{
        date: day.todayDate,
        submitted: submittedToday,
        expected: day.isOffDay ? 0 : teamSize,
        deadlineLabel: formatHourLabel(day.settings.reportDeadlineHourLocal),
        deadlinePassed: day.deadlinePassed,
      }}
      days={insights.trend}
      currentUserId={profileId}
    />
  );
}
