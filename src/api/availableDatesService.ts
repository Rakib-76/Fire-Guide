import axios from 'axios';
import { resolveApiBaseUrl } from '../lib/apiBaseUrl';
import { normalizeSlotForBookingComparison, parseBookingDateKey } from '../lib/bookingSlotNormalize';
import { collectCalendarBlockedDatesFromListPayload } from './professionalsService';

// Types for available dates API
export interface AvailableDateItem {
  id: number;
  date: string;
  slot: string;
  created_at: string;
  updated_at: string;
  creator: {
    id: number;
    full_name: string;
  } | null;
  updater: {
    id: number;
    full_name: string;
  } | null;
  professional: {
    id: number;
    name: string | null;
  } | null;
}

export interface AvailableDatesApiResponse {
  status: string;
  message: string;
  data: AvailableDateItem[];
}

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

export interface CreateAvailableDateRequest {
  api_token: string;
  date: string;
  slot: string;
  professional_id: number;
}

export interface CreateAvailableDateResponse {
  status?: string;
  success?: boolean;
  message?: string;
  error?: string;
  data?: AvailableDateItem;
}

export interface UpdateAvailableDateRequest {
  api_token: string;
  id: number;
  date: string;
  slot: string;
}

export interface UpdateAvailableDateResponse {
  status?: string;
  success?: boolean;
  message?: string;
  error?: string;
  data?: AvailableDateItem;
}

export interface DeleteAvailableDateRequest {
  api_token: string;
  id: number;
}

export interface DeleteAvailableDateResponse {
  status?: string;
  success?: boolean;
  message?: string;
  error?: string;
}

/**
 * Professional profile available dates — for customer booking flow.
 * POST https://fireguide.attoexasolutions.com/api/professional-profile/available-date
 * Body: { professional_id }
 * Response: { status, message, data: [{ date: "YYYY-MM-DD", slots: ["09:00 AM", ...] }] }
 */
export interface ProfessionalProfileAvailableDateItem {
  date: string;
  slots: string[];
  /** When API marks slots already taken for this date (optional). */
  booked_slots?: string[];
}

export interface ProfessionalProfileAvailableDateResponse {
  status: boolean;
  message: string;
  data: ProfessionalProfileAvailableDateItem[];
}

/** Result of POST /professional-profile/available-date — slot rows plus calendar block hints from the same payload. */
export interface ProfessionalProfileAvailabilityFetchResult {
  dates: ProfessionalProfileAvailableDateItem[];
  /** YYYY-MM-DD from `blocked_ranges` and `notice_blocked_dates` when `data` is an object (not only a slot array). */
  blockedCalendarDates: string[];
  /**
   * Already-booked slot keys per date (normalized via {@link normalizeSlotForBookingComparison}).
   * Parsed from common response shapes: `bookings`, `booked_slots_by_date`, per-row `booked_slots`, etc.
   */
  bookedSlotKeysByDate: Record<string, string[]>;
}

function extractSlotsArrayFromAvailabilityData(data: unknown): ProfessionalProfileAvailableDateItem[] {
  if (Array.isArray(data)) {
    return data.filter(
      (x): x is ProfessionalProfileAvailableDateItem =>
        x != null &&
        typeof x === "object" &&
        typeof (x as ProfessionalProfileAvailableDateItem).date === "string" &&
        Array.isArray((x as ProfessionalProfileAvailableDateItem).slots)
    );
  }
  if (data == null || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  const keys = ["dates", "available_dates", "availability", "slot_dates", "calendar"];
  for (const key of keys) {
    const v = o[key];
    if (Array.isArray(v)) {
      return extractSlotsArrayFromAvailabilityData(v);
    }
  }
  return [];
}

function mergeBookedSlot(
  out: Map<string, Set<string>>,
  dateRaw: string,
  timeRaw: string
): void {
  const dk = parseBookingDateKey(dateRaw);
  if (!dk || !timeRaw) return;
  const tk = normalizeSlotForBookingComparison(timeRaw);
  if (!tk) return;
  if (!out.has(dk)) out.set(dk, new Set());
  out.get(dk)!.add(tk);
}

/**
 * Collect already-booked times from the same `available-date` payload the backend may use
 * (field names vary by deployment).
 */
export function extractBookedSlotKeysByDateFromAvailabilityPayload(data: unknown): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  if (data == null) return out;

  if (Array.isArray(data)) {
    for (const row of data) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const date =
        (typeof r.date === "string" && r.date) ||
        (typeof r.selected_date === "string" && r.selected_date) ||
        "";
      const bookedArr = r.booked_slots ?? r.taken_slots ?? r.unavailable_slots;
      if (Array.isArray(bookedArr) && date) {
        for (const t of bookedArr) {
          if (typeof t === "string") mergeBookedSlot(out, date, t);
        }
      }
    }
    return out;
  }

  if (typeof data !== "object") return out;
  const o = data as Record<string, unknown>;

  const listKeys = [
    "bookings",
    "booked_slots",
    "existing_bookings",
    "scheduled_bookings",
    "taken_slots",
    "occupied_slots",
    "professional_bookings",
  ];
  for (const key of listKeys) {
    const list = o[key];
    if (!Array.isArray(list)) continue;
    for (const row of list) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const date =
        (typeof r.selected_date === "string" && r.selected_date) ||
        (typeof r.date === "string" && r.date) ||
        (typeof r.booking_date === "string" && r.booking_date) ||
        "";
      const time =
        (typeof r.selected_time === "string" && r.selected_time) ||
        (typeof r.time === "string" && r.time) ||
        (typeof r.slot === "string" && r.slot) ||
        "";
      if (date && time) mergeBookedSlot(out, date, time);
    }
  }

  const byDate = o.booked_slots_by_date ?? o.booked_times_by_date ?? o.taken_slots_by_date;
  if (byDate && typeof byDate === "object" && !Array.isArray(byDate)) {
    for (const [dateKey, val] of Object.entries(byDate)) {
      if (Array.isArray(val)) {
        for (const t of val) {
          if (typeof t === "string") mergeBookedSlot(out, dateKey, t);
        }
      }
    }
  }

  return out;
}

