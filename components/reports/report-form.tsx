"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitDailyReport } from "@/lib/actions/reports";
import {
  validateReportInput,
  type ReportFieldErrors,
} from "@/lib/validations/report";

export function ReportForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [content, setContent] = useState("");
  const [blockers, setBlockers] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ReportFieldErrors>({});
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const input = { content, blockers, additionalNotes };
    const validation = validateReportInput(input);

    if (!validation.valid) {
      setFieldErrors(validation.fieldErrors);
      return;
    }

    setFieldErrors({});

    startTransition(async () => {
      const result = await submitDailyReport(input);

      if (!result.success) {
        setFieldErrors(result.fieldErrors ?? {});
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
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="content">What did you work on today?</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={5}
          required
          aria-invalid={!!fieldErrors.content}
        />
        {fieldErrors.content && (
          <p className="text-sm text-destructive">{fieldErrors.content}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="blockers">Blockers</Label>
        <Textarea
          id="blockers"
          value={blockers}
          onChange={(event) => setBlockers(event.target.value)}
          rows={3}
          aria-invalid={!!fieldErrors.blockers}
        />
        {fieldErrors.blockers && (
          <p className="text-sm text-destructive">{fieldErrors.blockers}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="additionalNotes">Additional Notes</Label>
        <Textarea
          id="additionalNotes"
          value={additionalNotes}
          onChange={(event) => setAdditionalNotes(event.target.value)}
          rows={3}
          aria-invalid={!!fieldErrors.additionalNotes}
        />
        {fieldErrors.additionalNotes && (
          <p className="text-sm text-destructive">
            {fieldErrors.additionalNotes}
          </p>
        )}
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Submitting..." : "Submit Report"}
      </Button>
    </form>
  );
}
