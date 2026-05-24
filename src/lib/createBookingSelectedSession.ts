import { getApiToken } from "./auth";
import {
  storeSelectedService,
  createFireAlarmSelectedService,
  createFireExtinguisherSelectedService,
  createEmergencyLightSelectedService,
  createFireMarshalSelectedService,
  createFireConsultationSelectedService,
} from "../api/servicesService";

/** Pull session id from various selected-service API response shapes. */
export function getSessionIdFromApiResponse(
  response: { data?: Record<string, unknown> | number | string | null } | null | undefined
): number | undefined {
  if (response == null || typeof response !== "object") return undefined;
  const data = (response as { data?: unknown }).data;
  if (data == null) return undefined;
  if (typeof data === "number" && !Number.isNaN(data)) return data;
  if (typeof data === "string") {
    const n = parseInt(data, 10);
    return Number.isNaN(n) ? undefined : n;
  }
  if (typeof data !== "object") return undefined;
  const d = data as Record<string, unknown>;
  const selected = d.selected_service;
  const selectedObj =
    selected != null && typeof selected === "object" ? (selected as Record<string, unknown>) : undefined;
  const candidates: unknown[] = [
    d.session_id,
    d.id,
    d.selected_service_id,
    d.booking_session_id,
    selectedObj?.session_id,
    selectedObj?.id,
  ];
  for (const raw of candidates) {
    if (raw == null || raw === "") continue;
    if (typeof raw === "number" && !Number.isNaN(raw)) return raw;
    if (typeof raw === "string") {
      const n = parseInt(raw, 10);
      if (!Number.isNaN(n)) return n;
    }
  }
  return undefined;
}

export interface CreateBookingSelectedSessionParams {
  professionalId: number;
  serviceId: number;
  questionnaireData: Record<string, unknown> | null;
  locationSearchData: { post_code: string; search_radius: string; service_id: number } | null;
}

/**
 * Creates the backend “selected service” row and returns session_id for professional_booking/store.
 * Mirrors Comparison “Book now” behaviour so Profile → Book and booking recovery stay aligned.
 */
