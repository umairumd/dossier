import Link from "next/link";
import { Plus } from "lucide-react";
import { getOrgTemplates } from "@/lib/supabase/queries/templates";
import { TemplateListItem } from "@/components/admin/template-list-item";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

export default async function TemplatesPage() {
  const templates = await getOrgTemplates();
  const activeTemplates = templates.filter((template) => !template.archivedAt);
  const archivedTemplates = templates.filter((template) => template.archivedAt);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Report Templates"
        action={
          <Button size="sm" asChild>
            <Link href="/organization/templates/new">
              <Plus className="mr-1.5 size-4" />
              New Template
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        {activeTemplates.map((template) => (
          <TemplateListItem
            key={template.id}
            template={template}
            fieldCount={template.fieldCount}
          />
        ))}
        {activeTemplates.length === 0 && (
          <EmptyState title="No templates yet." />
        )}
      </div>

      {archivedTemplates.length > 0 && (
        <div>
          <p className="mb-3 text-sm text-muted-foreground">
            Archived ({archivedTemplates.length})
          </p>
          <div className="flex flex-col gap-3 opacity-60">
            {archivedTemplates.map((template) => (
              <TemplateListItem
                key={template.id}
                template={template}
                fieldCount={template.fieldCount}
                archived
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
