"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DayOffTag } from "@/components/shared/day-off-tag";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { SubmissionStatusBadge } from "@/components/manager/submission-status-badge";
import { fetchTeamReportsForDate } from "@/lib/actions/manager/team-reports";
import {
  formatDate,
  isWorkingDay,
  shiftReportDate,
  todayInTimezone,
} from "@/lib/helpers/dates";
import { sortTeamMembersBySubmission } from "@/lib/helpers/team-sort";
import { cn } from "@/lib/utils";
import { getSubmissionStatus } from "@/lib/reports/submission-status";
import type { DeadlineContext } from "@/lib/reports/submission-status";
import type { TeamMemberReport } from "@/types/team";

export function TeamTodayPanel({
  initialMembers,
  initialDate,
  timezone,
  workingDays,
  deadline,
  initialIsOffDay,
}: {
  initialMembers: TeamMemberReport[];
  initialDate: string;
  timezone: string;
  workingDays: number[];
  deadline: DeadlineContext;
  initialIsOffDay: boolean;
}) {
  const today = todayInTimezone(timezone);
  const [date, setDate] = useState(initialDate);
  const [members, setMembers] = useState(initialMembers);
  const [isOffDay, setIsOffDay] = useState(initialIsOffDay);
  const [isPending, startTransition] = useTransition();

  const isToday = date >= today;
  const previousDate = shiftReportDate(date, -1);
  const nextDate = shiftReportDate(date, 1);
  const centerLabel = date === today ? "Today" : formatDate(date);
  const sortedMembers = sortTeamMembersBySubmission(members);

  const goToDate = (next: string) => {
    startTransition(async () => {
      const rows = await fetchTeamReportsForDate(next);
      setMembers(rows);
      setDate(next);
      setIsOffDay(
        next === today
          ? initialIsOffDay
          : workingDays.length > 0 && !isWorkingDay(next, workingDays),
      );
    });
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-base leading-snug font-medium tracking-tight">
          Your Team
        </h3>
        <div className="flex items-center gap-2" aria-busy={isPending}>
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
                className="min-w-28"
              >
                {isPending ? (
                  <Loader2
                    className="mx-auto size-4 animate-spin text-muted-foreground"
                    aria-label="Loading"
                  />
                ) : isOffDay ? (
                  <DayOffTag />
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
      </div>

      <div className="flex flex-col gap-2">
        {sortedMembers.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            No team activity today.
          </p>
        ) : (
          sortedMembers.map((member) => (
            <Link
              key={member.employeeId}
              href={`/employees/${member.employeeId}`}
              className="-mx-2 flex items-center justify-between gap-2 rounded-md px-2 py-1 transition-colors hover:bg-foreground/5"
            >
              <div className="flex min-w-0 items-center gap-2">
                <div className={cn(isOffDay && "grayscale opacity-60")}>
                  <MemberAvatar
                    userId={member.employeeId}
                    name={member.fullName}
                    avatarUrl={member.avatarUrl ?? undefined}
                    size="sm"
                  />
                </div>
                <span
                  className={cn(
                    "min-w-0 truncate text-sm",
                    isOffDay && "text-muted-foreground",
                  )}
                >
                  {member.fullName}
                </span>
              </div>
              {/* Off days: no status column. A voluntary submission is the
                  one exception worth surfacing. */}
              {(!isOffDay || member.report) && (
                <div className="shrink-0">
                  <SubmissionStatusBadge
                    status={getSubmissionStatus(
                      member.report?.submitted_at ?? null,
                      deadline.deadlineHourUtc,
                      deadline,
                      date,
                      member.isOnLeave,
                      isOffDay,
                    )}
                  />
                </div>
              )}
            </Link>
          ))
        )}
      </div>

      <Link
        href="/team-reports"
        className="mt-auto block text-xs text-muted-foreground hover:text-foreground"
      >
        View full team reports →
      </Link>
    </div>
  );
}
