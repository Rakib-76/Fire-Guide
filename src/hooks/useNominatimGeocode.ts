import { useState, useEffect, useRef } from "react";

export type GeocodeStatus = "idle" | "loading" | "ok" | "not_found" | "error";

export interface GeocodeResult {
  lat: number;
  lon: number;
  displayName: string;
}

const NOMINATIM = "https://nominatim.openstreetmap.org/search";

/**
 * Debounced forward geocoding (UK-biased) via OpenStreetMap Nominatim.
 * Suitable for low-frequency UI typing; for high traffic, proxy through your backend
 * (see https://operations.osmfoundation.org/policies/nominatim/).
 */
export function useNominatimGeocode(query: string, debounceMs = 550) {
  const [status, setStatus] = useState<GeocodeStatus>("idle");
  const [result, setResult] = useState<GeocodeResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (timerRef.current) clearTimeout(timerRef.current);

    if (q.length < 2) {
      if (abortRef.current) abortRef.current.abort();
      setStatus("idle");
      setResult(null);
      return;
    }

    timerRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setStatus("loading");

      const url = new URL(NOMINATIM);
      url.searchParams.set("format", "json");
      url.searchParams.set("limit", "1");
      url.searchParams.set("countrycodes", "gb");
      url.searchParams.set("q", q);

      try {
        const res = await fetch(url.toString(), {
          signal: ac.signal,
          headers: {
            Accept: "application/json",
            // Nominatim policy: identify the app (browsers may override User-Agent)
            "Accept-Language": "en-GB",
          },
        });
        if (!res.ok) {
          setStatus("error");
          setResult(null);
          return;
        }
        const data = (await res.json()) as { lat?: string; lon?: string; display_name?: string }[];
        const first = data[0];
        if (!first?.lat || !first?.lon) {
          setStatus("not_found");
          setResult(null);
          return;
        }
        setResult({
          lat: parseFloat(first.lat),
          lon: parseFloat(first.lon),
          displayName: first.display_name ?? q,
        });
        setStatus("ok");
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setStatus("error");
        setResult(null);
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, debounceMs]);

  return { status, result };
}
