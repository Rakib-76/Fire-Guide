import type { ProfessionalNotificationModule } from "./types";

/**
 * Centralized Professional Dashboard sidebar route map.
 * Extend this table when new sidebar sections are added.
 */
export const PROFESSIONAL_SIDEBAR_ROUTES: Record<ProfessionalNotificationModule, string> = {
  dashboard: "/professional/dashboard",
  profile: "/professional/dashboard/profile",
  "pricing-overview": "/professional/dashboard/pricing-overview",
  availability: "/professional/dashboard/availability",
  bookings: "/professional/dashboard/bookings",
  payments: "/professional/dashboard/payments",
  "payout-list": "/professional/dashboard/payout-list",
  "custom-quote": "/professional/dashboard/custom-quote",
  verification: "/professional/dashboard/verification",
  "admin-messages": "/professional/dashboard/admin-messages",
  reviews: "/professional/dashboard/reviews",
  /** Completion reports are managed from the bookings section. */
  reports: "/professional/dashboard/bookings",
  notifications: "/professional/dashboard/notifications",
  settings: "/professional/dashboard/settings",
};

export function getProfessionalSidebarPath(module: ProfessionalNotificationModule): string {
  return PROFESSIONAL_SIDEBAR_ROUTES[module] ?? PROFESSIONAL_SIDEBAR_ROUTES.notifications;
}
