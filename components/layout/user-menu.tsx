import { LogOut } from "lucide-react";
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
