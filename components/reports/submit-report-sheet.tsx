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
}: {
  alreadySubmitted: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button disabled={alreadySubmitted}>
          <FileText />
          {alreadySubmitted ? "Report Submitted" : "Submit Report"}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Submit Daily Report</SheetTitle>
          <SheetDescription>
            Share what you worked on today. Reports can&apos;t be edited once
            submitted.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">
          <ReportForm onSubmitted={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
