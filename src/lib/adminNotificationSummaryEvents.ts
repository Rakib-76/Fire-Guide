/** Fired when admin notification summary cards refresh (so the shell header badge can update). */
export const ADMIN_NOTIFICATION_SUMMARY_UPDATED = "fireguide-admin-notification-summary-updated";

export function emitAdminNotificationSummaryUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ADMIN_NOTIFICATION_SUMMARY_UPDATED));
}