export async function createBookingSelectedSession(
  params: CreateBookingSelectedSessionParams
): Promise<{ sessionId?: number; error?: string }> {
  const { professionalId, serviceId, questionnaireData, locationSearchData } = params;
  if (!questionnaireData || !locationSearchData || serviceId == null) {
    return { error: "Missing questionnaire or location data for this booking." };
  }

  const serviceIdNum = Number(serviceId);
  const q = questionnaireData as Record<string, unknown>;
  const apiToken = getApiToken();

  const isFireAlarm = Boolean(q.is_fire_alarm);
  const isFireExtinguisher = Boolean(q.is_fire_extinguisher);
  const isEmergencyLighting =
    serviceIdNum === 39 ||
    q.emergency_light_id != null ||
    (typeof q.emergency_lights_count === "string" && q.emergency_lights_count !== "");
  const isFireMarshal =
    serviceIdNum === 45 ||
    q.people_id != null ||
    (typeof q.training_people_count === "string" && q.training_people_count !== "");
  const isFireConsultation =
    serviceIdNum === 46 ||
    q.mode_id != null ||
    (typeof q.consultation_type === "string" && q.consultation_type !== "");

  try {
    if (isFireAlarm) {
      const alarmRes = await createFireAlarmSelectedService({
        ...(apiToken && { api_token: apiToken }),
        professional_id: professionalId,
        service_id: serviceIdNum,
        smoke_detector_id: Number(q.fire_alarm_smoke_detector_id ?? 0),
        call_point_id: Number(q.fire_alarm_call_point_id ?? 0),
        floor_id: Number(q.fire_alarm_floor_id ?? 0),
        panel_id: Number(q.fire_alarm_panel_id ?? 0),
        system_type_id: Number(q.fire_alarm_system_type_id ?? 0),
        last_service_id: Number(q.fire_alarm_last_service_id ?? 0),
        access_note: String(q.access_note ?? ""),
        post_code: locationSearchData.post_code,
        search_radius: locationSearchData.search_radius,
      });
      const sid = getSessionIdFromApiResponse(alarmRes);
      return sid != null ? { sessionId: sid } : {};
    }
    if (isFireExtinguisher) {
      const extRes = await createFireExtinguisherSelectedService({
        ...(apiToken && { api_token: apiToken }),
        professional_id: professionalId,
        service_id: serviceIdNum,
        extinguisher_id: Number(q.extinguisher_id ?? 0),
        floor_id: Number(q.floor_id ?? 0),
        type_id: Number(q.type_id ?? 0),
        last_service_id: Number(q.last_service_id ?? 0),
        access_note: String(q.access_note ?? ""),
        post_code: locationSearchData.post_code,
        search_radius: locationSearchData.search_radius,
        preffered_date: String(q.preferred_date ?? ""),
      });
      const sid = getSessionIdFromApiResponse(extRes);
      return sid != null ? { sessionId: sid } : {};
    }
    if (isEmergencyLighting) {
      const requestData = q.request_data as
        | { emergency_light_type_id?: number; emergency_light_test_id?: number }
        | undefined;
      const lightTypeIdRaw = q.emergency_light_type_id ?? requestData?.emergency_light_type_id;
      const lightTestIdRaw = q.emergency_light_test_id ?? requestData?.emergency_light_test_id;
      const lightTypeId = lightTypeIdRaw != null ? Number(lightTypeIdRaw) : 0;
      const lightTestId = lightTestIdRaw != null ? Number(lightTestIdRaw) : 0;
      const elRes = await createEmergencyLightSelectedService({
        ...(apiToken && { api_token: apiToken }),
        professional_id: professionalId,
        service_id: serviceIdNum,
        light_id: q.emergency_light_id != null ? Number(q.emergency_light_id) : 1,
        floor_id: q.emergency_floor_id != null ? Number(q.emergency_floor_id) : 1,
        light_type_id: lightTypeId,
        light_test_id: lightTestId,
        access_note: String(q.access_note ?? ""),
        post_code: locationSearchData.post_code,
        search_radius: locationSearchData.search_radius,
        preffered_date: String(q.preferred_date ?? ""),
      });
      const sid = getSessionIdFromApiResponse(elRes);
      return sid != null ? { sessionId: sid } : {};
    }
    if (isFireMarshal) {
      const marshalReq = q.request_data as
        | { people_id?: number; place_id?: number; building_type_id?: number; experience_id?: number }
        | undefined;
      const peopleId = q.people_id ?? marshalReq?.people_id;
      const placeId = q.place_id ?? marshalReq?.place_id;
      const buildingTypeId = q.building_type_id ?? marshalReq?.building_type_id;
      const experienceId = q.experience_id ?? marshalReq?.experience_id;
      const marshalRes = await createFireMarshalSelectedService({
        ...(apiToken && { api_token: apiToken }),
        professional_id: professionalId,
        service_id: serviceIdNum,
        people_id: peopleId != null ? Number(peopleId) : 1,
        place_id: placeId != null ? Number(placeId) : 1,
        building_type_id: buildingTypeId != null ? Number(buildingTypeId) : 1,
        experience_id: experienceId != null ? Number(experienceId) : 1,
        access_note: String(q.access_note ?? ""),
        post_code: locationSearchData.post_code,
        search_radius: locationSearchData.search_radius,
        preffered_date: String(q.preferred_date ?? ""),
      });
      const sid = getSessionIdFromApiResponse(marshalRes);
      return sid != null ? { sessionId: sid } : {};
    }
    if (isFireConsultation) {
      const consultReq = q.request_data as { mode_id?: number; hour_id?: number } | undefined;
      const modeId = q.mode_id ?? consultReq?.mode_id;
      const hourId = q.hour_id ?? consultReq?.hour_id;
      const consultRes = await createFireConsultationSelectedService({
        ...(apiToken && { api_token: apiToken }),
        professional_id: professionalId,
        service_id: serviceIdNum,
        mode_id: modeId != null ? Number(modeId) : 1,
        hour_id: hourId != null ? Number(hourId) : 1,
        access_note: String(q.access_note ?? ""),
        post_code: locationSearchData.post_code,
        search_radius: locationSearchData.search_radius,
        preffered_date: String(q.preferred_date ?? ""),
      });
      const sid = getSessionIdFromApiResponse(consultRes);
      return sid != null ? { sessionId: sid } : {};
    }

    const property_type_id = Number(q.property_type_id);
    const approximate_people_id = Number(q.approximate_people_id);
    if (Number.isNaN(property_type_id) || Number.isNaN(approximate_people_id)) {
      return { error: "Incomplete questionnaire data. Please complete the service questionnaire." };
    }

    const floorId = q.number_of_floors_id;
    const number_of_floors =
      floorId != null ? String(floorId) : String(q.number_of_floors ?? "");
    const storeRes = await storeSelectedService({
      ...(apiToken && { api_token: apiToken }),
      service_id: serviceIdNum,
      property_type_id,
      approximate_people_id,
      number_of_floors,
      ...(floorId != null && { number_of_floors_id: Number(floorId) }),
      ...(q.duration_id != null && { duration_id: Number(q.duration_id) }),
      preferred_date: String(q.preferred_date ?? ""),
      access_note: String(q.access_note ?? ""),
      post_code: locationSearchData.post_code,
      search_radius: locationSearchData.search_radius,
      professional_id: professionalId,
    });
    const sid = getSessionIdFromApiResponse(storeRes);
    return sid != null ? { sessionId: sid } : {};
  } catch (e: unknown) {
    const message = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Could not create booking session.";
    return { error: message };
  }
}
