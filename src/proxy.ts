import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  isOwnerEmail,
  supabasePublishableKey,
  supabaseUrl,
} from "@/lib/supabase/env";

// Pages anyone can open. Everything else needs Alexandra's login. The app
// manifest is public because phones fetch it without the login cookie; it
// only holds the app's name, colours and icon. The daily keep-alive checks
// its own secret (CRON_SECRET) and returns no data.
const PUBLIC_PATHS = ["/login", "/forgot-password", "/auth/confirm", "/manifest.webmanifest", "/api/keepalive"];
// Pages that make no sense once signed in.
const SIGNED_OUT_ONLY = ["/login", "/forgot-password"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers ?? {}).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  // Refreshes the session cookie and verifies who is signed in.
  const { data } = await supabase.auth.getClaims();
  const signedIn = isOwnerEmail(data?.claims?.email);

  const isPublic = PUBLIC_PATHS.some(
    (path) =>
      request.nextUrl.pathname === path ||
      request.nextUrl.pathname.startsWith(`${path}/`),
  );

  if (!signedIn && !isPublic) {
    return redirectWithCookies(request, response, "/login");
  }
  if (signedIn && SIGNED_OUT_ONLY.includes(request.nextUrl.pathname)) {
    return redirectWithCookies(request, response, "/");
  }

  return response;
}

// Redirect while keeping any refreshed session cookies.
function redirectWithCookies(request: NextRequest, response: NextResponse, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  // Skip Next.js internals and static files such as icons.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
