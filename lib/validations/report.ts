// Shared between the client form (immediate inline errors) and the server
// action (authoritative check) so the rules live in exactly one place —
// the client check is a UX convenience, never the source of truth.

export const REPORT_CONTENT_MAX_LENGTH = 4000;
export const REPORT_BLOCKERS_MAX_LENGTH = 2000;
export const REPORT_NOTES_MAX_LENGTH = 2000;

export interface ReportFormInput {
  content: string;
  blockers: string;
  additionalNotes: string;
}

export interface ReportFieldErrors {
  content?: string;
  blockers?: string;
  additionalNotes?: string;
}

export type ReportValidationResult =
  | {
      valid: true;
      value: {
        content: string;
        blockers: string | null;
        additionalNotes: string | null;
      };
    }
  | { valid: false; fieldErrors: ReportFieldErrors };

export function validateReportInput(
  input: ReportFormInput,
): ReportValidationResult {
  const content = input.content.trim();
  const blockers = input.blockers.trim();
  const additionalNotes = input.additionalNotes.trim();

  const fieldErrors: ReportFieldErrors = {};

  if (!content) {
    fieldErrors.content = "Describe what you worked on today.";
  } else if (content.length > REPORT_CONTENT_MAX_LENGTH) {
    fieldErrors.content = `Keep it under ${REPORT_CONTENT_MAX_LENGTH} characters.`;
  }

  if (blockers.length > REPORT_BLOCKERS_MAX_LENGTH) {
    fieldErrors.blockers = `Keep it under ${REPORT_BLOCKERS_MAX_LENGTH} characters.`;
  }

  if (additionalNotes.length > REPORT_NOTES_MAX_LENGTH) {
    fieldErrors.additionalNotes = `Keep it under ${REPORT_NOTES_MAX_LENGTH} characters.`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { valid: false, fieldErrors };
  }

  return {
    valid: true,
    value: {
      content,
      blockers: blockers || null,
      additionalNotes: additionalNotes || null,
    },
  };
}