function bookedMapToRecord(m: Map<string, Set<string>>): Record<string, string[]> {
  const rec: Record<string, string[]> = {};
  for (const [k, set] of m) {
    rec[k] = [...set];
  }
  return rec;
}

export const fetchProfessionalProfileAvailableDates = async (
  professionalId: number
): Promise<ProfessionalProfileAvailabilityFetchResult> => {
  const response = await apiClient.post<ProfessionalProfileAvailableDateResponse>(
    '/professional-profile/available-date',
    { professional_id: professionalId }
  );
  const payload = response.data as {
    status?: boolean;
    message?: string;
    data?: unknown;
  };
  const statusOk = payload?.status === true;
  if (!statusOk) {
    throw new Error(String(payload?.message) || "Failed to fetch available dates");
  }
  const raw = payload?.data;
  const dates = extractSlotsArrayFromAvailabilityData(raw);
  const blockedCalendarDates = collectCalendarBlockedDatesFromListPayload(
    payload as Record<string, unknown>,
    raw
  );
  const bookedMap = extractBookedSlotKeysByDateFromAvailabilityPayload(raw);
  for (const row of dates) {
    const bookedArr = row.booked_slots;
    if (!Array.isArray(bookedArr)) continue;
    for (const t of bookedArr) {
      if (typeof t === "string") mergeBookedSlot(bookedMap, row.date, t);
    }
  }
  return {
    dates,
    blockedCalendarDates,
    bookedSlotKeysByDate: bookedMapToRecord(bookedMap),
  };
};

/**
 * Fetch all available dates
 * @returns Promise with the API response
 */
export const fetchAvailableDates = async (): Promise<AvailableDateItem[]> => {
  try {
    const response = await apiClient.get<AvailableDatesApiResponse>('/available-dates');
    
    // Handle the response structure
    if (response.data.status === 'success' && response.data.data) {
      return response.data.data; // Direct array
    }
    
    // Fallback: return empty array if structure is unexpected
    return [];
  } catch (error) {
    console.error('Error fetching available dates:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to fetch available dates',
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
 * Create a new available date
 * @param data - Available date creation data
 * @returns Promise with the API response
 */
export const createAvailableDate = async (data: CreateAvailableDateRequest): Promise<CreateAvailableDateResponse> => {
  try {
    const response = await apiClient.post<CreateAvailableDateResponse>('/available-dates/create', data);
    return response.data;
  } catch (error) {
    console.error('Error creating available date:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to create available date',
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
 * Update an existing available date
 * @param data - Available date update data
 * @returns Promise with the API response
 */
export const updateAvailableDate = async (data: UpdateAvailableDateRequest): Promise<UpdateAvailableDateResponse> => {
  try {
    const response = await apiClient.post<UpdateAvailableDateResponse>('/available-dates/update', data);
    return response.data;
  } catch (error) {
    console.error('Error updating available date:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to update available date',
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
 * Delete an available date
 * @param data - Available date deletion data
 * @returns Promise with the API response
 */
export const deleteAvailableDate = async (data: DeleteAvailableDateRequest): Promise<DeleteAvailableDateResponse> => {
  try {
    const response = await apiClient.post<DeleteAvailableDateResponse>('/available-dates/delete', data);
    return response.data;
  } catch (error) {
    console.error('Error deleting available date:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to delete available date',
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
