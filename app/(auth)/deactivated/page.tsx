import { LogOut } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DeactivatedPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Account deactivated</CardTitle>
        <CardDescription>
          Your account has been deactivated by your organization
          administrator. Please contact your administrator if you believe
          this is an error.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={logout}>
          <Button type="submit" variant="outline">
            <LogOut />
            Sign out
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
