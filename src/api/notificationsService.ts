import axios from 'axios';
import { handleTokenExpired, isTokenExpiredError } from '../lib/auth';
import { resolveApiBaseUrl } from '../lib/apiBaseUrl';

// Types for notifications API
export interface NotificationApiItem {
  id: number;
  user_id: number;
  title: string;
  content: string;
  priority: "low" | "medium" | "high";
  category: "system" | "reviews" | "payments" | "bookings";
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface FetchNotificationsRequest {
  api_token: string;
}

export interface FetchNotificationsResponse {
  status: boolean;
  data: NotificationApiItem[];
  message?: string;
  error?: string;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return x != null && typeof x === "object" && !Array.isArray(x);
}

/** Same envelope patterns as customer feed: `data: []` or `data: { data: [] }`. */
function extractNotificationsArray(payload: unknown): unknown[] {
  if (payload == null) return [];
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];
  const data = payload.data;
  if (Array.isArray(data)) return data;
  if (isRecord(data) && Array.isArray(data.data)) return data.data;
  if (Array.isArray(payload.notifications)) return payload.notifications;
  return [];
}

function strField(r: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = r[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

function coerceCategory(raw: unknown): NotificationApiItem["category"] {
  const v = String(raw ?? "system").toLowerCase();
  if (
    v === "bookings" ||
    v === "booking" ||
    v === "user_booking" ||
    v === "user_bookings" ||
    v.includes("booking")
  ) {
    return "bookings";
  }
  if (
    v === "payments" ||
    v === "payment" ||
    v === "user_payment" ||
    v === "user_payments" ||
    v.includes("payment")
  ) {
    return "payments";
  }
  if (v === "reviews" || v === "review" || v === "user_review" || v.includes("review")) {
    return "reviews";
  }
  return "system";
}

function coercePriority(raw: unknown): NotificationApiItem["priority"] {
  const v = String(raw ?? "medium").toLowerCase();
  if (v === "high" || v === "urgent") return "high";
  if (v === "low") return "low";
  return "medium";
}

function readFlag(r: Record<string, unknown>): boolean {
  return (
    r.is_read === true ||
    r.is_read === 1 ||
    r.is_read === "1" ||
    r.read === true ||
    r.read === 1
  );
}

/**
 * Normalizes one row from POST /notifications into the shape the professional UI expects.
 */
export function normalizeNotificationFeedRow(row: unknown): NotificationApiItem | null {
  if (!isRecord(row)) return null;
  const idRaw = row.id ?? row.notification_id;
  const idParsed = typeof idRaw === "number" && Number.isFinite(idRaw) ? idRaw : parseInt(String(idRaw ?? ""), 10);
  if (!Number.isFinite(idParsed) || idParsed <= 0) return null;

  const user_id =
    typeof row.user_id === "number" && Number.isFinite(row.user_id)
      ? row.user_id
      : parseInt(String(row.user_id ?? "0"), 10) || 0;

  const title = strField(row, "title", "subject", "heading", "name") || "Notification";
  const content = strField(row, "content", "message", "body", "description", "text", "details");
  const created_at = strField(row, "created_at", "updated_at", "date", "sent_at") || new Date().toISOString();
  const updated_at = strField(row, "updated_at", "created_at") || created_at;

  return {
    id: idParsed,
    user_id,
    title,
    content,
    priority: coercePriority(row.priority),
    category: coerceCategory(row.category ?? row.type),
    is_read: readFlag(row),
    created_at,
    updated_at,
  };
}

export function normalizeNotificationsResponsePayload(payload: unknown): NotificationApiItem[] {
  const raw = extractNotificationsArray(payload);
  const out: NotificationApiItem[] = [];
  for (const row of raw) {
    const n = normalizeNotificationFeedRow(row);
    if (n) out.push(n);
  }
  return out;
}

/** Stable id for seen-state (header badge) and deduping. */
export function getProfessionalNotificationDedupeKey(item: NotificationApiItem): string {
  if (Number.isFinite(item.id) && item.id > 0) return `id:${item.id}`;
  const head = `${item.title}|${(item.content || "").slice(0, 120)}`;
  return `h:${item.created_at}|${head}`;
}

function extractBookingReference(...parts: string[]): string | null {
  for (const part of parts) {
    const value = part.trim();
    if (!value) continue;
    const match =
      value.match(/#?\b(FG-\d{4}-\d+)\b/i) ||
      value.match(/quote request\s*#?(\d+)/i) ||
      value.match(/booking\s*#?(\d+)/i);
    if (match?.[1]) return match[1].startsWith("FG-") ? match[1] : match[1];
    if (match?.[0]) return match[0].replace(/^#/, "");
  }
  return null;
}

/** Booking was cancelled — used for icon and clearer copy on the professional feed. */
export function isBookingCancellationNotification(title: string, content: string): boolean {
  const combined = `${title} ${content}`.toLowerCase();
  return /\bcancel(l)?ed\b/.test(combined) && /\bbook(ing)?\b/.test(combined);
}

/** Approved / verified / success notifications — green styling in the professional feed. */
export function isApprovalNotification(title: string, content: string): boolean {
  const combined = `${title} ${content}`.toLowerCase();
  if (isNegativeNotification(title, content)) return false;
  return (
    /\bapprov(ed|al)?\b/.test(combined) ||
    /\bverified\b/.test(combined) ||
    /\bsuccess(ful(ly)?)?\b/.test(combined)
  );
}

/** Cancelled, rejected, declined, or invalid — AlertCircle icon in the professional feed. */
export function isNegativeNotification(title: string, content: string): boolean {
  if (isBookingCancellationNotification(title, content)) return true;
  const combined = `${title} ${content}`.toLowerCase();
  return (
    /\bcancel(l)?ed\b/.test(combined) ||
    /\breject(ed|ion)?\b/.test(combined) ||
    /\bdeclin(ed|e)?\b/.test(combined) ||
    /\binvalid\b/.test(combined) ||
    /\bdenied\b/.test(combined)
  );
}

export type ProfessionalNotificationTone = "approve" | "negative" | "default";

export function getProfessionalNotificationTone(
  title: string,
  content: string
): ProfessionalNotificationTone {
  if (isApprovalNotification(title, content)) return "approve";
  if (isNegativeNotification(title, content)) return "negative";
  return "default";
}

/** Booking date/time changed — distinct icon from new booking and cancellation. */
export function isBookingRescheduleNotification(title: string, content: string): boolean {
  if (isBookingCancellationNotification(title, content)) return false;
  const combined = `${title} ${content}`.toLowerCase();
  return /\breschedule(d)?\b/.test(combined) || /\bre-?scheduled\b/.test(combined);
}

export function formatProfessionalNotificationTitle(title: string, content: string): string {
  const raw = title.trim() || "Notification";
  const lower = raw.toLowerCase();

  if (isBookingCancellationNotification(raw, content)) {
    if (lower.includes("admin")) return "Booking cancelled by admin";
    if (lower.includes("customer") || lower.includes("client")) return "Booking cancelled by customer";
    if (lower.includes("professional")) return "Booking cancelled by professional";
    return "Booking cancelled";
  }

  if (isBookingRescheduleNotification(raw, content)) {
    if (lower.includes("customer") || lower.includes("client")) return "Booking rescheduled by customer";
    if (lower.includes("professional")) return "Booking rescheduled by professional";
    if (lower.includes("admin")) return "Booking rescheduled by admin";
    return "Booking rescheduled";
  }

  if (lower.includes("created") && lower.includes("booking")) {
    return "New booking received";
  }

  return raw;
}

export function formatProfessionalNotificationContent(title: string, content: string): string {
  const raw = content.trim();
  const lowerTitle = title.toLowerCase();
  const lowerContent = raw.toLowerCase();
  const bookingRef = extractBookingReference(title, raw);

  if (
    lowerContent === "booking has cancelled the booking." ||
    lowerContent === "booking has cancelled the booking" ||
    /^booking has cancelled the booking\.?$/i.test(raw)
  ) {
    if (lowerTitle.includes("admin")) {
      return bookingRef
        ? `Booking ${bookingRef} was cancelled by the Fire Guide admin team.`
        : "A booking was cancelled by the Fire Guide admin team.";
    }
    if (lowerTitle.includes("customer") || lowerTitle.includes("client")) {
      return bookingRef
        ? `The customer cancelled booking ${bookingRef}.`
        : "The customer cancelled this booking.";
    }
    return bookingRef
      ? `Booking ${bookingRef} has been cancelled.`
      : "This booking has been cancelled.";
  }

  if (isBookingCancellationNotification(title, raw)) {
    const customerMatch = raw.match(/^([A-Za-z][A-Za-z\s'.-]{1,40})\s+has cancelled the booking\.?$/i);
    if (customerMatch?.[1] && !/^booking$/i.test(customerMatch[1].trim())) {
      return bookingRef
        ? `${customerMatch[1].trim()} cancelled booking ${bookingRef}.`
        : `${customerMatch[1].trim()} cancelled this booking.`;
    }

    if (lowerTitle.includes("admin")) {
      return bookingRef
        ? `Booking ${bookingRef} was cancelled by the Fire Guide admin team.`
        : "A booking was cancelled by the Fire Guide admin team.";
    }

    if (lowerTitle.includes("customer") || lowerTitle.includes("client")) {
      return bookingRef
        ? `The customer cancelled booking ${bookingRef}.`
        : "The customer cancelled this booking.";
    }

    return bookingRef
      ? `Booking ${bookingRef} has been cancelled.`
      : raw || "This booking has been cancelled.";
  }

  if (isBookingRescheduleNotification(title, raw)) {
    const customerMatch = raw.match(/^([A-Za-z][A-Za-z\s'.-]{1,40})\s+(?:has\s+)?requested\s+(?:a\s+)?reschedule/i);
    if (customerMatch?.[1]) {
      return bookingRef
        ? `${customerMatch[1].trim()} requested to reschedule booking ${bookingRef}.`
        : `${customerMatch[1].trim()} requested to reschedule this booking.`;
    }

    if (lowerTitle.includes("customer") || lowerTitle.includes("client")) {
      return bookingRef
        ? `The customer rescheduled booking ${bookingRef}.`
        : "The customer rescheduled this booking.";
    }

    if (lowerTitle.includes("professional")) {
      return bookingRef
        ? `You rescheduled booking ${bookingRef}.`
        : "You rescheduled this booking.";
    }

    return bookingRef
      ? `Booking ${bookingRef} was rescheduled.`
      : raw || "This booking was rescheduled.";
  }

  if (lowerContent.startsWith("your booking")) {
    if (lowerContent.includes("created")) {
      return bookingRef
        ? `You received a new booking (${bookingRef}).`
        : "You received a new booking.";
    }
    if (lowerContent.includes("reschedule")) {
      return bookingRef
        ? `Booking ${bookingRef} was rescheduled.`
        : "A booking was rescheduled.";
    }
  }

  if (lowerContent.includes("created successfully") && lowerContent.includes("booking")) {
    return bookingRef
      ? `Booking ${bookingRef} was created successfully.`
      : raw;
  }

  return raw || "No additional details.";
}

export interface MarkAllAsReadRequest {
  api_token: string;
}

export interface MarkAllAsReadResponse {
  status: boolean;
  message?: string;
  updated?: number;
  error?: string;
}

export interface MarkNotificationAsReadRequest {
  api_token: string;
  notification_id: number;
}

export interface MarkNotificationAsReadResponse {
  status: boolean;
  message?: string;
  data?: {
    id: number;
    is_read: boolean;
  };
  error?: string;
}

export interface DeleteAllNotificationsRequest {
  api_token: string;
}

export interface DeleteAllNotificationsResponse {
  status: boolean;
  message?: string;
  deleted?: number;
  error?: string;
}

export interface DeleteNotificationRequest {
  api_token: string;
  notification_id: number;
}

export interface DeleteNotificationResponse {
  status: boolean;
  message?: string;
  error?: string;
}

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

/**
 * Fetch all notifications for the authenticated user
 * @param data - Request data containing api_token
 * @returns Promise with the API response containing array of notifications
 */
export const fetchNotifications = async (
  data: FetchNotificationsRequest
): Promise<FetchNotificationsResponse> => {
  try {
    const response = await apiClient.post<unknown>("/notifications", {
      api_token: data.api_token,
    });
    const body = response.data;
    const list = normalizeNotificationsResponsePayload(body);
    const msg = isRecord(body) && typeof body.message === "string" ? body.message : undefined;
    return {
      status: true,
      data: list,
      message: msg,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Handle axios errors
      if (error.response) {
        // Server responded with error status
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to fetch notifications',
          error: error.response.data?.error || error.message,
          data: [],
        };
      } else if (error.request) {
        // Request was made but no response received
        throw {
          status: false,
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
          data: [],
        };
      }
    }
    // Handle other errors
    throw {
      status: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
      data: [],
    };
  }
};

/**
 * Fetch unread notifications for the authenticated user
 * @param data - Request data containing api_token
 * @returns Promise with the API response containing array of unread notifications
 */
function buildFetchNotificationsResult(body: unknown): FetchNotificationsResponse {
  const list = normalizeNotificationsResponsePayload(body);
  const msg = isRecord(body) && typeof body.message === "string" ? body.message : undefined;
  const status =
    isRecord(body) &&
    (body.status === true ||
      body.status === "success" ||
      body.status === "true" ||
      body.success === true);
  return {
    status: status ?? list.length > 0,
    data: list,
    message: msg,
  };
}

export const fetchUnreadNotifications = async (
  data: FetchNotificationsRequest
): Promise<FetchNotificationsResponse> => {
  try {
    const response = await apiClient.post<unknown>(
      '/notifications/unread',
      {
        api_token: data.api_token,
      }
    );
    return buildFetchNotificationsResult(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Handle axios errors
      if (error.response) {
        // Server responded with error status
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to fetch unread notifications',
          error: error.response.data?.error || error.message,
          data: [],
        };
      } else if (error.request) {
        // Request was made but no response received
        throw {
          status: false,
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
          data: [],
        };
      }
    }
    // Handle other errors
    throw {
      status: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
      data: [],
    };
  }
};

/**
 * Fetch bookings notifications for the authenticated user
 * @param data - Request data containing api_token
 * @returns Promise with the API response containing array of bookings notifications
 */
export const fetchBookingsNotifications = async (
  data: FetchNotificationsRequest
): Promise<FetchNotificationsResponse> => {
  try {
    const response = await apiClient.post<unknown>(
      '/notifications/bookings',
      {
        api_token: data.api_token,
      }
    );
    return buildFetchNotificationsResult(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Handle axios errors
      if (error.response) {
        // Server responded with error status
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to fetch bookings notifications',
          error: error.response.data?.error || error.message,
          data: [],
        };
      } else if (error.request) {
        // Request was made but no response received
        throw {
          status: false,
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
          data: [],
        };
      }
    }
    // Handle other errors
    throw {
      status: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
      data: [],
    };
  }
};

/**
 * Fetch payments notifications for the authenticated user
 * @param data - Request data containing api_token
 * @returns Promise with the API response containing array of payments notifications
 */
export const fetchPaymentsNotifications = async (
  data: FetchNotificationsRequest
): Promise<FetchNotificationsResponse> => {
  try {
    const response = await apiClient.post<unknown>(
      '/notifications/payments',
      {
        api_token: data.api_token,
      }
    );
    return buildFetchNotificationsResult(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Handle axios errors
      if (error.response) {
        // Server responded with error status
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to fetch payments notifications',
          error: error.response.data?.error || error.message,
          data: [],
        };
      } else if (error.request) {
        // Request was made but no response received
        throw {
          status: false,
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
          data: [],
        };
      }
    }
    // Handle other errors
    throw {
      status: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
      data: [],
    };
  }
};

/**
 * Fetch reviews notifications for the authenticated user
 * @param data - Request data containing api_token
 * @returns Promise with the API response containing array of reviews notifications
 */
export const fetchReviewsNotifications = async (
  data: FetchNotificationsRequest
): Promise<FetchNotificationsResponse> => {
  try {
    const response = await apiClient.post<FetchNotificationsResponse>(
      '/notifications/reviews',
      {
        api_token: data.api_token,
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Handle axios errors
      if (error.response) {
        // Server responded with error status
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to fetch reviews notifications',
          error: error.response.data?.error || error.message,
          data: [],
        };
      } else if (error.request) {
        // Request was made but no response received
        throw {
          status: false,
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
          data: [],
        };
      }
    }
    // Handle other errors
    throw {
      status: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
      data: [],
    };
  }
};

/**
 * Fetch system notifications for the authenticated user
 * @param data - Request data containing api_token
 * @returns Promise with the API response containing array of system notifications
 */
export const fetchSystemNotifications = async (
  data: FetchNotificationsRequest
): Promise<FetchNotificationsResponse> => {
  try {
    const response = await apiClient.post<FetchNotificationsResponse>(
      '/notifications/system',
      {
        api_token: data.api_token,
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Handle axios errors
      if (error.response) {
        // Server responded with error status
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to fetch system notifications',
          error: error.response.data?.error || error.message,
          data: [],
        };
      } else if (error.request) {
        // Request was made but no response received
        throw {
          status: false,
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
          data: [],
        };
      }
    }
    // Handle other errors
    throw {
      status: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
      data: [],
    };
  }
};

/**
 * Mark all notifications as read for the authenticated user
 * @param data - Request data containing api_token
 * @returns Promise with the API response
 */
export const markAllNotificationsAsRead = async (
  data: MarkAllAsReadRequest
): Promise<MarkAllAsReadResponse> => {
  try {
    const response = await apiClient.post<MarkAllAsReadResponse>(
      '/notifications/mark_asaa_read_all',
      {
        api_token: data.api_token,
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Handle axios errors
      if (error.response) {
        // Server responded with error status
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to mark all notifications as read',
          error: error.response.data?.error || error.message,
          updated: 0,
        };
      } else if (error.request) {
        // Request was made but no response received
        throw {
          status: false,
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
          updated: 0,
        };
      }
    }
    // Handle other errors
    throw {
      status: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
      updated: 0,
    };
  }
};

/**
 * Mark a single notification as read for the authenticated user
 * @param data - Request data containing api_token and notification_id
 * @returns Promise with the API response
 */
export const markNotificationAsRead = async (
  data: MarkNotificationAsReadRequest
): Promise<MarkNotificationAsReadResponse> => {
  try {
    const response = await apiClient.post<MarkNotificationAsReadResponse>(
      '/notifications/mark_asaa_read',
      {
        api_token: data.api_token,
        notification_id: data.notification_id,
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Handle axios errors
      if (error.response) {
        // Server responded with error status
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to mark notification as read',
          error: error.response.data?.error || error.message,
          data: undefined,
        };
      } else if (error.request) {
        // Request was made but no response received
        throw {
          status: false,
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
          data: undefined,
        };
      }
    }
    // Handle other errors
    throw {
      status: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
      data: undefined,
    };
  }
};

/**
 * Delete all notifications for the authenticated user
 * @param data - Request data containing api_token
 * @returns Promise with the API response
 */
export const deleteAllNotifications = async (
  data: DeleteAllNotificationsRequest
): Promise<DeleteAllNotificationsResponse> => {
  try {
    const response = await apiClient.post<DeleteAllNotificationsResponse>(
      '/notifications/all_delete',
      {
        api_token: data.api_token,
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Handle axios errors
      if (error.response) {
        // Server responded with error status
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to delete all notifications',
          error: error.response.data?.error || error.message,
          deleted: 0,
        };
      } else if (error.request) {
        // Request was made but no response received
        throw {
          status: false,
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
          deleted: 0,
        };
      }
    }
    // Handle other errors
    throw {
      status: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
      deleted: 0,
    };
  }
};

/**
 * Delete a single notification for the authenticated user
 * @param data - Request data containing api_token and notification_id
 * @returns Promise with the API response
 */
export const deleteNotification = async (
  data: DeleteNotificationRequest
): Promise<DeleteNotificationResponse> => {
  try {
    const response = await apiClient.post<DeleteNotificationResponse>(
      '/notifications/single_delete',
      {
        api_token: data.api_token,
        notification_id: data.notification_id,
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Handle axios errors
      if (error.response) {
        // Server responded with error status
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to delete notification',
          error: error.response.data?.error || error.message,
        };
      } else if (error.request) {
        // Request was made but no response received
        throw {
          status: false,
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    // Handle other errors
    throw {
      status: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
