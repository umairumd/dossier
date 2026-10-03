import { Badge } from "@/components/ui/badge";
import { getRoleLabel } from "@/lib/helpers/role-labels";
import { cn } from "@/lib/utils";

export function RoleChip({
  role,
  label,
  tone = "neutral",
  className,
}: {
  role?: string;
  label?: string;
  tone?: "neutral" | "accent";
  className?: string;
}) {
  const text = role ? getRoleLabel(role) : label;
  if (!text) {
    throw new Error("RoleChip requires a role or a label.");
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        tone === "accent"
          ? "border-primary/30 bg-primary/5 text-primary"
          : "text-muted-foreground",
        className,
      )}
    >
      {text}
    </Badge>
  );
}
