import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { type AdminAccess, evaluateAdminAccess } from "./access";

export function accessDeniedResponse(access: Exclude<AdminAccess, "granted">) {
  const status = access === "forbidden" ? 403 : 401;
  const error = access === "forbidden" ? "Forbidden" : "Unauthorized";

  return NextResponse.json(
    { success: false, error },
    { status, headers: { "Cache-Control": "no-store, private" } },
  );
}

/**
 * Guard for API route handlers. Returns a 401/403 response when the caller is
 * not an authenticated administrator, otherwise null.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const { denied } = await requireAdminUser();
  return denied;
}

/**
 * Like requireAdmin, but also returns the authenticated administrator -- for
 * handlers that record who made a change. Exactly one of the fields is set.
 */
export async function requireAdminUser(): Promise<
  { user: User; denied: null } | { user: null; denied: NextResponse }
> {
  let user: User | null = null;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Malformed or tampered auth cookies are treated as unauthenticated.
    user = null;
  }

  const access = evaluateAdminAccess(user);
  if (access === "granted" && user) return { user, denied: null };
  return {
    user: null,
    denied: accessDeniedResponse(access === "granted" ? "anonymous" : access),
  };
}
