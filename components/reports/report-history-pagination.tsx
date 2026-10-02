"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function ReportHistoryPagination({
  page,
  totalPages,
  baseHref = "/reports",
}: {
  page: number;
  totalPages: number;
  baseHref?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (totalPages <= 1) return null;

  const goToPage = (next: number) => {
    if (next < 1 || next > totalPages || next === page) return;
    startTransition(() => {
      router.push(`${baseHref}?page=${next}`);
    });
  };

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-4"
      aria-busy={isPending}
    >
      <p className="text-xs text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => goToPage(page - 1)}
          disabled={isPending || page <= 1}
          aria-label="Previous page"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ChevronLeft className="size-4" />
          )}
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
              disabled={isPending}
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
          disabled={isPending || page >= totalPages}
          aria-label="Next page"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
