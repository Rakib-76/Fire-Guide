import {
  filterProfessionalForAlarm,
  filterProfessionalForConsultation,
  filterProfessionalForEmergencyLight,
  filterProfessionalForExtinguisher,
  filterProfessionalForFra,
  filterProfessionalForMarshal,
  type FilterProfessionalForAlarmRequest,
  type FilterProfessionalForExtinguisherRequest,
  type FilterProfessionalForFraItem,
} from "../api/servicesService";

export type LocationFilterFields = {
  post_code: string;
  miles: number;
};

export type LocationSearchData = {
  post_code: string;
  search_radius: string;
  miles: number;
  service_id: number;
};

export function convertRadiusToKm(radiusMilesLabel: string): string {
  if (radiusMilesLabel === "entire") return "entire";
  const match = radiusMilesLabel.match(/(\d+)/);
  if (match) {
    const miles = parseInt(match[1], 10);
    return `${Math.round(miles * 1.609)}km`;
  }
  return "16km";
}

export function milesFromRadiusSelection(radius: string): number {
  if (radius === "entire") return 500;
  const match = radius.match(/(\d+)/);
  if (match) return parseInt(match[1], 10);
  return 10;
}

function resolveNullableOptionId(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Calls the service-specific filter-professional API (same as Location page).
 */
export async function filterProfessionalsByQuestionnaire(params: {
  serviceId: number;
  questionnaireData: Record<string, unknown>;
  location: LocationFilterFields;
}): Promise<FilterProfessionalForFraItem[]> {
  const { serviceId, questionnaireData: q, location } = params;

  if (q.is_fire_alarm) {
    const alarmPayload: FilterProfessionalForAlarmRequest = {
      service_id: serviceId,
      smoke_detector_id: Number(q.fire_alarm_smoke_detector_id ?? 0),
      call_point_id: Number(q.fire_alarm_call_point_id ?? 0),
      floor_id: Number(q.fire_alarm_floor_id ?? 0),
      panel_id: Number(q.fire_alarm_panel_id ?? 0),
      system_type_id: Number(q.fire_alarm_system_type_id ?? 0),
      ...location,
    };
    const lastServiceId = q.fire_alarm_last_service_id;
    if (lastServiceId != null && Number(lastServiceId) > 0) {
      alarmPayload.last_service_id = Number(lastServiceId);
    }
    const res = await filterProfessionalForAlarm(alarmPayload);
    return res.data ?? [];
  }

  if (q.is_fire_extinguisher) {
    const extinguisherPayload: FilterProfessionalForExtinguisherRequest = {
      service_id: serviceId,
      extinguisher_id: Number(q.extinguisher_id ?? 0),
      floor_id: Number(q.floor_id ?? 0),
      ...location,
    };
    if (q.type_id != null && Number(q.type_id) > 0) {
      extinguisherPayload.type_id = Number(q.type_id);
    }
    if (q.last_service_id != null && Number(q.last_service_id) > 0) {
      extinguisherPayload.last_service_id = Number(q.last_service_id);
    }
    const res = await filterProfessionalForExtinguisher(extinguisherPayload);
    return res.data ?? [];
  }

  if (
    serviceId === 39 ||
    q.emergency_light_id != null ||
    q.emergency_floor_id != null ||
    q.emergency_light_type_id != null ||
    q.emergency_light_test_id != null
  ) {
    const res = await filterProfessionalForEmergencyLight({
      service_id: serviceId,
      light_id: Number(q.emergency_light_id ?? 1),
      floor_id: Number(q.emergency_floor_id ?? 1),
      light_type_id: resolveNullableOptionId(q.emergency_light_type_id),
      light_test_id: resolveNullableOptionId(q.emergency_light_test_id),
      ...location,
    });
    return res.data ?? [];
  }

  if (
    serviceId === 45 ||
    q.people_id != null ||
    q.place_id != null ||
    q.building_type_id != null ||
    q.experience_id != null
  ) {
    const marshalReq = q.request_data as
      | { people_id?: number; place_id?: number; building_type_id?: number; experience_id?: number | null }
      | undefined;
    const res = await filterProfessionalForMarshal({
      service_id: serviceId,
      people_id: Number(q.people_id ?? marshalReq?.people_id ?? 1),
      place_id: Number(q.place_id ?? marshalReq?.place_id ?? 1),
      building_type_id: Number(q.building_type_id ?? marshalReq?.building_type_id ?? 1),
      experience_id: resolveNullableOptionId(q.experience_id ?? marshalReq?.experience_id),
      ...location,
    });
    return res.data ?? [];
  }

  if (
    serviceId === 46 ||
    q.mode_id != null ||
    q.hour_id != null ||
    (typeof q.consultation_type === "string" && q.consultation_type !== "")
  ) {
    const consultReq = q.request_data as { mode_id?: number; hour_id?: number } | undefined;
    const res = await filterProfessionalForConsultation({
      service_id: serviceId,
      mode_id: Number(q.mode_id ?? consultReq?.mode_id ?? 1),
      hour_id: Number(q.hour_id ?? consultReq?.hour_id ?? 1),
      ...location,
    });
    return res.data ?? [];
  }

  const res = await filterProfessionalForFra({
    service_id: serviceId,
    property_type_id: Number(q.property_type_id),
    approximate_people_id: Number(q.approximate_people_id),
    duration_id: Number(q.duration_id ?? 2),
    number_of_floors:
      Number(q.number_of_floors_id) ||
      parseInt(String(q.number_of_floors ?? ""), 10) ||
      0,
    ...location,
  });
  return res.data ?? [];
}

export function getLowestProfessionalPrice(
  professionals: FilterProfessionalForFraItem[] | null | undefined
): number | null {
  if (!professionals?.length) return null;
  const prices = professionals
    .map((item) => item.service_price ?? item.total_price ?? item.price)
    .filter((value): value is number => typeof value === "number" && value > 0);
  if (!prices.length) return null;
  return Math.min(...prices);
}

export function formatInstantPriceLabel(price: number): string {
  const rounded = Number.isInteger(price) ? price : Math.round(price * 100) / 100;
  return `From £${rounded.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
