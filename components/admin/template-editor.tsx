"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { TemplateFieldDialog } from "@/components/admin/template-field-dialog";
import { TemplateFieldRow } from "@/components/admin/template-field-row";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createTemplate,
  updateTemplate,
  type TemplateFieldInput,
} from "@/lib/actions/admin/templates";
import type {
  ReportTemplateWithFields,
  TemplateField,
} from "@/types/template";

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

export function TemplateEditor({
  template,
}: {
  template?: ReportTemplateWithFields;
}) {
  const router = useRouter();
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [isDefault, setIsDefault] = useState(template?.isDefault ?? false);
  const [fields, setFields] = useState<TemplateField[]>(template?.fields ?? []);
  const [isSaving, setIsSaving] = useState(false);
  const [editingField, setEditingField] = useState<TemplateField | null>(null);
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false);

  const sortedFields = [...fields].sort((a, b) => a.fieldOrder - b.fieldOrder);

  function handleAddField() {
    setEditingField(null);
    setIsFieldDialogOpen(true);
  }

  function handleEditField(field: TemplateField) {
    setEditingField(field);
    setIsFieldDialogOpen(true);
  }

  function handleDeleteField(field: TemplateField) {
    setFields((current) =>
      current
        .filter((item) => item.id !== field.id)
        .map((item, index) => ({ ...item, fieldOrder: index })),
    );
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
        : [
            ...current,
            { ...saved, fieldOrder: current.length },
          ];

      if (!saved.isPreview) {
        return next;
      }

      return next.map((item) =>
        item.id === saved.id ? item : { ...item, isPreview: false },
      );
    });
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

    const payload = {
      name,
      description,
      isDefault,
      fields: sortedFields.map(toFieldInput),
    };

    setIsSaving(true);

    if (template) {
      const result = await updateTemplate({
        id: template.id,
        ...payload,
      });
      setIsSaving(false);
      if (!result.success) {
        toast.error(result.error ?? "Couldn't save template.");
        return;
      }
      toast.success("Template updated.");
      return;
    }

    const result = await createTemplate(payload);
    setIsSaving(false);
    if (!result.success) {
      toast.error(result.error ?? "Couldn't save template.");
      return;
    }
    toast.success("Template created.");
    if (result.id) {
      router.push(`/organization/templates/${result.id}`);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/organization/templates"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Report Templates
      </Link>

      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="text-base">
            {template ? "Edit Template" : "New Template"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Template Name *</Label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Design Template"
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

          {!template?.isDefault && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_default"
                  checked={isDefault}
                  onCheckedChange={(value) => setIsDefault(!!value)}
                />
                <Label htmlFor="is_default" className="cursor-pointer font-normal">
                  Set as org default template
                </Label>
              </div>
              {isDefault && (
                <p className="ml-6 text-xs text-muted-foreground">
                  This will replace the current default template. All members
                  without a specific template will use this one.
                </p>
              )}
            </div>
          )}
          {template?.isDefault && (
            <p className="text-xs text-muted-foreground">
              This is the org default template. Members without a specific
              template use this.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="card-gradient">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Fields</CardTitle>
              <CardDescription>
                Define what employees fill in each day. One field can be marked
                as Preview — it shows as a summary in report lists.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleAddField}>
              <Plus className="mr-1.5 size-4" />
              Add Field
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 p-0">
          {sortedFields.length === 0 && (
            <div className="px-6 py-8 text-center text-sm text-muted-foreground">
              No fields yet. Add your first field above.
            </div>
          )}
          {sortedFields.map((field, index) => (
            <TemplateFieldRow
              key={field.id || field.key}
              field={field}
              index={index}
              total={sortedFields.length}
              onEdit={() => handleEditField(field)}
              onDelete={() => handleDeleteField(field)}
              onMoveUp={() => handleMoveUp(index)}
              onMoveDown={() => handleMoveDown(index)}
            />
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving || !name.trim() || fields.length === 0}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Saving...
            </>
          ) : template ? (
            "Save Changes"
          ) : (
            "Create Template"
          )}
        </Button>
      </div>

      <TemplateFieldDialog
        open={isFieldDialogOpen}
        onOpenChange={setIsFieldDialogOpen}
        field={editingField}
        existingKeys={fields.map((item) => item.key)}
        onSave={handleSaveField}
      />
    </div>
  );
}
