import { Coffee } from "lucide-react";
import { cn } from "@/lib/utils";

export function DayOffTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400 transition-colors hover:border-amber-500/50 hover:bg-amber-500/25 hover:text-amber-300",
        className,
      )}
    >
      <Coffee className="size-3" />
      Day off
    </span>
  );
}
