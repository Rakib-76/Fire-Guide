import type { ProfessionalNotificationPayload } from "./types";

export function logUnmappedProfessionalNotification(
  notification: ProfessionalNotificationPayload,
  category: string,
  combinedText: string
): void {
  console.warn(
    "[professional-notification-navigation] Unmapped notification — defaulted to Notifications",
    {
      notificationId: notification.id,
      category: category || "(empty)",
      title: notification.title,
      content: combinedText.slice(0, 500),
      hint: "Add a category or content rule in professionalNotificationNavigation/config.ts",
    }
  );
}
