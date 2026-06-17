import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  resolveCustomerSidebarNavigation,
  type CustomerNotificationPayload,
  type CustomerSidebarNavigationResult,
} from "../lib/customerNotificationNavigation";

/**
 * Centralized click handler for customer notifications → sidebar listing pages.
 */
export function useCustomerNotificationNavigation() {
  const navigate = useNavigate();

  const navigateFromNotification = useCallback(
    (
      notification: CustomerNotificationPayload,
      options?: { replace?: boolean }
    ): CustomerSidebarNavigationResult => {
      const result = resolveCustomerSidebarNavigation(notification);
      navigate(result.path, { replace: options?.replace ?? false });
      return result;
    },
    [navigate]
  );

  return { navigateFromNotification, resolveCustomerSidebarNavigation };
}
