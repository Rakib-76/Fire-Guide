import {
  GENERIC_PROFESSIONAL_NOTIFICATION_CATEGORIES,
  PROFESSIONAL_NOTIFICATION_CATEGORY_RULES,
  PROFESSIONAL_NOTIFICATION_CONTENT_RULES,
} from "./config";
import { logUnmappedProfessionalNotification } from "./logger";
import { getProfessionalSidebarPath } from "./routes";
import type {
  ProfessionalNotificationPayload,
  ProfessionalSidebarNavigationResult,
} from "./types";

function normalizeCategory(category?: string, type?: string): string {
  const raw = category?.trim() || type?.trim() || "";
  return raw.toLowerCase().replace(/\s+/g, "_");
}

function getCombinedText(notification: ProfessionalNotificationPayload): string {
  return [notification.title, notification.content, notification.message]
    .filter((s): s is string => typeof s === "string" && s.trim() !== "")
    .join(" ");
}

function buildResult(
  module: ProfessionalSidebarNavigationResult["module"],
  matchedBy: ProfessionalSidebarNavigationResult["matchedBy"],
  ruleId?: string
): ProfessionalSidebarNavigationResult {
  return {
    module,
    path: getProfessionalSidebarPath(module),
    matchedBy,
    ruleId,
  };
}

/**
 * Resolve which Professional Dashboard sidebar listing page a notification should open.
 */
export function resolveProfessionalSidebarNavigation(
  notification: ProfessionalNotificationPayload
): ProfessionalSidebarNavigationResult {
  const category = normalizeCategory(notification.category, notification.type);
  const combinedText = getCombinedText(notification);
  const textLower = combinedText.toLowerCase();

  if (!GENERIC_PROFESSIONAL_NOTIFICATION_CATEGORIES.has(category)) {
    for (const rule of PROFESSIONAL_NOTIFICATION_CATEGORY_RULES) {
      if (rule.match(category)) {
        return buildResult(rule.module, "category", rule.id);
      }
    }
  }

  for (const rule of PROFESSIONAL_NOTIFICATION_CONTENT_RULES) {
    if (rule.pattern.test(combinedText) || rule.pattern.test(textLower)) {
      return buildResult(rule.module, "content", rule.id);
    }
  }

  logUnmappedProfessionalNotification(notification, category, combinedText);
  return buildResult("notifications", "default");
}
