"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { mascotBus } from "@/components/mascot/mascot-bus";
import { toastUnlocked } from "@/components/mascot/unlock-toast";
import { lookAtHero, skipNextHeroResting } from "@/components/dashboard/hero-controller";
import { openBuddyFromHref, useBuddyDialog } from "@/components/layout/buddy-dialog";
import { Button } from "@/components/ui/button";
import {
  DynamicFieldRenderer,
  invalidUrlMessage,
} from "@/components/reports/dynamic-field-renderer";
import {
  loadTodayReport,
  submitDailyReport,
  updateDailyReport,
} from "@/lib/actions/reports";
import { ReportTasksSection } from "@/components/reports/report-tasks-section";
import { saveReportTaskUpdates, type ReportTaskUpdate } from "@/lib/actions/tasks";
import { ALREADY_SUBMITTED_ERROR } from "@/lib/reports/constants";
import type { DailyReport } from "@/types/report";
import { fieldResponse } from "@/lib/reports/field-response";
import type { ReportTemplateWithFields } from "@/types/template";

function emptyValues(template: ReportTemplateWithFields): Record<string, unknown> {
  return template.fields.reduce<Record<string, unknown>>((acc, field) => {
    acc[field.key] = field.fieldType === "checkbox" ? false : "";
    return acc;
  }, {});
}

function valuesFromReport(
  template: ReportTemplateWithFields,
  report: DailyReport,
): Record<string, unknown> {
  const next = emptyValues(template);
  const responses = report.field_responses;
  const hasResponses =
    responses != null && Object.keys(responses).length > 0;

  if (hasResponses) {
    for (const field of template.fields) {
      const value = fieldResponse(responses, field);
      if (value !== undefined) next[field.key] = value;
    }
    return next;
  }

  // Legacy reports that predate templates: column fallback only.
  for (const field of template.fields) {
    if (field.key === "content") {
      next[field.key] = report.content ?? "";
    } else if (field.key === "blockers") {
      next[field.key] = report.blockers ?? "";
    } else if (field.key === "additional_notes") {
      next[field.key] = report.additional_notes ?? "";
    }
  }
  return next;
}

export type ReportSubmitInfo = {
  mode: "create" | "update";
  onTime?: boolean;
  values: Record<string, unknown>;
};

function draftStorageKey(userId: string, orgDate: string) {
  return `dossier-report-draft:${userId}:${orgDate}`;
}

function readDraft(key: string | null): string | null {
  if (!key) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function clearDraft(key: string | null) {
  if (!key) return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Private mode, or storage blocked.
  }
}

function formatDraftTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function scrollHeroIntoView(): Promise<void> {
  const card = document.querySelector("[data-hero-card]");
  if (!(card instanceof HTMLElement)) return Promise.resolve();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  card.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  if (reduce) return Promise.resolve();
  return new Promise((resolve) => {
    const started = performance.now();
    const tick = () => {
      const top = card.getBoundingClientRect().top;
      if ((top >= -4 && top <= 80) || performance.now() - started > 900) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

export function DynamicReportForm({
  userId,
  template,
  onSubmitted,
  onCancel,
  initialReport,
  orgDate,
}: {
  userId?: string;
  template: ReportTemplateWithFields;
  onSubmitted: (info?: ReportSubmitInfo) => void;
  onCancel?: (options?: { restoreFocus?: boolean }) => void;
  initialReport?: DailyReport;
  orgDate?: string;
}) {
  const storageKey = userId && orgDate ? draftStorageKey(userId, orgDate) : null;
  const taskUpdatesRef = useRef<ReportTaskUpdate[]>([]);
  const onTaskUpdates = useCallback((updates: ReportTaskUpdate[]) => {
    taskUpdatesRef.current = updates;
  }, []);
  const saveTaskUpdates = async (reportDate: string | null | undefined) => {
    const updates = taskUpdatesRef.current;
    if (!reportDate || updates.length === 0) return;
    const result = await saveReportTaskUpdates(reportDate, updates);
    if (!result.success) toast.error("Your report is in, but the task updates didn't save.");
  };
  const isNewReport = !initialReport;
  const [isEditMode, setIsEditMode] = useState(Boolean(initialReport));
  const draftKey = isNewReport && !isEditMode ? storageKey : null;
  const storedDraft = useSyncExternalStore(
    (onChange) => {
      if (!draftKey) return () => {};
      const onStorage = (event: StorageEvent) => {
        if (event.key === draftKey) onChange();
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    },
    () => readDraft(draftKey),
    () => null,
  );
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    initialReport ? valuesFromReport(template, initialReport) : emptyValues(template),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [showEditPrompt, setShowEditPrompt] = useState(false);
  const [editingReportDate, setEditingReportDate] = useState<string | null>(
    initialReport?.report_date ?? null,
  );
  const [dirty, setDirty] = useState(false);
  const [draftToken, setDraftToken] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const ateRef = useRef(false);
  const cancelFromPointer = useRef(false);
  const editRef = useRef(isEditMode);
  const { open: openBuddy, prefetch } = useBuddyDialog();
  const target = userId ? { userId } : {};

  if (
    isNewReport &&
    !isEditMode &&
    !dirty &&
    storedDraft &&
    draftToken !== storedDraft
  ) {
    try {
      const parsed = JSON.parse(storedDraft) as {
        values?: Record<string, unknown>;
        savedAt?: string;
      };
      setDraftToken(storedDraft);
      if (parsed.values && typeof parsed.values === "object") {
        setValues({ ...emptyValues(template), ...parsed.values });
        setDraftSavedAt(typeof parsed.savedAt === "string" ? parsed.savedAt : null);
      }
    } catch {
      setDraftToken(storedDraft);
    }
  }

  useEffect(() => {
    editRef.current = isEditMode;
  });

  useEffect(() => {
    if (!isNewReport || isEditMode || !dirty || !draftKey) return;
    const handle = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      try {
        localStorage.setItem(draftKey, JSON.stringify({ values, savedAt }));
        setDraftSavedAt(savedAt);
      } catch {
        // Private mode, or storage full.
      }
    }, 600);
    return () => window.clearTimeout(handle);
  }, [isNewReport, isEditMode, dirty, draftKey, values]);

  useEffect(() => {
    return () => {
      if (ateRef.current || editRef.current) return;
      mascotBus.emit("report.dropCancel", userId ? { userId } : {});
    };
  }, [userId]);

  const fail = (message: string) => {
    toast.error(message);
    mascotBus.emit("save.error", target);
  };

  const handleLoadForEdit = () => {
    startTransition(async () => {
      const report = await loadTodayReport();
      if (!report) {
        toast.error("Couldn't load today's report.");
        return;
      }
      setValues(valuesFromReport(template, report));
      setEditingReportDate(report.report_date);
      setIsEditMode(true);
      setShowEditPrompt(false);
      setErrors({});
      toast.message("Editing today's report.");
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: Record<string, string> = {};
    for (const field of template.fields) {
      if (!field.isRequired) {
        continue;
      }
      if (field.fieldType === "checkbox") {
        continue;
      }
      const value = values[field.key];
      if (value === "" || value === null || value === undefined) {
        nextErrors[field.key] = `${field.label} is required.`;
      }
      if (field.fieldType === "url" && !nextErrors[field.key]) {
        const message = invalidUrlMessage(value);
        if (message) nextErrors[field.key] = message;
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const first = [...template.fields]
        .sort((a, b) => a.fieldOrder - b.fieldOrder)
        .find((field) => nextErrors[field.key]);
      if (first) {
        queueMicrotask(() => {
          const root = formRef.current?.querySelector(
            `[data-field-key="${CSS.escape(first.key)}"]`,
          );
          root
            ?.querySelector<HTMLElement>("input, textarea, button, [role='switch']")
            ?.focus();
        });
      }
      return;
    }

    setErrors({});

    startTransition(async () => {
      if (isEditMode && editingReportDate) {
        const result = await updateDailyReport(editingReportDate, {
          // Same shape as a new report: answers keyed by field key.
          fieldResponses: values,
          content: (values.content as string) ?? "",
          blockers: (values.blockers as string) ?? "",
          additionalNotes: (values.additional_notes as string) ?? "",
        });

        if (!result.success) {
          fail(result.error ?? "Couldn't update your report. Please try again.");
          return;
        }

        await saveTaskUpdates(editingReportDate);
        clearDraft(storageKey);
        toast.success("Report updated.");
        onSubmitted({ mode: "update", values });
        return;
      }

      const result = await submitDailyReport({
        templateId: template.id,
        fieldResponses: values,
        content: (values.content as string) ?? "",
        blockers: (values.blockers as string) ?? "",
        additionalNotes: (values.additional_notes as string) ?? "",
      });

      if (!result.success) {
        if (result.error === ALREADY_SUBMITTED_ERROR) {
          fail(result.error);
          setShowEditPrompt(true);
          return;
        }
        fail(result.error ?? "Couldn't submit your report. Please try again.");
        return;
      }

      await saveTaskUpdates(orgDate);
      ateRef.current = true;
      skipNextHeroResting();
      clearDraft(storageKey);
      onSubmitted({ mode: "create", onTime: result.onTime, values });
      await scrollHeroIntoView();
      if (typeof result.onTime === "boolean") {
        mascotBus.emit(
          result.onTime ? "report.submitted" : "report.submittedLate",
          target,
        );
      }
      if (toastUnlocked(result.unlocked ?? [], (href) => openBuddyFromHref(openBuddy, href))) {
        mascotBus.emit("reward.unlocked", target);
        prefetch();
      }
      toast.success("Report submitted for today.");
    });
  };

  function changeValue(key: string, next: unknown) {
    if (isNewReport && !isEditMode) setDirty(true);
    setValues((previous) => ({ ...previous, [key]: next }));
  }

  function discardDraft() {
    clearDraft(storageKey);
    setValues(emptyValues(template));
    setDraftSavedAt(null);
    setDirty(false);
    setErrors({});
  }

  const fields = [...template.fields].sort((a, b) => a.fieldOrder - b.fieldOrder);

  const submitButton = (
    <Button
      type="submit"
      disabled={isPending}
      className="h-12 w-full md:h-8 md:w-auto"
      onPointerEnter={(event) => {
        if (isEditMode) return;
        lookAtHero(event.currentTarget);
        mascotBus.emit("report.dropHover", target);
      }}
      onPointerDown={(event) => {
        if (isEditMode) return;
        lookAtHero(event.currentTarget);
        mascotBus.emit("report.dropReady", target);
      }}
      onPointerLeave={() => {
        if (isEditMode || ateRef.current) return;
        mascotBus.emit("report.dropCancel", target);
      }}
    >
      {isPending ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          {isEditMode ? "Saving..." : "Submitting..."}
        </>
      ) : isEditMode ? (
        "Save changes"
      ) : (
        "Submit report"
      )}
    </Button>
  );

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onKeyDown={(event) => {
        if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) return;
        event.preventDefault();
        event.currentTarget.requestSubmit();
      }}
      className="flex flex-col gap-4 max-md:[&_[data-slot=input]]:h-12 max-md:[&_[data-slot=input]]:text-base max-md:[&_[data-slot=input-group]]:h-12 max-md:[&_[data-slot=textarea]]:text-base max-md:[&_[data-slot=select-trigger]]:h-12 max-md:[&_[data-slot=select-trigger]]:text-base max-md:[&_[data-slot=toggle-group-item]]:min-h-12 max-md:[&_[data-slot=toggle-group-item]]:text-base max-md:[&_[data-slot=label]]:text-base"
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
        {fields.map((field) => (
          <div
            key={field.key}
            data-field-key={field.key}
            className={
              field.fieldType === "textarea" || field.fieldType === "checkbox"
                ? "col-span-full"
                : undefined
            }
          >
            <DynamicFieldRenderer
              field={field}
              value={values[field.key]}
              onChange={(next) => changeValue(field.key, next)}
              mode="input"
              layout="inline"
              error={errors[field.key]}
            />
          </div>
        ))}
        {orgDate ? <ReportTasksSection today={orgDate} onChange={onTaskUpdates} /> : null}
      </div>

      {showEditPrompt && !isEditMode ? (
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          className="w-full"
          onClick={handleLoadForEdit}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading...
            </>
          ) : (
            "Edit today's report"
          )}
        </Button>
      ) : (
        <ReportFormFooter
          draftLabel={draftSavedAt && !isEditMode ? `Draft saved ${formatDraftTime(draftSavedAt)}` : null}
          onDiscard={draftSavedAt && !isEditMode ? discardDraft : undefined}
          onCancel={onCancel}
          cancelFromPointer={cancelFromPointer}
          submit={submitButton}
        />
      )}
    </form>
  );
}

function ReportFormFooter({
  draftLabel,
  onDiscard,
  onCancel,
  cancelFromPointer,
  submit,
}: {
  draftLabel: string | null;
  onDiscard?: () => void;
  onCancel?: (options?: { restoreFocus?: boolean }) => void;
  cancelFromPointer: { current: boolean };
  submit: ReactNode;
}) {
  function cancelButton(className: string) {
    if (!onCancel) return null;
    return (
      <Button
        type="button"
        variant="ghost"
        className={className}
        onPointerDown={() => {
          cancelFromPointer.current = true;
        }}
        onClick={() => {
          const fromPointer = cancelFromPointer.current;
          cancelFromPointer.current = false;
          onCancel({ restoreFocus: !fromPointer });
        }}
      >
        Cancel
      </Button>
    );
  }

  return (
    <div className="border-t border-border pt-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="order-2 flex min-w-0 items-center justify-between gap-3 md:order-1 md:justify-start">
          {cancelButton("max-md:min-h-11 md:hidden")}
          <div className="flex min-w-0 items-center justify-end gap-3 md:justify-start">
            {draftLabel && <p className="text-xs text-muted-foreground">{draftLabel}</p>}
            {onDiscard && (
              <button
                type="button"
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                onClick={onDiscard}
              >
                Discard draft
              </button>
            )}
          </div>
        </div>
        <div className="order-1 flex flex-col gap-2 md:order-2 md:flex-row md:items-center">
          {cancelButton("hidden md:inline-flex")}
          {submit}
        </div>
      </div>
    </div>
  );
}
