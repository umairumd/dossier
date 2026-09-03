import { redirect } from "next/navigation";

export default function OrgMissingReportsPage() {
  redirect("/admin/track-reports");
}
