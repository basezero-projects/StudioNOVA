/**
 * Base URL for the worker API. Exposed as a public env so the browser can
 * talk directly to FastAPI when needed.
 */
export function getApiBaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!value) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is not defined. Set it in your .env before running StudioNOVA."
    );
  }
  return value;
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

