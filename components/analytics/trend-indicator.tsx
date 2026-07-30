import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

// A signed percentage-point (or percent) change versus a prior period.
// `positiveIsGood` flips the color convention for metrics where a rising
// number is bad (e.g. "late submissions") — direction/arrow always
// reflects the actual sign, only the color semantics change.
export function TrendIndicator({
  value,
  positiveIsGood = true,
}: {
  value: number;
  positiveIsGood?: boolean;
}) {
  const rounded = Math.round(value);

  if (rounded === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="size-3" />
        No change
      </span>
    );
  }

  const isUp = rounded > 0;
  const isGood = isUp === positiveIsGood;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        isGood ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
      )}
    >
      {isUp ? (
        <TrendingUp className="size-3" />
      ) : (
        <TrendingDown className="size-3" />
      )}
      {isUp ? "+" : ""}
      {rounded}%
    </span>
  );
}
