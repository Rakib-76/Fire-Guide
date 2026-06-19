/** Logical admin modules — maps to sidebar listing pages in `routes.ts`. */
export type AdminNotificationModule =
  | "bookings"
  | "payments"
  | "custom-quote"
  | "reviews"
  | "reports"
  | "professionals"
  | "customers"
  | "payout"
  | "services"
  | "notifications"
  | "settings"
  | "dashboard";

export interface AdminNotificationPayload {
  id?: number;
  category?: string;
  type?: string;
  /** Raw API category/type (e.g. identity, insurance, certificate). */
  source_category?: string;
  title?: string;
  content?: string;
  /** Admin API field name for body text. */
  message?: string;
}

export type AdminNavigationMatchSource = "category" | "content" | "default";

export interface AdminSidebarNavigationResult {
  module: AdminNotificationModule;
  path: string;
  matchedBy: AdminNavigationMatchSource;
  /** Rule id from config — useful when extending mappings. */
  ruleId?: string;
}

export interface CategoryNavigationRule {
  id: string;
  module: AdminNotificationModule;
  /** Receives normalized lowercase category string. */
  match: (category: string) => boolean;
}

export interface ContentNavigationRule {
  id: string;
  module: AdminNotificationModule;
  pattern: RegExp;
}
