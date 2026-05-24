const STORAGE_KEY = "fireguide_renewal_requested_booking_ids";

export function getRenewalRequestedBookingIds(): number[] {
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

export function markRenewalRequestedBookingId(bookingId: number): void {
  if (!Number.isFinite(bookingId)) return;
  const current = new Set(getRenewalRequestedBookingIds());
  current.add(bookingId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...current]));
}

export function bookingHasRenewalRequestFromApi(item: Record<string, unknown>): boolean {
  const candidates = [
    item.renewal_request,
    item.is_renewal_requested,
    item.renewal_requested,
    item.renewal_request_status,
    item.is_renewal_sent,
    item.renewal_sent,
  ];

  for (const value of candidates) {
    if (value === true || value === 1 || value === "1") return true;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (
        ["requested", "pending", "sent", "submitted", "processing", "approved", "already sent"].some(
          (s) => normalized.includes(s)
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

export function isRenewalAlreadySentMessage(message: string | undefined | null): boolean {
  if (!message?.trim()) return false;
  return /already\s+sent|already\s+requested|renewal\s+request\s+already/i.test(message);
}
