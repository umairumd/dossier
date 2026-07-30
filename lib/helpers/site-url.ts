// Resolves the app's own origin for building auth redirect URLs (invite
// links must point back to this app, not wherever Supabase's project-level
// Site URL happens to be configured). NEXT_PUBLIC_SITE_URL lets an admin
// pin a custom production domain; VERCEL_URL is set automatically by
// Vercel on every deployment (preview and production) with no config
// needed; the localhost fallback covers local development.
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}
