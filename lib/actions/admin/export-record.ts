"use server";

import { isValidDateString } from "@/lib/helpers/dates";
import { loadEmployeeRecordRaw } from "@/lib/exports/employee-record/load";
import {
  RECORD_MAX_DAYS,
  buildEmployeeRecord,
  daySpan,
  recordPreview,
  type RecordPreview,
} from "@/lib/exports/employee-record/build";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Counts for the export dialog. Owners and admins only (the loader checks). */
export async function getRecordPreview(
  employeeId: string,
  from: string,
  to: string,
): Promise<{ preview: RecordPreview | null; error?: string }> {
  if (!UUID.test(employeeId) || !isValidDateString(from) || !isValidDateString(to) || from > to) {
    return { preview: null, error: "Choose a valid period." };
  }
  if (daySpan(from, to) > RECORD_MAX_DAYS) {
    return { preview: null, error: "Choose a period of six months or less." };
  }
  try {
    const raw = await loadEmployeeRecordRaw(employeeId, from, to, { withComments: true });
    if (!raw) return { preview: null, error: "Employee not found." };
    const start = from < raw.person.joinedOn ? raw.person.joinedOn : from;
    if (start > to || start > raw.today) {
      return { preview: null, error: "Nothing to export for these dates." };
    }
    return { preview: recordPreview(buildEmployeeRecord(raw, start, to), to) };
  } catch {
    return { preview: null, error: "Couldn't read the records. Try again." };
  }
}
