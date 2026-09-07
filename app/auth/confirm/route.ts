import { createServerClient } from "@supabase/ssr";
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Password recovery / email confirm exchange (official Supabase SSR pattern).
 *
 * Update Supabase Authentication → Email Templates → Reset Password to:
 *   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password">
 *     Reset password
 *   </a>
 *
 * Also best-effort handles legacy ?code= when a code_verifier cookie is present.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/reset-password";
  const next = nextRaw.startsWith("/") ? nextRaw : `/${nextRaw}`;

  const successUrl = new URL(next, request.url);
  successUrl.search = "";

  const errorUrl = new URL("/reset-password", request.url);
  errorUrl.searchParams.set(
    "error",
    "This reset link has expired or is invalid.",
  );

  // #region agent log
  console.log("[DEBUG auth/confirm] GET", {
    hasTokenHash: !!token_hash,
    type,
    hasCode: !!code,
    next,
  });
  // #endregion

  let successResponse = NextResponse.redirect(successUrl);
  let errorResponse = NextResponse.redirect(errorUrl);

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
          successResponse = NextResponse.redirect(successUrl);
          errorResponse = NextResponse.redirect(errorUrl);
          cookiesToSet.forEach(({ name, value, options }) => {
            successResponse.cookies.set(name, value, options);
            errorResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    // #region agent log
    console.log("[DEBUG auth/confirm] verifyOtp", {
      type,
      error: error?.message ?? null,
    });
    // #endregion
    if (!error) {
      return successResponse;
    }
    return errorResponse;
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // #region agent log
    console.log("[DEBUG auth/confirm] exchangeCodeForSession", {
      codeLen: code.length,
      error: error?.message ?? null,
    });
    // #endregion
    if (!error) {
      return successResponse;
    }
    return errorResponse;
  }

  return errorResponse;
}
