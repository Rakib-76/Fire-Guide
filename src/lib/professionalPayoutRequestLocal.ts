const STORAGE_KEY = "fireguide_payout_requested_booking_ids";

export function getPayoutRequestedBookingIds(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is number => typeof id === "number" && Number.isFinite(id));
  } catch {
    return [];
  }
}

export function markPayoutRequestedBookingId(bookingId: number): void {
  if (!Number.isFinite(bookingId)) return;
  const current = new Set(getPayoutRequestedBookingIds());
  current.add(bookingId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...current]));
}

export function bookingHasPayoutRequestFromApi(item: Record<string, unknown>): boolean {
  const candidates = [
    item.payout_request,
    item.is_payout_requested,
    item.payout_requested,
    item.payout_request_status,
    item.payout_status,
  ];

  for (const value of candidates) {
    if (value === true || value === 1 || value === "1") return true;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (
        ["requested", "pending", "sent", "submitted", "processing", "approved", "paid"].includes(
          normalized
        )
      ) {
        return true;
      }
    }
  }

  return false;
}
