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
    <nav
      className={cn(
        "flex flex-col",
        collapsed ? "items-center gap-6" : "gap-6",
      )}
    >
      {sections.map((section) => (
        <div
          key={section.title || "root"}
          className={cn(
            "flex flex-col gap-0.5",
            collapsed && "items-center",
          )}
        >
          {section.title && !collapsed && (
            <span className="label-eyebrow px-2.5 pb-1 pt-1">
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
                  "group flex items-center font-medium text-muted-foreground transition-all duration-150 hover:translate-x-0.5 hover:bg-muted hover:text-foreground",
                  collapsed
                    ? "h-9 w-9 justify-center rounded-md"
                    : "gap-2 rounded-md px-2.5 py-1.5 text-sm",
                  isActive && "bg-primary/10 text-foreground",
                )}
              >
                <span
                  className={cn(
                    "transition-colors",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  {item.icon}
                </span>
                {!collapsed && item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
