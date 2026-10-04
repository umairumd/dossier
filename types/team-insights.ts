import type { ActivityLogEntry } from "@/types/activity";

export interface CompletionTrendPoint {
  date: string;
  completionPercentage: number;
  /** Roster members who did not submit on this date (when known). */
  missingNames?: string[];
}

export interface TeamMemberStanding {
  employeeId: string;
  fullName: string;
  streak: number;
  completionPercentage: number;
  reportsThisMonth: number;
  reportsSubmitted: number;
  expectedWorkingDays: number;
  submissionRate: number;
  lastSubmittedDate: string | null;
}

export interface TeamInsights {
  trend: CompletionTrendPoint[];
  weeklyCompletionPercentage: number;
  longestStreaks: TeamMemberStanding[];
  frequentlyMissing: TeamMemberStanding[];
  recentActivity: ActivityLogEntry[];
  memberStandings: TeamMemberStanding[];
}

// Shared shape for the admin analytics page's weekly/monthly trends —
// same CompletionTrendPoint the manager dashboard's chart already uses.
export interface OrganizationTrends {
  weeklyTrend: CompletionTrendPoint[];
  monthlyTrend: CompletionTrendPoint[];
}
