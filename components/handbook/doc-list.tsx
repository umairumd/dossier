import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { HandbookKindTag } from "@/components/handbook/kind-tag";
import type { HandbookReadStatus } from "@/lib/handbook/format";
import { cn } from "@/lib/utils";
import type { HandbookKind } from "@/types/handbook";

export interface HandbookListItem {
  id: string;
  slug: string;
  /** Doc link; carries ?as= while an admin is viewing as someone. */
  href: string;
  kind: HandbookKind;
  title: string;
  summary: string | null;
  version: number;
  requiresAck: boolean;
  status: HandbookReadStatus;
  /** "Oct 2", when read. */
  readOn: string | null;
}

export function ReadStatusText({
  item,
  className,
}: {
  item: Pick<HandbookListItem, "status" | "readOn">;
  className?: string;
}) {
  if (item.status === "outdated") {
    return <span className={cn("text-[13px] font-medium text-warn", className)}>Read again</span>;
  }
  if (item.status === "read") {
    return (
      <span className={cn("inline-flex items-center gap-1 text-[13px] text-muted-foreground", className)}>
        <Check aria-hidden className="size-3.5 text-ok" />
        Read {item.readOn}
      </span>
    );
  }
  return <span className={cn("text-[13px] text-muted-foreground", className)}>Not read yet</span>;
}

/** Rows inside a card: tag, title, summary, read status. */
export function HandbookDocRows({ items }: { items: HandbookListItem[] }) {
  return (
    <ul className="-mx-(--card-spacing) flex flex-col divide-y divide-line">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={item.href}
            className="group flex min-h-14 items-center gap-3 px-(--card-spacing) py-2.5 transition-colors outline-none hover:bg-fill-subtle focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex min-w-0 items-center gap-2">
                <HandbookKindTag kind={item.kind} />
                <span className="truncate text-sm font-medium">{item.title}</span>
              </span>
              {item.summary ? (
                <span className="truncate text-[13px] text-muted-foreground">{item.summary}</span>
              ) : null}
            </span>
            <ReadStatusText item={item} className="shrink-0" />
            <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** One card per doc: tag and version, title, summary, read status. */
export function HandbookDocCard({ item }: { item: HandbookListItem }) {
  return (
    <Link
      href={item.href}
      className="surface-card surface-card-interactive flex min-h-36 flex-col gap-2 rounded-xl bg-card p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <span className="flex items-center justify-between gap-2">
        <HandbookKindTag kind={item.kind} />
        <span className="text-xs tabular-nums text-muted-foreground">v{item.version}</span>
      </span>
      <span className="text-sm font-medium">{item.title}</span>
      {item.summary ? (
        <span className="line-clamp-2 text-[13px] text-muted-foreground">{item.summary}</span>
      ) : null}
      <span className="mt-auto pt-1">
        <ReadStatusText item={item} />
      </span>
    </Link>
  );
}
