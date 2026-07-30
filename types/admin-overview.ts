import type { ActivityItem } from "@/types/activity";
import type { CompletionTrendPoint } from "@/types/team-insights";

export interface AdminOverview {
  organization: {
    totalEmployees: number;
    activeEmployees: number;
    archivedEmployees: number;
    managers: number;
    departments: number;
  };
  reporting: {
    submittedToday: number;
    completionPercentage: number;
    weeklyTrend: CompletionTrendPoint[];
    monthlyTrend: CompletionTrendPoint[];
  };
  invitations: {
    pendingInvites: number;
    activeUsers: number;
    disabledUsers: number;
  };
  recentActivity: ActivityItem[];
}
