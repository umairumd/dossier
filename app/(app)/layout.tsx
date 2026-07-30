import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile) {
    // Not "/login" — the user has a valid session (the proxy already
    // guarantees that for any route reaching this layout); redirecting to
    // /login would immediately bounce back to "/" and loop forever. A
    // signed-in user with no profile is a distinct state that needs its
    // own page, not a login prompt they've already passed.
    redirect("/no-profile");
  }

  if (!profile.is_active) {
    redirect("/deactivated");
  }

  return <AppShell profile={profile}>{children}</AppShell>;
}
