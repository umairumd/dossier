"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FOR_YOU_GROUP_RANK, type ForYouGroup } from "@/lib/notifications/for-you";
import { cn } from "@/lib/utils";

export type ForYouAction = {
  label: string;
  href?: string;
  /** Return a promise to show progress; resolve true to switch to `doneLabel`. */
  onClick?: () => void | Promise<boolean | void>;
  doneLabel?: string;
  done?: boolean;
};

/**
 * One row in For you. Every source (notifications today; notices and tasks
 * next) fills the same parts: a 32 px picture, what happened, who or why,
 * one action, and a dismiss button only when the row can be dismissed.
 */
export type ForYouItem = {
  id: string;
  source: string;
  group: ForYouGroup;
  icon: ReactNode;
  title: string;
  meta?: string;
  /** Newest first within a group. */
  at: string;
  actions: ForYouAction[];
  /** Missing means the row leaves on its own. */
  onDismiss?: () => void;
};

const VISIBLE = 3;

export function HeroForYou({ items }: { items: ForYouItem[] }) {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;

  const sorted = [...items].sort(
    (a, b) =>
      FOR_YOU_GROUP_RANK[a.group] - FOR_YOU_GROUP_RANK[b.group] || b.at.localeCompare(a.at),
  );
  // Rows that need the person are never hidden behind "more".
  const pinned = sorted.filter((item) => item.group === "action").length;
  const shown = expanded ? sorted : sorted.slice(0, Math.max(VISIBLE, pinned));
  const more = sorted.length - shown.length;
  // Keep action buttons in one column whether or not a row can be dismissed.
  const reserveDismiss = shown.some((item) => item.onDismiss);

  return (
    <section aria-label="For you" className="flex flex-col gap-2">
      <h2 className="card-title">For you</h2>
      <ul className="flex flex-col gap-2">
        {shown.map((item) => (
          <ForYouRow key={`${item.source}:${item.id}`} item={item} reserveDismiss={reserveDismiss} />
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

const ROW_TONE: Record<ForYouGroup, string> = {
  action: "border-danger/35 bg-danger/[0.07]",
  warning: "border-warn/30 bg-warn/[0.06]",
  news: "border-edge bg-fill-subtle",
  other: "border-edge bg-fill-subtle",
};

/** The square behind an icon; avatars bring their own shape. */
export const FOR_YOU_ICON_TONE: Record<ForYouGroup, string> = {
  action: "bg-danger/15 text-danger",
  warning: "bg-warn/15 text-warn",
  news: "bg-info/15 text-info",
  other: "bg-fill-active text-muted-foreground",
};

export function ForYouIcon({ group, children }: { group: ForYouGroup; children: ReactNode }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4",
        FOR_YOU_ICON_TONE[group],
      )}
    >
      {children}
    </span>
  );
}

function ActionButton({ action }: { action: ForYouAction }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(Boolean(action.done));
  const className = "max-md:min-h-11";

  if (done && action.doneLabel) {
    return (
      <span className="inline-flex h-8 items-center gap-1.5 px-2 text-sm text-muted-foreground">
        <Check className="size-3.5 text-ok" />
        {action.doneLabel}
      </span>
    );
  }
  if (action.href) {
    return (
      <Button asChild variant="outline" size="sm" className={className}>
        <Link href={action.href} onClick={() => void action.onClick?.()}>
          {action.label}
        </Link>
      </Button>
    );
  }
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      disabled={busy}
      onClick={async () => {
        const result = action.onClick?.();
        if (!(result instanceof Promise)) return;
        setBusy(true);
        try {
          if ((await result) === true) setDone(true);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
      {action.label}
    </Button>
  );
}

function ForYouRow({ item, reserveDismiss }: { item: ForYouItem; reserveDismiss: boolean }) {
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
      dismissRef.current?.();
      return;
    }
    setCollapse(true);
    dismissTimer.current = window.setTimeout(() => dismissRef.current?.(), 200);
  }

  return (
    <li
      className={cn(
        "grid min-w-0 transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
        collapse ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
      )}
    >
      <div className={cn("min-h-0", collapse && "overflow-hidden")}>
        <div
          className={cn(
            "flex min-w-0 items-center gap-3 rounded-xl border p-3.5 max-md:flex-wrap md:p-4",
            ROW_TONE[item.group],
          )}
        >
          <span className="flex size-8 shrink-0 items-center justify-center">{item.icon}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{item.title}</p>
            {item.meta ? (
              <p className="truncate text-xs text-muted-foreground">{item.meta}</p>
            ) : null}
          </div>
          {item.actions.length > 0 || item.onDismiss || reserveDismiss ? (
            <div className="flex shrink-0 items-center gap-1.5 max-md:ml-11">
              {item.actions.map((action) => (
                <ActionButton key={action.label} action={action} />
              ))}
              {item.onDismiss ? (
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
              ) : reserveDismiss ? (
                <span aria-hidden className="size-9 shrink-0 max-md:size-11" />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}
