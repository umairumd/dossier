import { redirect } from "next/navigation";

export default async function ManagerEmployeeRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/employees/${id}`);
}
