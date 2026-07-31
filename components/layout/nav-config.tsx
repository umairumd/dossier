import {
  Activity,
  BarChart3,
  Building2,
  FileText,
  Home,
  History,
  KeyRound,
  Mail,
  Settings,
  User,
  UserX,
  Users,
} from "lucide-react";
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

export interface NavSection {
  // Empty title = no header rendered (used for the always-visible Home
  // item, which doesn't belong under any capability grouping).
  title: string;
  items: NavItem[];
}

// Navigation is organized by BUSINESS CAPABILITY (Reports, People,
// Organization, Settings), not by role. Every item still declares which
// roles see it — AppShell filters items per role and drops any section
// that ends up empty — but the section names themselves never mention
// Admin/Manager/Employee. This is deliberate: a capability nav scales to
// a future role without inventing a new nav section, since it's the
// *contents* of "People" or "Reports" that change per role, not the
// taxonomy itself.
export const navSections: NavSection[] = [
  {
    title: "",
    items: [
      {
        label: "Home",
        href: "/",
        icon: <Home className="size-4" />,
        roles: ["employee", "manager", "admin"],
      },
    ],
  },
  {
    title: "Reports",
    items: [
      {
        label: "Daily Report",
        href: "/reports",
        icon: <FileText className="size-4" />,
        roles: ["employee"],
      },
      {
        label: "Report History",
        href: "/reports/history",
        icon: <History className="size-4" />,
        roles: ["employee"],
      },
      {
        label: "Team Reports",
        href: "/manager/team-reports",
        icon: <FileText className="size-4" />,
        roles: ["manager"],
      },
      {
        label: "Missing Reports",
        href: "/manager/missing-reports",
        icon: <UserX className="size-4" />,
        roles: ["manager"],
      },
      {
        label: "Analytics",
        href: "/admin/analytics",
        icon: <BarChart3 className="size-4" />,
        roles: ["admin"],
      },
    ],
  },
  {
    title: "People",
    items: [
      {
        label: "Team Members",
        href: "/manager/team",
        icon: <Users className="size-4" />,
        roles: ["manager"],
      },
      {
        label: "Employees",
        href: "/admin/employees",
        icon: <Users className="size-4" />,
        roles: ["admin"],
      },
      {
        label: "Departments",
        href: "/admin/departments",
        icon: <Building2 className="size-4" />,
        roles: ["admin"],
      },
    ],
  },
  {
    title: "Organization",
    items: [
      {
        label: "Invitations",
        href: "/admin/invitations",
        icon: <Mail className="size-4" />,
        roles: ["admin"],
      },
      {
        label: "Activity",
        href: "/admin/activity",
        icon: <Activity className="size-4" />,
        roles: ["admin"],
      },
      {
        label: "Settings",
        href: "/admin/settings",
        icon: <Settings className="size-4" />,
        roles: ["admin"],
      },
    ],
  },
  {
    title: "Settings",
    items: [
      {
        label: "Profile",
        href: "/settings/profile",
        icon: <User className="size-4" />,
        roles: ["employee", "manager", "admin"],
      },
      {
        label: "Account",
        href: "/settings/account",
        icon: <KeyRound className="size-4" />,
        roles: ["employee", "manager", "admin"],
      },
    ],
  },
];
