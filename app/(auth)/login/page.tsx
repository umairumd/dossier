import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <AuthCard
      title="Sign in"
      description="Use the email your organization invited."
    >
      <LoginForm initialError={error} initialMessage={message} />
    </AuthCard>
  );
}
