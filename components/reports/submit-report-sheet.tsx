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

export function SubmitReportSheet({
  alreadySubmitted,
  triggerLabel,
  onSubmitted,
}: {
  alreadySubmitted: boolean;
  triggerLabel?: string;
  onSubmitted?: () => void;
}) {
  const [open, setOpen] = useState(false);

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
              Share what you worked on today. Reports can&apos;t be edited once
              submitted.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            <ReportForm
              onSubmitted={() => {
                setOpen(false);
                onSubmitted?.();
              }}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
