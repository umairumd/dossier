import { redirect } from "next/navigation";

export default function OrgMissingReportsPage() {
  redirect("/admin/org-reports");
}
