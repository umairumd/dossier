import type { DailyReport } from "@/types/report";
import type { ReportTemplateWithFields } from "@/types/template";

/** First written answer of a report (template order), on one line. */
export function reportExcerpt(
  report: Pick<DailyReport, "field_responses" | "template_id" | "content">,
  templates?: ReportTemplateWithFields[],
): string {
  const responses = report.field_responses;
  const template = templates?.find((item) => item.id === report.template_id);
  if (responses && template) {
    const fields = [...template.fields].sort((a, b) => a.fieldOrder - b.fieldOrder);
    for (const field of fields) {
      if (field.fieldType !== "text" && field.fieldType !== "textarea") continue;
      const raw = responses[field.id] ?? responses[field.key];
      if (typeof raw === "string" && raw.trim()) return raw.trim().replace(/\s+/g, " ");
    }
  }
  return report.content?.trim().replace(/\s+/g, " ") ?? "";
}
