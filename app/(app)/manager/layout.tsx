import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // UI-level gating only — RLS still scopes department vs supervisee data.
  // Supervisors (any role) may use /manager team pages; verify from the
  // profiles query, not from client-side or cookie-only role claims.
  const profile = await getCurrentProfile();

  const canAccessTeamPages =
    profile?.role === "owner" ||
    profile?.role === "admin" ||
    profile?.role === "manager" ||
    profile?.is_supervisor;

  if (!canAccessTeamPages) {
    redirect("/");
  }

  return <>{children}</>;
}
