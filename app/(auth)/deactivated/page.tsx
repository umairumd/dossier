import { AuthCard, AuthSignOut } from "@/components/auth/auth-card";

export default function DeactivatedPage() {
  return (
    <AuthCard
      title="Account deactivated"
      description="Your organization's admin has deactivated this account. Contact them if you think this is a mistake."
    >
      <AuthSignOut />
    </AuthCard>
  );
}
