import { navSections } from "@/components/layout/nav-config";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import type { Profile } from "@/types/profile";

export function AppShell({
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
      items: section.items.filter((item) => item.roles.includes(profile.role)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="flex min-h-svh">
      <Sidebar sections={sections} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav sections={sections} profile={profile} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
