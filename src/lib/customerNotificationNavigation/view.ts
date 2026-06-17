import type { CustomerNotificationModule } from "./types";

/** Maps a resolved module to the customer dashboard `CustomerView` id. */
export type CustomerDashboardView =
  | "overview"
  | "bookings"
  | "payments"
  | "quote-requests"
  | "profile"
  | "admin-messages"
  | "notifications"
  | "settings";

export function customerModuleToView(
  module: CustomerNotificationModule
): CustomerDashboardView {
  switch (module) {
    case "overview":
      return "overview";
    case "bookings":
    case "reports":
      return "bookings";
    case "payments":
      return "payments";
    case "quote-requests":
      return "quote-requests";
    case "profile":
      return "profile";
    case "admin-messages":
      return "admin-messages";
    case "reviews":
    case "notifications":
      return "notifications";
    case "settings":
      return "settings";
    default:
      return "notifications";
  }
}
