"use client";

import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FIELD_TYPE_LABELS, type TemplateField } from "@/types/template";

// One question in the template editor. The row opens the question; the
// order arrows and delete sit above that target.
export function TemplateFieldRow({
  field,
  index,
  total,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  field: TemplateField;
  index: number;
  total: number;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const meta = [
    FIELD_TYPE_LABELS[field.fieldType],
    field.unit,
    field.isRequired ? "Required" : "Optional",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="group relative flex min-h-14 items-center gap-3 px-3 py-2.5 transition-colors hover:bg-foreground/[0.03] sm:px-4">
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${field.label}`}
        className="absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
      />
      <span className="relative z-10 flex shrink-0 flex-col">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          aria-label="Move up"
          className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronUp className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1}
          aria-label="Move down"
          className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronDown className="size-3.5" />
        </button>
      </span>

      <span className="w-5 shrink-0 text-[13px] tabular-nums text-muted-foreground">
        {index + 1}
      </span>

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-medium">{field.label}</span>
          {field.isPreview && <Badge variant="neutral">In lists</Badge>}
        </span>
        <span className="truncate text-[13px] text-muted-foreground">{meta}</span>
      </span>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onDelete}
        aria-label={`Remove ${field.label}`}
        className="relative z-10 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
}
