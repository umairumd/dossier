"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { fetchDeptCompletion } from "@/lib/actions/admin/dept-completion";
import { formatDate, shiftReportDate, todayInTimezone } from "@/lib/helpers/dates";
import { cn } from "@/lib/utils";
import type { DeptCompletionRow } from "@/lib/supabase/queries/admin/dept-completion";

function barClass(completionPct: number): string {
  if (completionPct >= 80) {
    return "bg-primary";
  }
  if (completionPct >= 50) {
    // One-off: shadcn has no semantic warning token; yellow is not a theme variable.
    return "bg-yellow-500/70";
  }
  return "bg-destructive/70";
}

function DeptRow({
  name,
  submitted,
  total,
  completionPct,
}: {
  name: string;
  submitted: number;
  total: number;
  completionPct: number;
}) {
  const missing = total - submitted;
  const widthPct = Math.max(completionPct, completionPct > 0 ? 2 : 0);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{name}</span>
        <span className="shrink-0 text-sm text-muted-foreground">
          {submitted}/{total}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
        <div
          className={cn("h-full rounded-full", barClass(completionPct))}
          style={{ width: `${widthPct}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{completionPct}% complete</span>
        {missing > 0 && <span>{missing} missing</span>}
      </div>
    </div>
  );
}

export function DeptCompletionCard({
  initialDepartments,
  timezone,
  initialDate,
}: {
  initialDepartments: DeptCompletionRow[];
  timezone: string;
  initialDate: string;
}) {
  const today = todayInTimezone(timezone);
  const [date, setDate] = useState(initialDate);
  const [departments, setDepartments] =
    useState<DeptCompletionRow[]>(initialDepartments);
  const [isPending, startTransition] = useTransition();

  const isToday = date >= today;
  const previousDate = shiftReportDate(date, -1);
  const nextDate = shiftReportDate(date, 1);
  const centerLabel = date === today ? "Today" : formatDate(date);

  const goToDate = (next: string) => {
    startTransition(async () => {
      const rows = await fetchDeptCompletion(next);
      setDepartments(rows);
      setDate(next);
    });
  };

  const description =
    date === today
      ? "Report completion for today"
      : `Report completion for ${formatDate(date)}`;

  return (
    <Card className="card-gradient">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>Department Overview</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center gap-1" aria-busy={isPending}>
            <button
              type="button"
              onClick={() => goToDate(previousDate)}
              disabled={isPending}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              aria-label="Previous day"
            >
              <ChevronLeft className="size-4" />
            </button>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={isPending}
                  className="min-w-20 rounded-md px-2 py-1 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                >
                  {isPending ? (
                    <Loader2
                      className="mx-auto size-4 animate-spin text-muted-foreground"
                      aria-label="Loading"
                    />
                  ) : (
                    centerLabel
                  )}
                </button>
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
            <button
              type="button"
              onClick={() => goToDate(nextDate)}
              disabled={isPending || isToday}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              aria-label="Next day"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {departments.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No departments with active members yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {departments.map((dept) => {
              const isUnassigned = dept.departmentId === "__unassigned__";
              const name = isUnassigned ? "No Department" : dept.departmentName;

              if (isUnassigned) {
                if (dept.submitted <= 0 && dept.total <= 0) {
                  return null;
                }
                return (
                  <div
                    key={dept.departmentId}
                    className="rounded-md px-2 py-2"
                  >
                    <DeptRow
                      name={name}
                      submitted={dept.submitted}
                      total={dept.total}
                      completionPct={dept.completionPct}
                    />
                  </div>
                );
              }

              return (
                <Link
                  key={dept.departmentId}
                  href={`/departments/${dept.departmentId}`}
                  className="rounded-md px-2 py-2 hover:bg-muted/40 cursor-pointer"
                >
                  <DeptRow
                    name={name}
                    submitted={dept.submitted}
                    total={dept.total}
                    completionPct={dept.completionPct}
                  />
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
