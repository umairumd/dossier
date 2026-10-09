"use client";

import { useEffect, useSyncExternalStore } from "react";
import Image from "next/image";
import { NavLinks } from "@/components/layout/nav-links";
import { SidebarAccount } from "@/components/layout/user-menu";
import type { NavSection } from "@/components/layout/nav-config";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/profile";

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
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

function getCollapsedServerSnapshot() {
  return false;
}

// Desktop sidebar. It has no surface of its own: it sits on the app frame
// (bg-shell) next to the raised page panel. The collapse button lives in the
// top bar (TopNav), which dispatches SIDEBAR_TOGGLE_EVENT.
export function Sidebar({
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
  const collapsed = useSyncExternalStore(
    subscribeToCollapsed,
    getCollapsedSnapshot,
    getCollapsedServerSnapshot,
  );

  useEffect(() => {
    const handler = () => {
      try {
        const next = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) !== "true";
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // Storage unavailable: the sidebar simply stays as it is.
      }
      window.dispatchEvent(new Event(SIDEBAR_COLLAPSED_EVENT));
    };

    window.addEventListener(SIDEBAR_TOGGLE_EVENT, handler);
    return () => window.removeEventListener(SIDEBAR_TOGGLE_EVENT, handler);
  }, []);

  return (
    <aside
      className={cn(
        "hidden h-svh shrink-0 flex-col py-2 transition-[width] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none md:flex",
        collapsed ? "w-[60px] px-2" : "w-60 px-2.5",
      )}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center gap-2.5",
          collapsed ? "justify-center" : "px-1.5",
        )}
      >
        <Image
          src="/logo.png"
          alt="Dossier"
          width={28}
          height={28}
          className="shrink-0 rounded-md"
          style={{ width: 28, height: 28 }}
        />
        {!collapsed && (
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm leading-tight font-semibold">
              {orgName ?? "Dossier"}
            </span>
            {orgName && (
              <span className="text-xs leading-tight text-muted-foreground">
                Dossier
              </span>
            )}
          </div>
        )}
      </div>

      <div className="-mx-1.5 flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-1.5 pt-3">
        <NavLinks sections={mainSections} collapsed={collapsed} />
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t border-line pt-3">
        <NavLinks sections={accountSections} collapsed={collapsed} />
        <SidebarAccount profile={profile} collapsed={collapsed} />
      </div>
    </aside>
  );
}
