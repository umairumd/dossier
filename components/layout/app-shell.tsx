import { navSections } from "@/components/layout/nav-config";
import { BuddyDialogProvider } from "@/components/layout/buddy-dialog";
import { SignedInBuddyProvider } from "@/components/layout/signed-in-buddy";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import {
  getMyNotifications,
  getUnreadNotificationCount,
} from "@/lib/supabase/queries/notifications";
import { getOrganizationName } from "@/lib/supabase/queries/organization";
import type { Profile } from "@/types/profile";

export async function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  // Filter items per role, then drop any section left with zero items —
  // this is what makes navigation capability-driven rather than
  // role-blocked: an Employee simply never sees a "People" or
  // "Organization" header, rather than seeing an "Admin" section they
  // can't use.
  const sections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!item.roles.includes(profile.role)) {
          return false;
        }
        if (item.requiresTeam) {
          const hasTeam =
            profile.role === "owner" ||
            profile.role === "admin" ||
            profile.role === "manager" ||
            profile.is_supervisor;
          if (!hasTeam) {
            return false;
          }
        }
        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);

  const mainSections = sections.filter((section) => !section.pinToBottom);
  const accountSections = sections.filter((section) => section.pinToBottom);
  const [orgName, unreadCount, notifications] = await Promise.all([
    getOrganizationName(),
    getUnreadNotificationCount(),
    getMyNotifications(),
  ]);

  return (
    // Desktop: the sidebar sits on the app frame and the page sits on a
    // raised, rounded panel that scrolls on its own. Phone: a plain page.
    <div className="flex min-h-svh bg-background md:h-svh md:overflow-hidden md:bg-shell">
      <Sidebar
        mainSections={mainSections}
        accountSections={accountSections}
        orgName={orgName ?? undefined}
        profile={profile}
      />
      <div className="flex min-w-0 flex-1 flex-col md:py-2 md:pr-2">
        <div
          data-app-panel
          className="flex min-h-0 flex-1 flex-col bg-background md:overflow-y-auto md:rounded-xl md:border md:border-foreground/10"
        >
        <TopNav
          mainSections={mainSections}
          accountSections={accountSections}
          orgName={orgName ?? undefined}
          profile={profile}
          notificationCount={unreadCount}
          notifications={notifications}
        />
        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto max-w-5xl">
            <SignedInBuddyProvider userId={profile.id} avatar={profile.avatar}>
              <BuddyDialogProvider>{children}</BuddyDialogProvider>
            </SignedInBuddyProvider>
          </div>
        </main>
        </div>
      </div>
    </div>
  );
}
