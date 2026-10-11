"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tile, TileActions } from "@/components/ui/tile";
import { cn } from "@/lib/utils";

export type ForYouAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

/** A row any source can push. `source` is "notification" for now. */
export type ForYouItem = {
  id: string;
  source: string;
  icon: ReactNode;
  title: string;
  body?: string;
  time: string;
  actions: ForYouAction[];
  onDismiss: () => void;
};

export function HeroForYou({ items }: { items: ForYouItem[] }) {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;
  const shown = expanded ? items : items.slice(0, 3);
  const more = items.length - shown.length;

  return (
    <section aria-label="For you" className="flex flex-col gap-2">
      <h2 className="card-title">For you</h2>
      <ul
        className={cn(
          "grid grid-cols-1 gap-2",
          shown.length === 2 && "md:grid-cols-2",
          shown.length >= 3 && "md:grid-cols-3",
        )}
      >
        {shown.map((item) => (
          <ForYouRow key={`${item.source}:${item.id}`} item={item} />
        ))}
      </ul>
      {more > 0 && (
        <button
          type="button"
          className="self-start text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline max-md:min-h-11"
          onClick={() => setExpanded(true)}
        >
          +{more} more
        </button>
      )}
    </section>
  );
}

function ForYouRow({ item }: { item: ForYouItem }) {
  const [collapse, setCollapse] = useState(false);
  const dismissTimer = useRef<number | null>(null);
  const dismissRef = useRef(item.onDismiss);
  useEffect(() => {
    dismissRef.current = item.onDismiss;
  });
  useEffect(() => {
    return () => {
      if (dismissTimer.current) window.clearTimeout(dismissTimer.current);
    };
  }, []);

  function dismiss() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      dismissRef.current();
      return;
    }
    setCollapse(true);
    dismissTimer.current = window.setTimeout(() => dismissRef.current(), 200);
  }

  return (
    <li
      className={cn(
        "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
        collapse ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
      )}
    >
      <div className={cn("min-h-0", collapse && "overflow-hidden")}>
        <Tile className="flex-row items-center gap-3 p-4 md:p-4">
          <span className="shrink-0">{item.icon}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{item.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {item.body ? `${item.body} · ${item.time}` : item.time}
            </p>
          </div>
          <TileActions align="end" className="mt-0 shrink-0 pt-0">
            {item.actions.map((action) =>
              action.href ? (
                <Button
                  key={action.label}
                  asChild
                  variant="outline"
                  size="sm"
                  className="max-md:min-h-11"
                >
                  <Link href={action.href} onClick={action.onClick}>
                    {action.label}
                  </Link>
                </Button>
              ) : (
                <Button
                  key={action.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="max-md:min-h-11"
                  onClick={action.onClick}
                >
                  {action.label}
                </Button>
              ),
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Dismiss"
              className="max-md:size-11"
              onClick={dismiss}
            >
              <X className="size-4" />
            </Button>
          </TileActions>
        </Tile>
      </div>
    </li>
  );
}
