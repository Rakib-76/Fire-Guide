import type { CategoryNavigationRule, ContentNavigationRule } from "./types";

export const GENERIC_CUSTOMER_NOTIFICATION_CATEGORIES = new Set([
  "",
  "general",
  "unknown",
  "notification",
  "notifications",
  "alert",
  "alerts",
  "system",
]);

/**
 * Primary mapping: notification `category` → customer sidebar module.
 */
export const CUSTOMER_NOTIFICATION_CATEGORY_RULES: readonly CategoryNavigationRule[] = [
  {
    id: "category-booking",
    module: "bookings",
    match: (c) => /booking/.test(c),
  },
  {
    id: "category-payment",
    module: "payments",
    match: (c) => /payment|payout|refund|transaction|invoice/.test(c),
  },
  {
    id: "category-quote",
    module: "quote-requests",
    match: (c) => /quote|custom.?quote/.test(c),
  },
  {
    id: "category-review",
    module: "notifications",
    match: (c) => /review|rating|feedback/.test(c),
  },
  {
    id: "category-report",
    module: "reports",
    match: (c) => /report/.test(c),
  },
  {
    id: "category-profile",
    module: "profile",
    match: (c) => /profile|account|address/.test(c),
  },
  {
    id: "category-admin-message",
    module: "admin-messages",
    match: (c) => /admin.?message|message|inbox|support/.test(c),
  },
  {
    id: "category-service",
    module: "bookings",
    match: (c) => /service/.test(c),
  },
];

/**
 * Fallback mapping when category is missing or generic.
 */
export const CUSTOMER_NOTIFICATION_CONTENT_RULES: readonly ContentNavigationRule[] = [
  {
    id: "content-custom-quote",
    module: "quote-requests",
    pattern: /custom quote|quote request/i,
  },
  {
    id: "content-report",
    module: "reports",
    pattern: /report.*upload|upload.*report|completion report|download.*report/i,
  },
  {
    id: "content-review-feedback",
    module: "notifications",
    pattern: /\bfeedback\b|\breview\b|\brating\b|\bleave a review\b/i,
  },
  {
    id: "content-payment",
    module: "payments",
    pattern: /\bpayment\b|\brefund\b|\binvoice\b|paid successfully|payment successful/i,
  },
  {
    id: "content-admin-message",
    module: "admin-messages",
    pattern: /\badmin\b.*\bmessage\b|\bmessage from admin\b|\bfire guide admin\b|\bcontact admin\b/i,
  },
  {
    id: "content-booking",
    module: "bookings",
    pattern:
      /\bbook(ing)?\b|reschedule|confirmed the booking|cancelled the booking|appointment/i,
  },
  {
    id: "content-profile",
    module: "profile",
    pattern: /\bprofile\b|\baccount\b|\baddress\b/i,
  },
  {
    id: "content-overview",
    module: "overview",
    pattern: /\bwelcome\b|\bdashboard\b|\boverview\b/i,
  },
];
