import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArchiveTemplateButton,
  DeleteTemplateButton,
  RestoreTemplateButton,
} from "@/components/admin/template-archive-button";
import type { ReportTemplate } from "@/types/template";

export function TemplateListItem({
  template,
  fieldCount,
  archived = false,
}: {
  template: ReportTemplate;
  fieldCount?: number;
  archived?: boolean;
}) {
  const count = fieldCount ?? template.fieldCount ?? 0;

  return (
    <Card className="card-gradient">
      <CardContent className="flex items-center justify-between gap-4 py-4">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{template.name}</span>
            {template.isDefault && (
              <Badge variant="secondary" className="text-xs">
                Default
              </Badge>
            )}
            {archived && (
              <Badge variant="outline" className="text-xs">
                Archived
              </Badge>
            )}
          </div>
          {template.description && (
            <p className="truncate text-xs text-muted-foreground">
              {template.description}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {count} field{count !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!archived && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/organization/templates/${template.id}`}>Edit</Link>
            </Button>
          )}
          {!template.isDefault && !archived && (
            <>
              <ArchiveTemplateButton templateId={template.id} />
              <DeleteTemplateButton templateId={template.id} />
            </>
          )}
          {archived && (
            <>
              <RestoreTemplateButton templateId={template.id} />
              <DeleteTemplateButton templateId={template.id} />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
