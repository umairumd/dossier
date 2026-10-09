import { Badge } from "@/components/ui/badge";
import {
  SUBMISSION_STATUS_LABELS,
  type SubmissionStatus,
} from "@/lib/reports/submission-status";

// Tinted pills, the same everywhere: green on time, amber late, red missed,
// grey for pending, leave and off days.
const VARIANT: Record<SubmissionStatus, "success" | "warning" | "danger" | "neutral"> = {
  on_time: "success",
  late: "warning",
  missed: "danger",
  pending: "neutral",
  on_leave: "neutral",
  off: "neutral",
};

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <Badge
      variant={VARIANT[status]}
      className={status === "off" ? "opacity-70" : undefined}
    >
      {SUBMISSION_STATUS_LABELS[status]}
    </Badge>
  );
}
