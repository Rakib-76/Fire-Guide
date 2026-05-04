import { useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Check } from "lucide-react";
import {
  readPaymentReturnContext,
  clearPaymentReturnContext,
} from "../../lib/paymentAppUrls";
import { markCustomQuoteRequestPaidLocally } from "../../lib/customQuotePaymentLocal";

const GREEN = "#7ED321";
const NAVY = "#004A73";

function formatMoney(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return `£ ${v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Lowercase keys → value (Stripe / gateways vary in casing). */
function searchParamsLowercaseMap(search: string): Map<string, string> {
  const m = new Map<string, string>();
  const q = search.startsWith("?") ? search.slice(1) : search;
  try {
    new URLSearchParams(q).forEach((v, k) => {
      const t = v.trim();
      if (t) m.set(k.toLowerCase(), t);
    });
  } catch {
    /* ignore */
  }
  return m;
}

const TX_QUERY_KEYS = [
  "session_id",
  "checkout_session_id",
  "stripe_session",
  "payment_intent",
  "payment_intent_id",
  "transaction_id",
  "tx_ref",
  "txn_id",
  "ref",
];

/** Known query keys; also finds `cs_*` / `pi_*` values whatever the key name. */
function transactionIdFromReturnUrl(search: string): string | null {
  const lower = searchParamsLowercaseMap(search);
  for (const key of TX_QUERY_KEYS) {
    const v = lower.get(key);
    if (v) return v;
  }
  const q = search.startsWith("?") ? search.slice(1) : search;
  try {
    const sp = new URLSearchParams(q);
    const stripeLike = /^cs_(live|test)_[A-Za-z0-9]+$|^pi_[A-Za-z0-9]+$|^seti_[A-Za-z0-9]+$/;
    for (const [, value] of sp) {
      const t = value.trim();
      if (stripeLike.test(t)) return t;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function pickAmount(
  search: string,
  key: string,
  fromCtx: number | undefined,
  demo: number
): number {
  const lower = searchParamsLowercaseMap(search);
  const raw = lower.get(key.toLowerCase());
  if (raw !== undefined && raw !== "") {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  if (typeof fromCtx === "number" && Number.isFinite(fromCtx)) return fromCtx;
  return demo;
}

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const search = location.search ?? "";

  const ctx = useMemo(() => readPaymentReturnContext(), []);

  useEffect(() => {
    const c = readPaymentReturnContext();
    if (c?.quoteRequestId != null && Number.isFinite(c.quoteRequestId) && c.quoteRequestId > 0) {
      markCustomQuoteRequestPaidLocally(c.quoteRequestId);
    } else if (c?.orderIds?.length) {
      for (const oid of c.orderIds) {
        const m = /^Quote #(\d+)$/i.exec(String(oid).trim());
        if (m) markCustomQuoteRequestPaidLocally(parseInt(m[1], 10));
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      clearPaymentReturnContext();
    };
  }, []);

  const transactionId = useMemo(() => {
    const fromUrl =
      transactionIdFromReturnUrl(search) ||
      (typeof window !== "undefined" && window.location.search && window.location.search !== search
        ? transactionIdFromReturnUrl(window.location.search)
        : null);
    const fromCtx =
      ctx?.transactionId && String(ctx.transactionId).trim().length > 0
        ? String(ctx.transactionId).trim()
        : null;
    return fromUrl || fromCtx || (ctx != null ? "Pending" : "12345");
  }, [search, ctx]);

  const lowerSearch = useMemo(() => searchParamsLowercaseMap(search), [search]);
  const orderIdsParam =
    lowerSearch.get("order_ids") ?? lowerSearch.get("orderids") ?? null;
  const fromParam =
    orderIdsParam?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const orderIds =
    fromParam.length > 0
      ? fromParam
      : ctx?.orderIds?.length
        ? ctx.orderIds
        : ["IC-1234", "IC-5678"];

  const amountPaid = pickAmount(search, "amount_paid", ctx?.amountPaid, 3000);
  const totalAmount = pickAmount(search, "total", ctx?.totalAmount, 5000);
  const paidIncentives = pickAmount(search, "incentives", ctx?.paidIncentives, 1000);
  const paidBalance = pickAmount(search, "balance", ctx?.paidBalance, 1000);
  const paidOnline = pickAmount(search, "online", ctx?.paidOnline, 3000);

  const orderLine =
    orderIds.length > 0
      ? `Order ID : ${orderIds.join(", ")}`
      : "Order ID : —";
  const txLine = `Transaction ID : ${transactionId}`;

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10 sm:py-14 bg-white mt-4">
      <div className="w-full max-w-lg flex flex-col items-center text-center">
        <div
          className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full flex items-center justify-center mb-5 sm:mb-6 shrink-0"
          style={{ backgroundColor: GREEN }}
          aria-hidden
        >
          <Check className="w-9 h-9 sm:w-10 sm:h-10 text-white stroke-[3]" strokeWidth={3} />
        </div>

        <h1
          className="text-2xl sm:text-3xl font-semibold tracking-tight mb-6 sm:mb-8"
          style={{ color: GREEN }}
        >
          Payment Successful !
        </h1>

        <p className="text-gray-900 font-bold text-base sm:text-lg mb-2 px-1">
          Thank you! Your payment of {formatMoney(amountPaid)} has been received.
        </p>
        <p className="text-gray-500 text-sm mb-8 sm:mb-10 leading-relaxed">
          {orderLine} | {txLine}
        </p>

        <p className="text-gray-400 text-sm font-medium w-full max-w-md text-left mb-2">
          Payment Details
        </p>
        <div className="w-full max-w-lg rounded-lg border border-gray-300 bg-white px-5 py-5 sm:px-6 sm:py-6 mb-8 sm:mb-10 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4 text-sm text-left p-2">
            <div className="space-y-4">
              <div>
                <span className="text-gray-600">Total Amount : </span>
                <span className="text-gray-900 font-medium">{formatMoney(totalAmount)}</span>
              </div>
              <div>
                <span className="text-gray-600">Paid via Incentives : </span>
                <span className="text-gray-900 font-medium">{formatMoney(paidIncentives)}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <span className="text-gray-600">Paid via Fire Guide Account Balance : </span>
                <span className="text-gray-900 font-medium">{formatMoney(paidBalance)}</span>
              </div>
              <div>
                <span className="text-gray-600">Paid via Online Transaction : </span>
                <span className="text-gray-900 font-medium">{formatMoney(paidOnline)}</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-gray-600 text-sm mb-2 max-w-md">
          Please wait for some time for the amount to show up in your Fire Guide account.
        </p>
        <p className="text-gray-400 text-xs mb-8 sm:mb-10 max-w-md leading-relaxed">
          Please contact us at{" "}
          <a href="mailto:support@fireguide.co.uk" className="text-gray-500 underline-offset-2 hover:underline">
            support@fireguide.co.uk
          </a>{" "}
          for any query.
        </p>

        <button
          type="button"
          onClick={() => navigate("/")}
          className="px-8 py-3 text-white cursor-pointer  text-sm font-semibold uppercase tracking-wide rounded-sm shadow-sm hover:opacity-95 transition-opacity"
          style={{ backgroundColor: NAVY }}
        >
          Home
        </button>
      </div>
    </div>
  );
}
