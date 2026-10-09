import { cn } from "@/lib/utils";

export function Meter({
  value,
  max = 100,
  tone = "neutral",
  label,
  className,
}: {
  value: number;
  max?: number;
  tone?: "neutral" | "warning" | "success";
  label?: string;
  className?: string;
}) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      data-slot="meter"
      role="meter"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-1 overflow-hidden rounded-full bg-fill-active", className)}
    >
      <div
        className={cn(
          "h-full rounded-full",
          tone === "warning" && "bg-amber-500",
          tone === "success" && "bg-emerald-600 dark:bg-emerald-400",
          tone === "neutral" && "bg-foreground/70",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
