import { navSections } from "@/components/layout/nav-config";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
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
            profile.role === "manager" || profile.is_supervisor;
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
  const orgName = await getOrganizationName();

  return (
    <div className="flex min-h-svh">
      <Sidebar
        mainSections={mainSections}
        accountSections={accountSections}
        orgName={orgName ?? undefined}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav
          mainSections={mainSections}
          accountSections={accountSections}
          orgName={orgName ?? undefined}
          profile={profile}
        />
        <main className="flex-1 p-6">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
