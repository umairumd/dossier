"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ListPlus, Plus } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import {
  Field,
  SaveBar,
  SettingsSection,
} from "@/components/shared/settings-section";
import { TemplateFieldDialog } from "@/components/admin/template-field-dialog";
import { TemplateFieldRow } from "@/components/admin/template-field-row";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  const snapshot = JSON.stringify({ name, description, isDefault, fields });
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    template ? snapshot : "",
  );
  const dirty = snapshot !== savedSnapshot;

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

  function handleReset() {
    setName(template?.name ?? "");
    setDescription(template?.description ?? "");
    setIsDefault(template?.isDefault ?? false);
    setFields(template?.fields ?? []);
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Template name is required.");
      return;
    }
    if (fields.length === 0) {
      toast.error("Add at least one question.");
      return;
    }

    const keys = fields.map((field) => field.key);
    if (new Set(keys).size !== keys.length) {
      toast.error("Question keys must be unique.");
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
      setSavedSnapshot(snapshot);
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

  const count = sortedFields.length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={template ? template.name : "New template"}
        description={
          template
            ? `${count} question${count === 1 ? "" : "s"}${template.isDefault ? " · Org default" : ""}`
            : "Name the template, then add the questions people answer each day."
        }
      />

      <form onSubmit={handleSave} noValidate className="flex flex-col gap-6">
        <SettingsSection
          title="Details"
          description="How the template shows up when you pick one for a department."
        >
          <Field label="Name" htmlFor="template-name">
            <Input
              id="template-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Design team"
            />
          </Field>
          <Field
            label="Description"
            htmlFor="template-description"
            hint="Optional."
          >
            <Input
              id="template-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="For the design team's daily reports"
            />
          </Field>
          {template?.isDefault ? (
            <p className="text-[13px] text-muted-foreground">
              This is the org default. People without a department template
              use it.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_default"
                  checked={isDefault}
                  onCheckedChange={(value) => setIsDefault(!!value)}
                />
                <Label htmlFor="is_default" className="cursor-pointer font-normal">
                  Make this the org default
                </Label>
              </div>
              {isDefault && (
                <p className="ml-6 text-xs text-muted-foreground">
                  Replaces the current default. People without a department
                  template will use this one.
                </p>
              )}
            </div>
          )}
        </SettingsSection>

        <SettingsSection
          title="Questions"
          description="What people answer each day, in this order. Mark one to show in report lists."
          aside={
            <Button type="button" variant="outline" size="sm" onClick={handleAddField}>
              <Plus className="size-4" />
              Add question
            </Button>
          }
          footer={
            <SaveBar
              dirty={dirty && Boolean(name.trim()) && count > 0}
              pending={isSaving}
              onReset={template ? handleReset : undefined}
              label={template ? "Save changes" : "Create template"}
              pendingLabel={template ? "Saving…" : "Creating…"}
              hint={
                count === 0
                  ? "Add at least one question."
                  : !name.trim()
                    ? "Give the template a name."
                    : undefined
              }
            />
          }
        >
          {count === 0 ? (
            <EmptyState
              size="sm"
              icon={<ListPlus className="size-4" />}
              title="No questions yet."
              description="Add the first one to get started."
            />
          ) : (
            <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-lg ring-1 ring-inset ring-edge">
              {sortedFields.map((field, index) => (
                <TemplateFieldRow
                  key={field.id || field.key}
                  field={field}
                  index={index}
                  total={count}
                  onEdit={() => handleEditField(field)}
                  onDelete={() => handleDeleteField(field)}
                  onMoveUp={() => handleMoveUp(index)}
                  onMoveDown={() => handleMoveDown(index)}
                />
              ))}
            </ul>
          )}
        </SettingsSection>
      </form>

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
