/** First-time professional signup: show “Please complete your profile” until dismissed. */
export const COMPLETE_PROFILE_REMINDER_KEY = "fireguide_show_complete_profile_reminder";

export const PROFILE_COMPLETE_THRESHOLD = 100;

export function readCompleteProfileReminderFlag(): boolean {
  try {
    return sessionStorage.getItem(COMPLETE_PROFILE_REMINDER_KEY) === "1";
  } catch {
    return false;
  }
}

export function setCompleteProfileReminderFlag(): void {
  try {
    sessionStorage.setItem(COMPLETE_PROFILE_REMINDER_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearCompleteProfileReminderFlag(): void {
  try {
    sessionStorage.removeItem(COMPLETE_PROFILE_REMINDER_KEY);
  } catch {
    /* ignore */
  }
}

export function isProfileFullyComplete(completionPercentage: number): boolean {
  return Number.isFinite(completionPercentage) && completionPercentage >= PROFILE_COMPLETE_THRESHOLD;
}

/**
 * Intro modal/banner only after first-time signup redirect — not returning OTP login.
 * Hide automatically when API reports 100% profile completion.
 */
export function shouldShowNewProfessionalOnboarding(
  completionPercentage?: number
): boolean {
  if (!readCompleteProfileReminderFlag()) return false;
  if (
    completionPercentage != null &&
    isProfileFullyComplete(completionPercentage)
  ) {
    return false;
  }
  return true;
}
