import { NavLinks } from "@/components/layout/nav-links";
import type { NavSection } from "@/components/layout/nav-config";

export function Sidebar({
  mainSections,
  accountSections,
  orgName,
}: {
  mainSections: NavSection[];
  accountSections: NavSection[];
  orgName?: string;
}) {
  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-border md:flex">
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4">
        <span className="px-2.5 text-sm font-semibold tracking-tight">
          Dossier
        </span>
        <NavLinks sections={mainSections} />
      </div>

      <div className="flex flex-col gap-1 border-t border-border p-4">
        <NavLinks sections={accountSections} />

        {orgName && (
          <div className="mt-2 flex items-center gap-1.5 px-2.5">
            <span className="truncate text-xs text-muted-foreground/50">
              {orgName}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
