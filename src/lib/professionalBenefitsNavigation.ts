import type { To } from "react-router-dom";

/**
 * Bottom CTA on `/professional/benefits` (“Ready to Start Getting Customers?”).
 * Use {@link professionalBenefitsJoinTo} with `navigate(...)` so the page can scroll there.
 */
export const PROFESSIONAL_BENEFITS_JOIN_ID = "join-professionals" as const;

export const PROFESSIONAL_BENEFITS_PATHNAME = "/professional/benefits" as const;

/** String form for `Link to={...}` or tests. */
export function professionalBenefitsJoinPath(): string {
  return `${PROFESSIONAL_BENEFITS_PATHNAME}#${PROFESSIONAL_BENEFITS_JOIN_ID}`;
}

/** Preferred for `navigate(...)` (React Router applies hash reliably). */
export function professionalBenefitsJoinTo(): To {
  return { pathname: PROFESSIONAL_BENEFITS_PATHNAME, hash: PROFESSIONAL_BENEFITS_JOIN_ID };
}

export const PROFESSIONAL_AUTH_PATH = "/professional/auth" as const;

/** Opens professional auth on the registration form (“Join as a Professional”). */
export function professionalAuthSignupPath(): string {
  return `${PROFESSIONAL_AUTH_PATH}?mode=signup`;
}

/** Opens professional auth on the login form. */
export function professionalAuthLoginPath(): string {
  return `${PROFESSIONAL_AUTH_PATH}?mode=login`;
}
