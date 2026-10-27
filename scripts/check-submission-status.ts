import assert from "node:assert/strict";
import {
  getSubmissionStatus,
  type DeadlineContext,
} from "../lib/reports/submission-status";

const TZ = "Asia/Karachi";
const deadline: DeadlineContext = {
  deadlineHourUtc: 12,
  deadlineHourLocal: 17,
  timezone: TZ,
  workingDays: [1, 2, 3, 4, 5],
};

// Same local day, before deadline → on_time (09:00 PKT = 04:00 UTC).
assert.equal(
  getSubmissionStatus(
    "2026-10-07T04:00:00.000Z",
    deadline.deadlineHourUtc,
    deadline,
    "2026-10-07",
  ),
  "on_time",
  "same day before deadline is on_time",
);

// Same local day, after deadline → late (18:00 PKT = 13:00 UTC).
assert.equal(
  getSubmissionStatus(
    "2026-10-07T13:00:00.000Z",
    deadline.deadlineHourUtc,
    deadline,
    "2026-10-07",
  ),
  "late",
  "same day after deadline is late",
);

// Next local day 00:30 PKT (19:30 UTC previous calendar day in UTC terms,
// but local date is 2026-10-08) → late regardless of hour.
assert.equal(
  getSubmissionStatus(
    "2026-10-07T19:30:00.000Z",
    deadline.deadlineHourUtc,
    deadline,
    "2026-10-07",
  ),
  "late",
  "submission after midnight next local day is late",
);

// Missing past day → missed.
assert.equal(
  getSubmissionStatus(
    null,
    deadline.deadlineHourUtc,
    deadline,
    "2026-10-01",
  ),
  "missed",
  "null submission on a past report date is missed",
);

// Leave → on_leave.
assert.equal(
  getSubmissionStatus(
    null,
    deadline.deadlineHourUtc,
    deadline,
    "2026-10-07",
    true,
  ),
  "on_leave",
  "approved leave is on_leave",
);

console.log("check-submission-status: ok");
