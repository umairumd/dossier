// Reward math for the buddy wardrobe. The dashboard streak in
// computeReportStats stays as it is; this walks the same skip and break
// rules for the longest streak and adds the counts that helper does not
// return. A holiday with no attendance row is a working day and can break
// a streak — the same limit as the dashboard.
import {
  dateInTimezone,
  daysBetweenDateStrings,
  isWorkingDay,
  shiftReportDate,
  todayInTimezone,
} from "@/lib/helpers/dates";
import {
  computeReportStats,
  isAttendanceExempt,
  type ReportStatsInput,
} from "@/lib/helpers/report-stats";
import { getSubmissionStatus, type DeadlineContext } from "@/lib/reports/submission-status";
import type { AttendanceStatus } from "@/types/attendance";
import type { RewardStats } from "@/lib/mascot";

const BREAK_ATTENDANCE: ReadonlySet<AttendanceStatus> = new Set([
  "absent",
  "late_major",
]);

export interface RewardTeamMember {
  id: string;
  createdAt: string;
}

export interface RewardTeamReport {
  authorId: string;
  reportDate: string;
}

export interface RewardTeamAttendance {
  profileId: string;
  date: string;
  status: AttendanceStatus;
}

export interface RewardStatsInput {
  reports: ReportStatsInput[];
  attendanceByDate: Map<string, AttendanceStatus>;
  workingDays: number[];
  deadline: DeadlineContext;
  /** Already passed through safeTimeZone. */
  timeZone: string;
  /** Fixture clock (YYYY-MM-DD). Defaults to today in `timeZone`. */
  today?: string;
  createdAt: string;
  dateOfBirth: string | null;
  /** Null for members, admins, and owners. */
  team: {
    members: RewardTeamMember[];
    reports: RewardTeamReport[];
    attendance: RewardTeamAttendance[];
  } | null;
}

type StreakStep = "skip" | "hit" | "break";

function streakStep(
  date: string,
  today: string,
  reportDates: ReadonlySet<string>,
  attendanceByDate: ReadonlyMap<string, AttendanceStatus>,
  workingDays: number[],
): StreakStep {
  const status = attendanceByDate.get(date);

  if (isAttendanceExempt(status)) return "skip";

  if (
    !status &&
    workingDays.length > 0 &&
    !isWorkingDay(date, workingDays)
  ) {
    return "skip";
  }

  if (status && BREAK_ATTENDANCE.has(status)) return "break";

  if (reportDates.has(date)) return "hit";

  // An unsubmitted working day today does not break the streak.
  if (
    date === today &&
    workingDays.length > 0 &&
    isWorkingDay(date, workingDays)
  ) {
    return "skip";
  }

  return "break";
}

function orgDate(iso: string, timeZone: string, fallback: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return fallback;
  return dateInTimezone(date, timeZone);
}

function isoMonday(date: string) {
  const utcDay = new Date(`${date}T00:00:00Z`).getUTCDay();
  const isoDay = utcDay === 0 ? 7 : utcDay;
  return shiftReportDate(date, 1 - isoDay);
}

