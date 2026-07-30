"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavSection } from "@/components/layout/nav-config";

export function NavLinks({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-4">
      {sections.map((section) => (
        <div key={section.title || "root"} className="flex flex-col gap-0.5">
          {section.title && (
            <span className="px-2.5 pb-1 text-xs font-medium text-muted-foreground">
              {section.title}
            </span>
          )}
          {section.items.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  isActive && "bg-muted text-foreground",
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
