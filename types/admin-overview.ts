export interface OrganizationSummary {
  employees: number;
  managers: number;
  departments: number;
  pendingInvites: number;
  archivedUsers: number;
  submittedToday: number;
  missingToday: number;
  /** Expected reporters today (reporting roster minus away). */
  totalMembers: number;
  /** On leave / holiday / weekly_off with no report. */
  awayToday: number;
  completionPercentageToday: number;
}
