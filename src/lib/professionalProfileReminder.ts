/** First-time professional signup: show “Please complete your profile” until dismissed. */
export const COMPLETE_PROFILE_REMINDER_KEY = "fireguide_show_complete_profile_reminder";

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
