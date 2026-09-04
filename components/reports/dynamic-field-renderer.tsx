"use client";

import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TemplateField } from "@/types/template";

function formatDisplayValue(field: TemplateField, value: unknown): string {
  switch (field.fieldType) {
    case "textarea":
    case "text":
    case "select":
      return typeof value === "string" && value.trim()
        ? value
        : "None reported";
    case "number": {
      if (value === null || value === undefined || value === "") {
        return "None reported";
      }
      const unit = field.unit ? ` ${field.unit}` : "";
      return `${String(value)}${unit}`;
    }
    case "checkbox":
      return value ? "Yes" : "No";
    case "url":
      return typeof value === "string" && value.trim()
        ? value
        : "None reported";
    default:
      return value === null || value === undefined || value === ""
        ? "None reported"
        : String(value);
  }
}

function RequiredStar({ required }: { required: boolean }) {
  if (!required) {
    return null;
  }

  return <span className="ml-1 text-destructive">*</span>;
}

export function DynamicFieldRenderer({
  field,
  value,
  onChange,
  mode,
  error,
}: {
  field: TemplateField;
  value: unknown;
  onChange?: (value: unknown) => void;
  mode: "input" | "display";
  error?: string;
}) {
  if (mode === "display") {
    if (field.fieldType === "url") {
      const href =
        typeof value === "string" && value.trim() ? value.trim() : null;

      return (
        <div>
          <p className="text-sm font-medium">{field.label}</p>
          {href ? (
            <Link
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline break-all text-sm"
            >
              {href}
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">None reported</p>
          )}
        </div>
      );
    }

    return (
      <div>
        <p className="text-sm font-medium">{field.label}</p>
        <p className="text-sm text-muted-foreground">
          {formatDisplayValue(field, value)}
        </p>
      </div>
    );
  }

  if (field.fieldType === "textarea") {
    return (
      <div className="flex flex-col gap-1.5">
        <Label>
          {field.label}
          <RequiredStar required={field.isRequired} />
        </Label>
        <Textarea
          value={(value as string) ?? ""}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={field.placeholder ?? undefined}
          rows={3}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  if (field.fieldType === "text") {
    return (
      <div className="flex flex-col gap-1.5">
        <Label>
          {field.label}
          <RequiredStar required={field.isRequired} />
        </Label>
        <Input
          type="text"
          value={(value as string) ?? ""}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={field.placeholder ?? undefined}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  if (field.fieldType === "number") {
    return (
      <div className="flex flex-col gap-1.5">
        <Label>
          {field.label}
          <RequiredStar required={field.isRequired} />
        </Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={(value as string) ?? ""}
            onChange={(event) => onChange?.(event.target.value)}
            placeholder={field.placeholder ?? undefined}
            min={field.minValue ?? undefined}
            max={field.maxValue ?? undefined}
            className="w-32"
          />
          {field.unit && (
            <span className="text-sm text-muted-foreground">{field.unit}</span>
          )}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  if (field.fieldType === "select") {
    return (
      <div className="flex flex-col gap-1.5">
        <Label>
          {field.label}
          <RequiredStar required={field.isRequired} />
        </Label>
        <Select
          value={(value as string) || undefined}
          onValueChange={(next) => onChange?.(next)}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={field.placeholder ?? "Select an option"}
            />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  if (field.fieldType === "checkbox") {
    return (
      <div className="flex items-center gap-2">
        <Checkbox
          id={field.key}
          checked={Boolean(value)}
          onCheckedChange={(checked) => onChange?.(!!checked)}
        />
        <Label htmlFor={field.key} className="font-normal">
          {field.label}
        </Label>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label>
        {field.label}
        <RequiredStar required={field.isRequired} />
      </Label>
      <Input
        type="url"
        value={(value as string) ?? ""}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={field.placeholder ?? "https://..."}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
