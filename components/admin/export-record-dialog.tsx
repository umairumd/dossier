"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SegmentedFilter } from "@/components/shared/segmented-filter";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { getRecordPreview } from "@/lib/actions/admin/export-record";
import {
  RECORD_MAX_DAYS,
  addDays,
  daySpan,
  estimatePagesFromPreview,
  type RecordOptions,
  type RecordPreview,
  type RecordSections,
} from "@/lib/exports/employee-record/build";
import { cn } from "@/lib/utils";

type Mode = "month" | "last7" | "last30" | "custom";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const STORAGE_KEY = "dossier:record-export";

type Saved = { mode: Mode; sections: RecordSections; options: RecordOptions };

const DEFAULTS: Saved = {
  mode: "month",
  sections: { attendance: true, reports: true, comments: true },
  options: { showMissed: true, leaveAndFines: true, reviewPage: false },
};

function readSaved(): Saved {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Saved>;
    return {
      mode: parsed.mode ?? DEFAULTS.mode,
      sections: { ...DEFAULTS.sections, ...parsed.sections },
      options: { ...DEFAULTS.options, ...parsed.options },
    };
  } catch {
    return DEFAULTS;
  }
}

function writeSaved(saved: Saved) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // Remembering choices is a convenience only.
  }
}

function monthEnd(month: string): string {
  return addDays(`${addDays(`${month}-01`, 32).slice(0, 7)}-01`, -1);
}

function previousMonth(month: string): string {
  return addDays(`${month}-01`, -1).slice(0, 7);
}

/** The six months up to and including this one, oldest first. */
function recentMonths(today: string): string[] {
  const out = [today.slice(0, 7)];
  while (out.length < 6) out.unshift(previousMonth(out[0]));
  return out;
}

function monthChip(month: string, today: string): string {
  const label = MONTHS[Number(month.slice(5, 7)) - 1];
  return month.slice(0, 4) === today.slice(0, 4) ? label : `${label} ${month.slice(2, 4)}`;
}

function formatDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

