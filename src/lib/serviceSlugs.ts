/** Map service display names to public SEO-friendly URL slugs. */
const SERVICE_SLUG_BY_KEY: Record<string, string> = {
  "fire risk assessment": "fire-risk-assessment",
  "fire alarm": "fire-alarm-service",
  "fire extinguisher": "fire-extinguisher-service",
  "emergency lighting": "emergency-lighting-test",
  "fire marshal": "fire-marshal-training",
  warden: "fire-marshal-training",
  marshal: "fire-marshal-training",
  "fire safety consultation": "fire-safety-consultation",
};

export function serviceNameToSlug(name: string): string {
  const lower = name.toLowerCase().trim();
  for (const [key, slug] of Object.entries(SERVICE_SLUG_BY_KEY)) {
    if (lower.includes(key)) return slug;
  }
  return lower
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isNumericServiceIdSegment(segment: string): boolean {
  return /^\d+$/.test(segment);
}

export const KNOWN_SERVICE_SLUGS = new Set(Object.values(SERVICE_SLUG_BY_KEY));
