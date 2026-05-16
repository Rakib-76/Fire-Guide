import axios from 'axios';
import { resolveApiBaseUrl } from '../lib/apiBaseUrl';

const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

/** Request body for custom quote store; base fields optional so Fire Marshal can send only people. */
export interface CustomQuoteRequestData {
  building_type?: string;
  people_count?: string;
  floors?: number;
  /** Fire Alarm custom: number of smoke/heat detectors */
  smoke_detectors?: number;
  /** Fire Alarm custom: number of manual call points */
  call_point?: number;
  /** Fire Alarm custom: number of fire alarm panels */
  panels?: number;
  /** Fire Extinguisher custom: number of extinguishers */
  extinguisher?: number;
  /** Emergency Lighting custom: number of emergency lights */
  emergency_light?: number;
  /** Fire Marshal Training custom: number of people for training */
  people?: number;
  /** Preferred appointment / assessment date (final step) */
  preferred_date?: string;
  /** Human-readable questionnaire summary (equipment, access, etc.) */
  access_note?: string;
  duration_id?: number;
  fra_assessment_type?: string;
  consultation_mode?: string;
  consultation_hours?: string;
}

export interface CustomQuoteStoreResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    service_id: number;
    user_id: number;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    request_data: string;
    status: string;
    created_at: string;
    updated_at: string;
  };
}

export interface MyQuoteRequestItem {
  id: number;
  service_id: number;
  user_id: number;
  professional_id: number | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  request_data: string;
  status: string;
  created_at: string;
  updated_at: string;
  /** From POST /custom-quote-requests/my-requests when assigned (e.g. "420.00"). */
  quoted_price?: string | number | null;
  professional_booking_id?: number | string | null;
  booking_id?: number | string | null;
  professional_booking?: { id?: number } | null;
  is_paid?: boolean | number | string | null;
  payment_status?: string | null;
  service?: { id: number; service_name: string };
  professional?: {
    id: number;
    name?: string;
    full_name?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    phone_number?: string;
    /** Some payloads use `number` for phone (e.g. Laravel). */
    number?: string | number | null;
  } | null;
}

export interface MyQuoteRequestsResponse {
  status: boolean;
  message: string;
  data: MyQuoteRequestItem[];
}

export interface AdminQuoteRequestItem {
  id: number;
  service_id: number;
  user_id: number | null;
  professional_id: number | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  request_data: string;
  status: string;
  created_at: string;
  updated_at: string;
  /** Quoted price from assign-professional (e.g. "120.00") */
  quoted_price?: string | null;
  service?: { id: number; service_name: string };
  user?: { id: number; full_name: string; email: string } | null;
  professional?: { id: number; name: string; email?: string } | null;
}

export interface AdminQuoteRequestSingleResponse {
  status: boolean;
  message: string;
  data: AdminQuoteRequestItem;
}

/**
 * Fetch a single custom quote request (admin)
 * POST /custom-quote-requests/get-single
 * Body: { api_token, id }
 */
export const getSingleCustomQuoteRequest = async (
  apiToken: string,
  id: number
): Promise<AdminQuoteRequestSingleResponse> => {
  try {
    const response = await apiClient.post<AdminQuoteRequestSingleResponse>(
      '/custom-quote-requests/get-single',
      { api_token: apiToken, id }
    );
    const data = response.data;
    if (!data?.status) {
      throw new Error((data as { message?: string })?.message || 'Fetch failed');
    }
    return data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? err.message;
      throw new Error(typeof msg === 'string' ? msg : 'Failed to fetch quote request');
    }
    throw err;
  }
};

export interface AdminQuoteRequestsResponse {
  status: boolean;
  message: string;
  data: AdminQuoteRequestItem[];
}

/**
 * Fetch all custom quote requests (admin)
 * POST /custom-quote-requests/get-all
 * Body: { api_token }
 */
