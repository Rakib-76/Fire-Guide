/** Parsed custom quote `request_data` (object form — matches what we send on store). */
export type ParsedCustomQuoteRequestData = Record<string, unknown>;

/**
 * Backend stores `json_encode($request_data)` and often returns it as a JSON string.
 * Normalize to a plain object everywhere we read quote requests.
 */
export function parseCustomQuoteRequestData(raw: unknown): ParsedCustomQuoteRequestData {
  if (raw == null) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as ParsedCustomQuoteRequestData;
  }
  if (typeof raw !== "string") return {};

  let current: unknown = raw.trim();
  if (current === "") return {};

  for (let depth = 0; depth < 3; depth += 1) {
    if (typeof current !== "string") break;
    try {
      current = JSON.parse(current);
    } catch {
      return {};
    }
  }

  if (current && typeof current === "object" && !Array.isArray(current)) {
    return current as ParsedCustomQuoteRequestData;
  }
  return {};
}

export function normalizeCustomQuoteRequestDataField<T extends { request_data?: unknown }>(
  item: T
): T & { request_data: ParsedCustomQuoteRequestData } {
  return {
    ...item,
    request_data: parseCustomQuoteRequestData(item.request_data),
  };
}

export function normalizeCustomQuoteDetailsBlock(
  details: { request_data?: unknown; [key: string]: unknown } | null | undefined
): typeof details {
  if (!details || typeof details !== "object") return details;
  return {
    ...details,
    request_data: parseCustomQuoteRequestData(details.request_data),
  };
}
