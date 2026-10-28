import type { PickerPerson } from "@/components/admin/handbook-audience-picker";
import { normaliseDesignation } from "@/lib/handbook/audience";
import type { HandbookPoolPerson } from "@/lib/supabase/queries/admin/handbook";

export function pickerPeople(people: HandbookPoolPerson[]): PickerPerson[] {
  return people.map((person) => ({
    id: person.id,
    full_name: person.full_name,
    designation: person.designation,
  }));
}

/** Designations in use, one spelling each, A–Z. */
export function designationOptions(people: HandbookPoolPerson[]): string[] {
  const byKey = new Map<string, string>();
  for (const person of people) {
    const designation = person.designation?.trim();
    if (!designation) continue;
    const key = normaliseDesignation(designation);
    if (!byKey.has(key)) byKey.set(key, designation);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}
