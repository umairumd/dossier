import Link from "next/link";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { RoleChip } from "@/components/shared/role-chip";
import { formatShortLastReport } from "@/lib/helpers/dates";
import type { TeamRosterMember } from "@/lib/supabase/queries/manager/team";

export function TeamMemberCard({
  member,
  isManager,
  stats,
}: {
  member: TeamRosterMember;
  isManager: boolean;
  stats?: {
    streak: number;
    submissionRate: number;
    submissionDetail: string;
    lastSubmittedDaysAgo: string | null;
    lastSubmittedDate?: string | null;
  };
}) {
  const shortLast = formatShortLastReport(stats?.lastSubmittedDate);
  return (
    <Link
      href={`/employees/${member.id}`}
      className="card-gradient flex flex-col gap-3 rounded-xl p-3 ring-1 ring-foreground/10 transition-colors hover:bg-foreground/5 sm:items-center sm:p-5"
    >
      <div className="flex items-center gap-2 sm:flex-col sm:gap-3">
        <MemberAvatar
          userId={member.id}
          name={member.full_name}
          size="xl"
          className="size-10 sm:size-16"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:w-full sm:items-center sm:gap-1">
          <span className="truncate text-sm font-semibold tracking-tight sm:text-center">
            {member.full_name}
          </span>
          {member.designation && (
            <span className="truncate text-xs text-muted-foreground sm:text-center">
              {member.designation}
            </span>
          )}
        </div>
      </div>
      <div className="hidden flex-wrap items-center justify-center gap-1.5 sm:flex">
        <RoleChip
          label={member.employment_type === "part_time" ? "Part-time" : "Full-time"}
        />
        <RoleChip label={member.is_remote ? "Remote" : "On-site"} />
        {isManager && <RoleChip label="Manager" tone="accent" />}
      </div>
      <div className="grid grid-cols-3 divide-x divide-border sm:mt-1 sm:flex sm:items-center sm:justify-center sm:gap-3 sm:divide-x-0">
        <div className="flex min-w-0 flex-col items-center gap-0.5 px-1">
          <span className="text-sm font-semibold tabular-nums">
            {stats?.streak ?? "—"}
          </span>
          <span className="text-center text-[10px] font-medium uppercase tracking-wide whitespace-nowrap text-muted-foreground">
            Streak
          </span>
        </div>
        <div className="hidden h-6 w-px bg-border sm:block" />
        <div className="flex min-w-0 flex-col items-center gap-0.5 px-1">
          <span className="text-sm font-semibold tabular-nums">
            {stats ? `${stats.submissionRate}%` : "—"}
          </span>
          <span className="text-center text-[10px] font-medium uppercase tracking-wide whitespace-nowrap text-muted-foreground sm:hidden">
            Rate
          </span>
          <span className="hidden text-center text-[10px] font-medium uppercase tracking-wide whitespace-nowrap text-muted-foreground sm:inline">
            Submission rate
          </span>
        </div>
        <div className="hidden h-6 w-px bg-border sm:block" />
        <div className="flex min-w-0 flex-col items-center gap-0.5 px-1">
          <span
            className="text-center text-sm font-semibold tabular-nums leading-tight sm:hidden"
            title={shortLast.title}
          >
            {shortLast.label}
          </span>
          <span className="hidden text-center text-sm font-semibold leading-tight sm:inline">
            {stats?.lastSubmittedDaysAgo ?? "—"}
          </span>
          <span className="text-center text-[10px] font-medium uppercase tracking-wide whitespace-nowrap text-muted-foreground sm:hidden">
            Last
          </span>
          <span className="hidden text-center text-[10px] font-medium uppercase tracking-wide whitespace-nowrap text-muted-foreground sm:inline">
            Last report
          </span>
        </div>
      </div>
    </Link>
  );
}
