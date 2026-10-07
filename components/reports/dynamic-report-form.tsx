"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { mascotBus } from "@/components/mascot/mascot-bus";
import { toastUnlocked } from "@/components/mascot/unlock-toast";
import { lookAtHero, skipNextHeroResting } from "@/components/dashboard/hero-controller";
import { Button } from "@/components/ui/button";
import { DynamicFieldRenderer } from "@/components/reports/dynamic-field-renderer";
import {
  loadTodayReport,
  submitDailyReport,
  updateDailyReport,
} from "@/lib/actions/reports";
import { ALREADY_SUBMITTED_ERROR } from "@/lib/reports/constants";
import type { DailyReport } from "@/types/report";
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
    // Prefer field UUID id (update path); fall back to field.key
    // (submit path stores key-keyed responses).
    for (const field of template.fields) {
      if (Object.prototype.hasOwnProperty.call(responses, field.id)) {
        next[field.key] = responses[field.id];
      } else if (Object.prototype.hasOwnProperty.call(responses, field.key)) {
        next[field.key] = responses[field.key];
      }
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

function fieldResponsesById(
  template: ReportTemplateWithFields,
  values: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    template.fields.map((field) => [field.id, values[field.key]]),
  );
}

export function DynamicReportForm({
  userId,
  template,
  onSubmitted,
  initialReport,
}: {
  userId?: string;
  template: ReportTemplateWithFields;
  onSubmitted: () => void;
  initialReport?: DailyReport;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    initialReport ? valuesFromReport(template, initialReport) : emptyValues(template),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [showEditPrompt, setShowEditPrompt] = useState(false);
  const [isEditMode, setIsEditMode] = useState(Boolean(initialReport));
  const [editingReportDate, setEditingReportDate] = useState<string | null>(
    initialReport?.report_date ?? null,
  );
  const ateRef = useRef(false);
  const router = useRouter();
  const target = userId ? { userId } : {};

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
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});

    startTransition(async () => {
      if (isEditMode && editingReportDate) {
        const result = await updateDailyReport(editingReportDate, {
          fieldResponses: fieldResponsesById(template, values),
          content: (values.content as string) ?? "",
          blockers: (values.blockers as string) ?? "",
          additionalNotes: (values.additional_notes as string) ?? "",
        });

        if (!result.success) {
          fail(result.error ?? "Couldn't update your report. Please try again.");
          return;
        }

        toast.success("Report updated.");
        onSubmitted();
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

      ateRef.current = true;
      skipNextHeroResting();
      if (typeof result.onTime === "boolean") {
        mascotBus.emit(
          result.onTime ? "report.submitted" : "report.submittedLate",
          target,
        );
      }
      if (toastUnlocked(result.unlocked ?? [], (href) => router.push(href))) {
        mascotBus.emit("reward.unlocked", target);
      }
      toast.success("Report submitted for today.");
      onSubmitted();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        {isEditMode ? "Editing today's report · " : null}
        Using: {template.name}
      </p>

      {[...template.fields]
        .sort((a, b) => a.fieldOrder - b.fieldOrder)
        .map((field) => (
          <DynamicFieldRenderer
            key={field.key}
            field={field}
            value={values[field.key]}
            onChange={(next) =>
              setValues((previous) => ({
                ...previous,
                [field.key]: next,
              }))
            }
            mode="input"
            error={errors[field.key]}
          />
        ))}

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
        <Button
          type="submit"
          disabled={isPending}
          className="w-full"
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
            "Save Changes"
          ) : (
            "Submit Report"
          )}
        </Button>
      )}
    </form>
  );
}
