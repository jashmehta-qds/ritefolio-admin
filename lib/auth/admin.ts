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
  return access === "granted" ? null : accessDeniedResponse(access);
}
