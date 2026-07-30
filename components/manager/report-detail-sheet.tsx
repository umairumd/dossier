"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatDateTime } from "@/lib/helpers/dates";
import type { DailyReport } from "@/types/report";
import type { TeamMemberReport } from "@/types/team";

type SubmittedMember = TeamMemberReport & { report: DailyReport };

// Controlled by the parent (Team Reports page): index is a position into
// the *currently filtered/sorted* list of submitted reports, so
// Previous/Next cycles through exactly what the manager is looking at,
// not a separate unfiltered fetch.
export function ReportDetailSheet({
  members,
  departmentName,
  index,
  onIndexChange,
}: {
  members: SubmittedMember[];
  departmentName: string;
  index: number | null;
  onIndexChange: (index: number | null) => void;
}) {
  const current = index !== null ? members[index] : null;

  return (
    <Sheet open={index !== null} onOpenChange={(next) => !next && onIndexChange(null)}>
      <SheetContent className="w-full sm:max-w-md">
        {index !== null && current && (
          <>
            <SheetHeader>
              <SheetTitle>{current.fullName}</SheetTitle>
              <SheetDescription>
                {departmentName} · Submitted{" "}
                {formatDateTime(current.report.submitted_at)}
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-4 px-4 pb-4 text-sm">
              <div>
                <p className="font-medium">Accomplishments</p>
                <p className="text-muted-foreground">
                  {current.report.content}
                </p>
              </div>
              <div>
                <p className="font-medium">Blockers</p>
                <p className="text-muted-foreground">
                  {current.report.blockers ?? "None reported"}
                </p>
              </div>
              <div>
                <p className="font-medium">Tomorrow&apos;s Plan</p>
                <p className="text-muted-foreground">
                  {current.report.additional_notes ?? "None reported"}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={index === 0}
                  onClick={() => onIndexChange(index - 1)}
                >
                  <ChevronLeft />
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  {index + 1} of {members.length}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={index === members.length - 1}
                  onClick={() => onIndexChange(index + 1)}
                >
                  Next
                  <ChevronRight />
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
