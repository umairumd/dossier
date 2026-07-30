import {
  getCurrentProfileWithDepartment,
  getCurrentUserEmail,
} from "@/lib/supabase/queries/profile";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProfileForm } from "@/components/settings/profile-form";

export default async function ProfilePage() {
  const [profile, email] = await Promise.all([
    getCurrentProfileWithDepartment(),
    getCurrentUserEmail(),
  ]);

  if (!profile) {
    // (app)/layout.tsx already redirects to /no-profile before this ever
    // renders — this is just a type-safety fallback.
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Your personal information.
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your display name.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            initialFullName={profile.full_name}
            email={email}
            role={profile.role}
            departmentName={profile.department?.name ?? "Unassigned"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
