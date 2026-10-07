"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { differenceInYears, format } from "date-fns";
import { Cake } from "lucide-react";
import {
  AmbientBudget,
  AmbientBuddy,
  isOrgBirthday,
} from "@/components/mascot/ambient-buddy";
import { EmptyState } from "@/components/shared/empty-state";
import type { BirthdayPerson } from "@/lib/supabase/queries/admin/birthdays";
import { cn } from "@/lib/utils";

/** Calendar date from a YYYY-MM-DD string, without a UTC shift. */
function calendarDate(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function sortByMonthDay(a: BirthdayPerson, b: BirthdayPerson): number {
  return a.date_of_birth!.slice(5, 10).localeCompare(b.date_of_birth!.slice(5, 10));
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
  orgToday,
  order,
  variant,
}: {
  person: BirthdayPerson;
  orgToday: string;
  order: number;
  variant: "today" | "default" | "missing";
}) {
  const isTodayCard = variant === "today";
  const isMissing = variant === "missing";
  const dob = person.date_of_birth ? calendarDate(person.date_of_birth) : null;
  const age =
    dob != null && person.date_of_birth
      ? differenceInYears(
          calendarDate(`${orgToday.slice(0, 4)}-${person.date_of_birth.slice(5, 10)}`),
          dob,
        )
      : null;
  const formattedDate = dob ? format(dob, "MMMM d") : null;

  return (
    <div
      className={cn(
        "relative flex h-full min-h-[200px] flex-col items-center justify-between gap-0 rounded-xl border p-5 text-center transition-colors hover:bg-foreground/5",
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
        <AmbientBuddy
          userId={person.id}
          name={person.full_name}
          avatar={person.avatar}
          order={order}
          size="xl"
          birthday={isTodayCard}
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
  orgToday,
}: {
  withDOB: BirthdayPerson[];
  missingDOB: BirthdayPerson[];
  /** YYYY-MM-DD in the organization timezone. Drives the Today badge and the party hat. */
  orgToday: string;
}) {
  const groups = useMemo(() => {
    const today: BirthdayPerson[] = [];
    const thisMonth: BirthdayPerson[] = [];
    const byMonth = new Map<number, BirthdayPerson[]>();
    const orgMonth = Number(orgToday.slice(5, 7));

    for (const person of withDOB) {
      if (!person.date_of_birth) continue;
      if (isOrgBirthday(person.date_of_birth, orgToday)) {
        today.push(person);
        continue;
      }

      if (Number(person.date_of_birth.slice(5, 7)) === orgMonth) {
        thisMonth.push(person);
        continue;
      }

      const month = Number(person.date_of_birth.slice(5, 7)) - 1;
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
  }, [orgToday, withDOB]);

  const { today, thisMonth, remainingMonths } = groups;
  const hasAnyWithDob =
    today.length > 0 || thisMonth.length > 0 || remainingMonths.length > 0;
  let order = 0;

  return (
    <AmbientBudget>
      <div className="flex flex-col gap-8">
        {today.length > 0 && (
          <section>
            <SectionHeader label="Today" count={today.length} />
            <CardGrid>
              {today.map((person) => (
                <Link key={person.id} href={`/employees/${person.id}`} className="block h-full">
                  <BirthdayCard
                    person={person}
                    orgToday={orgToday}
                    order={order++}
                    variant="today"
                  />
                </Link>
              ))}
            </CardGrid>
          </section>
        )}

        {thisMonth.length > 0 && (
          <section>
            <SectionHeader
              label={format(calendarDate(orgToday), "MMMM")}
              count={thisMonth.length}
            />
            <CardGrid>
              {thisMonth.map((person) => (
                <Link key={person.id} href={`/employees/${person.id}`} className="block h-full">
                  <BirthdayCard
                    person={person}
                    orgToday={orgToday}
                    order={order++}
                    variant="default"
                  />
                </Link>
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
                <Link key={person.id} href={`/employees/${person.id}`} className="block h-full">
                  <BirthdayCard
                    person={person}
                    orgToday={orgToday}
                    order={order++}
                    variant="default"
                  />
                </Link>
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
                <Link key={person.id} href={`/employees/${person.id}`} className="block h-full">
                  <BirthdayCard
                    person={person}
                    orgToday={orgToday}
                    order={order++}
                    variant="missing"
                  />
                </Link>
              ))}
            </CardGrid>
          </section>
        )}
      </div>
    </AmbientBudget>
  );
}
