"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  normaliseAudiences,
  normaliseDesignation,
} from "@/lib/handbook/audience";
import type { AudiencePerson } from "@/lib/handbook/audience";
import type { HandbookAudience, HandbookAudienceKind } from "@/types/handbook";

export interface PickerPerson extends AudiencePerson {
  full_name: string;
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={options.length === 0}>
          <Plus className="size-3.5" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
        {options.map((option) => (
          <DropdownMenuItem key={option.value} onSelect={() => onPick(option.value)}>
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
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
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const typed = search.trim();
  const exact = options.some(
    (option) => normaliseDesignation(option.label) === normaliseDesignation(typed),
  );

  const pick = (value: string) => {
    onPick(value);
    setSearch("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Plus className="size-3.5" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder} value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>{allowFreeText ? "Type to add a new one." : "No match."}</CommandEmpty>
            {allowFreeText && typed && !exact ? (
              <CommandGroup>
                <CommandItem value={`add ${typed}`} onSelect={() => pick(typed)}>
                  Add “{typed}”
                </CommandItem>
              </CommandGroup>
            ) : null}
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.hint ?? ""} ${option.value}`}
                  onSelect={() => pick(option.value)}
                >
                  <span className="truncate">{option.label}</span>
                  {option.hint ? (
                    <span className="ml-auto truncate text-xs text-muted-foreground">
                      {option.hint}
                    </span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function HandbookAudiencePicker({
  value,
  onChange,
  departments,
  people,
  designations,
  allow,
}: {
  value: HandbookAudience[];
  onChange: (next: HandbookAudience[]) => void;
  departments: { id: string; name: string }[];
  people: PickerPerson[];
  designations: string[];
  /** Which kinds of rule can be added. All when left out. */
  allow?: HandbookAudienceKind[];
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
                people.map((person) => ({
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
    </div>
  );
}
