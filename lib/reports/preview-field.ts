import type { DailyReport } from "@/types/report";
import type { ReportTemplateWithFields } from "@/types/template";

export function getPreviewValue(
  report: DailyReport | null,
  templates: ReportTemplateWithFields[],
): string | null {
  if (!report) {
    return null;
  }
  if (!report.template_id || !report.field_responses) {
    return null;
  }

  const template = templates.find((item) => item.id === report.template_id);
  if (!template) {
    return null;
  }

  const previewField = template.fields.find((field) => field.isPreview);
  if (!previewField) {
    return null;
  }

  const value = report.field_responses[previewField.key];
  if (!value) {
    return null;
  }

  if (previewField.fieldType === "checkbox") {
    return value ? "Yes" : "No";
  }
  if (previewField.fieldType === "number") {
    return previewField.unit
      ? `${value} ${previewField.unit}`
      : String(value);
  }

  const str = String(value).trim();
  return str || null;
}
