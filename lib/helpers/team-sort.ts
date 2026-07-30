import type { TeamMemberReport } from "@/types/team";

// Missing reports sort first (most actionable for a manager), then
// submitted reports by submission time — used by both the dashboard's
// today-only team list and the full Team Reports page.
export function sortTeamMembersBySubmission(
  members: TeamMemberReport[],
): TeamMemberReport[] {
  return [...members].sort((a, b) => {
    if (!a.report && b.report) return -1;
    if (a.report && !b.report) return 1;
    if (a.report && b.report) {
      return (
        new Date(b.report.submitted_at).getTime() -
        new Date(a.report.submitted_at).getTime()
      );
    }
    return a.fullName.localeCompare(b.fullName);
  });
}
