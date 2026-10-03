import { notFound, redirect } from "next/navigation";
import { getTeamMemberOverview } from "@/lib/supabase/queries/manager/employee-overview";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";
import { AdminEmployeeProfile } from "./admin-employee-profile";
import { TeamEmployeeProfile } from "./team-employee-profile";

// The role branch must stay first: AdminEmployeeProfile calls loaders that
// throw for non-admins and uses the service-role client.
export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();

  if (profile?.role === "owner" || profile?.role === "admin") {
    return <AdminEmployeeProfile id={id} profile={profile} />;
  }

  if (!profile || (profile.role !== "manager" && !profile.is_supervisor)) {
    redirect("/");
  }

  const overview = await getTeamMemberOverview(id);

  if (!overview) {
    notFound();
  }

  return <TeamEmployeeProfile overview={overview} viewer={profile} />;
}
