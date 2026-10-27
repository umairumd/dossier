import { Suspense } from "react";
import { getReportHistory, getReportStatsData, getTodayReport } from "@/lib/supabase/queries/reports";
import { getOrgTemplatesWithFields, resolveTemplate } from "@/lib/supabase/queries/templates";
import { getDeadlineContext } from "@/lib/supabase/queries/organization-settings";
import { getMyActivityLog } from "@/lib/supabase/queries/admin/activity";
import {
  getActiveLeaveBalance,
  getAttendanceSettings,
} from "@/lib/supabase/queries/attendance";
import { getForYouNotifications, getMyNotifications } from "@/lib/supabase/queries/notifications";
import { getAvatarsByProfileIds, type ProfileWithDepartment } from "@/lib/supabase/queries/profile";
import { getHomeDay, getMyAttendanceHistory } from "@/lib/supabase/queries/home";
import { getCommentsForReports } from "@/lib/supabase/queries/report-comments";
import { getMyPeopleDirectory } from "@/lib/supabase/queries/member/people";
import { getMyRewardStats, getMyUnlocks } from "@/lib/actions/avatar";
import { buildAttendanceStatusMap, computeReportStats } from "@/lib/helpers/report-stats";
import { HomeActivityCard } from "@/components/dashboard/home-activity-card";
import { HomeLeaveBalance } from "@/components/dashboard/home-leave-balance";
import { YourPeopleCard } from "@/components/dashboard/your-people-card";
import { ActivityStrip } from "@/components/dashboard/activity-strip";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import type { HeroPanelId } from "@/components/dashboard/hero-controller";
import { RecentReportsCard } from "@/components/reports/recent-reports-card";
import {
  ActivityStripSkeleton,
  HomeActivitySkeleton,
  HomeHeroSkeleton,
  RecentReportsSkeleton,
} from "@/components/shared/skeletons";

const RECENT_PREVIEW_SIZE = 5;
const MY_ACTIVITY_LIMIT = 20;

// Each card fetches its own data and streams in behind its own skeleton.
// Shared queries are cache()-wrapped and run once per request. The cards sit
// inside the hero's boundary: they all start fetching at once, but none can
// appear before the hero does.
export function EmployeeDashboard({
  profile,
  initialPanel,
}: {
  profile: ProfileWithDepartment;
  initialPanel: HeroPanelId | null;
}) {
  const strip = <ActivityStripSkeleton />;
  const recent = <RecentReportsSkeleton />;
  const activity = <HomeActivitySkeleton />;

  return (
    <div className="flex flex-col gap-6">
      <Suspense
        fallback={
          <>
            <HomeHeroSkeleton stats={3} team={false} />
            {strip}
            {recent}
            {activity}
          </>
        }
      >
        <EmployeeHero profile={profile} initialPanel={initialPanel} />
        <Suspense fallback={strip}>
          <ActivityStripSection />
        </Suspense>
        <Suspense fallback={recent}>
          <RecentReportsSection profile={profile} />
        </Suspense>
        <Suspense fallback={activity}>
          <MyActivitySection profileId={profile.id} />
        </Suspense>
      </Suspense>
    </div>
  );
}

