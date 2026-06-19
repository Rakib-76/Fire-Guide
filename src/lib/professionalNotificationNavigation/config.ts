import type { CategoryNavigationRule, ContentNavigationRule } from "./types";

export const GENERIC_PROFESSIONAL_NOTIFICATION_CATEGORIES = new Set([
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
 * Primary mapping: notification `category` → professional sidebar module.
 */
export const PROFESSIONAL_NOTIFICATION_CATEGORY_RULES: readonly CategoryNavigationRule[] = [
  {
    id: "category-booking",
    module: "bookings",
    match: (c) => /booking/.test(c),
  },
  {
    id: "category-payment",
    module: "payments",
    match: (c) => /payment|transaction/.test(c),
  },
  {
    id: "category-payout",
    module: "payout-list",
    match: (c) => /payout|payouts/.test(c),
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
    id: "category-identity",
    module: "verification",
    match: (c) => /identity/.test(c),
  },
  {
    id: "category-insurance",
    module: "verification",
    match: (c) => /insurance/.test(c),
  },
  {
    id: "category-certificate",
    module: "profile",
    match: (c) => /certificate|certification|qualification/.test(c),
  },
  {
    id: "category-experience",
    module: "profile",
    match: (c) => /experience/.test(c),
  },
  {
    id: "category-membership",
    module: "profile",
    match: (c) => /membership/.test(c),
  },
  {
    id: "category-verification",
    module: "verification",
    match: (c) =>
      /verif|approval|compliance/.test(c) &&
      !/certificate|certification|qualification/.test(c),
  },
  {
    id: "category-admin-message",
    module: "admin-messages",
    match: (c) => /admin.?message|message|inbox/.test(c),
  },
  {
    id: "category-profile",
    module: "profile",
    match: (c) => /profile|account/.test(c),
  },
  {
    id: "category-pricing",
    module: "pricing-overview",
    match: (c) => /pricing|price|rate/.test(c),
  },
  {
    id: "category-availability",
    module: "availability",
    match: (c) => /availability|schedule|calendar/.test(c),
  },
  {
    id: "category-refund",
    module: "payments",
    match: (c) => /refund/.test(c),
  },
];

/**
 * Fallback mapping when category is missing or generic.
 */
export const PROFESSIONAL_NOTIFICATION_CONTENT_RULES: readonly ContentNavigationRule[] = [
  {
    id: "content-identity",
    module: "verification",
    pattern: /\bidentity\b|\bid document\b|\bgovernment.?issued id\b/i,
  },
  {
    id: "content-insurance",
    module: "verification",
    pattern: /\binsurance\b|\bpublic liability\b|\bprofessional indemnity\b|\bindemnity cover\b/i,
  },
  {
    id: "content-certificate",
    module: "profile",
    pattern: /\bcertificate\b|\bcertification\b|\bqualification\b|\bqualifications\b/i,
  },
  {
    id: "content-experience",
    module: "profile",
    pattern: /\bexperience\b|\byears of experience\b/i,
  },
  {
    id: "content-membership",
    module: "profile",
    pattern: /\bmembership\b|\bprofessional body\b|\bmember since\b/i,
  },
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
    id: "content-payout",
    module: "payout-list",
    pattern: /\bpayout\b|\bpayout request\b|\bearnings\b/i,
  },
  {
    id: "content-payment",
    module: "payments",
    pattern: /\bpayment\b|\brefund\b|received successfully/i,
  },
  {
    id: "content-verification",
    module: "verification",
    pattern:
      /\bverif(y|ication)\b|\bapprov(ed|al)\b|\breject(ed|ion)\b|\bdeclin(ed|e)\b/i,
  },
  {
    id: "content-admin-message",
    module: "admin-messages",
    pattern: /\badmin\b.*\bmessage\b|\bmessage from admin\b|\bfire guide admin\b/i,
  },
  {
    id: "content-booking",
    module: "bookings",
    pattern:
      /\bbook(ing)?\b|reschedule|confirmed the booking|cancelled the booking|new booking/i,
  },
  {
    id: "content-pricing",
    module: "pricing-overview",
    pattern: /\bpricing\b|\brate card\b|\bprice update\b/i,
  },
  {
    id: "content-availability",
    module: "availability",
    pattern: /\bavailability\b|\bavailable date\b|\bblock booking\b/i,
  },
  {
    id: "content-profile",
    module: "profile",
    pattern: /\bprofile\b|\baccount\b/i,
  },
];
