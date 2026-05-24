const PAID_QUOTE_REQUEST_IDS_KEY = "fireguide_paid_custom_quote_request_ids";

function readPaidQuoteRequestIdsArray(): number[] {
  try {
    const raw = localStorage.getItem(PAID_QUOTE_REQUEST_IDS_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return [];
    return p.filter((x): x is number => typeof x === "number" && Number.isFinite(x) && x > 0);
  } catch {
    return [];
  }
}

/** After successful checkout return (or immediate API success), hide Pay on My Quote Request. */
export function markCustomQuoteRequestPaidLocally(quoteRequestId: number): void {
  if (!Number.isFinite(quoteRequestId) || quoteRequestId <= 0) return;
  try {
    const cur = readPaidQuoteRequestIdsArray();
    if (cur.includes(quoteRequestId)) return;
    cur.push(quoteRequestId);
    localStorage.setItem(PAID_QUOTE_REQUEST_IDS_KEY, JSON.stringify(cur));
  } catch {
    /* ignore */
  }
}

export function isCustomQuoteRequestPaidLocally(quoteRequestId: number): boolean {
  return readPaidQuoteRequestIdsArray().includes(quoteRequestId);
}
