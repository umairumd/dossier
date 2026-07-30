import { navItems } from "@/components/layout/nav-config";
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
  const items = navItems.filter((item) => item.roles.includes(profile.role));

  return (
    <div className="flex min-h-svh">
      <Sidebar items={items} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav items={items} profile={profile} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
