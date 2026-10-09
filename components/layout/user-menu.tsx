"use client";

import { ChevronsUpDown, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { SignOutForm } from "@/components/auth/sign-out-form";
import { MemberAvatar } from "@/components/shared/member-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Profile } from "@/types/profile";

export function UserMenu({ profile }: { profile: Profile }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Account menu"
        >
          <MemberAvatar
            userId={profile.id}
            name={profile.full_name}
            avatar={profile.avatar}
            size="md"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>
          <p className="font-medium">{profile.full_name}</p>
          <p className="text-xs font-normal text-muted-foreground capitalize">
            {profile.role}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild variant="destructive">
          <SignOutForm className="w-full">
            <button type="submit" className="flex w-full items-center gap-1.5">
              <LogOut />
              Sign out
            </button>
          </SignOutForm>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function roleLabel(profile: Profile): string {
  return profile.designation?.trim() || profile.role.charAt(0).toUpperCase() + profile.role.slice(1);
}

// Desktop: you, at the bottom of the sidebar, opening the account menu.
export function SidebarAccount({
  profile,
  collapsed,
}: {
  profile: Profile;
  collapsed: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className={cn(
            "flex items-center rounded-xl text-left transition-colors outline-none hover:bg-foreground/[0.04] focus-visible:ring-2 focus-visible:ring-ring/50 data-[state=open]:bg-foreground/[0.06]",
            collapsed
              ? "size-10 justify-center self-center"
              : "w-full gap-2.5 p-2 ring-1 ring-inset ring-foreground/[0.08]",
          )}
        >
          <MemberAvatar
            userId={profile.id}
            name={profile.full_name}
            avatar={profile.avatar}
            size="md"
          />
          {!collapsed && (
            <>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm leading-tight font-medium">
                  {profile.full_name}
                </span>
                <span className="truncate text-xs leading-tight text-muted-foreground">
                  {roleLabel(profile)}
                </span>
              </span>
              <ChevronsUpDown aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuLabel>
          <p className="font-medium">{profile.full_name}</p>
          <p className="text-xs font-normal text-muted-foreground capitalize">
            {profile.role}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild variant="destructive">
          <SignOutForm className="w-full">
            <button type="submit" className="flex w-full items-center gap-1.5">
              <LogOut />
              Sign out
            </button>
          </SignOutForm>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
