import {
  Activity,
  BarChart3,
  Building2,
  FileText,
  Home,
  History,
  Mail,
  Settings,
  UserX,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import type { UserRole } from "@/types/profile";

const ALL_ROLES: UserRole[] = ["owner", "admin", "manager", "member"];

export interface NavItem {
  label: string;
  href: string;
  // A pre-rendered element, not a component reference: NavItem[] crosses
  // from server components (Sidebar, TopNav) into the client NavLinks
  // component as a prop, and a raw component/function isn't serializable
  // across that boundary — only an already-built element is.
  icon: ReactNode;
  roles: UserRole[];
  // When true, AppShell also requires profile.is_supervisor.
  requiresSupervisor?: boolean;
}

export interface NavSection {
  // Empty title = no header rendered (used for the always-visible Home
  // item, which doesn't belong under any capability grouping).
  title: string;
  items: NavItem[];
}

// Navigation is organized by BUSINESS CAPABILITY (My Work, My Team,
// Organization, Account), not by role. Every item still declares which
// roles see it — AppShell filters items per role (and supervisor flag)
// and drops any section that ends up empty.
export const navSections: NavSection[] = [
  {
    title: "",
    items: [
      {
        label: "Home",
        href: "/",
        icon: <Home className="size-4" />,
        roles: ALL_ROLES,
      },
    ],
  },
  {
    title: "My Work",
    items: [
      {
        label: "Daily Report",
        href: "/reports",
        icon: <FileText className="size-4" />,
        roles: ALL_ROLES,
      },
      {
        label: "Report History",
        href: "/reports/history",
        icon: <History className="size-4" />,
        roles: ALL_ROLES,
      },
    ],
  },
  {
    title: "My Team",
    items: [
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
        label: "Team Members",
        href: "/manager/team",
        icon: <Users className="size-4" />,
        roles: ["manager"],
      },
      {
        label: "My Reports (supervised)",
        href: "/supervisor/team",
        icon: <FileText className="size-4" />,
        roles: ALL_ROLES,
        requiresSupervisor: true,
      },
    ],
  },
  {
    title: "Organization",
    items: [
      {
        label: "Reports",
        href: "/admin/org-reports",
        icon: <FileText className="size-4" />,
        roles: ["owner", "admin"],
      },
      {
        label: "Missing Reports",
        href: "/admin/org-missing",
        icon: <UserX className="size-4" />,
        roles: ["owner", "admin"],
      },
      {
        label: "Analytics",
        href: "/admin/analytics",
        icon: <BarChart3 className="size-4" />,
        roles: ["owner", "admin"],
      },
      {
        label: "Employees",
        href: "/admin/employees",
        icon: <Users className="size-4" />,
        roles: ["owner", "admin"],
      },
      {
        label: "Departments",
        href: "/admin/departments",
        icon: <Building2 className="size-4" />,
        roles: ["owner", "admin"],
      },
      {
        label: "Invitations",
        href: "/admin/invitations",
        icon: <Mail className="size-4" />,
        roles: ["owner", "admin"],
      },
      {
        label: "Activity",
        href: "/admin/activity",
        icon: <Activity className="size-4" />,
        roles: ["owner", "admin"],
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        label: "Settings",
        href: "/settings",
        icon: <Settings className="size-4" />,
        roles: ALL_ROLES,
      },
      {
        label: "Organization",
        href: "/admin/settings",
        icon: <Settings className="size-4" />,
        roles: ["owner"],
      },
    ],
  },
];
