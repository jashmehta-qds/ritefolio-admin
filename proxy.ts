import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { evaluateAdminAccess } from "@/lib/auth/access";
import { accessDeniedResponse } from "@/lib/auth/admin";
import { supabaseCookieOptions } from "@/lib/supabase/options";

const NO_STORE = "no-store, private";

function clearAuthCookies(request: NextRequest, response: NextResponse) {
  request.cookies
    .getAll()
    .filter(({ name }) => name.startsWith("sb-"))
    .forEach(({ name }) => response.cookies.delete(name));
  return response;
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  return to;
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: supabaseCookieOptions,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Malformed or tampered auth cookies must fail closed as unauthenticated
  // instead of surfacing a 500.
  let user: User | null = null;
  let hasInvalidSession = false;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    hasInvalidSession = true;
  }

  const access = evaluateAdminAccess(user);
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/";
  const isApiRoute = pathname === "/api" || pathname.startsWith("/api/");

  if (access === "granted") {
    if (isLoginPage) {
      return copyCookies(
        response,
        NextResponse.redirect(new URL("/dashboard", request.url))
      );
    }
    response.headers.set("Cache-Control", NO_STORE);
    return response;
  }

  // Non-admin or expired sessions are revoked so they cannot be reused here.
  if (access === "forbidden" || access === "expired") {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Cookies are cleared below regardless.
    }
  }
  const shouldClearCookies = access !== "anonymous" || hasInvalidSession;

  // Deny API access before any handler parses the request.
  if (isApiRoute) {
    const denied = accessDeniedResponse(access);
    return shouldClearCookies ? clearAuthCookies(request, denied) : denied;
  }

  if (isLoginPage) {
    return shouldClearCookies ? clearAuthCookies(request, response) : response;
  }

  const loginUrl = new URL("/", request.url);
  if (access === "forbidden" || access === "expired") {
    loginUrl.searchParams.set("error", access);
  }
  const redirect = NextResponse.redirect(loginUrl);
  return shouldClearCookies ? clearAuthCookies(request, redirect) : redirect;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
