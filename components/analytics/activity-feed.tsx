import Link from "next/link";
import { Archive, Building2, FileText, UserPlus } from "lucide-react";
import { formatDateTime } from "@/lib/helpers/dates";
import type { ActivityItem, ActivityType } from "@/types/activity";

const ICONS: Record<ActivityType, typeof UserPlus> = {
  invited: UserPlus,
  archived: Archive,
  department_created: Building2,
  report_submitted: FileText,
};

// Reused by both the manager and admin dashboards. This is a *derived*
// feed built from existing timestamped columns (invited_at, archived_at,
// departments.created_at, daily_reports.submitted_at) at read time, not a
// persisted audit log — so it only reflects current-state timestamps.
// Reversible actions (e.g. restoring an archived employee) simply drop
// out of the feed rather than leaving a "restored" event, since nothing
// records that transition. A real audit trail would need its own table
// and write-side instrumentation, which is out of scope for this pass.
export function ActivityFeed({
  items,
  emptyMessage = "No recent activity.",
}: {
  items: ActivityItem[];
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => {
        const Icon = ICONS[item.type];
        const content = (
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon className="size-3.5 text-muted-foreground" />
            </div>
            <div className="flex flex-1 flex-col gap-0.5">
              <p className="text-sm">{item.label}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(item.timestamp)}
              </p>
            </div>
          </div>
        );

        return (
          <li key={item.id}>
            {item.href ? (
              <Link href={item.href} className="block hover:opacity-80">
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}
