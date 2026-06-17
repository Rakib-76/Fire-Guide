import type { CustomerNotificationModule } from "./types";

/**
 * Centralized Customer Dashboard sidebar route map.
 */
export const CUSTOMER_SIDEBAR_ROUTES: Record<CustomerNotificationModule, string> = {
  overview: "/customer/dashboard",
  bookings: "/customer/dashboard/bookings",
  payments: "/customer/dashboard/payments",
  "quote-requests": "/customer/dashboard/quote-requests",
  profile: "/customer/dashboard/profile",
  "admin-messages": "/customer/dashboard/admin-messages",
  /** No dedicated review page — stay on notifications. */
  reviews: "/customer/dashboard/notifications",
  /** Service reports are accessed from the bookings section. */
  reports: "/customer/dashboard/bookings",
  notifications: "/customer/dashboard/notifications",
  settings: "/customer/dashboard/settings",
};

export function getCustomerSidebarPath(module: CustomerNotificationModule): string {
  return CUSTOMER_SIDEBAR_ROUTES[module] ?? CUSTOMER_SIDEBAR_ROUTES.notifications;
}
