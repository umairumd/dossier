/**
 * Who counts toward reporting: completion rates, "x of y in", missing lists,
 * team and company rosters. One rule everywhere, with no role exceptions:
 *
 *   active, onboarded, not archived, and not excluded from reporting
 *   (profiles.is_reporting, the "Exclude from reporting" toggle).
 *
 * Owners, admins, managers and supervisors count like anyone else unless the
 * toggle excludes them. On any `profiles` query that builds a reporting
 * roster:
 *
 *   .match(REPORTING_MATCH).is("archived_at", null)
 */
export const REPORTING_MATCH = {
  has_onboarded: true,
  is_active: true,
  is_reporting: true,
} as const;
