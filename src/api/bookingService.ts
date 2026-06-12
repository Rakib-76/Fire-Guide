/// <reference types="vite/client" />
import axios from 'axios';
import { resolveApiBaseUrl } from '../lib/apiBaseUrl';
import { getApiToken, handleTokenExpired, isTokenExpiredError } from '../lib/auth';
import {
  getBookingPaymentStatusKey,
  getBookingPaymentStatusLabel,
  isBookingPaymentPaid,
} from '../lib/bookingPaymentStatus';

// TypeScript types for Professional Booking Store request
// POST /professional_booking/store — service_id and professional_id from Book response; date/time and form fields from Select Your Appointment.
export interface ProfessionalBookingStoreRequest {
  api_token?: string;
  /** Service being booked (from response when Book was clicked). */
  service_id: number;
  selected_date: string; // YYYY-MM-DD
  /** e.g. "9:00 AM", "2:00 PM" — include AM/PM; backend parsers often require a meridian. */
  selected_time: string;
  /** Session ID from selected_services/store (or service-specific create) when user clicked Book. */
  session_id?: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  property_address: string;
  longitude: number;
  latitude: number;
  city: string;
  post_code: string;
  additional_notes?: string;
  professional_id: number;
  /** Total price (service + platform fee) — same as Booking Summary total. */
  price?: string | number;
  /** When present, backend links this booking to an existing custom quote request. */
  custom_quote_request_id?: number;
  /** Alternate name some backends use for the same link. */
  custom_quote_id?: number;
}

export interface ProfessionalBookingStoreResponse {
  status: string;
  message: string;
  data?: any;
}

export interface CalculatePriceForBookingResponse {
  status: boolean;
  message: string;
  data?: {
    professional_id: number;
    service_id: number;
    service_price: number;
    platform_fee_percent: string;
    platform_fee_amount: number;
    total_price: number;
  };
}

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout for booking submission
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
 * Store professional booking
 * @param data - Professional booking data
 * @returns Promise with the API response
 */
export const storeProfessionalBooking = async (
  data: ProfessionalBookingStoreRequest
): Promise<ProfessionalBookingStoreResponse> => {
  try {
    const payload = { ...data };
    const isNormalPrice = payload.price !== "0" && payload.price !== 0;
    if (isNormalPrice) {
      delete (payload as Record<string, unknown>).custom_quote_request_id;
      delete (payload as Record<string, unknown>).custom_quote_id;
    }
    const response = await apiClient.post<ProfessionalBookingStoreResponse>(
      '/professional_booking/store',
      payload
    );
    return response.data;
  } catch (error) {
    console.error('Error storing professional booking:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to submit booking',
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
 * Request body for calculate price for booking
 * POST /calculate-price/for-booking
 */
export interface CalculatePriceForBookingRequest {
  professional_id: number;
  /** From selected_services/store response (number or string depending on API) */
  session_id: number | string;
  service_id: number;
}

/**
 * Calculate price for booking (service + platform fee)
 * POST /calculate-price/for-booking
 * Body: { professional_id, session_id, service_id }
 * - professional_id: from selected professional
 * - session_id: from selected_services/store response (auto-generated)
 * - service_id: from flow when user selects service / clicks book
 */
export const calculatePriceForBooking = async (
  data: CalculatePriceForBookingRequest
): Promise<CalculatePriceForBookingResponse> => {
  try {
    const body: Record<string, number | string> = {
      professional_id: data.professional_id,
      session_id: data.session_id,
      service_id: data.service_id,
    };
    const response = await apiClient.post<CalculatePriceForBookingResponse>(
      '/calculate-price/for-booking',
      body
    );
    return response.data;
  } catch (error) {
    console.error('Error calculating price for booking:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw {
        success: false,
        message: error.response.data?.message || 'Failed to calculate price',
        error: error.response.data?.error || error.message,
        status: error.response.status,
      };
    }
    throw error;
  }
};

/**
 * Add FRA to cart and get calculated price
 * POST /add-to-cart/fra
 * Body: { professional_id, session_id }
 * Returns service_price, platform_fee_percent, platform_fee_amount, total_price for display in Booking Summary.
 */
export interface AddToCartFraRequest {
  professional_id: number;
  session_id: number;
}

export interface AddToCartFraResponse {
  status: boolean;
  message: string;
  data?: {
    session_id?: number;
    professional_id?: number;
    service_id?: number;
    service_price: number;
    platform_fee_percent: string;
    platform_fee_amount: number;
    total_price: number;
  };
}

export const addToCartFra = async (
  data: AddToCartFraRequest
): Promise<AddToCartFraResponse> => {
  try {
    const response = await apiClient.post<AddToCartFraResponse>(
      '/add-to-cart/fra',
      { professional_id: data.professional_id, session_id: data.session_id }
    );
    return response.data;
  } catch (error) {
    console.error('Error adding FRA to cart:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw {
        success: false,
        message: error.response.data?.message || 'Failed to calculate price',
        error: error.response.data?.error || error.message,
        status: error.response.status,
      };
    }
    throw error;
  }
};

/**
 * Add Fire Alarm to cart and get calculated price
 * POST /add-to-cart/fire-alarm
 * Body: { professional_id, session_id }
 * Returns service_price, platform_fee_percent, platform_fee_amount, total_price for display in Booking Summary.
 */
export interface AddToCartFireAlarmRequest {
  professional_id: number;
  session_id: number;
}

export interface AddToCartFireAlarmResponse {
  status: boolean;
  message: string;
  data?: {
    session_id?: number;
    professional_id?: number;
    service_id?: number;
    service_price: number;
    platform_fee_percent: string;
    platform_fee_amount: number;
    total_price: number;
  };
}

export const addToCartFireAlarm = async (
  data: AddToCartFireAlarmRequest
): Promise<AddToCartFireAlarmResponse> => {
  try {
    const response = await apiClient.post<AddToCartFireAlarmResponse>(
      '/add-to-cart/fire-alarm',
      { professional_id: data.professional_id, session_id: data.session_id }
    );
    return response.data;
  } catch (error) {
    console.error('Error adding Fire Alarm to cart:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw {
        success: false,
        message: error.response.data?.message || 'Failed to calculate price',
        error: error.response.data?.error || error.message,
        status: error.response.status,
      };
    }
    throw error;
  }
};

