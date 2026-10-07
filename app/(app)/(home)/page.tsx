import { getCurrentProfileWithDepartment } from "@/lib/supabase/queries/profile";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { EmployeeDashboard } from "@/components/dashboard/employee-dashboard";
import { ManagerDashboard } from "@/components/dashboard/manager-dashboard";
import { parseHeroPanel } from "@/components/dashboard/hero-controller";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ hero?: string }>;
}) {
  const { hero } = await searchParams;
  const initialPanel = parseHeroPanel(hero);
  const profile = await getCurrentProfileWithDepartment();

  if (!profile) {
    // (app)/layout.tsx already redirects to /no-profile before this ever
    // renders — this is just a type-safety fallback, not a reachable path.
    return null;
  }

  if (profile.role === "manager") {
    return <ManagerDashboard profile={profile} initialPanel={initialPanel} />;
  }

  if (profile.role === "owner" || profile.role === "admin") {
    return <AdminDashboard initialPanel={initialPanel} />;
  }

  return <EmployeeDashboard profile={profile} initialPanel={initialPanel} />;
}
