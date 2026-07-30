import Link from "next/link";
import { FileText, UserX, Users } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function QuickActions() {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-muted-foreground">
        Quick Actions
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/manager/team-reports">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <FileText className="size-5 text-muted-foreground" />
              <CardTitle>Today&apos;s Reports</CardTitle>
              <CardDescription>
                See who has submitted today.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/manager/missing-reports">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <UserX className="size-5 text-muted-foreground" />
              <CardTitle>Missing Reports</CardTitle>
              <CardDescription>
                See who hasn&apos;t submitted and how long it&apos;s been.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/manager/team">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <Users className="size-5 text-muted-foreground" />
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Browse everyone on your team.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
