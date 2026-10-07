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

export default function NoProfilePage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Setting up your account</CardTitle>
        <CardDescription>
          You&apos;re signed in, but your profile hasn&apos;t been created
          yet. This usually resolves on its own — if it doesn&apos;t, contact
          an admin.
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
