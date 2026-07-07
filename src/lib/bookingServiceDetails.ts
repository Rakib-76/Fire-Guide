/** Display rows for booking flow Service Details (from cached questionnaire — no API). */

export type BookingServiceDetailRow = { label: string; value: string };

/** Human-readable labels for `selected_service.data` keys from customer bookings API. */
const API_SELECTED_SERVICE_FIELD_LABELS: Record<string, string> = {
  smoke_detector: "Smoke detectors",
  call_point: "Manual call points",
  floor: "Number of floors",
  panel: "Fire alarm panels",
  system_type: "Alarm system",
  last_service: "Last serviced",
  property_type: "Property type",
  approximate_people: "Approximate people",
  people: "Number of people",
  urgency: "Urgency",
  duration: "Urgency",
  extinguisher: "Fire extinguishers",
  extinguisher_type: "Extinguisher type",
  emergency_light: "Emergency lights",
  lighting_type: "Lighting type",
  test_frequency: "Test frequency",
  training_people: "People for training",
  building_type: "Building type",
  training_on: "Training location",
  experience: "Prior training",
  mode: "Consultation type",
  hour: "Hours needed",
};

const API_SELECTED_SERVICE_FIELD_ORDER: Record<string, string[]> = {
  alarm: ["smoke_detector", "call_point", "floor", "panel", "system_type", "last_service"],
  fra: ["property_type", "approximate_people", "people", "floor", "urgency", "duration"],
  extinguisher: ["extinguisher", "floor", "extinguisher_type", "last_service"],
  "emergency-light": ["emergency_light", "floor", "lighting_type", "test_frequency"],
  marshal: ["training_people", "building_type", "training_on", "experience"],
  training: ["training_people", "building_type", "training_on", "experience"],
  consultation: ["mode", "hour"],
  consultancy: ["mode", "hour"],
};

export type ApiSelectedServicePayload = {
  type?: string;
  data?: Record<string, { id?: number; value?: string } | string | number | null>;
} | null;

function readApiSelectedServiceFieldValue(
  entry: { id?: number; value?: string } | string | number | null | undefined
): string {
  if (entry == null) return "";
  if (typeof entry === "string" || typeof entry === "number") return String(entry).trim();
  if (typeof entry === "object" && "value" in entry) {
    return String(entry.value ?? "").trim();
  }
  return "";
}

/** Build display rows from customer booking `selected_service.data`. */
export function buildBookingServiceDetailsFromApiSelectedService(
  selected?: ApiSelectedServicePayload
): BookingServiceDetailRow[] {
  if (!selected?.data || typeof selected.data !== "object") return [];

  const typeKey = (selected.type ?? "").toLowerCase().trim();
  const order = API_SELECTED_SERVICE_FIELD_ORDER[typeKey];
  const keys = order?.length
    ? [...order, ...Object.keys(selected.data).filter((k) => !order.includes(k))]
    : Object.keys(selected.data);

  const seen = new Set<string>();
  const rows: BookingServiceDetailRow[] = [];

  for (const key of keys) {
    if (seen.has(key)) continue;
    seen.add(key);
    const value = readApiSelectedServiceFieldValue(selected.data[key]);
    if (!value || isNotSpecified(value)) continue;
    const label =
      API_SELECTED_SERVICE_FIELD_LABELS[key] ??
      key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    rows.push({ label, value });
  }

  return rows;
}

const PROFESSIONAL_FLAT_VALUE_LABELS: Record<string, string> = {
  service_type: "Service type",
  mode_value: "Consultation mode",
  hour_value: "Hours needed",
  number_of_floors_value: "Number of floors",
  duration_value: "Duration",
};

const PROFESSIONAL_FLAT_NAME_LABELS: Record<string, string> = {
  property_type_name: "Property type",
  approximate_people_name: "Approximate people",
};

/** Preferred display order for flat FRA fields on professional/admin booking payloads. */
const PROFESSIONAL_FRA_FLAT_ORDER = [
  "property_type_name",
  "approximate_people_name",
  "number_of_floors_value",
  "duration_value",
] as const;

const PROFESSIONAL_FLAT_NAME_SKIP_KEYS = new Set([
  "first_name",
  "last_name",
  "service_name",
  "professional_name",
  "full_name",
]);

