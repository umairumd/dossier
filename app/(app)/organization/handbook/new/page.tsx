import { HandbookEditor } from "@/components/admin/handbook-editor";
import {
  getHandbookDepartments,
  getHandbookPeoplePool,
} from "@/lib/supabase/queries/admin/handbook";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { designationOptions, pickerPeople } from "../editor-data";

export default async function NewHandbookDocPage() {
  const [people, departments, settings] = await Promise.all([
    getHandbookPeoplePool(),
    getHandbookDepartments(),
    getOrganizationSettings(),
  ]);

  return (
    <HandbookEditor
      departments={departments.filter((department) => !department.archived)}
      people={pickerPeople(people)}
      designations={designationOptions(people)}
      launched={Boolean(settings.handbookLaunchedAt)}
    />
  );
}
