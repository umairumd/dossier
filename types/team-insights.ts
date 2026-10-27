import type { ActivityLogEntry } from "@/types/activity";

export interface CompletionTrendPoint {
  date: string;
  completionPercentage: number;
  /** Roster members who did not submit on this date (when known). */
  missingNames?: string[];
  submitted?: number;
  expected?: number;
  away?: number;
}

export interface TeamMemberStanding {
  employeeId: string;
  fullName: string;
  designation?: string | null;
  /** Raw profiles.avatar json, for the buddy face. */
  avatar?: unknown;
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
  /** Average of the 30 working-day window before `trend`. Null when that window was not loaded. */
  previousAverage: number | null;
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
