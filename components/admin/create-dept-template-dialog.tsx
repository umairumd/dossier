"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { TemplateFieldDialog } from "@/components/admin/template-field-dialog";
import { TemplateFieldRow } from "@/components/admin/template-field-row";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createTemplate,
  type TemplateFieldInput,
} from "@/lib/actions/admin/templates";
import type { TemplateField } from "@/types/template";

function toFieldInput(field: TemplateField, index: number): TemplateFieldInput {
  return {
    key: field.key,
    label: field.label,
    placeholder: field.placeholder,
    fieldType: field.fieldType,
    isRequired: field.isRequired,
    isPreview: field.isPreview,
    fieldOrder: index,
    options: field.options,
    unit: field.unit,
    minValue: field.minValue,
    maxValue: field.maxValue,
  };
}

export function CreateDeptTemplateDialog({
  open,
  onOpenChange,
  departmentName,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departmentId: string;
  departmentName: string;
  onCreated: (templateId: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [editingField, setEditingField] = useState<TemplateField | null>(null);
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);

  const sortedFields = [...fields].sort((a, b) => a.fieldOrder - b.fieldOrder);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (next) {
      setName("");
      setDescription("");
      setFields([]);
      setEditingField(null);
    }
  }

  function handleMoveUp(index: number) {
    if (index === 0) {
      return;
    }
    setFields((current) => {
      const next = [...current].sort((a, b) => a.fieldOrder - b.fieldOrder);
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next.map((item, order) => ({ ...item, fieldOrder: order }));
    });
  }

  function handleMoveDown(index: number) {
    setFields((current) => {
      const next = [...current].sort((a, b) => a.fieldOrder - b.fieldOrder);
      if (index >= next.length - 1) {
        return current;
      }
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next.map((item, order) => ({ ...item, fieldOrder: order }));
    });
  }

  function handleSaveField(saved: TemplateField) {
    setFields((current) => {
      const exists = current.some((item) => item.id === saved.id);
      const next = exists
        ? current.map((item) => (item.id === saved.id ? saved : item))
        : [...current, { ...saved, fieldOrder: current.length }];

      if (!saved.isPreview) {
        return next;
      }

      return next.map((item) =>
        item.id === saved.id ? item : { ...item, isPreview: false },
      );
    });
  }

  function handleDeleteField(field: TemplateField) {
    setFields((current) =>
      current
        .filter((item) => item.id !== field.id)
        .map((item, index) => ({ ...item, fieldOrder: index })),
    );
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Template name is required.");
      return;
    }
    if (fields.length === 0) {
      toast.error("At least one field is required.");
      return;
    }

    const keys = fields.map((field) => field.key);
    if (new Set(keys).size !== keys.length) {
      toast.error("Field keys must be unique.");
      return;
    }

    setIsSaving(true);
    const result = await createTemplate({
      name: name.trim(),
      description: description.trim() || undefined,
      isDefault: false,
      fields: sortedFields.map(toFieldInput),
    });
    setIsSaving(false);

    if (result.success && result.id) {
      toast.success("Template created.");
      onCreated(result.id);
      onOpenChange(false);
      return;
    }

    toast.error(result.error ?? "Failed to create template.");
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Template</DialogTitle>
            <DialogDescription>
              For {departmentName} department
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-1 flex-col gap-4 overflow-y-auto">
            <div className="flex flex-col gap-1.5">
              <Label>Template Name *</Label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Design Daily Template"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>
                Description
                <span className="ml-1 font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="For the design team daily reports"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Fields</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingField(null);
                    setFieldDialogOpen(true);
                  }}
                >
                  <Plus className="mr-1.5 size-4" />
                  Add Field
                </Button>
              </div>

              {fields.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No fields yet. Add your first field above.
                </p>
              )}

              {sortedFields.map((field, index) => (
                <TemplateFieldRow
                  key={field.id}
                  field={field}
                  index={index}
                  total={sortedFields.length}
                  onEdit={() => {
                    setEditingField(field);
                    setFieldDialogOpen(true);
                  }}
                  onDelete={() => handleDeleteField(field)}
                  onMoveUp={() => handleMoveUp(index)}
                  onMoveDown={() => handleMoveDown(index)}
                />
              ))}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !name.trim() || fields.length === 0}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Template"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TemplateFieldDialog
        open={fieldDialogOpen}
        onOpenChange={setFieldDialogOpen}
        field={editingField}
        existingKeys={fields.map((field) => field.key)}
        onSave={handleSaveField}
      />
    </>
  );
}
