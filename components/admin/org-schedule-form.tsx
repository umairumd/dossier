"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, SaveBar, SettingsSection } from "@/components/shared/settings-section";
import { formatHourLabel } from "@/lib/helpers/dates";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  updateReportDeadlineLocal,
  updateTimezone,
  updateWorkingDays,
} from "@/lib/actions/admin/organization-settings";
import { cn } from "@/lib/utils";

const REGION_ORDER = [
  "Africa",
  "America",
  "Asia",
  "Atlantic",
  "Australia",
  "Europe",
  "Indian",
  "Pacific",
  "UTC",
];

const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
] as const;

function getUtcOffset(tz: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en", {
    timeZone: tz,
    timeZoneName: "shortOffset",
  });
  const parts = formatter.formatToParts(now);
  const offset = parts.find((part) => part.type === "timeZoneName")?.value ?? "UTC";
  return offset.replace("GMT", "UTC");
}

function formatTimezoneLabel(tz: string): string {
  return `${tz} (${getUtcOffset(tz)})`;
}

function regionOf(tz: string): string {
  const slash = tz.indexOf("/");
  return slash === -1 ? tz : tz.slice(0, slash);
}

function groupedTimezones(): { region: string; zones: string[] }[] {
  const zones =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : ["UTC"];

  const byRegion = new Map<string, string[]>();
  for (const zone of zones) {
    const region = regionOf(zone);
    const group = byRegion.get(region) ?? [];
    group.push(zone);
    byRegion.set(region, group);
  }

  const ordered: { region: string; zones: string[] }[] = [];
  for (const region of REGION_ORDER) {
    const group = byRegion.get(region);
    if (group && group.length > 0) {
      ordered.push({ region, zones: group });
      byRegion.delete(region);
    }
  }

  const leftover = [...byRegion.entries()].sort(([a], [b]) => a.localeCompare(b));
  for (const [region, group] of leftover) {
    ordered.push({ region, zones: group });
  }

  return ordered;
}

export function OrgScheduleForm({
  initialTimezone,
  initialWorkingDays,
  initialDeadlineHour,
}: {
  initialTimezone: string;
  initialWorkingDays: number[];
  initialDeadlineHour: number;
}) {
  const initial = {
    timezone: initialTimezone,
    workingDays: initialWorkingDays.length > 0 ? initialWorkingDays : [1, 2, 3, 4, 5],
    deadlineHour: String(initialDeadlineHour),
  };
  const [saved, setSaved] = useState(initial);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [timezoneOpen, setTimezoneOpen] = useState(false);
  const [workingDays, setWorkingDays] = useState<number[]>(initial.workingDays);
  const [deadlineHour, setDeadlineHour] = useState(initial.deadlineHour);
  const dirty =
    timezone !== saved.timezone ||
    deadlineHour !== saved.deadlineHour ||
    workingDays.join(",") !== saved.workingDays.join(",");

  const reset = () => {
    setTimezone(saved.timezone);
    setWorkingDays(saved.workingDays);
    setDeadlineHour(saved.deadlineHour);
  };
  const [isPending, startTransition] = useTransition();
  const groups = useMemo(() => groupedTimezones(), []);

  function toggleDay(day: number) {
    setWorkingDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort((a, b) => a - b),
    );
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = Number(deadlineHour);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 23) {
      toast.error("Enter an hour between 0 and 23.");
      return;
    }

    startTransition(async () => {
      const timezoneResult = await updateTimezone(timezone);
      if (!timezoneResult.success) {
        toast.error(timezoneResult.error ?? "Couldn't update the timezone.");
        return;
      }

      const daysResult = await updateWorkingDays(workingDays);
      if (!daysResult.success) {
        toast.error(daysResult.error ?? "Couldn't update working days.");
        return;
      }

      const deadlineResult = await updateReportDeadlineLocal(parsed);
      if (!deadlineResult.success) {
        toast.error(deadlineResult.error ?? "Couldn't update the report deadline.");
        return;
      }

      setSaved({ timezone, workingDays, deadlineHour });
      toast.success("Schedule saved.");
    });
  };

  return (
    <SettingsSection
      title="Schedule"
      description="When reports are due and which days count as working days."
      onSubmit={handleSubmit}
      footer={<SaveBar dirty={dirty} pending={isPending} onReset={reset} />}
    >
      <Field label="Time zone" htmlFor="timezone">
        <Popover open={timezoneOpen} onOpenChange={setTimezoneOpen}>
          <PopoverTrigger asChild>
            <Button
              id="timezone"
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={timezoneOpen}
              className="h-9 w-full max-w-md justify-between font-normal"
            >
              <span className="truncate">{formatTimezoneLabel(timezone)}</span>
              <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search time zones…" />
              <CommandList>
                <CommandEmpty>No time zone found.</CommandEmpty>
                {groups.map((group) => (
                  <CommandGroup key={group.region} heading={group.region}>
                    {group.zones.map((zone) => {
                      const label = formatTimezoneLabel(zone);

                      return (
                        <CommandItem
                          key={zone}
                          value={label}
                          keywords={[group.region, zone]}
                          data-checked={timezone === zone || undefined}
                          onSelect={() => {
                            setTimezone(zone);
                            setTimezoneOpen(false);
                          }}
                          className={cn(timezone === zone && "font-medium")}
                        >
                          {label}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </Field>

      <Field label="Working days" hint="Reports are expected on these days.">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Working days">
          {DAYS.map((day) => {
            const on = workingDays.includes(day.value);
            return (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                aria-pressed={on}
                className={cn(
                  "h-9 w-12 rounded-lg text-[13px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  on
                    ? "bg-fill-active text-foreground ring-1 ring-inset ring-line-strong"
                    : "text-muted-foreground ring-1 ring-inset ring-edge hover:text-foreground",
                )}
              >
                {day.label}
              </button>
            );
          })}
        </div>
      </Field>

      <Field
        label="Report deadline"
        htmlFor="deadline-hour"
        hint={`In ${timezone}. Reports after this time are marked late.`}
      >
        <Select value={deadlineHour} onValueChange={setDeadlineHour}>
          <SelectTrigger id="deadline-hour" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 24 }, (_, hour) => (
              <SelectItem key={hour} value={String(hour)}>
                {formatHourLabel(hour)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </SettingsSection>
  );
}
