import type { NavigateFunction } from "react-router-dom";
import { getProfessionalId } from "./auth";
import {
  readCompleteProfileReminderFlag,
  setCompleteProfileReminderFlag,
} from "./professionalProfileReminder";

export function professionalNeedsProfileSetup(): boolean {
  if (readCompleteProfileReminderFlag()) return true;
  const pid = getProfessionalId();
  return pid == null || Number.isNaN(Number(pid));
}

/** Dashboard home for pros with a saved profile; otherwise profile tab with onboarding modal. */
export function getProfessionalEntryPath(): string {
  return professionalNeedsProfileSetup()
    ? "/professional/dashboard/profile"
    : "/professional/dashboard";
}

export function navigateToProfessionalHome(
  navigate: NavigateFunction,
  options?: { replace?: boolean; forceProfileOnboarding?: boolean }
): void {
  const replace = options?.replace ?? false;
  const needsProfile = options?.forceProfileOnboarding ?? professionalNeedsProfileSetup();

  if (needsProfile) {
    setCompleteProfileReminderFlag();
    navigate("/professional/dashboard/profile", {
      replace,
      state: { showCompleteProfileReminder: true },
    });
    return;
  }

  navigate("/professional/dashboard", { replace });
}
