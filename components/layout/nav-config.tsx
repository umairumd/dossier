import { Home } from "lucide-react";
import type { ReactNode } from "react";
import type { UserRole } from "@/types/profile";

export interface NavItem {
  label: string;
  href: string;
  // A pre-rendered element, not a component reference: NavItem[] crosses
  // from server components (Sidebar, TopNav) into the client NavLinks
  // component as a prop, and a raw component/function isn't serializable
  // across that boundary — only an already-built element is.
  icon: ReactNode;
  roles: UserRole[];
}

// Intentionally minimal: only routes that exist today. Role-scoped
// dashboard/report/admin entries get added here once those milestones
// build the pages they'd point to — an empty nav is better than a link to
// nowhere.
export const navItems: NavItem[] = [
  {
    label: "Home",
    href: "/",
    icon: <Home className="size-4" />,
    roles: ["employee", "manager", "admin"],
  },
];
