import { redirect } from "next/navigation";

export default async function AdminEmployeeDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/employees/${id}`);
}