export const getAllCustomQuoteRequests = async (apiToken: string): Promise<AdminQuoteRequestsResponse> => {
  try {
    const response = await apiClient.post<AdminQuoteRequestsResponse>(
      '/custom-quote-requests/get-all',
      { api_token: apiToken }
    );
    const data = response.data;
    if (!data?.status) {
      throw new Error((data as { message?: string })?.message || 'Fetch failed');
    }
    return data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? err.message;
      throw new Error(typeof msg === 'string' ? msg : 'Failed to fetch quote requests');
    }
    throw err;
  }
};

/**
 * Professional's custom quote requests (for Professional Dashboard)
 * POST /custom-quote-requests/professional-requests
 * Body: { api_token }
 */
export interface ProfessionalQuoteRequestItem {
  id: number;
  service_id: number;
  user_id: number | null;
  professional_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  request_data: string | Record<string, unknown>;
  status: string;
  created_at: string;
  updated_at: string;
  quoted_price?: string | number | null;
  /** Customer's preferred appointment date from the quote request. */
  preferred_date?: string | null;
  /** From POST /custom-quote-requests/professional-requests — drives Paid / Unpaid in details modal. */
  is_paid?: boolean | number | string | null;
  payment_status?: string | null;
  service?: { id: number; service_name: string };
  user?: { id: number; full_name: string; email: string } | null;
}

export interface ProfessionalCustomQuoteResponse {
  status: boolean;
  message: string;
  professional?: { id: number; full_name: string; email: string };
  requests?: ProfessionalQuoteRequestItem[];
}

export const getProfessionalCustomQuoteRequests = async (
  apiToken: string
): Promise<ProfessionalCustomQuoteResponse> => {
  try {
    const response = await apiClient.post<ProfessionalCustomQuoteResponse>(
      '/custom-quote-requests/professional-requests',
      { api_token: apiToken }
    );
    const data = response.data;
    if (!data?.status) {
      throw new Error((data as { message?: string })?.message || 'Fetch failed');
    }
    return data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? err.message;
      throw new Error(typeof msg === 'string' ? msg : 'Failed to fetch professional quote requests');
    }
    throw err;
  }
};

/**
 * Fetch current user's custom quote requests
 * POST /custom-quote-requests/my-requests
 * Body: { api_token }
 */
export const getMyQuoteRequests = async (apiToken: string): Promise<MyQuoteRequestsResponse> => {
  try {
    const response = await apiClient.post<MyQuoteRequestsResponse>(
      '/custom-quote-requests/my-requests',
      { api_token: apiToken }
    );
    const data = response.data;
    if (!data?.status) {
      throw new Error((data as { message?: string })?.message || 'Fetch failed');
    }
    return data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? err.message;
      throw new Error(typeof msg === 'string' ? msg : 'Failed to fetch quote requests');
    }
    throw err;
  }
};

/**
 * Create a custom quote request
 * POST https://fireguide.attoexasolutions.com/api/custom-quote-requests/store
 * Body: { api_token?, service_id, customer_name, customer_email, customer_phone, request_data }
 * request_data: core pricing keys plus optional questionnaire fields (preferred_date, access_note, …).
 */
