import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";

export default async function EmployeesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The list page and the admin profile branch re-check for owner/admin.
  const profile = await getCurrentProfile();

  const canViewProfiles =
    profile?.role === "owner" ||
    profile?.role === "admin" ||
    profile?.role === "manager" ||
    profile?.is_supervisor;

  if (!canViewProfiles) {
    redirect("/");
  }

  return <>{children}</>;
}
