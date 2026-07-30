import Link from "next/link";
import { Building2, Users } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminOverviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Manage employees and departments.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/employees">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <Users className="size-5 text-muted-foreground" />
              <CardTitle>Employees</CardTitle>
              <CardDescription>
                Invite, edit, and activate or deactivate employees.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/departments">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <Building2 className="size-5 text-muted-foreground" />
              <CardTitle>Departments</CardTitle>
              <CardDescription>
                Create departments and assign managers.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
