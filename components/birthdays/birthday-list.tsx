"use client";

import { useMemo, type ReactNode } from "react";
import { differenceInYears, format } from "date-fns";
import { Cake } from "lucide-react";
import {
  AmbientBudget,
  AmbientBuddy,
  isOrgBirthday,
} from "@/components/mascot/ambient-buddy";
import { EmptyState } from "@/components/shared/empty-state";
import type { BirthdayPerson } from "@/lib/supabase/queries/admin/birthdays";
import { Badge } from "@/components/ui/badge";
import { GroupHeading, PersonCard } from "@/components/shared/person-card";

/** Calendar date from a YYYY-MM-DD string, without a UTC shift. */
function calendarDate(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function sortByMonthDay(a: BirthdayPerson, b: BirthdayPerson): number {
  return a.date_of_birth!.slice(5, 10).localeCompare(b.date_of_birth!.slice(5, 10));
}

/** Days until the next occurrence of a birthday, from the org date. */
function daysUntil(dateOfBirth: string, orgToday: string): number {
  const [y, m, d] = orgToday.split("-").map(Number);
  const today = Date.UTC(y, m - 1, d);
  const month = Number(dateOfBirth.slice(5, 7)) - 1;
  const day = Number(dateOfBirth.slice(8, 10));
  let next = Date.UTC(y, month, day);
  if (next < today) next = Date.UTC(y + 1, month, day);
  return Math.round((next - today) / 86_400_000);
}

function whenLabel(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 60) return `in ${days} days`;
  const months = Math.round(days / 30);
  return `in ${months} months`;
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
  const dob = person.date_of_birth ? calendarDate(person.date_of_birth) : null;
  const age =
    dob != null && person.date_of_birth
      ? differenceInYears(
          calendarDate(`${orgToday.slice(0, 4)}-${person.date_of_birth.slice(5, 10)}`),
          dob,
        )
      : null;

  let footer: ReactNode;
  if (variant === "missing" || !dob || !person.date_of_birth) {
    footer = <span className="text-[13px] text-muted-foreground">No date on file</span>;
  } else if (isTodayCard) {
    footer = (
      <span className="text-[13px]">
        <span className="font-medium">Today</span>
        {age != null && <span className="text-muted-foreground"> · turns {age}</span>}
      </span>
    );
  } else {
    footer = (
      <span className="text-[13px]">
        <span className="font-medium">{format(dob, "MMM d")}</span>
        <span className="text-muted-foreground">
          {" · "}
          {whenLabel(daysUntil(person.date_of_birth, orgToday))}
        </span>
      </span>
    );
  }

  return (
    <PersonCard
      href={`/employees/${person.id}`}
      avatar={
        <AmbientBuddy
          userId={person.id}
          name={person.full_name}
          avatar={person.avatar}
          order={order}
          size="card"
          birthday={isTodayCard}
        />
      }
      name={person.full_name}
      detail={person.designation}
      footer={footer}
      tag={isTodayCard ? <Badge variant="success">Today</Badge> : undefined}
      highlight={isTodayCard}
      dimmed={variant === "missing"}
    />
  );
}

function CardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
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
            <GroupHeading label="Today" count={today.length} />
            <CardGrid>
              {today.map((person) => (
                <BirthdayCard
                  key={person.id}
                  person={person}
                  orgToday={orgToday}
                  order={order++}
                  variant="today"
                />
              ))}
            </CardGrid>
          </section>
        )}

        {thisMonth.length > 0 && (
          <section>
            <GroupHeading
              label={format(calendarDate(orgToday), "MMMM")}
              count={thisMonth.length}
            />
            <CardGrid>
              {thisMonth.map((person) => (
                <BirthdayCard
                  key={person.id}
                  person={person}
                  orgToday={orgToday}
                  order={order++}
                  variant="default"
                />
              ))}
            </CardGrid>
          </section>
        )}

        {remainingMonths.map((group) => (
          <section key={group.month}>
            <GroupHeading label={group.label} count={group.people.length} />
            <CardGrid>
              {group.people.map((person) => (
                <BirthdayCard
                  key={person.id}
                  person={person}
                  orgToday={orgToday}
                  order={order++}
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
            <GroupHeading
              label="No birthday on file"
              count={missingDOB.length}
            />
            <CardGrid>
              {missingDOB.map((person) => (
                <BirthdayCard
                  key={person.id}
                  person={person}
                  orgToday={orgToday}
                  order={order++}
                  variant="missing"
                />
              ))}
            </CardGrid>
          </section>
        )}
      </div>
    </AmbientBudget>
  );
}
