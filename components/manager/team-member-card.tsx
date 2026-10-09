import { MemberAvatar } from "@/components/shared/member-avatar";
import { PersonCard, PersonCardStats } from "@/components/shared/person-card";
import { Badge } from "@/components/ui/badge";
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
    <PersonCard
      href={`/employees/${member.id}`}
      avatar={
        <MemberAvatar
          userId={member.id}
          name={member.full_name}
          avatar={member.avatar}
          size="card"
        />
      }
      name={member.full_name}
      detail={member.designation}
      meta={[
        member.employment_type === "part_time" ? "Part-time" : "Full-time",
        member.is_remote ? "Remote" : "On-site",
      ].join(" · ")}
      tag={isManager ? <Badge variant="neutral">Manager</Badge> : undefined}
      footer={
        <PersonCardStats
          items={[
            { value: stats?.streak ?? "—", label: "Streak" },
            {
              value: stats ? `${stats.submissionRate}%` : "—",
              label: "Submission rate",
              title: stats?.submissionDetail,
            },
            {
              value: stats?.lastSubmittedDaysAgo ?? shortLast.label ?? "—",
              label: "Last report",
              title: shortLast.title,
            },
          ]}
        />
      }
    />
  );
}
