"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavSection } from "@/components/layout/nav-config";

export function NavLinks({
  sections,
  onNavigate,
  collapsed = false,
}: {
  sections: NavSection[];
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col", collapsed ? "items-center gap-4" : "gap-4")}>
      {sections.map((section) => (
        <div
          key={section.title || "root"}
          className={cn(
            "flex flex-col gap-0.5",
            collapsed && "items-center",
          )}
        >
          {section.title && !collapsed && (
            <span className="px-2.5 pb-1 text-xs font-medium text-muted-foreground">
              {section.title}
            </span>
          )}
          {section.items.map((item) => {
            const isActive =
              item.href === "/" || item.href === "/reports"
                ? pathname === item.href
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                aria-label={collapsed ? item.label : undefined}
                onClick={() => onNavigate?.()}
                className={cn(
                  "flex items-center font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground",
                  collapsed
                    ? "h-9 w-9 justify-center rounded-md"
                    : "gap-2 rounded-md px-2.5 py-1.5 text-sm",
                  isActive && "bg-muted text-foreground",
                )}
              >
                {item.icon}
                {!collapsed && item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
