import type { AdminNotificationPayload } from "./types";

export function logUnmappedAdminNotification(
  notification: AdminNotificationPayload,
  category: string,
  combinedText: string
): void {
  console.warn("[admin-notification-navigation] Unmapped notification — defaulted to Notifications", {
    notificationId: notification.id,
    category: category || "(empty)",
    title: notification.title,
    content: combinedText.slice(0, 500),
    hint: "Add a category or content rule in adminNotificationNavigation/config.ts",
  });
}
