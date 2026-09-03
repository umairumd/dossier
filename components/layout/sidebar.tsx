"use client";

import { useEffect, useSyncExternalStore } from "react";
import Image from "next/image";
import { NavLinks } from "@/components/layout/nav-links";
import type { NavSection } from "@/components/layout/nav-config";
import { cn } from "@/lib/utils";

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";
const SIDEBAR_COLLAPSED_EVENT = "sidebar-collapsed-change";
const SIDEBAR_TOGGLE_EVENT = "sidebar-toggle";

function subscribeToCollapsed(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(SIDEBAR_COLLAPSED_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(SIDEBAR_COLLAPSED_EVENT, onStoreChange);
  };
}

function getCollapsedSnapshot() {
  return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
}

function getCollapsedServerSnapshot() {
  return false;
}

export function Sidebar({
  mainSections,
  accountSections,
  orgName,
}: {
  mainSections: NavSection[];
  accountSections: NavSection[];
  orgName?: string;
}) {
  const collapsed = useSyncExternalStore(
    subscribeToCollapsed,
    getCollapsedSnapshot,
    getCollapsedServerSnapshot,
  );

  useEffect(() => {
    const handler = () => {
      const next = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) !== "true";
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      window.dispatchEvent(new Event(SIDEBAR_COLLAPSED_EVENT));
    };

    window.addEventListener(SIDEBAR_TOGGLE_EVENT, handler);
    return () => window.removeEventListener(SIDEBAR_TOGGLE_EVENT, handler);
  }, []);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border transition-all duration-200 md:flex",
        collapsed ? "w-12" : "w-56",
      )}
    >
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden",
          collapsed ? "items-center px-1.5 py-4" : "p-4",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2",
            collapsed ? "justify-center" : "px-2.5",
          )}
        >
          <Image
            src="/logo.png"
            alt="Dossier"
            width={32}
            height={32}
            className="rounded-sm"
          />
          {!collapsed && (
            <span className="text-base font-semibold tracking-tight">
              Dossier
            </span>
          )}
        </div>
        <NavLinks sections={mainSections} collapsed={collapsed} />
      </div>

      <div
        className={cn(
          "flex flex-col gap-1 border-t border-border",
          collapsed ? "items-center px-1.5 py-4" : "p-4",
        )}
      >
        <NavLinks sections={accountSections} collapsed={collapsed} />

        {orgName && !collapsed && (
          <div className="mt-2 flex items-center gap-1.5 px-2.5">
            <span className="truncate text-xs text-muted-foreground/50">
              {orgName}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
