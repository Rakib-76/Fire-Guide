/**
 * Parses monetary strings from the API (e.g. "77,875.52", "77.00", "77875.52").
 */
export function parseApiMoneyAmount(value: string | number | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  let s = String(value).trim().replace(/[£$€\s]/g, "");
  if (!s) return 0;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      // e.g. 77.875,52 — dot thousands, comma decimal
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // e.g. 77,875.52 — comma thousands, dot decimal
      s = s.replace(/,/g, "");
    }
  } else if (lastComma !== -1) {
    const afterComma = s.slice(lastComma + 1);
    if (afterComma.length <= 2) {
      s = s.replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  }

  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

/** GBP display for dashboard amounts */
export function formatGbp(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
