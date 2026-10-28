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
    <nav className={cn("flex flex-col", collapsed && "items-center")}>
      {sections.map((section, index) => (
        <div
          key={section.title || `section-${index}`}
          className={cn(
            "flex flex-col gap-0.5",
            collapsed && "items-center",
            index > 0 && (collapsed ? "mt-4" : "mt-5"),
          )}
        >
          {section.title && !collapsed && (
            <span className="label-eyebrow px-2.5 pb-1.5">{section.title}</span>
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
                aria-current={isActive ? "page" : undefined}
                onClick={() => onNavigate?.()}
                className={cn(
                  "group relative flex items-center rounded-lg text-sm outline-none transition-[background-color,color,transform] duration-150 focus-visible:ring-2 focus-visible:ring-ring/50",
                  collapsed
                    ? "size-9 justify-center"
                    : "h-9 gap-2.5 px-2.5 hover:translate-x-0.5 motion-reduce:hover:translate-x-0",
                  isActive
                    ? "bg-fill-active font-medium text-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_6%,transparent)]"
                    : "text-foreground/70 hover:bg-fill-hover hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex shrink-0 transition-colors",
                    isActive
                      ? "text-foreground"
                      : "text-foreground/55 group-hover:text-foreground",
                  )}
                >
                  {item.icon}
                </span>
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && item.tag ? (
                  <span className="ml-auto rounded-md bg-fill-active px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">
                    {item.tag}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
