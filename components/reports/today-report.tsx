"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { mascotBus } from "@/components/mascot/mascot-bus";
import { useOrgNow } from "@/components/mascot/use-org-now";
import { HeroPanelMotion } from "@/components/dashboard/hero-panel-motion";
import { HeroViewHeader } from "@/components/dashboard/hero-view-header";
import { DynamicReportForm } from "@/components/reports/dynamic-report-form";
import type { ReportSubmitInfo } from "@/components/reports/dynamic-report-form";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Meter } from "@/components/ui/meter";
import { Tile, TileActions, TileHeader } from "@/components/ui/tile";
import {
  deadlineWindow,
  formatDeadlineClock,
  formatMinutesLeft,
} from "@/lib/helpers/deadline-window";
import { formatLocalTime } from "@/lib/helpers/time";
import { getSubmissionStatus } from "@/lib/reports/submission-status";
import { cn } from "@/lib/utils";
import type { DailyReport } from "@/types/report";
import type { ReportTemplateWithFields } from "@/types/template";


function emptySubscribe() {
  return () => {};
}

function bigRemaining(minutes: number, pastDue: boolean): string {
  if (pastDue) return "Past due";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

export function HeroReportPanel({
  open,
  onOpen,
  onClose,
  triggerRef,
  panelRef,
  userId,
  todayReport,
  template,
  isOffDay,
  onFullDayLeave,
  orgDate,
  timeZone,
  deadlineHourLocal,
  shiftFulltimeStart,
  surface = "inset",
}: {
  /** "card" when it stands on the page (My Reports), "inset" in the hero. */
  surface?: "inset" | "card";
  open: boolean;
  onOpen: () => void;
  onClose: (options?: { restoreFocus?: boolean }) => void;
  triggerRef: (node: HTMLButtonElement | null) => void;
  panelRef: (node: HTMLDivElement | null) => void;
  userId: string;
  todayReport: DailyReport | null;
  template?: ReportTemplateWithFields;
  isOffDay: boolean;
  onFullDayLeave: boolean;
  orgDate: string;
  timeZone: string;
  deadlineHourLocal: number;
  shiftFulltimeStart: string;
}) {
  const router = useRouter();
  const now = useOrgNow();
  const refreshTimer = useRef<number | null>(null);
  const [pending, setPending] = useState<DailyReport | null>(null);
  const report = todayReport ?? pending;
  if (todayReport && pending) setPending(null);

  const readDraft = useCallback(() => {
    // `open` is read so closing the form picks up a draft saved while it was open.
    void open;
    try {
      const raw = localStorage.getItem(`dossier-report-draft:${userId}:${orgDate}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { savedAt?: string };
      return typeof parsed.savedAt === "string" ? parsed.savedAt : null;
    } catch {
      return null;
    }
  }, [userId, orgDate, open]);
  const draftSavedAt = useSyncExternalStore(emptySubscribe, readDraft, () => null);

  const progress = deadlineWindow(now, timeZone, shiftFulltimeStart, deadlineHourLocal);
  const dueClock = formatDeadlineClock(deadlineHourLocal);
  const timeTone = progress.amber
    ? "text-warn"
    : "text-foreground";

  function handleSubmitted(info?: ReportSubmitInfo) {
    if (info?.mode === "create" && info.values && !todayReport) {
      const submittedAt = new Date().toISOString();
      setPending({
        id: "pending",
        author_id: userId,
        report_date: orgDate,
        content: String(info.values.content ?? ""),
        blockers: info.values.blockers == null ? null : String(info.values.blockers),
        additional_notes:
          info.values.additional_notes == null ? null : String(info.values.additional_notes),
        submitted_at: submittedAt,
        created_at: submittedAt,
        template_id: template?.id ?? null,
        field_responses: template
          ? Object.fromEntries(template.fields.map((field) => [field.id, info.values[field.key]]))
          : info.values,
      });
    }
    onClose();
    if (info?.mode === "create") {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => router.refresh(), 4200);
    } else {
      router.refresh();
    }
  }

  useEffect(() => {
    return () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    };
  }, []);

  const form = (
    <ReportFormBody
      open={open}
      userId={userId}
      orgDate={orgDate}
      template={template}
      report={report}
      onClose={onClose}
      onSubmitted={handleSubmitted}
    />
  );

  return (
    <Tile surface={surface} data-today-report className="scroll-mt-16" style={{ viewTransitionName: "hero-report" }}>
      {open ? (
        <HeroViewHeader
          title="Today's report"
          panelRef={panelRef}
          onClose={onClose}
          meta={
            <>
              Due {dueClock}
              {" · "}
              <span className={progress.amber ? "text-warn" : undefined}>
                {formatMinutesLeft(progress.minutesLeft)}
              </span>
            </>
          }
        />
      ) : report ? (
        <SubmittedRest
          report={report}
          timeZone={timeZone}
          deadlineHourLocal={deadlineHourLocal}
          onEdit={onOpen}
          triggerRef={triggerRef}
        />
      ) : onFullDayLeave ? (
        <p className="text-sm text-muted-foreground">You&apos;re on leave today.</p>
      ) : isOffDay ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 text-sm text-muted-foreground">
            Shouldn&apos;t you be offline right now?
          </p>
          <TileActions align="end" className="mt-0 pt-0">
            <Button
              ref={triggerRef}
              type="button"
              variant="outline"
              size="sm"
              className="focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => {
                mascotBus.emit("day.offSubmit", { userId });
                onOpen();
              }}
            >
              Submit anyway
            </Button>
          </TileActions>
        </div>
      ) : (
        <WorkingRest
          dueClock={dueClock}
          remaining={bigRemaining(progress.minutesLeft, progress.pastDue)}
          pastDue={progress.pastDue}
          timeTone={timeTone}
          fill={progress.fill}
          amber={progress.amber}
          draftSavedAt={draftSavedAt}
          triggerRef={triggerRef}
          onOpen={onOpen}
        />
      )}
      {open && (
        <Meter
          className="mt-3"
          value={progress.fill}
          max={1}
          tone={progress.amber ? "warning" : "neutral"}
          label="Time until the report deadline"
        />
      )}
      {form}
    </Tile>
  );
}

function WorkingRest({
  dueClock,
  remaining,
  pastDue,
  timeTone,
  fill,
  amber,
  draftSavedAt,
  triggerRef,
  onOpen,
}: {
  dueClock: string;
  remaining: string;
  pastDue: boolean;
  timeTone: string;
  fill: number;
  amber: boolean;
  draftSavedAt: string | null;
  triggerRef: (node: HTMLButtonElement | null) => void;
  onOpen: () => void;
}) {
  const draftTime = draftSavedAt
    ? new Date(draftSavedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : null;
  return (
      <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <TileHeader eyebrow="Today's report" aside={`Due ${dueClock}`} />
          <p className={cn("mt-2 leading-none", timeTone)}>
            <span className="text-[28px] font-semibold tracking-tight md:text-[34px]">
              {remaining}
            </span>
            {!pastDue && <span className="ml-1.5 text-sm text-muted-foreground">left</span>}
          </p>
        </div>
        <TileActions align="end" className="mt-0 w-full pt-0 md:w-auto">
          {draftTime && (
            <p className="text-xs text-muted-foreground">Draft saved {draftTime}</p>
          )}
          <Button
            ref={triggerRef}
            type="button"
            className="w-full focus-visible:ring-2 focus-visible:ring-ring md:w-auto"
            onClick={onOpen}
          >
            {draftTime ? "Continue report" : "Write report"}
          </Button>
        </TileActions>
      </div>
      <Meter value={fill} max={1} tone={amber ? "warning" : "neutral"} label="Time until the report deadline" />
    </div>
  );
}

function SubmittedRest({
  report,
  timeZone,
  deadlineHourLocal,
  onEdit,
  triggerRef,
}: {
  report: DailyReport;
  timeZone: string;
  deadlineHourLocal: number;
  onEdit: () => void;
  triggerRef: (node: HTMLButtonElement | null) => void;
}) {
  const status = getSubmissionStatus(report.submitted_at, deadlineHourLocal, {
    deadlineHourLocal,
    deadlineHourUtc: deadlineHourLocal,
    timezone: timeZone,
    workingDays: [],
  });
  const late = status === "late";
  const time = formatLocalTime(report.submitted_at);
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <CheckCircle2 className="size-4 shrink-0 text-primary" />
        <span className="text-sm font-medium">Report submitted</span>
        <span className="text-sm text-muted-foreground">{time}</span>
        <Badge variant={late ? "warning" : "success"}>{late ? "Late" : "On time"}</Badge>
      </div>
        <TileActions align="end" className="mt-0 pt-0">
          <Button
            ref={triggerRef}
            type="button"
            variant="outline"
            size="sm"
            className="focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onEdit}
          >
            Edit report
          </Button>
        </TileActions>
    </div>
  );
}

function ReportFormBody({
  open,
  userId,
  orgDate,
  template,
  report,
  onClose,
  onSubmitted,
}: {
  open: boolean;
  userId: string;
  orgDate: string;
  template?: ReportTemplateWithFields;
  report: DailyReport | null;
  onClose: (options?: { restoreFocus?: boolean }) => void;
  onSubmitted: (info?: ReportSubmitInfo) => void;
}) {
  return (
    <HeroPanelMotion open={open}>
      <div className="pt-4">
        {template ? (
          <DynamicReportForm
            userId={userId}
            orgDate={orgDate}
            template={template}
            initialReport={report ?? undefined}
            onCancel={onClose}
            onSubmitted={onSubmitted}
          />
        ) : (
          <EmptyState
            size="sm"
            icon={<FileText className="size-4" />}
            title="Template not configured."
            description="Contact your admin."
          />
        )}
      </div>
    </HeroPanelMotion>
  );
}

type ReportsTodayProps = Omit<
  Parameters<typeof HeroReportPanel>[0],
  "open" | "onOpen" | "onClose" | "triggerRef" | "panelRef"
> & { initialOpen: boolean };

function writeReportParam(next: boolean) {
  const url = new URL(window.location.href);
  if (next) url.searchParams.set("report", "open");
  else url.searchParams.delete("report");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

function commitReportChange(apply: () => void) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const doc = document as Document & {
    startViewTransition?: (callback: () => void) => unknown;
  };
  if (!reduce && typeof doc.startViewTransition === "function") {
    try {
      doc.startViewTransition(() => flushSync(apply));
      return;
    } catch {
      // Fall through to a plain update if the transition can't start.
    }
  }
  apply();
}

function ignoreEscape(event: KeyboardEvent): boolean {
  if (event.defaultPrevented) return true;
  const target = event.target;
  if (target instanceof Element && target.closest("[role='listbox'], [data-slot='select-content'], [data-slot='popover-content']")) {
    return true;
  }
  if (document.querySelector("[role='listbox'], [data-slot='select-content'], [data-slot='popover-content']")) {
    return true;
  }
  return Boolean(document.querySelector("[role='combobox'][aria-expanded='true']"));
}

/** My Reports: the same tile, opening in place from /reports?report=open. */
export function ReportsToday({ initialOpen, ...props }: ReportsTodayProps) {
  const [open, setOpen] = useState(initialOpen);
  const [seenInitial, setSeenInitial] = useState(initialOpen);
  if (initialOpen !== seenInitial) {
    setSeenInitial(initialOpen);
    setOpen(initialOpen);
  }
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const returnFocus = useRef(false);

  const setPanelNode = useCallback((node: HTMLDivElement | null) => {
    if (node) panelRef.current = node;
  }, []);
  const setTrigger = useCallback((node: HTMLButtonElement | null) => {
    triggerRef.current = node;
    if (node && returnFocus.current) {
      returnFocus.current = false;
      node.focus({ preventScroll: true });
    }
  }, []);

  const openPanel = useCallback(() => {
    returnFocus.current = false;
    commitReportChange(() => {
      setOpen(true);
      writeReportParam(true);
    });
  }, []);

  const close = useCallback((options?: { restoreFocus?: boolean }) => {
    returnFocus.current = options?.restoreFocus !== false;
    commitReportChange(() => {
      setOpen(false);
      writeReportParam(false);
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus({ preventScroll: true });
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.querySelector("[data-today-report]")?.scrollIntoView({
      block: "start",
      behavior: reduce ? "auto" : "smooth",
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.repeat) return;
      if (ignoreEscape(event)) return;
      event.preventDefault();
      close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <HeroReportPanel
      {...props}
      surface="card"
      open={open}
      onOpen={openPanel}
      onClose={close}
      triggerRef={setTrigger}
      panelRef={setPanelNode}
    />
  );
}
