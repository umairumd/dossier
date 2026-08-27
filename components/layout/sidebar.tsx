import { NavLinks } from "@/components/layout/nav-links";
import type { NavSection } from "@/components/layout/nav-config";

export function Sidebar({ sections }: { sections: NavSection[] }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border p-4 md:flex">
      <span className="px-2.5 text-sm font-semibold tracking-tight">
        Dossier
      </span>
      <NavLinks sections={sections} />
    </aside>
  );
}
