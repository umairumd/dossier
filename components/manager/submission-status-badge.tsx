import { Coffee } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  SUBMISSION_STATUS_LABELS,
  type SubmissionStatus,
} from "@/lib/reports/submission-status";

// Tinted pills, the same everywhere: green on time, amber late, red missed,
// purple on leave, amber with a cup for a day off, grey pending.
const VARIANT: Record<
  SubmissionStatus,
  "success" | "warning" | "danger" | "neutral" | "leave" | "off"
> = {
  on_time: "success",
  late: "warning",
  missed: "danger",
  pending: "neutral",
  on_leave: "leave",
  off: "off",
};

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <Badge variant={VARIANT[status]}>
      {status === "off" ? <Coffee aria-hidden /> : null}
      {SUBMISSION_STATUS_LABELS[status]}
    </Badge>
  );
}
