import { storeCustomQuoteRequest } from "../api/customQuoteRequestsService";
import { getApiToken, getUserEmail, getUserFullName, getUserPhone } from "./auth";
import {
  clearPendingCustomQuote,
  readPendingCustomQuote,
  type PendingCustomQuote,
} from "./pendingCustomQuote";

export type PendingCustomQuoteSubmitResult = {
  hadPending: boolean;
  submitted: boolean;
  error?: string;
  returnPath?: string;
  pending?: PendingCustomQuote;
};

/**
 * After customer sign-in or sign-up, submit a custom quote that was started while logged out.
 */
export async function submitPendingCustomQuoteIfAny(): Promise<PendingCustomQuoteSubmitResult> {
  const pending = readPendingCustomQuote();
  if (!pending) {
    return { hadPending: false, submitted: false };
  }

  const token = getApiToken();
  const name = getUserFullName()?.trim() ?? "";
  const email = getUserEmail()?.trim() ?? "";
  const phone = getUserPhone()?.trim() ?? "";

  if (!token || !name || !email || !phone) {
    return {
      hadPending: true,
      submitted: false,
      error:
        "Sign in and add your name, email, and phone in your profile so we can submit your custom quote request.",
      returnPath: pending.returnPath,
      pending,
    };
  }

  try {
    await storeCustomQuoteRequest(
      token,
      pending.serviceId,
      name,
      email,
      phone,
      pending.requestData
    );
    clearPendingCustomQuote();
    return { hadPending: true, submitted: true };
  } catch (err) {
    return {
      hadPending: true,
      submitted: false,
      error: err instanceof Error ? err.message : "Failed to submit custom quote request.",
      returnPath: pending.returnPath,
      pending,
    };
  }
}
