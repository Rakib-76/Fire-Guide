/** True for #live-booking, #live_booking, etc. */
export function isLiveBookingHash(hash: string): boolean {
  const h = hash.replace(/^#/, "").toLowerCase().replace(/_/g, "-");
  return h === "live-booking";
}
