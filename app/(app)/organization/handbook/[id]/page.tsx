import { notFound } from "next/navigation";
import { HandbookEditor } from "@/components/admin/handbook-editor";
import { HandbookReadProgress } from "@/components/admin/handbook-read-progress";
import { BreadcrumbLabel } from "@/components/layout/breadcrumb-label";
import { UUID_PATTERN } from "@/lib/handbook/format";
import { computeReadProgress } from "@/lib/handbook/progress";
import { orgDayUtcBounds, todayInTimezone } from "@/lib/helpers/dates";
import {
  getHandbookAcks,
  getHandbookDepartments,
  getHandbookDocForEdit,
  getHandbookPeoplePool,
} from "@/lib/supabase/queries/admin/handbook";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { designationOptions, pickerPeople } from "../editor-data";

export default async function EditHandbookDocPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();

  const [doc, people, acks, departments, settings] = await Promise.all([
    getHandbookDocForEdit(id),
    getHandbookPeoplePool(),
    getHandbookAcks(id),
    getHandbookDepartments(),
    getOrganizationSettings(),
  ]);

  if (!doc || doc.archivedAt) notFound();

  const progress =
    doc.requiresAck && doc.version > 0 ? computeReadProgress(doc, people, acks) : null;
  const { startIso } = orgDayUtcBounds(
    todayInTimezone(settings.timezone),
    settings.timezone,
  );

  return (
    <>
      <BreadcrumbLabel label={doc.title} />
      <HandbookEditor
        doc={doc}
        departments={departments.filter((department) => !department.archived)}
        people={pickerPeople(people)}
        designations={designationOptions(people)}
        aside={
          progress ? (
            <HandbookReadProgress
              docId={doc.id}
              version={doc.version}
              remindedToday={Boolean(doc.remindedAt && doc.remindedAt >= startIso)}
              readers={progress.rows.map((row) => ({
                id: row.person.id,
                name: row.person.full_name,
                avatar: row.person.avatar,
                designation: row.person.designation,
                status: row.status,
                version: row.version,
              }))}
            />
          ) : undefined
        }
      />
    </>
  );
}
