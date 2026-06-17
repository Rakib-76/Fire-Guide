import type { CategoryNavigationRule, ContentNavigationRule } from "./types";

/** Categories that are too generic — skip to title/content rules instead. */
export const GENERIC_ADMIN_NOTIFICATION_CATEGORIES = new Set([
  "",
  "general",
  "unknown",
  "notification",
  "notifications",
  "alert",
  "alerts",
]);

/**
 * Primary mapping: notification `category` → admin sidebar module.
 * First matching rule wins.
 */
export const ADMIN_NOTIFICATION_CATEGORY_RULES: readonly CategoryNavigationRule[] = [
  {
    id: "category-booking",
    module: "bookings",
    match: (c) => /booking/.test(c),
  },
  {
    id: "category-payment",
    module: "payments",
    match: (c) => /payment|payout|refund|transaction/.test(c),
  },
  {
    id: "category-quote",
    module: "custom-quote",
    match: (c) => /quote|custom.?quote/.test(c),
  },
  {
    id: "category-review",
    module: "reviews",
    match: (c) => /review|rating|feedback/.test(c),
  },
  {
    id: "category-report",
    module: "reports",
    match: (c) => /report/.test(c),
  },
  {
    id: "category-professional",
    module: "professionals",
    match: (c) => /professional|verification|certif/.test(c),
  },
  {
    id: "category-customer",
    module: "customers",
    match: (c) => /customer|user|client/.test(c),
  },
  {
    id: "category-service",
    module: "services",
    match: (c) => /service/.test(c),
  },
  {
    id: "category-payout",
    module: "payout",
    match: (c) => /^payout$|payouts/.test(c),
  },
  {
    id: "category-system",
    module: "notifications",
    match: (c) => /system|platform|maintenance/.test(c),
  },
];

/**
 * Fallback mapping when category is missing or generic.
 * Inspects combined title + content.
 */
export const ADMIN_NOTIFICATION_CONTENT_RULES: readonly ContentNavigationRule[] = [
  {
    id: "content-custom-quote",
    module: "custom-quote",
    pattern: /custom quote|quote request/i,
  },
  {
    id: "content-report-upload",
    module: "reports",
    pattern: /report.*upload|upload.*report|completion report/i,
  },
  {
    id: "content-review-feedback",
    module: "reviews",
    pattern: /\bfeedback\b|\breview\b|\brating\b|\bgive feedback\b/i,
  },
  {
    id: "content-payment",
    module: "payments",
    pattern: /\bpayment\b|\bpayout\b|\brefund\b|received successfully/i,
  },
  {
    id: "content-professional-approval",
    module: "professionals",
    pattern:
      /\bprofessional\b.*\b(approv|reject|declin|verif)/i,
  },
  {
    id: "content-professional",
    module: "professionals",
    pattern: /\bprofessional\b|\bverif(y|ication)\b|\bcertif/i,
  },
  {
    id: "content-booking",
    module: "bookings",
    pattern: /\bbook(ing)?\b|reschedule|confirmed the booking|cancelled the booking/i,
  },
  {
    id: "content-customer",
    module: "customers",
    pattern: /\bcustomer\b|\buser\b|\bclient\b/i,
  },
  {
    id: "content-service",
    module: "services",
    pattern: /\bservice\b/i,
  },
];
