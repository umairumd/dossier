import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // UI-level gating only — the real security boundary is RLS plus
  // requireAdminUser() inside every admin query/action, since this check
  // alone can't stop a direct API call from a non-admin session.
  const profile = await getCurrentProfile();

  if (!["owner", "admin"].includes(profile?.role ?? "")) {
    redirect("/");
  }

  return <>{children}</>;
}
