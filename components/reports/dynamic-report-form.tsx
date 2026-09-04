"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DynamicFieldRenderer } from "@/components/reports/dynamic-field-renderer";
import { submitDailyReport } from "@/lib/actions/reports";
import type { ReportTemplateWithFields } from "@/types/template";

export function DynamicReportForm({
  template,
  onSubmitted,
}: {
  template: ReportTemplateWithFields;
  onSubmitted: () => void;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    template.fields.reduce<Record<string, unknown>>((acc, field) => {
      acc[field.key] = field.fieldType === "checkbox" ? false : "";
      return acc;
    }, {}),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

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
      const result = await submitDailyReport({
        templateId: template.id,
        fieldResponses: values,
        content: (values.content as string) ?? "",
        blockers: (values.blockers as string) ?? "",
        additionalNotes: (values.additional_notes as string) ?? "",
      });

      if (!result.success) {
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
      <p className="text-xs text-muted-foreground">Using: {template.name}</p>

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

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit Report"
        )}
      </Button>
    </form>
  );
}
