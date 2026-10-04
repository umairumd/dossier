import { getCurrentProfileWithDepartment } from "@/lib/supabase/queries/profile";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { EmployeeDashboard } from "@/components/dashboard/employee-dashboard";
import { ManagerDashboard } from "@/components/dashboard/manager-dashboard";

export default async function DashboardPage() {
  const profile = await getCurrentProfileWithDepartment();

  if (!profile) {
    // (app)/layout.tsx already redirects to /no-profile before this ever
    // renders — this is just a type-safety fallback, not a reachable path.
    return null;
  }

  if (profile.role === "manager") {
    return <ManagerDashboard profile={profile} />;
  }

  if (profile.role === "owner" || profile.role === "admin") {
    return <AdminDashboard />;
  }

  return <EmployeeDashboard profile={profile} />;
}
