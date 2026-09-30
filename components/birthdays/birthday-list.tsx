"use client";

import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import {
  differenceInYears,
  format,
  isSameMonth,
  isToday,
  parseISO,
} from "date-fns";
import { Cake } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { MemberAvatar } from "@/components/shared/member-avatar";
import type { BirthdayPerson } from "@/lib/supabase/queries/admin/birthdays";
import { cn } from "@/lib/utils";

function subscribe() {
  return () => {};
}

// Cache one client Date so getSnapshot stays referentially stable (avoids
// infinite re-renders from useSyncExternalStore).
let cachedClientNow: Date | null = null;

function getClientNow(): Date {
  if (!cachedClientNow) cachedClientNow = new Date();
  return cachedClientNow;
}

/** Hydration-safe "now" — null on the server / first paint. */
function useNow(): Date | null {
  return useSyncExternalStore(subscribe, getClientNow, () => null);
}

/** This year's occurrence of the birthday (local calendar). */
function birthdayThisYear(iso: string, now: Date): Date {
  const birth = parseISO(iso);
  return new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
}

function sortByMonthDay(a: BirthdayPerson, b: BirthdayPerson): number {
  const da = parseISO(a.date_of_birth!);
  const db = parseISO(b.date_of_birth!);
  if (da.getMonth() !== db.getMonth()) return da.getMonth() - db.getMonth();
  return da.getDate() - db.getDate();
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="mb-3 flex items-baseline gap-1.5">
      <h2 className="text-sm font-semibold">{label}</h2>
      <span className="text-sm text-muted-foreground">· {count}</span>
    </div>
  );
}

function BirthdayCard({
  person,
  now,
  variant,
}: {
  person: BirthdayPerson;
  now: Date;
  variant: "today" | "default" | "missing";
}) {
  const isTodayCard = variant === "today";
  const isMissing = variant === "missing";
  const dob = person.date_of_birth ? parseISO(person.date_of_birth) : null;
  const age =
    dob != null
      ? differenceInYears(birthdayThisYear(person.date_of_birth!, now), dob)
      : null;
  const formattedDate = dob ? format(dob, "MMMM d") : null;

  return (
    <div
      className={cn(
        "relative flex min-h-[200px] flex-col items-center justify-between gap-0 rounded-xl border p-5 text-center",
        isTodayCard
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-card",
        isMissing && "opacity-50",
      )}
    >
      {isTodayCard && (
        <span className="absolute top-3 right-3 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          Today
        </span>
      )}
      <div className="mb-3 flex w-full flex-col items-center gap-2">
        <MemberAvatar
          userId={person.id}
          name={person.full_name}
          size="xl"
        />
        <div className="flex w-full flex-col items-center gap-0.5">
          <span
            className={cn(
              "text-sm font-semibold",
              isTodayCard ? "text-primary" : "text-foreground",
            )}
          >
            {person.full_name}
          </span>
          {person.designation ? (
            <span className="text-xs text-muted-foreground">
              {person.designation}
            </span>
          ) : null}
        </div>
      </div>
      <div className="mt-auto w-full border-t border-border pt-3 text-center">
        {isMissing || !formattedDate ? (
          <span className="text-xs text-muted-foreground">No date on file</span>
        ) : (
          <div className="flex flex-col items-center gap-0.5">
            <span
              className={cn(
                "text-xs font-medium uppercase tracking-wide",
                isTodayCard ? "text-primary" : "text-muted-foreground",
              )}
            >
              {formattedDate}
            </span>
            {isTodayCard && age != null && (
              <span className="text-xs text-muted-foreground">Turns {age}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {children}
    </div>
  );
}

export function BirthdayList({
  withDOB,
  missingDOB,
}: {
  withDOB: BirthdayPerson[];
  missingDOB: BirthdayPerson[];
}) {
  const now = useNow();

  const groups = useMemo(() => {
    if (!now) return null;

    const today: BirthdayPerson[] = [];
    const thisMonth: BirthdayPerson[] = [];
    const byMonth = new Map<number, BirthdayPerson[]>();

    for (const person of withDOB) {
      if (!person.date_of_birth) continue;
      const occurrence = birthdayThisYear(person.date_of_birth, now);

      if (isToday(occurrence)) {
        today.push(person);
        continue;
      }

      if (isSameMonth(occurrence, now)) {
        thisMonth.push(person);
        continue;
      }

      const month = occurrence.getMonth();
      const list = byMonth.get(month) ?? [];
      list.push(person);
      byMonth.set(month, list);
    }

    today.sort(sortByMonthDay);
    thisMonth.sort(sortByMonthDay);

    const remainingMonths = Array.from(byMonth.entries())
      .sort(([a], [b]) => a - b)
      .map(([month, people]) => ({
        month,
        label: format(new Date(2000, month, 1), "MMMM"),
        people: [...people].sort(sortByMonthDay),
      }));

    return { today, thisMonth, remainingMonths };
  }, [now, withDOB]);

  if (!now || !groups) {
    return null;
  }

  const { today, thisMonth, remainingMonths } = groups;
  const hasAnyWithDob =
    today.length > 0 || thisMonth.length > 0 || remainingMonths.length > 0;

  return (
    <div className="flex flex-col gap-8">
      {today.length > 0 && (
        <section>
          <SectionHeader label="Today" count={today.length} />
          <CardGrid>
            {today.map((person) => (
              <BirthdayCard
                key={person.id}
                person={person}
                now={now}
                variant="today"
              />
            ))}
          </CardGrid>
        </section>
      )}

      {thisMonth.length > 0 && (
        <section>
          <SectionHeader
            label={format(now, "MMMM")}
            count={thisMonth.length}
          />
          <CardGrid>
            {thisMonth.map((person) => (
              <BirthdayCard
                key={person.id}
                person={person}
                now={now}
                variant="default"
              />
            ))}
          </CardGrid>
        </section>
      )}

      {(today.length > 0 || thisMonth.length > 0) &&
        remainingMonths.length > 0 && (
          <hr className="my-6 border-border" />
        )}

      {remainingMonths.map((group) => (
        <section key={group.month}>
          <SectionHeader label={group.label} count={group.people.length} />
          <CardGrid>
            {group.people.map((person) => (
              <BirthdayCard
                key={person.id}
                person={person}
                now={now}
                variant="default"
              />
            ))}
          </CardGrid>
        </section>
      ))}

      {!hasAnyWithDob && (
        <EmptyState
          icon={<Cake className="size-4" />}
          title="No birthdays on record. Add dates of birth to employee profiles."
        />
      )}

      {missingDOB.length > 0 && (
        <section>
          <SectionHeader
            label="No birthday on file"
            count={missingDOB.length}
          />
          <CardGrid>
            {missingDOB.map((person) => (
              <BirthdayCard
                key={person.id}
                person={person}
                now={now}
                variant="missing"
              />
            ))}
          </CardGrid>
        </section>
      )}
    </div>
  );
}
