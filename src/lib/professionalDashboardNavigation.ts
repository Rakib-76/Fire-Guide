import type { NavigateFunction } from "react-router-dom";
import { getProfessionalId } from "./auth";
import {
  clearCompleteProfileReminderFlag,
  setCompleteProfileReminderFlag,
} from "./professionalProfileReminder";

/** True when no professional row id is stored yet (not the signup onboarding modal). */
export function professionalNeedsProfileSetup(): boolean {
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

  if (options?.forceProfileOnboarding) {
    setCompleteProfileReminderFlag();
    navigate("/professional/dashboard/profile", {
      replace,
      state: { showCompleteProfileReminder: true },
    });
    return;
  }

  // Returning login — never reuse the new-signup onboarding modal flag
  clearCompleteProfileReminderFlag();

  if (professionalNeedsProfileSetup()) {
    navigate("/professional/dashboard/profile", { replace });
    return;
  }

  navigate("/professional/dashboard", { replace });
}
