/** Site origin for static assets / evidence URLs (no /api suffix). */
export const DEFAULT_API_ORIGIN = "https://firesafety-backend.fireguide.co.uk";

/** Default API root when `VITE_API_BASE_URL` is unset (must include `/api` if your backend uses that prefix). */
export const DEFAULT_API_BASE_URL = `${DEFAULT_API_ORIGIN}/api`;

/**
 * Resolves the axios `baseURL`.
 * - If `VITE_API_BASE_URL` is omitted, uses production `.../api`.
 * - If set to only the origin (e.g. `https://firesafety-backend.fireguide.co.uk`), appends `/api`
 *   so requests hit `/api/addresses_update` instead of `/addresses_update` (which often 404s on Laravel).
 * - If set to a relative path like `/api`, pair with Vite `server.proxy` so the dev server forwards to the backend.
 */
export function resolveApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!fromEnv) return DEFAULT_API_BASE_URL;

  const base = fromEnv.replace(/\/+$/, '');

  // Relative (e.g. "/api") — browser calls same origin; Vite proxy should forward to the real API.
  if (base.startsWith('/')) {
    return base;
  }

  try {
    const parsed = new URL(base);
    const path = parsed.pathname.replace(/\/+$/, '') || '/';
    if (path === '/') {
      return `${base}/api`.replace(/\/+$/, '');
    }
    return base;
  } catch {
    return base;
  }
}
