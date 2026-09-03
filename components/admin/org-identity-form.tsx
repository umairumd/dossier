"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateOrgName } from "@/lib/actions/admin/organization-settings";

export function OrgIdentityForm({
  initialName,
}: {
  initialName: string | null;
}) {
  const [name, setName] = useState(initialName ?? "");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const result = await updateOrgName(name);

      if (!result.success) {
        toast.error(result.error ?? "Couldn't update the organization name.");
        return;
      }

      setName(name.trim());
      toast.success("Organization name updated.");
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="org-name">Organization Name</Label>
        <Input
          id="org-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your organization name"
        />
      </div>

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
