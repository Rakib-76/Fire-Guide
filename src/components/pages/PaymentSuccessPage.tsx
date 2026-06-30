import { useMemo, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  CheckCircle,
  CreditCard,
  Home,
  LayoutDashboard,
  Mail,
  Receipt,
} from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import logoImage from "figma:asset/69744b74419586d01801e7417ef517136baf5cfb.png";
import {
  readPaymentReturnContext,
  clearPaymentReturnContext,
} from "../../lib/paymentAppUrls";
import { markCustomQuoteRequestPaidLocally } from "../../lib/customQuotePaymentLocal";
import { markBookingPaidLocally } from "../../lib/bookingPaymentStatus";

function formatMoney(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return `£${v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  fromCtx: number | undefined
): number | null {
  const lower = searchParamsLowercaseMap(search);
  const raw = lower.get(key.toLowerCase());
  if (raw !== undefined && raw !== "") {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  if (typeof fromCtx === "number" && Number.isFinite(fromCtx)) return fromCtx;
  return null;
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
    if (c?.bookingId != null && Number.isFinite(c.bookingId) && c.bookingId > 0) {
      markBookingPaidLocally(c.bookingId);
    } else if (c?.orderIds?.length) {
      for (const oid of c.orderIds) {
        const m = /^FG-(\d+)$/i.exec(String(oid).trim());
        if (m) markBookingPaidLocally(parseInt(m[1], 10));
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
    return fromUrl || fromCtx;
  }, [search, ctx]);

  const lowerSearch = useMemo(() => searchParamsLowercaseMap(search), [search]);
  const orderIdsParam =
    lowerSearch.get("order_ids") ?? lowerSearch.get("orderids") ?? null;
  const fromParam =
    orderIdsParam?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const orderIds =
    fromParam.length > 0 ? fromParam : ctx?.orderIds?.length ? ctx.orderIds : [];

  const amountPaid = pickAmount(search, "amount_paid", ctx?.amountPaid);
  const totalAmount = pickAmount(search, "total", ctx?.totalAmount);
  const paidIncentives = pickAmount(search, "incentives", ctx?.paidIncentives);
  const paidBalance = pickAmount(search, "balance", ctx?.paidBalance);
  const paidOnline = pickAmount(search, "online", ctx?.paidOnline);

  const hasBooking = ctx?.bookingId != null && ctx.bookingId > 0;
  const hasQuote = ctx?.quoteRequestId != null && ctx.quoteRequestId > 0;
  const showBreakdown =
    paidIncentives != null ||
    paidBalance != null ||
    (paidOnline != null && amountPaid != null && paidOnline !== amountPaid);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm text-[#0A1A2F] py-3 px-4 md:px-6">
        <div className="max-w-7xl mx-auto flex items-center">
          <Link
            to="/"
            className="flex items-center cursor-pointer hover:opacity-90 transition-opacity"
            aria-label="Go to home"
          >
            <img src={logoImage} alt="Fire Guide" className="h-12 w-auto" />
          </Link>
        </div>
      </header>

      <main className="py-10 px-4 md:px-6 md:py-14">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-12 h-12 text-green-600" strokeWidth={2} aria-hidden />
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold text-[#0A1A2F] mb-2">
              Payment successful
            </h1>
            <p className="text-lg text-gray-600 max-w-md mx-auto">
              {amountPaid != null ? (
                <>
                  Thank you! Your payment of{" "}
                  <span className="font-semibold text-[#0A1A2F]">{formatMoney(amountPaid)}</span>{" "}
                  has been received.
                </>
              ) : (
                "Thank you! Your payment has been received and is being processed."
              )}
            </p>

            {(orderIds.length > 0 || transactionId) && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
                {orderIds.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 shadow-sm"
                  >
                    <Receipt className="w-3.5 h-3.5 text-gray-400" aria-hidden />
                    <span className="text-gray-500">Order</span>
                    <span className="font-semibold text-[#0A1A2F]">{id}</span>
                  </span>
                ))}
                {transactionId && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 shadow-sm max-w-full">
                    <CreditCard className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden />
                    <span className="text-gray-500 shrink-0">Transaction</span>
                    <span className="font-medium text-[#0A1A2F] truncate">{transactionId}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          <Card className="mb-6 border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <h2 className="text-xl text-[#0A1A2F] mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-red-600" />
                Payment summary
              </h2>

              <div className="space-y-3">
                {totalAmount != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total amount</span>
                    <span className="font-medium text-gray-900">{formatMoney(totalAmount)}</span>
                  </div>
                )}

                {showBreakdown && (
                  <>
                    {paidIncentives != null && paidIncentives > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Paid via incentives</span>
                        <span className="font-medium text-gray-900">{formatMoney(paidIncentives)}</span>
                      </div>
                    )}
                    {paidBalance != null && paidBalance > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Paid via account balance</span>
                        <span className="font-medium text-gray-900">{formatMoney(paidBalance)}</span>
                      </div>
                    )}
                    {paidOnline != null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Paid online</span>
                        <span className="font-medium text-gray-900">{formatMoney(paidOnline)}</span>
                      </div>
                    )}
                  </>
                )}

                {amountPaid != null && (
                  <div className="flex justify-between pt-3 border-t border-gray-100">
                    <span className="font-semibold text-gray-900">Amount paid</span>
                    <span className="text-2xl font-semibold text-green-600">{formatMoney(amountPaid)}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" aria-hidden />
                <span className="text-sm text-green-900">Your payment was processed securely</span>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8 bg-gradient-to-br from-red-50/60 to-white border-red-100">
            <CardContent className="p-6">
              <h2 className="text-xl text-[#0A1A2F] mb-4">What happens next?</h2>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-semibold shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Payment confirmation</p>
                    <p className="text-sm text-gray-600">
                      You&apos;ll receive a receipt by email once the payment is fully confirmed.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-semibold shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {hasBooking ? "Booking updated" : hasQuote ? "Quote request updated" : "Account updated"}
                    </p>
                    <p className="text-sm text-gray-600">
                      {hasBooking
                        ? "Your booking status will update shortly in My Bookings."
                        : hasQuote
                          ? "Your quote request will show as paid in your dashboard."
                          : "Your payment will appear in your Fire Guide account shortly."}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-semibold shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Need help?</p>
                    <p className="text-sm text-gray-600 flex items-start gap-1.5">
                      <Mail className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" aria-hidden />
                      <span>
                        Contact us at{" "}
                        <a
                          href="mailto:support@fireguide.co.uk"
                          className="text-red-600 hover:underline font-medium"
                        >
                          support@fireguide.co.uk
                        </a>{" "}
                        if you have any questions about this payment.
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1 py-6 border-gray-300"
              onClick={() => navigate("/customer/dashboard")}
            >
              <LayoutDashboard className="w-5 h-5 mr-2" />
              My dashboard
            </Button>
            <Button
              onClick={() => navigate("/")}
              className="flex-1 bg-red-600 hover:bg-red-700 py-6"
            >
              <Home className="w-5 h-5 mr-2" />
              Back to home
            </Button>
          </div>

          <p className="text-center text-xs text-gray-500 mt-6 leading-relaxed">
            It may take a few moments for your payment to appear in your account.
          </p>
        </div>
      </main>
    </div>
  );
}
