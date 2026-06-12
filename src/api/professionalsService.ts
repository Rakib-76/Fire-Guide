/// <reference types="vite/client" />
import axios from 'axios';
import { resolveApiBaseUrl } from '../lib/apiBaseUrl';
import { handleTokenExpired, isTokenExpiredError } from '../lib/auth';

/**
 * API ENDPOINT PATTERNS - IMPORTANT REFERENCE
 * ===========================================
 * 
 * This file contains all professional-related API endpoints. To prevent 404 errors,
 * ensure all endpoints match the exact patterns documented below:
 * 
 * VERIFIED WORKING ENDPOINTS:
 * ---------------------------
 * 1. Professional Identity: '/professional_wise_identity'
 * 2. Professional DBS: '/professional_wise_bds' (note: "bds" not "dbs")
 * 3. Professional Evidence: '/qualifications-certification/professional_wise_evidence'
 * 4. Verification Summary: '/professional/verification_summary'
 * 5. Selected Services: '/professional/get_selected_service'
 * 6. Profile Completion: '/professional/profile_completion_percentage'
 * 7. Certificates: '/professional/get_certificate'
 * 8. Store Service Prices: '/professional/service_price_store' (note: singular "price" and no "/store" suffix)
 * 9. Working Hours: GET list '/professional/get-working-hours', save '/professional/update-working-hours'
 * 10. Blocked Days: '/professional_days/block' (note: underscore format with "/block" suffix)
 * 11. Monthly Availability Summary: '/professional/monthly_availability/summary' (note: nested path format)
 * 12. Create Professional Day: '/professional_days/create' (note: underscore format with "/create" suffix)
 * 13. Delete Professional Day: '/professional_days/delete' (note: underscore format with "/delete" suffix)
 * 14. Contact professional by email: '/professional-mail' (public JSON body)
 * 
 * ENDPOINT NAMING CONVENTIONS:
 * -----------------------------
 * - "professional_wise_*" endpoints: Use underscore format (e.g., professional_wise_identity)
 * - "professional/*" endpoints: Use slash format (e.g., professional/get_selected_service)
 * - "qualifications-certification/*": Use hyphen in path segment
 * 
 * IMPORTANT NOTES:
 * ---------------
 * - DO NOT add "/show" suffix to these endpoints
 * - DO NOT change "bds" to "dbs" in professional_wise_bds
 * - Always verify endpoint paths match API documentation before making changes
 * - Test endpoints after any modifications to prevent 404 errors
 */

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

