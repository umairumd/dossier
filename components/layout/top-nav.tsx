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
  sections,
  profile,
}: {
  sections: NavSection[];
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
        <SheetContent side="left" className="w-64">
          <SheetHeader>
            <SheetTitle>Dossier</SheetTitle>
          </SheetHeader>
          <div className="px-4">
            <NavLinks sections={sections} />
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
