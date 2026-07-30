import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // UI-level gating only — the real security boundary is RLS: every query
  // under /manager reads through the regular client, so a non-manager
  // hitting these routes directly still can't see another department's
  // data (see lib/supabase/queries/manager/*).
  const profile = await getCurrentProfile();

  if (profile?.role !== "manager") {
    redirect("/");
  }

  return <>{children}</>;
}
