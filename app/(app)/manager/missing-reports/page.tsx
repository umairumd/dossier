import { redirect } from "next/navigation";

export default function MissingReportsPage() {
  redirect("/manager/team-reports");
}
