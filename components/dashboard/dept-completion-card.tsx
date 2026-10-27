"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Card,
  CardContent,
  CardFooterLink,
  CardTitleHeader,
} from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import { DateStepper } from "@/components/shared/date-nav";
import { fetchDeptCompletion } from "@/lib/actions/admin/dept-completion";
import { isWorkingDay, todayInTimezone } from "@/lib/helpers/dates";
import { formatInCount } from "@/lib/helpers/report-stats";
import { cn } from "@/lib/utils";
import type { DeptCompletionRow } from "@/lib/supabase/queries/admin/dept-completion";

// Neutral until the deadline has passed: "0 of 3 in" at 9 AM is normal, not
// an alarm. After the deadline, departments still missing reports turn amber.
function DeptRow({
  name,
  submitted,
  total,
  away,
  deadlinePassed,
}: {
  name: string;
  submitted: number;
  total: number;
  away: number;
  deadlinePassed: boolean;
}) {
  const label = formatInCount(submitted, total, away);
  const allAway = total === 0 && away > 0;
  const allIn = total > 0 && submitted >= total;
  const behind = deadlinePassed && !allIn && !allAway;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-sm font-medium">{name}</span>
        <span
          className={cn(
            "shrink-0 text-sm tabular-nums text-foreground/80",
            behind && "text-warn",
            allIn && "text-ok",
          )}
        >
          {allIn ? "All in" : label}
        </span>
      </div>
      {!allAway && (
        <Meter
          value={submitted}
          max={Math.max(total, 1)}
          tone={allIn ? "success" : behind ? "warning" : "neutral"}
          label={`${name}: ${label}`}
        />
      )}
    </div>
  );
}

// Off-day directory row: name + member count only, no progress.
function DeptDirectoryRow({
  name,
  total,
}: {
  name: string;
  total: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="truncate text-sm font-medium">{name}</span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {total} {total === 1 ? "member" : "members"}
      </span>
    </div>
  );
}

export function DeptCompletionCard({
  initialDepartments,
  timezone,
  initialDate,
  workingDays = [],
  initialIsOffDay = false,
  deadlinePassedToday = false,
}: {
  initialDepartments: DeptCompletionRow[];
  timezone: string;
  initialDate: string;
  workingDays?: number[];
  initialIsOffDay?: boolean;
  /** Computed on the server so the first render matches. */
  deadlinePassedToday?: boolean;
}) {
  const today = todayInTimezone(timezone);
  const [date, setDate] = useState(initialDate);
  const [departments, setDepartments] =
    useState<DeptCompletionRow[]>(initialDepartments);
  const [isPending, startTransition] = useTransition();
  // Off-day: use server-computed value for today, recompute from workingDays
  // on nav (holiday detection only works server-side; this is a best-effort
  // client-side check for non-today dates).
  const [isOffDay, setIsOffDay] = useState(initialIsOffDay);


  const goToDate = (next: string) => {
    startTransition(async () => {
      const rows = await fetchDeptCompletion(next);
      setDepartments(rows);
      setDate(next);
      // Recompute off-day for non-today dates using working days bitmask.
      // Holiday detection requires a server round-trip; omit for simplicity.
      setIsOffDay(
        next === today
          ? initialIsOffDay
          : workingDays.length > 0 && !isWorkingDay(next, workingDays),
      );
    });
  };

  const deadlinePassed = date < today || deadlinePassedToday;

  return (
    <Card>
      <CardTitleHeader
        title="Departments"
        aside={
          <span className="-my-1 -mr-1">
            <DateStepper
              size="sm"
              date={date}
              timezone={timezone}
              isOffDay={isOffDay}
              isPending={isPending}
              onChange={goToDate}
            />
          </span>
        }
      />
      <CardContent>
        {departments.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<Building2 className="size-4" />}
            title="No departments with active members yet."
          />
        ) : (
          <div
            className={
              isOffDay
                ? "flex flex-col"
                : "-mx-2 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2"
            }
          >
            {departments.map((dept) => {
              const isUnassigned = dept.departmentId === "__unassigned__";
              const name = isUnassigned ? "No Department" : dept.departmentName;

              if (
                isUnassigned &&
                dept.submitted <= 0 &&
                dept.total <= 0 &&
                (dept.away ?? 0) <= 0
              ) {
                return null;
              }

              const row = isOffDay ? (
                <DeptDirectoryRow
                  name={name}
                  total={dept.total + (dept.away ?? 0)}
                />
              ) : (
                <DeptRow
                  name={name}
                  submitted={dept.submitted}
                  total={dept.total}
                  away={dept.away ?? 0}
                  deadlinePassed={deadlinePassed}
                />
              );

              const href = isOffDay
                ? isUnassigned
                  ? `/track-reports?date=${date}`
                  : `/track-reports?date=${date}&department=${dept.departmentId}`
                : isUnassigned
                  ? `/track-reports?date=${date}`
                  : `/departments/${dept.departmentId}`;

              return (
                <Link
                  key={dept.departmentId}
                  href={href}
                  className={cn(
                    "rounded-lg transition-colors hover:bg-fill-hover",
                    isOffDay ? "cursor-pointer px-3 py-3" : "px-2 py-2.5",
                  )}
                >
                  {row}
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
      <CardFooterLink href="/track-reports">Track reports</CardFooterLink>
    </Card>
  );
}
