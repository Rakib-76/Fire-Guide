import {
  ADMIN_NOTIFICATION_CATEGORY_RULES,
  ADMIN_NOTIFICATION_CONTENT_RULES,
  ADMIN_NOTIFICATION_PROFESSIONAL_DOC_CATEGORY_PATTERN,
  ADMIN_NOTIFICATION_PROFESSIONAL_DOC_CONTENT_RULES,
  GENERIC_ADMIN_NOTIFICATION_CATEGORIES,
} from "./config";
import { logUnmappedAdminNotification } from "./logger";
import { getAdminSidebarPath } from "./routes";
import type {
  AdminNotificationPayload,
  AdminSidebarNavigationResult,
} from "./types";

function normalizeCategory(
  category?: string,
  type?: string,
  sourceCategory?: string
): string {
  const raw = sourceCategory?.trim() || category?.trim() || type?.trim() || "";
  return raw.toLowerCase().replace(/\s+/g, "_");
}

function getCombinedText(notification: AdminNotificationPayload): string {
  return [notification.title, notification.content, notification.message]
    .filter((s): s is string => typeof s === "string" && s.trim() !== "")
    .join(" ");
}

function buildResult(
  module: AdminSidebarNavigationResult["module"],
  matchedBy: AdminSidebarNavigationResult["matchedBy"],
  ruleId?: string
): AdminSidebarNavigationResult {
  return {
    module,
    path: getAdminSidebarPath(module),
    matchedBy,
    ruleId,
  };
}

/**
 * Resolve which Admin Dashboard sidebar listing page a notification should open.
 * Category is checked first; title/content are used when category is generic or unmatched.
 */
export function resolveAdminSidebarNavigation(
  notification: AdminNotificationPayload
): AdminSidebarNavigationResult {
  const category = normalizeCategory(
    notification.category,
    notification.type,
    notification.source_category
  );
  const combinedText = getCombinedText(notification);
  const textLower = combinedText.toLowerCase();

  if (ADMIN_NOTIFICATION_PROFESSIONAL_DOC_CATEGORY_PATTERN.test(category)) {
    return buildResult("professionals", "category", "category-professional-verification");
  }

  for (const rule of ADMIN_NOTIFICATION_PROFESSIONAL_DOC_CONTENT_RULES) {
    if (rule.pattern.test(combinedText) || rule.pattern.test(textLower)) {
      return buildResult(rule.module, "content", rule.id);
    }
  }

  if (!GENERIC_ADMIN_NOTIFICATION_CATEGORIES.has(category)) {
    for (const rule of ADMIN_NOTIFICATION_CATEGORY_RULES) {
      if (rule.match(category)) {
        return buildResult(rule.module, "category", rule.id);
      }
    }
  }

  for (const rule of ADMIN_NOTIFICATION_CONTENT_RULES) {
    if (rule.pattern.test(combinedText) || rule.pattern.test(textLower)) {
      return buildResult(rule.module, "content", rule.id);
    }
  }

  logUnmappedAdminNotification(notification, category, combinedText);
  return buildResult("notifications", "default");
}
