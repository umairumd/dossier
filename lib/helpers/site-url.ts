// Resolves the app's own origin for building auth redirect URLs (invite
// links must point back to this app, not wherever Supabase's project-level
// Site URL happens to be configured).
//
// Priority (server-first — NEXT_PUBLIC_* is inlined at build time and is
// unreliable inside Server Actions):
//   1. SITE_URL — server-only runtime override (custom domain, etc.)
//   2. VERCEL_URL — auto-injected by Vercel at request time (no https://)
//   3. NEXT_PUBLIC_SITE_URL — build-time fallback for client-side use
//   4. http://localhost:3000 — local development
export function getSiteUrl(): string {
  // Server-only runtime vars (reliable in Server Actions)
  if (process.env.SITE_URL) {
    return process.env.SITE_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  // Build-time fallback (client-side usage)
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  return "http://localhost:3000";
}
