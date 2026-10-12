import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — a middleware refreshing the
            // session handles this instead, so it's safe to ignore here.
          }
        },
      },
    },
  );
}

// The signed-in user, verified once per request and shared by every query
// in the render (outside a render cache() does nothing). getClaims() checks
// the session token's signature locally when the project signs tokens with
// asymmetric keys, so it usually costs no network round trip; with a shared
// secret it asks the auth server, like getUser(). Callers only need the id
// (and the email in one place).
export const getAuthUser = cache(
  async (): Promise<{ id: string; email: string | null } | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    const sub = data?.claims?.sub;
    if (error || !sub) return null;
    const email = data.claims.email;
    return { id: sub, email: typeof email === "string" ? email : null };
  },
);
