export interface OrganizationSummary {
  employees: number;
  managers: number;
  departments: number;
  pendingInvites: number;
  archivedUsers: number;
  submittedToday: number;
  missingToday: number;
  totalMembers: number;
  completionPercentageToday: number;
}
