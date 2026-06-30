/** YYYY-MM-DD from API date/datetime strings. */
export function parseBookingDateKey(dateStr: string): string {
  if (!dateStr) return "";
  return dateStr.trim().split(/[\sT]/)[0];
}

/** Normalize slot labels so UI "9:00 AM", API "09:00 AM", and "09:00:00" compare equal. */
export function normalizeSlotForBookingComparison(slot: string): string {
  const t = slot.trim();
  const match12 = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    const hour = parseInt(match12[1], 10);
    const min = match12[2];
    const ampm = match12[3].toUpperCase();
    return `${hour}:${min} ${ampm}`;
  }
  const match24 = t.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match24) {
    const h = parseInt(match24[1], 10);
    const min = match24[2];
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${min} ${ampm}`;
  }
  return t;
}

export const FALLBACK_BOOKING_SLOT_GRID = [
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
] as const;

export interface BookingDateSlotsRow {
  date: string;
  slots?: string[];
}

function slotToMinutes(slot: string): number {
  const normalized = normalizeSlotForBookingComparison(slot);
  const match = normalized.match(/^(\d{1,2}):(\d{2}) (AM|PM)$/);
  if (!match) return 0;
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const isPm = match[3] === "PM";
  if (isPm && hour !== 12) hour += 12;
  if (!isPm && hour === 12) hour = 0;
  return hour * 60 + minute;
}

/** Build the slot grid shown in the calendar from API rows (e.g. 9:00 AM–4:00 PM). */
export function deriveBookingSlotGridFromAvailability(
  dates: BookingDateSlotsRow[]
): string[] {
  const seen = new Map<string, string>();

  for (const row of dates) {
    for (const slot of row.slots ?? []) {
      const key = normalizeSlotForBookingComparison(slot);
      if (key && !seen.has(key)) {
        seen.set(key, key);
      }
    }
  }

  if (seen.size === 0) {
    return [...FALLBACK_BOOKING_SLOT_GRID];
  }

  return [...seen.keys()].sort((a, b) => slotToMinutes(a) - slotToMinutes(b));
}

/**
 * If the date exists in the API payload, only those slots are selectable.
 * Otherwise (e.g. next month), all slots from the derived grid are enabled.
 */
export function resolveAvailableSlotsForDate(
  selectedDate: string,
  dates: BookingDateSlotsRow[],
  slotGrid: string[]
): Set<string> {
  if (!selectedDate) return new Set();

  const entry = dates.find(
    (row) => parseBookingDateKey(row.date) === parseBookingDateKey(selectedDate)
  );

  if (entry?.slots?.length) {
    return new Set(entry.slots.map((slot) => normalizeSlotForBookingComparison(slot)));
  }

  return new Set(slotGrid.map((slot) => normalizeSlotForBookingComparison(slot)));
}
