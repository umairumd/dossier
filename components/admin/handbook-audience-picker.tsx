"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { MemberAvatar } from "@/components/mascot/member-avatar";
import { Button } from "@/components/ui/button";
import { PickerPopover } from "@/components/shared/picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  EMPLOYMENT_LABELS,
  LOCATION_LABELS,
  ROLE_AUDIENCE_LABELS,
  audienceLabel,
  describeAudience,
  matchesHandbookAudience,
  normaliseAudiences,
  normaliseDesignation,
} from "@/lib/handbook/audience";
import type { AudiencePerson } from "@/lib/handbook/audience";
import type { HandbookAudience, HandbookAudienceKind, HandbookKind } from "@/types/handbook";

export interface PickerPerson extends AudiencePerson {
  full_name: string;
}

// Passes everything on to the button: the picker's popup trigger adds its
// click handler and ref through these props.
function AddButton({ label, ...props }: { label: string } & React.ComponentProps<typeof Button>) {
  return (
    <Button type="button" variant="outline" size="sm" {...props}>
      <Plus className="size-3.5" />
      {label}
    </Button>
  );
}

function MenuAdd({
  label,
  options,
  onPick,
}: {
  label: string;
  options: { value: string; label: string }[];
  onPick: (value: string) => void;
}) {
  return (
    <PickerPopover
      trigger={<AddButton label={label} disabled={options.length === 0} />}
      searchPlaceholder={options.length > 8 ? `Search…` : undefined}
      sections={[{ options }]}
      onSelect={onPick}
    />
  );
}

function SearchAdd({
  label,
  placeholder,
  options,
  allowFreeText = false,
  onPick,
}: {
  label: string;
  placeholder: string;
  options: { value: string; label: string; hint?: string | null }[];
  allowFreeText?: boolean;
  onPick: (value: string) => void;
}) {
  const [search, setSearch] = useState("");
  const typed = search.trim();
  const exact = options.some(
    (option) => normaliseDesignation(option.label) === normaliseDesignation(typed),
  );
  return (
    <PickerPopover
      width="w-72"
      trigger={<AddButton label={label} />}
      searchPlaceholder={placeholder}
      query={search}
      onQueryChange={setSearch}
      empty={allowFreeText ? "Type to add a new one." : "No match."}
      sections={[
        {
          options:
            allowFreeText && typed && !exact
              ? [{ value: `+add:${typed}`, label: `Add “${typed}”`, keywords: typed }]
              : [],
        },
        { options: options.map((option) => ({ value: option.value, label: option.label, description: option.hint })) },
      ]}
      onSelect={(value) => {
        onPick(value.startsWith("+add:") ? value.slice(5) : value);
        setSearch("");
      }}
    />
  );
}

