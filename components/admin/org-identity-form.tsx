"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Field, SaveBar, SettingsSection } from "@/components/shared/settings-section";
import { updateOrgName } from "@/lib/actions/admin/organization-settings";

export function OrgIdentityForm({
  initialName,
}: {
  initialName: string | null;
}) {
  const [saved, setSaved] = useState(initialName ?? "");
  const [name, setName] = useState(initialName ?? "");
  const [isPending, startTransition] = useTransition();
  const dirty = name.trim() !== saved;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const result = await updateOrgName(name);

      if (!result.success) {
        toast.error(result.error ?? "Couldn't update the organization name.");
        return;
      }

      setName(name.trim());
      setSaved(name.trim());
      toast.success("Organization name updated.");
    });
  };

  return (
    <SettingsSection
      title="Identity"
      description="How your organization appears in Dossier."
      onSubmit={handleSubmit}
      footer={<SaveBar dirty={dirty} pending={isPending} onReset={() => setName(saved)} />}
    >
      <Field label="Organization name" htmlFor="org-name">
        <Input
          id="org-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your organization name"
        />
      </Field>
    </SettingsSection>
  );
}
