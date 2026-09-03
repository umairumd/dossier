"use client";

import { useState } from "react";
import { Link2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InviteLinkDialog } from "./invite-link-dialog";

interface InvitationActionsMenuProps {
  email: string;
  fullName: string;
  orgName: string | null;
}

export function InvitationActionsMenu({
  email,
  fullName,
  orgName,
}: InvitationActionsMenuProps) {
  const [inviteLinkOpen, setInviteLinkOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setInviteLinkOpen(true)}>
            <Link2 className="size-4" />
            Invite Link
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <InviteLinkDialog
        email={email}
        fullName={fullName}
        orgName={orgName}
        open={inviteLinkOpen}
        onOpenChange={setInviteLinkOpen}
      />
    </>
  );
}