export function ExportRecordDialog({
  employeeId,
  name,
  designation,
  avatar,
  joinedOn,
  today,
}: {
  employeeId: string;
  name: string;
  designation?: string | null;
  avatar?: unknown;
  /** YYYY-MM-DD */
  joinedOn: string;
  /** Organisation's today, YYYY-MM-DD */
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(DEFAULTS.mode);
  const [sections, setSections] = useState<RecordSections>(DEFAULTS.sections);
  const [options, setOptions] = useState<RecordOptions>(DEFAULTS.options);
  const months = useMemo(() => recentMonths(today), [today]);
  const lastFullMonth = previousMonth(today.slice(0, 7));
  const [month, setMonth] = useState(
    monthEnd(lastFullMonth) >= joinedOn ? lastFullMonth : today.slice(0, 7),
  );
  const [customFrom, setCustomFrom] = useState(addDays(today, -29));
  const [customTo, setCustomTo] = useState(today);
  const [preview, setPreview] = useState<{ key: string; data: RecordPreview | null; error?: string } | null>(null);
  const [, startPreview] = useTransition();
  const [downloading, setDownloading] = useState(false);

  // Restore last choices each time the dialog opens.
  function handleOpenChange(next: boolean) {
    if (next) {
      const saved = readSaved();
      setMode(saved.mode);
      setSections(saved.sections);
      setOptions(saved.options);
    }
    setOpen(next);
  }

  const period = useMemo((): { from: string; to: string; error?: string } => {
    if (mode === "last7") return { from: addDays(today, -6), to: today };
    if (mode === "last30") return { from: addDays(today, -29), to: today };
    if (mode === "month") return { from: `${month}-01`, to: monthEnd(month) };
    if (!customFrom || !customTo) return { from: customFrom, to: customTo, error: "Pick both dates." };
    if (customFrom > customTo) return { from: customFrom, to: customTo, error: "The start date is after the end date." };
    if (daySpan(customFrom, customTo) > RECORD_MAX_DAYS) {
      return { from: customFrom, to: customTo, error: "Choose six months or less." };
    }
    return { from: customFrom, to: customTo };
  }, [mode, month, customFrom, customTo, today]);

  const key = `${period.from}|${period.to}`;
  const beforeJoin = !period.error && period.to < joinedOn;
  const canQuery = open && !period.error && !beforeJoin;

  useEffect(() => {
    if (!canQuery) return;
    let current = true;
    startPreview(async () => {
      const result = await getRecordPreview(employeeId, period.from, period.to);
      if (current) setPreview({ key, data: result.preview, error: result.error });
    });
    return () => {
      current = false;
    };
  }, [canQuery, employeeId, key, period.from, period.to]);

  const fresh = preview?.key === key ? preview : null;
  const data = fresh?.data ?? null;
  const loading = canQuery && !fresh;
  const empty = data != null && data.submitted === 0 && data.marked === 0;
  const pages = data ? estimatePagesFromPreview(data, sections, options) : null;
  const blocked =
    Boolean(period.error) || beforeJoin || loading || !data || empty || downloading;

  const message = period.error
    ? period.error
    : beforeJoin
      ? `${name.split(" ")[0]} joined on ${formatDay(joinedOn)}. Pick a later period.`
      : fresh?.error
        ? fresh.error
        : empty
          ? "Nothing to export for these dates."
          : period.from < joinedOn
            ? `Starts on ${formatDay(joinedOn)}, the day ${name.split(" ")[0]} joined.`
            : period.to > today
              ? `In progress: the record runs to today, ${formatDay(today)}.`
              : null;

  async function download() {
    if (!data) return;
    setDownloading(true);
    writeSaved({ mode, sections, options });
    const params = new URLSearchParams({
      id: employeeId,
      from: period.from,
      to: period.to,
      attendance: sections.attendance ? "1" : "0",
      reports: sections.reports ? "1" : "0",
      comments: sections.reports && sections.comments ? "1" : "0",
      missed: options.showMissed ? "1" : "0",
      money: options.leaveAndFines ? "1" : "0",
      review: options.reviewPage ? "1" : "0",
    });
    try {
      const response = await fetch(`/api/exports/employee-record?${params.toString()}`);
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Couldn't build the file.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = data.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast.success("Record downloaded", { description: data.fileName });
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't build the file.");
    } finally {
      setDownloading(false);
    }
  }

  const count = (text: string) => (loading ? "Counting…" : data ? text : "None");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Download className="size-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-0 sm:max-w-3xl">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4 pr-12">
          <MemberAvatar name={name} userId={employeeId} avatar={avatar} size="md" />
          <div className="min-w-0">
            <DialogTitle>Export record</DialogTitle>
            <p className="truncate text-sm text-muted-foreground">
              {[name, designation].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="flex flex-col gap-6 px-5 py-5 md:border-r md:border-line">
            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-medium">Period</h3>
              <SegmentedFilter
                label="Period"
                value={mode}
                onChange={setMode}
                className="w-full [&>button]:flex-1"
                options={[
                  { value: "month", label: "Month" },
                  { value: "last7", label: "Last 7 days" },
                  { value: "last30", label: "Last 30 days" },
                  { value: "custom", label: "Custom" },
                ]}
              />
              {mode === "month" && (
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6" role="radiogroup" aria-label="Month">
                  {months.map((m) => {
                    const disabled = monthEnd(m) < joinedOn;
                    const on = m === month;
                    return (
                      <button
                        key={m}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        disabled={disabled}
                        onClick={() => setMonth(m)}
                        className={cn(
                          "h-9 rounded-lg text-sm ring-1 ring-inset ring-edge transition-colors",
                          on
                            ? "bg-foreground font-medium text-background ring-foreground"
                            : "hover:bg-fill-hover",
                          disabled && "cursor-not-allowed text-muted-foreground opacity-50 hover:bg-transparent",
                        )}
                      >
                        {monthChip(m, today)}
                      </button>
                    );
                  })}
                </div>
              )}
              {mode === "custom" && (
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <Input
                    type="date"
                    aria-label="From"
                    value={customFrom}
                    min={joinedOn}
                    max={today}
                    onChange={(event) => setCustomFrom(event.target.value)}
                  />
                  <span className="text-sm text-muted-foreground">to</span>
                  <Input
                    type="date"
                    aria-label="To"
                    value={customTo}
                    min={joinedOn}
                    max={today}
                    onChange={(event) => setCustomTo(event.target.value)}
                  />
                </div>
              )}
              {message ? (
                <p
                  className={cn(
                    "text-[13px]",
                    period.error || beforeJoin || fresh?.error || empty ? "text-warn" : "text-muted-foreground",
                  )}
                >
                  {message}
                </p>
              ) : null}
            </section>

            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-medium">Include</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <IncludeOption title="Summary" detail="Always the first page" checked disabled />
                <IncludeOption
                  title="Attendance"
                  detail={count(data ? (data.marked > 0 ? `${plural(data.marked, "day")} marked` : "Not marked in this period") : "")}
                  checked={sections.attendance}
                  onChange={(on) => setSections((s) => ({ ...s, attendance: on }))}
                />
                <IncludeOption
                  title="Reports"
                  detail={count(data ? `${data.submitted} submitted · ${data.missed} missed` : "")}
                  checked={sections.reports}
                  onChange={(on) => setSections((s) => ({ ...s, reports: on }))}
                />
                <IncludeOption
                  title="Comments"
                  detail={
                    !sections.reports
                      ? "Shown with reports"
                      : count(
                          data
                            ? data.comments > 0
                              ? `${data.comments} on ${plural(data.commentedReports, "report")}`
                              : "None in this period"
                            : "",
                        )
                  }
                  checked={sections.reports && sections.comments}
                  disabled={!sections.reports}
                  onChange={(on) => setSections((s) => ({ ...s, comments: on }))}
                />
              </div>
            </section>

            <section className="flex flex-col gap-1">
              <h3 className="mb-2 text-sm font-medium">Options</h3>
              <OptionRow
                label="Show missed days in the report log"
                checked={options.showMissed}
                disabled={!sections.reports}
                onChange={(on) => setOptions((o) => ({ ...o, showMissed: on }))}
              />
              <OptionRow
                label="Fines and leave"
                checked={options.leaveAndFines}
                onChange={(on) => setOptions((o) => ({ ...o, leaveAndFines: on }))}
              />
              <OptionRow
                label="Review page with notes and signatures"
                checked={options.reviewPage}
                onChange={(on) => setOptions((o) => ({ ...o, reviewPage: on }))}
              />
            </section>
          </div>

          <aside className="hidden flex-col gap-3 bg-fill-subtle px-4 py-5 md:flex">
            <PagePreview sections={sections} faded={loading || !data} />
            <div className="flex flex-col gap-1 text-[13px] text-muted-foreground">
              <span className="font-medium text-foreground">
                {pages ? `About ${plural(pages, "page")}` : loading ? "Counting pages…" : "No pages"}
              </span>
              <span>
                {[
                  "Summary",
                  sections.attendance && "attendance",
                  sections.reports && "report log",
                  options.reviewPage && "review page",
                ]
                  .filter(Boolean)
                  .join(", ")}
              </span>
              {data ? <span>{data.label}</span> : null}
            </div>
          </aside>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-line bg-fill-subtle px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground">
            <FileText className="size-3.5 shrink-0" />
            <span className="truncate">{data ? data.fileName : "PDF"}</span>
          </span>
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={downloading}>
              Cancel
            </Button>
            <Button type="button" onClick={download} disabled={blocked}>
              {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {downloading ? `Preparing${pages ? ` ${plural(pages, "page")}` : ""}…` : "Download PDF"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function IncludeOption({
  title,
  detail,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  detail: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 ring-1 ring-inset ring-edge transition-colors",
        checked ? "bg-fill-hover" : "hover:bg-fill-subtle",
        disabled && "cursor-default",
      )}
    >
      <Checkbox
        className="mt-0.5"
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onChange?.(value === true)}
      />
      <span className="flex min-w-0 flex-col">
        <span className="text-sm font-medium">{title}</span>
        <span className="truncate text-[13px] text-muted-foreground">{detail}</span>
      </span>
    </label>
  );
}

function OptionRow({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex min-h-9 cursor-pointer items-center justify-between gap-4 text-sm",
        disabled && "cursor-default text-muted-foreground",
      )}
    >
      <span>{label}</span>
      <Switch checked={checked && !disabled} disabled={disabled} onCheckedChange={onChange} />
    </label>
  );
}

