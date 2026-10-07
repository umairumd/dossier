import { LogOut } from "lucide-react";
import { SignOutForm } from "@/components/auth/sign-out-form";
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
        <SignOutForm>
          <Button type="submit" variant="outline">
            <LogOut />
            Sign out
          </Button>
        </SignOutForm>
      </CardContent>
    </Card>
  );
}
