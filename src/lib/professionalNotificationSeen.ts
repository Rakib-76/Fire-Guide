const STORAGE_KEY = "fireguide_professional_notification_seen_keys";

const SEEN_EVENT = "fg-professional-notifications-seen";
const MUTATED_EVENT = "fg-professional-notifications-mutated";

export function loadProfessionalNotificationSeenKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string" && x.length > 0));
  } catch {
    return new Set();
  }
}

export function persistProfessionalNotificationSeenKeys(keys: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...keys]));
  } catch {
    /* ignore */
  }
}

/** Merge keys and notify listeners (header badge). */
export function mergeProfessionalNotificationSeenKeys(newKeys: Iterable<string>): void {
  const merged = loadProfessionalNotificationSeenKeys();
  for (const k of newKeys) merged.add(k);
  persistProfessionalNotificationSeenKeys(merged);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SEEN_EVENT));
  }
}

export function emitProfessionalNotificationsMutated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(MUTATED_EVENT));
  }
}

export function subscribeProfessionalNotificationSeen(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const fn = () => listener();
  window.addEventListener(SEEN_EVENT, fn);
  return () => window.removeEventListener(SEEN_EVENT, fn);
}

export function subscribeProfessionalNotificationMutated(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const fn = () => listener();
  window.addEventListener(MUTATED_EVENT, fn);
  return () => window.removeEventListener(MUTATED_EVENT, fn);
}
