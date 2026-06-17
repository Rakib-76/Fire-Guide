export type {
  CustomerNotificationModule,
  CustomerNotificationPayload,
  CustomerSidebarNavigationResult,
  CustomerNavigationMatchSource,
  CategoryNavigationRule,
  ContentNavigationRule,
} from "./types";

export {
  CUSTOMER_SIDEBAR_ROUTES,
  getCustomerSidebarPath,
} from "./routes";

export {
  CUSTOMER_NOTIFICATION_CATEGORY_RULES,
  CUSTOMER_NOTIFICATION_CONTENT_RULES,
  GENERIC_CUSTOMER_NOTIFICATION_CATEGORIES,
} from "./config";

export { resolveCustomerSidebarNavigation } from "./resolve";

export { logUnmappedCustomerNotification } from "./logger";

export { customerModuleToView } from "./view";
export type { CustomerDashboardView } from "./view";
