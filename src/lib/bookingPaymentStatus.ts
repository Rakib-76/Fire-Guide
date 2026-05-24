const PAID_STATUS_TOKENS = new Set(["paid", "completed", "succeeded", "success"]);

const PAID_BOOKING_IDS_KEY = "fireguide_paid_booking_ids";

export type BookingPaymentSource = {
  id?: number;
  is_paid?: boolean | number | string | null;
  payment_status?: string | null;
  payment?: {
    status?: string | null;
    is_paid?: boolean | number | string | null;
    payment_status?: string | null;
  } | null;
};

function normalizePaymentToken(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function isPaidTruthy(raw: unknown): boolean | null {
  if (raw === true || raw === 1 || raw === "1") return true;
  if (raw === false || raw === 0 || raw === "0") return false;
  if (typeof raw === "string") {
    const token = raw.trim().toLowerCase();
    if (token === "" || token === "false" || token === "no" || token === "unpaid") return false;
    if (PAID_STATUS_TOKENS.has(token) || token === "true" || token === "yes") return true;
  }
  return null;
}

function readPaidBookingIdsArray(): number[] {
  try {
    const raw = localStorage.getItem(PAID_BOOKING_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is number => typeof id === "number" && Number.isFinite(id) && id > 0);
  } catch {
    return [];
  }
}

/** After successful checkout return, hide Pay until API `is_paid` / `payment.status` catches up. */
export function markBookingPaidLocally(bookingId: number): void {
  if (!Number.isFinite(bookingId) || bookingId <= 0) return;
  try {
    const current = readPaidBookingIdsArray();
    if (current.includes(bookingId)) return;
    current.push(bookingId);
    localStorage.setItem(PAID_BOOKING_IDS_KEY, JSON.stringify(current));
  } catch {
    /* ignore */
  }
}

export function isBookingPaidLocally(bookingId: number): boolean {
  return readPaidBookingIdsArray().includes(bookingId);
}

export function isBookingPaymentPaid(source: BookingPaymentSource): boolean {
  if (source.id != null && isBookingPaidLocally(source.id)) return true;

  const rootPaid = isPaidTruthy(source.is_paid);
  if (rootPaid === true) return true;

  const rootStatus = normalizePaymentToken(source.payment_status);
  if (PAID_STATUS_TOKENS.has(rootStatus)) return true;

  if (source.payment) {
    const nestedPaid = isPaidTruthy(source.payment.is_paid);
    if (nestedPaid === true) return true;

    const nestedStatus = normalizePaymentToken(
      source.payment.payment_status ?? source.payment.status
    );
    if (PAID_STATUS_TOKENS.has(nestedStatus)) return true;
  }

  return false;
}

export function getBookingPaymentStatusKey(source: BookingPaymentSource): string {
  if (isBookingPaymentPaid(source)) return "paid";

  const candidates = [
    source.payment_status,
    source.payment?.payment_status,
    source.payment?.status,
  ];

  for (const candidate of candidates) {
    const token = normalizePaymentToken(candidate);
    if (!token) continue;
    if (token === "failed" || token === "failure") return "failed";
    if (token === "refunded" || token === "refund") return "refunded";
    if (token === "pending") return "pending";
    if (token === "unpaid") return "unpaid";
    if (PAID_STATUS_TOKENS.has(token)) return "paid";
    return token;
  }

  return "unpaid";
}

export function getBookingPaymentStatusLabel(status: string): string {
  switch (status) {
    case "paid":
      return "Paid";
    case "unpaid":
      return "Unpaid";
    case "pending":
      return "Pending";
    case "failed":
      return "Failed";
    case "refunded":
      return "Refunded";
    default:
      if (!status) return "Unpaid";
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}
