/** Logical professional dashboard modules — maps to sidebar listing pages in `routes.ts`. */
export type ProfessionalNotificationModule =
  | "bookings"
  | "payments"
  | "payout-list"
  | "custom-quote"
  | "reviews"
  | "reports"
  | "verification"
  | "admin-messages"
  | "profile"
  | "pricing-overview"
  | "availability"
  | "notifications"
  | "settings"
  | "dashboard";

export interface ProfessionalNotificationPayload {
  id?: number;
  category?: string;
  type?: string;
  /** Raw API category before UI tab coercion (e.g. identity, insurance, certificate). */
  source_category?: string;
  title?: string;
  content?: string;
  message?: string;
}

export type ProfessionalNavigationMatchSource = "category" | "content" | "default";

export interface ProfessionalSidebarNavigationResult {
  module: ProfessionalNotificationModule;
  path: string;
  matchedBy: ProfessionalNavigationMatchSource;
  ruleId?: string;
}

export interface CategoryNavigationRule {
  id: string;
  module: ProfessionalNotificationModule;
  match: (category: string) => boolean;
}

export interface ContentNavigationRule {
  id: string;
  module: ProfessionalNotificationModule;
  pattern: RegExp;
}
