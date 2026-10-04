import { Coffee } from "lucide-react";
import { cn } from "@/lib/utils";

export function DayOffTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border/50 px-2 py-0.5 text-xs text-muted-foreground",
        className,
      )}
    >
      <Coffee className="size-3" />
      Day off
    </span>
  );
}