export function HandbookAudiencePicker({
  value,
  onChange,
  departments,
  people,
  designations,
  allow,
  matchDoc,
  note,
  personChoices,
}: {
  value: HandbookAudience[];
  onChange: (next: HandbookAudience[]) => void;
  departments: { id: string; name: string }[];
  people: PickerPerson[];
  designations: string[];
  /** Which kinds of rule can be added. All when left out. */
  allow?: HandbookAudienceKind[];
  /** For job descriptions, whose designation also counts with no rules. */
  matchDoc?: { kind: HandbookKind; jdDesignation: string | null };
  /** Extra line under the count, e.g. what a manager can choose. */
  note?: string;
  /** Who "+ Person" offers, when narrower than everyone counted. */
  personChoices?: PickerPerson[];
}) {
  const can = (kind: HandbookAudienceKind) => !allow || allow.includes(kind);
  const has = (kind: HandbookAudienceKind, ruleValue: string | null = null) =>
    value.some(
      (rule) =>
        rule.kind === kind &&
        (kind === "designation"
          ? normaliseDesignation(rule.value) === normaliseDesignation(ruleValue)
          : rule.value === ruleValue),
    );
  const add = (kind: HandbookAudienceKind, ruleValue: string | null = null) =>
    onChange(normaliseAudiences([...value, { kind, value: ruleValue }]));
  const remove = (target: HandbookAudience) =>
    onChange(
      value.filter((rule) => !(rule.kind === target.kind && rule.value === target.value)),
    );

  const lookups = {
    departmentNames: new Map(departments.map((department) => [department.id, department.name])),
    personNames: new Map(people.map((person) => [person.id, person.full_name])),
  };
  const unused = <T extends { value: string }>(kind: HandbookAudienceKind, options: T[]) =>
    options.filter((option) => !has(kind, option.value));

  const reached = useMemo(
    () =>
      people.filter((person) =>
        matchesHandbookAudience(person, {
          kind: matchDoc?.kind ?? "policy",
          jdDesignation: matchDoc?.jdDesignation ?? null,
          audiences: value,
        }),
      ),
    [people, value, matchDoc?.kind, matchDoc?.jdDesignation],
  );
  const sentence = describeAudience(value, lookups, { maxPeople: 3 });
  const kinds = new Set(value.filter((rule) => rule.kind !== "profile" && rule.kind !== "everyone").map((rule) => rule.kind));

  return (
    <div className="flex flex-col gap-3">
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Who can see this">
          {value.map((rule) => {
            const label = audienceLabel(rule, lookups);
            return (
              <li
                key={`${rule.kind}:${rule.value ?? ""}`}
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-fill-active pr-1 pl-3 text-[13px] font-medium ring-1 ring-inset ring-edge"
              >
                {label}
                <button
                  type="button"
                  onClick={() => remove(rule)}
                  aria-label={`Remove ${label}`}
                  className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-fill-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {has("everyone") ? (
        <p className="text-[13px] text-muted-foreground">
          Everyone in the organization. Remove it to choose specific groups.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {can("everyone") ? (
            <Button type="button" variant="outline" size="sm" onClick={() => add("everyone")}>
              <Plus className="size-3.5" />
              Everyone
            </Button>
          ) : null}
          {can("department") ? (
            <MenuAdd
              label="Department"
              options={unused(
                "department",
                departments.map((department) => ({ value: department.id, label: department.name })),
              )}
              onPick={(id) => add("department", id)}
            />
          ) : null}
          {can("role") ? (
            <MenuAdd
              label="Role"
              options={unused(
                "role",
                Object.entries(ROLE_AUDIENCE_LABELS).map(([role, label]) => ({ value: role, label })),
              )}
              onPick={(role) => add("role", role)}
            />
          ) : null}
          {can("designation") ? (
            <SearchAdd
              label="Designation"
              placeholder="Search or type a designation…"
              allowFreeText
              options={unused(
                "designation",
                designations.map((designation) => ({ value: designation, label: designation })),
              )}
              onPick={(designation) => add("designation", designation)}
            />
          ) : null}
          {can("employment_type") ? (
            <MenuAdd
              label="Full-time / Part-time"
              options={unused(
                "employment_type",
                Object.entries(EMPLOYMENT_LABELS).map(([type, label]) => ({ value: type, label })),
              )}
              onPick={(type) => add("employment_type", type)}
            />
          ) : null}
          {can("work_location") ? (
            <MenuAdd
              label="Remote / On-site"
              options={unused(
                "work_location",
                Object.entries(LOCATION_LABELS).map(([location, label]) => ({
                  value: location,
                  label,
                })),
              )}
              onPick={(location) => add("work_location", location)}
            />
          ) : null}
          {can("profile") ? (
            <SearchAdd
              label="Person"
              placeholder="Search people…"
              options={unused(
                "profile",
                (personChoices ?? people).map((person) => ({
                  value: person.id,
                  label: person.full_name,
                  hint: person.designation,
                })),
              )}
              onPick={(id) => add("profile", id)}
            />
          ) : null}
        </div>
      )}

      <div className="flex flex-col gap-1">
        {sentence && sentence !== "Everyone" ? (
          <p className="text-[13px] text-foreground/85">{sentence}</p>
        ) : null}
        <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground" aria-live="polite">
          <span className="tabular-nums">
            {reached.length} {reached.length === 1 ? "person" : "people"}
          </span>
          {reached.length > 0 ? (
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="underline-offset-2 hover:text-foreground hover:underline">
                  See who
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 gap-0 p-1">
                {reached.map((person) => (
                  <div key={person.id} className="flex items-center gap-2 rounded-md px-2 py-1.5">
                    <MemberAvatar name={person.full_name} userId={person.id} avatar={null} size="xs" />
                    <span className="min-w-0 flex-1 truncate text-sm">{person.full_name}</span>
                    {person.designation ? (
                      <span className="max-w-24 truncate text-xs text-muted-foreground">{person.designation}</span>
                    ) : null}
                  </div>
                ))}
              </PopoverContent>
            </Popover>
          ) : null}
        </p>
        {kinds.size > 1 ? (
          <p className="text-xs text-muted-foreground">Different kinds narrow each other. People you add are included too.</p>
        ) : null}
        {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      </div>
    </div>
  );
}
