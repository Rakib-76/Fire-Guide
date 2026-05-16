import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";

function scrollToHashTarget(hash: string): boolean {
  const id = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!id) return false;
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ block: "start", behavior: "smooth" });
  return true;
}

/**
 * Scroll to top on route changes. When the location includes a hash (e.g. `/#how-it-works`),
 * scroll that section into view instead — with retries so lazy-loaded pages can render first.
 */
export function ScrollToTop() {
  const { pathname, hash, key } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 80;

    const tick = () => {
      if (cancelled) return;
      if (scrollToHashTarget(hash)) return;
      attempts += 1;
      if (attempts < maxAttempts) {
        window.setTimeout(tick, 50);
      } else {
        window.scrollTo(0, 0);
      }
    };

    const id = window.requestAnimationFrame(() => {
      window.setTimeout(tick, 0);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(id);
    };
  }, [pathname, hash, key]);

  return null;
}
