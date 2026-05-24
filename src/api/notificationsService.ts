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
  if (v === "bookings" || v === "booking") return "bookings";
  if (v === "payments" || v === "payment") return "payments";
  if (v === "reviews" || v === "review") return "reviews";
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
export const fetchUnreadNotifications = async (
  data: FetchNotificationsRequest
): Promise<FetchNotificationsResponse> => {
  try {
    const response = await apiClient.post<FetchNotificationsResponse>(
      '/notifications/unread',
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
    const response = await apiClient.post<FetchNotificationsResponse>(
      '/notifications/bookings',
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
    const response = await apiClient.post<FetchNotificationsResponse>(
      '/notifications/payments',
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
