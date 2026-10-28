import { HandbookEditor } from "@/components/admin/handbook-editor";
import {
  getHandbookDepartments,
  getHandbookPeoplePool,
} from "@/lib/supabase/queries/admin/handbook";
import { designationOptions, pickerPeople } from "../editor-data";

export default async function NewHandbookDocPage() {
  const [people, departments] = await Promise.all([
    getHandbookPeoplePool(),
    getHandbookDepartments(),
  ]);

  return (
    <HandbookEditor
      departments={departments.filter((department) => !department.archived)}
      people={pickerPeople(people)}
      designations={designationOptions(people)}
      // New documents start out visible to everyone.
      initialCount={people.length}
    />
  );
}
