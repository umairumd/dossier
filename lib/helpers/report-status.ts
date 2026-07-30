// No per-project "end of day" setting exists anywhere else in this app —
// this is a deliberate, clearly-named assumption standing in for one.
// Adjust here if the business actually has a different cutoff in mind.
// Evaluated in UTC (not the viewer's local time) so "late" means the same
// thing regardless of who's looking or where the server/browser is.
export const LATE_SUBMISSION_CUTOFF_HOUR_UTC = 17;

export function isLateSubmission(submittedAt: string): boolean {
  return new Date(submittedAt).getUTCHours() >= LATE_SUBMISSION_CUTOFF_HOUR_UTC;
}
