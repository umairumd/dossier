import type { TemplateField } from "@/types/template";

/**
 * A field's answer from a report's field_responses.
 *
 * Answers are stored by field key ("accomplishments"). Reports edited before
 * Oct 12, 2026 were saved by field id (the template field's UUID) instead, so
 * fall back to the id: those reports read correctly without a data fix.
 */
export function fieldResponse(
  responses: Record<string, unknown> | null | undefined,
  field: Pick<TemplateField, "key" | "id">,
): unknown {
  if (!responses) return undefined;
  if (Object.prototype.hasOwnProperty.call(responses, field.key)) return responses[field.key];
  return responses[field.id];
}
