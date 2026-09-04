"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";
import { assignDepartmentTemplate } from "@/lib/actions/admin/templates";
import { CreateDeptTemplateDialog } from "@/components/admin/create-dept-template-dialog";
import type { ReportTemplate } from "@/types/template";

const NONE_VALUE = "__none__";

interface DeptTemplateActionsProps {
  departmentId: string;
  departmentName: string;
  currentTemplateId: string | null;
  templates: ReportTemplate[];
  canCreate?: boolean;
}

export function DeptTemplateActions({
  departmentId,
  departmentName,
  currentTemplateId,
  templates,
  canCreate = false,
}: DeptTemplateActionsProps) {
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>(
    currentTemplateId ?? NONE_VALUE,
  );
  const [isPending, startTransition] = useTransition();

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setSelectedId(currentTemplateId ?? NONE_VALUE);
    }
  };

  const activeTemplates = templates.filter((template) => !template.archivedAt);
  const currentName =
    templates.find((template) => template.id === currentTemplateId)?.name ??
    "Organization default";

  const handleCreated = async (templateId: string) => {
    const result = await assignDepartmentTemplate({
      departmentId,
      templateId,
    });

    if (!result.success) {
      toast.warning(
        "Template created but could not auto-assign. Assign it manually from the Change menu.",
      );
    }

    setCreateOpen(false);
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await assignDepartmentTemplate({
        departmentId,
        templateId: selectedId === NONE_VALUE ? null : selectedId,
      });

      if (!result.success) {
        toast.error(result.error ?? "Couldn't assign template.");
        return;
      }

      toast.success("Template updated.");
      setOpen(false);
    });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{currentName}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleOpenChange(true)}
        >
          Change
        </Button>
        {canCreate && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="mr-1.5 size-4" />
            Create Template
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Template</DialogTitle>
            <DialogDescription>
              {departmentName} · choose a report template
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {activeTemplates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active templates yet.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    id={`dept-tmpl-none-${departmentId}`}
                    type="radio"
                    name={`dept-template-${departmentId}`}
                    className="size-4 accent-primary"
                    checked={selectedId === NONE_VALUE}
                    onChange={() => setSelectedId(NONE_VALUE)}
                  />
                  <Label htmlFor={`dept-tmpl-none-${departmentId}`}>
                    No override
                  </Label>
                </div>
                {activeTemplates.map((template) => {
                  const radioId = `dept-tmpl-${departmentId}-${template.id}`;
                  return (
                    <div key={template.id} className="flex items-center gap-2">
                      <input
                        id={radioId}
                        type="radio"
                        name={`dept-template-${departmentId}`}
                        className="size-4 accent-primary"
                        checked={selectedId === template.id}
                        onChange={() => setSelectedId(template.id)}
                      />
                      <Label htmlFor={radioId}>
                        {template.name}
                        {template.isDefault ? " (default)" : ""}
                      </Label>
                    </div>
                  );
                })}
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateDeptTemplateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        departmentId={departmentId}
        departmentName={departmentName}
        onCreated={handleCreated}
      />
    </>
  );
}
