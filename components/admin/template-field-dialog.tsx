"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  FIELD_TYPE_LABELS,
  type FieldType,
  type TemplateField,
} from "@/types/template";

function generateKey(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function emptyField(overrides: Partial<TemplateField> = {}): TemplateField {
  return {
    id: crypto.randomUUID(),
    templateId: "",
    key: "",
    label: "",
    placeholder: null,
    fieldType: "textarea",
    isRequired: false,
    isPreview: false,
    fieldOrder: 0,
    options: null,
    unit: null,
    minValue: null,
    maxValue: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function FieldDialogForm({
  field,
  existingKeys,
  onOpenChange,
  onSave,
}: {
  field: TemplateField | null;
  existingKeys: string[];
  onOpenChange: (open: boolean) => void;
  onSave: (field: TemplateField) => void;
}) {
  const [label, setLabel] = useState(field?.label ?? "");
  const [key, setKey] = useState(field?.key ?? "");
  const [hasManualKey, setHasManualKey] = useState(!!field);
  const [placeholder, setPlaceholder] = useState(field?.placeholder ?? "");
  const [fieldType, setFieldType] = useState<FieldType>(
    field?.fieldType ?? "textarea",
  );
  const [isRequired, setIsRequired] = useState(field?.isRequired ?? false);
  const [isPreview, setIsPreview] = useState(field?.isPreview ?? false);
  const [unit, setUnit] = useState(field?.unit ?? "");
  const [minValue, setMinValue] = useState(
    field?.minValue != null ? String(field.minValue) : "",
  );
  const [maxValue, setMaxValue] = useState(
    field?.maxValue != null ? String(field.maxValue) : "",
  );
  const [options, setOptions] = useState(field?.options?.join("\n") ?? "");
  const [keyError, setKeyError] = useState<string | null>(null);

  function validateKey(nextKey: string): string | null {
    if (!nextKey.trim()) {
      return "Field key is required.";
    }
    const taken = existingKeys.filter((candidate) => candidate !== field?.key);
    if (taken.includes(nextKey)) {
      return "This key is already used by another field.";
    }
    return null;
  }

  function handleLabelChange(nextLabel: string) {
    setLabel(nextLabel);
    if (!field && !hasManualKey) {
      const nextKey = generateKey(nextLabel);
      setKey(nextKey);
      setKeyError(validateKey(nextKey));
    }
  }

  function handleKeyChange(nextKey: string) {
    setHasManualKey(true);
    setKey(nextKey);
    setKeyError(validateKey(nextKey));
  }

  function handleSave() {
    const error = validateKey(key);
    if (error) {
      setKeyError(error);
      return;
    }
    if (!label.trim()) {
      return;
    }
    if (fieldType === "select" && !options.trim()) {
      return;
    }

    onSave(
      emptyField({
        ...(field ?? {}),
        key: key.trim(),
        label: label.trim(),
        placeholder: placeholder.trim() || null,
        fieldType,
        isRequired,
        isPreview,
        unit: fieldType === "number" ? unit.trim() || null : null,
        minValue:
          fieldType === "number" && minValue !== "" ? Number(minValue) : null,
        maxValue:
          fieldType === "number" && maxValue !== "" ? Number(maxValue) : null,
        options:
          fieldType === "select"
            ? options
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
            : null,
      }),
    );
    onOpenChange(false);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{field ? "Edit Field" : "Add Field"}</DialogTitle>
      </DialogHeader>
      <DialogBody className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Field Type *</Label>
          <Select
            value={fieldType}
            onValueChange={(value) => setFieldType(value as FieldType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(FIELD_TYPE_LABELS).map(([value, typeLabel]) => (
                <SelectItem key={value} value={value}>
                  {typeLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Label *</Label>
          <Input
            value={label}
            onChange={(event) => handleLabelChange(event.target.value)}
            placeholder="e.g. What did you deliver?"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>
            Field Key
            <span className="ml-2 text-xs text-muted-foreground">
              auto-generated
            </span>
          </Label>
          <Input
            value={key}
            onChange={(event) => handleKeyChange(event.target.value)}
            disabled={!!field}
            className="font-mono text-sm"
          />
          {keyError && (
            <p className="text-xs text-destructive">{keyError}</p>
          )}
        </div>

        {fieldType !== "checkbox" && (
          <div className="flex flex-col gap-1.5">
            <Label>
              Placeholder
              <span className="ml-1 font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              value={placeholder}
              onChange={(event) => setPlaceholder(event.target.value)}
              placeholder="Hint text shown in the field"
            />
          </div>
        )}

        {fieldType === "number" && (
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label>
                Unit
                <span className="ml-1 font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                placeholder="hours, %, items..."
              />
            </div>
            <div className="flex w-20 flex-col gap-1.5">
              <Label>Min</Label>
              <Input
                type="number"
                value={minValue}
                onChange={(event) => setMinValue(event.target.value)}
                placeholder="0"
              />
            </div>
            <div className="flex w-20 flex-col gap-1.5">
              <Label>Max</Label>
              <Input
                type="number"
                value={maxValue}
                onChange={(event) => setMaxValue(event.target.value)}
                placeholder="100"
              />
            </div>
          </div>
        )}

        {fieldType === "select" && (
          <div className="flex flex-col gap-1.5">
            <Label>
              Options *
              <span className="ml-1 font-normal text-muted-foreground">
                one per line
              </span>
            </Label>
            <Textarea
              value={options}
              onChange={(event) => setOptions(event.target.value)}
              placeholder={"Concept\nScripting\nFilming\nEditing\nDelivered"}
              rows={5}
            />
          </div>
        )}

        <Separator />

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="is_required"
              checked={isRequired}
              onCheckedChange={(value) => setIsRequired(!!value)}
            />
            <Label htmlFor="is_required" className="cursor-pointer font-normal">
              Required field
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="is_preview"
              checked={isPreview}
              onCheckedChange={(value) => setIsPreview(!!value)}
            />
            <Label htmlFor="is_preview" className="cursor-pointer font-normal">
              Preview field
              <span className="ml-2 text-xs text-muted-foreground">
                shown in report lists
              </span>
            </Label>
          </div>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={
            !label.trim() ||
            !!keyError ||
            (fieldType === "select" && !options.trim())
          }
        >
          {field ? "Save Field" : "Add Field"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function TemplateFieldDialog({
  open,
  onOpenChange,
  field,
  existingKeys,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: TemplateField | null;
  existingKeys: string[];
  onSave: (field: TemplateField) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && (
          <FieldDialogForm
            key={field?.id ?? "new"}
            field={field}
            existingKeys={existingKeys}
            onOpenChange={onOpenChange}
            onSave={onSave}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
