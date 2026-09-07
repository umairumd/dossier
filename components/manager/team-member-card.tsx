import Link from "next/link";
import { MemberAvatar } from "@/components/shared/member-avatar";
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
  };
}) {
  return (
    <Link
      href={`/employees/${member.id}`}
      className="card-gradient flex flex-col items-center gap-3 rounded-xl border border-border p-5 transition-colors hover:bg-muted/20 block"
    >
      <MemberAvatar
        userId={member.id}
        name={member.full_name}
        size="xl"
      />
      <div className="flex w-full flex-col items-center gap-1">
        <span className="text-center text-sm font-semibold tracking-tight">
          {member.full_name}
        </span>
        {member.designation && (
          <span className="text-center text-xs text-muted-foreground">
            {member.designation}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
          {member.employment_type === "part_time" ? "Part-time" : "Full-time"}
        </span>
        <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
          {member.is_remote ? "Remote" : "On-site"}
        </span>
        {isManager && (
          <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 text-xs text-primary">
            Manager
          </span>
        )}
      </div>
      <div className="mt-1 flex items-center gap-3">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-sm font-semibold">
            {stats?.streak ?? "—"}
          </span>
          <span className="label-eyebrow">streak</span>
        </div>
        <div className="h-6 w-px bg-border" />
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-sm font-semibold">
            {stats ? `${stats.submissionRate}%` : "—"}
          </span>
          <span className="label-eyebrow">this month</span>
        </div>
        <div className="h-6 w-px bg-border" />
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-center text-sm font-semibold leading-tight">
            {stats?.lastSubmittedDaysAgo ?? "—"}
          </span>
          <span className="label-eyebrow">last report</span>
        </div>
      </div>
    </Link>
  );
}
