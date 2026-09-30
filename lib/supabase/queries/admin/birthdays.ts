import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/supabase/require-admin";
import type { UserRole } from "@/types/profile";

export interface BirthdayPerson {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  role: UserRole;
  designation: string | null;
}

export interface BirthdayData {
  withDOB: BirthdayPerson[];
  missingDOB: BirthdayPerson[];
}

function monthDay(iso: string): { month: number; day: number } {
  const [, month, day] = iso.split("-").map(Number);
  return { month, day };
}

function compareByMonthDay(a: BirthdayPerson, b: BirthdayPerson): number {
  const da = monthDay(a.date_of_birth!);
  const db = monthDay(b.date_of_birth!);
  if (da.month !== db.month) return da.month - db.month;
  return da.day - db.day;
}

export const getBirthdayData = cache(
  async (orgId: string): Promise<BirthdayData> => {
    // Service-role client below bypasses RLS — gate first.
    await requireAdminUser();
    const adminClient = createAdminClient();

    const { data: profiles, error } = await adminClient
      .from("profiles")
      .select("id, full_name, date_of_birth, role, designation")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .is("archived_at", null);

    if (error) {
      throw new Error("Failed to load birthday data.");
    }

    const people: BirthdayPerson[] = (profiles ?? []).map((row) => ({
      id: row.id,
      full_name: row.full_name,
      date_of_birth: row.date_of_birth,
      role: row.role as UserRole,
      designation: row.designation ?? null,
    }));

    const withDOB = people
      .filter((person) => person.date_of_birth != null)
      .sort(compareByMonthDay);

    const missingDOB = people
      .filter((person) => person.date_of_birth == null)
      .sort((a, b) => a.full_name.localeCompare(b.full_name));

    return { withDOB, missingDOB };
  },
);
