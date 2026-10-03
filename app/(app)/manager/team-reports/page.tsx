import { redirect } from "next/navigation";
import { isValidDateString } from "@/lib/helpers/dates";

export default async function ManagerTeamReportsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  redirect(
    isValidDateString(date) ? `/team-reports?date=${date}` : "/team-reports",
  );
}
