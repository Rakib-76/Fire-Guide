import {
  CUSTOMER_NOTIFICATION_CATEGORY_RULES,
  CUSTOMER_NOTIFICATION_CONTENT_RULES,
  GENERIC_CUSTOMER_NOTIFICATION_CATEGORIES,
} from "./config";
import { logUnmappedCustomerNotification } from "./logger";
import { getCustomerSidebarPath } from "./routes";
import type {
  CustomerNotificationPayload,
  CustomerSidebarNavigationResult,
} from "./types";

function normalizeCategory(category?: string, type?: string): string {
  const raw = category?.trim() || type?.trim() || "";
  return raw.toLowerCase().replace(/\s+/g, "_");
}

function getCombinedText(notification: CustomerNotificationPayload): string {
  return [notification.title, notification.content, notification.message]
    .filter((s): s is string => typeof s === "string" && s.trim() !== "")
    .join(" ");
}

function buildResult(
  module: CustomerSidebarNavigationResult["module"],
  matchedBy: CustomerSidebarNavigationResult["matchedBy"],
  ruleId?: string
): CustomerSidebarNavigationResult {
  return {
    module,
    path: getCustomerSidebarPath(module),
    matchedBy,
    ruleId,
  };
}

/**
 * Resolve which Customer Dashboard sidebar listing page a notification should open.
 */
export function resolveCustomerSidebarNavigation(
  notification: CustomerNotificationPayload
): CustomerSidebarNavigationResult {
  const category = normalizeCategory(notification.category, notification.type);
  const combinedText = getCombinedText(notification);
  const textLower = combinedText.toLowerCase();

  if (!GENERIC_CUSTOMER_NOTIFICATION_CATEGORIES.has(category)) {
    for (const rule of CUSTOMER_NOTIFICATION_CATEGORY_RULES) {
      if (rule.match(category)) {
        return buildResult(rule.module, "category", rule.id);
      }
    }
  }

  for (const rule of CUSTOMER_NOTIFICATION_CONTENT_RULES) {
    if (rule.pattern.test(combinedText) || rule.pattern.test(textLower)) {
      return buildResult(rule.module, "content", rule.id);
    }
  }

  logUnmappedCustomerNotification(notification, category, combinedText);
  return buildResult("notifications", "default");
}
