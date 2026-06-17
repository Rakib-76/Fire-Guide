/** Logical customer dashboard modules — maps to sidebar listing pages in `routes.ts`. */
export type CustomerNotificationModule =
  | "overview"
  | "bookings"
  | "payments"
  | "quote-requests"
  | "reviews"
  | "reports"
  | "profile"
  | "admin-messages"
  | "notifications"
  | "settings";

export interface CustomerNotificationPayload {
  id?: number;
  category?: string;
  type?: string;
  title?: string;
  content?: string;
  message?: string;
}

export type CustomerNavigationMatchSource = "category" | "content" | "default";

export interface CustomerSidebarNavigationResult {
  module: CustomerNotificationModule;
  path: string;
  matchedBy: CustomerNavigationMatchSource;
  ruleId?: string;
}

export interface CategoryNavigationRule {
  id: string;
  module: CustomerNotificationModule;
  match: (category: string) => boolean;
}

export interface ContentNavigationRule {
  id: string;
  module: CustomerNotificationModule;
  pattern: RegExp;
}
