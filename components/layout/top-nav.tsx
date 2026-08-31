import { Menu } from "lucide-react";
import { AccentPicker } from "@/components/accent-picker";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NavLinks } from "@/components/layout/nav-links";
import { UserMenu } from "@/components/layout/user-menu";
import type { NavSection } from "@/components/layout/nav-config";
import type { Profile } from "@/types/profile";

export function TopNav({
  mainSections,
  accountSections,
  orgName,
  profile,
}: {
  mainSections: NavSection[];
  accountSections: NavSection[];
  orgName?: string;
  profile: Profile;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Open navigation"
          >
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex w-64 flex-col">
          <SheetHeader>
            <SheetTitle>Dossier</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4">
            <NavLinks sections={mainSections} />
          </div>
          <div className="flex flex-col gap-1 border-t border-border p-4">
            <NavLinks sections={accountSections} />

            {orgName && (
              <div className="mt-2 flex items-center gap-1.5 px-2.5">
                <span className="truncate text-xs text-muted-foreground/50">
                  {orgName}
                </span>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <span className="text-sm font-semibold tracking-tight md:hidden">
        Dossier
      </span>

      <div className="ml-auto flex items-center gap-1">
        <AccentPicker />
        <ThemeToggle />
        <UserMenu profile={profile} />
      </div>
    </header>
  );
}
