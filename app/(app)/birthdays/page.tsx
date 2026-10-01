import { requireAdminUser } from "@/lib/supabase/require-admin";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { getBirthdayData } from "@/lib/supabase/queries/admin/birthdays";
import { sendBirthdayNotifications } from "@/lib/actions/admin/birthdays";
import { BirthdayList } from "@/components/birthdays/birthday-list";
import { PageHeader } from "@/components/shared/page-header";

export default async function BirthdaysPage() {
  await requireAdminUser();
  const profile = await getCurrentProfile();

  if (!profile?.organization_id) {
    throw new Error("Organization not found.");
  }

  const { withDOB, missingDOB } = await getBirthdayData(
    profile.organization_id,
  );

  void sendBirthdayNotifications(profile.organization_id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Birthdays"
        description="Team birthdays and upcoming celebrations."
      />
      <BirthdayList withDOB={withDOB} missingDOB={missingDOB} />
    </div>
  );
}
