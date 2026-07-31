"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateReportDeadline } from "@/lib/actions/admin/organization-settings";

// A single hour-of-day (UTC), not a full time picker: the underlying
// column is a smallint 0-23 (see the organization_settings migration),
// and a plain number input keeps the form matched to what's actually
// stored — no false precision the schema doesn't support.
export function ReportDeadlineForm({
  initialHourUtc,
}: {
  initialHourUtc: number;
}) {
  const [hour, setHour] = useState(String(initialHourUtc));
  const [fieldError, setFieldError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = Number(hour);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 23) {
      setFieldError("Enter an hour between 0 and 23.");
      return;
    }
    setFieldError("");

    startTransition(async () => {
      const result = await updateReportDeadline(parsed);

      if (!result.success) {
        toast.error(result.error ?? "Couldn't update the report deadline.");
        return;
      }

      toast.success("Report deadline updated.");
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="deadline-hour">Deadline hour (UTC, 24-hour)</Label>
        <Input
          id="deadline-hour"
          type="number"
          min={0}
          max={23}
          value={hour}
          onChange={(event) => setHour(event.target.value)}
          className="max-w-24"
          aria-invalid={!!fieldError}
        />
        {fieldError && (
          <p className="text-sm text-destructive">{fieldError}</p>
        )}
        <p className="text-sm text-muted-foreground">
          Reports submitted at or after this hour (UTC) are marked Late.
          Evaluated in UTC so the result is the same regardless of where an
          employee or manager is viewing from.
        </p>
      </div>

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
