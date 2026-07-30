export interface MissingReportRow {
  employeeId: string;
  fullName: string;
  lastSubmittedDate: string | null;
  daysMissed: number | null;
}
