import { Home, type LucideIcon } from "lucide-react";
import type { UserRole } from "@/types/profile";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
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
    icon: Home,
    roles: ["employee", "manager", "admin"],
  },
];
