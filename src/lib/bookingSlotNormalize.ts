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