async function EmployeeHero({
  profile,
  initialPanel,
}: {
  profile: ProfileWithDepartment;
  initialPanel: HeroPanelId | null;
}) {
  const forYouP = getForYouNotifications();
  const [
    day,
    forYou,
    todayReport,
    statsRows,
    template,
    attendanceRows,
    notifications,
    rewardStats,
    unlocks,
    attendanceSettings,
    leaveBalance,
    peopleDirectory,
    actorAvatars,
  ] = await Promise.all([
    getHomeDay(),
    forYouP,
    getTodayReport(),
    getReportStatsData(),
    resolveTemplate(profile.id, profile.department_ids),
    getMyAttendanceHistory(),
    getMyNotifications(),
    getMyRewardStats(),
    getMyUnlocks(),
    getAttendanceSettings(),
    getActiveLeaveBalance(profile.id),
    getMyPeopleDirectory(),
    forYouP.then((notes) =>
      getAvatarsByProfileIds(
        notes.flatMap((note) =>
          note.entity_type === "employee" && note.entity_id ? [note.entity_id] : [],
        ),
      ),
    ),
  ]);

  const { settings, todayDate, isOffDay, onFullDayLeave } = day;
  const stats = computeReportStats(statsRows, settings.timezone, {
    workingDays: settings.workingDays,
    attendanceByDate: buildAttendanceStatusMap(attendanceRows),
    joinedOn: profile.created_at,
  });
  const submittedToday = !!todayReport;
  const streak = stats.currentStreak;
  const isBirthday = profile.date_of_birth?.slice(5, 10) === todayDate.slice(5, 10);
  const unread = notifications
    .filter((note) => note.read_at == null)
    .map((note) => ({ type: note.type, created_at: note.created_at }));

  // Day-off messaging lives in HeroReportStatus; context line is streak-only
  // on working days (and a soft streak/caught-up line on off days).
  let contextLine: string;
  if (isOffDay) {
    if (streak > 2) {
      contextLine = `${streak}-day streak and counting. Great work`;
    } else if (streak === 2) {
      contextLine = "2 days in a row. You're building a streak";
    } else if (streak > 0) {
      contextLine = `${streak}-day streak`;
    } else {
      contextLine = "You're all caught up for today";
    }
  } else if (!submittedToday && streak > 0) {
    contextLine = `${streak}-day streak. Submit today's report to keep it going`;
  } else if (!submittedToday && streak === 0) {
    contextLine = "Submit today's report to start your streak";
  } else if (submittedToday && streak > 2) {
    contextLine = `${streak}-day streak and counting. Great work`;
  } else if (submittedToday && streak === 2) {
    contextLine = "2 days in a row. You're building a streak";
  } else {
    contextLine = "You're all caught up for today";
  }

  // The hero reveals itself once its buddies are drawn (see DashboardHero).
  return (
    <div className="flex flex-col gap-6">
      <DashboardHero
        userId={profile.id}
        name={profile.full_name}
        designation={profile.designation}
        departmentNames={profile.department_names}
        avatar={profile.avatar}
        hasReport={submittedToday}
        isOffDay={isOffDay}
        onFullDayLeave={onFullDayLeave}
        isBirthday={isBirthday}
        orgDate={todayDate}
        timeZone={settings.timezone}
        deadlineHourLocal={settings.reportDeadlineHourLocal}
        currentStreak={stats.currentStreak}
        submissionRate={stats.completionPercentage}
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
        stats={[
          { label: "Current streak", value: `${stats.currentStreak} days` },
          { label: "This month", value: `${stats.reportsThisMonth} reports` },
          { label: "30-day rate", value: `${stats.completionPercentage}%` },
        ]}
      />
      <HomeLeaveBalance
        balance={leaveBalance}
        profileId={profile.id}
        orgId={profile.organization_id ?? ""}
        joinDate={profile.created_at.slice(0, 10)}
      />
      <YourPeopleCard directory={peopleDirectory} />
    </div>
  );
}

async function ActivityStripSection() {
  const [statsRows, attendanceRows, day] = await Promise.all([
    getReportStatsData(),
    getMyAttendanceHistory(),
    getHomeDay(),
  ]);
  return (
    <div className="rise-in">
      <ActivityStrip
        reports={statsRows}
        timezone={day.settings.timezone}
        workingDays={day.settings.workingDays}
        attendanceByDate={buildAttendanceStatusMap(attendanceRows)}
      />
    </div>
  );
}

async function RecentReportsSection({ profile }: { profile: ProfileWithDepartment }) {
  const previewP = getReportHistory(1, RECENT_PREVIEW_SIZE);
  const [preview, templates, day, comments] = await Promise.all([
    previewP,
    getOrgTemplatesWithFields(),
    getHomeDay(),
    // Comments load with the card, so a report opens with them in place.
    previewP.then((p) => getCommentsForReports(p.reports.map((r) => r.id))),
  ]);
  return (
    <div className="rise-in">
      <RecentReportsCard
        reports={preview.reports}
        comments={comments}
        viewAllHref="/reports"
        deadline={getDeadlineContext(day.settings)}
        userName={profile.full_name}
        avatar={profile.avatar}
        templates={templates}
        viewerRole={profile.role}
        currentUserId={profile.id}
      />
    </div>
  );
}

async function MyActivitySection({ profileId }: { profileId: string }) {
  const [myActivity, day] = await Promise.all([getMyActivityLog(MY_ACTIVITY_LIMIT), getHomeDay()]);
  return (
    <HomeActivityCard
      mode="personal"
      className="rise-in"
      items={myActivity}
      timeZone={day.settings.timezone}
      today={{
        date: day.todayDate,
        submitted: 0,
        expected: 0,
        deadlineLabel: "",
        deadlinePassed: false,
      }}
      currentUserId={profileId}
    />
  );
}
