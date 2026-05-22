import { getCustomerData } from "../api/authService";
import { resolveApiBaseUrl } from "./apiBaseUrl";
import { getPublicAppOrigin } from "./paymentAppUrls";
import {
  getFirstName,
  setAuthToken,
  setProfessionalId,
  setUserEmail,
  setUserFullName,
  setUserInfo,
  setUserPhone,
  setUserProfileImage,
  setUserRole,
} from "./auth";

export interface SocialAuthSessionPayload {
  token: string;
  email?: string;
  fullName: string;
  roleUpper: string;
  phone?: string;
  professionalId?: number;
}

export type SocialAuthCallbackResult =
  | { ok: true; payload: SocialAuthSessionPayload; isNewUser?: boolean }
  | { ok: false; error: string }
  | null;

/** Where Laravel should send the browser after Google OAuth (query params with token). */
export function getSocialAuthReturnUrl(): string {
  return `${getPublicAppOrigin()}/customer/auth`;
}

function buildSocialOAuthStartUrl(provider: "google" | "facebook"): string {
  const base = resolveApiBaseUrl().replace(/\/+$/, "");
  const returnUrl = getSocialAuthReturnUrl();
  const url = new URL(`${base}/auth/${provider}`);
  url.searchParams.set("redirect_url", returnUrl);
  url.searchParams.set("frontend_redirect", returnUrl);
  return url.toString();
}

/** Start Google OAuth on the API (`GET .../auth/google`). */
export function getGoogleOAuthStartUrl(): string {
  return buildSocialOAuthStartUrl("google");
}

/** Start Facebook OAuth on the API (`GET .../auth/facebook`). */
export function getFacebookOAuthStartUrl(): string {
  return buildSocialOAuthStartUrl("facebook");
}

function mergeSearchAndHash(search: string, hash: string): URLSearchParams {
  const sp = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search
  );
  const hashPart = hash.replace(/^#/, "");
  if (hashPart) {
    const hp = new URLSearchParams(
      hashPart.includes("=") ? hashPart : ""
    );
    hp.forEach((v, k) => {
      if (!sp.has(k)) sp.set(k, v);
    });
  }
  return sp;
}

function pickToken(sp: URLSearchParams): string | null {
  for (const key of ["api_token", "token", "access_token", "apiToken"]) {
    const v = sp.get(key);
    if (v?.trim()) return v.trim();
  }
  return null;
}

function formatEmailLocalPart(email: string): string {
  const local = email.split("@")[0] || "";
  return local
    .replace(/[._+-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function pickFullNameFromParams(sp: URLSearchParams, email?: string): string {
  const direct =
    sp.get("full_name") ||
    sp.get("name") ||
    sp.get("user_name") ||
    sp.get("display_name");
  if (direct?.trim() && direct.trim().toLowerCase() !== "user") {
    return direct.trim();
  }

  const first = sp.get("first_name") || sp.get("given_name");
  const last = sp.get("last_name") || sp.get("family_name");
  const combined = [first, last].filter(Boolean).join(" ").trim();
  if (combined) return combined;

  if (email?.trim()) {
    return formatEmailLocalPart(email.trim());
  }

  return "";
}

function isPlaceholderDisplayName(fullName: string): boolean {
  const n = fullName.trim().toLowerCase();
  return !n || n === "user";
}

/**
 * Read token / user fields from the URL after backend redirects back from Google.
 * Returns null when the URL has no OAuth-related query keys.
 */
export function parseSocialAuthCallback(
  search: string,
  hash: string
): SocialAuthCallbackResult {
  const sp = mergeSearchAndHash(search, hash);
  if (sp.size === 0) return null;

  const error =
    sp.get("error_description") ||
    sp.get("error") ||
    sp.get("message");
  if (error && !pickToken(sp)) {
    return { ok: false, error: decodeURIComponent(error.replace(/\+/g, " ")) };
  }

  const token = pickToken(sp);
  if (!token) {
    if (
      sp.get("success") === "true" ||
      sp.get("status") === "success" ||
      sp.has("code")
    ) {
      return {
        ok: false,
        error:
          "Sign-in completed but no api_token was returned. The backend should redirect to /customer/auth?api_token=...",
      };
    }
    return null;
  }

  const email = sp.get("email")?.trim() || undefined;
  const fullName = pickFullNameFromParams(sp, email);
  const roleRaw = sp.get("role") || sp.get("user_role") || "USER";
  const roleUpper = String(roleRaw).toUpperCase();
  const phone = sp.get("phone")?.trim() || undefined;
  const proIdRaw = sp.get("professional_id");
  const professionalIdParsed = proIdRaw ? parseInt(proIdRaw, 10) : NaN;
  const professionalId = Number.isFinite(professionalIdParsed)
    ? professionalIdParsed
    : undefined;

  const isNewUser =
    sp.get("is_new_user") === "1" ||
    sp.get("registered") === "1" ||
    sp.get("is_new") === "true";

  return {
    ok: true,
    payload: {
      token,
      email,
      fullName,
      roleUpper,
      phone,
      professionalId,
    },
    isNewUser,
  };
}

export function applySocialAuthSession(payload: SocialAuthSessionPayload): void {
  setAuthToken(payload.token);
  if (payload.email) {
    setUserEmail(payload.email.trim().toLowerCase());
  }
  setUserRole(payload.roleUpper);
  const appRole =
    payload.roleUpper === "PROFESSIONAL"
      ? "professional"
      : payload.roleUpper === "ADMIN"
        ? "admin"
        : "customer";
  const nameForDisplay = isPlaceholderDisplayName(payload.fullName)
    ? payload.email
      ? formatEmailLocalPart(payload.email)
      : "User"
    : payload.fullName;
  setUserFullName(payload.fullName || nameForDisplay);
  setUserInfo(nameForDisplay, appRole);
  if (payload.phone) {
    setUserPhone(payload.phone);
  }
  if (payload.professionalId != null) {
    setProfessionalId(payload.professionalId);
  }
}

/**
 * When Google redirect omits name, load profile from API (same source as customer dashboard).
 */
export async function hydrateSocialAuthUserProfile(
  payload: SocialAuthSessionPayload
): Promise<SocialAuthSessionPayload> {
  let fullName = payload.fullName;
  const role = payload.roleUpper;

  if (!isPlaceholderDisplayName(fullName)) {
    applySocialAuthSession({ ...payload, fullName });
    return { ...payload, fullName };
  }

  if (role === "USER" || role === "CUSTOMER") {
    try {
      const res = await getCustomerData(payload.token);
      if (res.status && res.data?.full_name?.trim()) {
        fullName = res.data.full_name.trim();
        const next: SocialAuthSessionPayload = {
          ...payload,
          fullName,
          email: res.data.email || payload.email,
          phone: res.data.phone || payload.phone,
        };
        applySocialAuthSession(next);
        if (res.data.image) {
          setUserProfileImage(res.data.image);
        }
        return next;
      }
    } catch {
      /* fall through to email-based name */
    }
  }

  if (payload.email) {
    fullName = formatEmailLocalPart(payload.email);
  }

  const next = { ...payload, fullName: fullName || payload.fullName };
  applySocialAuthSession(next);
  return next;
}

export function getDisplayNameAfterSocialAuth(payload: SocialAuthSessionPayload): string {
  if (isPlaceholderDisplayName(payload.fullName)) {
    if (payload.email) return formatEmailLocalPart(payload.email);
    return "User";
  }
  return getFirstName(payload.fullName);
}
