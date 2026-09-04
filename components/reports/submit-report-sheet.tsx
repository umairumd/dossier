"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ReportForm } from "@/components/reports/report-form";
import { DynamicReportForm } from "@/components/reports/dynamic-report-form";
import type { ReportTemplateWithFields } from "@/types/template";

export function SubmitReportSheet({
  alreadySubmitted,
  triggerLabel,
  onSubmitted,
  template,
}: {
  alreadySubmitted: boolean;
  triggerLabel?: string;
  onSubmitted?: () => void;
  template?: ReportTemplateWithFields;
}) {
  const [open, setOpen] = useState(false);

  function handleSubmitted() {
    setOpen(false);
    onSubmitted?.();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button disabled={alreadySubmitted}>
          <FileText />
          {alreadySubmitted
            ? "Report Submitted"
            : (triggerLabel ?? "Continue Today's Report")}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex h-full w-full flex-col overflow-y-auto sm:max-w-md">
        <div className="flex h-full min-h-0 flex-col">
          <SheetHeader>
            <SheetTitle>Submit Daily Report</SheetTitle>
            <SheetDescription>
              Reports can&apos;t be edited after submission.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            {template ? (
              <DynamicReportForm
                template={template}
                onSubmitted={handleSubmitted}
              />
            ) : (
              <ReportForm onSubmitted={handleSubmitted} />
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
