import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Owners and admins: download the month's attendance as a print-ready A4 PDF. */
export function ExportSheetMenu({ month, monthLabel }: { month: string; monthLabel: string }) {
  return (
    <Button asChild variant="outline" size="sm" className="h-9">
      <a
        href={`/api/exports/attendance-sheet?month=${month}`}
        download
        title={`Download ${monthLabel} attendance as a PDF (A4)`}
      >
        <Download className="size-4" />
        <span className="hidden sm:inline">Export</span>
      </a>
    </Button>
  );
}
