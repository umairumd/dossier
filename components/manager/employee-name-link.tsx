import Link from "next/link";

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
