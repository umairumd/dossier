import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_REPORT_DEADLINE_HOUR_UTC } from "@/lib/reports/submission-status";

export interface OrganizationSettings {
  reportDeadlineHourUtc: number;
  orgName: string | null;
  timezone: string;
  workingDays: number[];
  reportDeadlineHourLocal: number;
}

const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5];

// Readable by any authenticated user (submission status is computed on
// the employee dashboard and manager reports alike, not just by admins).
// Falls back to the same default the old hardcoded constant used if the
// row is somehow missing — it shouldn't be (the migration seeds it and
// nothing ever deletes it), but a dashboard stat is a bad place to throw.
export const getOrganizationSettings = cache(
  async (): Promise<OrganizationSettings> => {
    const supabase = await createClient();

    const { data } = await supabase
      .from("organization_settings")
      .select(
        "report_deadline_hour_utc, org_name, timezone, working_days, report_deadline_hour_local",
      )
      .eq("id", true)
      .maybeSingle();

    return {
      reportDeadlineHourUtc:
        data?.report_deadline_hour_utc ?? DEFAULT_REPORT_DEADLINE_HOUR_UTC,
      orgName: data?.org_name ?? null,
      timezone: data?.timezone ?? "UTC",
      workingDays: data?.working_days ?? DEFAULT_WORKING_DAYS,
      reportDeadlineHourLocal: data?.report_deadline_hour_local ?? 17,
    };
  },
);
