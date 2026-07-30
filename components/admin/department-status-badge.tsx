import { Badge } from "@/components/ui/badge";

export function DepartmentStatusBadge({
  archivedAt,
}: {
  archivedAt: string | null;
}) {
  return archivedAt ? (
    <Badge variant="outline">Archived</Badge>
  ) : (
    <Badge>Active</Badge>
  );
}
