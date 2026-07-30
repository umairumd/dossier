import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client: bypasses RLS entirely and can call the Supabase
// Admin API (inviting/banning users). This has no authorization boundary
// of its own — every caller MUST call requireAdminUser() (or equivalent)
// first. Never import this file from a "use client" component; it must
// only ever run in Server Actions / Server Components.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
