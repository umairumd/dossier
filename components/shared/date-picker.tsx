"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// One family of date and time pickers for the whole app, built on the same
// calendar as the report date switcher. Values stay plain strings, as the
// forms already expect: "YYYY-MM-DD", "YYYY-MM" and "HH:MM".

const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar date, never shifted by time zones. */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDateKey(key: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return undefined;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function formatDateKey(key: string, withYear = true): string {
  const date = fromDateKey(key);
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    weekday: withYear ? undefined : "short",
    month: "short",
    day: "numeric",
    year: withYear ? "numeric" : undefined,
  });
}

/** The look of a form field, as a button that opens the picker. */
const FIELD_TRIGGER =
  "flex h-9 w-full min-w-0 items-center gap-2 rounded-md border border-input bg-transparent px-3 text-left text-sm shadow-xs transition-[color,box-shadow] outline-none hover:bg-fill-hover focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive data-[state=open]:border-ring dark:bg-input/30";

function ClearButton({ onClear, label }: { onClear: () => void; label: string }) {
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClear();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          onClear();
        }
      }}
      className="ml-auto -mr-1 rounded p-0.5 text-muted-foreground hover:bg-fill-active hover:text-foreground"
    >
      <X className="size-3.5" />
    </span>
  );
}

/**
 * The calendar on its own, with string values, for pickers that build their
 * own popover (the task due date, the announcement chips).
 */
export function DateCalendar({
  value,
  onChange,
  min,
  max,
  birthday,
}: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  /** Month and year dropdowns, for dates far in the past. */
  birthday?: boolean;
}) {
  const selected = fromDateKey(value);
  const minDate = min ? fromDateKey(min) : undefined;
  const maxDate = max ? fromDateKey(max) : undefined;
  return (
    <Calendar
      mode="single"
      selected={selected}
      defaultMonth={selected ?? maxDate}
      onSelect={(date) => {
        if (date) onChange(toDateKey(date));
      }}
      disabled={[...(minDate ? [{ before: minDate }] : []), ...(maxDate ? [{ after: maxDate }] : [])]}
      captionLayout={birthday ? "dropdown" : "label"}
      startMonth={birthday ? new Date(1940, 0) : minDate}
      endMonth={birthday ? (maxDate ?? new Date()) : maxDate}
      className="mx-auto"
    />
  );
}

