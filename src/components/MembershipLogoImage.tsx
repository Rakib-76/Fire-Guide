import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Award } from "lucide-react";
import { getMembershipMediaUrlCandidates } from "../api/membershipService";
import { getApiToken } from "../lib/auth";

type MembershipLogoImageProps = {
  logoPath: string;
  alt: string;
  className?: string;
  /** Shown when the logo cannot be loaded (default: small award icon). */
  fallbackClassName?: string;
};

/**
 * Membership logos from API paths (e.g. option.logo / membership/...).
 * Re-resolves URLs after mount so auth token hydration does not leave a blank tile.
 * Does not rely on onLoad alone — handles already-cached images on client navigation.
 */
export function MembershipLogoImage({
  logoPath,
  alt,
  className,
  fallbackClassName = "h-5 w-5 text-blue-600",
}: MembershipLogoImageProps) {
  const trimmedPath = logoPath.trim();
  const [token, setToken] = useState(() => getApiToken() ?? "");

  useEffect(() => {
    const syncToken = () => setToken(getApiToken() ?? "");
    syncToken();
    const t1 = window.setTimeout(syncToken, 0);
    const t2 = window.setTimeout(syncToken, 150);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [trimmedPath]);

  const urls = useMemo(
    () => getMembershipMediaUrlCandidates(trimmedPath, { apiToken: token }),
    [trimmedPath, token]
  );

  const [urlIndex, setUrlIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const src = urls[urlIndex] ?? "";

  useEffect(() => {
    setUrlIndex(0);
    setFailed(false);
  }, [trimmedPath, urls]);

  useLayoutEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      setFailed(false);
    }
  }, [src, urlIndex]);

  if (!trimmedPath) {
    return <Award className={fallbackClassName} aria-hidden />;
  }

  if (failed || !src) {
    return <Award className={fallbackClassName} aria-hidden />;
  }

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      title={alt}
      className={className}
      onError={() => {
        setUrlIndex((current) => {
          if (current >= urls.length - 1) {
            setFailed(true);
            return current;
          }
          return current + 1;
        });
      }}
    />
  );
}
