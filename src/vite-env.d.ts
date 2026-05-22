/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Override API root (e.g. https://firesafety-backend.fireguide.co.uk/api). If unset, see DEFAULT_API_BASE_URL in src/lib/apiBaseUrl.ts */
  readonly VITE_API_BASE_URL?: string;
  /** Public site origin for payment redirects, e.g. http://103.208.181.252:3000 */
  readonly VITE_PUBLIC_APP_URL?: string;
  readonly VITE_CUSTOMER_SOCIAL_AUTH_APPLE_URL?: string;
  readonly VITE_CUSTOMER_SOCIAL_AUTH_FACEBOOK_URL?: string;
  [key: string]: any;
}

declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

