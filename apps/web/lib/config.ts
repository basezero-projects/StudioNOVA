export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
}

/**
 * Local-development auth bypass. When true, the app behaves as if a user is
 * already authenticated. This must remain disabled for any production build.
 *
 * Defaults to enabled whenever NODE_ENV !== "production" unless explicitly set.
 */
const rawAuthDisabled =
  process.env.NEXT_PUBLIC_AUTH_DISABLED ??
  process.env.AUTH_DISABLED ??
  (process.env.NODE_ENV !== "production" ? "true" : "false");

export const AUTH_DISABLED = rawAuthDisabled === "true";

