import axios from 'axios';
import { handleTokenExpired, isTokenExpiredError } from '../lib/auth';
import { resolveApiBaseUrl } from '../lib/apiBaseUrl';

// TypeScript types for registration request
export interface RegisterUserRequest {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  role?: string;
}

// TypeScript types for registration response
export interface RegisterUserResponse {
  success?: boolean;
  status?: boolean | string;
  message?: string;
  data?: {
    id?: string;
    name?: string;
    user_name?: string;
    email?: string;
    token?: string;
    api_token?: string;
    [key: string]: any;
  };
  error?: string;
  token?: string;
  api_token?: string;
}

// Create axios instance with base configuration
// Note: No custom headers - only default Content-Type from axios
const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 10000, // 10 seconds timeout
});

// Add response interceptor to handle token expiration
// Exclude login/register endpoints - 401 on these means wrong credentials, not token expiration
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Get the request URL to check if it's a login/register endpoint
    const requestUrl = error?.config?.url || '';
    const isAuthEndpoint = requestUrl.includes('/login') || 
                          requestUrl.includes('/register') || 
                          requestUrl.includes('/professional/register') ||
                          requestUrl.includes('/send_otp') ||
                          requestUrl.includes('/verify_otp') ||
                          requestUrl.includes('/reset_password');
    
    // Only trigger token expiration redirect for non-auth endpoints
    if (!isAuthEndpoint && isTokenExpiredError(error)) {
      handleTokenExpired();
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

/**
 * Register a new user
 * @param data - User registration data
 * @returns Promise with the API response
 */

export const registerUser = async (
  data: RegisterUserRequest
): Promise<RegisterUserResponse> => {
  try {
    // Send POST request with exact body fields: full_name, email, password, phone, role
    // No custom headers - axios will automatically add Content-Type: application/json
    const requestBody: any = {
      full_name: data.full_name,
      email: data.email,
      password: data.password,
      phone: data.phone
    };
    
    // Only include role if it's provided
    if (data.role) {
      requestBody.role = data.role;
    }
    
    const response = await apiClient.post<RegisterUserResponse>(
      '/user/register',
      requestBody
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Handle axios errors
      if (error.response) {
        // Server responded with error status
        throw {
          success: false,
          message: error.response.data?.message || 'Registration failed',
          error: error.response.data?.error || error.message,
          status: error.response.status,
        };
      } else if (error.request) {
        // Request was made but no response received
        throw {
          success: false,
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    // Handle other errors
    throw {
      success: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export interface RegisterProfessionalRequest {
  business_name: string;
  contact_name: string;
  email: string;
  password: string;
  phone: string;
  company_reg_number?: string;
  service_id: number;
}

export interface RegisterProfessionalResponse {
  success?: boolean;
  status?: boolean | string;
  message?: string;
  data?: {
    api_token?: string;
    token?: string;
    full_name?: string;
    name?: string;
    user_name?: string;
    phone?: string;
    role?: string;
    professional?: { id?: number };
    professional_id?: number;
    [key: string]: unknown;
  };
  error?: string;
  token?: string;
  api_token?: string;
}

/**
 * Register a new professional account
 * POST /professional/register
 */
export const registerProfessional = async (
  data: RegisterProfessionalRequest
): Promise<RegisterProfessionalResponse> => {
  try {
    const body: RegisterProfessionalRequest = {
      business_name: data.business_name.trim(),
      contact_name: data.contact_name.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
      phone: data.phone.trim(),
      service_id: data.service_id,
    };
    if (data.company_reg_number?.trim()) {
      body.company_reg_number = data.company_reg_number.trim();
    }

    const response = await apiClient.post<RegisterProfessionalResponse>(
      '/professional/register',
      body
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Professional registration failed',
          error: error.response.data?.error || error.message,
          status: error.response.status,
        };
      }
      if (error.request) {
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

// TypeScript types for login request
export interface LoginUserRequest {
  email: string;
  password: string;
}

// TypeScript types for login response
export interface LoginUserResponse {
  success?: boolean;
  status?: boolean | string;
  message?: string;
  data?: {
    id?: string;
    name?: string;
    user_name?: string;
    email?: string;
    token?: string;
    api_token?: string;
    [key: string]: any;
  };
  error?: string;
  token?: string;
  api_token?: string;
}

/**
 * Login a user
 * @param data - User login data (email and password)
 * @returns Promise with the API response
 */
export const loginUser = async (
  data: LoginUserRequest
): Promise<LoginUserResponse> => {
  try {
    // Send POST request with exact body fields: email, password
    // No custom headers - axios will automatically add Content-Type: application/json
    const response = await apiClient.post<LoginUserResponse>(
      '/user/login',
      {
        email: data.email,
        password: data.password
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Handle axios errors
      if (error.response) {
        // Server responded with error status
        throw {
          success: false,
          status: false,
          message: error.response.data?.message || 'Login failed',
          error: error.response.data?.error || error.message,
          statusCode: error.response.status,
        };
      } else if (error.request) {
        // Request was made but no response received
        throw {
          success: false,
          status: false,
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    // Handle other errors
    throw {
      success: false,
      status: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// TypeScript types for customer notifications
export interface CustomerNotificationItem {
  id: number;
  title: string;
  message: string;
  created_at: string;
  type?: string;
  read?: boolean;
  is_read?: number | boolean;
  [key: string]: unknown;
}

export interface GetCustomerNotificationsRequest {
  api_token: string;
}

export interface GetCustomerNotificationsResponse {
  status: boolean;
  message: string;
  data: CustomerNotificationItem[];
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return x != null && typeof x === "object" && !Array.isArray(x);
}

/** Pull a notifications array from common API envelope shapes. */
export function extractCustomerNotificationsArray(payload: unknown): unknown[] {
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

function normalizeCustomerNotificationRow(row: unknown): CustomerNotificationItem | null {
  if (!isRecord(row)) return null;
  const idRaw = row.id ?? row.notification_id;
  let id = typeof idRaw === "number" && Number.isFinite(idRaw) ? idRaw : parseInt(String(idRaw ?? ""), 10);
  if (!Number.isFinite(id) || id <= 0) {
    id = 0;
  }
  const title = strField(row, "title", "subject", "heading", "name", "type");
  const message = strField(row, "message", "body", "description", "content", "text", "details");
  const created_at = strField(row, "created_at", "updated_at", "date", "sent_at", "createdAt");
  const read =
    row.read === true ||
    row.read === 1 ||
    row.is_read === true ||
    row.is_read === 1 ||
    row.is_read === "1";
  return {
    ...row,
    id,
    title: title || "Notification",
    message,
    created_at,
    read: Boolean(read),
    is_read: row.is_read as number | boolean | undefined,
  } as CustomerNotificationItem;
}

/** Stable key for seen-state + React lists when `id` is missing or duplicated. */
export function getCustomerNotificationDedupeKey(item: CustomerNotificationItem, _index?: number): string {
  const id = typeof item.id === "number" ? item.id : parseInt(String(item.id), 10);
  if (Number.isFinite(id) && id > 0) {
    return `id:${id}`;
  }
  const stamp = item.created_at || "";
  const head = `${item.title || ""}|${(item.message || "").slice(0, 120)}`;
  return `h:${stamp}|${head}`;
}

function parseCustomerNotificationsPayload(payload: unknown): CustomerNotificationItem[] {
  const raw = extractCustomerNotificationsArray(payload);
  const out: CustomerNotificationItem[] = [];
  raw.forEach((row) => {
    const n = normalizeCustomerNotificationRow(row);
    if (n) out.push(n);
  });
  return out;
}

function messageFromPayload(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback;
  const m = payload.message;
  return typeof m === "string" && m.trim() ? m : fallback;
}

/**
 * Customer notification feed — POST /notifications with `{ api_token }`.
 * Tolerates `{ data: Notification[] }` or Laravel `{ data: { data: [] } }`.
 */
export const getCustomerNotifications = async (
  data: GetCustomerNotificationsRequest
): Promise<GetCustomerNotificationsResponse> => {
  try {
    const response = await apiClient.post<unknown>("/notifications", {
      api_token: data.api_token,
    });
    const body = response.data;
    const list = parseCustomerNotificationsPayload(body);
    return {
      status: true,
      message: messageFromPayload(body, "OK"),
      data: list,
    };
  } catch (error) {
    console.error("Error fetching customer notifications:", error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || "Failed to fetch notifications",
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

/** Admin → customer messages — POST /contact-customer/get with `{ api_token }`. */
export interface CustomerAdminContactMessageItem {
  id: number;
  message: string;
  created_at: string;
  title?: string;
  [key: string]: unknown;
}

export interface GetCustomerContactMessagesRequest {
  api_token: string;
}

export interface GetCustomerContactMessagesResponse {
  status: boolean;
  message: string;
  data: CustomerAdminContactMessageItem[];
}

function extractCustomerContactMessagesArray(payload: unknown): unknown[] {
  if (payload == null) return [];
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];
  const data = payload.data;
  if (Array.isArray(data)) return data;
  if (isRecord(data) && Array.isArray(data.data)) return data.data;
  if (Array.isArray(payload.messages)) return payload.messages;
  if (isRecord(data) && typeof data.message === "string") {
    return [data];
  }
  return [];
}

function normalizeCustomerAdminContactMessageRow(row: unknown): CustomerAdminContactMessageItem | null {
  if (!isRecord(row)) return null;
  const idRaw = row.id ?? row.message_id;
  let id = typeof idRaw === "number" && Number.isFinite(idRaw) ? idRaw : parseInt(String(idRaw ?? ""), 10);
  if (!Number.isFinite(id) || id <= 0) {
    id = 0;
  }
  const message = strField(row, "message", "body", "content", "text", "note", "admin_message");
  const title = strField(row, "title", "subject", "heading") || "Admin message";
  const created_at = strField(row, "created_at", "updated_at", "date", "sent_at", "createdAt");
  return {
    ...row,
    id,
    title,
    message,
    created_at,
  } as CustomerAdminContactMessageItem;
}

function parseCustomerContactMessagesPayload(payload: unknown): CustomerAdminContactMessageItem[] {
  const raw = extractCustomerContactMessagesArray(payload);
  const out: CustomerAdminContactMessageItem[] = [];
  raw.forEach((row) => {
    const n = normalizeCustomerAdminContactMessageRow(row);
    if (n && (n.message.trim() !== "" || n.id > 0)) {
      out.push(n);
    }
  });
  return out;
}

/**
 * Customer inbox for messages sent by admin — POST /contact-customer/get.
 */
export const getCustomerContactAdminMessages = async (
  data: GetCustomerContactMessagesRequest
): Promise<GetCustomerContactMessagesResponse> => {
  try {
    const response = await apiClient.post<unknown>("/contact-customer/get", {
      api_token: data.api_token,
    });
    const body = response.data;
    const list = parseCustomerContactMessagesPayload(body);
    return {
      status: true,
      message: messageFromPayload(body, "OK"),
      data: list,
    };
  } catch (error) {
    console.error("Error fetching admin messages:", error);
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

// TypeScript types for delete account
export interface DeleteAccountRequest {
  api_token: string;
}

export interface DeleteAccountResponse {
  status: boolean;
  message: string;
}

/**
 * Delete customer account
 * BaseURL: https://fireguide.attoexasolutions.com/api/user_dashboard/delete-account
 * Method: POST
 * @param data - API token
 * @returns Promise with the API response
 */
export const deleteAccount = async (
  data: DeleteAccountRequest
): Promise<DeleteAccountResponse> => {
  try {
    const response = await apiClient.post<DeleteAccountResponse>(
      '/user_dashboard/delete-account',
      {
        api_token: data.api_token,
      }
    );
    console.log('POST /user_dashboard/delete-account - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error deleting account:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to delete account',
          error: error.response.data?.error || 'Unknown error',
        };
      } else if (error.request) {
        throw {
          status: false,
          message: 'Network error. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    throw {
      status: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// TypeScript types for recent activity
export interface RecentActivityItem {
  title: string;
  service_name: string;
  date: string;
  amount?: string;
}

export interface GetRecentActivityRequest {
  api_token: string;
}

export interface GetRecentActivityResponse {
  status: string;
  data: RecentActivityItem[];
}

/**
 * Get customer recent activity
 * BaseURL: https://fireguide.attoexasolutions.com/api/user_dashboard/recent-activity
 * Method: POST
 * @param data - API token
 * @returns Promise with the API response
 */
export const getRecentActivity = async (
  data: GetRecentActivityRequest
): Promise<GetRecentActivityResponse> => {
  try {
    const response = await apiClient.post<GetRecentActivityResponse>(
      '/user_dashboard/recent-activity',
      {
        api_token: data.api_token,
      }
    );
    console.log('POST /user_dashboard/recent-activity - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          status: 'error',
          message: error.response.data?.message || 'Failed to fetch recent activity',
          error: error.response.data?.error || 'Unknown error',
        };
      } else if (error.request) {
        throw {
          status: 'error',
          message: 'Network error. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    throw {
      status: 'error',
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// TypeScript types for notification preferences
export interface NotificationPreferencesData {
  id: number;
  is_booking_confirmation: number | boolean;
  is_service_reminders: number | boolean;
  report_uploads: number | boolean;
  marketing_emails: number | boolean;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface EnableNotificationRequest {
  api_token: string;
  column: 'is_booking_confirmation' | 'is_service_reminders' | 'report_uploads' | 'marketing_emails';
}

export interface EnableNotificationResponse {
  success: boolean;
  message: string;
  data: NotificationPreferencesData;
}

/**
 * Enable notification preference
 * BaseURL: https://fireguide.attoexasolutions.com/api/user_dashboard/enable-notifications
 * Method: POST
 * @param data - API token and column name
 * @returns Promise with the API response
 */
export const enableNotification = async (
  data: EnableNotificationRequest
): Promise<EnableNotificationResponse> => {
  try {
    const response = await apiClient.post<EnableNotificationResponse>(
      '/user_dashboard/enable-notifications',
      {
        api_token: data.api_token,
        column: data.column,
      }
    );
    console.log('POST /user_dashboard/enable-notifications - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error enabling notification:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to enable notification preference',
          error: error.response.data?.error || 'Unknown error',
        };
      } else if (error.request) {
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

export interface DisableNotificationRequest {
  api_token: string;
  column: 'is_booking_confirmation' | 'is_service_reminders' | 'report_uploads' | 'marketing_emails';
}

export interface DisableNotificationResponse {
  success: boolean;
  message: string;
  data: NotificationPreferencesData;
}

/**
 * Disable notification preference
 * BaseURL: https://fireguide.attoexasolutions.com/api/user_dashboard/disable-notifications
 * Method: POST
 * @param data - API token and column name
 * @returns Promise with the API response
 */
export const disableNotification = async (
  data: DisableNotificationRequest
): Promise<DisableNotificationResponse> => {
  try {
    const response = await apiClient.post<DisableNotificationResponse>(
      '/user_dashboard/disable-notifications',
      {
        api_token: data.api_token,
        column: data.column,
      }
    );
    console.log('POST /user_dashboard/disable-notifications - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error disabling notification:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to disable notification preference',
          error: error.response.data?.error || 'Unknown error',
        };
      } else if (error.request) {
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

export interface GetNotificationPreferencesRequest {
  api_token: string;
}

export interface GetNotificationPreferencesResponse {
  success: boolean;
  data: {
    is_booking_confirmation: boolean;
    is_service_reminders: boolean;
    report_uploads: boolean;
    marketing_emails: boolean;
  };
}

/**
 * Get notification preferences
 * BaseURL: https://fireguide.attoexasolutions.com/api/user_dashboard/get_all_notification
 * Method: POST
 * @param data - API token
 * @returns Promise with the API response
 */
export const getNotificationPreferences = async (
  data: GetNotificationPreferencesRequest
): Promise<GetNotificationPreferencesResponse> => {
  try {
    const response = await apiClient.post<GetNotificationPreferencesResponse>(
      '/user_dashboard/get_all_notification',
      {
        api_token: data.api_token,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('POST /user_dashboard/get_all_notification - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    if (axios.isAxiosError(error)) {
      // Check for CORS or network errors
      if (error.code === 'ERR_NETWORK' || error.message.includes('CORS') || error.message.includes('Network Error')) {
        console.warn('Network/CORS error when fetching notification preferences. This may be a server configuration issue.');
        // Return a default response structure instead of throwing
        // This allows the UI to continue functioning
        return {
          success: false,
          data: {
            is_booking_confirmation: false,
            is_service_reminders: false,
            report_uploads: false,
            marketing_emails: false,
          },
        };
      }
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to fetch notification preferences',
          error: error.response.data?.error || 'Unknown error',
        };
      } else if (error.request) {
        // Network error - return default instead of throwing
        console.warn('Network request failed. Returning default notification preferences.');
        return {
          success: false,
          data: {
            is_booking_confirmation: false,
            is_service_reminders: false,
            report_uploads: false,
            marketing_emails: false,
          },
        };
      }
    }
    // For any other error, return default structure
    return {
      success: false,
      data: {
        is_booking_confirmation: false,
        is_service_reminders: false,
        report_uploads: false,
        marketing_emails: false,
      },
    };
  }
};

// TypeScript types for send OTP request
export interface SendOtpRequest {
  email: string;
}

// TypeScript types for send OTP response
export interface SendOtpResponse {
  success?: boolean;
  status?: boolean | string;
  message?: string;
  data?: {
    [key: string]: any;
  };
  error?: string;
}

/**
 * Send OTP to user's email
 * @param data - Email address to send OTP to
 * @returns Promise with the API response
 */
export const sendOtp = async (
  data: SendOtpRequest
): Promise<SendOtpResponse> => {
  try {
    // Send POST request with email in body
    // No custom headers - axios will automatically add Content-Type: application/json
    const response = await apiClient.post<SendOtpResponse>(
      '/user/send-otp',
      {
        email: data.email
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Handle axios errors
      if (error.response) {
        // Server responded with error status
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to send OTP',
          error: error.response.data?.error || error.message,
          status: error.response.status,
        };
      } else if (error.request) {
        // Request was made but no response received
        throw {
          success: false,
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    // Handle other errors
    throw {
      success: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// TypeScript types for verify OTP request
export interface VerifyOtpRequest {
  email: string;
  otp: string | number;
}

// TypeScript types for verify OTP response
export interface VerifyOtpResponse {
  success?: boolean;
  status?: boolean | string;
  message?: string;
  data?: {
    [key: string]: any;
  };
  error?: string;
}

/**
 * Verify OTP sent to user's email
 * @param data - Email and OTP to verify
 * @returns Promise with the API response
 */
export const verifyOtp = async (
  data: VerifyOtpRequest
): Promise<VerifyOtpResponse> => {
  try {
    // Send POST request with email and otp in body
    // No custom headers - axios will automatically add Content-Type: application/json
    const response = await apiClient.post<VerifyOtpResponse>(
      '/user/verify-otp',
      {
        email: data.email,
        otp: typeof data.otp === 'string' ? parseInt(data.otp, 10) : data.otp
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Handle axios errors
      if (error.response) {
        // Server responded with error status
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to verify OTP',
          error: error.response.data?.error || error.message,
          status: error.response.status,
        };
      } else if (error.request) {
        // Request was made but no response received
        throw {
          success: false,
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    // Handle other errors
    throw {
      success: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// TypeScript types for reset password request
export interface ResetPasswordRequest {
  email: string;
  password: string;
  password_confirmation: string;
}

// TypeScript types for reset password response
export interface ResetPasswordResponse {
  success?: boolean;
  status?: boolean | string;
  message?: string;
  data?: {
    [key: string]: any;
  };
  error?: string;
}

/**
 * Reset user password after OTP verification
 * @param data - Email, new password, and password confirmation
 * @returns Promise with the API response
 */
export const resetPassword = async (
  data: ResetPasswordRequest
): Promise<ResetPasswordResponse> => {
  try {
    // Send POST request with email, password, and password_confirmation in body
    // No custom headers - axios will automatically add Content-Type: application/json
    const response = await apiClient.post<ResetPasswordResponse>(
      '/user/reset-password',
      {
        email: data.email,
        password: data.password,
        password_confirmation: data.password_confirmation
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Handle axios errors
      if (error.response) {
        // Server responded with error status
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to reset password',
          error: error.response.data?.error || error.message,
          status: error.response.status,
        };
      } else if (error.request) {
        // Request was made but no response received
        throw {
          success: false,
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    // Handle other errors
    throw {
      success: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// TypeScript types for update user request
export interface UpdateUserRequest {
  api_token: string;
  full_name: string;
  phone: string;
}

// TypeScript types for update user response
export interface UpdateUserResponse {
  success?: boolean;
  status?: boolean | string;
  message?: string;
  data?: {
    id?: string;
    full_name?: string;
    email?: string;
    phone?: string;
    [key: string]: any;
  };
  error?: string;
}

/**
 * Update user information
 * @param data - API token, full name, and phone number
 * @returns Promise with the API response
 */
export const updateUser = async (
  data: UpdateUserRequest
): Promise<UpdateUserResponse> => {
  try {
    // Send POST request with api_token, full_name, and phone in body
    // No custom headers - axios will automatically add Content-Type: application/json
    const response = await apiClient.post<UpdateUserResponse>(
      '/user/update',
      {
        api_token: data.api_token,
        full_name: data.full_name,
        phone: data.phone
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Handle axios errors
      if (error.response) {
        // Server responded with error status
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to update user',
          error: error.response.data?.error || error.message,
          status: error.response.status,
        };
      } else if (error.request) {
        // Request was made but no response received
        throw {
          success: false,
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    // Handle other errors
    throw {
      success: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// TypeScript types for change password request
export interface ChangePasswordRequest {
  api_token: string;
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}

// TypeScript types for change password response
export interface ChangePasswordResponse {
  status: boolean;
  message: string;
  error?: string;
}

/**
 * Change user password
 * BaseURL: https://fireguide.attoexasolutions.com/api/user/change_password
 * Method: POST
 * @param data - API token, current password, new password, and confirmation
 * @returns Promise with the API response
 */
export const changePassword = async (
  data: ChangePasswordRequest
): Promise<ChangePasswordResponse> => {
  try {
    const response = await apiClient.post<ChangePasswordResponse>(
      '/user/change_password',
      {
        api_token: data.api_token,
        current_password: data.current_password,
        new_password: data.new_password,
        new_password_confirmation: data.new_password_confirmation,
      }
    );
    console.log('POST /user/change_password - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error changing password:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to change password',
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

// TypeScript types for upload profile image request
export interface UploadProfileImageRequest {
  api_token: string;
  file: File;
}

// TypeScript types for upload profile image response
export interface UploadProfileImageResponse {
  status?: boolean;
  message?: string;
  image_url?: string;
  error?: string;
}

/**
 * Upload profile image
 * BaseURL: https://fireguide.attoexasolutions.com/api/user/upload_profile_image
 * Method: POST
 * Body: form-data with 'file' (File) and 'api_token' (Text)
 * @param data - API token and image file
 * @returns Promise with the API response containing status, message, and image_url
 */
export const uploadProfileImage = async (
  data: UploadProfileImageRequest
): Promise<UploadProfileImageResponse> => {
  try {
    console.log('POST /user/upload_profile_image - Uploading profile image...');
    
    // Create FormData for multipart/form-data request
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('api_token', data.api_token);

    // Send POST request with FormData
    // Note: Do NOT manually set Content-Type header - axios will automatically set it
    // with the correct boundary parameter for multipart/form-data
    const response = await apiClient.post<UploadProfileImageResponse>(
      '/user/upload_profile_image',
      formData
    );
    
    console.log('POST /user/upload_profile_image - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error uploading profile image:', error);
    if (axios.isAxiosError(error)) {
      // Handle axios errors
      if (error.response) {
        // Server responded with error status
        const errorData = error.response.data as any;
        throw {
          status: false,
          message: errorData?.message || 'Failed to upload profile image',
          error: errorData?.error || error.message,
          statusCode: error.response.status,
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

// TypeScript types for Customer Dashboard Overview Summary
export interface CustomerDashboardSummaryData {
  month: string;
  jobs: {
    upcoming: number;
    completed: number;
  };
  spending: {
    total_spent: string;
  };
}

export interface CustomerDashboardSummaryResponse {
  status: string;
  data?: CustomerDashboardSummaryData;
  message?: string;
  error?: string;
}

/**
 * Get customer dashboard overview summary
 * BaseURL: https://fireguide.attoexasolutions.com/api/user_dashboard/overview_summary
 * Method: POST
 * @param apiToken - The API token for authentication
 * @returns Promise with the dashboard summary data
 */
export const getCustomerDashboardSummary = async (
  apiToken: string
): Promise<CustomerDashboardSummaryResponse> => {
  try {
    console.log('POST /user_dashboard/overview_summary - Fetching customer dashboard summary...');
    
    const response = await apiClient.post<CustomerDashboardSummaryResponse>(
      '/user_dashboard/overview_summary',
      {
        api_token: apiToken
      }
    );
    
    console.log('POST /user_dashboard/overview_summary - Response:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('Error fetching customer dashboard summary:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          status: 'error',
          message: error.response.data?.message || 'Failed to fetch dashboard summary',
          error: error.response.data?.error || error.message,
          statusCode: error.response.status,
        };
      } else if (error.request) {
        throw {
          status: 'error',
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    throw {
      status: 'error',
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// TypeScript types for Customer Upcoming Bookings
export interface CustomerUpcomingBookingItem {
  id: number;
  selected_date: string;
  selected_time: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  price: string;
  property_address: string;
  longitude: string;
  latitude: string;
  city: string;
  reason: string | null;
  post_code: string;
  ref_code: string;
  additional_notes: string;
  status: string;
  created_at: string;
  updated_at: string;
  professional: {
    id: number;
    full_name?: string;
    name?: string;
  };
  service?: {
    id: number;
    service_name: string;
    price: string;
  } | null;
  user: {
    id: number;
    full_name?: string | null;
    name?: string | null;
  };
  created_by: {
    id: number;
    full_name?: string | null;
    name?: string | null;
  };
  updated_by: {
    id: number;
    full_name?: string | null;
    name?: string | null;
  } | null;
}

export interface CustomerUpcomingBookingsResponse {
  status: string;
  data?: {
    total: number;
    bookings: CustomerUpcomingBookingItem[];
  };
  message?: string;
  error?: string;
}

/**
 * Get customer upcoming bookings
 * BaseURL: https://fireguide.attoexasolutions.com/api/user_dashboard/upcomming_booking
 * Method: POST
 * @param apiToken - The API token for authentication
 * @returns Promise with the upcoming bookings data
 */
export const getCustomerUpcomingBookings = async (
  apiToken: string
): Promise<CustomerUpcomingBookingsResponse> => {
  try {
    console.log('POST /user_dashboard/upcomming_booking - Fetching customer upcoming bookings...');
    
    const response = await apiClient.post<CustomerUpcomingBookingsResponse>(
      '/user_dashboard/upcomming_booking',
      {
        api_token: apiToken
      }
    );
    
    console.log('POST /user_dashboard/upcomming_booking - Response:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('Error fetching customer upcoming bookings:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          status: 'error',
          message: error.response.data?.message || 'Failed to fetch upcoming bookings',
          error: error.response.data?.error || error.message,
          statusCode: error.response.status,
        };
      } else if (error.request) {
        throw {
          status: 'error',
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    throw {
      status: 'error',
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// TypeScript types for Customer All Bookings
export interface CustomerAllBookingItem {
  id: number;
  selected_date: string;
  selected_time: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  price: string | number;
  property_address: string;
  longitude: string;
  latitude: string;
  city: string;
  reason: string | null;
  post_code: string;
  ref_code: string;
  additional_notes: string;
  status: string;
  /** When true (or 1 / "1"), customer has paid — hide Pay / Cancel. */
  is_paid?: boolean | number | string | null;
  /** Some payloads use payment_status instead of is_paid. */
  payment_status?: string | null;
  /** Same shape as customer payments list — primary paid signal on some payloads. */
  payment?: {
    status?: string | null;
    is_paid?: boolean | number | string | null;
    payment_status?: string | null;
    price?: string | number | null;
  } | null;
  has_review?: boolean | number | string | null;
  is_reviewed?: boolean | number | string | null;
  review_id?: number | string | null;
  review?: { id?: number } | null;
  created_at: string;
  updated_at: string;
  professional: {
    id: number;
    full_name?: string;
    name?: string;
    /** When API nests professional contact on the professional object */
    email?: string | null;
    phone?: string | null;
    mobile?: string | null;
    /** Some payloads use `number` for the professional phone (e.g. all_booking). */
    number?: string | number | null;
  };
  /** Some payloads expose professional contact at booking root (not the customer's email/phone). */
  professional_email?: string | null;
  professional_phone?: string | null;
  service?: {
    id: number;
    service_name: string;
    price: string;
  } | null;
  /** Questionnaire selections stored at booking time (e.g. alarm detector counts). */
  selected_service?: {
    type?: string;
    data?: Record<string, { id?: number; value?: string } | string | number | null>;
  } | null;
  user: {
    id: number;
    full_name?: string | null;
    name?: string | null;
  };
  created_by: {
    id: number;
    full_name?: string | null;
    name?: string | null;
  };
  updated_by: {
    id: number;
    full_name?: string | null;
    name?: string | null;
  } | null;
}

export interface CustomerAllBookingsResponse {
  status: string;
  data?: {
    total: number;
    bookings: CustomerAllBookingItem[];
  };
  message?: string;
  error?: string;
}

/**
 * Get all customer bookings
 * BaseURL: https://fireguide.attoexasolutions.com/api/user_dashboard/all_booking
 * Method: POST
 * @param apiToken - The API token for authentication
 * @returns Promise with all bookings data
 */
export const getCustomerAllBookings = async (
  apiToken: string
): Promise<CustomerAllBookingsResponse> => {
  try {
    console.log('POST /user_dashboard/all_booking - Fetching all customer bookings...');
    
    const response = await apiClient.post<CustomerAllBookingsResponse>(
      '/user_dashboard/all_booking',
      {
        api_token: apiToken
      }
    );
    
    console.log('POST /user_dashboard/all_booking - Response:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('Error fetching customer all bookings:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          status: 'error',
          message: error.response.data?.message || 'Failed to fetch bookings',
          error: error.response.data?.error || error.message,
          statusCode: error.response.status,
        };
      } else if (error.request) {
        throw {
          status: 'error',
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    throw {
      status: 'error',
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Cancel booking response interface
export interface CancelBookingResponse {
  status: string;
  message?: string;
  error?: string;
}

// Cancel a customer booking
export const cancelCustomerBooking = async (
  apiToken: string,
  bookingId: number
): Promise<CancelBookingResponse> => {
  try {
    const response = await apiClient.post<CancelBookingResponse>('/user_dashboard/cancel_booking', {
      api_token: apiToken,
      booking_id: bookingId,
    });
    return response.data;
  } catch (error: any) {
    console.error('Error cancelling booking:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          status: 'error',
          message: error.response.data?.message || 'Failed to cancel booking',
          error: error.response.data?.error || error.message,
          statusCode: error.response.status,
        };
      } else if (error.request) {
        throw {
          status: 'error',
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    throw {
      status: 'error',
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Reschedule booking response interface
export interface RescheduleBookingResponse {
  status: string;
  message?: string;
  error?: string;
  data?: {
    id: number;
    selected_date: string;
    selected_time: string;
    [key: string]: any;
  };
}

// Reschedule a customer booking
export const rescheduleCustomerBooking = async (
  apiToken: string,
  bookingId: number,
  selectedDate: string,
  selectedTime: string,
  reason?: string
): Promise<RescheduleBookingResponse> => {
  try {
    const response = await apiClient.post<RescheduleBookingResponse>('/professional_booking/update', {
      api_token: apiToken,
      id: bookingId,
      selected_date: selectedDate,
      selected_time: selectedTime,
      reason: reason || 'Rescheduled by customer',
    });
    return response.data;
  } catch (error: any) {
    console.error('Error rescheduling booking:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          status: 'error',
          message: error.response.data?.message || 'Failed to reschedule booking',
          error: error.response.data?.error || error.message,
          statusCode: error.response.status,
        };
      } else if (error.request) {
        throw {
          status: 'error',
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    throw {
      status: 'error',
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Customer payment item interface
export interface CustomerPaymentItem {
  booking_id: number;
  selected_date: string;
  selected_time: string;
  professional: {
    id: number;
    name: string;
  };
  service: {
    id: number;
    /** Present on some API responses */
    service_name?: string;
    /** Alternate field from `get_payments` */
    name?: string;
    price?: string | number;
  };
  /** When `null`, no payment record exists yet — UI treats as unpaid. */
  payment: {
    status: string;
    price?: string | number;
  } | null;
}

// Customer payments response interface
export interface CustomerPaymentsResponse {
  status: string;
  data?: {
    total: number;
    items: CustomerPaymentItem[];
  };
  message?: string;
  error?: string;
}

// Customer invoice item interface
export interface CustomerInvoiceItem {
  id: number;
  booking_id: number;
  invoice_number: string;
  total_amount: string;
  created_at: string;
  booking: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}

// Customer invoices response interface
export interface CustomerInvoicesResponse {
  success: boolean;
  total_invoices: number;
  data: CustomerInvoiceItem[];
  message?: string;
  error?: string;
}

// Get all customer invoices
export const getCustomerInvoices = async (apiToken: string): Promise<CustomerInvoicesResponse> => {
  try {
    const response = await apiClient.post<CustomerInvoicesResponse>(
      '/invoice/user_all_get',
      { api_token: apiToken }
    );
    return response.data;
  } catch (error: any) {
    console.error('Error fetching customer invoices:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          total_invoices: 0,
          data: [],
          message: error.response.data?.message || 'Failed to fetch invoices',
          error: error.response.data?.error || error.message,
        };
      } else if (error.request) {
        throw {
          success: false,
          total_invoices: 0,
          data: [],
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    throw {
      success: false,
      total_invoices: 0,
      data: [],
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Get customer payments
export const getCustomerPayments = async (apiToken: string): Promise<CustomerPaymentsResponse> => {
  try {
    const response = await apiClient.post<CustomerPaymentsResponse>(
      '/user_dashboard/get_payments',
      { api_token: apiToken }
    );
    return response.data;
  } catch (error: any) {
    console.error('Error fetching customer payments:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          status: 'error',
          message: error.response.data?.message || 'Failed to fetch payments',
          error: error.response.data?.error || error.message,
          statusCode: error.response.status,
        };
      } else if (error.request) {
        throw {
          status: 'error',
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    throw {
      status: 'error',
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Payments Summary Response Interface
export interface PaymentsSummaryResponse {
  status: string;
  data: {
    paid_count: number;
    paid_total: number;
  };
  message?: string;
  error?: string;
}

/**
 * Get payments summary for customer dashboard
 * BaseURL: https://fireguide.attoexasolutions.com/api/user_dashboard/payments_summary
 * Method: POST
 * @param apiToken - The API token for authentication
 * @returns Promise with the API response containing payments summary
 */
export const getPaymentsSummary = async (apiToken: string): Promise<PaymentsSummaryResponse> => {
  try {
    console.log('POST /user_dashboard/payments_summary - Fetching payments summary...');
    
    const response = await apiClient.post<PaymentsSummaryResponse>(
      '/user_dashboard/payments_summary',
      { api_token: apiToken }
    );
    
    console.log('POST /user_dashboard/payments_summary - Response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching payments summary:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          status: 'error',
          message: error.response.data?.message || 'Failed to fetch payments summary',
          error: error.response.data?.error || error.message,
          statusCode: error.response.status,
        };
      } else if (error.request) {
        throw {
          status: 'error',
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    throw {
      status: 'error',
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Customer Data Response Interface
export interface CustomerDataResponse {
  status: boolean;
  data: {
    id: number;
    full_name: string;
    email: string;
    phone: string;
    image: string | null;
    property_type: {
      id: number;
      name: string | null;
    };
  };
  message?: string;
  error?: string;
}

/**
 * Get customer data for profile
 * BaseURL: https://fireguide.attoexasolutions.com/api/user_dashboard/get_customer_data
 * Method: POST
 * @param apiToken - The API token for authentication
 * @returns Promise with the API response containing customer data
 */
export const getCustomerData = async (apiToken: string): Promise<CustomerDataResponse> => {
  try {
    console.log('POST /user_dashboard/get_customer_data - Fetching customer data...');
    
    const response = await apiClient.post<CustomerDataResponse>(
      '/user_dashboard/get_customer_data',
      { api_token: apiToken }
    );
    
    console.log('POST /user_dashboard/get_customer_data - Response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching customer data:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to fetch customer data',
          error: error.response.data?.error || error.message,
          statusCode: error.response.status,
        };
      } else if (error.request) {
        throw {
          status: false,
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    throw {
      status: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Update Customer Data Request Interface
export interface UpdateCustomerDataRequest {
  api_token: string;
  full_name: string;
  email: string;
  phone: string;
  property_type_id: number;
}

// Update Customer Data Response Interface
export interface UpdateCustomerDataResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    full_name: string;
    email: string;
    phone: string;
    property_type_id: number;
  };
  error?: string;
}

/**
 * Update customer data
 * BaseURL: https://fireguide.attoexasolutions.com/api/user_dashboard/update_customer_data
 * Method: POST
 * @param data - API token and customer data to update
 * @returns Promise with the API response containing updated customer data
 */
export const updateCustomerData = async (data: UpdateCustomerDataRequest): Promise<UpdateCustomerDataResponse> => {
  try {
    console.log('POST /user_dashboard/update_customer_data - Updating customer data...');
    
    const response = await apiClient.post<UpdateCustomerDataResponse>(
      '/user_dashboard/update_customer_data',
      data
    );
    
    console.log('POST /user_dashboard/update_customer_data - Response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Error updating customer data:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to update customer data',
          error: error.response.data?.error || error.message,
          statusCode: error.response.status,
        };
      } else if (error.request) {
        throw {
          status: false,
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    throw {
      status: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
