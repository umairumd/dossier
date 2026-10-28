"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Link2, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListTextarea } from "@/components/shared/list-textarea";
import { RichText } from "@/components/shared/rich-text";
import { cn } from "@/lib/utils";
import type { TemplateField } from "@/types/template";

function isEmptyDisplayValue(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

function RequiredStar({ required }: { required: boolean }) {
  if (!required) {
    return null;
  }

  return <span className="ml-0.5 text-muted-foreground">*</span>;
}

export function invalidUrlMessage(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol === "http:" || url.protocol === "https:") return null;
  } catch {
    // Fall through to the message.
  }
  return "Enter a valid URL.";
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-xs text-destructive">{error}</p>;
}


function DisplayLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="field-label">
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

function InlineInput({
  field,
  value,
  onChange,
  error,
}: {
  field: TemplateField;
  value: unknown;
  onChange?: (value: unknown) => void;
  error?: string;
}) {
  const invalid = Boolean(error);
  const label = (
    <Label>
      {field.label}
      <RequiredStar required={field.isRequired} />
    </Label>
  );

  if (field.fieldType === "textarea") {
    return (
      <div className="flex flex-col gap-1.5">
        {label}
        <ListTextarea
          value={(value as string) ?? ""}
          onChange={(next) => onChange?.(next)}
          placeholder={field.placeholder ?? undefined}
          invalid={invalid}
        />
        <FieldError error={error} />
      </div>
    );
  }

  if (field.fieldType === "text") {
    return (
      <div className="flex flex-col gap-1.5">
        {label}
        <Input
          type="text"
          value={(value as string) ?? ""}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={field.placeholder ?? undefined}
          aria-invalid={invalid || undefined}
          className="max-md:h-12"
        />
        <FieldError error={error} />
      </div>
    );
  }

  if (field.fieldType === "number") {
    const numeric = (value as string) ?? "";
    return (
      <div className="flex flex-col gap-1.5">
        {label}
        {field.unit ? (
          <InputGroup className="max-md:h-12">
            <InputGroupInput
              type="number"
              inputMode="numeric"
              value={numeric}
              onChange={(event) => onChange?.(event.target.value)}
              placeholder={field.placeholder ?? undefined}
              min={field.minValue ?? undefined}
              max={field.maxValue ?? undefined}
              aria-invalid={invalid || undefined}
              className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupText>{field.unit}</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
        ) : (
          <Input
            type="number"
            inputMode="numeric"
            value={numeric}
            onChange={(event) => onChange?.(event.target.value)}
            placeholder={field.placeholder ?? undefined}
            min={field.minValue ?? undefined}
            max={field.maxValue ?? undefined}
            aria-invalid={invalid || undefined}
            className="max-md:h-12"
          />
        )}
        <FieldError error={error} />
      </div>
    );
  }

  if (field.fieldType === "select") {
    const options = field.options ?? [];
    if (options.length <= 4) {
      return (
        <div className="flex flex-col gap-1.5">
          {label}
          <ToggleGroup
            type="single"
            variant="outline"
            value={(value as string) || ""}
            onValueChange={(next) => onChange?.(next)}
            className="w-full"
            aria-invalid={invalid || undefined}
          >
            {options.map((option) => (
              <ToggleGroupItem
                key={option}
                value={option}
                className="min-w-0 shrink truncate max-md:min-h-12 max-md:text-base"
              >
                {option}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <FieldError error={error} />
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-1.5">
        {label}
        <Select
          value={(value as string) || undefined}
          onValueChange={(next) => onChange?.(next)}
        >
          <SelectTrigger aria-invalid={invalid || undefined} className="w-full max-md:h-12 max-md:text-base">
            <SelectValue placeholder={field.placeholder ?? "Select an option"} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError error={error} />
      </div>
    );
  }

  if (field.fieldType === "checkbox") {
    const checked = Boolean(value);
    return (
      <div className="flex flex-col gap-1.5">
        <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
          <span className="text-sm font-medium max-md:text-base">
            {field.label}
            <RequiredStar required={field.isRequired} />
          </span>
          <Switch
            checked={checked}
            onCheckedChange={(next) => onChange?.(next)}
            aria-invalid={invalid || undefined}
          />
        </label>
        <FieldError error={error} />
      </div>
    );
  }

  return (
    <UrlField
      field={field}
      value={value}
      onChange={onChange}
      error={error}
    />
  );
}

function UrlField({
  field,
  value,
  onChange,
  error,
}: {
  field: TemplateField;
  value: unknown;
  onChange?: (value: unknown) => void;
  error?: string;
}) {
  const text = (value as string) ?? "";
  const [blurred, setBlurred] = useState<string | null>(null);
  const blurError = blurred === null ? null : invalidUrlMessage(text);
  const shown = error || blurError || undefined;
  const href = invalidUrlMessage(text) || !text.trim() ? null : text.trim();

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label>
          {field.label}
          <RequiredStar required={field.isRequired} />
        </Label>
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Open
          </a>
        )}
      </div>
      <InputGroup className="max-md:h-12">
        <InputGroupAddon>
          <Link2 />
        </InputGroupAddon>
        <InputGroupInput
          type="url"
          inputMode="url"
          value={text}
          placeholder={field.placeholder ?? "https://..."}
          aria-invalid={Boolean(shown) || undefined}
          onChange={(event) => {
            setBlurred(null);
            onChange?.(event.target.value);
          }}
          onBlur={() => setBlurred(text)}
        />
      </InputGroup>
      <FieldError error={shown} />
    </div>
  );
}

export function DynamicFieldRenderer({
  field,
  value,
  onChange,
  mode,
  error,
  layout = "sheet",
}: {
  field: TemplateField;
  value: unknown;
  onChange?: (value: unknown) => void;
  mode: "input" | "display";
  error?: string;
  /** Inline is the hero form. Sheet keeps the previous controls until phase D. */
  layout?: "inline" | "sheet";
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
            <RichText text={text} variant="points" className="max-h-64 overflow-y-auto" />
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

  if (layout === "inline") {
    return (
      <InlineInput field={field} value={value} onChange={onChange} error={error} />
    );
  }

  if (field.fieldType === "textarea") {
    return (
      <div className="flex flex-col gap-1.5">
        <Label>
          {field.label}
          <RequiredStar required={field.isRequired} />
        </Label>
        <ListTextarea
          value={(value as string) ?? ""}
          onChange={(next) => onChange?.(next)}
          placeholder={field.placeholder ?? undefined}
          invalid={Boolean(error)}
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
