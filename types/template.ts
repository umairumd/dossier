export interface ReportTemplate {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdBy: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateField {
  id: string;
  templateId: string;
  key: string;
  label: string;
  placeholder: string | null;
  fieldType:
    | "textarea"
    | "text"
    | "number"
    | "select"
    | "checkbox"
    | "url";
  isRequired: boolean;
  isPreview: boolean;
  fieldOrder: number;
  options: string[] | null;
  unit: string | null;
  minValue: number | null;
  maxValue: number | null;
  createdAt: string;
}

export interface ReportTemplateWithFields extends ReportTemplate {
  fields: TemplateField[];
}

export type FieldType = TemplateField["fieldType"];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  textarea: "Long text",
  text: "Short text",
  number: "Number",
  select: "Dropdown",
  checkbox: "Yes / No",
  url: "Link / URL",
};
