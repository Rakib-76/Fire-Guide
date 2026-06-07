import { fetchProfessionalFromListByEmail } from "../api/professionalsService";
import { getProfessionalId, getUserEmail, setProfessionalId } from "./auth";

function coercePositiveInt(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Extract professional id from auth/verify-otp/register response shapes. */
export function extractProfessionalIdFromPayload(
  payload: Record<string, unknown> | null | undefined
): number | null {
  if (!payload) return null;

  const direct = coercePositiveInt(payload.professional_id);
  if (direct != null) return direct;

  const professional = payload.professional;
  if (professional && typeof professional === "object") {
    const fromNested = coercePositiveInt((professional as Record<string, unknown>).id);
    if (fromNested != null) return fromNested;
  }

  const data = payload.data;
  if (data && typeof data === "object") {
    return extractProfessionalIdFromPayload(data as Record<string, unknown>);
  }

  return null;
}

/**
 * Restore `professional_id` in localStorage after login when the OTP response omits it.
 * Logout clears professional_id; returning pros still exist in `/professional/list`.
 */
export async function resolveAndStoreProfessionalId(options?: {
  responseData?: Record<string, unknown> | null;
  email?: string;
}): Promise<number | null> {
  const existing = getProfessionalId();
  if (existing != null && !Number.isNaN(existing)) {
    return existing;
  }

  const fromResponse = extractProfessionalIdFromPayload(options?.responseData ?? null);
  if (fromResponse != null) {
    setProfessionalId(fromResponse);
    return fromResponse;
  }

  const email = (options?.email ?? getUserEmail())?.trim().toLowerCase();
  if (!email) return null;

  try {
    const professional = await fetchProfessionalFromListByEmail(email);
    const id = coercePositiveInt(professional?.id ?? professional?.professional_id);
    if (id != null) {
      setProfessionalId(id);
      return id;
    }
  } catch {
    /* fall through */
  }

  return null;
}
