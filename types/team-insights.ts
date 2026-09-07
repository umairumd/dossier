import type { ActivityItem } from "@/types/activity";

export interface CompletionTrendPoint {
  date: string;
  completionPercentage: number;
}

export interface TeamMemberStanding {
  employeeId: string;
  fullName: string;
  streak: number;
  completionPercentage: number;
  reportsThisMonth: number;
  lastSubmittedDate: string | null;
}

export interface TeamInsights {
  trend: CompletionTrendPoint[];
  weeklyCompletionPercentage: number;
  longestStreaks: TeamMemberStanding[];
  frequentlyMissing: TeamMemberStanding[];
  recentActivity: ActivityItem[];
  memberStandings: TeamMemberStanding[];
}

// Shared shape for the admin analytics page's weekly/monthly trends —
// same CompletionTrendPoint the manager dashboard's chart already uses.
export interface OrganizationTrends {
  weeklyTrend: CompletionTrendPoint[];
  monthlyTrend: CompletionTrendPoint[];
}
