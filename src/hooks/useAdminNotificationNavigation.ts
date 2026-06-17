import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  resolveAdminSidebarNavigation,
  type AdminNotificationPayload,
  type AdminSidebarNavigationResult,
} from "../lib/adminNotificationNavigation";

/**
 * Centralized click handler for admin notifications → sidebar listing pages.
 */
export function useAdminNotificationNavigation() {
  const navigate = useNavigate();

  const navigateFromNotification = useCallback(
    (
      notification: AdminNotificationPayload,
      options?: { replace?: boolean }
    ): AdminSidebarNavigationResult => {
      const result = resolveAdminSidebarNavigation(notification);
      navigate(result.path, { replace: options?.replace ?? false });
      return result;
    },
    [navigate]
  );

  return { navigateFromNotification, resolveAdminSidebarNavigation };
}
