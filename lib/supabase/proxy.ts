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

  // #region agent log
  if (
    request.nextUrl.pathname.startsWith("/reset-password") ||
    request.nextUrl.pathname.startsWith("/auth/confirm")
  ) {
    const proxyDebug = {
      pathname: request.nextUrl.pathname,
      search: request.nextUrl.search,
      searchKeys: [...request.nextUrl.searchParams.keys()],
      hasCode: request.nextUrl.searchParams.has("code"),
      hasTokenHash: request.nextUrl.searchParams.has("token_hash"),
      type: request.nextUrl.searchParams.get("type"),
      isResetWithCode,
      isAuthConfirmExchange,
      willEarlyReturn: isResetWithCode || isAuthConfirmExchange,
    };
    console.log("[DEBUG proxy] reset/confirm route:", proxyDebug);
    fetch("http://127.0.0.1:7632/ingest/5b62dd9c-ca47-4ea0-8824-9f867e88198d", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "b4d57c",
      },
      body: JSON.stringify({
        sessionId: "b4d57c",
        runId: "post-fix",
        hypothesisId: "D",
        location: "lib/supabase/proxy.ts:early-return-check",
        message: "Proxy reset/confirm route decision",
        data: proxyDebug,
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }
  // #endregion

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
