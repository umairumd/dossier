"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { BotExpression } from "@/components/shared/bot-avatar";

const PILLS = [
  { label: "Wink", expr: "wink", duration: 800 },
  { label: "Wide Eyes", expr: "wide", duration: 2400 },
  { label: "Notification", expr: "notification", duration: 2000 },
] as const;

export function ExpressionPills({
  onExpression,
}: {
  onExpression: (expr: BotExpression) => void;
}) {
  const [active, setActive] = useState<BotExpression>("neutral");

  const trigger = (expr: BotExpression, duration: number) => {
    if (active !== "neutral") return;
    setActive(expr);
    onExpression(expr);
    setTimeout(() => {
      setActive("neutral");
      onExpression("neutral");
    }, duration);
  };

  return (
    <div className="flex gap-2">
      {PILLS.map((p) => (
        <button
          key={p.expr}
          type="button"
          onClick={() => trigger(p.expr, p.duration)}
          disabled={active !== "neutral"}
          className={cn(
            "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            active === p.expr
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
            active !== "neutral" &&
              active !== p.expr &&
              "cursor-not-allowed opacity-40",
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
