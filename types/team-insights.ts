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
}

export interface TeamInsights {
  trend: CompletionTrendPoint[];
  weeklyCompletionPercentage: number;
  longestStreaks: TeamMemberStanding[];
  frequentlyMissing: TeamMemberStanding[];
  recentActivity: ActivityItem[];
}
