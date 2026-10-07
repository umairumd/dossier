import Link from "next/link";
import { getReportHistory, getReportStatsData, getTodayReport } from "@/lib/supabase/queries/reports";
import { getOrgTemplatesWithFields, resolveTemplate } from "@/lib/supabase/queries/templates";
import { getOrganizationSettings, getDeadlineContext } from "@/lib/supabase/queries/organization-settings";
import { getMyActivityLog } from "@/lib/supabase/queries/admin/activity";
import { getAttendanceSettings, getMyTodayAttendanceStatus } from "@/lib/supabase/queries/attendance";
import { getForYouNotifications, getMyNotifications } from "@/lib/supabase/queries/notifications";
import { getAvatarsByProfileIds, type ProfileWithDepartment } from "@/lib/supabase/queries/profile";
import { createClient } from "@/lib/supabase/server";
import { getMyRewardStats, getMyUnlocks, syncMyUnlocks } from "@/lib/actions/avatar";
import { dateNDaysAgo, isWorkingDay, todayInTimezone } from "@/lib/helpers/dates";
import {
  buildAttendanceStatusMap,
  computeReportStats,
} from "@/lib/helpers/report-stats";
import type { AttendanceStatus } from "@/types/attendance";
import { ActivityFeed } from "@/components/analytics/activity-feed";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ActivityStrip } from "@/components/dashboard/activity-strip";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import type { HeroPanelId } from "@/components/dashboard/hero-controller";
import { RecentReportsCard } from "@/components/reports/recent-reports-card";

const RECENT_PREVIEW_SIZE = 5;
const MY_ACTIVITY_LIMIT = 20;

export async function EmployeeDashboard({
  profile,
  initialPanel,
}: {
  profile: ProfileWithDepartment;
  initialPanel: HeroPanelId | null;
}) {
  const supabase = await createClient();
  const [todayReport, preview, statsRows, settings, template, templates, attendanceResult, myActivity, notifications, forYou, rewardStats, unlocks, freshUnlocks, attendanceSettings] =
    await Promise.all([
      getTodayReport(),
      getReportHistory(1, RECENT_PREVIEW_SIZE),
      getReportStatsData(),
      getOrganizationSettings(),
      resolveTemplate(profile.id, profile.department_ids),
      getOrgTemplatesWithFields(),
      supabase
        .from("attendance_records")
        .select("date, status")
        .eq("profile_id", profile.id)
        .gte("date", dateNDaysAgo(399)),
      getMyActivityLog(MY_ACTIVITY_LIMIT),
      getMyNotifications(),
      getForYouNotifications(),
      getMyRewardStats(),
      getMyUnlocks(),
      syncMyUnlocks(),
      getAttendanceSettings(),
    ]);

  const attendanceByDate = buildAttendanceStatusMap(
    (attendanceResult.data as { date: string; status: AttendanceStatus }[]) ??
      [],
  );
  const stats = computeReportStats(statsRows, settings.timezone, {
    workingDays: settings.workingDays,
    attendanceByDate,
  });
  const deadline = getDeadlineContext(settings);
  const submittedToday = !!todayReport;
  const streak = stats.currentStreak;
  const todayDate = todayInTimezone(settings.timezone);

  // Same off-day rule as manager/admin: non-working day or holiday attendance.
  const todayAttendanceStatus = await getMyTodayAttendanceStatus(todayDate);
  const isHoliday = todayAttendanceStatus === "holiday";
  const isOffDay = !isWorkingDay(todayDate, settings.workingDays) || isHoliday;
  const onFullDayLeave = todayAttendanceStatus === "leave";
  const isBirthday = profile.date_of_birth?.slice(5, 10) === todayDate.slice(5, 10);
  const actorAvatars = await getAvatarsByProfileIds(
    forYou.flatMap((note) =>
      note.entity_type === "employee" && note.entity_id ? [note.entity_id] : [],
    ),
  );
  const unread = notifications
    .filter((note) => note.read_at == null)
    .map((note) => ({ type: note.type, created_at: note.created_at }));

  // Day-off messaging lives in HeroReportStatus; context line is streak-only
  // on working days (and a soft streak/caught-up line on off days).
  let contextLine: string;
  if (isOffDay) {
    if (streak > 2) {
      contextLine = `🔥 ${streak}-day streak and counting — great work`;
    } else if (streak === 2) {
      contextLine = "2 days in a row — you're building a streak";
    } else if (streak > 0) {
      contextLine = `🔥 ${streak}-day streak`;
    } else {
      contextLine = "You're all caught up for today";
    }
  } else if (!submittedToday && streak > 0) {
    contextLine = `🔥 ${streak}-day streak — submit today's report to keep it going`;
  } else if (!submittedToday && streak === 0) {
    contextLine = "Submit today's report to start your streak";
  } else if (submittedToday && streak > 2) {
    contextLine = `🔥 ${streak}-day streak and counting — great work`;
  } else if (submittedToday && streak === 2) {
    contextLine = "2 days in a row — you're building a streak";
  } else {
    contextLine = "You're all caught up for today";
  }

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
        stats={[
          { label: "Current Streak", value: `${stats.currentStreak} days` },
          { label: "This Month", value: `${stats.reportsThisMonth} reports` },
          { label: "30-Day Rate", value: `${stats.completionPercentage}%` },
        ]}
      />

      <div
        className="animate-in fade-in-0 duration-300 fill-mode-both"
        style={{ animationDelay: "0ms" }}
      >
        <ActivityStrip
          reports={statsRows}
          timezone={settings.timezone}
          workingDays={settings.workingDays}
          attendanceByDate={attendanceByDate}
        />
      </div>

      <div
        className="animate-in fade-in-0 duration-300 fill-mode-both"
        style={{ animationDelay: "75ms" }}
      >
        <RecentReportsCard
          reports={preview.reports}
          viewAllHref="/reports"
          deadline={deadline}
          userName={profile.full_name}
          avatar={profile.avatar}
          templates={templates}
          viewerRole={profile.role}
          currentUserId={profile.id}
        />
      </div>

      <Card
        className="card-gradient animate-in fade-in-0 duration-300 fill-mode-both"
        style={{ animationDelay: "150ms" }}
      >
        <CardHeader>
          <CardTitle>Your Activity</CardTitle>
          <CardAction>
            <Link
              href="/activity"
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              View all
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent>
          <ActivityFeed
            variant="dashboard"
            items={myActivity}
            emptyMessage="No activity yet."
          />
        </CardContent>
      </Card>
    </div>
  );
}
