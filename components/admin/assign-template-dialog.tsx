"use client";

import { useState, useTransition } from "react";
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
import { assignProfileTemplate } from "@/lib/actions/admin/templates";
import type { ReportTemplate } from "@/types/template";

const NONE_VALUE = "__none__";

interface AssignTemplateDialogProps {
  profileId: string;
  personName: string;
  currentTemplateId: string | null;
  templates: ReportTemplate[];
  currentTemplateSource?: "individual" | "department" | "default";
  currentTemplateSourceName?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignTemplateDialog({
  profileId,
  personName,
  currentTemplateId,
  templates,
  currentTemplateSource,
  currentTemplateSourceName,
  open,
  onOpenChange,
}: AssignTemplateDialogProps) {
  const [selectedId, setSelectedId] = useState<string>(
    currentTemplateId ?? NONE_VALUE,
  );
  const [isPending, startTransition] = useTransition();

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (next) {
      setSelectedId(currentTemplateId ?? NONE_VALUE);
    }
  };

  const activeTemplates = templates.filter((template) => !template.archivedAt);

  const sourceHint =
    currentTemplateSource === "individual"
      ? "Currently an individual override."
      : currentTemplateSource === "department"
        ? `Currently from ${currentTemplateSourceName ?? "department"}.`
        : currentTemplateSource === "default"
          ? "Currently using the organization default."
          : null;

  const handleSave = () => {
    startTransition(async () => {
      const result = await assignProfileTemplate({
        profileId,
        templateId: selectedId === NONE_VALUE ? null : selectedId,
      });

      if (!result.success) {
        toast.error(result.error ?? "Couldn't assign template.");
        return;
      }

      toast.success("Template updated.");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Template</DialogTitle>
          <DialogDescription>
            {personName} · choose a report template override
            {sourceHint ? ` ${sourceHint}` : ""}
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
                  id={`tmpl-none-${profileId}`}
                  type="radio"
                  name={`template-${profileId}`}
                  className="size-4 accent-primary"
                  checked={selectedId === NONE_VALUE}
                  onChange={() => setSelectedId(NONE_VALUE)}
                />
                <Label htmlFor={`tmpl-none-${profileId}`}>No override</Label>
              </div>
              {activeTemplates.map((template) => {
                const radioId = `tmpl-${profileId}-${template.id}`;
                return (
                  <div key={template.id} className="flex items-center gap-2">
                    <input
                      id={radioId}
                      type="radio"
                      name={`template-${profileId}`}
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
            onClick={() => onOpenChange(false)}
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
  );
}
