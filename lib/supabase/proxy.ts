import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refreshes the auth token if expired. Required by the official Supabase
  // SSR setup even before any auth UI exists — omitting this causes sessions
  // to silently expire once auth is added in a later milestone.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginRoute = request.nextUrl.pathname.startsWith("/login");
  // /invite must be reachable with no session: the invite tokens arrive in
  // the URL fragment (#access_token=...), which browsers never send to the
  // server — so on first load the proxy genuinely cannot see them yet,
  // only the client-side code on that page can. Unlike /login, a session
  // appearing *while already on* /invite (right after setSession()
  // succeeds, before a password is set) must NOT bounce away — that's the
  // one route where "authenticated" doesn't mean "done here."
  const isInviteRoute = request.nextUrl.pathname.startsWith("/invite");

  if (!user && !isLoginRoute && !isInviteRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
