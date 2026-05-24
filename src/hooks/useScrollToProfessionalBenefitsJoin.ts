import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  PROFESSIONAL_BENEFITS_JOIN_ID,
  PROFESSIONAL_BENEFITS_PATHNAME,
} from "../lib/professionalBenefitsNavigation";

const JOIN_HASH = `#${PROFESSIONAL_BENEFITS_JOIN_ID}`;

/**
 * When the location is `/professional/benefits#join-professionals`, scrolls the
 * matching element into view after paint (runs after {@link ScrollToTop} on pathname changes).
 */
export function useScrollToProfessionalBenefitsJoin(): void {
  const { pathname, hash, key } = useLocation();

  useEffect(() => {
    if (pathname !== PROFESSIONAL_BENEFITS_PATHNAME || hash !== JOIN_HASH) return;

    const el = document.getElementById(PROFESSIONAL_BENEFITS_JOIN_ID);
    if (!el) return;

    let cancelled = false;
    const outer = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (!cancelled) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(outer);
    };
  }, [pathname, hash, key]);
}
