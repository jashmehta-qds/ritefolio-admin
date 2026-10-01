import type { User } from "@supabase/supabase-js";

// Admin sessions expire this long after sign-in, regardless of token refresh.
export const ADMIN_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export type AdminAccess = "anonymous" | "forbidden" | "expired" | "granted";

/**
 * Admin role is read from Supabase `app_metadata`, which can only be written
 * with the service-role key (never by the user themselves).
 */
export function isAdminUser(user: User | null): boolean {
  return user?.app_metadata?.is_admin === true;
}

export function evaluateAdminAccess(user: User | null): AdminAccess {
  if (!user) return "anonymous";
  if (!isAdminUser(user)) return "forbidden";

  const signedInAt = user.last_sign_in_at
    ? Date.parse(user.last_sign_in_at)
    : NaN;
  if (isNaN(signedInAt) || Date.now() - signedInAt > ADMIN_SESSION_MAX_AGE_MS) {
    return "expired";
  }

  return "granted";
}
