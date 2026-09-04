import { notFound } from "next/navigation";
import { getTemplateWithFields } from "@/lib/supabase/queries/templates";
import { TemplateEditor } from "@/components/admin/template-editor";

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

  return <TemplateEditor template={template} />;
}
