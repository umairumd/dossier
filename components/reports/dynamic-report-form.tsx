"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DynamicFieldRenderer } from "@/components/reports/dynamic-field-renderer";
import {
  ALREADY_SUBMITTED_ERROR,
  loadTodayReport,
  submitDailyReport,
  updateDailyReport,
} from "@/lib/actions/reports";
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
    // Prefill by field UUID id — not by key/name.
    for (const field of template.fields) {
      if (Object.prototype.hasOwnProperty.call(responses, field.id)) {
        next[field.key] = responses[field.id];
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
  template,
  onSubmitted,
}: {
  template: ReportTemplateWithFields;
  onSubmitted: () => void;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    emptyValues(template),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [showEditPrompt, setShowEditPrompt] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingReportDate, setEditingReportDate] = useState<string | null>(
    null,
  );

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
          toast.error(
            result.error ?? "Couldn't update your report. Please try again.",
          );
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
          toast.error(result.error);
          setShowEditPrompt(true);
          return;
        }
        toast.error(
          result.error ?? "Couldn't submit your report. Please try again.",
        );
        return;
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
        <Button type="submit" disabled={isPending} className="w-full">
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
