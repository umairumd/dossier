import { requireAdminUser } from "@/lib/supabase/require-admin";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { getBirthdayData } from "@/lib/supabase/queries/admin/birthdays";
import { getOrganizationSettings } from "@/lib/supabase/queries/organization-settings";
import { safeTimeZone, todayInTimezone } from "@/lib/helpers/dates";
import { BirthdayList } from "@/components/birthdays/birthday-list";
import { PageHeader } from "@/components/shared/page-header";

export default async function BirthdaysPage() {
  await requireAdminUser();
  const profile = await getCurrentProfile();

  if (!profile?.organization_id) {
    throw new Error("Organization not found.");
  }

  // Birthday notifications are sent by the hourly cron
  // (app/api/cron/birthdays) — never on page load or DOB save.
  const [settings, { withDOB, missingDOB }] = await Promise.all([
    getOrganizationSettings(),
    getBirthdayData(profile.organization_id),
  ]);
  const orgToday = todayInTimezone(safeTimeZone(settings.timezone));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Birthdays"
        description={[
          `${withDOB.length} ${withDOB.length === 1 ? "birthday" : "birthdays"} on file`,
          missingDOB.length > 0 ? `${missingDOB.length} missing a date` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      />
      <BirthdayList
        withDOB={withDOB}
        missingDOB={missingDOB}
        orgToday={orgToday}
      />
    </div>
  );
}
