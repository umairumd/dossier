import Link from "next/link";
import { Plus } from "lucide-react";
import { getOrgTemplates } from "@/lib/supabase/queries/templates";
import { TemplateActionsMenu } from "@/components/admin/template-actions-menu";
import {
  DataList,
  DataListRow,
  DataListSection,
} from "@/components/shared/data-list";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ReportTemplate } from "@/types/template";

const COLUMNS = "minmax(0,1fr) 7rem 2rem";

function questionsLabel(count: number): string {
  return `${count} question${count === 1 ? "" : "s"}`;
}

function TemplateRow({
  template,
  archived = false,
}: {
  template: ReportTemplate;
  archived?: boolean;
}) {
  const count = template.fieldCount ?? 0;
  return (
    <DataListRow
      href={archived ? undefined : `/organization/templates/${template.id}`}
      label={archived ? undefined : `Edit ${template.name}`}
    >
      <span className="flex min-w-0 flex-col">
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            className={
              archived
                ? "truncate text-sm font-medium text-muted-foreground"
                : "truncate text-sm font-medium"
            }
          >
            {template.name}
          </span>
          {template.isDefault && <Badge variant="neutral">Default</Badge>}
        </span>
        <span className="truncate text-[13px] text-muted-foreground">
          <span className="md:hidden">
            {questionsLabel(count)}
            {template.description ? " · " : ""}
          </span>
          {template.description}
        </span>
      </span>
      <span className="hidden text-[13px] tabular-nums text-muted-foreground md:block">
        {questionsLabel(count)}
      </span>
      <span className="relative z-10 flex justify-end">
        <TemplateActionsMenu template={template} archived={archived} />
      </span>
    </DataListRow>
  );
}

export default async function TemplatesPage() {
  const templates = await getOrgTemplates();
  const activeTemplates = templates.filter((template) => !template.archivedAt);
  const archivedTemplates = templates.filter((template) => template.archivedAt);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Report templates"
        description="The questions people answer in their daily report. Each department uses one template."
        action={
          <Button asChild>
            <Link href="/organization/templates/new">
              <Plus className="size-4" />
              New template
            </Link>
          </Button>
        }
      />

      {templates.length === 0 ? (
        <EmptyState title="No templates yet." />
      ) : (
        <DataList columns={COLUMNS} header={["Template", "Questions", ""]}>
          {activeTemplates.map((template) => (
            <TemplateRow key={template.id} template={template} />
          ))}
          {archivedTemplates.length > 0 && (
            <>
              <DataListSection
                title="Archived"
                aside={archivedTemplates.length}
              />
              {archivedTemplates.map((template) => (
                <TemplateRow key={template.id} template={template} archived />
              ))}
            </>
          )}
        </DataList>
      )}
    </div>
  );
}
