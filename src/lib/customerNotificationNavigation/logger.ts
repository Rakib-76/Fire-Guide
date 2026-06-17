import type { CustomerNotificationPayload } from "./types";

export function logUnmappedCustomerNotification(
  notification: CustomerNotificationPayload,
  category: string,
  combinedText: string
): void {
  console.warn(
    "[customer-notification-navigation] Unmapped notification — defaulted to Notifications",
    {
      notificationId: notification.id,
      category: category || "(empty)",
      title: notification.title,
      content: combinedText.slice(0, 500),
      hint: "Add a category or content rule in customerNotificationNavigation/config.ts",
    }
  );
}
