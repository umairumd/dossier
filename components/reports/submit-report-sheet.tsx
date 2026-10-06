"use client";

import { useRef, useState } from "react";
import { FileText } from "lucide-react";
import { mascotBus } from "@/components/mascot/mascot-bus";
import { lookAtHero, setHeroSheetOpen } from "@/components/dashboard/hero-controller";
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
  userId,
  offDaySubmit = false,
  hoverFeed = false,
  alreadySubmitted,
  triggerLabel,
  triggerVariant = "default",
  triggerSize,
  triggerClassName,
  onSubmitted,
  template,
  initialReport,
}: {
  userId?: string;
  /** “Submit anyway” on a day off. Plays day.offSubmit, then the sheet opens. */
  offDaySubmit?: boolean;
  /** Hero Submit button: open the drop box on hover. */
  hoverFeed?: boolean;
  alreadySubmitted: boolean;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "ghost" | "link";
  triggerSize?: "default" | "sm";
  triggerClassName?: string;
  onSubmitted?: () => void;
  template?: ReportTemplateWithFields;
  initialReport?: DailyReport;
}) {
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const submittedRef = useRef(false);
  const isEditEntry = alreadySubmitted && Boolean(initialReport);
  const target = userId ? { userId } : {};

  function handleOpenChange(next: boolean) {
    openRef.current = next;
    setOpen(next);
    setHeroSheetOpen(next);
    // Closing without a successful submit must shut the drop box. Pointer
    // leave on the hero button does not fire while the sheet is open.
    if (!next && !submittedRef.current) {
      mascotBus.emit("report.dropCancel", target);
    }
    if (!next) submittedRef.current = false;
  }

  function handleSubmitted() {
    submittedRef.current = true;
    handleOpenChange(false);
    onSubmitted?.();
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button
          disabled={alreadySubmitted && !initialReport}
          variant={triggerVariant}
          size={triggerSize}
          className={triggerClassName}
          onClick={() => {
            if (offDaySubmit) mascotBus.emit("day.offSubmit", target);
          }}
          onPointerEnter={(event) => {
            if (!hoverFeed) return;
            lookAtHero(event.currentTarget);
            mascotBus.emit("report.dropHover", target);
          }}
          onPointerLeave={() => {
            if (!hoverFeed || openRef.current) return;
            mascotBus.emit("report.dropCancel", target);
          }}
        >
          {triggerVariant !== "link" && <FileText />}
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
                userId={userId}
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