export const storeCustomQuoteRequest = async (
  apiToken: string | null,
  serviceId: number,
  customerName: string,
  customerEmail: string,
  customerPhone: string,
  requestData: CustomQuoteRequestData
): Promise<CustomQuoteStoreResponse> => {
  try {
    const payload: Record<string, unknown> = {
      service_id: serviceId,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      request_data: {
        ...(requestData.building_type != null && { building_type: requestData.building_type }),
        ...(requestData.people_count != null && { people_count: requestData.people_count }),
        ...(requestData.floors != null && { floors: requestData.floors }),
        ...(requestData.smoke_detectors != null && { smoke_detectors: requestData.smoke_detectors }),
        ...(requestData.call_point != null && { call_point: requestData.call_point }),
        ...(requestData.panels != null && { panels: requestData.panels }),
        ...(requestData.extinguisher != null && { extinguisher: requestData.extinguisher }),
        ...(requestData.emergency_light != null && { emergency_light: requestData.emergency_light }),
        ...(requestData.people != null && { people: requestData.people }),
        ...(requestData.preferred_date != null && requestData.preferred_date !== "" && { preferred_date: requestData.preferred_date }),
        ...(requestData.access_note != null && requestData.access_note !== "" && { access_note: requestData.access_note }),
        ...(requestData.duration_id != null && !Number.isNaN(requestData.duration_id) && { duration_id: requestData.duration_id }),
        ...(requestData.fra_assessment_type != null && requestData.fra_assessment_type !== "" && { fra_assessment_type: requestData.fra_assessment_type }),
        ...(requestData.consultation_mode != null && requestData.consultation_mode !== "" && { consultation_mode: requestData.consultation_mode }),
        ...(requestData.consultation_hours != null && requestData.consultation_hours !== "" && { consultation_hours: requestData.consultation_hours }),
      },
    };
    if (apiToken) {
      payload.api_token = apiToken;
    }
    const response = await apiClient.post<CustomQuoteStoreResponse>(
      '/custom-quote-requests/store',
      payload
    );
  const data = response.data;
  if (!data?.status) {
    throw new Error((data as { message?: string })?.message || 'Submit failed');
  }
  return data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? err.message;
      throw new Error(typeof msg === 'string' ? msg : 'Failed to submit custom quote request');
    }
    throw err;
  }
};

/**
 * Update custom quote request status (admin)
 * POST /custom-quote-requests/update-status
 * Body: { api_token, id, status }
 */
export const updateQuoteRequestStatus = async (
  apiToken: string,
  quoteRequestId: number,
  status: string
): Promise<AdminQuoteRequestSingleResponse> => {
  try {
    const response = await apiClient.post<AdminQuoteRequestSingleResponse>(
      '/custom-quote-requests/update-status',
      { api_token: apiToken, id: quoteRequestId, status }
    );
    const data = response.data;
    if (!data?.status) {
      throw new Error((data as { message?: string })?.message || 'Update failed');
    }
    return data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? err.message;
      throw new Error(typeof msg === 'string' ? msg : 'Failed to update status');
    }
    throw err;
  }
};

/**
 * Professional marks own assigned custom quote as completed
 * POST /custom-quote-requests/mark-as-completed
 * Body: { api_token, id }
 */
export const markQuoteRequestAsCompleted = async (
  apiToken: string,
  quoteRequestId: number
): Promise<AdminQuoteRequestSingleResponse> => {
  try {
    const response = await apiClient.post<AdminQuoteRequestSingleResponse>(
      '/custom-quote-requests/mark-as-completed',
      { api_token: apiToken, id: quoteRequestId }
    );
    const data = response.data;
    if (!data?.status) {
      throw new Error((data as { message?: string })?.message || 'Mark completed failed');
    }
    return data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? err.message;
      throw new Error(typeof msg === 'string' ? msg : 'Failed to mark quote as completed');
    }
    throw err;
  }
};

/**
 * Assign a professional to a custom quote request (admin)
 * POST /custom-quote-requests/assign-professional
 * Body: { api_token, id, professional_id, quoted_price }
 */
export const assignProfessionalToQuoteRequest = async (
  apiToken: string,
  quoteRequestId: number,
  professionalId: number,
  quotedPrice: number
): Promise<AdminQuoteRequestSingleResponse> => {
  try {
    const response = await apiClient.post<AdminQuoteRequestSingleResponse>(
      '/custom-quote-requests/assign-professional',
      { api_token: apiToken, id: quoteRequestId, professional_id: professionalId, quoted_price: quotedPrice }
    );
    const data = response.data;
    if (!data?.status) {
      throw new Error((data as { message?: string })?.message || 'Assign failed');
    }
    return data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? err.message;
      throw new Error(typeof msg === 'string' ? msg : 'Failed to assign professional');
    }
    throw err;
  }
};
