import {
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
 * After customer sign-in or sign-up, resume a custom quote started while logged out
 * (navigate to the property-details step; API is called only on Submit there).
 */
export async function submitPendingCustomQuoteIfAny(): Promise<PendingCustomQuoteSubmitResult> {
  const pending = readPendingCustomQuote();
  if (!pending) {
    return { hadPending: false, submitted: false };
  }

  return {
    hadPending: true,
    submitted: false,
    returnPath: pending.returnPath,
    pending,
  };
}
