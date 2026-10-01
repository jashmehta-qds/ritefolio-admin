// Auth cookies must only travel over HTTPS in production.
export const supabaseCookieOptions = {
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
