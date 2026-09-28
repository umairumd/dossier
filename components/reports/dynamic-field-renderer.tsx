"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { TemplateField } from "@/types/template";

function isEmptyDisplayValue(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

function RequiredStar({ required }: { required: boolean }) {
  if (!required) {
    return null;
  }

  return <span className="ml-1 text-destructive">*</span>;
}

function DisplayLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );

}

function DisplayValue({
  empty,
  className,
  children,
}: {
  empty?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "text-sm",
        empty ? "text-muted-foreground" : "text-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
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
        <div className="flex flex-col gap-1">
          <DisplayLabel>{field.label}</DisplayLabel>
          {href ? (
            <Link
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-sm text-primary hover:underline"
            >
              {href}
            </Link>
          ) : (
            <DisplayValue empty>None reported</DisplayValue>
          )}
        </div>
      );
    }

    if (field.fieldType === "checkbox") {
      const checked = Boolean(value);
      return (
        <div className="flex flex-col gap-1">
          <DisplayLabel>{field.label}</DisplayLabel>
          <div className="flex items-center gap-1.5 text-sm">
            {checked ? (
              <Check className="size-3.5 text-foreground" aria-hidden />
            ) : (
              <X className="size-3.5 text-muted-foreground" aria-hidden />
            )}
            <span
              className={
                checked ? "text-foreground" : "text-muted-foreground"
              }
            >
              {checked ? "Yes" : "No"}
            </span>
          </div>
        </div>
      );
    }

    if (field.fieldType === "textarea") {
      const text =
        typeof value === "string" && value.trim() ? value : null;
      return (
        <div className="flex flex-col gap-1">
          <DisplayLabel>{field.label}</DisplayLabel>
          {text ? (
            <DisplayValue className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words">
              {text}
            </DisplayValue>
          ) : (
            <DisplayValue empty>None reported</DisplayValue>
          )}
        </div>
      );
    }

    if (field.fieldType === "number") {
      if (isEmptyDisplayValue(value)) {
        return (
          <div className="flex flex-col gap-1">
            <DisplayLabel>{field.label}</DisplayLabel>
            <DisplayValue empty>None reported</DisplayValue>
          </div>
        );
      }
      const unit = field.unit ? ` ${field.unit}` : "";
      return (
        <div className="flex flex-col gap-1">
          <DisplayLabel>{field.label}</DisplayLabel>
          <DisplayValue>{`${String(value)}${unit}`}</DisplayValue>
        </div>
      );
    }

    const text =
      typeof value === "string" && value.trim()
        ? value
        : !isEmptyDisplayValue(value) && typeof value !== "string"
          ? String(value)
          : null;

    return (
      <div className="flex flex-col gap-1">
        <DisplayLabel>{field.label}</DisplayLabel>
        {text ? (
          <DisplayValue>{text}</DisplayValue>
        ) : (
          <DisplayValue empty>None reported</DisplayValue>
        )}
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