// Add response interceptor to handle token expiration
// Exclude login/register endpoints - 401 on these means wrong credentials, not token expiration
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error?.config?.url || '';
    const isAuthEndpoint = requestUrl.includes('/login') || 
                          requestUrl.includes('/register') || 
                          requestUrl.includes('/send_otp') ||
                          requestUrl.includes('/verify_otp') ||
                          requestUrl.includes('/reset_password');
    
    if (!isAuthEndpoint && isTokenExpiredError(error)) {
      handleTokenExpired();
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

// TypeScript types for Professional User Account Settings
export interface ProfessionalUserAccountData {
  full_name: string;
  email: string;
  phone: string;
  business_location: string;
}

export interface GetProfessionalUserRequest {
  api_token: string;
}

export interface GetProfessionalUserResponse {
  status: boolean;
  message: string;
  data: ProfessionalUserAccountData;
}

export interface UpdateProfessionalUserRequest {
  api_token: string;
  full_name: string;
  email: string;
  phone: string;
  business_location: string;
}

export interface UpdateProfessionalUserResponse {
  status: boolean;
  message: string;
  data: ProfessionalUserAccountData;
}

/**
 * Get professional user account data
 * BaseURL: https://fireguide.attoexasolutions.com/api/professional_user/get
 * Method: POST
 * @param data - API token
 * @returns Promise with the API response containing professional user account data
 */
export const getProfessionalUser = async (
  data: GetProfessionalUserRequest
): Promise<ProfessionalUserAccountData> => {
  try {
    const response = await apiClient.post<GetProfessionalUserResponse>(
      '/professional_user/get',
      {
        api_token: data.api_token
      }
    );
    
    console.log('POST /professional_user/get - Response:', response.data);
    
    // Handle the response structure: { status: true, data: {...} }
    if (response.data.status === true && response.data.data) {
      console.log('Professional user account data fetched successfully');
      return response.data.data;
    }
    
    throw {
      success: false,
      message: response.data.message || 'Failed to fetch professional user account data',
      error: 'Invalid response structure',
    };
  } catch (error) {
    console.error('Error fetching professional user account data:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to fetch professional user account data',
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
 * Update professional user account settings
 * BaseURL: https://fireguide.attoexasolutions.com/api/professional_user/update
 * Method: POST
 * @param data - Account settings data
 * @returns Promise with the API response containing updated account data
 */
export const updateProfessionalUser = async (
  data: UpdateProfessionalUserRequest
): Promise<ProfessionalUserAccountData> => {
  try {
    const response = await apiClient.post<UpdateProfessionalUserResponse>(
      '/professional_user/update',
      {
        api_token: data.api_token,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        business_location: data.business_location,
      }
    );
    
    console.log('POST /professional_user/update - Response:', response.data);
    
    // Handle the response structure: { status: true, data: {...} }
    if (response.data.status === true && response.data.data) {
      console.log('Professional user account updated successfully');
      return response.data.data;
    }
    
    throw {
      success: false,
      message: response.data.message || 'Failed to update professional user account',
      error: 'Invalid response structure',
    };
  } catch (error) {
    console.error('Error updating professional user account:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to update professional user account',
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
 * Professional profile details — single professional data when View Profile is clicked.
 * POST https://fireguide.attoexasolutions.com/api/professional-profile/details
 * Body: { professional_id }
 * Response: { status, message, data: { name, initials, profile_image, verified, rating, total_reviews, location, response_time, phone? } }
 */
export interface ProfessionalProfileDetailsData {
  name: string;
  initials: string;
  profile_image: string;
  verified: boolean;
  rating: number;
  total_reviews: number;
  location: string;
  response_time: string;
  /** When returned by profile details API, used for Send Message / mailto */
  email?: string | null;
  /** Contact line — backend may use any of these optional keys */
  phone?: string | null;
  contact_number?: string | null;
  mobile?: string | null;
  phone_number?: string | null;
  /** Some APIs reuse `number` for the phone field */
  number?: string | null;
}

export interface ProfessionalProfileDetailsResponse {
  status: boolean;
  message: string;
  data: ProfessionalProfileDetailsData;
}

export const fetchProfessionalProfileDetails = async (
  professionalId: number
): Promise<ProfessionalProfileDetailsData> => {
  const response = await apiClient.post<ProfessionalProfileDetailsResponse>(
    '/professional-profile/details',
    { professional_id: professionalId }
  );
  const payload = response.data as { status?: boolean; message?: string; data?: ProfessionalProfileDetailsData };
  const data = payload?.data;
  if (data && typeof data.name === 'string') {
    return data;
  }
  throw new Error(payload?.message || 'Failed to fetch professional details');
};

/**
 * Customer professional profile — consolidated details page data.
 * POST /professional/details-page/get-all
 * Body: { professional_id }
 */
export interface ProfessionalDetailsPageMembershipItem {
  id: number;
  organization_name: string;
  membership_type?: string | null;
  reference_id?: string | null;
  member_since?: string | null;
  note?: string | null;
  logo?: string | null;
  evidence?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ProfessionalDetailsPageGetAllData {
  membership?: ProfessionalDetailsPageMembershipItem[];
  memberships?: ProfessionalDetailsPageMembershipItem[];
  [key: string]: unknown;
}

export interface ProfessionalDetailsPageGetAllResponse {
  status?: boolean | string;
  success?: boolean;
  message?: string;
  total?: number;
  /** API returns membership rows as a direct array, or nested under membership/memberships. */
  data?: ProfessionalDetailsPageMembershipItem[] | ProfessionalDetailsPageGetAllData;
}

export const fetchProfessionalDetailsPageGetAll = async (
  professionalId: number
): Promise<ProfessionalDetailsPageMembershipItem[] | ProfessionalDetailsPageGetAllData> => {
  const response = await apiClient.post<ProfessionalDetailsPageGetAllResponse>(
    '/professional/details-page/get-all',
    { professional_id: professionalId }
  );
  const payload = response.data;
  const data = payload?.data;
  const isSuccess =
    payload?.status === true ||
    payload?.success === true ||
    String(payload?.status ?? "").toLowerCase() === "success";
  if (data != null && (isSuccess || Array.isArray(data))) {
    return data;
  }
  throw new Error(payload?.message || 'Failed to fetch professional profile details');
};

export function getProfessionalDetailsPageMemberships(
  data: ProfessionalDetailsPageMembershipItem[] | ProfessionalDetailsPageGetAllData | null | undefined
): ProfessionalDetailsPageMembershipItem[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.membership ?? data.memberships ?? [];
}

/**
 * Professional profile pricing — called when View Profile is clicked.
 * POST https://fireguide.attoexasolutions.com/api/professional-profile/pricing
 * Body: { professional_id } — use the professional ID from the Professional List API.
 */
export interface ProfessionalProfilePricingItem {
  size: string;
  price: string;
  people: {
    id: number;
    number_of_people: string;
  };
}

export interface ProfessionalProfilePricingResponse {
  status: boolean;
  message: string;
  data: ProfessionalProfilePricingItem[];
}

export const fetchProfessionalProfilePricing = async (
  professionalId: number
): Promise<ProfessionalProfilePricingItem[]> => {
  const response = await apiClient.post<ProfessionalProfilePricingResponse>(
    '/professional-profile/pricing',
    { professional_id: professionalId }
  );
  const payload = response.data as { status?: boolean; message?: string; data?: ProfessionalProfilePricingItem[] };
  const data = Array.isArray(payload?.data) ? payload.data : null;
  if (Array.isArray(data)) {
    return data;
  }
  throw new Error(payload?.message || 'Failed to fetch pricing');
};

const WEEK_DAY_ORDER = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

function normalizeWorkingHoursDayKey(value?: string | number | null): string | null {
  if (value == null) return null;
  if (typeof value === 'number' && value >= 1 && value <= 7) {
    return WEEK_DAY_ORDER[value - 1] ?? null;
  }
  const key = String(value).trim().toLowerCase();
  if ((WEEK_DAY_ORDER as readonly string[]).includes(key)) return key;
  const shortMap: Record<string, string> = {
    mon: 'monday',
    tue: 'tuesday',
    wed: 'wednesday',
    thu: 'thursday',
    fri: 'friday',
    sat: 'saturday',
    sun: 'sunday',
  };
  return shortMap[key.slice(0, 3)] ?? null;
}

function parseWorkingHoursIsClosed(value: unknown): boolean {
  if (value === true || value === 1 || value === '1') return true;
  if (value === false || value === 0 || value === '0' || value == null) return false;
  if (typeof value === 'string') return value.trim().toLowerCase() === 'true';
  return Boolean(value);
}

function normalizeWorkingHoursRecord(raw: unknown): WorkingDayHourRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const day = normalizeWorkingHoursDayKey(
    (record.day ?? record.week_day ?? record.weekday ?? record.day_name ?? record.day_of_week) as
      | string
      | number
      | undefined
  );
  if (!day) return null;
  return {
    id: typeof record.id === 'number' ? record.id : undefined,
    day,
    week_day: day,
    start_time: (record.start_time ?? record.startTime ?? null) as string | null,
    end_time: (record.end_time ?? record.endTime ?? null) as string | null,
    is_closed: parseWorkingHoursIsClosed(record.is_closed ?? record.isClosed ?? record.closed),
  };
}

function extractWorkingHoursRecords(data: unknown): WorkingDayHourRecord[] {
  if (!data) return [];

  if (Array.isArray(data)) {
    return data
      .map(normalizeWorkingHoursRecord)
      .filter((record): record is WorkingDayHourRecord => record != null);
  }

  if (typeof data !== 'object') return [];

  const obj = data as Record<string, unknown>;
  const nestedKeys = ['hours', 'working_hours', 'workingHours', 'data'];
  for (const key of nestedKeys) {
    if (key in obj) {
      const nested = extractWorkingHoursRecords(obj[key]);
      if (nested.length > 0) return nested;
    }
  }

  const keyedRecords: WorkingDayHourRecord[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const day = normalizeWorkingHoursDayKey(key);
    if (!day || value == null || typeof value !== 'object' || Array.isArray(value)) continue;
    const record = normalizeWorkingHoursRecord({ day, ...(value as Record<string, unknown>) });
    if (record) keyedRecords.push(record);
  }
  return keyedRecords;
}

function extractWorkingHoursFromResponse(response: unknown): WorkingDayHourRecord[] {
  if (!response || typeof response !== 'object') return [];
  const root = response as Record<string, unknown>;
  const fromData = extractWorkingHoursRecords(root.data);
  if (fromData.length > 0) return fromData;
  return extractWorkingHoursRecords(root);
}

function sortWorkingHoursByWeek(records: WorkingDayHourRecord[]): WorkingDayHourRecord[] {
  return [...records].sort((a, b) => {
    const dayA = (a.day ?? a.week_day ?? '').toLowerCase();
    const dayB = (b.day ?? b.week_day ?? '').toLowerCase();
    const indexA = WEEK_DAY_ORDER.indexOf(dayA as (typeof WEEK_DAY_ORDER)[number]);
    const indexB = WEEK_DAY_ORDER.indexOf(dayB as (typeof WEEK_DAY_ORDER)[number]);
    return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
  });
}

/**
 * Public working hours for a professional profile (customer view).
 * POST /for-user/get-working-hours
 * Body: { professional_id }
 */
export const fetchForUserWorkingHours = async (
  professionalId: number
): Promise<WorkingDayHourRecord[]> => {
  const response = await apiClient.post<WorkingDayResponse>(
    '/for-user/get-working-hours',
    { professional_id: professionalId }
  );
  const records = extractWorkingHoursFromResponse(response.data);
  return sortWorkingHoursByWeek(records);
};

/** POST /professional-mail — customer message to a professional (public). */
export interface ProfessionalMailRequest {
  full_name: string;
  pro_email: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export interface ProfessionalMailResponse {
  status?: boolean;
  success?: boolean;
  message?: string;
}

/**
 * Send a contact email to a professional via the backend.
 * POST `/professional-mail` with JSON body matching the API contract.
 * @returns Server success message when present
 */
export const sendProfessionalMail = async (payload: ProfessionalMailRequest): Promise<string> => {
  try {
    const response = await apiClient.post<ProfessionalMailResponse>("/professional-mail", payload);
    const data = response.data as ProfessionalMailResponse;
    if (data?.status === false || data?.success === false) {
      throw new Error(data?.message || "Failed to send message");
    }
    if (typeof data?.message === "string" && data.message.trim()) {
      return data.message.trim();
    }
    return "Your message has been sent.";
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const d = error.response?.data as { message?: string; error?: string } | undefined;
      const msg = d?.message || d?.error || error.message;
      throw new Error(typeof msg === "string" ? msg : "Failed to send message");
    }
    throw error instanceof Error ? error : new Error("Failed to send message");
  }
};

/**
 * Block professional booking days — professional blocks a date range.
 * POST https://fireguide.attoexasolutions.com/api/block-professional/booking-days
 * Body: { api_token, start_day: "YYYY-MM-DD", end_day: "YYYY-MM-DD" }
 */
export interface BlockBookingDaysRequest {
  api_token: string;
  start_day: string;
  end_day: string;
}

export interface BlockBookingDaysResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    professional_id: number;
    start_day: string;
    end_day: string;
    created_at: string;
    updated_at: string;
  };
}

export const blockProfessionalBookingDays = async (
  data: BlockBookingDaysRequest
): Promise<BlockBookingDaysResponse['data']> => {
  const response = await apiClient.post<BlockBookingDaysResponse>(
    '/block-professional/booking-days',
    { api_token: data.api_token, start_day: data.start_day, end_day: data.end_day }
  );
  const payload = response.data as BlockBookingDaysResponse;
  if (payload?.status === true) {
    return payload.data;
  }
  throw new Error(payload?.message || 'Failed to block booking days');
};

/**
 * Blocked booking days list — fetch all blocked ranges for the professional.
 * POST https://fireguide.attoexasolutions.com/api/block-professional/booking-days-list
 * Body: { api_token }
 * Response: { status, message, data: [{ id, professional: { id, name }, start_day, end_day, created_at, updated_at }] }
 */
export interface BlockedBookingDayItem {
  id: number;
  professional: { id: number; name: string };
  start_day: string;
  end_day: string;
  created_at: string;
  updated_at: string;
  /** Row came from `blocked_ranges` without a server id — delete/update APIs are not available. */
  synthetic?: boolean;
  reason?: string;
}

export interface BlockedBookingDaysListResponse {
  status: boolean;
  message: string;
  data: BlockedBookingDayItem[];
}

function unwrapBookingDaysListDataObject(data: unknown): Record<string, unknown> | null {
  if (data == null || typeof data !== "object" || Array.isArray(data)) return null;
  const o = data as Record<string, unknown>;
  if (Array.isArray(o.blocked_ranges) || Array.isArray(o.notice_blocked_dates)) return o;
  const inner = o.data;
  if (inner != null && typeof inner === "object" && !Array.isArray(inner)) {
    const innerObj = inner as Record<string, unknown>;
    if (Array.isArray(innerObj.blocked_ranges) || Array.isArray(innerObj.notice_blocked_dates)) {
      return innerObj;
    }
  }
  return null;
}

function mapBlockedRangesToBookingDayItems(
  ranges: unknown[],
  professionalFallback: { id: number; name: string }
): BlockedBookingDayItem[] {
  const out: BlockedBookingDayItem[] = [];
  let synIndex = 0;
  for (const raw of ranges) {
    if (raw == null || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const sd = row.start_day;
    if (typeof sd !== "string" || !sd.trim()) continue;
    const ed = typeof row.end_day === "string" && row.end_day.trim() ? row.end_day : sd;
    const idRaw = row.id;
    const idNum =
      typeof idRaw === "number" ? idRaw : typeof idRaw === "string" ? Number(idRaw) : NaN;
    const hasServerId = Number.isFinite(idNum) && idNum > 0;
    const id = hasServerId ? Math.floor(idNum) : -(++synIndex);
    let professional = professionalFallback;
    const prof = row.professional;
    if (prof != null && typeof prof === "object" && !Array.isArray(prof)) {
      const p = prof as Record<string, unknown>;
      const pid = p.id;
      const pname = p.name;
      if (typeof pid === "number") {
        professional = { id: pid, name: typeof pname === "string" ? pname : professionalFallback.name };
      }
    }
    const reason =
      typeof row.reason === "string"
        ? row.reason
        : typeof row.note === "string"
          ? row.note
          : typeof row.description === "string"
            ? row.description
            : undefined;
    out.push({
      id,
      professional,
      start_day: sd,
      end_day: ed,
      created_at: typeof row.created_at === "string" ? row.created_at : "",
      updated_at: typeof row.updated_at === "string" ? row.updated_at : "",
      synthetic: !hasServerId,
      reason,
    });
  }
  return out;
}

/** Supports legacy `data: BlockedBookingDayItem[]` or `data: { blocked_ranges, notice_blocked_dates }`. */
export function parseBlockedBookingDaysFromListData(
  data: unknown,
  professionalFallback: { id: number; name: string }
): BlockedBookingDayItem[] {
  if (Array.isArray(data)) {
    return data as BlockedBookingDayItem[];
  }
  const obj = unwrapBookingDaysListDataObject(data);
  if (!obj) return [];
  const ranges = obj.blocked_ranges;
  if (!Array.isArray(ranges)) return [];
  return mapBlockedRangesToBookingDayItems(ranges, professionalFallback);
}

export const getBlockedBookingDaysList = async (
  apiToken: string
): Promise<BlockedBookingDayItem[]> => {
  const response = await apiClient.post<BlockedBookingDaysListResponse>(
    '/block-professional/booking-days-list',
    { api_token: apiToken }
  );
  const payload = response.data as BlockedBookingDaysListResponse & { data?: unknown };
  if (payload?.status !== true) {
    throw new Error(payload?.message || 'Failed to fetch blocked booking days');
  }
  return parseBlockedBookingDaysFromListData(payload.data, { id: 0, name: '' });
};

/**
 * Blocked booking days list by professional (e.g. for booking calendar).
 * POST .../block-professional/booking-days-list
 * Body: { professional_id } only (no api_token).
 * Response: same as getBlockedBookingDaysList.
 */
export const getBlockedBookingDaysListForProfessional = async (
  professionalId: number
): Promise<BlockedBookingDayItem[]> => {
  const response = await apiClient.post<BlockedBookingDaysListResponse>(
    '/block-professional/booking-days-list',
    { professional_id: professionalId }
  );
  const payload = response.data as BlockedBookingDaysListResponse & { data?: unknown };
  if (payload?.status === false) return [];
  if (payload?.status !== true) {
    throw new Error(payload?.message || 'Failed to fetch blocked booking days');
  }
  return parseBlockedBookingDaysFromListData(payload.data, { id: professionalId, name: '' });
};

/** When body includes professional_id, API may return data as an object with notice_blocked_dates and blocked_ranges. */
export interface BlockProfessionalBookingDaysListExtendedData {
  blocked_ranges?: Array<{ start_day?: string; end_day?: string } | Record<string, unknown>>;
  notice_blocked_dates?: string[];
}

function normalizeNoticeBlockedDateString(d: string): string {
  return d.trim().split(/[\sT]/)[0];
}

/** Inclusive list of YYYY-MM-DD from start_day through end_day (handles "YYYY-MM-DD HH:mm:ss"). */
function expandBlockedRangeToIsoDates(startDay: string, endDay: string): string[] {
  const start = normalizeNoticeBlockedDateString(startDay);
  const end = normalizeNoticeBlockedDateString(endDay);
  if (!start || !end) return [];
  if (start > end) return [];
  const out: string[] = [];
  let cur = new Date(`${start}T12:00:00`);
  const endTime = new Date(`${end}T12:00:00`);
  while (cur <= endTime) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const day = String(cur.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${day}`);
    cur = new Date(cur.getTime() + 86400000);
  }
  return out;
}

export function collectCalendarBlockedDatesFromListPayload(
  payload: Record<string, unknown>,
  data: unknown
): string[] {
  const set = new Set<string>();

  let obj: Record<string, unknown> | null = null;
  if (data != null && typeof data === "object" && !Array.isArray(data)) {
    obj = data as Record<string, unknown>;
  }
  if (obj && "data" in obj && obj.data != null && typeof obj.data === "object" && !Array.isArray(obj.data)) {
    obj = obj.data as Record<string, unknown>;
  }

  const noticeFromRoot = payload.notice_blocked_dates;
  const noticeFromObj = obj?.notice_blocked_dates;
  const noticeRaw = Array.isArray(noticeFromRoot) ? noticeFromRoot : noticeFromObj;
  if (Array.isArray(noticeRaw)) {
    for (const x of noticeRaw) {
      const k = normalizeNoticeBlockedDateString(String(x));
      if (k) set.add(k);
    }
  }

  const rangesFromObj = obj?.blocked_ranges;
  if (Array.isArray(rangesFromObj)) {
    for (const r of rangesFromObj) {
      if (r == null || typeof r !== "object") continue;
      const row = r as Record<string, unknown>;
      const sd = row.start_day;
      const ed = row.end_day;
      if (typeof sd === "string" && typeof ed === "string") {
        for (const d of expandBlockedRangeToIsoDates(sd, ed)) {
          set.add(d);
        }
      }
    }
  }

  return Array.from(set).sort();
}

/**
 * POST /block-professional/booking-days-list
 * Body: { professional_id } only (no api_token).
 * Merges data.notice_blocked_dates and every calendar day in data.blocked_ranges (start_day–end_day).
 */
export const getNoticeBlockedBookingDates = async (
  professionalId: number
): Promise<string[]> => {
  const response = await apiClient.post<{
    status?: boolean;
    success?: boolean;
    message?: string;
    data?: BlockProfessionalBookingDaysListExtendedData | BlockedBookingDayItem[] | Record<string, unknown>;
    notice_blocked_dates?: string[];
  }>('/block-professional/booking-days-list', {
    professional_id: professionalId,
  });
  const payload = response.data as Record<string, unknown>;
  const ok = payload?.status === true || payload?.success === true;
  if (!ok) return [];

  let data: unknown = payload.data;
  if (data != null && typeof data === "object" && !Array.isArray(data) && "data" in data) {
    const inner = (data as Record<string, unknown>).data;
    if (inner != null && typeof inner === "object" && !Array.isArray(inner)) {
      data = inner;
    }
  }

  if (Array.isArray(data)) {
    const legacy = new Set<string>();
    for (const item of data) {
      if (item == null || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const sd = row.start_day;
      const ed = row.end_day;
      if (typeof sd === "string" && typeof ed === "string") {
        for (const d of expandBlockedRangeToIsoDates(sd, ed)) {
          legacy.add(d);
        }
      }
    }
    return Array.from(legacy).sort();
  }

  return collectCalendarBlockedDatesFromListPayload(payload, data);
};

/**
 * Delete a blocked booking day.
 * POST https://fireguide.attoexasolutions.com/api/block-professional/booking-days-delete
 * Body: { api_token, id }
 * Response: { status, message }
 */
export const deleteBlockedBookingDay = async (
  apiToken: string,
  id: number
): Promise<void> => {
  const response = await apiClient.post<{ status: boolean; message: string }>(
    '/block-professional/booking-days-delete',
    { api_token: apiToken, id }
  );
  const payload = response.data as { status?: boolean; message?: string };
  if (payload?.status !== true) {
    throw new Error(payload?.message || 'Failed to delete blocked booking day');
  }
};

/**
 * Update a blocked booking day.
 * POST https://fireguide.attoexasolutions.com/api/block-professional/booking-days-update
 * Body: { api_token, id, start_day, end_day } (YYYY-MM-DD)
 * Response: { status, message, data: { id, professional_id, start_day, end_day, created_at, updated_at } }
 */
export const updateBlockedBookingDay = async (
  apiToken: string,
  id: number,
  startDay: string,
  endDay: string
): Promise<void> => {
  const response = await apiClient.post<BlockBookingDaysResponse>(
    '/block-professional/booking-days-update',
    { api_token: apiToken, id, start_day: startDay, end_day: endDay }
  );
  const payload = response.data as BlockBookingDaysResponse;
  if (payload?.status !== true) {
    throw new Error(payload?.message || 'Failed to update blocked booking day');
  }
};

// TypeScript types for Professional Identity
export interface ProfessionalIdentityItem {
  id: number;
  professional_id: number;
  file: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface GetProfessionalWiseIdentityRequest {
  api_token: string;
}

export interface GetProfessionalWiseIdentityResponse {
  status: boolean;
  message: string;
  data: ProfessionalIdentityItem[];
}

export interface UpdateProfessionalIdentityRequest {
  api_token: string;
  id: number;
  professional_id: number;
  file: string | File;
}

export interface UpdateProfessionalIdentityResponse {
  status: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface CreateProfessionalIdentityRequest {
  api_token: string;
  file: string | File;
}

export interface CreateProfessionalIdentityResponse {
  status: boolean;
  message: string;
  data?: ProfessionalIdentityItem;
  error?: string;
}

export const getProfessionalWiseIdentity = async (
  data: GetProfessionalWiseIdentityRequest
): Promise<GetProfessionalWiseIdentityResponse> => {
  try {
    const response = await apiClient.post<GetProfessionalWiseIdentityResponse>(
      '/professional_wise_identity',
      { api_token: data.api_token }
    );
    console.log('POST /professional_wise_identity - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching professional identity:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to fetch professional identity',
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

/** POST /professional_identity/create — body: { api_token, file } (base64 data URL for images) */
export const createProfessionalIdentity = async (
  data: CreateProfessionalIdentityRequest
): Promise<CreateProfessionalIdentityResponse> => {
  try {
    const isFileObject = data.file instanceof File;
    let response: any;

    if (isFileObject) {
      const formData = new FormData();
      formData.append('api_token', data.api_token);
      formData.append('file', data.file as File);

      response = await apiClient.post<CreateProfessionalIdentityResponse>(
        '/professional_identity/create',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
    } else {
      response = await apiClient.post<CreateProfessionalIdentityResponse>(
        '/professional_identity/create',
        {
          api_token: data.api_token,
          file: data.file as string,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    console.log('POST /professional_identity/create - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating professional identity:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to upload identity document',
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

export const updateProfessionalIdentity = async (
  data: UpdateProfessionalIdentityRequest
): Promise<UpdateProfessionalIdentityResponse> => {
  try {
    const isFileObject = data.file instanceof File;
    let response: any;

    if (isFileObject) {
      const formData = new FormData();
      formData.append('api_token', data.api_token);
      formData.append('id', data.id.toString());
      formData.append('professional_id', data.professional_id.toString());
      formData.append('file', data.file as File);

      response = await apiClient.post<UpdateProfessionalIdentityResponse>(
        '/professional_identity/update',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
    } else {
      const requestBody: any = {
        api_token: data.api_token,
        id: data.id,
        professional_id: data.professional_id,
        file: data.file as string,
      };

      response = await apiClient.post<UpdateProfessionalIdentityResponse>(
        '/professional_identity/update',
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
    
    console.log('POST /professional_identity/update - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating professional identity:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to update professional identity',
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

// TypeScript types for Professional DBS
export interface ProfessionalDBSItem {
  id: number;
  professional_id: number;
  file: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface GetProfessionalWiseDBSRequest {
  api_token: string;
}

export interface GetProfessionalWiseDBSResponse {
  status: boolean;
  message: string;
  data: ProfessionalDBSItem[];
}

export interface UpdateProfessionalDBSRequest {
  api_token: string;
  id: number;
  professional_id: number;
  file: string | File;
}

export interface UpdateProfessionalDBSResponse {
  status: boolean;
  message: string;
  data?: any;
  error?: string;
}

export const getProfessionalWiseDBS = async (
  data: GetProfessionalWiseDBSRequest
): Promise<GetProfessionalWiseDBSResponse> => {
  try {
    const response = await apiClient.post<GetProfessionalWiseDBSResponse>(
      '/professional_wise_bds',
      { api_token: data.api_token }
    );
    console.log('POST /professional_wise_bds - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching professional DBS:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to fetch professional DBS',
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

export const updateProfessionalDBS = async (
  data: UpdateProfessionalDBSRequest
): Promise<UpdateProfessionalDBSResponse> => {
  try {
    const isFileObject = data.file instanceof File;
    let response: any;

    if (isFileObject) {
      const formData = new FormData();
      formData.append('api_token', data.api_token);
      formData.append('id', data.id.toString());
      formData.append('professional_id', data.professional_id.toString());
      formData.append('file', data.file as File);

      response = await apiClient.post<UpdateProfessionalDBSResponse>(
        '/professional_dbs/update',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
    } else {
      const requestBody: any = {
        api_token: data.api_token,
        id: data.id,
        professional_id: data.professional_id,
        file: data.file as string,
      };

      response = await apiClient.post<UpdateProfessionalDBSResponse>(
        '/professional_dbs/update',
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
    
    console.log('POST /professional_dbs/update - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating professional DBS:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to update professional DBS',
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

// TypeScript types for Professional Evidence (Qualifications)
export interface ProfessionalEvidenceItem {
  id: number;
  professional_id: number;
  qualification_id: number;
  file: string;
  evidence?: string; // Alternative property name for file/evidence
  status: string;
  created_at: string;
  updated_at: string;
}

export interface GetProfessionalWiseEvidenceRequest {
  api_token: string;
}

export interface GetProfessionalWiseEvidenceResponse {
  status: boolean;
  message: string;
  data: ProfessionalEvidenceItem[];
}

export const getProfessionalWiseEvidence = async (
  data: GetProfessionalWiseEvidenceRequest
): Promise<GetProfessionalWiseEvidenceResponse> => {
  try {
    const response = await apiClient.post<GetProfessionalWiseEvidenceResponse>(
      '/qualifications-certification/professional_wise_evidence',
      { api_token: data.api_token }
    );
    console.log('POST /qualifications-certification/professional_wise_evidence - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching professional evidence:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to fetch professional evidence',
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

// TypeScript types for Verification Summary
export interface VerificationSummaryData {
  identity_verified: boolean;
  dbs_verified: boolean;
  qualifications_verified: boolean;
  insurance_verified: boolean;
  overall_status: string;
  completion_percentage: number;
  active_status?: string;
  progress_percentage?: number;
  title?: string;
  subtitle?: string;
  checks?: {
    identity?: boolean;
    certificate?: boolean;
    insurance?: boolean;
    dbs?: boolean;
    qualifications?: boolean;
    [key: string]: boolean | undefined;
  };
}

export interface GetVerificationSummaryRequest {
  api_token: string;
}

export interface GetVerificationSummaryResponse {
  status: boolean;
  message: string;
  data: VerificationSummaryData;
}

export const getVerificationSummary = async (
  data: GetVerificationSummaryRequest
): Promise<GetVerificationSummaryResponse> => {
  try {
    const response = await apiClient.post<GetVerificationSummaryResponse>(
      '/professional/verification_summary',
      { api_token: data.api_token }
    );
    console.log('POST /professional/verification_summary - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching verification summary:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to fetch verification summary',
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

// TypeScript types for Professional Response (Professional List API)
export interface ProfessionalResponse {
  id: number;
  /** Some list APIs return professional_id; use id ?? professional_id for pricing API */
  professional_id?: number;
  name: string;
  business_name?: string;
  about: string;
  location?: string;
  business_location?: string;
  longitude: number | null;
  latitude: number | null;
  post_code?: string;
  response_time: string | null;
  /** Miles willing to travel — stored via POST /professional/create as `radius`. */
  radius?: number | string | null;
  /** @deprecated Legacy alias; prefer `radius`. */
  service_radius?: number | string | null;
  rating: string | null;
  review: string | null;
  number: string;
  email: string;
  user_id?: number;
  /** List/detail APIs often nest the auth user avatar here (e.g. `user.image`). */
  user?: { id?: number; image?: string | null } | null;
  image?: string | null;
  profile_image?: string | null;
  created_at: string;
  updated_at: string;
  creator: { id: number; user_name?: string; full_name?: string } | null;
  updater: { id: number; user_name?: string; full_name?: string } | null;
}

/** Avatar URL from a `/professional/list` row — prefers nested `user.image`. */
const SERVICE_RADIUS_MIN_MILES = 5;
const SERVICE_RADIUS_MAX_MILES = 100;
const SERVICE_RADIUS_STEP_MILES = 5;

/** Parse service radius from API rows (snake_case or legacy aliases). */
export function parseProfessionalServiceRadiusMiles(
  source: Record<string, unknown> | ProfessionalResponse | null | undefined
): number | null {
  if (!source || typeof source !== "object") return null;
  const row = source as Record<string, unknown>;
  const raw = row.radius ?? row.service_radius ?? row.serviceRadius ?? row.miles;
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw), 10);
  if (!Number.isFinite(n)) return null;
  const clamped = Math.min(SERVICE_RADIUS_MAX_MILES, Math.max(SERVICE_RADIUS_MIN_MILES, n));
  return Math.round(clamped / SERVICE_RADIUS_STEP_MILES) * SERVICE_RADIUS_STEP_MILES;
}

export function getProfessionalProfileImageUrl(prof: ProfessionalResponse): string {
  const u = prof.user;
  if (u && typeof u.image === "string" && u.image.trim()) return u.image.trim();
  if (typeof prof.image === "string" && prof.image.trim()) return prof.image.trim();
  if (typeof prof.profile_image === "string" && prof.profile_image.trim()) return prof.profile_image.trim();
  return "";
}

export interface ProfessionalsPaginatedResponse {
  current_page: number;
  data: ProfessionalResponse[];
  per_page: number;
  total: number;
  /** Laravel paginator includes this; needed to load the correct page for a given professional id */
  last_page?: number;
}

export interface ProfessionalsApiResponse {
  status: string;
  message: string;
  /** Laravel paginator `{ data: Professional[], ... }`, or a bare `Professional[]` (some backends). */
  data: ProfessionalsPaginatedResponse | ProfessionalResponse[];
}

function isProfessionalListRow(x: unknown): x is ProfessionalResponse {
  return x != null && typeof x === "object" && typeof (x as { id?: unknown }).id === "number";
}

/**
 * GET /professional/list returns either:
 * - `{ status, data: { data: Professional[], current_page, last_page, ... } }` (Laravel paginator)
 * - `{ status, data: Professional[] }` (flat list)
 */
function parseProfessionalListResponse(body: unknown): { rows: ProfessionalResponse[]; lastPage: number } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as { status?: unknown; data?: unknown };
  if (b.status !== "success" || b.data == null) return null;

  if (Array.isArray(b.data)) {
    const rows = b.data.filter(isProfessionalListRow);
    return { rows, lastPage: 1 };
  }

  if (typeof b.data === "object" && b.data !== null && "data" in b.data) {
    const pag = b.data as ProfessionalsPaginatedResponse;
    const rows = Array.isArray(pag.data) ? pag.data.filter(isProfessionalListRow) : [];
    const lastPage =
      typeof pag.last_page === "number" && pag.last_page >= 1
        ? pag.last_page
        : Math.max(1, Math.ceil((pag.total ?? 0) / Math.max(1, pag.per_page ?? 10)));
    return { rows, lastPage };
  }

  return null;
}

export const fetchProfessionals = async (page: number = 1): Promise<ProfessionalResponse[]> => {
  try {
    const response = await apiClient.get<ProfessionalsApiResponse>("/professional/list", { params: { page } });
    const parsed = parseProfessionalListResponse(response.data);
    return parsed?.rows ?? [];
  } catch (error) {
    console.error('Error fetching professionals:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw { success: false, message: error.response.data?.message || 'Failed to fetch professionals', error: error.response.data?.error || error.message, status: error.response.status };
      } else if (error.request) {
        throw { success: false, message: 'No response from server. Please check your connection.', error: 'Network error' };
      }
    }
    throw { success: false, message: 'An unexpected error occurred', error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Paginated GET /professional/list — walks pages until the row with `professionalId` is found.
 * The profile page previously only loaded page 1, so pros not on the first page never hydrated from the API.
 */
export const fetchProfessionalFromListById = async (
  professionalId: number
): Promise<ProfessionalResponse | null> => {
  let page = 1;
  const maxPages = 500;

  for (let guard = 0; guard < maxPages; guard++) {
    const response = await apiClient.get<ProfessionalsApiResponse>("/professional/list", { params: { page } });
    const parsed = parseProfessionalListResponse(response.data);
    if (!parsed) {
      return null;
    }
    const { rows, lastPage } = parsed;
    const found = rows.find((p) => p.id === professionalId) ?? null;
    if (found) {
      return found;
    }

    if (page >= lastPage || rows.length === 0) {
      return null;
    }
    page += 1;
  }
  return null;
};

/**
 * Paginated GET /professional/list — walks pages until a row matches `email`.
 * Used after OTP login when verify-otp omits professional_id (cleared on logout).
 */
export const fetchProfessionalFromListByEmail = async (
  email: string
): Promise<ProfessionalResponse | null> => {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  let page = 1;
  const maxPages = 500;

  for (let guard = 0; guard < maxPages; guard++) {
    const response = await apiClient.get<ProfessionalsApiResponse>("/professional/list", { params: { page } });
    const parsed = parseProfessionalListResponse(response.data);
    if (!parsed) {
      return null;
    }
    const { rows, lastPage } = parsed;
    const found =
      rows.find((p) => p.email?.trim().toLowerCase() === normalized) ?? null;
    if (found) {
      return found;
    }

    if (page >= lastPage || rows.length === 0) {
      return null;
    }
    page += 1;
  }
  return null;
};

/** Public landing list: GET /professionals-get */
export interface ProfessionalsGetCreatorRef {
  id: number;
  full_name?: string;
  image?: string | null;
}

export interface ProfessionalsGetItem {
  id: number;
  name: string;
  business_name?: string;
  image: string | null;
  business_location: string;
  from_price: string | null;
  creator?: ProfessionalsGetCreatorRef | null;
  updater?: ProfessionalsGetCreatorRef | null;
}

export interface ProfessionalsGetApiResponse {
  status: string;
  message: string;
  data: ProfessionalsGetItem[];
}

export function formatProfessionalsGetFromPrice(fromPrice: string | null | undefined): string {
  const gbp = (n: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
  if (fromPrice == null || String(fromPrice).trim() === '') return gbp(0);
  const n = parseFloat(String(fromPrice));
  if (Number.isNaN(n)) return gbp(0);
  return gbp(n);
}

export const fetchProfessionalsGet = async (): Promise<ProfessionalsGetItem[]> => {
  try {
    const response = await apiClient.get<ProfessionalsGetApiResponse>('/professionals-get');
    if (response.data.status === 'success' && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching professionals-get:', error);
    return [];
  }
};

// TypeScript types for Privacy Settings
export interface PrivacySettings {
  id: number;
  profile_visibility: string;
  is_show_phone: boolean | number;
  is_show_email: boolean | number;
  is_allow_customer_review: boolean | number;
  professional_id: number;
  created_at: string;
  updated_at: string;
}

export interface GetPrivacySettingsRequest {
  api_token: string;
}

export interface GetPrivacySettingsResponse {
  status: boolean;
  message: string;
  data: PrivacySettings;
}

export interface CreatePrivacySettingsRequest {
  api_token: string;
  profile_visibility: string;
  is_show_phone: boolean;
  is_show_email: boolean;
  is_allow_customer_review: boolean;
}

export interface CreatePrivacySettingsResponse {
  status: boolean;
  message: string;
  data: PrivacySettings;
}

export const getPrivacySettings = async (
  api_token: string
): Promise<PrivacySettings | null> => {
  try {
    const response = await apiClient.post<GetPrivacySettingsResponse>(
      '/professional_privacy_settings/show',
      { api_token }
    );
    
    console.log('POST /professional_privacy_settings/show - Response:', response.data);
    
    if (response.data.status === true && response.data.data) {
      console.log('Privacy settings fetched successfully');
      return response.data.data;
    }
    
    console.warn('No privacy settings found in API response');
    return null;
  } catch (error) {
    console.error('Error fetching privacy settings:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to fetch privacy settings',
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

export const createOrUpdatePrivacySettings = async (
  data: CreatePrivacySettingsRequest
): Promise<PrivacySettings> => {
  try {
    const response = await apiClient.post<CreatePrivacySettingsResponse>(
      '/professional_privacy_settings/create',
      {
        api_token: data.api_token,
        profile_visibility: data.profile_visibility,
        is_show_phone: data.is_show_phone,
        is_show_email: data.is_show_email,
        is_allow_customer_review: data.is_allow_customer_review,
      }
    );
    
    console.log('POST /professional_privacy_settings/create - Response:', response.data);
    
    if (response.data.status === true && response.data.data) {
      console.log('Privacy settings created/updated successfully');
      return response.data.data;
    }
    
    throw {
      success: false,
      message: response.data.message || 'Failed to create/update privacy settings',
      error: 'Invalid response structure',
    };
  } catch (error) {
    console.error('Error creating/updating privacy settings:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to create/update privacy settings',
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

// TypeScript types for Notification Settings
export interface NotificationSettings {
  id: number;
  is_email_notifications: number | boolean;
  is_sms_notifications: number | boolean;
  is_push_notifications: number | boolean;
  is_booking_alert: number | boolean;
  is_payment_alert: number | boolean;
  is_marketing_emails: number | boolean;
  professional_id: number;
  created_at: string;
  updated_at: string;
}

export interface GetNotificationSettingsRequest {
  api_token: string;
}

export interface GetNotificationSettingsResponse {
  status: boolean;
  message: string;
  data: NotificationSettings;
}

export interface CreateNotificationSettingsRequest {
  api_token: string;
  is_email_notifications: boolean;
  is_sms_notifications: boolean;
  is_push_notifications: boolean;
  is_booking_alert: boolean;
  is_payment_alert: boolean;
  is_marketing_emails: boolean;
}

export interface CreateNotificationSettingsResponse {
  status: boolean;
  message: string;
  data: NotificationSettings;
}

function notificationSettingsResponseOk(status: unknown): boolean {
  return status === true || status === "success" || status === 1 || status === "1";
}

export const getNotificationSettings = async (
  api_token: string
): Promise<NotificationSettings | null> => {
  try {
    const response = await apiClient.post<GetNotificationSettingsResponse & { status?: boolean | string }>(
      '/professional_notification_settings/show',
      { api_token }
    );
    
    console.log('POST /professional_notification_settings/show - Response:', response.data);
    
    if (notificationSettingsResponseOk(response.data.status) && response.data.data) {
      console.log('Notification settings fetched successfully');
      return response.data.data;
    }
    
    console.warn('No notification settings found in API response');
    return null;
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to fetch notification settings',
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

export const createOrUpdateNotificationSettings = async (
  data: CreateNotificationSettingsRequest
): Promise<CreateNotificationSettingsResponse> => {
  try {
    const body = {
      api_token: data.api_token,
      is_email_notifications: Boolean(data.is_email_notifications),
      is_sms_notifications: Boolean(data.is_sms_notifications),
      is_push_notifications: Boolean(data.is_push_notifications),
      is_booking_alert: Boolean(data.is_booking_alert),
      is_payment_alert: Boolean(data.is_payment_alert),
      is_marketing_emails: Boolean(data.is_marketing_emails),
    };

    const response = await apiClient.post<CreateNotificationSettingsResponse & { status?: boolean | string }>(
      '/professional_notification_settings/create',
      body
    );
    
    console.log('POST /professional_notification_settings/create - Request:', body);
    console.log('POST /professional_notification_settings/create - Response:', response.data);
    
    if (notificationSettingsResponseOk(response.data.status)) {
      console.log('Notification settings created/updated successfully');
      return response.data;
    }
    
    throw {
      success: false,
      message: response.data.message || 'Failed to create/update notification settings',
      error: 'Invalid response structure',
    };
  } catch (error) {
    console.error('Error creating/updating notification settings:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to create/update notification settings',
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

/** One row in POST /professional/create `services` array. */
export interface CreateProfessionalServiceItem {
  service_id: number;
  price?: string;
  service_area?: string;
}

// TypeScript types for Create Professional
export interface CreateProfessionalRequest {
  api_token: string;
  name: string;
  business_name: string;
  about: string;
  email: string;
  number: string;
  business_location: string;
  post_code: string;
  services: CreateProfessionalServiceItem[];
  /** Shown to customers on comparison and profile pages (e.g. "Within 2 hours"). */
  response_time?: string | null;
  /** Service area radius in miles (slider: 5–100, step 5). API expects string e.g. `"35"`. */
  radius?: number | string;
  certificate_name?: string;
  description?: string;
  evidence?: string;
  status?: string;
  [key: string]: any;
}

export interface CreateProfessionalResponse {
  status: boolean | string;
  success?: boolean;
  message: string;
  data?: any;
  error?: string;
  professional_id?: number;
}

export const createProfessional = async (
  data: CreateProfessionalRequest
): Promise<CreateProfessionalResponse> => {
  try {
    const response = await apiClient.post<CreateProfessionalResponse>(
      '/professional/create',
      data
    );
    
    console.log('POST /professional/create - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating professional:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to create professional',
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

// TypeScript types for Selected Services
export interface SelectedServiceItem {
  id?: number;
  professional_id?: number;
  service_id?: number;
  price?: number | null;
  service_area?: string | null;
  status?: string;
  service?: {
    id: number;
    service_name?: string;
    name?: string;
    description?: string;
  };
}

export interface GetSelectedServicesRequest {
  api_token: string;
  professional_id: number;
}

export interface GetSelectedServicesResponse {
  status: boolean;
  message: string;
  data: SelectedServiceItem[];
  error?: string;
}

export const getSelectedServices = async (
  data: GetSelectedServicesRequest
): Promise<GetSelectedServicesResponse> => {
  try {
    const response = await apiClient.post<GetSelectedServicesResponse>(
      '/professional/get_selected_service',
      {
        api_token: data.api_token,
        professional_id: data.professional_id,
      }
    );
    console.log('POST /professional/get_selected_service - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching selected services:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to fetch selected services',
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

// TypeScript types for Profile Completion
export interface ProfileCompletionDetails {
  basic_info?: boolean;
  contact_info?: boolean;
  services?: boolean;
  qualifications?: boolean;
  [key: string]: boolean | undefined;
}

export interface GetProfileCompletionPercentageRequest {
  api_token: string;
  professional_id: number;
}

export interface GetProfileCompletionPercentageResponse {
  status: boolean;
  message: string;
  profile_completion_percentage: number;
  details: ProfileCompletionDetails;
  error?: string;
}

export const getProfileCompletionPercentage = async (
  data: GetProfileCompletionPercentageRequest
): Promise<GetProfileCompletionPercentageResponse> => {
  try {
    const response = await apiClient.post<GetProfileCompletionPercentageResponse>(
      '/professional/profile_completion_percentage',
      {
        api_token: data.api_token,
        professional_id: data.professional_id,
      }
    );
    console.log('POST /professional/profile_completion_percentage - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching profile completion:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to fetch profile completion',
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

// TypeScript types for Certificates
export interface CertificateItem {
  id: number;
  professional_id: number;
  certificate_name: string;
  description: string;
  evidence: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface GetCertificatesRequest {
  api_token: string;
  professional_id: number;
}

export interface GetCertificatesResponse {
  status: boolean;
  message: string;
  data: CertificateItem[];
  error?: string;
}

export const getCertificates = async (
  data: GetCertificatesRequest
): Promise<GetCertificatesResponse> => {
  try {
    const response = await apiClient.post<GetCertificatesResponse>(
      '/professional/get_certificate',
      {
        api_token: data.api_token,
        professional_id: data.professional_id,
      }
    );
    console.log('POST /professional/get_certificate - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching certificates:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to fetch certificates',
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

// TypeScript types for Professional Experience (similar to Certificates)
export interface ExperienceItem {
  id: number;
  professional_id: number;
  experience_name: string;
  description: string;
  evidence: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface GetExperiencesRequest {
  api_token: string;
  professional_id: number;
}

export interface GetExperiencesResponse {
  status: boolean;
  message: string;
  data: ExperienceItem[];
  error?: string;
}

export const getExperiences = async (
  data: GetExperiencesRequest
): Promise<GetExperiencesResponse> => {
  try {
    const response = await apiClient.post<GetExperiencesResponse>(
      '/professional/get_experience',
      {
        api_token: data.api_token,
        professional_id: data.professional_id,
      }
    );
    console.log('POST /professional/get_experience - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching experiences:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to fetch experiences',
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
 * Create professional experience
 * BaseURL: https://fireguide.attoexasolutions.com/api/professional-experience/create
 * Method: POST
 * Body: JSON with experience_name, description, professional_id, evidence (base64 data URL)
 */
export interface CreateProfessionalExperienceRequest {
  api_token: string;
  experience_name: string;
  description: string;
  professional_id: number;
  evidence: string; // base64 data URL e.g. "data:image/jpeg;base64,..."
}

export interface CreateProfessionalExperienceResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    professional_id: number;
    experience_name: string;
    description: string;
    evidence: string;
    updated_at: string;
    created_at: string;
    status?: string;
  };
}

export const createProfessionalExperience = async (
  data: CreateProfessionalExperienceRequest
): Promise<CreateProfessionalExperienceResponse> => {
  try {
    const response = await apiClient.post<CreateProfessionalExperienceResponse>(
      '/professional-experience/create',
      {
        api_token: data.api_token,
        experience_name: data.experience_name,
        description: data.description,
        professional_id: data.professional_id,
        evidence: data.evidence,
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to create experience',
          error: error.response.data?.error || error.message,
        };
      }
      if (error.request) {
        throw {
          success: false,
          message: 'Network error. Please check your connection.',
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
 * Get professional experiences for the authenticated user
 * BaseURL: https://fireguide.attoexasolutions.com/api/professional-experience/get
 * Method: POST
 * Body: JSON with api_token
 */
export interface GetProfessionalExperiencesRequest {
  api_token: string;
}

export interface GetProfessionalExperiencesResponse {
  success: boolean;
  message: string;
  data: ExperienceItem[];
}

export const getProfessionalExperiences = async (
  data: GetProfessionalExperiencesRequest
): Promise<GetProfessionalExperiencesResponse> => {
  try {
    const response = await apiClient.post<GetProfessionalExperiencesResponse>(
      '/professional-experience/get',
      { api_token: data.api_token },
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to fetch experiences',
          error: error.response.data?.error || error.message,
        };
      }
      if (error.request) {
        throw {
          success: false,
          message: 'Network error. Please check your connection.',
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

// TypeScript types for Store Service Prices
export interface ServicePriceItem {
  service_id: number;
  price: string | number;
  [key: string]: any;
}

export interface StoreServicePricesRequest {
  api_token: string;
  services: ServicePriceItem[];
}

export interface StoreServicePricesResponse {
  status: boolean | string;
  success?: boolean;
  message: string;
  data?: any;
  error?: string;
}

export const storeServicePrices = async (
  data: StoreServicePricesRequest
): Promise<StoreServicePricesResponse> => {
  try {
    const response = await apiClient.post<StoreServicePricesResponse>(
      '/professional/service_price_store',
      data
    );
    
    console.log('POST /professional/service_price_store - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error storing service prices:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to store service prices',
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

// TypeScript types for Professional Day (Working Days, Blocked Days, etc.)
export interface ProfessionalDayResponse {
  id: number;
  date: string;
  type?: string;
  start_time?: string;
  end_time?: string;
  reason?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkingDayHourRecord {
  id?: number;
  day?: string;
  week_day?: string;
  start_time?: string | null;
  end_time?: string | null;
  is_closed?: boolean | number;
}

export interface WorkingDayResponse {
  status?: boolean | number | string;
  success?: boolean | number;
  message?: string;
  data?: unknown;
  hours?: WorkingDayHourRecord[];
  working_hours?: WorkingDayHourRecord[];
  error?: string;
}

export interface GetWorkingDaysRequest {
  api_token: string;
}

export interface WorkingHourItem {
  day: string;
  start_time: string | null;
  end_time: string | null;
  is_closed: boolean;
}

export interface SaveWorkingHoursRequest {
  api_token: string;
  hours: WorkingHourItem[];
}

export interface SaveWorkingHoursResponse {
  status: boolean;
  message: string;
  data?: WorkingDayHourRecord[];
  error?: string;
}

export interface CreateProfessionalDayRequest {
  api_token: string;
  type: string;
  date: string;
  start_time?: string;
  end_time?: string;
  reason?: string;
}

export interface CreateProfessionalDayResponse {
  status: boolean;
  message: string;
  data?: ProfessionalDayResponse;
  error?: string;
}

export interface GetBlockedDaysRequest {
  api_token: string;
}

export interface GetBlockedDaysResponse {
  status: boolean;
  message: string;
  data: ProfessionalDayResponse[];
  error?: string;
}

export interface DeleteProfessionalDayRequest {
  api_token: string;
  id: number;
}

export interface DeleteProfessionalDayResponse {
  status: boolean;
  message: string;
  error?: string;
}

export interface MonthlyAvailabilityData {
  [date: string]: {
    available: boolean;
    booked: boolean;
    blocked: boolean;
    bookings?: Array<{
      id: string;
      time: string;
      customer_name?: string;
    }>;
  };
}

export interface GetMonthlyAvailabilityRequest {
  api_token: string;
  month?: number; // Optional: 1-12 (January = 1, December = 12)
  year?: number; // Optional: e.g., 2026
}

export interface GetMonthlyAvailabilityResponse {
  status: boolean;
  message: string;
  data: MonthlyAvailabilityData;
  error?: string;
}

export interface MonthlyAvailabilitySummaryData {
  total_days: number;
  available_days: number;
  booked_days: number;
  blocked_days: number;
  unavailable_days: number;
}

export interface GetMonthlyAvailabilitySummaryRequest {
  api_token: string;
  month?: number; // Optional: 1-12 (January = 1, December = 12)
  year?: number; // Optional: e.g., 2026
}

export interface GetMonthlyAvailabilitySummaryResponse {
  status: boolean;
  message: string;
  data: MonthlyAvailabilitySummaryData;
  error?: string;
}

export const getWorkingDays = async (
  data: GetWorkingDaysRequest
): Promise<WorkingDayResponse> => {
  try {
    const response = await apiClient.post<WorkingDayResponse>(
      '/professional/get-working-hours',
      { api_token: data.api_token }
    );
    console.log('POST /professional/get-working-hours - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching working hours:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to fetch working hours',
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

/** POST /professional/update-working-hours — body: { api_token, hours: [{ day, start_time, end_time, is_closed }] } */
export const saveWorkingHours = async (
  data: SaveWorkingHoursRequest
): Promise<SaveWorkingHoursResponse> => {
  try {
    const response = await apiClient.post<SaveWorkingHoursResponse>(
      '/professional/update-working-hours',
      {
        api_token: data.api_token,
        hours: data.hours,
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error saving working hours:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to save working hours',
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

export const createProfessionalDay = async (
  data: CreateProfessionalDayRequest
): Promise<CreateProfessionalDayResponse> => {
  try {
    const response = await apiClient.post<CreateProfessionalDayResponse>(
      '/professional_days/create',
      data
    );
    
    console.log('POST /professional_days/create - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating professional day:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to create professional day',
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

export const getBlockedDays = async (
  data: GetBlockedDaysRequest
): Promise<GetBlockedDaysResponse> => {
  try {
    const response = await apiClient.post<GetBlockedDaysResponse>(
      '/professional_days/block',
      { api_token: data.api_token }
    );
    console.log('POST /professional_days/block - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching blocked days:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to fetch blocked days',
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

export const deleteProfessionalDay = async (
  data: DeleteProfessionalDayRequest
): Promise<DeleteProfessionalDayResponse> => {
  try {
    const response = await apiClient.post<DeleteProfessionalDayResponse>(
      '/professional_days/delete',
      {
        api_token: data.api_token,
        id: data.id,
      }
    );
    
    console.log('POST /professional_days/delete - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error deleting professional day:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to delete professional day',
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

export const getMonthlyAvailability = async (
  data: GetMonthlyAvailabilityRequest
): Promise<GetMonthlyAvailabilityResponse> => {
  try {
    const requestBody: any = { api_token: data.api_token };
    
    // Add month and year if provided
    if (data.month !== undefined) {
      requestBody.month = data.month;
    }
    if (data.year !== undefined) {
      requestBody.year = data.year;
    }
    
    const response = await apiClient.post<GetMonthlyAvailabilityResponse>(
      '/professional/monthly_availability',
      requestBody
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching monthly availability:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to fetch monthly availability',
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

export const getMonthlyAvailabilitySummary = async (
  data: GetMonthlyAvailabilitySummaryRequest
): Promise<GetMonthlyAvailabilitySummaryResponse> => {
  try {
    const requestBody: any = { api_token: data.api_token };
    
    // Add month and year if provided
    if (data.month !== undefined) {
      requestBody.month = data.month;
    }
    if (data.year !== undefined) {
      requestBody.year = data.year;
    }
    
    const response = await apiClient.post<GetMonthlyAvailabilitySummaryResponse>(
      '/professional/monthly_availability/summary',
      requestBody
    );
    console.log('POST /professional/monthly_availability/summary - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching monthly availability summary:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to fetch monthly availability summary',
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

// TypeScript types for Dashboard Summary
export interface DashboardSummaryData {
  upcoming_jobs: {
    count: number;
    this_week: number;
  };
  earnings: {
    total: string;
    this_month: string;
  };
  reports: {
    total: number;
  };
}

/** Display API money strings exactly (e.g. `2,147.00` → `£2,147.00`). */
export function formatProfessionalDashboardMoney(
  raw: string | number | null | undefined
): string {
  const s = String(raw ?? "").trim();
  if (!s) return "£0.00";
  if (s.startsWith("£")) return s;
  return `£${s}`;
}

function dashboardSummaryIsRecord(x: unknown): x is Record<string, unknown> {
  return x != null && typeof x === 'object' && !Array.isArray(x);
}

function dashboardSummaryNum(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number.parseFloat(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function dashboardSummaryStr(v: unknown, fallback = '0'): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return fallback;
}

/** Unwrap Laravel `{ data }` / nested `data` or use root when summary keys exist. */
function extractDashboardSummaryPayload(body: unknown): Record<string, unknown> | null {
  if (!dashboardSummaryIsRecord(body)) return null;
  if (body.success === false || body.status === false) return null;
  if (body.status === 'error' || body.status === 'failed') return null;

  const d = body.data;
  if (dashboardSummaryIsRecord(d)) {
    const inner = d.data;
    if (
      dashboardSummaryIsRecord(inner) &&
      ('upcoming_jobs' in inner ||
        'upcomingJobs' in inner ||
        'earnings' in inner ||
        'reports' in inner)
    ) {
      return inner;
    }
    if (
      'upcoming_jobs' in d ||
      'upcomingJobs' in d ||
      'earnings' in d ||
      'reports' in d
    ) {
      return d;
    }
  }
  if (
    'upcoming_jobs' in body ||
    'upcomingJobs' in body ||
    'earnings' in body ||
    'reports' in body
  ) {
    return body;
  }
  return null;
}

/**
 * Normalize `POST /professional_dashboard/summary` JSON into {@link DashboardSummaryData}.
 * Accepts camelCase or snake_case blocks and common Laravel envelopes.
 */
export function parseDashboardSummaryFromResponse(body: unknown): DashboardSummaryData | null {
  const raw = extractDashboardSummaryPayload(body);
  if (!raw) return null;

  const ujRaw =
    (dashboardSummaryIsRecord(raw.upcoming_jobs) && raw.upcoming_jobs) ||
    (dashboardSummaryIsRecord(raw.upcomingJobs) && raw.upcomingJobs) ||
    null;
  const upcoming_jobs = {
    count: dashboardSummaryNum(
      ujRaw?.count ?? ujRaw?.total ?? ujRaw?.total_count ?? raw.upcoming_jobs_count
    ),
    this_week: dashboardSummaryNum(
      ujRaw?.this_week ??
        ujRaw?.thisWeek ??
        raw.this_week_upcoming ??
        raw.jobs_this_week ??
        raw.upcoming_this_week
    ),
  };

  const eraw =
    (dashboardSummaryIsRecord(raw.earnings) && raw.earnings) ||
    (dashboardSummaryIsRecord(raw.total_earnings) && raw.total_earnings) ||
    null;
  const earnings = {
    total: dashboardSummaryStr(
      eraw?.total ?? eraw?.total_earnings ?? raw.total_earnings ?? raw.earnings_total
    ),
    this_month: dashboardSummaryStr(
      eraw?.this_month ?? eraw?.thisMonth ?? raw.earnings_this_month ?? raw.this_month_earnings
    ),
  };

  const repRaw = dashboardSummaryIsRecord(raw.reports) ? raw.reports : null;
  const reports = {
    total: dashboardSummaryNum(
      repRaw?.total ??
        repRaw?.pending ??
        repRaw?.count ??
        raw.reports_pending ??
        raw.total_reports ??
        raw.all_reports
    ),
  };

  return { upcoming_jobs, earnings, reports };
}

/**
 * Professional dashboard stat cards (upcoming jobs, earnings, reports).
 * POST `/professional_dashboard/summary` with `{ api_token }` (same token stored after login).
 * @returns Parsed summary, or `null` if the response shape is not recognized or indicates failure.
 */
export const getDashboardSummary = async (api_token: string): Promise<DashboardSummaryData | null> => {
  try {
    const response = await apiClient.post<unknown>('/professional_dashboard/summary', {
      api_token,
    });
    return parseDashboardSummaryFromResponse(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to fetch dashboard summary',
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

// TypeScript types for Report Upload
export interface UploadReportRequest {
  api_token: string;
  user_id: number | null;
  booking_id: number;
  note: string;
  report_file: string; // Base64 encoded file
}

export interface UploadReportResponse {
  status: string;
  message: string;
  data?: {
    report_image: string;
    note: string;
    user_id: number;
    created_by: number;
    professional_id: number;
    booking_id: number;
    updated_at: string;
    created_at: string;
    id: number;
  };
}

/**
 * Upload a report for a booking
 * BaseURL: https://fireguide.attoexasolutions.com/api/reports/store
 * Method: POST
 * @param data - Report upload data including Base64 file
 * @returns Promise with the API response
 */
export const uploadReport = async (
  data: UploadReportRequest
): Promise<UploadReportResponse> => {
  try {
    console.log('POST /reports/store - Uploading report...');
    
    const response = await apiClient.post<UploadReportResponse>(
      '/reports/store',
      {
        api_token: data.api_token,
        user_id: data.user_id,
        booking_id: data.booking_id,
        note: data.note,
        report_file: data.report_file
      }
    );
    
    console.log('POST /reports/store - Response:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('Error uploading report:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to upload report',
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

export interface GetBookingReportRequest {
  api_token: string;
  booking_id: number;
}

export interface GetBookingReportData {
  id?: number;
  booking_id?: number;
  report_image?: string;
  report_file?: string;
  note?: string;
  [key: string]: unknown;
}

export interface GetBookingReportResponse {
  status: string | boolean;
  message?: string;
  data?: GetBookingReportData;
}

/**
 * Fetch uploaded completion report for a booking (customer download).
 * POST /reports/get — body: { api_token, booking_id }
 */
export const getBookingReport = async (
  data: GetBookingReportRequest
): Promise<GetBookingReportResponse> => {
  try {
    const response = await apiClient.post<GetBookingReportResponse>('/reports/get', {
      api_token: data.api_token,
      booking_id: data.booking_id,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching booking report:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to fetch report',
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

/** POST /professional-notice-period/get — body: { api_token } */
export interface ProfessionalNoticePeriodRecord {
  id: number;
  professional_id: number;
  notice_days: number;
  is_active?: boolean | number;
  created_at?: string;
  updated_at?: string;
}

export interface GetProfessionalNoticePeriodResponse {
  status: boolean;
  message: string;
  data: ProfessionalNoticePeriodRecord | null;
}

export const getProfessionalNoticePeriod = async (
  apiToken: string
): Promise<GetProfessionalNoticePeriodResponse> => {
  try {
    const response = await apiClient.post<GetProfessionalNoticePeriodResponse>(
      '/professional-notice-period/get',
      { api_token: apiToken }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching professional notice period:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to fetch notice period',
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

/** POST /professional-notice-period/create — body: { api_token, notice_days } */
export interface CreateProfessionalNoticePeriodRequest {
  api_token: string;
  notice_days: number;
}

export interface CreateProfessionalNoticePeriodResponse {
  status: boolean;
  message: string;
  data?: ProfessionalNoticePeriodRecord;
}

export const createProfessionalNoticePeriod = async (
  data: CreateProfessionalNoticePeriodRequest
): Promise<CreateProfessionalNoticePeriodResponse> => {
  try {
    const response = await apiClient.post<CreateProfessionalNoticePeriodResponse>(
      '/professional-notice-period/create',
      {
        api_token: data.api_token,
        notice_days: data.notice_days,
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error saving professional notice period:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to save notice period',
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

/** Admin → professional messages — POST /contact-professional/get with `{ api_token }`. */
export interface ProfessionalAdminContactMessageItem {
  id: number;
  message: string;
  created_at: string;
  title?: string;
  [key: string]: unknown;
}

export interface GetProfessionalContactAdminMessagesRequest {
  api_token: string;
}

export interface GetProfessionalContactAdminMessagesResponse {
  status: boolean;
  message: string;
  data: ProfessionalAdminContactMessageItem[];
}

function pcMsgIsRecord(x: unknown): x is Record<string, unknown> {
  return x != null && typeof x === "object" && !Array.isArray(x);
}

function pcMsgStrField(r: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = r[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

function pcMsgMessageFromPayload(payload: unknown, fallback: string): string {
  if (!pcMsgIsRecord(payload)) return fallback;
  const m = payload.message;
  return typeof m === "string" && m.trim() ? m : fallback;
}

function extractProfessionalContactMessagesArray(payload: unknown): unknown[] {
  if (payload == null) return [];
  if (Array.isArray(payload)) return payload;
  if (!pcMsgIsRecord(payload)) return [];
  const data = payload.data;
  if (Array.isArray(data)) return data;
  if (pcMsgIsRecord(data) && Array.isArray(data.data)) return data.data;
  if (Array.isArray(payload.messages)) return payload.messages;
  if (pcMsgIsRecord(data) && typeof data.message === "string") {
    return [data];
  }
  return [];
}

function normalizeProfessionalAdminContactMessageRow(row: unknown): ProfessionalAdminContactMessageItem | null {
  if (!pcMsgIsRecord(row)) return null;
  const idRaw = row.id ?? row.message_id;
  let id = typeof idRaw === "number" && Number.isFinite(idRaw) ? idRaw : parseInt(String(idRaw ?? ""), 10);
  if (!Number.isFinite(id) || id <= 0) {
    id = 0;
  }
  const message = pcMsgStrField(row, "message", "body", "content", "text", "note", "admin_message");
  const title = pcMsgStrField(row, "title", "subject", "heading") || "Admin message";
  const created_at = pcMsgStrField(row, "created_at", "updated_at", "date", "sent_at", "createdAt");
  return {
    ...row,
    id,
    title,
    message,
    created_at,
  } as ProfessionalAdminContactMessageItem;
}

function parseProfessionalContactMessagesPayload(payload: unknown): ProfessionalAdminContactMessageItem[] {
  const raw = extractProfessionalContactMessagesArray(payload);
  const out: ProfessionalAdminContactMessageItem[] = [];
  raw.forEach((row) => {
    const n = normalizeProfessionalAdminContactMessageRow(row);
    if (n && (n.message.trim() !== "" || n.id > 0)) {
      out.push(n);
    }
  });
  return out;
}

/**
 * Professional inbox for messages sent by admin — POST /contact-professional/get.
 */
export const getProfessionalContactAdminMessages = async (
  data: GetProfessionalContactAdminMessagesRequest
): Promise<GetProfessionalContactAdminMessagesResponse> => {
  try {
    const response = await apiClient.post<unknown>("/contact-professional/get", {
      api_token: data.api_token,
    });
    const body = response.data;
    const list = parseProfessionalContactMessagesPayload(body);
    return {
      status: true,
      message: pcMsgMessageFromPayload(body, "OK"),
      data: list,
    };
  } catch (error) {
    console.error("Error fetching professional admin messages:", error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || "Failed to load admin messages",
          error: error.response.data?.error || "Unknown error",
        };
      } else if (error.request) {
        throw {
          status: false,
          message: "Network error. Please check your connection.",
          error: "Network error",
        };
      }
    }
    throw {
      status: false,
      message: "An unexpected error occurred",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
