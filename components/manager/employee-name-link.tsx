"use client";

import Link from "next/link";

// This file needs "use client": it attaches an onClick handler
// (stopPropagation), and a component defined without the directive is
// always a Server Component regardless of what renders it — Server
// Components can't pass event handlers as props, since functions aren't
// serializable across that boundary except as "use server" actions. This
// was the exact cause of "Event handlers cannot be passed to Client
// Component props" on every page that rendered this component
// (Team Members, Team Reports, and Manager Home via TeamHighlights).
//
// Shared by the dashboard's team list and the Team Reports page: the
// employee name links to their Overview page while the surrounding row
// still has its own click handler (expand / open report detail) —
// stopPropagation keeps the two from firing together.
export function EmployeeNameLink({
  employeeId,
  fullName,
  className,
}: {
  employeeId: string;
  fullName: string;
  className?: string;
}) {
  return (
    <Link
      href={`/manager/employees/${employeeId}`}
      onClick={(event) => event.stopPropagation()}
      className={className ?? "hover:underline"}
    >
      {fullName}
    </Link>
  );
}
