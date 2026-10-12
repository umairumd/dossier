import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { updateLastSeen } from "@/lib/actions/profile";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { getOrganizationName } from "@/lib/supabase/queries/organization";
import {
  getMyNotifications,
  getUnreadNotificationCount,
} from "@/lib/supabase/queries/notifications";

const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000;

/** Last seen is written at most every five minutes. */
function lastSeenIsStale(lastSeenAt: string | null | undefined): boolean {
  if (!lastSeenAt) return true;
  return Date.now() - new Date(lastSeenAt).getTime() > LAST_SEEN_THROTTLE_MS;
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Start the shell's own reads now, alongside the profile, instead of after
  // it: they are cache()-wrapped, so AppShell picks up the same requests.
  void getOrganizationName();
  void getUnreadNotificationCount();
  void getMyNotifications();

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

  if (lastSeenIsStale(profile.last_seen_at)) {
    void updateLastSeen(profile.id);
  }

  return <AppShell profile={profile}>{children}</AppShell>;
}