function datesInMonth(year: number, month: number) {
  const dates: string[] = [];
  const cursor = new Date(Date.UTC(year, month - 1, 1));
  while (cursor.getUTCMonth() === month - 1) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

/** Every non-exempt working day in the span has an on-time report, at least one such day exists, and no working day is still ahead. */
function isPerfectSpan(
  dates: readonly string[],
  joinDate: string,
  today: string,
  onTime: ReadonlySet<string>,
  workingDays: number[],
  attendanceByDate: ReadonlyMap<string, AttendanceStatus>,
) {
  let due = 0;
  for (const date of dates) {
    if (!workingDays.length || !isWorkingDay(date, workingDays)) continue;
    if (isAttendanceExempt(attendanceByDate.get(date))) continue;
    if (date < joinDate) continue;
    if (date > today) return false;
    if (!onTime.has(date)) return false;
    due += 1;
  }
  return due > 0;
}

function countPerfectWeeks(
  joinDate: string,
  today: string,
  onTime: ReadonlySet<string>,
  workingDays: number[],
  attendanceByDate: ReadonlyMap<string, AttendanceStatus>,
) {
  if (!workingDays.length || joinDate > today) return 0;
  let count = 0;
  let monday = isoMonday(joinDate);
  const lastMonday = isoMonday(today);
  for (let guard = 0; monday <= lastMonday && guard < 3000; guard += 1) {
    const dates = Array.from({ length: 7 }, (_, index) =>
      shiftReportDate(monday, index),
    );
    if (isPerfectSpan(dates, joinDate, today, onTime, workingDays, attendanceByDate)) {
      count += 1;
    }
    monday = shiftReportDate(monday, 7);
  }
  return count;
}

function countPerfectMonths(
  joinDate: string,
  today: string,
  onTime: ReadonlySet<string>,
  workingDays: number[],
  attendanceByDate: ReadonlyMap<string, AttendanceStatus>,
) {
  if (!workingDays.length || joinDate > today) return 0;
  let count = 0;
  let year = Number(joinDate.slice(0, 4));
  let month = Number(joinDate.slice(5, 7));
  const endYear = Number(today.slice(0, 4));
  const endMonth = Number(today.slice(5, 7));
  for (let guard = 0; guard < 600; guard += 1) {
    if (
      isPerfectSpan(
        datesInMonth(year, month),
        joinDate,
        today,
        onTime,
        workingDays,
        attendanceByDate,
      )
    ) {
      count += 1;
    }
    if (year === endYear && month === endMonth) break;
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
  }
  return count;
}

function countTeamCompleteDays(
  team: NonNullable<RewardStatsInput["team"]>,
  today: string,
  timeZone: string,
  workingDays: number[],
) {
  if (!workingDays.length || team.members.length === 0) return 0;
  const reported = new Set(
    team.reports.map((report) => `${report.authorId}|${report.reportDate}`),
  );
  const exempt = new Set<string>();
  for (const row of team.attendance) {
    if (isAttendanceExempt(row.status)) {
      exempt.add(`${row.profileId}|${row.date}`);
    }
  }
  const joinedOn = new Map(
    team.members.map((member) => [
      member.id,
      orgDate(member.createdAt, timeZone, today),
    ]),
  );
  let count = 0;
  const start = shiftReportDate(today, -399);
  for (
    let date = start, guard = 0;
    date <= today && guard < 500;
    guard += 1
  ) {
    if (isWorkingDay(date, workingDays)) {
      const eligible = team.members.filter((member) => {
        const joined = joinedOn.get(member.id) ?? today;
        return joined <= date && !exempt.has(`${member.id}|${date}`);
      });
      if (
        eligible.length > 0 &&
        eligible.every((member) => reported.has(`${member.id}|${date}`))
      ) {
        count += 1;
      }
    }
    date = shiftReportDate(date, 1);
  }
  return count;
}

export function computeRewardStats(input: RewardStatsInput): RewardStats {
  const { attendanceByDate, workingDays, deadline, timeZone } = input;
  const today = input.today ?? todayInTimezone(timeZone);
  const joinDate = orgDate(input.createdAt, timeZone, today);
  const reportDates = new Set(input.reports.map((report) => report.report_date));
  const onTime = new Set<string>();

  for (const report of input.reports) {
    const status = attendanceByDate.get(report.report_date);
    const isOnLeave = status === "leave" || status === "half_leave";
    const isOffDay =
      (workingDays.length > 0 && !isWorkingDay(report.report_date, workingDays)) ||
      status === "holiday" ||
      status === "weekly_off";
    if (
      getSubmissionStatus(
        report.submitted_at,
        deadline.deadlineHourUtc,
        { ...deadline, timezone: timeZone },
        report.report_date,
        isOnLeave,
        isOffDay,
      ) === "on_time"
    ) {
      onTime.add(report.report_date);
    }
  }

  let longestStreak = 0;
  let onTimeStreak = 0;
  let longestOnTimeStreak = 0;
  if (joinDate <= today || reportDates.size > 0) {
    const earliest = [...reportDates].reduce(
      (min, date) => (date < min ? date : min),
      joinDate,
    );
    const start = earliest < joinDate ? earliest : joinDate;
    if (start <= today) {
      let run = 0;
      let onTimeRun = 0;
      for (
        let date = start, guard = 0;
        date <= today && guard < 20000;
        guard += 1
      ) {
        const step = streakStep(
          date,
          today,
          reportDates,
          attendanceByDate,
          workingDays,
        );
        if (step === "hit") {
          run += 1;
          if (run > longestStreak) longestStreak = run;
          // A late report on a counted day breaks the on-time run.
          // Exempt days never reach here; streakStep skips them first.
          if (onTime.has(date)) {
            onTimeRun += 1;
            if (onTimeRun > longestOnTimeStreak) longestOnTimeStreak = onTimeRun;
          } else {
            onTimeRun = 0;
          }
        } else if (step === "break") {
          run = 0;
          onTimeRun = 0;
        }
        date = shiftReportDate(date, 1);
      }
      onTimeStreak = onTimeRun;
    }
  }

  const monthDay = input.dateOfBirth?.slice(5, 10) ?? "";
  const currentStreak = computeReportStats(input.reports, timeZone, {
    workingDays,
    attendanceByDate,
    today,
  }).currentStreak;

  return {
    totalReports: reportDates.size,
    onTimeReports: onTime.size,
    currentStreak,
    longestStreak,
    onTimeStreak,
    longestOnTimeStreak,
    perfectWeeks: countPerfectWeeks(
      joinDate,
      today,
      onTime,
      workingDays,
      attendanceByDate,
    ),
    perfectMonths: countPerfectMonths(
      joinDate,
      today,
      onTime,
      workingDays,
      attendanceByDate,
    ),
    tenureDays: Math.max(0, daysBetweenDateStrings(joinDate, today)),
    isBirthdayToday: monthDay.length === 5 && monthDay === today.slice(5, 10),
    teamCompleteDays: input.team
      ? countTeamCompleteDays(input.team, today, timeZone, workingDays)
      : 0,
  };
}
