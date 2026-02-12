/**
 * Shared API base URL and fetch helper. Use for all backend calls.
 * On 401, redirects to /logout (clears session) then /login.
 *
 * All API calls go directly to the gateway via NEXT_PUBLIC_API_BASE_URL.
 * The gateway must allow CORS from the UI origin and accept credentials if using cookies.
 */

/** Safe, user-facing message when an unexpected error occurs (no leaked internals). */
export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

function getBase(): string {
  if (typeof process === "undefined") return "";
  return (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
}

export function getApiBaseUrl(): string {
  return getBase();
}

export type ApiFetchOptions = RequestInit & { skip401Redirect?: boolean };

/**
 * Fetch with credentials and optional 401 redirect to /logout (session clear).
 * Set skip401Redirect: true for auth flows (login, MFA verify) where 401 is handled in-page.
 */
export async function apiFetch(
  path: string,
  options: ApiFetchOptions = {}
): Promise<Response> {
  const { skip401Redirect, ...init } = options;
  const base = getBase();
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  const res = await fetch(url, {
    ...init,
    credentials: init.credentials ?? "include",
  });
  if (!skip401Redirect && res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/logout";
    return res;
  }
  return res;
}
