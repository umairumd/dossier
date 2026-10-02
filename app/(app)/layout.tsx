import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { updateLastSeen } from "@/lib/actions/profile";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";

const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000;

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

  if (!profile.has_onboarded) {
    redirect("/onboarding");
  }

  const lastSeenMs = profile.last_seen_at
    ? new Date(profile.last_seen_at).getTime()
    : 0;
  if (!lastSeenMs || Date.now() - lastSeenMs > LAST_SEEN_THROTTLE_MS) {
    void updateLastSeen(profile.id);
  }

  return <AppShell profile={profile}>{children}</AppShell>;
}
