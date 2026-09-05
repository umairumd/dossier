import { notFound } from "next/navigation";
import { getTemplateWithFields } from "@/lib/supabase/queries/templates";
import { TemplateEditor } from "@/components/admin/template-editor";
import { BreadcrumbLabel } from "@/components/layout/breadcrumb-label";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await getTemplateWithFields(id);

  if (!template || template.archivedAt) {
    notFound();
  }

  return (
    <>
      <BreadcrumbLabel label={template.name} />
      <TemplateEditor template={template} />
    </>
  );
}
