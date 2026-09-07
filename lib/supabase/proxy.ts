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

  // Skip session handling for password reset / email confirm exchange —
  // auth/confirm route handler must consume token_hash or code itself.
  const isResetWithCode =
    request.nextUrl.pathname.startsWith("/reset-password") &&
    request.nextUrl.searchParams.has("code");

  const isAuthConfirmExchange =
    request.nextUrl.pathname.startsWith("/auth/confirm") &&
    (request.nextUrl.searchParams.has("code") ||
      request.nextUrl.searchParams.has("token_hash"));

  if (isResetWithCode || isAuthConfirmExchange) {
    return supabaseResponse;
  }

  // Refreshes the auth token if expired. Required by the official Supabase
  // SSR setup even before any auth UI exists — omitting this causes sessions
  // to silently expire once auth is added in a later milestone.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginRoute = request.nextUrl.pathname.startsWith("/login");
  const isForgotPasswordRoute =
    request.nextUrl.pathname.startsWith("/forgot-password");
  const isResetPasswordRoute =
    request.nextUrl.pathname.startsWith("/reset-password");
  const isAuthConfirmRoute =
    request.nextUrl.pathname.startsWith("/auth/confirm");

  if (
    !user &&
    !isLoginRoute &&
    !isForgotPasswordRoute &&
    !isResetPasswordRoute &&
    !isAuthConfirmRoute
  ) {
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
