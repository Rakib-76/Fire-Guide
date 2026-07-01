/// <reference types="vite/client" />
import axios from 'axios';
import { handleTokenExpired, isTokenExpiredError } from '../lib/auth';
import { resolveApiBaseUrl } from '../lib/apiBaseUrl';
import { tryResolveProfessionalBasePriceFromRegistry } from './professionalServiceBasePricesService';

// TypeScript types for API response
export interface ServiceResponse {
  id: number;
  service_name: string;
  type?: string;
  status: string;
  /** Legacy / alternate price field */
  price: string;
  /** Public "starting from" amount from GET /services (e.g. "12.00") */
  from_price?: string | null;
  icon: string | null;
  description: string;
  created_by?: number;
  updated_by?: number | null;
  created_at?: string;
  updated_at?: string;
}

/** Prefer `from_price` for customer-facing "Starting from", then `price`. */
export function formatServiceFromPrice(service: Pick<ServiceResponse, "from_price" | "price">): string {
  const raw = service.from_price ?? service.price;
  if (raw == null || String(raw).trim() === "") return "£0.00";
  const n = parseFloat(String(raw));
  if (Number.isNaN(n)) return "£0.00";
  return `£${n.toFixed(2)}`;
}

export interface ServicesPaginatedResponse {
  current_page: number;
  data: ServiceResponse[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  links: Array<{
    url: string | null;
    label: string;
    active: boolean;
  }>;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

export interface ServicesApiResponse {
  status?: string | boolean;
  message?: string;
  data: ServiceResponse[] | ServicesPaginatedResponse;
}

// TypeScript types for Property Type API response
export interface PropertyTypeResponse {
  id: number;
  property_type_name: string;
  property_type_description: string;
  created_at?: string;
  updated_at?: string;
}

export interface PropertyTypesPaginatedResponse {
  current_page: number;
  data: PropertyTypeResponse[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  links: Array<{
    url: string | null;
    label: string;
    active: boolean;
  }>;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

export interface PropertyTypesApiResponse {
  status: string;
  message: string;
  data: PropertyTypeResponse[] | PropertyTypesPaginatedResponse;
}

// TypeScript types for Approximate People API response
export interface ApproximatePeopleResponse {
  id: number;
  number_of_people: string;
  description: string;
  created_at?: string;
  updated_at?: string;
  creator?: number | null;
  updater?: number | null;
}

export interface ApproximatePeopleApiResponse {
  status: string;
  message: string;
  data: ApproximatePeopleResponse[];
}

/** Format people option for display: serial ranges like "1–10 People", "11–25 People" (en-dash, " People") */
export function formatPeopleOptionLabel(text: string): string {
  const t = (text ?? "").replace(/\r\n/g, "").trim();
  const rangeMatch = t.match(/^(\d+)\s*[-–]\s*(\d+)\s*(people)?$/i);
  if (rangeMatch) return `${rangeMatch[1]}–${rangeMatch[2]} People`;
  if (/100\+/i.test(t) && !/people/i.test(t)) return "Others";
  if (/more than 500|500\+/i.test(t)) return "More than 500 people";
  return t || text;
}

/** Sort key for people options: 1→1, 11→11, 26→26, 51→51, 100+→100, 500+→500 so order is serial */
export function getPeopleOptionSortKey(text: string): number {
  const t = (text ?? "").trim();
  if (/more than 500|500\+/i.test(t)) return 500;
  if (/100\+/i.test(t)) return 100;
  const rangeMatch = t.match(/^(\d+)\s*[-–]\s*\d+/);
  if (rangeMatch) return parseInt(rangeMatch[1], 10);
  const firstNum = t.match(/\d+/);
  return firstNum ? parseInt(firstNum[0], 10) : 999;
}

export interface FloorPricingItem {
  id?: number;
  floor: string;
  price: string | null;
  label: string;
  custom_quote?: boolean;
}

export interface FloorPricingApiResponse {
  status: boolean;
  data: FloorPricingItem[];
}

/** Fire Alarm get-alarm API: option item for dropdowns (detectors, call_points, floors, alarm_panels, system_type, etc.) */
export interface FireAlarmOptionItem {
  id: number;
  type: string;
  value: string;
  created_by?: number | null;
  updated_by?: number | null;
  deleted_by?: number | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface FireAlarmGetAlarmResponse {
  status: boolean;
  message: string;
  data: FireAlarmOptionItem[];
}

/** GET /fra-durations — urgency/duration options for FRA (e.g. "7+ days", "Same / next day") */
export interface FraDurationItem {
  id: number;
  duration: string;
  created_at?: string;
  updated_at?: string;
}

export interface FraDurationsApiResponse {
  status: boolean;
  message: string;
  data: FraDurationItem[];
}

// FRA Price store-update (POST /fra-price/store-update)
export interface FraPriceStoreUpdateRequest {
  professional_id: number;
  property_type_id: number;
  floor_id: number;
  people_id: number;
  duration_id: number;
  property_type_price: number;
  people_price: number;
  floor_price: number;
  duration_price: number;
}

export interface FraPriceStoreUpdateResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    professional_id: number;
    property_type_id: number;
    people_id: number;
    floor_id: number;
    duration_id: number;
    property_type_price: number;
    people_price: number;
    floor_price: number;
    duration_price: number;
    total_price: number;
    created_at: string;
    updated_at: string;
  };
}

/** Normalize price from FRA GET-style POST responses (data.price, nested shapes). */
export function parseFraGetPriceResponse(payload: unknown): number {
  if (payload == null || typeof payload !== "object") return 0;
  const root = payload as Record<string, unknown>;
  const inner = root.data;
  let raw: unknown;
  if (inner != null && typeof inner === "object" && !Array.isArray(inner)) {
    const d = inner as Record<string, unknown>;
    raw =
      d.price ??
      d.property_type_price ??
      d.people_price ??
      d.floor_price ??
      d.duration_price;
  }
  if (raw == null) raw = root.price;
  if (raw == null || raw === "") return 0;
  const n = typeof raw === "number" ? raw : parseFloat(String(raw));
  return Number.isFinite(n) ? n : 0;
}

export interface FraGetPropertyTypePriceRequest {
  api_token: string;
  property_type_id: number;
}

/**
 * POST /professional/get-fra-property-type — base price for property type
 */
export const getFraPropertyTypePrice = async (
  data: FraGetPropertyTypePriceRequest
): Promise<unknown> => {
  const response = await apiClient.post<unknown>('/professional/get-fra-property-type', data, {
    headers: { Authorization: `Bearer ${data.api_token}` },
  });
  return response.data;
};

/**
 * POST /professional/get-fra-people — addon price for people + property
 */
export const getFraPeoplePriceFromApi = async (data: {
  api_token: string;
  people_id: number;
  property_type_id: number;
}): Promise<unknown> => {
  const response = await apiClient.post<unknown>('/professional/get-fra-people', data, {
    headers: { Authorization: `Bearer ${data.api_token}` },
  });
  return response.data;
};

/**
 * POST /professional/get-fra-floor
 */
export const getFraFloorPriceFromApi = async (data: {
  api_token: string;
  floor_id: number;
  property_type_id: number;
}): Promise<unknown> => {
  const response = await apiClient.post<unknown>('/professional/get-fra-floor', data, {
    headers: { Authorization: `Bearer ${data.api_token}` },
  });
  return response.data;
};

/**
 * POST /professional/get-fra-duraation (API spelling)
 */
export const getFraDurationPriceFromApi = async (data: {
  api_token: string;
  duration_id: number;
  property_type_id: number;
}): Promise<unknown> => {
  const response = await apiClient.post<unknown>('/professional/get-fra-duraation', data, {
    headers: { Authorization: `Bearer ${data.api_token}` },
  });
  return response.data;
};

/**
 * Store or update FRA price for the logged-in professional
 */
export const storeUpdateFraPrice = async (
  data: FraPriceStoreUpdateRequest
): Promise<FraPriceStoreUpdateResponse> => {
  const response = await apiClient.post<FraPriceStoreUpdateResponse>('/fra-price/store-update', data);
  return response.data;
};

/** POST /professional/fra-property-type — save base price for a property type (api_token from login, property_type_id from selection, price from input) */
export interface FraPropertyTypePriceRequest {
  api_token: string;
  property_type_id: number;
  price: number;
}

export interface FraPropertyTypePriceResponse {
  status?: boolean;
  message?: string;
  data?: unknown;
}

export const saveFraPropertyTypePrice = async (
  data: FraPropertyTypePriceRequest
): Promise<FraPropertyTypePriceResponse> => {
  const response = await apiClient.post<FraPropertyTypePriceResponse>('/professional/fra-property-type', data);
  return response.data;
};

/** POST /professional/fra-people — save people price */
export interface FraPeoplePriceRequest {
  api_token: string;
  people_id: number;
  property_type_id: number;
  price: number;
}

export interface FraPeoplePriceResponse {
  status?: boolean;
  message?: string;
  data?: {
    id?: number;
    professional_id?: number;
    people_id?: number;
    price?: number;
    created_at?: string;
    updated_at?: string;
  };
}

export const saveFraPeoplePrice = async (
  data: FraPeoplePriceRequest
): Promise<FraPeoplePriceResponse> => {
  const response = await apiClient.post<FraPeoplePriceResponse>('/professional/fra-people', data);
  return response.data;
};

/** POST /professional-fra-floor — save floor price */
export interface FraFloorPriceRequest {
  api_token: string;
  floor_id: number;
  property_type_id: number;
  price: number;
}

export interface FraFloorPriceResponse {
  status?: boolean;
  message?: string;
  data?: {
    id?: number;
    professional_id?: number;
    floor_id?: number;
    price?: number;
    created_at?: string;
    updated_at?: string;
  };
}

export const saveFraFloorPrice = async (
  data: FraFloorPriceRequest
): Promise<FraFloorPriceResponse> => {
  const response = await apiClient.post<FraFloorPriceResponse>('/professional-fra-floor', data);
  return response.data;
};

/** POST /professional-fra-duration — save duration/urgency price */
export interface FraDurationPriceRequest {
  api_token: string;
  duration_id: number;
  property_type_id: number;
  price: number;
}

export interface FraDurationPriceResponse {
  status?: boolean;
  message?: string;
  data?: {
    id?: number;
    professional_id?: number;
    duration_id?: number;
    price?: number;
    created_at?: string;
    updated_at?: string;
  };
}

export const saveFraDurationPrice = async (
  data: FraDurationPriceRequest
): Promise<FraDurationPriceResponse> => {
  const response = await apiClient.post<FraDurationPriceResponse>('/professional-fra-duration', data);
  return response.data;
};

// Create axios instance with base configuration
// Uses VITE_API_BASE_URL when set; otherwise https://firesafety-backend.fireguide.co.uk/api (see lib/apiBaseUrl.ts)
const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

// On 401 (expired/invalid token), log out and redirect to home so user must log in again.
// Do NOT redirect for public booking endpoints (e.g. selected_services/store) so Location → Compare flow works without login.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error?.config?.url || '';
    const isAuthEndpoint = requestUrl.includes('/login') || requestUrl.includes('/register') || requestUrl.includes('/send_otp') || requestUrl.includes('/verify_otp') || requestUrl.includes('/reset_password');
    const isPublicBookingEndpoint =
      requestUrl.includes('selected_services/store') || requestUrl.includes('filter-professional/for-fra') || requestUrl.includes('filter-professional/for-alarm') || requestUrl.includes('filter-professional/for-extinguisher') || requestUrl.includes('filter-professional/for-emergency-light') || requestUrl.includes('filter-professional/for-marshal') || requestUrl.includes('filter-professional/for-consultation') || requestUrl.includes('fire-alarm/selected-servie/create') || requestUrl.includes('fire-extingusher/selected-servie/create') || requestUrl.includes('fire-emergency-light/selected-servie/create') || requestUrl.includes('fire-marshal/selected-servie/create') || requestUrl.includes('fire-marshal/get-marshal') || requestUrl.includes('fire-consultation/selected-servie/create') || requestUrl.includes('fire-consultation/get-consultation') || requestUrl.includes('emergency-lighting-testing/get-emergency-light');
    if (!isAuthEndpoint && !isPublicBookingEndpoint && isTokenExpiredError(error)) {
      handleTokenExpired();
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

/**
 * Professional "get saved base price" endpoints sometimes return 401/403 (e.g. backend rules for new accounts).
 * Rejecting aborts Promise.all in pricing tabs and spams console; return a stable failure payload instead.
 */
async function postProfessionalBasePriceReadSafe<T extends { status: boolean; message: string }>(
  exec: () => Promise<{ data: T }>
): Promise<T> {
  try {
    const res = await exec();
    return res.data;
  } catch (err: unknown) {
    const response = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
    const status = response?.status;
    if (status === 401 || status === 403) {
      const msg =
        response?.data?.message != null ? String(response.data.message) : "Unable to load saved base price.";
      return { status: false, message: msg } as T;
    }
    if (status === 404) {
      const msg =
        response?.data?.message != null ? String(response.data.message) : "Base price endpoint not found.";
      return { status: false, message: msg } as T;
    }
    throw err;
  }
}

/** Laravel often authenticates via `Authorization: Bearer`; keep `api_token` in JSON for APIs that read the body. */
function authHeaders(apiToken: string) {
  return { headers: { Authorization: `Bearer ${apiToken}` } };
}

/**
 * Some modules expose `.../get-base-price` (same pattern as Fire Alarm); older builds used `.../base-price-get`.
 * Try each path until one is not 404 so Postman and UI stay aligned with production routes.
 */
async function postProfessionalBasePriceGetBestEffort<T extends { status: boolean; message: string }>(
  apiToken: string,
  ...paths: [string, ...string[]]
): Promise<{ data: T }> {
  let lastErr: unknown;
  for (const path of paths) {
    try {
      return await apiClient.post<T>(path, { api_token: apiToken }, authHeaders(apiToken));
    } catch (e: unknown) {
      lastErr = e;
      const st = (e as { response?: { status?: number } })?.response?.status;
      if (st === 404) continue;
      throw e;
    }
  }
  throw lastErr;
}

/**
 * Fire Alarm: fetch options for dropdowns (detectors, call_points, floors, alarm_panels, system_type, last_service).
 * POST /fire-alarm/get-alarm  Body: { api_token?, type }
 * Response: { status: true, message: string, data: [{ id, type, value, ... }] } — "value" is shown in dropdowns.
 * api_token optional for guest/public booking flow.
 */
export const fetchFireAlarmOptions = async (
  apiToken: string | null,
  type: string
): Promise<FireAlarmOptionItem[]> => {
  try {
    const response = await apiClient.post<FireAlarmGetAlarmResponse>(
      '/fire-alarm/get-alarm',
      {
        ...(apiToken != null && apiToken !== '' && { api_token: apiToken }),
        type,
      },
      apiToken != null && apiToken !== '' ? authHeaders(apiToken) : undefined
    );
    const raw = response.data as FireAlarmGetAlarmResponse | { data?: unknown };
    const list = Array.isArray(raw?.data) ? raw.data : [];
    return list.map((item) => ({
      ...item,
      id: Number(item.id),
      value: String(item.value ?? ''),
    })) as FireAlarmOptionItem[];
  } catch (_err) {
    return [];
  }
};

/**
 * Fire Extinguisher Service: fetch options for dropdowns.
 * POST /fire-extinguisher-service/get-extinguisher-service  Body: { api_token, type }
 * type: "extinguisher" | "floor" | "metarials" | "last_service"
 * Response: { status, message, data: [{ id, type, value, ... }] }
 */
export interface ExtinguisherServiceOptionItem {
  id: number;
  value: string;
  type?: string;
}

export const fetchExtinguisherServiceOptions = async (
  apiToken: string,
  type: string
): Promise<ExtinguisherServiceOptionItem[]> => {
  try {
    const response = await apiClient.post<{ status?: boolean; data?: Array<{ id: number; value?: string; type?: string }> }>(
      '/fire-extinguisher-service/get-extinguisher-service',
      { api_token: apiToken, type },
      authHeaders(apiToken)
    );
    const raw = response.data;
    const list = Array.isArray(raw?.data) ? raw.data : [];
    // Only include items whose type matches the requested type (so e.g. floor dropdown shows only floor values from response)
    const filtered = list.filter((item) => (item.type ?? '').toLowerCase() === (type ?? '').toLowerCase());
    return filtered.map((item) => ({
      id: Number(item.id),
      value: String(item.value ?? '').trim() || String(item.id),
      type: item.type,
    }));
  } catch (_err) {
    return [];
  }
};

/**
 * Emergency Light Service: fetch options for dropdowns.
 * POST /emergency-lighting-testing/get-emergency-light  Body: { type }
 * type: "light" | "floor" | "light_type" | "light_test"
 * Response: { status, message, data: [{ id, type, value, ... }] }
 */
export interface EmergencyLightServiceOptionItem {
  id: number;
  value: string;
}

export const fetchEmergencyLightOptions = async (
  type: string
): Promise<EmergencyLightServiceOptionItem[]> => {
  try {
    const response = await apiClient.post<{ status?: boolean; data?: Array<{ id: number; value?: string; type?: string }> }>(
      '/emergency-lighting-testing/get-emergency-light',
      { type }
    );
    const raw = response.data;
    const list = Array.isArray(raw?.data) ? raw.data : [];
    return list.map((item) => ({
      id: Number(item.id),
      value: String(item.value ?? '').trim() || String(item.id),
    }));
  } catch (_err) {
    return [];
  }
};

/**
 * Fire Marshal (Training): fetch options for dropdowns.
 * POST /fire-marshal/get-marshal  Body: { type }
 * type: "people" | "training_place" | "building_type" | "experience"
 * Response: { status, message, data: [{ id, type, value, ... }] }
 * Dropdowns display the value from each item in data.
 */
export interface MarshalServiceOptionItem {
  id: number;
  value: string;
}

export const fetchMarshalOptions = async (
  apiToken: string,
  type: string
): Promise<MarshalServiceOptionItem[]> => {
  try {
    const response = await apiClient.post<{ status?: boolean; data?: Array<{ id: number; value?: string; type?: string }> }>(
      '/fire-marshal/get-marshal',
      {
        type,
        ...(apiToken != null && apiToken !== '' && { api_token: apiToken }),
      },
      apiToken != null && apiToken !== '' ? authHeaders(apiToken) : undefined
    );
    const raw = response.data;
    const list = Array.isArray(raw?.data) ? raw.data : [];
    return list.map((item) => ({
      id: Number(item.id),
      value: String(item.value ?? '').trim() || String(item.id),
    }));
  } catch (_err) {
    return [];
  }
};

/**
 * Fire Consultation: fetch options for dropdowns.
 * POST /fire-consultation/get-consultation  Body: { api_token, type }
 * type: "hour" | "mode"
 * Response: { status, message, data: [{ id, type, value, ... }] }
 */
export interface ConsultationOptionItem {
  id: number;
  value: string;
}

export const fetchFireConsultationOptions = async (
  apiToken: string,
  type: string
): Promise<ConsultationOptionItem[]> => {
  try {
    const response = await apiClient.post<{ status?: boolean; data?: Array<{ id: number; value?: string; type?: string }> }>(
      '/fire-consultation/get-consultation',
      { api_token: apiToken, type },
      authHeaders(apiToken)
    );
    const raw = response.data;
    const list = Array.isArray(raw?.data) ? raw.data : [];
    return list.map((item) => ({
      id: Number(item.id),
      value: String(item.value ?? '').trim() || String(item.id),
    }));
  } catch (_err) {
    return [];
  }
};

/** Response for POST /professional-consultation/base-price-create */
export interface ProfessionalConsultationBasePriceResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    professional_id: number;
    price: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Create/update professional Consultation base price.
 * POST /professional-consultation/base-price-create  Body: { api_token, price }
 */
export const saveProfessionalConsultationBasePrice = async (
  apiToken: string,
  price: number
): Promise<ProfessionalConsultationBasePriceResponse> => {
  const response = await apiClient.post<ProfessionalConsultationBasePriceResponse>(
    '/professional-consultation/base-price-create',
    { api_token: apiToken, price }
  );
  return response.data;
};

/** Response for POST /professional-consultation/base-price-get */
export interface ProfessionalConsultationBasePriceGetResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    professional_id: number;
    price: number | string;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Get professional Consultation base price.
 * POST /professional-consultation/get-base-price or /professional-consultation/base-price-get  Body: { api_token }
 */
export const getProfessionalConsultationBasePrice = async (
  apiToken: string
): Promise<ProfessionalConsultationBasePriceGetResponse> => {
  const reg = await tryResolveProfessionalBasePriceFromRegistry(
    apiToken,
    /consultation|fire safety consult/i
  );
  if (reg?.status && reg.data) {
    return reg as ProfessionalConsultationBasePriceGetResponse;
  }
  return postProfessionalBasePriceReadSafe(() =>
    postProfessionalBasePriceGetBestEffort<ProfessionalConsultationBasePriceGetResponse>(
      apiToken,
      '/professional-consultation/get-base-price',
      '/professional-consultation/base-price-get'
    )
  );
};

/** Response for POST /professional-consultation/mode-price-create */
export interface ProfessionalConsultationModePriceResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    professional_id: number;
    mode_id: number;
    price: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Create/update professional Consultation Model price.
 * POST /professional-consultation/mode-price-create  Body: { api_token, mode_id, type: "mode", price }
 */
export const saveProfessionalConsultationModePrice = async (
  apiToken: string,
  modeId: number,
  price: number
): Promise<ProfessionalConsultationModePriceResponse> => {
  const response = await apiClient.post<ProfessionalConsultationModePriceResponse>(
    '/professional-consultation/mode-price-create',
    { api_token: apiToken, mode_id: modeId, type: 'mode', price }
  );
  return response.data;
};

/** Response for POST /professional-consultation/hour-price-create */
export interface ProfessionalConsultationHourPriceResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    professional_id: number;
    hour_id: number;
    price: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Create/update professional Consultation Hour price.
 * POST /professional-consultation/hour-price-create  Body: { api_token, hour_id, type: "hour", price }
 */
export const saveProfessionalConsultationHourPrice = async (
  apiToken: string,
  hourId: number,
  price: number
): Promise<ProfessionalConsultationHourPriceResponse> => {
  const response = await apiClient.post<ProfessionalConsultationHourPriceResponse>(
    '/professional-consultation/hour-price-create',
    { api_token: apiToken, hour_id: hourId, type: 'hour', price }
  );
  return response.data;
};

/** Response for POST /professional-consultation/get-single/prices */
export interface ProfessionalConsultationSinglePricesResponse {
  status: boolean;
  message: string;
  data?: {
    professional?: { id: number; name: string };
    mode?: { id: number; people?: number | null; price?: string | number };
    place?: { id: number; place?: string; price?: string | number };
    total_price?: number;
  };
}

/**
 * Get professional Consultation single prices for selected mode and hour.
 * POST /professional-consultation/get-single/prices  Body: { api_token, mode_id, hour_id }
 */
export const getProfessionalConsultationSinglePrices = async (
  apiToken: string,
  modeId: number,
  hourId: number
): Promise<ProfessionalConsultationSinglePricesResponse> => {
  const response = await apiClient.post<ProfessionalConsultationSinglePricesResponse>(
    '/professional-consultation/get-single/prices',
    { api_token: apiToken, mode_id: modeId, hour_id: hourId }
  );
  return response.data;
};

/** Response for POST /professional-extinguisher/base-price-create */
export interface ProfessionalExtinguisherBasePriceResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    professional_id: number;
    price: number;
    created_at: string;
    updated_at: string;
  };
}

/** Response for POST /professional-extinguisher/base-price-get */
export interface ProfessionalExtinguisherBasePriceGetResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    professional_id: number;
    price: number | string;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Get professional Extinguisher base price.
 * POST /professional-extinguisher/get-base-price or /professional-extinguisher/base-price-get  Body: { api_token }
 */
export const getProfessionalExtinguisherBasePrice = async (
  apiToken: string
): Promise<ProfessionalExtinguisherBasePriceGetResponse> => {
  const reg = await tryResolveProfessionalBasePriceFromRegistry(apiToken, /extinguisher/i);
  if (reg?.status && reg.data) {
    return reg as ProfessionalExtinguisherBasePriceGetResponse;
  }
  return postProfessionalBasePriceReadSafe(() =>
    postProfessionalBasePriceGetBestEffort<ProfessionalExtinguisherBasePriceGetResponse>(
      apiToken,
      '/professional-extinguisher/get-base-price',
      '/professional-extinguisher/base-price-get'
    )
  );
};

/**
 * Create/update professional Extinguisher base price.
 * POST /professional-extinguisher/base-price-create  Body: { api_token, price }
 */
export const saveProfessionalExtinguisherBasePrice = async (
  apiToken: string,
  price: number
): Promise<ProfessionalExtinguisherBasePriceResponse> => {
  const response = await apiClient.post<ProfessionalExtinguisherBasePriceResponse>(
    '/professional-extinguisher/base-price-create',
    { api_token: apiToken, price }
  );
  return response.data;
};

/** Response for POST /professional-marshal/base-price-create */
export interface ProfessionalMarshalBasePriceResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    professional_id: number;
    price: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Create/update professional Marshal (Training) base price.
 * POST /professional-marshal/base-price-create  Body: { api_token, price }
 */
export const saveProfessionalMarshalBasePrice = async (
  apiToken: string,
  price: number
): Promise<ProfessionalMarshalBasePriceResponse> => {
  const response = await apiClient.post<ProfessionalMarshalBasePriceResponse>(
    '/professional-marshal/base-price-create',
    { api_token: apiToken, price }
  );
  return response.data;
};

/** Response for POST /professional-marshal/base-price-get */
export interface ProfessionalMarshalBasePriceGetResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    professional_id: number;
    price: number | string;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Get professional Marshal (Training) base price.
 * POST /professional-marshal/get-base-price or /professional-marshal/base-price-get  Body: { api_token }
 */
export const getProfessionalMarshalBasePrice = async (
  apiToken: string
): Promise<ProfessionalMarshalBasePriceGetResponse> => {
  const reg = await tryResolveProfessionalBasePriceFromRegistry(
    apiToken,
    /marshal|warden|fire marshal/i
  );
  if (reg?.status && reg.data) {
    return reg as ProfessionalMarshalBasePriceGetResponse;
  }
  return postProfessionalBasePriceReadSafe(() =>
    postProfessionalBasePriceGetBestEffort<ProfessionalMarshalBasePriceGetResponse>(
      apiToken,
      '/professional-marshal/get-base-price',
      '/professional-marshal/base-price-get'
    )
  );
};

/** Response for POST /professional-marshal/people-price-create */
export interface ProfessionalMarshalPeoplePriceCreateResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    professional_id: number;
    people_id: number;
    price: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Create/update professional Marshal people price.
 * POST /professional-marshal/people-price-create  Body: { api_token, people_id, type: "people", price }
 */
export const saveProfessionalMarshalPeoplePrice = async (
  apiToken: string,
  people_id: number,
  price: number
): Promise<ProfessionalMarshalPeoplePriceCreateResponse> => {
  const response = await apiClient.post<ProfessionalMarshalPeoplePriceCreateResponse>(
    '/professional-marshal/people-price-create',
    { api_token: apiToken, people_id, type: 'people', price }
  );
  return response.data;
};

/** Response for POST /professional-marshal/place-price-create */
export interface ProfessionalMarshalPlacePriceCreateResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    professional_id: number;
    place_id: number;
    price: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Create/update professional Marshal place price.
 * POST /professional-marshal/place-price-create  Body: { api_token, place_id, type: "training_place", price }
 */
export const saveProfessionalMarshalPlacePrice = async (
  apiToken: string,
  place_id: number,
  price: number
): Promise<ProfessionalMarshalPlacePriceCreateResponse> => {
  const response = await apiClient.post<ProfessionalMarshalPlacePriceCreateResponse>(
    '/professional-marshal/place-price-create',
    { api_token: apiToken, place_id, type: 'training_place', price }
  );
  return response.data;
};

/** Response for POST /professional-marshal/training-on-price-create */
export interface ProfessionalMarshalTrainingOnPriceCreateResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    professional_id: number;
    training_on_id: number;
    price: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Create/update professional Marshal Training On price (building_type).
 * POST /professional-marshal/training-on-price-create  Body: { api_token, training_on_id, type: "building_type", price }
 */
export const saveProfessionalMarshalTrainingOnPrice = async (
  apiToken: string,
  training_on_id: number,
  price: number
): Promise<ProfessionalMarshalTrainingOnPriceCreateResponse> => {
  const response = await apiClient.post<ProfessionalMarshalTrainingOnPriceCreateResponse>(
    '/professional-marshal/training-on-price-create',
    { api_token: apiToken, training_on_id, type: 'building_type', price }
  );
  return response.data;
};

/** Response for POST /professional-marshal/experience-price-create */
export interface ProfessionalMarshalExperiencePriceCreateResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    professional_id: number;
    experience_id: number;
    price: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Create/update professional Marshal experience price.
 * POST /professional-marshal/experience-price-create  Body: { api_token, experience_id, type: "experience", price }
 */
export const saveProfessionalMarshalExperiencePrice = async (
  apiToken: string,
  experience_id: number,
  price: number
): Promise<ProfessionalMarshalExperiencePriceCreateResponse> => {
  const response = await apiClient.post<ProfessionalMarshalExperiencePriceCreateResponse>(
    '/professional-marshal/experience-price-create',
    { api_token: apiToken, experience_id, type: 'experience', price }
  );
  return response.data;
};

/** Request body for POST /professional-marshal/get-single/prices */
export interface GetProfessionalMarshalSinglePricesRequest {
  people_id: number;
  place_id: number;
  training_on_id: number;
  experience_id: number;
}

/** Response for POST /professional-marshal/get-single/prices */
export interface GetProfessionalMarshalSinglePricesResponse {
  status?: boolean;
  message?: string;
  data?: {
    professional?: { id: number; name: string };
    people?: { id: number; people?: string; price?: string };
    place?: { id: number; place?: string; price?: string };
    training_on?: { id: number; training_on?: string; price?: string };
    experience?: { id: number; experience?: string; price?: string };
    total_price?: string;
  };
}

/**
 * Get prices for selected Training (Marshal) options.
 * POST /professional-marshal/get-single/prices
 * Body: { api_token, people_id, place_id, training_on_id, experience_id }
 */
export const getProfessionalMarshalSinglePrices = async (
  apiToken: string,
  ids: GetProfessionalMarshalSinglePricesRequest
): Promise<GetProfessionalMarshalSinglePricesResponse> => {
  const response = await apiClient.post<GetProfessionalMarshalSinglePricesResponse>(
    '/professional-marshal/get-single/prices',
    { api_token: apiToken, ...ids }
  );
  return response.data;
};

/** Response for POST /professional-emergency-light/base-price-create */
export interface ProfessionalEmergencyLightBasePriceResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    professional_id: number;
    price: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Create/update professional Emergency Light base price.
 * POST /professional-emergency-light/base-price-create  Body: { api_token, price }
 */
export const saveProfessionalEmergencyLightBasePrice = async (
  apiToken: string,
  price: number
): Promise<ProfessionalEmergencyLightBasePriceResponse> => {
  const response = await apiClient.post<ProfessionalEmergencyLightBasePriceResponse>(
    '/professional-emergency-light/base-price-create',
    { api_token: apiToken, price }
  );
  return response.data;
};

/** Response for POST /professional-emergency-light/base-price-get */
export interface ProfessionalEmergencyLightBasePriceGetResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    professional_id: number;
    price: number | string;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Get professional Emergency Light base price.
 * POST /professional-emergency-light/get-base-price or /professional-emergency-light/base-price-get  Body: { api_token }
 */
export const getProfessionalEmergencyLightBasePrice = async (
  apiToken: string
): Promise<ProfessionalEmergencyLightBasePriceGetResponse> => {
  const reg = await tryResolveProfessionalBasePriceFromRegistry(
    apiToken,
    /emergency\s*light|emergency lighting|lighting\s*test/i
  );
  if (reg?.status && reg.data) {
    return reg as ProfessionalEmergencyLightBasePriceGetResponse;
  }
  return postProfessionalBasePriceReadSafe(() =>
    postProfessionalBasePriceGetBestEffort<ProfessionalEmergencyLightBasePriceGetResponse>(
      apiToken,
      '/professional-emergency-light/get-base-price',
      '/professional-emergency-light/base-price-get'
    )
  );
};

/** Response for POST /professional-emergency-light/price-create */
export interface ProfessionalEmergencyLightPriceCreateResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    professional_id: number;
    light_id: number;
    price: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Create/update professional emergency light price (e.g. Select Emergency light, floor, type, test).
 * POST /professional-emergency-light/price-create  Body: { api_token, light_id, type, price }
 * @param type One of: "light" | "floor" | "light_type" | "light_test"
 */
export const createProfessionalEmergencyLightPrice = async (
  apiToken: string,
  light_id: number,
  type: string,
  price: number
): Promise<ProfessionalEmergencyLightPriceCreateResponse> => {
  const response = await apiClient.post<ProfessionalEmergencyLightPriceCreateResponse>(
    '/professional-emergency-light/price-create',
    { api_token: apiToken, light_id, type, price }
  );
  return response.data;
};

/** Response for POST /professional-emergency-light/floor-price-create */
export interface ProfessionalEmergencyLightFloorPriceCreateResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    professional_id: number;
    floor_id: number;
    price: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Create/update professional emergency light floor price.
 * POST /professional-emergency-light/floor-price-create  Body: { api_token, floor_id, type: "floor", price }
 */
export const saveProfessionalEmergencyLightFloorPrice = async (
  apiToken: string,
  floor_id: number,
  price: number
): Promise<ProfessionalEmergencyLightFloorPriceCreateResponse> => {
  const response = await apiClient.post<ProfessionalEmergencyLightFloorPriceCreateResponse>(
    '/professional-emergency-light/floor-price-create',
    { api_token: apiToken, floor_id, type: "floor", price }
  );
  return response.data;
};

/** Response for POST /professional-emergency-light-test/price-create */
export interface ProfessionalEmergencyLightTestPriceCreateResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    professional_id: number;
    light_test_id: number;
    price: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Create/update professional emergency light test price.
 * POST /professional-emergency-light-test/price-create  Body: { api_token, light_test_id, type: "light_test", price }
 */
export const saveProfessionalEmergencyLightTestPrice = async (
  apiToken: string,
  light_test_id: number,
  price: number
): Promise<ProfessionalEmergencyLightTestPriceCreateResponse> => {
  const response = await apiClient.post<ProfessionalEmergencyLightTestPriceCreateResponse>(
    '/professional-emergency-light-test/price-create',
    { api_token: apiToken, light_test_id, type: "light_test", price }
  );
  return response.data;
};

/** Response for POST /professional-emergency-light-type/price-create */
export interface ProfessionalEmergencyLightTypePriceCreateResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    professional_id: number;
    light_type_id: number;
    price: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Create/update professional emergency light type price.
 * POST /professional-emergency-light-type/price-create  Body: { api_token, light_type_id, type: "light_type", price }
 */
export const saveProfessionalEmergencyLightTypePrice = async (
  apiToken: string,
  light_type_id: number,
  price: number
): Promise<ProfessionalEmergencyLightTypePriceCreateResponse> => {
  const response = await apiClient.post<ProfessionalEmergencyLightTypePriceCreateResponse>(
    '/professional-emergency-light-type/price-create',
    { api_token: apiToken, light_type_id, type: "light_type", price }
  );
  return response.data;
};

/** Response for POST /professional-extinguisher-wise/price-create */
export interface ProfessionalExtinguisherWisePriceCreateResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    professional_id: number;
    extinguisher_id: number;
    price: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Create/update professional extinguisher-wise price (e.g. Select Extinguisher, Floor, Type, Last Service).
 * POST /professional-extinguisher-wise/price-create  Body: { api_token, extinguisher_id, type, price }
 * @param type One of: "extinguisher" | "floor" | "metarials" | "last_service"
 */
export const createProfessionalExtinguisherWisePrice = async (
  apiToken: string,
  extinguisher_id: number,
  type: string,
  price: number
): Promise<ProfessionalExtinguisherWisePriceCreateResponse> => {
  const response = await apiClient.post<ProfessionalExtinguisherWisePriceCreateResponse>(
    '/professional-extinguisher-wise/price-create',
    { api_token: apiToken, extinguisher_id, type, price }
  );
  return response.data;
};

/** Response for POST /professional-extinguisher/floor-price-create */
export interface ProfessionalExtinguisherFloorPriceCreateResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    professional_id: number;
    floor_id: number;
    price: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Create/update professional extinguisher floor price.
 * POST /professional-extinguisher/floor-price-create  Body: { api_token, floor_id, type: "floor", price }
 */
export const saveProfessionalExtinguisherFloorPrice = async (
  apiToken: string,
  floor_id: number,
  price: number
): Promise<ProfessionalExtinguisherFloorPriceCreateResponse> => {
  const response = await apiClient.post<ProfessionalExtinguisherFloorPriceCreateResponse>(
    '/professional-extinguisher/floor-price-create',
    { api_token: apiToken, floor_id, type: "floor", price }
  );
  return response.data;
};

/** Response for POST /professional-extinguisher/type-price-create */
export interface ProfessionalExtinguisherTypePriceCreateResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    professional_id: number;
    extinguisher_type_id: number;
    price: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Create/update professional extinguisher type price (Select Extinguisher Type — same options as `fetchExtinguisherServiceOptions(..., "metarials")`).
 * POST /professional-extinguisher/type-price-create
 * Body: `{ api_token, extinguisher_type_id, type: "metarials", price }` — must match admin `saveAdminExtinguisherTypePrice` and wise-price `"metarials"`; `"extinguisher"` is only for count on `/professional-extinguisher-wise/price-create`.
 */
export const saveProfessionalExtinguisherTypePrice = async (
  apiToken: string,
  extinguisher_type_id: number,
  price: number
): Promise<ProfessionalExtinguisherTypePriceCreateResponse> => {
  const response = await apiClient.post<ProfessionalExtinguisherTypePriceCreateResponse>(
    '/professional-extinguisher/type-price-create',
    { api_token: apiToken, extinguisher_type_id, type: "metarials", price }
  );
  return response.data;
};

/** Response for POST /professional-extinguisher/last-service-price-create */
export interface ProfessionalExtinguisherLastServicePriceCreateResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    professional_id: number;
    last_service_id: number;
    price: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Create/update professional extinguisher last service price.
 * POST /professional-extinguisher/last-service-price-create  Body: { api_token, last_service_id, type: "last_service", price }
 */
export const saveProfessionalExtinguisherLastServicePrice = async (
  apiToken: string,
  last_service_id: number,
  price: number
): Promise<ProfessionalExtinguisherLastServicePriceCreateResponse> => {
  const response = await apiClient.post<ProfessionalExtinguisherLastServicePriceCreateResponse>(
    '/professional-extinguisher/last-service-price-create',
    { api_token: apiToken, last_service_id, type: "last_service", price }
  );
  return response.data;
};

/** Request body for POST /professional-fire-Extingusher/get-single/prices */
export interface GetProfessionalExtinguisherSinglePricesRequest {
  api_token: string;
  extinguisher_id: number;
  floor_id: number;
  last_service_id: number;
  extinguisher_type_id: number;
}

/** Response for POST /professional-fire-Extingusher/get-single/prices */
export interface GetProfessionalExtinguisherSinglePricesResponse {
  message?: string;
  status?: boolean;
  data?: {
    professional?: { id: number; name: string };
    extinguisher?: { id: number; smoke_detector?: string; price?: string };
    floor?: { id: number; floor?: string; price?: string };
    last_service?: { id: number; last_service?: string; price?: string };
    extinguisher_type?: { id: number; system_type?: string; price?: string };
    total_price?: number;
  };
}

/**
 * Get prices for selected Extinguisher options (single combo).
 * POST /professional-fire-Extingusher/get-single/prices
 * Body: { api_token, extinguisher_id, floor_id, last_service_id, extinguisher_type_id }
 */
export const getProfessionalExtinguisherSinglePrices = async (
  apiToken: string,
  ids: Omit<GetProfessionalExtinguisherSinglePricesRequest, 'api_token'>
): Promise<GetProfessionalExtinguisherSinglePricesResponse> => {
  const response = await apiClient.post<GetProfessionalExtinguisherSinglePricesResponse>(
    '/professional-fire-Extingusher/get-single/prices',
    { api_token: apiToken, ...ids }
  );
  return response.data;
};

/** Request body for POST /professional-fire-light-testing/get-single/prices */
export interface GetProfessionalEmergencyLightSinglePricesRequest {
  api_token: string;
  light_id: number;
  floor_id: number;
  light_test_id: number;
  light_type_id: number;
}

/** Response for POST /professional-fire-light-testing/get-single/prices */
export interface GetProfessionalEmergencyLightSinglePricesResponse {
  status?: boolean;
  message?: string;
  data?: {
    professional?: { id: number; name: string };
    light?: { id: number; lights?: string; price?: string };
    floor?: { id: number; floor?: string; price?: string };
    light_test?: { id: number; light_test?: string; price?: string };
    light_type?: { id: number; light_type?: string; price?: string };
  };
}

/**
 * Get prices for selected Emergency Light options (single combo).
 * POST /professional-fire-light-testing/get-single/prices
 * Body: { api_token, light_id, floor_id, light_test_id, light_type_id }
 */
export const getProfessionalEmergencyLightSinglePrices = async (
  apiToken: string,
  ids: Omit<GetProfessionalEmergencyLightSinglePricesRequest, 'api_token'>
): Promise<GetProfessionalEmergencyLightSinglePricesResponse> => {
  const response = await apiClient.post<GetProfessionalEmergencyLightSinglePricesResponse>(
    '/professional-fire-light-testing/get-single/prices',
    { api_token: apiToken, ...ids }
  );
  return response.data;
};

/** Response for POST /professional-fire-alarm-base-price */
export interface ProfessionalFireAlarmBasePriceResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    professional_id: number;
    price: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Save professional Fire Alarm base price.
 * POST /professional-fire-alarm-base-price  Body: { api_token, price }  (price as number, e.g. 150.00)
 */
export const saveProfessionalFireAlarmBasePrice = async (
  apiToken: string,
  price: number
): Promise<ProfessionalFireAlarmBasePriceResponse> => {
  const response = await apiClient.post<ProfessionalFireAlarmBasePriceResponse>(
    '/professional-fire-alarm-base-price',
    { api_token: apiToken, price },
    authHeaders(apiToken)
  );
  return response.data;
};

/** Response for POST /professional-fire-alarm/get-base-price (price in data is string e.g. "123.00") */
export interface GetProfessionalFireAlarmBasePriceResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    professional_id: number;
    price: string;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Get professional Fire Alarm base price for display.
 * POST /professional-fire-alarm/get-base-price  Body: { api_token }
 */
export const getProfessionalFireAlarmBasePrice = async (
  apiToken: string
): Promise<GetProfessionalFireAlarmBasePriceResponse> => {
  return postProfessionalBasePriceReadSafe(() =>
    apiClient.post<GetProfessionalFireAlarmBasePriceResponse>(
      '/professional-fire-alarm/get-base-price',
      { api_token: apiToken },
      authHeaders(apiToken)
    )
  );
};

/** Request body for POST /professional-fire-alarm/get-single/prices */
export interface GetProfessionalFireAlarmSinglePricesRequest {
  api_token: string;
  smoke_detectors_id: number;
  call_point_id: number;
  floor_id: number;
  panel_id: number;
  system_type_id: number;
  last_service_id: number;
}

/** Response for POST /professional-fire-alarm/get-single/prices */
export interface GetProfessionalFireAlarmSinglePricesResponse {
  status: boolean;
  message: string;
  data?: {
    professional?: { id: number; name: string };
    smoke_detector?: { id: number; smoke_detector?: string; price?: string };
    call_point?: { id: number; call_point?: string; price?: string };
    floor?: { id: number; floor?: string; price?: string };
    panel?: { id: number; panel?: string; price?: string };
    system_type?: { id: number; system_type?: string; price?: string };
    last_service?: { id: number; last_service?: string; price?: string };
  };
}

/**
 * Get prices for selected Fire Alarm options (single combo).
 * POST /professional-fire-alarm/get-single/prices
 * Body: { api_token, smoke_detectors_id, call_point_id, floor_id, panel_id, system_type_id, last_service_id }
 */
export const getProfessionalFireAlarmSinglePrices = async (
  apiToken: string,
  ids: Omit<GetProfessionalFireAlarmSinglePricesRequest, 'api_token'>
): Promise<GetProfessionalFireAlarmSinglePricesResponse> => {
  const response = await apiClient.post<GetProfessionalFireAlarmSinglePricesResponse>(
    '/professional-fire-alarm/get-single/prices',
    { api_token: apiToken, ...ids },
    authHeaders(apiToken)
  );
  return response.data;
};

/** Response for POST /professional-fire-alarm/smoke-detectors/create-price */
export interface CreateProfessionalFireAlarmSmokeDetectorPriceResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    professional_id: number;
    smoke_detectors_id: number;
    price: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Create/update professional Fire Alarm smoke/heat detector price.
 * POST /professional-fire-alarm/smoke-detectors/create-price
 * Body: { api_token, smoke_detectors_id, type: "ditectors", price }
 */
export const createProfessionalFireAlarmSmokeDetectorPrice = async (
  apiToken: string,
  smoke_detectors_id: number,
  price: number
): Promise<CreateProfessionalFireAlarmSmokeDetectorPriceResponse> => {
  const response = await apiClient.post<CreateProfessionalFireAlarmSmokeDetectorPriceResponse>(
    '/professional-fire-alarm/smoke-detectors/create-price',
    {
      api_token: apiToken,
      smoke_detectors_id,
      type: 'ditectors',
      price,
    },
    authHeaders(apiToken)
  );
  return response.data;
};

/** Response for POST /professional-fire-alarm/call-points/create-price */
export interface CreateProfessionalFireAlarmCallPointPriceResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    professional_id: number;
    call_point_id: number;
    price: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Create/update professional Fire Alarm manual call point price.
 * POST /professional-fire-alarm/call-points/create-price
 * Body: { api_token, call_point_id, type: "call_points", price }
 */
export const createProfessionalFireAlarmCallPointPrice = async (
  apiToken: string,
  call_point_id: number,
  price: number
): Promise<CreateProfessionalFireAlarmCallPointPriceResponse> => {
  const response = await apiClient.post<CreateProfessionalFireAlarmCallPointPriceResponse>(
    '/professional-fire-alarm/call-points/create-price',
    {
      api_token: apiToken,
      call_point_id,
      type: 'call_points',
      price,
    },
    authHeaders(apiToken)
  );
  return response.data;
};

/** Response for POST /professional-fire-alarm/floor/create-price */
export interface CreateProfessionalFireAlarmFloorPriceResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    professional_id: number;
    floor_id: number;
    price: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Create/update professional Fire Alarm floor price.
 * POST /professional-fire-alarm/floor/create-price
 * Body: { api_token, floor_id, type: "floors", price }
 */
export const createProfessionalFireAlarmFloorPrice = async (
  apiToken: string,
  floor_id: number,
  price: number
): Promise<CreateProfessionalFireAlarmFloorPriceResponse> => {
  const response = await apiClient.post<CreateProfessionalFireAlarmFloorPriceResponse>(
    '/professional-fire-alarm/floor/create-price',
    {
      api_token: apiToken,
      floor_id,
      type: 'floors',
      price,
    },
    authHeaders(apiToken)
  );
  return response.data;
};

/** Response for POST /professional-fire-alarm/panel/create-price */
export interface CreateProfessionalFireAlarmPanelPriceResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    professional_id: number;
    panel_id: number;
    price: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Create/update professional Fire Alarm panel price.
 * POST /professional-fire-alarm/panel/create-price
 * Body: { api_token, panel_id, type: "alarm_panels", price }
 */
export const createProfessionalFireAlarmPanelPrice = async (
  apiToken: string,
  panel_id: number,
  price: number
): Promise<CreateProfessionalFireAlarmPanelPriceResponse> => {
  const response = await apiClient.post<CreateProfessionalFireAlarmPanelPriceResponse>(
    '/professional-fire-alarm/panel/create-price',
    {
      api_token: apiToken,
      panel_id,
      type: 'alarm_panels',
      price,
    },
    authHeaders(apiToken)
  );
  return response.data;
};

/** Response for POST /professional-fire-alarm/system-type/create-price */
export interface CreateProfessionalFireAlarmSystemTypePriceResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    professional_id: number;
    system_type_id: number;
    price: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Create/update professional Fire Alarm system type price.
 * POST /professional-fire-alarm/system-type/create-price
 * Body: { api_token, system_type_id, type: "system_type", price }
 */
export const createProfessionalFireAlarmSystemTypePrice = async (
  apiToken: string,
  system_type_id: number,
  price: number
): Promise<CreateProfessionalFireAlarmSystemTypePriceResponse> => {
  const response = await apiClient.post<CreateProfessionalFireAlarmSystemTypePriceResponse>(
    '/professional-fire-alarm/system-type/create-price',
    {
      api_token: apiToken,
      system_type_id,
      type: 'system_type',
      price,
    },
    authHeaders(apiToken)
  );
  return response.data;
};

/** Response for POST /professional-fire-alarm/last-service/create-price */
export interface CreateProfessionalFireAlarmLastServicePriceResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    professional_id: number;
    last_service_id: number;
    price: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Create/update professional Fire Alarm last service price.
 * POST /professional-fire-alarm/last-service/create-price
 * Body: { api_token, last_service_id, type: "last_service", price }
 */
export const createProfessionalFireAlarmLastServicePrice = async (
  apiToken: string,
  last_service_id: number,
  price: number
): Promise<CreateProfessionalFireAlarmLastServicePriceResponse> => {
  const response = await apiClient.post<CreateProfessionalFireAlarmLastServicePriceResponse>(
    '/professional-fire-alarm/last-service/create-price',
    {
      api_token: apiToken,
      last_service_id,
      type: 'last_service',
      price,
    },
    authHeaders(apiToken)
  );
  return response.data;
};

/** Normalize GET /services (and variants) to a flat list for dropdowns. */
function extractServicesFromApiPayload(root: unknown): ServiceResponse[] | null {
  if (Array.isArray(root)) {
    return root as ServiceResponse[];
  }
  if (root == null || typeof root !== 'object') {
    return null;
  }
  const payload = root as Record<string, unknown>;
  const raw = payload.data;

  if (Array.isArray(raw)) {
    return raw as ServiceResponse[];
  }

  // Laravel paginator: { data: { data: [...], current_page, ... } }
  if (raw != null && typeof raw === 'object' && 'data' in raw && Array.isArray((raw as ServicesPaginatedResponse).data)) {
    return (raw as ServicesPaginatedResponse).data;
  }

  // Alternate wrappers
  if (Array.isArray(payload.services)) {
    return payload.services as ServiceResponse[];
  }

  if (
    raw != null &&
    typeof raw === 'object' &&
    raw !== null &&
    'id' in raw &&
    (raw as { service_name?: string }).service_name != null
  ) {
    return [raw as unknown as ServiceResponse];
  }

  const ok =
    payload.status === 'success' ||
    payload.status === true ||
    payload.status === 'true' ||
    (payload as { success?: boolean }).success === true;
  if (ok && raw != null && typeof raw === 'object' && 'data' in raw && Array.isArray((raw as ServicesPaginatedResponse).data)) {
    return (raw as ServicesPaginatedResponse).data;
  }

  return null;
}

/**
 * Fetch all services
 * @returns Promise with the API response
 */
export const fetchServices = async (): Promise<ServiceResponse[]> => {
  try {
    const response = await apiClient.get<unknown>('/services');
    const extracted = extractServicesFromApiPayload(response.data);
    if (extracted != null) {
      return extracted;
    }

    console.warn('Unexpected services API response structure:', response.data);
    return [];
  } catch (error) {
    console.error('Error fetching services:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to fetch services',
          error: error.response.data?.error || error.message,
          status: error.response.status,
        };
      } else if (error.request) {
        throw {
          success: false,
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    throw {
      success: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Fetch all property types
 * @returns Promise with the API response
 */
export const fetchPropertyTypes = async (): Promise<PropertyTypeResponse[]> => {
  try {
    const response = await apiClient.get<PropertyTypesApiResponse>('/all/property_types');
    console.log('Property Types API Response:', response.data);
    
    // Handle the response structure: { status: 'success', data: [...] }
    if (response.data.status === 'success' && response.data.data) {
      // Check if data is a direct array (current API structure)
      if (Array.isArray(response.data.data)) {
        console.log('Property types found (direct array):', response.data.data.length);
        return response.data.data; // Direct array
      }
      // Check if data is a paginated object with nested data array
      if (typeof response.data.data === 'object' && 'data' in response.data.data && Array.isArray((response.data.data as any).data)) {
        console.log('Property types found (paginated):', (response.data.data as any).data.length);
        return (response.data.data as any).data; // Nested paginated array
      }
    }
    
    // Fallback: return empty array if structure is unexpected
    console.warn('Unexpected property types API response structure:', response.data);
    return [];
  } catch (error) {
    console.error('Error fetching property types:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to fetch property types',
          error: error.response.data?.error || error.message,
          status: error.response.status,
        };
      } else if (error.request) {
        throw {
          success: false,
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    throw {
      success: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Fetch floor pricing options
 * GET /floor-pricing
 * API returns id, floor (and optionally label, price); normalize so UI can display dynamically.
 */
export const fetchFloorPricing = async (): Promise<FloorPricingItem[]> => {
  try {
    const response = await apiClient.get<FloorPricingApiResponse>('/floor-pricing');
    if (response.data?.status && Array.isArray(response.data.data)) {
      const raw = response.data.data as Array<{ id?: number; floor?: string; label?: string; price?: string | null; [k: string]: unknown }>;
      return raw.map((item) => {
        const floor = (item.floor ?? '').replace(/\r\n/g, '').trim();
        const label = (item.label ?? item.floor ?? '').replace(/\r\n/g, '').trim() || floor;
        return {
          id: item.id,
          floor: floor || label,
          label: label || floor,
          price: item.price ?? null,
          custom_quote: Boolean(item.custom_quote),
        } as FloorPricingItem;
      });
    }
    return [];
  } catch (error) {
    console.error('Error fetching floor pricing:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to fetch floor pricing',
          error: error.response.data?.error || error.message,
          status: error.response.status,
        };
      } else if (error.request) {
        throw {
          success: false,
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    throw {
      success: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Fetch all approximate people options
 * @returns Promise with the API response
 */
export const fetchApproximatePeople = async (): Promise<ApproximatePeopleResponse[]> => {
  try {
    const response = await apiClient.get<ApproximatePeopleApiResponse>('/approximate-people');
    
    // Handle the response structure
    if (response.data.status === 'success' && response.data.data) {
      return response.data.data; // Direct array, not paginated
    }
    
    // Fallback: return empty array if structure is unexpected
    return [];
  } catch (error) {
    console.error('Error fetching approximate people:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to fetch approximate people',
          error: error.response.data?.error || error.message,
          status: error.response.status,
        };
      } else if (error.request) {
        throw {
          success: false,
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    throw {
      success: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Fetch FRA durations (urgency options)
 * GET /fra-durations
 * @returns Promise with duration options (id, duration)
 */
export const fetchFraDurations = async (): Promise<FraDurationItem[]> => {
  try {
    const response = await apiClient.get<FraDurationsApiResponse>('/fra-durations');
    if (response.data?.status === true && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching FRA durations:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to fetch FRA durations',
          error: error.response.data?.error || error.message,
          status: error.response.status,
        };
      } else if (error.request) {
        throw {
          success: false,
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    throw {
      success: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// TypeScript types for Selected Service Store request
export interface SelectedServiceStoreRequest {
  api_token?: string;
  service_id: number;
  property_type_id: number;
  approximate_people_id: number;
  /** Floor option ID from floor-pricing API (sent so backend receives ID, not label). */
  number_of_floors_id?: number;
  /** Floor value/label; when number_of_floors_id is set, send ID as string so backend can validate. */
  number_of_floors: string;
  /** FRA duration/urgency option id from GET /fra-durations (e.g. 1 = "7+ days"). */
  duration_id?: number;
  preferred_date: string;
  access_note: string;
  post_code: string;
  search_radius: string;
  /** Professional ID when user selects a professional (e.g. from Book Now). Optional on initial store. */
  professional_id?: number | null;
}

export interface UpdateSelectedServiceRequest {
  api_token?: string;
  id: number;
  professional_id: number;
}

export interface SelectedServiceStoreResponse {
  status: string;
  message: string;
  data?: any;
}

/** Request body for POST /filter-professional/for-fra (questionnaire + geo; backend uses miles, not search_radius). */
export interface FilterProfessionalForFraRequest {
  service_id: number;
  property_type_id: number;
  approximate_people_id: number;
  duration_id: number;
  number_of_floors: number;
  post_code: string;
  miles: number;
}

/** Request body for POST /filter-professional/for-alarm — questionnaire + geo. */
export interface FilterProfessionalForAlarmRequest {
  service_id: number;
  smoke_detector_id: number;
  call_point_id: number;
  floor_id: number;
  panel_id: number;
  system_type_id: number;
  /** Omitted when customer skips optional last-service step. */
  last_service_id?: number;
  post_code: string;
  miles: number;
}

/** Request body for POST /filter-professional/for-extinguisher — questionnaire + geo. */
export interface FilterProfessionalForExtinguisherRequest {
  service_id: number;
  extinguisher_id: number;
  floor_id: number;
  /** Omitted when customer skips optional extinguisher type step. */
  type_id?: number;
  /** Omitted when customer skips optional last-service step. */
  last_service_id?: number;
  post_code: string;
  miles: number;
}

/** Request body for POST /filter-professional/for-emergency-light — questionnaire + geo. */
export interface FilterProfessionalForEmergencyLightRequest {
  service_id: number;
  light_id: number;
  floor_id: number;
  light_type_id?: number | null;
  light_test_id?: number | null;
  post_code: string;
  miles: number;
}

/** Request body for POST /filter-professional/for-marshal — questionnaire + geo. */
export interface FilterProfessionalForMarshalRequest {
  service_id: number;
  people_id: number;
  place_id: number;
  building_type_id: number;
  /** null when customer skips optional prior-training step. */
  experience_id: number | null;
  post_code: string;
  miles: number;
}

/** Request body for POST /filter-professional/for-consultation — questionnaire + geo. */
export interface FilterProfessionalForConsultationRequest {
  service_id: number;
  mode_id: number;
  hour_id: number;
  post_code: string;
  miles: number;
}

/** Certificate row from filter-professional responses (ids may need client labels when name is null). */
export interface FilterProfessionalCertificateItem {
  id: number;
  certificate_name?: string | null;
  certificate_file?: string | null;
}

/** Experience row from filter-professional responses */
export interface FilterProfessionalExperienceItem {
  id: number;
  experience_name?: string | null;
}

/** Membership row from filter-professional responses */
export interface FilterProfessionalMembershipItem {
  id: number;
  organization_name?: string | null;
  /** Legacy flat logo — prefer `option.logo` when present. */
  logo?: string | null;
  status?: string | null;
  option?: {
    id?: number;
    option?: string;
    logo?: string | null;
  } | null;
}

/** Single professional from POST /filter-professional/for-fra response */
export interface FilterProfessionalForFraItem {
  id: number;
  name: string;
  initials: string;
  profile_image: string;
  verified: boolean;
  rating: number;
  total_reviews: number;
  location?: string;
  response_time?: string;
  price: number;
  price_label: string;
  /** When present, use for Booking Summary (service fee) */
  service_price?: number;
  platform_fee_percent?: string;
  platform_fee_amount?: number;
  total_price?: number;
  professional_certificates?: FilterProfessionalCertificateItem[];
  professional_experience?: FilterProfessionalExperienceItem[];
  membership?: FilterProfessionalMembershipItem[];
  memberships?: FilterProfessionalMembershipItem[];
}

export interface FilterProfessionalForFraResponse {
  status: boolean;
  message: string;
  data?: FilterProfessionalForFraItem[];
}

/**
 * POST /filter-professional/for-fra — filter professionals for FRA by service/questionnaire + location.
 * Called only when user clicks "Find Professional"; not used on Book flow.
 */
export const filterProfessionalForFra = async (
  data: FilterProfessionalForFraRequest
): Promise<FilterProfessionalForFraResponse> => {
  const response = await apiClient.post<FilterProfessionalForFraResponse>('/filter-professional/for-fra', data);
  return response.data;
};

/** POST /filter-professional/for-alarm — filter professionals for Fire Alarm. */
export const filterProfessionalForAlarm = async (
  data: FilterProfessionalForAlarmRequest
): Promise<FilterProfessionalForFraResponse> => {
  const response = await apiClient.post<FilterProfessionalForFraResponse>('/filter-professional/for-alarm', data);
  return response.data;
};

/** POST /filter-professional/for-extinguisher — filter professionals for Fire Extinguisher. */
export const filterProfessionalForExtinguisher = async (
  data: FilterProfessionalForExtinguisherRequest
): Promise<FilterProfessionalForFraResponse> => {
  const response = await apiClient.post<FilterProfessionalForFraResponse>('/filter-professional/for-extinguisher', data);
  return response.data;
};

/** POST /filter-professional/for-emergency-light — filter professionals for Emergency Lighting. */
export const filterProfessionalForEmergencyLight = async (
  data: FilterProfessionalForEmergencyLightRequest
): Promise<FilterProfessionalForFraResponse> => {
  const response = await apiClient.post<FilterProfessionalForFraResponse>('/filter-professional/for-emergency-light', data);
  return response.data;
};

/** POST /filter-professional/for-marshal — filter professionals for Fire Marshal / Warden Training. */
export const filterProfessionalForMarshal = async (
  data: FilterProfessionalForMarshalRequest
): Promise<FilterProfessionalForFraResponse> => {
  const response = await apiClient.post<FilterProfessionalForFraResponse>('/filter-professional/for-marshal', data);
  return response.data;
};

/** POST /filter-professional/for-consultation — filter professionals for Fire Safety Consultation. */
export const filterProfessionalForConsultation = async (
  data: FilterProfessionalForConsultationRequest
): Promise<FilterProfessionalForFraResponse> => {
  const response = await apiClient.post<FilterProfessionalForFraResponse>('/filter-professional/for-consultation', data);
  return response.data;
};

/**
 * Store selected service with all details
 * @param data - Selected service data
 * @returns Promise with the API response
 */
/**
 * Update selected service with professional_id (e.g. when user clicks Book Now)
 */
export const updateSelectedService = async (data: UpdateSelectedServiceRequest): Promise<SelectedServiceStoreResponse> => {
  try {
    const response = await apiClient.post<SelectedServiceStoreResponse>('/selected_services/update', data);
    return response.data;
  } catch (error) {
    console.error('Error updating selected service:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to update selected service',
          error: error.response.data?.error || error.message,
          status: error.response.status,
        };
      } else if (error.request) {
        throw {
          success: false,
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    throw {
      success: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const storeSelectedService = async (data: SelectedServiceStoreRequest): Promise<SelectedServiceStoreResponse> => {
  try {
    const response = await apiClient.post<SelectedServiceStoreResponse>('/selected_services/store', data);
    return response.data;
  } catch (error) {
    console.error('Error storing selected service:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to store selected service',
          error: error.response.data?.error || error.message,
          status: error.response.status,
        };
      } else if (error.request) {
        throw {
          success: false,
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    throw {
      success: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Fire Alarm: create selected service when user clicks Book Now on Compare Professionals.
 * POST /fire-alarm/selected-service/create (or selected-servie/create per backend)
 * Body: api_token? (when logged in), professional_id, service_id, smoke_detector_id, call_point_id,
 *       floor_id, panel_id, system_type_id, last_service_id, access_note, post_code, search_radius.
 */
export interface FireAlarmSelectedServiceCreateRequest {
  api_token?: string;
  professional_id: number;
  service_id: number;
  smoke_detector_id: number;
  call_point_id: number;
  floor_id: number;
  panel_id: number;
  system_type_id: number;
  /** Omitted when customer skipped optional last-service answer. */
  last_service_id?: number;
  access_note: string;
  post_code: string;
  search_radius: string;
}

export interface FireAlarmSelectedServiceCreateResponse {
  status: string;
  message: string;
  data?: {
    session_id?: number;
    professional_id?: number;
    customer_id?: number | null;
    service_id?: number;
    [key: string]: unknown;
  };
}

export const createFireAlarmSelectedService = async (
  data: FireAlarmSelectedServiceCreateRequest
): Promise<FireAlarmSelectedServiceCreateResponse> => {
  try {
    const response = await apiClient.post<FireAlarmSelectedServiceCreateResponse>(
      '/fire-alarm/selected-servie/create',
      data
    );
    return response.data;
  } catch (error) {
    console.error('Error creating fire alarm selected service:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to create fire alarm selected service',
          error: error.response.data?.error || error.message,
          status: error.response.status,
        };
      } else if (error.request) {
        throw {
          success: false,
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    throw {
      success: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Fire Extinguisher Selected Service create (Book Now flow).
 * POST /fire-extingusher/selected-servie/create
 * Body: api_token?, professional_id, service_id, extinguisher_id, floor_id, type_id, last_service_id, access_note, post_code, search_radius, preffered_date
 */
export interface FireExtinguisherSelectedServiceCreateRequest {
  api_token?: string;
  professional_id: number;
  service_id: number;
  extinguisher_id: number;
  floor_id: number;
  /** Omitted when customer skipped optional type / last-service answers. */
  type_id?: number;
  last_service_id?: number;
  access_note: string;
  post_code: string;
  search_radius: string;
  preffered_date: string;
}

export interface FireExtinguisherSelectedServiceCreateResponse {
  status: string;
  message: string;
  data?: {
    session_id?: number;
    professional_id?: number;
    customer_id?: number | null;
    service_id?: number;
    [key: string]: unknown;
  };
}

export const createFireExtinguisherSelectedService = async (
  data: FireExtinguisherSelectedServiceCreateRequest
): Promise<FireExtinguisherSelectedServiceCreateResponse> => {
  try {
    const response = await apiClient.post<FireExtinguisherSelectedServiceCreateResponse>(
      '/fire-extingusher/selected-servie/create',
      data
    );
    return response.data;
  } catch (error) {
    console.error('Error creating fire extinguisher selected service:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to create fire extinguisher selected service',
          error: error.response.data?.error || error.message,
          status: error.response.status,
        };
      } else if (error.request) {
        throw {
          success: false,
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    throw {
      success: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Emergency Light: create selected service when user clicks Book Now (service_id 39).
 * POST /fire-emergency-light/selected-servie/create
 * Body: api_token?, professional_id, service_id, light_id, floor_id, light_type_id, light_test_id, access_note, post_code, search_radius, preffered_date
 */
export interface EmergencyLightSelectedServiceCreateRequest {
  api_token?: string;
  professional_id: number;
  service_id: number;
  light_id: number;
  floor_id: number;
  /** null when customer skips optional lighting type step. */
  light_type_id: number | null;
  /** null when customer skips optional test frequency step. */
  light_test_id: number | null;
  access_note: string;
  post_code: string;
  search_radius: string;
  preffered_date: string;
}

export interface EmergencyLightSelectedServiceCreateResponse {
  status: string;
  message: string;
  data?: {
    session_id?: number;
    professional_id?: number;
    customer_id?: number | null;
    service_id?: number;
    [key: string]: unknown;
  };
}

export const createEmergencyLightSelectedService = async (
  data: EmergencyLightSelectedServiceCreateRequest
): Promise<EmergencyLightSelectedServiceCreateResponse> => {
  try {
    const body: Record<string, unknown> = {
      professional_id: Number(data.professional_id),
      service_id: Number(data.service_id),
      light_id: Number(data.light_id),
      floor_id: Number(data.floor_id),
      light_type_id:
        data.light_type_id == null
          ? null
          : Number(data.light_type_id) > 0
            ? Number(data.light_type_id)
            : null,
      light_test_id:
        data.light_test_id == null
          ? null
          : Number(data.light_test_id) > 0
            ? Number(data.light_test_id)
            : null,
      access_note: String(data.access_note ?? ''),
      post_code: String(data.post_code ?? ''),
      search_radius: String(data.search_radius ?? ''),
      preffered_date: String(data.preffered_date ?? ''),
    };
    if (data.api_token) body.api_token = data.api_token;
    const response = await apiClient.post<EmergencyLightSelectedServiceCreateResponse>(
      '/fire-emergency-light/selected-servie/create',
      body
    );
    return response.data;
  } catch (error) {
    console.error('Error creating emergency light selected service:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to create emergency light selected service',
          error: error.response.data?.error || error.message,
          status: error.response.status,
        };
      } else if (error.request) {
        throw {
          success: false,
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    throw {
      success: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Fire Marshal (Warden Training): create selected service when user clicks Book Now (service_id 45).
 * POST /fire-marshal/selected-servie/create
 * Body: api_token?, professional_id, service_id, people_id, place_id, building_type_id, experience_id, access_note, post_code, search_radius, preffered_date
 */
export interface FireMarshalSelectedServiceCreateRequest {
  api_token?: string;
  professional_id: number;
  service_id: number;
  people_id: number;
  place_id: number;
  building_type_id: number;
  /** null when customer skips optional prior-training step. */
  experience_id: number | null;
  access_note: string;
  post_code: string;
  search_radius: string;
  preffered_date: string;
}

export interface FireMarshalSelectedServiceCreateResponse {
  status: string;
  message: string;
  data?: {
    session_id?: number;
    professional_id?: number;
    service_id?: number;
    [key: string]: unknown;
  };
}

export const createFireMarshalSelectedService = async (
  data: FireMarshalSelectedServiceCreateRequest
): Promise<FireMarshalSelectedServiceCreateResponse> => {
  try {
    const body: Record<string, unknown> = {
      professional_id: Number(data.professional_id),
      service_id: Number(data.service_id),
      people_id: Number(data.people_id),
      place_id: Number(data.place_id),
      building_type_id: Number(data.building_type_id),
      experience_id:
        data.experience_id == null
          ? null
          : Number(data.experience_id) > 0
            ? Number(data.experience_id)
            : null,
      access_note: String(data.access_note ?? ''),
      post_code: String(data.post_code ?? ''),
      search_radius: String(data.search_radius ?? ''),
      preffered_date: String(data.preffered_date ?? ''),
    };
    if (data.api_token) body.api_token = data.api_token;
    const response = await apiClient.post<FireMarshalSelectedServiceCreateResponse>(
      '/fire-marshal/selected-servie/create',
      body
    );
    return response.data;
  } catch (error) {
    console.error('Error creating fire marshal selected service:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to create fire marshal selected service',
          error: error.response.data?.error || error.message,
          status: error.response.status,
        };
      } else if (error.request) {
        throw {
          success: false,
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    throw {
      success: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Fire Safety Consultation: create selected service when user clicks Book Now (service_id 46).
 * POST /fire-consultation/selected-servie/create
 * Body: api_token?, professional_id, service_id, mode_id, hour_id, access_note, post_code, search_radius, preffered_date
 */
export interface FireConsultationSelectedServiceCreateRequest {
  api_token?: string;
  professional_id: number;
  service_id: number;
  mode_id: number;
  hour_id: number;
  access_note: string;
  post_code: string;
  search_radius: string;
  preffered_date: string;
}

export interface FireConsultationSelectedServiceCreateResponse {
  status: string;
  message: string;
  data?: {
    session_id?: number;
    professional_id?: number;
    service_id?: number;
    [key: string]: unknown;
  };
}

export const createFireConsultationSelectedService = async (
  data: FireConsultationSelectedServiceCreateRequest
): Promise<FireConsultationSelectedServiceCreateResponse> => {
  try {
    const body: Record<string, unknown> = {
      professional_id: Number(data.professional_id),
      service_id: Number(data.service_id),
      mode_id: Number(data.mode_id),
      hour_id: Number(data.hour_id),
      access_note: String(data.access_note ?? ''),
      post_code: String(data.post_code ?? ''),
      search_radius: String(data.search_radius ?? ''),
      preffered_date: String(data.preffered_date ?? ''),
    };
    if (data.api_token) body.api_token = data.api_token;
    const response = await apiClient.post<FireConsultationSelectedServiceCreateResponse>(
      '/fire-consultation/selected-servie/create',
      body
    );
    return response.data;
  } catch (error) {
    console.error('Error creating fire consultation selected service:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to create fire consultation selected service',
          error: error.response.data?.error || error.message,
          status: error.response.status,
        };
      } else if (error.request) {
        throw {
          success: false,
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    throw {
      success: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// TypeScript types for Update Service request
export interface UpdateServiceRequest {
  api_token: string;
  id: number;
  service_name: string;
  type: string;
  status: string;
  price: string;
  description: string;
}

export interface UpdateServiceResponse {
  status?: string;
  success?: boolean;
  message?: string;
  error?: string;
  data?: ServiceResponse;
}

/**
 * Update a service
 * @param data - Service update data including api_token, id, service_name, type, status, price, and description
 * @returns Promise with the API response
 */
export const updateService = async (data: UpdateServiceRequest): Promise<UpdateServiceResponse> => {
  try {
    const response = await apiClient.post<UpdateServiceResponse>('/services/update', data);
    return response.data;
  } catch (error) {
    console.error('Error updating service:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to update service',
          error: error.response.data?.error || error.message,
          status: error.response.status,
        };
      } else if (error.request) {
        throw {
          success: false,
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    throw {
      success: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// TypeScript types for Create Service request
export interface CreateServiceRequest {
  api_token: string;
  service_name: string;
  type: string;
  status: string;
  price: string;
  description: string;
}

export interface CreateServiceResponse {
  status?: string;
  success?: boolean;
  message?: string;
  error?: string;
  data?: ServiceResponse;
}

/**
 * Create a new service
 * @param data - Service creation data including api_token, service_name, type, status, price, and description
 * @returns Promise with the API response
 */
export const createService = async (data: CreateServiceRequest): Promise<CreateServiceResponse> => {
  try {
    const response = await apiClient.post<CreateServiceResponse>('/services/store', data);
    return response.data;
  } catch (error) {
    console.error('Error creating service:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to create service',
          error: error.response.data?.error || error.message,
          status: error.response.status,
        };
      } else if (error.request) {
        throw {
          success: false,
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    throw {
      success: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// TypeScript types for Delete Service request
export interface DeleteServiceRequest {
  api_token: string;
  id: number;
}

export interface DeleteServiceResponse {
  status?: string;
  success?: boolean;
  message?: string;
  error?: string;
}

/**
 * Delete a service
 * @param data - Service deletion data including api_token and id
 * @returns Promise with the API response
 */
export const deleteService = async (data: DeleteServiceRequest): Promise<DeleteServiceResponse> => {
  try {
    console.log('Deleting service with data:', { id: data.id, hasToken: !!data.api_token });
    const response = await apiClient.post<DeleteServiceResponse>(
      '/services/delete',
      {
        api_token: data.api_token,
        id: data.id
      }
    );
    console.log('Delete service response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error deleting service:', error);
    if (axios.isAxiosError(error)) {
      // Check for response errors (including 403 Forbidden)
      if (error.response) {
        const status = error.response.status;
        const responseData = error.response.data;
        console.error('API Error Response:', {
          status,
          data: responseData,
          headers: error.response.headers
        });
        
        throw {
          success: false,
          message: responseData?.message || `Failed to delete service (Status: ${status})`,
          error: responseData?.error || error.message,
          status: status,
          statusCode: status, // Include both for compatibility
        };
      } else if (error.request) {
        // No response received - could be network issue, CORS, or server down
        console.error('No response from server. Request details:', error.request);
        throw {
          success: false,
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
          status: null,
        };
      }
    }
    // Generic error handling
    throw {
      success: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
      status: null,
    };
  }
};