/** A date in a form: a field-like button that opens the calendar. */
export function DateField({
  id,
  name,
  value,
  onChange,
  placeholder = "Pick a date",
  min,
  max,
  birthday,
  clearable,
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  /** Adds a hidden input, for forms that read FormData. */
  name?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  birthday?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button id={id} type="button" disabled={disabled} aria-label={ariaLabel} className={cn(FIELD_TRIGGER, className)}>
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
            <span className={cn("truncate", !value && "text-muted-foreground")}>
              {value ? formatDateKey(value) : placeholder}
            </span>
            {clearable && value ? <ClearButton onClear={() => onChange("")} label="Clear date" /> : null}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <DateCalendar
            value={value}
            min={min}
            max={max}
            birthday={birthday}
            onChange={(next) => {
              onChange(next);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </>
  );
}

/** A from–to range: two months side by side, one click for each end. */
export function DateRangeField({
  from,
  to,
  onChange,
  min,
  max,
  className,
}: {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  min?: string;
  max?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const minDate = min ? fromDateKey(min) : undefined;
  const maxDate = max ? fromDateKey(max) : undefined;
  const fromDate = fromDateKey(from);
  const label =
    from && to ? `${formatDateKey(from)} to ${formatDateKey(to)}` : from ? `${formatDateKey(from)} to …` : "Pick dates";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cn(FIELD_TRIGGER, className)}>
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
          <span className={cn("truncate", !from && "text-muted-foreground")}>{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={{ from: fromDate, to: fromDateKey(to) }}
          defaultMonth={fromDate ?? (maxDate ? new Date(maxDate.getFullYear(), maxDate.getMonth() - 1) : undefined)}
          onSelect={(range) => {
            const nextFrom = range?.from ? toDateKey(range.from) : "";
            const nextTo = range?.to ? toDateKey(range.to) : "";
            onChange({ from: nextFrom, to: nextTo });
            if (nextFrom && nextTo && nextFrom !== nextTo) setOpen(false);
          }}
          disabled={[...(minDate ? [{ before: minDate }] : []), ...(maxDate ? [{ after: maxDate }] : [])]}
          startMonth={minDate}
          endMonth={maxDate}
        />
      </PopoverContent>
    </Popover>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** A month ("YYYY-MM"): twelve months a year, with year arrows. */
export function MonthField({
  id,
  value,
  onChange,
  min,
  max,
  placeholder = "Pick a month",
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => Number(value.slice(0, 4)) || new Date().getFullYear());
  const label = value
    ? `${MONTHS[Number(value.slice(5, 7)) - 1] ?? ""} ${value.slice(0, 4)}`
    : placeholder;
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setYear(Number(value.slice(0, 4)) || new Date().getFullYear());
      }}
    >
      <PopoverTrigger asChild>
        <button id={id} type="button" className={cn(FIELD_TRIGGER, className)}>
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
          <span className={cn("truncate", !value && "text-muted-foreground")}>{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            aria-label="Previous year"
            onClick={() => setYear((y) => y - 1)}
            disabled={Boolean(min) && year <= Number(min!.slice(0, 4))}
            className="rounded-md p-1.5 hover:bg-fill-hover disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-sm font-medium tabular-nums">{year}</span>
          <button
            type="button"
            aria-label="Next year"
            onClick={() => setYear((y) => y + 1)}
            disabled={Boolean(max) && year >= Number(max!.slice(0, 4))}
            className="rounded-md p-1.5 hover:bg-fill-hover disabled:opacity-40"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {MONTHS.map((name, index) => {
            const key = `${year}-${pad(index + 1)}`;
            const off = (min && key < min) || (max && key > max);
            return (
              <button
                key={key}
                type="button"
                disabled={Boolean(off)}
                onClick={() => {
                  onChange(key);
                  setOpen(false);
                }}
                className={cn(
                  "rounded-md py-2 text-sm hover:bg-fill-hover disabled:pointer-events-none disabled:opacity-35",
                  key === value && "bg-primary text-primary-foreground hover:bg-primary",
                )}
              >
                {name}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** "9:30 AM" from "09:30". */
export function formatTime(value: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return "";
  const hours = Number(match[1]);
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 === 0 ? 12 : hours % 12}:${match[2]} ${suffix}`;
}

/** Reads "9", "930", "9:30", "9.30 pm", "21:30". Returns "HH:MM" or null. */
export function parseTime(text: string): string | null {
  const cleaned = text.trim().toLowerCase().replace(/\s+/g, "");
  const match = /^(\d{1,2})(?:[:.]?(\d{2}))?(am|pm|a|p)?$/.exec(cleaned);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  const meridiem = match[3]?.[0];
  if (minutes > 59 || hours > 23) return null;
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (meridiem === "p" && hours !== 12) hours += 12;
    if (meridiem === "a" && hours === 12) hours = 0;
  }
  return `${pad(hours)}:${pad(minutes)}`;
}

/**
 * A time ("HH:MM"). Type any time ("9:07", "2pm") or pick from the list in
 * 15-minute steps.
 */
export function TimeField({
  id,
  value,
  onChange,
  step = 15,
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  step?: number;
  className?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const options = useMemo(() => {
    const list: string[] = [];
    for (let minutes = 0; minutes < 24 * 60; minutes += step) {
      list.push(`${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`);
    }
    return list;
  }, [step]);
  const current = value.slice(0, 5);
  // The list opens at the chosen time, or the next step after it.
  const anchor = options.find((option) => option >= (current || "09:00")) ?? options[0];
  const commit = () => {
    if (text == null) return;
    const parsed = parseTime(text);
    if (parsed) onChange(parsed);
    setText(null);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn(FIELD_TRIGGER, "cursor-text px-0", className)}>
        <PopoverTrigger asChild>
          <button type="button" aria-label="Pick a time" className="flex h-full items-center pr-1 pl-3 text-muted-foreground">
            <Clock className="size-4" />
          </button>
        </PopoverTrigger>
        <input
          id={id}
          aria-label={ariaLabel}
          value={text ?? formatTime(current)}
          placeholder="9:00 AM"
          onFocus={(event) => event.target.select()}
          onChange={(event) => setText(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
              setOpen(false);
            }
            if (event.key === "ArrowDown") setOpen(true);
          }}
          className="h-full min-w-0 flex-1 bg-transparent pr-3 outline-none placeholder:text-muted-foreground"
        />
      </div>
      <PopoverContent
        align="start"
        className="w-40 gap-0 p-1"
        onOpenAutoFocus={(event) => event.preventDefault()}
        ref={(node) => {
          // Start the list at the chosen time.
          node?.querySelector<HTMLElement>("[data-current]")?.scrollIntoView({ block: "center" });
        }}
      >
        {options.map((option) => (
          <button
            key={option}
            type="button"
            data-current={option === anchor || undefined}
            onClick={() => {
              onChange(option);
              setText(null);
              setOpen(false);
            }}
            className={cn(
              "rounded-md px-2 py-1.5 text-left text-sm tabular-nums hover:bg-fill-hover",
              option === current && "bg-fill-active font-medium",
            )}
          >
            {formatTime(option)}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Quick choices, then the calendar, then a way to clear: the inside of a date
 * chip's popover (task due date, announcement pin and Home dates).
 */
export function QuickDatePanel({
  options,
  value,
  onChange,
  min,
  clearLabel,
  hint,
}: {
  options: { label: string; value: string }[];
  value: string;
  /** "" clears. */
  onChange: (value: string) => void;
  min?: string;
  clearLabel?: string;
  /** Short text on the right of each option, e.g. "Fri". */
  hint?: (value: string) => string;
}) {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col p-1.5">
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-fill-hover",
              option.value === value && "bg-fill-active",
            )}
          >
            {option.label}
            <span className="text-xs text-muted-foreground">
              {hint ? hint(option.value) : formatDateKey(option.value, false)}
            </span>
          </button>
        ))}
      </div>
      <div className="border-t border-line">
        <DateCalendar value={value} min={min} onChange={onChange} />
      </div>
      {value && clearLabel ? (
        <div className="border-t border-line p-1.5">
          <button
            type="button"
            onClick={() => onChange("")}
            className="w-full rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-fill-hover"
          >
            {clearLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