/**
 * Add Fire Extinguisher to cart and get calculated price
 * POST /add-to-cart/fire-extinguisher
 * Body: { professional_id, session_id }
 * Returns service_price, platform_fee_percent, platform_fee_amount, total_price for display in Booking Summary.
 */
export interface AddToCartFireExtinguisherRequest {
  professional_id: number;
  session_id: number;
}

export interface AddToCartFireExtinguisherResponse {
  status: boolean;
  message: string;
  data?: {
    session_id?: number;
    professional_id?: number;
    service_id?: number;
    service_price: number;
    platform_fee_percent: string;
    platform_fee_amount: number;
    total_price: number;
  };
}

export const addToCartFireExtinguisher = async (
  data: AddToCartFireExtinguisherRequest
): Promise<AddToCartFireExtinguisherResponse> => {
  try {
    const response = await apiClient.post<AddToCartFireExtinguisherResponse>(
      '/add-to-cart/fire-extinguisher',
      { professional_id: data.professional_id, session_id: data.session_id }
    );
    return response.data;
  } catch (error) {
    console.error('Error adding Fire Extinguisher to cart:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw {
        success: false,
        message: error.response.data?.message || 'Failed to calculate price',
        error: error.response.data?.error || error.message,
        status: error.response.status,
      };
    }
    throw error;
  }
};

/**
 * Add Fire Emergency Light (Emergency Lighting Test) to cart and get calculated price
 * POST /add-to-cart/fire-emergency-light
 * Body: { professional_id, session_id }
 * Returns service_price, platform_fee_percent, platform_fee_amount, total_price for display in Booking Summary.
 */
export interface AddToCartFireEmergencyLightRequest {
  professional_id: number;
  session_id: number;
}

export interface AddToCartFireEmergencyLightResponse {
  status: boolean;
  message: string;
  data?: {
    session_id?: number;
    professional_id?: number;
    service_id?: number;
    service_price: number;
    platform_fee_percent: string;
    platform_fee_amount: number;
    total_price: number;
  };
}

export const addToCartFireEmergencyLight = async (
  data: AddToCartFireEmergencyLightRequest
): Promise<AddToCartFireEmergencyLightResponse> => {
  try {
    const response = await apiClient.post<AddToCartFireEmergencyLightResponse>(
      '/add-to-cart/fire-emergency-light',
      { professional_id: data.professional_id, session_id: data.session_id }
    );
    return response.data;
  } catch (error) {
    console.error('Error adding Fire Emergency Light to cart:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw {
        success: false,
        message: error.response.data?.message || 'Failed to calculate price',
        error: error.response.data?.error || error.message,
        status: error.response.status,
      };
    }
    throw error;
  }
};

