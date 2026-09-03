"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [timezone, setTimezone] = useState(initialTimezone);
  const [timezoneOpen, setTimezoneOpen] = useState(false);
  const [workingDays, setWorkingDays] = useState<number[]>(
    initialWorkingDays.length > 0 ? initialWorkingDays : [1, 2, 3, 4, 5],
  );
  const [deadlineHour, setDeadlineHour] = useState(String(initialDeadlineHour));
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

      toast.success("Settings saved.");
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="timezone">Timezone</Label>
        <Popover open={timezoneOpen} onOpenChange={setTimezoneOpen}>
          <PopoverTrigger asChild>
            <Button
              id="timezone"
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={timezoneOpen}
              className="w-full max-w-md justify-between font-normal"
            >
              <span className="truncate">{formatTimezoneLabel(timezone)}</span>
              <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search timezone..." />
              <CommandList>
                <CommandEmpty>No timezone found.</CommandEmpty>
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
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Working Days</Label>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => toggleDay(day.value)}
              aria-pressed={workingDays.includes(day.value)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                workingDays.includes(day.value)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-transparent text-muted-foreground",
              )}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="deadline-hour">Report Deadline</Label>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Employees must submit by
          </span>
          <Input
            id="deadline-hour"
            type="number"
            min={0}
            max={23}
            value={deadlineHour}
            onChange={(event) => setDeadlineHour(event.target.value)}
            className="w-16 text-center"
          />
          <span className="text-sm text-muted-foreground">:00 in</span>
          <span className="text-sm font-medium">{timezone}</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Reports submitted after this time are marked Late.
        </p>
      </div>

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
