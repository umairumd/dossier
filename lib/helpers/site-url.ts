// Resolves the app's own origin for building auth redirect URLs (invite
// links must point back to this app, not wherever Supabase's project-level
// Site URL happens to be configured).
//
// NEXT_PUBLIC_SITE_URL is an optional override (custom domain, etc.).
// If unset, NEXT_PUBLIC_VERCEL_URL is used — Vercel injects it on every
// preview and production deploy, so invite links work without dashboard
// config. Local development falls back to http://localhost:3000.
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }

  return "http://localhost:3000";
}
