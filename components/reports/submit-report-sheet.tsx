"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DynamicReportForm } from "@/components/reports/dynamic-report-form";
import type { DailyReport } from "@/types/report";
import type { ReportTemplateWithFields } from "@/types/template";

export function SubmitReportSheet({
  alreadySubmitted,
  triggerLabel,
  triggerVariant = "default",
  onSubmitted,
  template,
  initialReport,
}: {
  alreadySubmitted: boolean;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "ghost";
  onSubmitted?: () => void;
  template?: ReportTemplateWithFields;
  initialReport?: DailyReport;
}) {
  const [open, setOpen] = useState(false);
  const isEditEntry = alreadySubmitted && Boolean(initialReport);

  function handleSubmitted() {
    setOpen(false);
    onSubmitted?.();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          disabled={alreadySubmitted && !initialReport}
          variant={isEditEntry ? triggerVariant : "default"}
        >
          <FileText />
          {isEditEntry
            ? (triggerLabel ?? "Edit Report")
            : alreadySubmitted
              ? "Report Submitted"
              : (triggerLabel ?? "Continue Today's Report")}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex h-full w-full flex-col overflow-y-auto sm:max-w-md">
        <div className="flex h-full min-h-0 flex-col">
          <SheetHeader>
            <SheetTitle>
              {isEditEntry ? "Edit Daily Report" : "Submit Daily Report"}
            </SheetTitle>
            <SheetDescription>
              {isEditEntry
                ? "You can edit today's report until the day ends."
                : "Fill in today's report and submit when ready."}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            {template ? (
              <DynamicReportForm
                template={template}
                onSubmitted={handleSubmitted}
                initialReport={initialReport}
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
