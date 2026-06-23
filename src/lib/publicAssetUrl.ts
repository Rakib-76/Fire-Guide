/** Resolve a public-folder asset URL (respects Vite `base`). */
export function publicAssetUrl(path: string): string {
  const normalized = path.replace(/^\//, "");
  const base = import.meta.env.BASE_URL ?? "/";
  return `${base}${normalized}`;
}
