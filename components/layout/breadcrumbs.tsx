"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const ROUTE_LABELS: Record<string, string> = {
  employees: "Employees",
  departments: "Departments",
  invitations: "Invitations",
  activity: "Activity",
  organization: "Organization",
  templates: "Templates",
  reports: "My Reports",
  settings: "Settings",
  "track-reports": "Track Reports",
  "team-reports": "Team Reports",
  team: "Team Members",
  "missing-reports": "Missing Reports",
  new: "New",
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function labelForDynamicSegment(parent: string | undefined): string | null {
  if (parent === "employees") {
    return "Employee";
  }
  if (parent === "departments") {
    return "Department";
  }
  if (parent === "templates") {
    return "Edit";
  }
  return null;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);

  const crumbs: { href: string; label: string }[] = [
    { href: "/", label: "Home" },
  ];

  let href = "";
  let previousPart: string | undefined;

  for (const part of parts) {
    href += `/${part}`;

    if (ROUTE_LABELS[part]) {
      crumbs.push({ href, label: ROUTE_LABELS[part] });
      previousPart = part;
      continue;
    }

    if (UUID_PATTERN.test(part)) {
      const label = labelForDynamicSegment(previousPart);
      if (label) {
        crumbs.push({ href, label });
      }
      previousPart = part;
      continue;
    }

    previousPart = part;
  }

  return (
    <nav className="ml-4 hidden items-center gap-1.5 text-sm text-muted-foreground md:flex">
      {crumbs.map((segment, index) => (
        <Fragment key={`${segment.href}-${index}`}>
          {index > 0 && (
            <ChevronRight className="size-3.5 text-muted-foreground/50" />
          )}
          {index === crumbs.length - 1 ? (
            <span className="font-medium text-foreground">{segment.label}</span>
          ) : (
            <Link
              href={segment.href}
              className="transition-colors hover:text-foreground"
            >
              {segment.label}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
