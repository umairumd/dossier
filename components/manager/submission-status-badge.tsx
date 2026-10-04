import { Badge } from "@/components/ui/badge";
import {
  SUBMISSION_STATUS_LABELS,
  type SubmissionStatus,
} from "@/lib/reports/submission-status";

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  if (status === "missed") {
    return <Badge variant="destructive">{SUBMISSION_STATUS_LABELS.missed}</Badge>;
  }
  if (status === "late") {
    return <Badge variant="destructive">{SUBMISSION_STATUS_LABELS.late}</Badge>;
  }
  if (status === "pending") {
    return <Badge variant="outline">{SUBMISSION_STATUS_LABELS.pending}</Badge>;
  }
  if (status === "on_leave") {
    return <Badge variant="secondary">{SUBMISSION_STATUS_LABELS.on_leave}</Badge>;
  }
  if (status === "off") {
    return (
      <Badge variant="outline" className="text-muted-foreground opacity-60">
        {SUBMISSION_STATUS_LABELS.off}
      </Badge>
    );
  }
  return <Badge>{SUBMISSION_STATUS_LABELS.on_time}</Badge>;
}
