import { getCurrentProfileWithDepartment } from "@/lib/supabase/queries/profile";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  if (profile.role === "admin") {
    return (
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Welcome, {profile.full_name}</CardTitle>
          <CardDescription>
            The admin dashboard hasn&apos;t been built yet.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return <EmployeeDashboard profile={profile} />;
}
