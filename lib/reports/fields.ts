// Centralizes the daily report's field metadata (key, label, prompt,
// ordering, required-ness) in one place. This is NOT the configurable
// report-template system — there is still exactly one fixed shape, and
// `daily_reports` still has three hardcoded columns — but every
// form/display surface now reads labels from here instead of each
// hardcoding its own copy of "Accomplishments"/"Blockers"/"Tomorrow's
// Plan" (three files did, with drifting wording, before this). When
// templates become admin-configurable, this array becomes the seed data
// for a "Default Template," and the display components that already
// consume it generically don't need to change — only where the data
// comes from does.
export interface ReportFieldDefinition {
  key: "content" | "blockers" | "additional_notes";
  label: string;
  prompt: string;
  required: boolean;
  order: number;
}

export const REPORT_FIELDS: ReportFieldDefinition[] = [
  {
    key: "content",
    label: "Accomplishments",
    prompt: "What did you work on today?",
    required: true,
    order: 0,
  },
  {
    key: "blockers",
    label: "Blockers",
    prompt: "Blockers",
    required: false,
    order: 1,
  },
  {
    key: "additional_notes",
    label: "Tomorrow's Plan",
    prompt: "Tomorrow's Plan",
    required: false,
    order: 2,
  },
];

export function getReportField(
  key: ReportFieldDefinition["key"],
): ReportFieldDefinition {
  const field = REPORT_FIELDS.find((candidate) => candidate.key === key);

  if (!field) {
    throw new Error(`Unknown report field: ${key}`);
  }

  return field;
}
