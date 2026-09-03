import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DeptCompletionRow } from "@/lib/supabase/queries/admin/dept-completion";

function barClass(completionPct: number): string {
  if (completionPct >= 80) {
    return "bg-primary";
  }
  if (completionPct >= 50) {
    // One-off: shadcn has no semantic warning token; yellow is not a theme variable.
    return "bg-yellow-500/70";
  }
  return "bg-destructive/70";
}

export function DeptCompletionCard({
  departments,
}: {
  departments: DeptCompletionRow[];
}) {
  return (
    <Card className="card-gradient">
      <CardHeader>
        <CardTitle>Department Overview</CardTitle>
        <CardDescription>
          Report completion by department today
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {departments.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No departments with active members yet.
          </p>
        ) : (
          departments.map((dept) => {
            const missing = dept.total - dept.submitted;
            const widthPct = Math.max(
              dept.completionPct,
              dept.completionPct > 0 ? 2 : 0,
            );

            return (
              <div key={dept.departmentId} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {dept.departmentName}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {dept.submitted}/{dept.total}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", barClass(dept.completionPct))}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{dept.completionPct}% complete</span>
                  {missing > 0 && <span>{missing} missing</span>}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
