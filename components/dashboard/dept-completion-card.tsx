"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Building2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Card,
  CardContent,
  CardFooterLink,
  CardLabelHeader,
} from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { fetchDeptCompletion } from "@/lib/actions/admin/dept-completion";
import { formatDate, isWorkingDay, shiftReportDate, todayInTimezone } from "@/lib/helpers/dates";
import { cn } from "@/lib/utils";
import { DayOffTag } from "@/components/shared/day-off-tag";
import type { DeptCompletionRow } from "@/lib/supabase/queries/admin/dept-completion";

// Neutral until the deadline has passed: "0 of 3 in" at 9 AM is normal, not
// an alarm. After the deadline, departments still missing reports turn amber.
function DeptRow({
  name,
  submitted,
  total,
  deadlinePassed,
}: {
  name: string;
  submitted: number;
  total: number;
  deadlinePassed: boolean;
}) {
  const allIn = total > 0 && submitted >= total;
  const behind = deadlinePassed && !allIn;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-sm font-medium">{name}</span>
        <span
          className={cn(
            "shrink-0 text-sm tabular-nums text-foreground/80",
            behind && "text-amber-700 dark:text-amber-300",
            allIn && "text-green-700 dark:text-green-300",
          )}
        >
          {allIn ? "All in" : `${submitted} of ${total} in`}
        </span>
      </div>
      <Meter
        value={submitted}
        max={total}
        tone={allIn ? "success" : behind ? "warning" : "neutral"}
        label={`${name}: ${submitted} of ${total} reports in`}
      />
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

  const isToday = date >= today;
  const previousDate = shiftReportDate(date, -1);
  const nextDate = shiftReportDate(date, 1);
  const centerLabel = date === today ? "Today" : formatDate(date);

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
      <CardLabelHeader
        label={date === today ? "Departments today" : `Departments · ${formatDate(date)}`}
        aside={
      <div className="flex items-center gap-1" aria-busy={isPending}>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => goToDate(previousDate)}
          disabled={isPending}
          aria-label="Previous day"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              className={cn(
                "min-w-28",
                isOffDay && "hover:bg-transparent dark:hover:bg-transparent",
              )}
            >
              {isPending ? (
                <Loader2
                  className="mx-auto size-4 animate-spin text-muted-foreground"
                  aria-label="Loading"
                />
              ) : isOffDay ? (
                <span className="flex items-center">
                  <DayOffTag />
                </span>
              ) : (
                centerLabel
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <Calendar
              mode="single"
              selected={new Date(`${date}T00:00:00`)}
              onSelect={(selected) => {
                if (!selected) return;
                const y = selected.getFullYear();
                const m = String(selected.getMonth() + 1).padStart(2, "0");
                const d = String(selected.getDate()).padStart(2, "0");
                goToDate(`${y}-${m}-${d}`);
              }}
              disabled={(day) => day > new Date() || isPending}
              autoFocus
            />
          </PopoverContent>
        </Popover>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => goToDate(nextDate)}
          disabled={isPending || isToday}
          aria-label="Next day"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
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

              if (isUnassigned && dept.submitted <= 0 && dept.total <= 0) {
                return null;
              }

              const row = isOffDay ? (
                <DeptDirectoryRow name={name} total={dept.total} />
              ) : (
                <DeptRow
                  name={name}
                  submitted={dept.submitted}
                  total={dept.total}
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
                    "rounded-lg transition-colors hover:bg-foreground/5",
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
