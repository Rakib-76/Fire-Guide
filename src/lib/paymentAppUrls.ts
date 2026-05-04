/**
 * Absolute base for payment return URLs (success / failed).
 * Set VITE_PUBLIC_APP_URL in production (e.g. http://103.208.181.252:3000) when the app
 * is served behind a different host than where users open checkout.
 */
export function getPublicAppOrigin(): string {
  const fromEnv = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export function getPaymentSuccessPageUrl(): string {
  return `${getPublicAppOrigin()}/payment-success`;
}

export function getPaymentFailedPageUrl(): string {
  return `${getPublicAppOrigin()}/payment-failed`;
}

/**
 * URL passed to Stripe Checkout `success_url`. Stripe replaces the literal
 * `{CHECKOUT_SESSION_ID}` so the app can read `session_id` on `/payment-success`.
 */
export function getStripeCheckoutSuccessUrl(): string {
  const base = getPaymentSuccessPageUrl();
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}session_id={CHECKOUT_SESSION_ID}`;
}

export const PAYMENT_RETURN_STORAGE_KEY = "fireguide_payment_return";

export type PaymentReturnContext = {
  amountPaid: number;
  totalAmount: number;
  paidIncentives: number;
  paidBalance: number;
  paidOnline: number;
  orderIds: string[];
  transactionId?: string;
  /** When set, My Quote Request hides Pay after `/payment-success` (see `markCustomQuoteRequestPaidLocally`). */
  quoteRequestId?: number;
};

export function readPaymentReturnContext(): PaymentReturnContext | null {
  try {
    const raw = sessionStorage.getItem(PAYMENT_RETURN_STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<PaymentReturnContext>;
    if (typeof p.amountPaid !== "number") return null;
    const qid = p.quoteRequestId;
    const quoteRequestId =
      typeof qid === "number" && Number.isFinite(qid) && qid > 0
        ? qid
        : typeof qid === "string" && /^\d+$/.test(qid.trim())
          ? parseInt(qid.trim(), 10)
          : undefined;
    return {
      amountPaid: p.amountPaid,
      totalAmount: typeof p.totalAmount === "number" ? p.totalAmount : p.amountPaid,
      paidIncentives: typeof p.paidIncentives === "number" ? p.paidIncentives : 0,
      paidBalance: typeof p.paidBalance === "number" ? p.paidBalance : 0,
      paidOnline: typeof p.paidOnline === "number" ? p.paidOnline : p.amountPaid,
      orderIds: Array.isArray(p.orderIds) ? p.orderIds : [],
      transactionId: typeof p.transactionId === "string" ? p.transactionId : undefined,
      ...(quoteRequestId != null ? { quoteRequestId } : {}),
    };
  } catch {
    return null;
  }
}

export function clearPaymentReturnContext(): void {
  try {
    sessionStorage.removeItem(PAYMENT_RETURN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Normalizes pathname so React Router can match `/payment-success` and `/payment-failed`.
 * Handles `//payment-success` when `FRONTEND_URL` has a trailing slash and Laravel does
 * `config('app.frontend_url') . '/payment-success'`, wrong casing, and trailing slashes.
 */
export function normalizeSpaPathname(pathname: string): string {
  let p = pathname || "";
  try {
    p = decodeURIComponent(p);
  } catch {
    /* keep raw */
  }
  p = p.replace(/^\/+/, "/");
  if (p.length > 1 && p.endsWith("/")) {
    p = p.slice(0, -1);
  }
  const lower = p.toLowerCase();
  if (lower === "/payment-success") return "/payment-success";
  if (lower === "/payment-failed") return "/payment-failed";
  return p;
}

export function isPaymentResultRoutePath(pathname: string): boolean {
  const n = normalizeSpaPathname(pathname);
  return n === "/payment-success" || n === "/payment-failed";
}

/**
 * Stripe often appends `session_id=cs_*` to whatever URL was configured. If the gateway
 * only stored the site origin, the user lands on `/` with query params — treat as success.
 */
export function detectStripeSuccessReturnSearch(search: string): boolean {
  const q = search.startsWith("?") ? search.slice(1) : search;
  try {
    const sp = new URLSearchParams(q);
    const sessionId = sp.get("session_id")?.trim() ?? "";
    if (/^cs_(live|test)_[A-Za-z0-9]+$/.test(sessionId)) return true;
    const pi = sp.get("payment_intent")?.trim() ?? "";
    if (/^pi_[A-Za-z0-9]+$/.test(pi) && sp.get("redirect_status") === "succeeded") return true;
    if (sp.get("payment_status") === "paid") return true;
  } catch {
    /* ignore */
  }
  return false;
}

/** User abandoned checkout or payment was canceled — common query patterns on return URL. */
export function detectStripeCancelReturnSearch(search: string): boolean {
  const q = search.startsWith("?") ? search.slice(1) : search;
  try {
    const sp = new URLSearchParams(q);
    if (sp.get("canceled") === "true") return true;
    const pi = sp.get("payment_intent")?.trim() ?? "";
    if (/^pi_[A-Za-z0-9]+$/.test(pi) && sp.get("redirect_status") === "canceled") return true;
  } catch {
    /* ignore */
  }
  return false;
}
