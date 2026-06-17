import type { AdminNotificationModule } from "./types";

/**
 * Centralized Admin Dashboard sidebar route map.
 * Extend this table when new sidebar sections are added.
 */
export const ADMIN_SIDEBAR_ROUTES: Record<AdminNotificationModule, string> = {
  dashboard: "/admin/dashboard",
  customers: "/admin/dashboard/customers",
  professionals: "/admin/dashboard/professionals",
  bookings: "/admin/dashboard/bookings",
  payments: "/admin/dashboard/payments",
  payout: "/admin/dashboard/payout",
  reviews: "/admin/dashboard/reviews",
  services: "/admin/dashboard/services",
  "custom-quote": "/admin/dashboard/custom-quote",
  /** Completion reports are reviewed via the bookings listing in admin. */
  reports: "/admin/dashboard/bookings",
  notifications: "/admin/dashboard/notifications",
  settings: "/admin/dashboard/settings",
};

export function getAdminSidebarPath(module: AdminNotificationModule): string {
  return ADMIN_SIDEBAR_ROUTES[module] ?? ADMIN_SIDEBAR_ROUTES.notifications;
}
