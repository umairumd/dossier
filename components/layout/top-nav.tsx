"use client";

import { useState } from "react";
import Image from "next/image";
import { Menu, PanelLeft } from "lucide-react";
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
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
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
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-4">
      <div className="hidden md:flex min-w-0 flex-1 items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label="Toggle sidebar"
          onClick={() => window.dispatchEvent(new Event("sidebar-toggle"))}
        >
          <PanelLeft className="size-4" />
        </Button>
        <Breadcrumbs />
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
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
            <SheetTitle className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="Dossier"
                width={32}
                height={32}
                className="rounded-sm"
                style={{ width: 32, height: 32 }}
              />
              <span className="text-base font-semibold tracking-tight">
                Dossier
              </span>
            </SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4">
            <NavLinks
              sections={mainSections}
              onNavigate={() => setOpen(false)}
            />
          </div>
          <div className="flex flex-col gap-1 border-t border-border p-4">
            <NavLinks
              sections={accountSections}
              onNavigate={() => setOpen(false)}
            />

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

      <div className="flex items-center gap-2 md:hidden">
        <Image
          src="/logo.png"
          alt="Dossier"
          width={28}
          height={28}
          className="rounded-sm"
          style={{ width: 28, height: 28 }}
        />
        <span className="text-sm font-semibold tracking-tight">Dossier</span>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <AccentPicker />
        <ThemeToggle />
        <UserMenu profile={profile} />
      </div>
    </header>
  );
}
