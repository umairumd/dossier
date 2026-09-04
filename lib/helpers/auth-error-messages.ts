// Supabase Auth's raw error messages ("User is banned", "Invalid login
// credentials") are accurate but not written for end users, and in the
// banned case actively confusing — a deactivated employee has no way to
// know that "banned" refers to an admin action, not a security flag on
// their account. This maps known messages to application-facing copy;
// anything unrecognized maps to a generic retry message so Supabase
// codes never reach the UI.
export function friendlyAuthErrorMessage(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("banned") || normalized.includes("disabled")) {
    return "Your account has been deactivated by your organization administrator. Please contact your administrator if you believe this is an error.";
  }

  if (normalized.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }

  return "Something went wrong. Please try again.";
}
