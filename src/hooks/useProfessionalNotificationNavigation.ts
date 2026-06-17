import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  resolveProfessionalSidebarNavigation,
  type ProfessionalNotificationPayload,
  type ProfessionalSidebarNavigationResult,
} from "../lib/professionalNotificationNavigation";

/**
 * Centralized click handler for professional notifications → sidebar listing pages.
 */
export function useProfessionalNotificationNavigation() {
  const navigate = useNavigate();

  const navigateFromNotification = useCallback(
    (
      notification: ProfessionalNotificationPayload,
      options?: { replace?: boolean }
    ): ProfessionalSidebarNavigationResult => {
      const result = resolveProfessionalSidebarNavigation(notification);
      navigate(result.path, { replace: options?.replace ?? false });
      return result;
    },
    [navigate]
  );

  return { navigateFromNotification, resolveProfessionalSidebarNavigation };
}
