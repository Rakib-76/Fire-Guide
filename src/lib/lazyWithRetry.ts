import { lazy, type ComponentType, type LazyExoticComponent } from "react";

const RELOAD_KEY = "fireguide_chunk_reload_attempted";

function isLikelyStaleChunkError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("Unable to preload CSS") // Vite sometimes surfaces related failures
  );
}

/**
 * Same as `React.lazy`, but after a new deploy the browser may still reference old chunk URLs.
 * On that failure we reload once so the latest `index.html` / entry is fetched (avoids infinite reload).
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const mod = await importFn();
      try {
        sessionStorage.removeItem(RELOAD_KEY);
      } catch {
        /* private mode */
      }
      return mod;
    } catch (e: unknown) {
      if (
        typeof window !== "undefined" &&
        isLikelyStaleChunkError(e) &&
        sessionStorage.getItem(RELOAD_KEY) !== "1"
      ) {
        try {
          sessionStorage.setItem(RELOAD_KEY, "1");
        } catch {
          /* ignore */
        }
        window.location.reload();
        return new Promise<{ default: T }>(() => {
          /* never resolves — full reload in progress */
        });
      }
      try {
        sessionStorage.removeItem(RELOAD_KEY);
      } catch {
        /* ignore */
      }
      throw e;
    }
  });
}
