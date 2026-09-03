import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/queries/profile";

export default async function TrackReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!["owner", "admin"].includes(profile?.role ?? "")) {
    redirect("/");
  }

  return <>{children}</>;
}
