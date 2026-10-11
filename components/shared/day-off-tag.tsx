import { Coffee } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/** The day-off pill (status columns, notices). Date controls show plain text. */
export function DayOffTag({ className }: { className?: string }) {
  return (
    <Badge variant="off" className={className}>
      <Coffee aria-hidden />
      Day off
    </Badge>
  );
}
