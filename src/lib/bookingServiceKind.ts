/** Service kind used to pick the correct add-to-cart pricing endpoint. */
export type BookingServiceKind =
  | "fra"
  | "fire-alarm"
  | "fire-extinguisher"
  | "emergency-light"
  | "fire-marshal"
  | "fire-consultation";

export function resolveBookingServiceKind(
  questionnaireData: Record<string, unknown> | null | undefined,
  serviceId?: number | null
): BookingServiceKind {
  const serviceIdNum = serviceId != null ? Number(serviceId) : 0;
  const q = questionnaireData ?? {};

  if (Boolean(q.is_fire_alarm)) return "fire-alarm";
  if (Boolean(q.is_fire_extinguisher)) return "fire-extinguisher";
  if (
    serviceIdNum === 39 ||
    q.emergency_light_id != null ||
    (typeof q.emergency_lights_count === "string" && q.emergency_lights_count !== "")
  ) {
    return "emergency-light";
  }
  if (
    serviceIdNum === 45 ||
    q.people_id != null ||
    (typeof q.training_people_count === "string" && q.training_people_count !== "")
  ) {
    return "fire-marshal";
  }
  if (
    serviceIdNum === 46 ||
    q.mode_id != null ||
    (typeof q.consultation_type === "string" && q.consultation_type !== "")
  ) {
    return "fire-consultation";
  }

  return "fra";
}
