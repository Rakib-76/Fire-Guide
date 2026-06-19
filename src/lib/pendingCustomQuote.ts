import type { CustomQuoteRequestData } from "../api/customQuoteRequestsService";

export const PENDING_CUSTOM_QUOTE_STORAGE_KEY = "fireguide_pending_custom_quote";

export function customQuoteDetailsPath(serviceId: number): string {
  return `/services/${serviceId}/custom-quote/details`;
}

export type PendingCustomQuoteContact = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  property_address: string;
  city: string;
  post_code: string;
  notes?: string;
};

export type PendingCustomQuote = {
  serviceId: number;
  requestData: CustomQuoteRequestData;
  serviceName?: string;
  /** Questionnaire URL to return to if submission fails after auth. */
  returnPath: string;
  /** Contact + property fields entered before sign-in redirect. */
  contactDetails?: PendingCustomQuoteContact;
};

export function savePendingCustomQuote(pending: PendingCustomQuote): void {
  try {
    sessionStorage.setItem(PENDING_CUSTOM_QUOTE_STORAGE_KEY, JSON.stringify(pending));
  } catch (error) {
    console.error("Failed to save pending custom quote:", error);
  }
}

export function readPendingCustomQuote(): PendingCustomQuote | null {
  try {
    const raw = sessionStorage.getItem(PENDING_CUSTOM_QUOTE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingCustomQuote>;
    const serviceId = parsed.serviceId;
    if (typeof serviceId !== "number" || !Number.isFinite(serviceId) || serviceId <= 0) {
      return null;
    }
    if (!parsed.requestData || typeof parsed.requestData !== "object") {
      return null;
    }
    const returnPath =
      typeof parsed.returnPath === "string" && parsed.returnPath.trim()
        ? parsed.returnPath.trim()
        : customQuoteDetailsPath(serviceId);
    return {
      serviceId,
      requestData: parsed.requestData as CustomQuoteRequestData,
      ...(typeof parsed.serviceName === "string" && parsed.serviceName.trim()
        ? { serviceName: parsed.serviceName.trim() }
        : {}),
      returnPath,
      ...(parsed.contactDetails &&
      typeof parsed.contactDetails === "object" &&
      !Array.isArray(parsed.contactDetails)
        ? { contactDetails: parsed.contactDetails as PendingCustomQuoteContact }
        : {}),
    };
  } catch {
    return null;
  }
}

export function clearPendingCustomQuote(): void {
  try {
    sessionStorage.removeItem(PENDING_CUSTOM_QUOTE_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear pending custom quote:", error);
  }
}

export function hasPendingCustomQuote(): boolean {
  return readPendingCustomQuote() != null;
}
