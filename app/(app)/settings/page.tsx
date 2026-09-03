import { LogOut } from "lucide-react";
import {
  getCurrentProfileWithDepartment,
  getCurrentUserEmail,
} from "@/lib/supabase/queries/profile";
import { logout } from "@/lib/actions/auth";
import { getRoleLabel } from "@/lib/helpers/role-labels";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { ProfileForm } from "@/components/settings/profile-form";

export default async function SettingsPage() {
  const [profile, email] = await Promise.all([
    getCurrentProfileWithDepartment(),
    getCurrentUserEmail(),
  ]);

  if (!profile) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Your personal information and account security.
        </p>
      </div>

      <Card className="max-w-md card-gradient">
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your display name.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            initialFullName={profile.full_name}
            email={email}
            role={getRoleLabel(profile.role)}
            departmentName={
              profile.department_names.join(", ") || "Unassigned"
            }
          />
        </CardContent>
      </Card>

      <Card className="max-w-md card-gradient">
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>
            Choose a new password for your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card className="max-w-md card-gradient">
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>
            Sign out of Dossier on this device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={logout}>
            <Button type="submit" variant="outline">
              <LogOut />
              Sign Out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
