import { Badge } from "@/components/ui/badge";
import type { EmployeeStatus } from "@/types/employee";

const STATUS_LABELS: Record<EmployeeStatus, string> = {
  archived: "Archived",
  invited: "Invited",
  active: "Active",
  disabled: "Deactivated",
};

const STATUS_VARIANTS: Record<EmployeeStatus, "success" | "warning" | "neutral"> = {
  archived: "neutral",
  invited: "neutral",
  active: "success",
  disabled: "warning",
};

export function EmployeeStatusBadge({ status }: { status: EmployeeStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>;
}
