"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateAskMeAbout } from "@/lib/actions/admin/handbook";

/** One-line "Ask me about", shown in the handbook's Who to ask card. */
export function AskMeAboutField({
  profileId,
  initialValue,
}: {
  profileId: string;
  initialValue: string | null;
}) {
  const [value, setValue] = useState(initialValue ?? "");
  const [saved, setSaved] = useState(initialValue ?? "");
  const [pending, startTransition] = useTransition();
  const dirty = value.trim() !== saved.trim();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!dirty) return;
    startTransition(async () => {
      const result = await updateAskMeAbout(profileId, value);
      if (!result.success) {
        toast.error(result.error ?? "Couldn't save that.");
        return;
      }
      setSaved(value.trim());
      setValue(value.trim());
      toast.success("Saved.");
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-1">
      <label htmlFor="ask-me-about" className="field-label">
        Ask me about
      </label>
      <div className="flex items-center gap-2">
        <Input
          id="ask-me-about"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="e.g. Leave, attendance and payroll"
          maxLength={80}
          className="h-8 min-w-24"
        />
        {dirty ? (
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
