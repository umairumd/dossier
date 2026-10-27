import assert from "node:assert/strict";
import { computeLeaveBalanceBarMath } from "../lib/helpers/leave-balance";

// Mid-year, no adjustments: Jul start, as of Oct → 4 months → 8 credited.
{
  const m = computeLeaveBalanceBarMath(
    {
      contractYearStart: "2026-07-01",
      contractYearEnd: "2027-06-30",
      totalAccrued: 8,
      totalUsed: 3,
    },
    "2026-10-15",
  );
  assert.equal(m.months, 4);
  assert.equal(m.credited, 8);
  assert.equal(m.taken, 3);
  assert.equal(m.available, 5);
  assert.equal(m.removed, 0);
  assert.equal(m.added, 0);
  assert.equal(m.over, 0);
  assert.equal(m.stillToCome, 16);
  assert.equal(m.remaining, 5);
  assert.equal(m.nextAccrualDate, "2026-11-01");
  assert.equal(m.monthLabels[0], "Jul");
  assert.equal(m.currentMonthIndex, 3);
  assert.equal(m.squares[0].left, "taken");
  assert.equal(m.squares[2].left, "taken");
  assert.equal(m.squares[3].left, "available");
}

// Negative adjustment (removed) and half-day taken.
{
  const m = computeLeaveBalanceBarMath(
    {
      contractYearStart: "2026-01-01",
      contractYearEnd: "2026-12-31",
      totalAccrued: 7.5,
      totalUsed: 2.5,
    },
    "2026-04-01",
  );
  assert.equal(m.months, 4);
  assert.equal(m.credited, 8);
  assert.equal(m.removed, 0.5);
  assert.equal(m.added, 0);
  assert.equal(m.taken, 2.5);
  assert.equal(m.available, 5);
  assert.equal(m.squares[2].left, "taken");
  assert.equal(m.squares[2].right, "available");
}

// Overdrawn: borrows into still-to-come squares.
{
  const m = computeLeaveBalanceBarMath(
    {
      contractYearStart: "2026-01-01",
      contractYearEnd: "2026-12-31",
      totalAccrued: 6,
      totalUsed: 8,
    },
    "2026-03-15",
  );
  assert.equal(m.credited, 6);
  assert.equal(m.taken, 6);
  assert.equal(m.available, 0);
  assert.equal(m.over, 2);
  assert.equal(m.remaining, -2);
  assert.equal(m.squares[5].left, "taken");
  assert.equal(m.squares[6].left, "over");
  assert.equal(m.squares[7].left, "over");
  assert.equal(m.squares[8].left, "empty");
}

// Added days: legend only, not extra squares beyond accrued+removed layout.
{
  const m = computeLeaveBalanceBarMath(
    {
      contractYearStart: "2026-01-01",
      contractYearEnd: "2026-12-31",
      totalAccrued: 10,
      totalUsed: 0,
    },
    "2026-03-01",
  );
  assert.equal(m.credited, 6);
  assert.equal(m.added, 4);
  assert.equal(m.available, 10);
  assert.equal(m.stillToCome, 18);
  const filled = m.squares.filter(
    (s) => s.left !== "empty" || s.right !== "empty",
  ).length;
  assert.equal(filled, 10);
}

console.log("check-leave-balance-bar: ok");
