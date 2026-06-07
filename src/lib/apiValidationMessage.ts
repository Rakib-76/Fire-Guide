/**
 * Laravel-style validation payloads often use `errors` or `data` with field → string[].
 * Example: { message: "Validation failed", data: { email: ["The email has already been taken."] } }
 */
export function formatApiErrorMessage(
  payload: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (!payload || typeof payload !== "object") return fallback;
  const body = payload as Record<string, unknown>;

  const fieldBag = body.errors ?? body.data;
  if (fieldBag && typeof fieldBag === "object" && !Array.isArray(fieldBag)) {
    const lines: string[] = [];
    for (const value of Object.values(fieldBag as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === "string" && item.trim()) lines.push(item.trim());
        }
      } else if (typeof value === "string" && value.trim()) {
        lines.push(value.trim());
      }
    }
    if (lines.length > 0) return lines.join(" ");
  }

  if (typeof body.message === "string" && body.message.trim()) {
    return body.message.trim();
  }
  if (typeof body.error === "string" && body.error.trim()) {
    return body.error.trim();
  }

  return fallback;
}
