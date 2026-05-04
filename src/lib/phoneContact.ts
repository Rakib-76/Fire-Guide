/**
 * Utilities for “Call now”: resolve phone from API-shaped objects, clipboard copy, and tel: dialer.
 */

function pickFirstNonEmptyPhone(
  ...candidates: Array<string | number | null | undefined>
): string | null {
  for (const c of candidates) {
    if (c == null) continue;
    const s = typeof c === "number" ? String(c) : String(c).trim();
    if (s.length > 0) return s;
  }
  return null;
}

/**
 * Reads common phone field names from professional-profile/details and list/compare payloads.
 */
export function resolveProfessionalDisplayPhone(
  profileDetails: Record<string, unknown> | null | undefined,
  professional: Record<string, unknown> | null | undefined
): string | null {
  const d = profileDetails ?? undefined;
  const p = professional ?? undefined;
  return pickFirstNonEmptyPhone(
    d?.phone as string | undefined,
    d?.contact_number as string | undefined,
    d?.contact_no as string | undefined,
    d?.mobile as string | undefined,
    d?.phone_number as string | undefined,
    d?.number as string | undefined,
    p?.phone as string | undefined,
    p?.contact_number as string | undefined,
    p?.mobile as string | undefined,
    p?.phone_number as string | undefined,
    /** List API (`ProfessionalResponse`) uses `number` for the contact line */
    p?.number as string | number | undefined
  );
}

/**
 * Copies text to the clipboard. Returns false if unsupported or both modern and legacy paths fail.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to execCommand */
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    ta.setAttribute("aria-hidden", "true");
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Builds a `tel:` href from a human-entered or API string (keeps leading +, strips other non-digits).
 */
export function buildTelHref(displayOrRawPhone: string): string | null {
  const raw = displayOrRawPhone.trim();
  if (!raw) return null;

  const digitsPlus = raw.replace(/[^\d+]/g, "");
  if (!digitsPlus) return null;

  let body: string;
  if (digitsPlus.startsWith("+")) {
    body = "+" + digitsPlus.slice(1).replace(/\D/g, "");
  } else {
    body = digitsPlus.replace(/\D/g, "");
  }

  if (!body || body === "+") return null;
  return `tel:${body}`;
}

/** Programmatically opens the device dialer when the browser allows it. */
export function openTelDialer(displayOrRawPhone: string): void {
  const href = buildTelHref(displayOrRawPhone);
  if (!href) return;

  const a = document.createElement("a");
  a.href = href;
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
