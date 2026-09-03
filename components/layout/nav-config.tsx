import {
  Building2,
  FileText,
  Home,
  LayoutList,
  Mail,
  Settings,
  Users,
  Zap,
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
  // When true, AppShell requires manager role or is_supervisor.
  requiresTeam?: boolean;
}

export interface NavSection {
  // Empty title = no header rendered (used for the always-visible Home
  // item, which doesn't belong under any capability grouping).
  title: string;
  items: NavItem[];
  // Footer cluster (Settings / Organization). Title is empty so NavLinks
  // does not render an "Account" heading; AppShell pins this block to the
  // bottom of the sidebar / mobile sheet.
  pinToBottom?: boolean;
}

// Navigation is organized by BUSINESS CAPABILITY (My Work, My Team,
// Monitor, Manage, Account), not by role. Every item still declares which
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
        label: "My Reports",
        href: "/reports",
        icon: <FileText className="size-4" />,
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
        roles: ALL_ROLES,
        requiresTeam: true,
      },
      {
        label: "Team Members",
        href: "/manager/team",
        icon: <Users className="size-4" />,
        roles: ALL_ROLES,
        requiresTeam: true,
      },
    ],
  },
  {
    title: "Monitor",
    items: [
      {
        label: "Track Reports",
        href: "/track-reports",
        icon: <LayoutList className="size-4" />,
        roles: ["owner", "admin"],
      },
    ],
  },
  {
    title: "Manage",
    items: [
      {
        label: "Departments",
        href: "/departments",
        icon: <Building2 className="size-4" />,
        roles: ["owner", "admin"],
      },
      {
        label: "Employees",
        href: "/employees",
        icon: <Users className="size-4" />,
        roles: ["owner", "admin"],
      },
      {
        label: "Invitations",
        href: "/invitations",
        icon: <Mail className="size-4" />,
        roles: ["owner", "admin"],
      },
      {
        label: "Activity",
        href: "/activity",
        icon: <Zap className="size-4" />,
        roles: ["owner", "admin"],
      },
    ],
  },
  {
    title: "",
    pinToBottom: true,
    items: [
      {
        label: "Settings",
        href: "/settings",
        icon: <Settings className="size-4" />,
        roles: ALL_ROLES,
      },
      {
        label: "Organization",
        href: "/organization",
        icon: <Building2 className="size-4" />,
        roles: ["owner"],
      },
    ],
  },
];