/**
 * Add Fire Marshal to cart and get calculated price
 * POST /add-to-cart/fire-marshal
 * Body: { professional_id, session_id }
 * Returns service_price, platform_fee_percent, platform_fee_amount, total_price for display in Booking Summary.
 */
export interface AddToCartFireMarshalRequest {
  professional_id: number;
  session_id: number;
}

export interface AddToCartFireMarshalResponse {
  status: boolean;
  message: string;
  data?: {
    session_id?: number;
    professional_id?: number;
    service_id?: number;
    service_price: number;
    platform_fee_percent: string;
    platform_fee_amount: number;
    total_price: number;
  };
}

export const addToCartFireMarshal = async (
  data: AddToCartFireMarshalRequest
): Promise<AddToCartFireMarshalResponse> => {
  try {
    const response = await apiClient.post<AddToCartFireMarshalResponse>(
      '/add-to-cart/fire-marshal',
      { professional_id: data.professional_id, session_id: data.session_id }
    );
    return response.data;
  } catch (error) {
    console.error('Error adding Fire Marshal to cart:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw {
        success: false,
        message: error.response.data?.message || 'Failed to calculate price',
        error: error.response.data?.error || error.message,
        status: error.response.status,
      };
    }
    throw error;
  }
};

/**
 * Add Fire Safety Consultation to cart and get calculated price
 * POST /add-to-cart/fire-consultation
 * Body: { professional_id, session_id }
 * Returns service_price, platform_fee_percent, platform_fee_amount, total_price for display in Booking Summary.
 */
export interface AddToCartFireConsultationRequest {
  professional_id: number;
  session_id: number;
}

export interface AddToCartFireConsultationResponse {
  status: boolean;
  message: string;
  data?: {
    session_id?: number;
    professional_id?: number;
    service_id?: number;
    service_price: number;
    platform_fee_percent: string;
    platform_fee_amount: number;
    total_price: number;
  };
}

export const addToCartFireConsultation = async (
  data: AddToCartFireConsultationRequest
): Promise<AddToCartFireConsultationResponse> => {
  try {
    const response = await apiClient.post<AddToCartFireConsultationResponse>(
      '/add-to-cart/fire-consultation',
      { professional_id: data.professional_id, session_id: data.session_id }
    );
    return response.data;
  } catch (error) {
    console.error('Error adding Fire Consultation to cart:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw {
        success: false,
        message: error.response.data?.message || 'Failed to calculate price',
        error: error.response.data?.error || error.message,
        status: error.response.status,
      };
    }
    throw error;
  }
};

// TypeScript types for Upcoming Bookings API
export interface UpcomingBookingItem {
  id?: number | string;
  selected_date: string;
  selected_time: string;
  additional_notes?: string;
  status: string;
  service_name: string | null;
  first_name?: string;
  last_name?: string;
  client_name?: string;
  email?: string;
  phone?: string;
}

export interface GetUpcomingBookingsRequest {
  api_token: string;
}

export interface GetUpcomingBookingsResponse {
  status: boolean;
  message: string;
  error?: string;
  data?: UpcomingBookingItem[];
}

/**
 * Get upcoming bookings for the authenticated user
 * BaseURL: https://fireguide.attoexasolutions.com/api/upcomming_bookings
 * Method: POST
 * @param api_token - The API token for authentication
 * @returns Promise with the API response containing array of upcoming bookings
 */
