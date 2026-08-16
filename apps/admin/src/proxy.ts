import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next 16 proxy (the middleware.ts replacement — Node runtime, named export
 * `proxy`). Two jobs, both UX-optimistic:
 *
 *   1. Refresh the Supabase session cookie when the access token is stale
 *      (the @supabase/ssr cookie dance below).
 *   2. Bounce obviously-unauthenticated visitors to /login before anything
 *      renders — JWT presence/claims only, NO database calls here.
 *
 * This is NOT the security boundary. Claims can be stale until token refresh
 * (a demoted admin keeps a role claim until then), so the authoritative
 * check is verifySession()/requireRole() in src/lib/dal.ts, which every
 * gated layout and route handler calls.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Unconfigured environment (fresh clone, missing .env.local): let /login
  // render its own guidance instead of crashing every route in the proxy.
  if (!url || !key) {
    return redirectToLogin(request, "unknown");
  }

  // The ssr helper needs to write refreshed tokens to BOTH the forwarded
  // request (so this request's server components see them) and the response
  // (so the browser stores them).
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Verifies the JWT (locally when the project uses asymmetric signing keys;
  // via the Auth server otherwise) and returns its claims. Also triggers the
  // cookie refresh above when the access token has expired.
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return redirectToLogin(request, "session-expired");
  }

  return response;
}

function redirectToLogin(request: NextRequest, errorCode: string) {
  // API callers get machine-readable 401s, not HTML redirects.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "unauthorized", message: "Sign in required." },
      { status: 401 },
    );
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = `?error=${errorCode}`;
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Everything except /login itself, Next internals and static assets.
  // CAUTION (proxy docs): excluded paths also skip this check for any Server
  // Actions posted to them — /login's actions do their own auth work.
  matcher: [
    "/((?!login|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