function formatProfessionalServiceType(value: string): string {
  const v = value.trim();
  if (!v) return v;
  return v
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isNestedSelectedServiceData(
  selected: ProfessionalBookingSelectedServiceInput
): selected is { type?: string; data?: ApiSelectedServicePayload["data"] } {
  return (
    selected != null &&
    typeof selected === "object" &&
    "data" in selected &&
    selected.data != null &&
    typeof selected.data === "object"
  );
}

export type ProfessionalBookingSelectedServiceInput =
  | { id?: number; name?: string; price?: string }
  | { type?: string; data?: ApiSelectedServicePayload["data"] }
  | null
  | undefined;

/** Service detail rows for professional dashboard bookings (flat API + nested `selected_service.data`). */
export function buildProfessionalBookingServiceDetails(input: {
  selected_service?: ProfessionalBookingSelectedServiceInput;
  service_type?: string | null;
  mode_value?: string | null;
  hour_value?: string | null;
  [key: string]: unknown;
}): BookingServiceDetailRow[] {
  const selected = input.selected_service;
  if (isNestedSelectedServiceData(selected)) {
    const nested = buildBookingServiceDetailsFromApiSelectedService({
      type: selected.type,
      data: selected.data,
    });
    if (nested.length > 0) return nested;
  }

  const rows: BookingServiceDetailRow[] = [];
  const seenLabels = new Set<string>();

  const pushRow = (label: string, value: unknown) => {
    if (value == null || value === "") return;
    const text = String(value).trim();
    if (!text || isNotSpecified(text) || seenLabels.has(label)) return;
    seenLabels.add(label);
    rows.push({ label, value: text });
  };

  if (input.service_type) {
    pushRow(
      PROFESSIONAL_FLAT_VALUE_LABELS.service_type,
      formatProfessionalServiceType(String(input.service_type))
    );
  }
  pushRow(PROFESSIONAL_FLAT_VALUE_LABELS.mode_value, input.mode_value);
  pushRow(PROFESSIONAL_FLAT_VALUE_LABELS.hour_value, input.hour_value);

  const serviceType = String(input.service_type ?? "").toLowerCase();
  if (serviceType === "fra") {
    for (const key of PROFESSIONAL_FRA_FLAT_ORDER) {
      const label =
        PROFESSIONAL_FLAT_NAME_LABELS[key] ??
        PROFESSIONAL_FLAT_VALUE_LABELS[key] ??
        key.replace(/_name$|_value$/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      pushRow(label, input[key]);
    }
  }

  for (const [key, raw] of Object.entries(input)) {
    if (key === "service_name" || key === "selected_service" || key.endsWith("_id")) continue;
    if (PROFESSIONAL_FLAT_NAME_SKIP_KEYS.has(key)) continue;
    if (serviceType === "fra" && PROFESSIONAL_FRA_FLAT_ORDER.includes(key as (typeof PROFESSIONAL_FRA_FLAT_ORDER)[number])) {
      continue;
    }
    if (!key.endsWith("_name") || typeof raw !== "string") continue;
    const label =
      PROFESSIONAL_FLAT_NAME_LABELS[key] ??
      key.replace(/_name$/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    pushRow(label, raw);
  }

  for (const [key, raw] of Object.entries(input)) {
    if (key === "service_name" || key === "selected_service" || key.endsWith("_id")) continue;
    if (serviceType === "fra" && PROFESSIONAL_FRA_FLAT_ORDER.includes(key as (typeof PROFESSIONAL_FRA_FLAT_ORDER)[number])) {
      continue;
    }
    if (!key.endsWith("_value") || typeof raw !== "string") continue;
    if (key === "mode_value" || key === "hour_value") continue;
    const base = key.replace(/_value$/, "");
    const label =
      PROFESSIONAL_FLAT_VALUE_LABELS[key] ??
      base.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    pushRow(label, raw);
  }

  return rows;
}

/** Nested `selected_service.data` first, then flat booking fields (`*_value`, `*_name`). */
export function buildBookingServiceDetailsFromApiBooking(input: {
  selected_service?: ProfessionalBookingSelectedServiceInput;
  service_type?: string | null;
  mode_value?: string | null;
  hour_value?: string | null;
  [key: string]: unknown;
}): BookingServiceDetailRow[] {
  const nested = buildBookingServiceDetailsFromApiSelectedService(input.selected_service ?? null);
  if (nested.length > 0) return nested;
  return buildProfessionalBookingServiceDetails(input);
}

function joinNonEmpty(parts: (string | undefined | null)[], sep: string): string {
  const filtered = parts.map((p) => (typeof p === "string" ? p.trim() : "")).filter(Boolean);
  return filtered.join(sep);
}

function isNotSpecified(value: string | undefined | null): boolean {
  const v = (value ?? "").trim();
  return v === "" || v.toLowerCase() === "not specified";
}

function pushDetail(
  rows: BookingServiceDetailRow[],
  label: string,
  value: string | number | undefined | null
): void {
  if (value == null || value === "") return;
  const text = String(value).trim();
  if (isNotSpecified(text)) return;
  rows.push({ label, value: text });
}

function hasDetailLabel(rows: BookingServiceDetailRow[], label: string): boolean {
  return rows.some((r) => r.label === label);
}

/** Backfill a row from access_note when older sessions lack explicit display fields. */
function pushDetailFromAccessNote(
  rows: BookingServiceDetailRow[],
  label: string,
  note: string,
  pattern: RegExp
): void {
  if (hasDetailLabel(rows, label)) return;
  const match = note.match(pattern);
  if (match?.[1]) pushDetail(rows, label, match[1].trim());
}

export function resolveBookingServiceIdNum(
  questionnaire: Record<string, unknown> | null | undefined,
  serviceId?: number,
  selectedService?: string
): number {
  if (serviceId != null && !Number.isNaN(Number(serviceId))) return Number(serviceId);
  const fromQ = questionnaire?.service_id;
  if (fromQ != null && !Number.isNaN(Number(fromQ))) return Number(fromQ);
  if (selectedService && /^\d+$/.test(selectedService)) return parseInt(selectedService, 10);
  return 0;
}

/** Service title for booking cards (no “Professionals” suffix). */
export function getBookingServiceName(
  q: Record<string, unknown> | null | undefined,
  serviceIdNum: number,
  serviceNameHint?: string
): string {
  const hint = (serviceNameHint ?? (q?.service_name as string | undefined))?.trim();
  if (hint) return hint;

  if (q?.isCustomQuote) return "Custom quote request";
  if (q?.is_fire_alarm) return "Fire Alarm Servicing";
  if (q?.is_fire_extinguisher) return "Fire Extinguisher Service";
  const emergency =
    serviceIdNum === 39 ||
    (q?.emergency_light_id != null && Number(q.emergency_light_id) !== 0) ||
    Boolean((q?.emergency_lights_count as string | undefined)?.trim());
  if (emergency) return "Emergency Lighting";
  const marshal =
    serviceIdNum === 45 ||
    (q?.people_id != null && Number(q.people_id) !== 0) ||
    Boolean((q?.training_people_count as string | undefined)?.trim());
  if (marshal) return "Fire Safety Training";
  const consult =
    serviceIdNum === 46 ||
    q?.mode_id != null ||
    Boolean((q?.consultation_type as string | undefined)?.trim());
  if (consult) return "Fire Safety Consultation";
  return "Fire Risk Assessment";
}

export function buildBookingServiceDetails(
  q: Record<string, unknown> | null | undefined,
  serviceIdNum: number,
  options?: {
    isCustomQuote?: boolean;
    customQuoteRequestData?: { building_type?: string; people_count?: string; floors?: number };
  }
): BookingServiceDetailRow[] {
  const rows: BookingServiceDetailRow[] = [];

  if (!q && !options?.customQuoteRequestData) return rows;

  if (options?.isCustomQuote && options.customQuoteRequestData) {
    const rd = options.customQuoteRequestData;
    pushDetail(rows, "Property type", rd.building_type);
    pushDetail(rows, "People", rd.people_count);
    if (rd.floors != null && rd.floors > 0) {
      pushDetail(rows, "Number of floors", rd.floors);
    }
    return rows;
  }

  if (!q) return rows;

  if (q.is_fire_alarm) {
    const note = ((q.access_note as string | undefined) ?? "").trim();
    pushDetail(rows, "Smoke detectors", q.detector_count as string);
    pushDetail(rows, "Manual call points", q.manual_call_points_count as string);
    pushDetail(rows, "Number of floors", q.number_of_floors as string);
    pushDetail(rows, "Fire alarm panels", q.fire_alarm_panels_count as string);
    pushDetail(rows, "Alarm system", q.alarm_system_type as string);
    pushDetail(rows, "Last serviced", q.last_serviced as string);
    if (note) {
      pushDetailFromAccessNote(rows, "Manual call points", note, /Manual call points:\s*([^.;]+)/i);
      pushDetailFromAccessNote(rows, "Fire alarm panels", note, /Fire alarm panels:\s*([^.;]+)/i);
      pushDetailFromAccessNote(rows, "Alarm system", note, /Alarm system:\s*([^.;]+)/i);
      pushDetailFromAccessNote(rows, "Last serviced", note, /Last serviced:\s*([^.;]+)/i);
      pushDetailFromAccessNote(rows, "Smoke detectors", note, /Detectors:\s*([^.;]+)/i);
      pushDetailFromAccessNote(rows, "Number of floors", note, /Floors:\s*([^.;]+)/i);
    }
    return rows;
  }

  if (q.is_fire_extinguisher) {
    const note = ((q.access_note as string | undefined) ?? "").trim();
    pushDetail(rows, "Fire extinguishers", q.extinguisher_count as string);
    pushDetail(rows, "Number of floors", q.number_of_floors as string);
    pushDetail(rows, "Extinguisher type", q.extinguisher_type as string);
    pushDetail(rows, "Last serviced", q.last_serviced as string);
    if (note) {
      pushDetailFromAccessNote(rows, "Extinguisher type", note, /Extinguisher type:\s*([^.;]+)/i);
      pushDetailFromAccessNote(rows, "Last serviced", note, /Last serviced:\s*([^.;]+)/i);
      pushDetailFromAccessNote(rows, "Fire extinguishers", note, /Fire extinguishers:\s*([^.;]+)/i);
      pushDetailFromAccessNote(rows, "Number of floors", note, /Floors:\s*([^.;]+)/i);
    }
    return rows;
  }

  const isEmergency =
    serviceIdNum === 39 ||
    (q.emergency_light_id != null && Number(q.emergency_light_id) !== 0) ||
    Boolean((q.emergency_lights_count as string | undefined)?.trim());
  if (isEmergency) {
    pushDetail(rows, "Emergency lights", q.emergency_lights_count as string);
    pushDetail(rows, "Number of floors", q.number_of_floors as string);
    const note = (q.access_note as string | undefined)?.trim();
    if (note) {
      const lt = note.match(/Lighting type:\s*([^.;]+)/i);
      if (lt?.[1]) pushDetail(rows, "Lighting type", lt[1].trim());
      const tf = note.match(/Test frequency:\s*([^.;]+)/i);
      if (tf?.[1]) pushDetail(rows, "Test frequency", tf[1].trim());
    }
    return rows;
  }

  const isMarshal =
    serviceIdNum === 45 ||
    (q.people_id != null && Number(q.people_id) !== 0) ||
    Boolean((q.training_people_count as string | undefined)?.trim());
  if (isMarshal) {
    pushDetail(rows, "People for training", q.training_people_count as string);
    pushDetail(rows, "Building type", q.building_type as string);
    pushDetail(rows, "Training location", q.training_location as string);
    pushDetail(rows, "Prior training", q.staff_training_before as string);
    return rows;
  }

  const isConsult =
    serviceIdNum === 46 ||
    q.mode_id != null ||
    Boolean((q.consultation_type as string | undefined)?.trim());
  if (isConsult) {
    pushDetail(rows, "Consultation type", q.consultation_type as string);
    pushDetail(rows, "Hours needed", q.consultation_hours as string);
    return rows;
  }

  // Fire risk assessment (default)
  pushDetail(rows, "Property type", q.property_type_label as string);
  pushDetail(rows, "Number of floors", q.number_of_floors as string);
  pushDetail(rows, "Number of people", q.approximate_people_label as string);
  pushDetail(rows, "Assessment type", q.fra_assessment_type as string);

  return rows;
}

export type BookingServiceDisplay = {
  name: string;
  details: BookingServiceDetailRow[];
  /** Short line for payment sidebar */
  summaryLine: string;
  propertyType: string;
  floors: string | number;
  people: string;
};

export function buildBookingServiceDisplay(
  questionnaireData: Record<string, unknown> | null | undefined,
  options?: {
    serviceId?: number;
    selectedService?: string;
    serviceNameHint?: string;
    isCustomQuote?: boolean;
    customQuoteRequestData?: { building_type?: string; people_count?: string; floors?: number };
  }
): BookingServiceDisplay {
  const serviceIdNum = resolveBookingServiceIdNum(
    questionnaireData,
    options?.serviceId,
    options?.selectedService
  );
  const name = getBookingServiceName(questionnaireData, serviceIdNum, options?.serviceNameHint);
  const details = buildBookingServiceDetails(questionnaireData, serviceIdNum, {
    isCustomQuote: options?.isCustomQuote,
    customQuoteRequestData: options?.customQuoteRequestData,
  });

  const summaryLine =
    joinNonEmpty(
      details.map((d) => d.value),
      " · "
    ) || joinNonEmpty([questionnaireData?.property_type_label as string, questionnaireData?.approximate_people_label as string], ", ");

  const fraProperty = (questionnaireData?.property_type_label as string) ?? "";
  const fraPeople = (questionnaireData?.approximate_people_label as string) ?? "";
  const floorsRaw = questionnaireData?.number_of_floors;
  const floors =
    floorsRaw != null && String(floorsRaw).trim() !== ""
      ? String(floorsRaw).trim()
      : details.find((d) => /floor/i.test(d.label))?.value ?? "—";

  return {
    name,
    details,
    summaryLine: summaryLine || "—",
    propertyType: isNotSpecified(fraProperty) ? details[0]?.value ?? "—" : fraProperty,
    floors,
    people: isNotSpecified(fraPeople) ? details.find((d) => /people|training|extinguisher|detector|light/i.test(d.label))?.value ?? "—" : fraPeople,
  };
}