export const getUpcomingBookings = async (
  api_token: string
): Promise<GetUpcomingBookingsResponse> => {
  try {
    const response = await apiClient.post<GetUpcomingBookingsResponse>(
      '/upcomming_bookings',
      { api_token }
    );
    
    console.log('POST /upcomming_bookings - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching upcoming bookings:', error);
    if (axios.isAxiosError(error)) {
      // Handle axios errors
      if (error.response) {
        // Server responded with error status
        throw {
          success: false,
          status: 'error',
          message: error.response.data?.message || 'Failed to fetch upcoming bookings',
          error: error.response.data?.error || error.message,
        };
      } else if (error.request) {
        // Request was made but no response received
        throw {
          success: false,
          status: 'error',
          message: 'No response from server. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    // Handle other errors
    throw {
      success: false,
      status: 'error',
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// TypeScript types for Professional Booking Item
export interface ProfessionalBookingUser {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  image?: string | null;
}

export interface ProfessionalBookingItem {
  id: number;
  selected_date: string;
  selected_time: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  user?: ProfessionalBookingUser | null;
  price: string;
  property_address: string;
  longitude: string;
  latitude: string;
  city: string;
  post_code: string;
  ref_code: string | null;
  additional_notes: string;
  status: string;
  user_id: number | null;
  created_at: string;
  updated_at: string;
  selected_service?:
    | {
        id: number;
        name: string;
        price: string;
      }
    | {
        type?: string;
        data?: Record<string, { id?: number; value?: string } | string | number | null>;
      }
    | null;
  /** Present when `selected_service` is null; use `service_name` for display */
  service?: {
    id: number;
    service_name: string;
  } | null;
  /** Flat fields on search/list payloads (service_name used for card title only). */
  service_name?: string;
  service_id?: number;
  service_type?: string;
  mode_id?: number;
  hour_id?: number;
  mode_value?: string;
  hour_value?: string;
  access_note?: string | null;
  creator: {
    id: number;
    full_name: string;
  };
  updater: {
    id: number;
    full_name: string;
  };
  payout_request?: boolean | number | string | null;
  is_payout_requested?: boolean | number | string | null;
  payout_requested?: boolean | number | string | null;
  payout_request_status?: string | null;
  is_renewal?: boolean | number | string | null;
  renewal_request?: boolean | number | string | null;
  is_renewal_requested?: boolean | number | string | null;
  renewal_requested?: boolean | number | string | null;
  renewal_request_status?: string | null;
  is_renewal_sent?: boolean | number | string | null;
  is_paid?: boolean | number | string | null;
  payment_status?: string | null;
  payment?: {
    status?: string | null;
    is_paid?: boolean | number | string | null;
    payment_status?: string | null;
    price?: string | number | null;
  } | null;
  /** Set when booking was created from an accepted custom quote. */
  custom_id?: string | number | null;
  custom_quote_details?: {
    id?: number;
    service_id?: number;
    request_data?: string | Record<string, unknown>;
    status?: string;
    [key: string]: unknown;
  } | null;
}

export const getProfessionalBookingCustomerName = (
  booking: ProfessionalBookingItem
): string => {
  const fromUser = booking.user?.full_name?.trim();
  if (fromUser) return fromUser;

  const fromParts = `${booking.first_name ?? ""} ${booking.last_name ?? ""}`.trim();
  if (fromParts) return fromParts;

  const firstOnly = booking.first_name?.trim();
  if (firstOnly) return firstOnly;

  return booking.email?.trim() || booking.user?.email?.trim() || "Customer";
};

export const getProfessionalBookingCustomerEmail = (
  booking: ProfessionalBookingItem
): string => booking.user?.email?.trim() || booking.email?.trim() || "";

export const getProfessionalBookingCustomerPhone = (
  booking: ProfessionalBookingItem
): string => booking.user?.phone?.trim() || booking.phone?.trim() || "";

/** Customer user id for report upload and other customer-scoped APIs. */
export const getProfessionalBookingCustomerUserId = (
  booking: ProfessionalBookingItem
): number | null => {
  if (typeof booking.user_id === "number" && booking.user_id > 0) {
    return booking.user_id;
  }
  const nestedId = booking.user?.id;
  if (typeof nestedId === "number" && nestedId > 0) {
    return nestedId;
  }
  return null;
};

export const splitProfessionalBookingCustomerName = (
  fullName: string
): { first_name: string; last_name: string } => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: "", last_name: "" };
  if (parts.length === 1) return { first_name: parts[0], last_name: "" };
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
};

export const isProfessionalBookingPaid = (
  booking: ProfessionalBookingItem
): boolean => isBookingPaymentPaid(booking);

export const getProfessionalBookingPaymentStatus = (
  booking: ProfessionalBookingItem
): string => getBookingPaymentStatusKey(booking);

export const getProfessionalBookingPaymentStatusLabel = getBookingPaymentStatusLabel;

export interface GetProfessionalBookingsResponse {
  status: string;
  message: string;
  data: ProfessionalBookingItem[];
}

/**
 * Get all professional bookings
 * BaseURL: https://fireguide.attoexasolutions.com/api/professional_booking/professional_wise_get
 * Method: POST
 * @returns Promise with the API response containing array of professional bookings
 */
export const getProfessionalBookings = async (): Promise<ProfessionalBookingItem[]> => {
  try {
    const api_token = getApiToken();
    
    if (!api_token) {
      console.warn('No API token available for fetching professional bookings');
      return [];
    }
    
    console.log('POST /professional_booking/professional_wise_get - Requesting...');
    
    const response = await apiClient.post<GetProfessionalBookingsResponse>(
      '/professional_booking/professional_wise_get',
      { api_token }
    );
    
    console.log('POST /professional_booking/professional_wise_get - Response:', response.data);
    
    // Handle the response structure: { status: 'success', data: [...] }
    if (response.data.status === 'success' && Array.isArray(response.data.data)) {
      console.log('Professional bookings found:', response.data.data.length);
      return response.data.data;
    }
    
    // Fallback: return empty array if structure is unexpected
    console.warn('Unexpected professional bookings API response structure:', response.data);
    return [];
  } catch (error) {
    console.error('Error fetching professional bookings:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to fetch professional bookings',
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

// Change professional booking status (mark completed + invoice create)
export interface ChangeProfessionalBookingStatusRequest {
  api_token: string;
  booking_id: number;
}

export interface ChangeProfessionalBookingStatusResponse {
  status: boolean;
  message: string;
  data?: any;
}

/**
 * Change professional booking status
 * POST https://fireguide.attoexasolutions.com/api/professional-booking/change-status
 * Body: { api_token, booking_id }
 */
export const changeProfessionalBookingStatus = async (
  data: ChangeProfessionalBookingStatusRequest
): Promise<ChangeProfessionalBookingStatusResponse> => {
  const response = await apiClient.post<ChangeProfessionalBookingStatusResponse>(
    '/professional-booking/change-status',
    data
  );
  return response.data;
};

// TypeScript types for Accept Professional Booking request
export interface AcceptProfessionalBookingRequest {
  api_token: string;
  id: number;
}

export interface AcceptProfessionalBookingResponse {
  status: string;
  message: string;
  data?: any;
}

/**
 * Accept a professional booking
 * BaseURL: https://fireguide.attoexasolutions.com/api/professional_booking/accept
 * Method: POST
 * @param data - Accept booking request data (api_token and booking id)
 * @returns Promise with the API response
 */
export const acceptProfessionalBooking = async (
  data: AcceptProfessionalBookingRequest
): Promise<AcceptProfessionalBookingResponse> => {
  try {
    const response = await apiClient.post<AcceptProfessionalBookingResponse>(
      '/professional_booking/accept',
      data
    );
    
    console.log('POST /professional_booking/accept - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error accepting professional booking:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to accept booking',
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

// TypeScript types for Update Professional Booking request
export interface UpdateProfessionalBookingRequest {
  api_token: string;
  id: number;
  selected_date: string;
  selected_time: string;
  price: string | number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  property_address: string;
  longitude: number;
  latitude: number;
  city: string;
  post_code: string;
  additional_notes?: string;
  reason?: string;
  professional_id: number;
  /** Some backends allow status transition via update endpoint */
  status?: string;
}

export interface UpdateProfessionalBookingResponse {
  status: string;
  message: string;
  data?: any;
}

/**
 * Update a professional booking (Reschedule)
 * BaseURL: https://fireguide.attoexasolutions.com/api/professional_booking/update
 * Method: POST
 * @param data - Update booking request data
 * @returns Promise with the API response
 */
export const updateProfessionalBooking = async (
  data: UpdateProfessionalBookingRequest
): Promise<UpdateProfessionalBookingResponse> => {
  try {
    const response = await apiClient.post<UpdateProfessionalBookingResponse>(
      '/professional_booking/update',
      data
    );
    
    console.log('POST /professional_booking/update - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating professional booking:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to update booking',
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

// TypeScript types for Search Professional Bookings request
export interface SearchProfessionalBookingsRequest {
  api_token?: string;
  search?: string;
  status?: string;
}

export interface SearchProfessionalBookingsResponse {
  status: string;
  message: string;
  data: ProfessionalBookingItem[];
}

/**
 * Search professional bookings
 * BaseURL: https://fireguide.attoexasolutions.com/api/professional_booking/search
 * Method: POST
 * @param data - Search request data (search term and/or status filter)
 * @returns Promise with the API response containing array of matching bookings
 */
export const searchProfessionalBookings = async (
  data: SearchProfessionalBookingsRequest
): Promise<ProfessionalBookingItem[]> => {
  try {
    const api_token = getApiToken();
    
    if (!api_token) {
      console.warn('No API token available for searching bookings');
      return [];
    }
    
    const requestData = {
      api_token,
      ...data
    };
    
    const response = await apiClient.post<SearchProfessionalBookingsResponse>(
      '/professional_booking/search',
      requestData
    );
    
    console.log('POST /professional_booking/search - Request:', requestData);
    console.log('POST /professional_booking/search - Response:', response.data);
    
    // Handle the response structure: { status: 'success', data: [...] }
    if (response.data.status === 'success' && Array.isArray(response.data.data)) {
      console.log('Search results found:', response.data.data.length);
      return response.data.data;
    }
    
    // Fallback: return empty array if structure is unexpected
    console.warn('Unexpected search API response structure:', response.data);
    return [];
  } catch (error) {
    console.error('Error searching professional bookings:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to search bookings',
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

// TypeScript types for Booking Summary request
export interface BookingSummaryRequest {
  api_token: string;
}

export interface BookingSummaryResponse {
  status: boolean;
  message: string;
  data: {
    upcoming: number;
    pending: number;
    completed: number;
  };
}

/**
 * Get booking summary (stats)
 * BaseURL: https://fireguide.attoexasolutions.com/api/professional_booking/summary
 * Method: POST
 * @param api_token - The API token for authentication
 * @returns Promise with the API response containing booking summary
 */
export const getBookingSummary = async (
  api_token: string
): Promise<BookingSummaryResponse> => {
  try {
    console.log('POST /professional_booking/summary - Requesting with token:', api_token.substring(0, 20) + '...');
    
    const response = await apiClient.post<BookingSummaryResponse>(
      '/professional_booking/summary',
      { api_token }
    );
    
    console.log('POST /professional_booking/summary - Response:', response.data);
    console.log('POST /professional_booking/summary - Status:', response.status);
    
    return response.data;
  } catch (error) {
    console.error('Error fetching booking summary:', error);
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to fetch booking summary',
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

export interface ProfessionalPayoutRequestBody {
  api_token: string;
  booking_id: number;
}

export interface ProfessionalPayoutRequestResponse {
  status: boolean | string;
  message?: string;
  data?: unknown;
}

/**
 * Request payout to admin for a completed booking.
 * POST /professional/payout-request — body: { api_token, booking_id }
 */
export interface ProfessionalRenewalRequestBody {
  api_token: string;
  booking_id: number;
}

export interface ProfessionalRenewalRequestResponse {
  status?: boolean | string;
  success?: boolean;
  message?: string;
  data?: unknown;
}

/**
 * Send renewal request for a completed booking (when is_renewal is true).
 * POST /custommer/renewal-request — body: { api_token, booking_id }
 */
export const requestProfessionalRenewal = async (
  data: ProfessionalRenewalRequestBody
): Promise<ProfessionalRenewalRequestResponse> => {
  try {
    const response = await apiClient.post<ProfessionalRenewalRequestResponse>(
      '/custommer/renewal-request',
      {
        api_token: data.api_token,
        booking_id: data.booking_id,
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error sending renewal request:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to send renewal request',
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

export const requestProfessionalPayout = async (
  data: ProfessionalPayoutRequestBody
): Promise<ProfessionalPayoutRequestResponse> => {
  try {
    const response = await apiClient.post<ProfessionalPayoutRequestResponse>(
      '/professional/payout-request',
      {
        api_token: data.api_token,
        booking_id: data.booking_id,
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error requesting professional payout:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to submit payout request',
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

/** One payout request row for the professional dashboard Payout List page. */
export interface ProfessionalMyPayoutRequestItem {
  id: number;
  professional_id: number;
  booking_id: number;
  amount: string | number;
  status: string;
  created_at: string;
  updated_at: string;
  service?: {
    id: number;
    name: string;
  } | null;
  customer?: {
    id?: number;
    first_name?: string;
    last_name?: string;
    full_name?: string;
  } | null;
  booking_details?: {
    id?: number;
    status?: string;
  } | null;
}

export interface ProfessionalMyPayoutRequestListResponse {
  status: boolean | string;
  message?: string;
  data?: ProfessionalMyPayoutRequestItem[];
}

/**
 * Professional's own payout request list.
 * POST /professional-payout/list — body: { api_token }
 */
export const getMyProfessionalPayoutRequestList = async (
  api_token: string
): Promise<ProfessionalMyPayoutRequestListResponse> => {
  try {
    const response = await apiClient.post<ProfessionalMyPayoutRequestListResponse>(
      '/professional-payout/list',
      { api_token }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching professional payout list:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to fetch payout list',
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
