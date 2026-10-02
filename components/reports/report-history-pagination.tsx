"use client";

import { useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

function pageWindow(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);
  for (let p = current - 1; p <= current + 1; p++) {
    if (p >= 1 && p <= total) pages.add(p);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push("ellipsis");
    }
    result.push(sorted[i]);
  }
  return result;
}

function ReportHistorySkeleton({ rows }: { rows: number }) {
  const count = Math.max(rows, 1);

  return (
    <div aria-busy="true" aria-label="Loading reports">
      <div className="hidden md:block">
        <Table className="w-full table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="font-medium text-muted-foreground">
                Date
              </TableHead>
              <TableHead className="w-[120px] font-medium text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="w-[140px] font-medium text-muted-foreground">
                Time
              </TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: count }, (_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Skeleton className="h-4 w-28" />
                </TableCell>
                <TableCell className="w-[120px]">
                  <Skeleton className="h-5 w-16" />
                </TableCell>
                <TableCell className="w-[140px]">
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell className="w-[60px] text-right">
                  <Skeleton className="ml-auto h-8 w-12" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-14" />
            </div>
            <Skeleton className="mt-2 h-5 w-16" />
            <Skeleton className="mt-2 h-8 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReportHistoryPagination({
  page,
  totalPages,
  baseHref = "/reports",
  rowCount,
  children,
}: {
  page: number;
  totalPages: number;
  baseHref?: string;
  rowCount: number;
  children: ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const goToPage = (next: number) => {
    if (next < 1 || next > totalPages || next === page) return;
    startTransition(() => {
      router.push(`${baseHref}?page=${next}`);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {isPending ? <ReportHistorySkeleton rows={rowCount} /> : children}

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-4">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>

            {pageWindow(page, totalPages).map((item, index) =>
              item === "ellipsis" ? (
                <span
                  key={`ellipsis-${index}`}
                  className="px-1 text-xs text-muted-foreground"
                >
                  …
                </span>
              ) : (
                <Button
                  key={item}
                  type="button"
                  variant={item === page ? "secondary" : "ghost"}
                  size="icon-sm"
                  onClick={() => goToPage(item)}
                  aria-label={`Page ${item}`}
                  aria-current={item === page ? "page" : undefined}
                  className={cn("min-w-8 text-xs tabular-nums")}
                >
                  {item}
                </Button>
              ),
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
