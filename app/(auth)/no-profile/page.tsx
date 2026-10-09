import { AuthCard, AuthSignOut } from "@/components/auth/auth-card";

export default function NoProfilePage() {
  return (
    <AuthCard
      title="Setting up your account"
      description="You're signed in, but your profile isn't ready yet. This usually sorts itself out in a moment. If it doesn't, contact an admin."
    >
      <AuthSignOut />
    </AuthCard>
  );
}