/** A drawn first page: the shape of the PDF, not its content. */
function PagePreview({ sections, faded }: { sections: RecordSections; faded: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex aspect-[210/297] w-full flex-col gap-1.5 rounded-sm bg-white p-3 shadow-sm ring-1 ring-black/5 transition-opacity",
        faded && "opacity-50",
      )}
    >
      <span className="h-1 w-1/3 rounded-full bg-zinc-200" />
      <span className="mt-1 h-2 w-3/5 rounded-full bg-zinc-700" />
      <span className="h-1 w-2/5 rounded-full bg-zinc-300" />
      <span className="mt-1 grid grid-cols-4 gap-1">
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i} className="h-5 rounded-sm border border-zinc-100 bg-zinc-50" />
        ))}
      </span>
      <span className="mt-1 flex h-8 items-end gap-1.5 px-1">
        {[60, 90, 70, 85, 40].map((h, i) => (
          <span key={i} className="flex-1 rounded-sm bg-green-300" style={{ height: `${h}%` }} />
        ))}
      </span>
      {sections.attendance && (
        <span className="mt-1 grid grid-cols-7 gap-0.5">
          {Array.from({ length: 14 }, (_, i) => (
            <span
              key={i}
              className={cn(
                "aspect-square rounded-[2px]",
                i % 7 === 6 ? "bg-zinc-100" : i === 3 ? "bg-amber-100" : "bg-green-100",
              )}
            />
          ))}
        </span>
      )}
      {sections.reports && (
        <span className="mt-1 flex flex-col gap-1">
          <span className="h-1 w-4/5 rounded-full bg-zinc-200" />
          <span className="h-1 w-3/5 rounded-full bg-zinc-200" />
          <span className="h-1 w-2/3 rounded-full bg-zinc-200" />
        </span>
      )}
    </div>
  );
}
