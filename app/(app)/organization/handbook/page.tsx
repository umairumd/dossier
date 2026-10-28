import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { HandbookKindTag } from "@/components/handbook/kind-tag";
import { HandbookLaunchBanner } from "@/components/handbook/launch-banner";
import {
  DataList,
  DataListChevron,
  DataListRow,
  DataListSection,
} from "@/components/shared/data-list";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { countHandbookLaunchAudience } from "@/lib/actions/admin/handbook";
import { summariseAudience } from "@/lib/handbook/audience";
import { docStatus, formatShortDate } from "@/lib/handbook/format";
import { computeReadProgress } from "@/lib/handbook/progress";
import {
  getHandbookAcks,
  getHandbookDepartments,
  getHandbookPeoplePool,
  getOrgHandbookDocs,
} from "@/lib/supabase/queries/admin/handbook";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import type { HandbookDoc } from "@/types/handbook";

const COLUMNS = "minmax(0,1fr) 8rem 11rem 6rem 5rem 2rem";

export default async function HandbookAdminPage() {
  const [docs, people, acks, departments, settings, launchAudience] = await Promise.all([
    getOrgHandbookDocs(),
    getHandbookPeoplePool(),
    getHandbookAcks(),
    getHandbookDepartments(),
    getOrganizationSettings(),
    countHandbookLaunchAudience(),
  ]);

  const lookups = {
    departmentNames: new Map(departments.map((department) => [department.id, department.name])),
    personNames: new Map(people.map((person) => [person.id, person.full_name])),
  };
  const active = docs.filter((doc) => !doc.archivedAt);
  const archived = docs.filter((doc) => doc.archivedAt);
  const published = active.filter((doc) => doc.version > 0).length;

  const row = (doc: HandbookDoc) => {
    const status = docStatus(doc);
    const progress =
      doc.requiresAck && doc.version > 0 && !doc.archivedAt
        ? computeReadProgress(doc, people, acks)
        : null;
    const audience = summariseAudience(doc, lookups);
    return (
      <DataListRow
        key={doc.id}
        href={doc.archivedAt ? undefined : `/organization/handbook/${doc.id}`}
        label={doc.archivedAt ? undefined : `Edit ${doc.title}`}
      >
        <span className="flex min-w-0 flex-col">
          <span className="flex min-w-0 items-center gap-2">
            <HandbookKindTag kind={doc.kind} />
            <span
              className={
                doc.archivedAt
                  ? "truncate text-sm font-medium text-muted-foreground"
                  : "truncate text-sm font-medium"
              }
            >
              {doc.title}
            </span>
          </span>
          <span className="truncate text-[13px] text-muted-foreground">
            <span className="md:hidden">{audience}</span>
            <span className="hidden md:inline">{doc.summary ?? "No summary"}</span>
          </span>
        </span>
        <span className="flex justify-end md:justify-start">
          <Badge variant={status.variant}>{status.label}</Badge>
        </span>
        <span className="hidden truncate text-[13px] text-muted-foreground md:block">
          {audience}
        </span>
        <span className="hidden text-[13px] tabular-nums text-muted-foreground md:block">
          {progress ? (
            <span className={progress.current === progress.total ? "text-ok" : undefined}>
              {progress.current} of {progress.total}
            </span>
          ) : (
            "—"
          )}
        </span>
        <span className="hidden text-[13px] tabular-nums text-muted-foreground md:block">
          {formatShortDate(doc.updatedAt, settings.timezone)}
        </span>
        <DataListChevron show={!doc.archivedAt} />
      </DataListRow>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Handbook"
        description={
          docs.length === 0
            ? "Policies, SOPs, job descriptions and guides people read in Dossier."
            : `${active.length} ${active.length === 1 ? "document" : "documents"} · ${published} published`
        }
        action={
          <Button asChild>
            <Link href="/organization/handbook/new">
              <Plus className="size-4" />
              New document
            </Link>
          </Button>
        }
      />

      <HandbookLaunchBanner
        launchedOn={
          settings.handbookLaunchedAt
            ? formatShortDate(settings.handbookLaunchedAt, settings.timezone)
            : null
        }
        notifyCount={launchAudience.count}
      />

      {docs.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="size-5" />}
          title="No handbook documents yet."
          description="Write a policy or a guide, choose who can see it, then publish."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/organization/handbook/new">New document</Link>
            </Button>
          }
        />
      ) : (
        <DataList
          columns={COLUMNS}
          header={["Document", "Status", "Who can see it", "Read", "Updated", ""]}
        >
          {active.map(row)}
          {archived.length > 0 && (
            <>
              <DataListSection title="Archived" aside={archived.length} />
              {archived.map(row)}
            </>
          )}
        </DataList>
      )}
    </div>
  );
}
