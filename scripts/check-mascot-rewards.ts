/**
 * Reward-stat and catalog checks for Dossier Buddy.
 * Run: npm run check:mascot
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  computeRewardStats,
  type RewardStatsInput,
  type RewardTeamAttendance,
} from "../lib/helpers/reward-stats";
import {
  seasonWindowLabel,
  unlockProgressLabel,
} from "../lib/helpers/unlock-progress-label";
import {
  ACCESSORIES,
  ACCESSORY_IDS,
  SET_ASIDE,
  evaluateUnlocks,
  isWearable,
  unlockProgress,
  type AccessoryId,
  type RewardStats,
} from "../lib/mascot/index";
import type { AttendanceStatus } from "../types/attendance";
import type { DeadlineContext } from "../lib/reports/submission-status";

const WEEKDAYS = [1, 2, 3, 4, 5];
const TZ = "UTC";
const DEADLINE: DeadlineContext = {
  deadlineHourUtc: 17,
  deadlineHourLocal: 17,
  timezone: TZ,
  workingDays: WEEKDAYS,
};

function onTime(date: string) {
  return { report_date: date, submitted_at: `${date}T09:00:00.000Z` };
}

function late(date: string) {
  return { report_date: date, submitted_at: `${date}T18:00:00.000Z` };
}

function input(
  today: string,
  reports: RewardStatsInput["reports"],
  attendance: Array<[string, AttendanceStatus]> = [],
  createdAt = "2026-01-01T12:00:00.000Z",
  team: RewardStatsInput["team"] = null,
): RewardStatsInput {
  return {
    reports,
    attendanceByDate: new Map(attendance),
    workingDays: WEEKDAYS,
    deadline: DEADLINE,
    timeZone: TZ,
    today,
    createdAt,
    dateOfBirth: null,
    team,
  };
}

function blankStats(): RewardStats {
  return {
    totalReports: 0,
    onTimeReports: 0,
    currentStreak: 0,
    longestStreak: 0,
    onTimeStreak: 0,
    longestOnTimeStreak: 0,
    perfectWeeks: 0,
    perfectMonths: 0,
    tenureDays: 0,
    isBirthdayToday: false,
    teamCompleteDays: 0,
  };
}

function earned(stats: RewardStats) {
  return new Set(evaluateUnlocks(stats, new Set()));
}

function has(stats: RewardStats, id: AccessoryId) {
  return earned(stats).has(id);
}

// 2026-10-07 is a Wednesday. Mon 10-05, Tue 10-06, Fri 10-02, weekend 10-03/04.
// September's last weekday is Wed 09-30. The week of Mon 09-28 ends Fri 10-02.

const weekend = computeRewardStats(
  input("2026-10-05", [onTime("2026-10-02"), onTime("2026-10-05")], [], "2026-10-02T12:00:00.000Z"),
);
assert.equal(weekend.currentStreak, 2, "weekend does not break the ordinary streak");
assert.equal(weekend.onTimeStreak, 2, "weekend does not break the on-time streak");

const holidayKept = computeRewardStats(
  input(
    "2026-10-07",
    [onTime("2026-10-05")],
    [["2026-10-06", "holiday"]],
    "2026-10-05T12:00:00.000Z",
  ),
);
assert.equal(holidayKept.currentStreak, 1, "holiday row is skipped");
assert.equal(holidayKept.onTimeStreak, 1, "holiday row does not break on-time");

const holidayMissing = computeRewardStats(
  input("2026-10-07", [onTime("2026-10-05")], [], "2026-10-05T12:00:00.000Z"),
);
assert.equal(holidayMissing.currentStreak, 0, "working day with no holiday row breaks");
assert.equal(holidayMissing.longestStreak, 1);
assert.equal(holidayMissing.onTimeStreak, 0);
assert.equal(holidayMissing.longestOnTimeStreak, 1);

const leave = computeRewardStats(
  input(
    "2026-10-07",
    [onTime("2026-10-05")],
    [["2026-10-06", "leave"]],
    "2026-10-05T12:00:00.000Z",
  ),
);
assert.equal(leave.currentStreak, 1, "approved leave is skipped");
assert.equal(leave.onTimeStreak, 1);

const halfLeave = computeRewardStats(
  input(
    "2026-10-07",
    [onTime("2026-10-05"), late("2026-10-06")],
    [["2026-10-06", "half_leave"]],
    "2026-10-05T12:00:00.000Z",
  ),
);
assert.equal(halfLeave.onTimeStreak, 1, "late report on half leave does not break");
assert.equal(halfLeave.currentStreak, 1, "half leave is skipped before the report counts");

const lateDay = computeRewardStats(
  input(
    "2026-10-07",
    [onTime("2026-10-05"), late("2026-10-06")],
    [],
    "2026-10-05T12:00:00.000Z",
  ),
);
assert.equal(lateDay.currentStreak, 2, "a late report still counts for the ordinary streak");
assert.equal(lateDay.longestStreak, 2);
assert.equal(lateDay.onTimeStreak, 0, "a late report breaks the on-time run");
assert.equal(lateDay.longestOnTimeStreak, 1);

const absent = computeRewardStats(
  input(
    "2026-10-07",
    [onTime("2026-10-05")],
    [["2026-10-06", "absent"]],
    "2026-10-05T12:00:00.000Z",
  ),
);
assert.equal(absent.currentStreak, 0, "absent breaks the ordinary streak");
assert.equal(absent.onTimeStreak, 0, "absent breaks the on-time streak");
assert.equal(absent.longestStreak, 1);
assert.equal(absent.longestOnTimeStreak, 1);

const todayOpen = computeRewardStats(
  input(
    "2026-10-07",
    [onTime("2026-10-05"), onTime("2026-10-06")],
    [],
    "2026-10-05T12:00:00.000Z",
  ),
);
assert.equal(todayOpen.currentStreak, 2, "today unsubmitted does not break");
assert.equal(todayOpen.onTimeStreak, 2);

const yesterdayMissed = computeRewardStats(
  input("2026-10-07", [onTime("2026-10-05")], [], "2026-10-05T12:00:00.000Z"),
);
assert.equal(yesterdayMissed.currentStreak, 0, "yesterday unsubmitted breaks");
assert.equal(yesterdayMissed.onTimeStreak, 0);
assert.equal(yesterdayMissed.longestStreak, 1);

const finishedWeek = computeRewardStats(
  input(
    "2026-10-07",
    [
      onTime("2026-09-28"),
      onTime("2026-09-29"),
      onTime("2026-09-30"),
      onTime("2026-10-01"),
      onTime("2026-10-02"),
      onTime("2026-10-05"),
      onTime("2026-10-06"),
      onTime("2026-10-07"),
    ],
    [],
    "2026-09-28T12:00:00.000Z",
  ),
);
assert.equal(finishedWeek.perfectWeeks, 1, "a finished on-time week counts");
assert.equal(
  finishedWeek.perfectMonths,
  1,
  "September is complete; October still has working days ahead",
);

const openWeek = computeRewardStats(
  input(
    "2026-10-07",
    [onTime("2026-10-05"), onTime("2026-10-06"), onTime("2026-10-07")],
    [],
    "2026-10-05T12:00:00.000Z",
  ),
);
assert.equal(openWeek.perfectWeeks, 0, "the current week does not count while a working day remains");

const monthCloses = computeRewardStats(
  input(
    "2026-09-30",
    [onTime("2026-09-28"), onTime("2026-09-29"), onTime("2026-09-30")],
    [],
    "2026-09-28T12:00:00.000Z",
  ),
);
assert.equal(monthCloses.perfectMonths, 1, "a month counts on its last working day");

const teamBase = {
  members: [
    { id: "a", createdAt: "2026-10-05T12:00:00.000Z" },
    { id: "b", createdAt: "2026-10-05T12:00:00.000Z" },
  ],
  reports: [
    { authorId: "a", reportDate: "2026-10-05" },
    { authorId: "b", reportDate: "2026-10-05" },
    { authorId: "a", reportDate: "2026-10-06" },
    { authorId: "b", reportDate: "2026-10-06" },
  ],
  attendance: [] as RewardTeamAttendance[],
};

const teamFull = computeRewardStats(
  input("2026-10-07", [], [], "2026-10-05T12:00:00.000Z", {
    ...teamBase,
    attendance: [],
  }),
);
assert.equal(teamFull.teamCompleteDays, 2, "both teammates reported on two past days");

const teamGap = computeRewardStats(
  input("2026-10-07", [], [], "2026-10-05T12:00:00.000Z", {
    members: teamBase.members,
    reports: teamBase.reports.filter(
      (row) => !(row.authorId === "b" && row.reportDate === "2026-10-06"),
    ),
    attendance: [],
  }),
);
assert.equal(teamGap.teamCompleteDays, 1, "a missing teammate report does not count");

const teamLeave = computeRewardStats(
  input("2026-10-07", [], [], "2026-10-05T12:00:00.000Z", {
    members: teamBase.members,
    reports: teamBase.reports.filter(
      (row) => !(row.authorId === "b" && row.reportDate === "2026-10-06"),
    ),
    attendance: [{ profileId: "b", date: "2026-10-06", status: "leave" }],
  }),
);
assert.equal(teamLeave.teamCompleteDays, 2, "leave drops that person from the day");

const teamJoinedLater = computeRewardStats(
  input("2026-10-07", [], [], "2026-10-05T12:00:00.000Z", {
    members: [
      ...teamBase.members,
      { id: "c", createdAt: "2026-10-07T12:00:00.000Z" },
    ],
    reports: teamBase.reports,
    attendance: [],
  }),
);
assert.equal(
  teamJoinedLater.teamCompleteDays,
  2,
  "someone who joined later is ignored on earlier days",
);

const zero = blankStats();
const starters = earned(zero);
for (const id of ["roundGlasses", "bow", "flower", "scarf", "panda", "frog"] as const) {
  assert.equal(starters.has(id), true, `${id} is a starter`);
}
assert.equal(starters.has("sprout"), false);
assert.equal(has({ ...zero, totalReports: 1 }, "sprout"), true, "first report");
assert.equal(has({ ...zero, longestStreak: 4 }, "beanie"), false);
assert.equal(has({ ...zero, longestStreak: 5 }, "beanie"), true, "streak");
assert.equal(has({ ...zero, onTimeStreak: 29 }, "halo"), false);
assert.equal(has({ ...zero, onTimeStreak: 30 }, "halo"), true, "on-time streak");
assert.equal(
  unlockProgressLabel("halo", { ...zero, onTimeStreak: 12 })?.label,
  "12 / 30 days",
);
assert.deepEqual(unlockProgress("halo", { ...zero, onTimeStreak: 12 }), {
  current: 12,
  target: 30,
});
assert.equal(has({ ...zero, onTimeReports: 24 }, "headphones"), false);
assert.equal(has({ ...zero, onTimeReports: 25 }, "headphones"), true, "on-time reports");
assert.equal(has({ ...zero, totalReports: 99 }, "watermelon"), false);
assert.equal(has({ ...zero, totalReports: 100 }, "watermelon"), true, "100 reports");
assert.equal(has({ ...zero, totalReports: 50 }, "bowtie"), true);
assert.equal(has({ ...zero, perfectWeeks: 4 }, "cow"), true, "perfect weeks map to cow");
assert.equal(
  ACCESSORY_IDS.some((id) => ACCESSORIES[id].unlock.some((rule) => rule.kind === "perfectMonths")),
  false,
  "no item uses perfect months after halo moved",
);
assert.equal(has({ ...zero, tenureDays: 364 }, "gradCap"), false);
assert.equal(has({ ...zero, tenureDays: 365 }, "gradCap"), true, "tenure");
assert.equal(has({ ...zero, isBirthdayToday: false }, "partyHat"), false);
assert.equal(has({ ...zero, isBirthdayToday: true }, "partyHat"), true, "birthday");
assert.equal(has({ ...zero, longestStreak: 24 }, "crown"), false);
assert.equal(has({ ...zero, longestStreak: 25 }, "crown"), true, "25-day streak");
assert.equal(has({ ...zero, teamCompleteDays: 9 }, "crown"), false);
assert.equal(has({ ...zero, teamCompleteDays: 10 }, "crown"), true, "team 100% days");

const inSeason = new Date("2026-12-15T12:00:00.000Z");
const january = new Date("2026-01-15T12:00:00.000Z");
const outSeason = new Date("2026-06-01T12:00:00.000Z");
assert.equal(isWearable("snowman", new Set(), inSeason, TZ), true);
assert.equal(isWearable("snowman", new Set(), january, TZ), true);
assert.equal(isWearable("snowman", new Set(), outSeason, TZ), false);
assert.equal(earned({ ...zero, totalReports: 100 }).has("snowman"), false, "seasonal items are never owned");
assert.equal(seasonWindowLabel("snowman"), "Dec 1 - Jan 31");

assert.deepEqual(
  [...SET_ASIDE.accessories].sort(),
  ["cow", "strawberry", "tiger"],
);
for (const id of ["panda", "frog", "watermelon", "snowman"] as const) {
  assert.equal(SET_ASIDE.accessories.includes(id), false, `${id} is offered`);
}

const catalogSrc = readFileSync(new URL("../lib/mascot/catalog.ts", import.meta.url), "utf8");
assert.match(catalogSrc, /case "grant": return false/);
assert.equal(
  ACCESSORY_IDS.some((id) => ACCESSORIES[id].unlock.some((rule) => rule.kind === "grant")),
  false,
  "grant never unlocks a catalog item",
);

const avatarSrc = readFileSync(new URL("../lib/actions/avatar.ts", import.meta.url), "utf8");
assert.match(avatarSrc, /SET_ASIDE\.accessories\.includes/);

const offered = evaluateUnlocks(
  { ...zero, perfectWeeks: 4, onTimeReports: 10, longestStreak: 60 },
  new Set(),
).filter((id) => !SET_ASIDE.accessories.includes(id));
assert.equal(offered.includes("cow"), false);
assert.equal(offered.includes("tiger"), false);
assert.equal(offered.includes("strawberry"), false);
assert.equal(offered.includes("panda"), true);
assert.equal(offered.includes("frog"), true);

console.log("check:mascot ok");
