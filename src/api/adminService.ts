import axios from 'axios';
import { handleTokenExpired, isTokenExpiredError } from '../lib/auth';
import { resolveApiBaseUrl } from '../lib/apiBaseUrl';

const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// On 401 (expired/invalid token), log out and redirect to home so user must log in again
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error?.config?.url || '';
    const isAuthEndpoint = requestUrl.includes('/login') || requestUrl.includes('/register') || requestUrl.includes('/send_otp') || requestUrl.includes('/verify_otp') || requestUrl.includes('/reset_password');
    if (!isAuthEndpoint && isTokenExpiredError(error)) {
      handleTokenExpired();
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);




export interface AdminOverviewSummaryRequest {
  api_token: string;
}

export interface AdminOverviewSummaryData {
  total_revenue: number;
  active_bookings: number;
  /** API may return total_customers or total_customer */
  total_customer?: number;
  total_customers?: number;
  active_professionals: number;
  total_experiences?: number;
}

export interface AdminOverviewSummaryResponse {
  success?: boolean;
  status?: boolean;
  message?: string;
  data: AdminOverviewSummaryData;
}

/**
 * Fetch admin dashboard overview summary
 * POST https://fireguide.attoexasolutions.com/api/admin_overview/summary
 */
export const getAdminOverviewSummary = async (
  data: AdminOverviewSummaryRequest
): Promise<AdminOverviewSummaryResponse> => {
  const response = await apiClient.post<AdminOverviewSummaryResponse>(
    '/admin_overview/summary',
    { api_token: data.api_token }
  );
  return response.data;
};

// Recent bookings for admin dashboard
export interface AdminRecentBookingItem {
  id: number;
  selected_date: string;
  selected_time: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  price: string;
  property_address: string;
  status: string;
  selected_service_id: number | null;
  created_at: string;
  updated_at: string;
  professional: { id: number; name: string };
  user: { id: number; full_name: string; image: string | null };
  creator?: { id: number; full_name: string; image: string | null } | null;
  updater?: { id: number; full_name: string; image: string | null } | null;
}

export interface AdminRecentBookingsResponse {
  success: boolean;
  message: string;
  data: AdminRecentBookingItem[];
}

/**
 * Fetch admin dashboard recent bookings
 * POST https://fireguide.attoexasolutions.com/api/admin_overview/recent_booking
 */
export const getAdminRecentBookings = async (
  data: AdminOverviewSummaryRequest
): Promise<AdminRecentBookingsResponse> => {
  const response = await apiClient.post<AdminRecentBookingsResponse>(
    '/admin_overview/recent_booking',
    { api_token: data.api_token }
  );
  return response.data;
};

// Professional payment invoice list (Payout page)
export interface ProfessionalPayoutDetail {
  id: number;
  professional_id: number;
  account_holder_name: string;
  sort_code: string;
  account_number: string;
  note: string | null;
}

export interface ProfessionalPaymentInvoiceBooking {
  id: number;
  professional_id: number;
  user_id: number;
  price: number;
  status: string;
}

export interface ProfessionalPaymentInvoiceItem {
  id: number;
  professional_id: number;
  booking_id: number;
  amount: string;
  status: string;
  created_at: string;
  updated_at: string;
  professional: {
    id: number;
    name: string;
    email: string;
    payout_detail: ProfessionalPayoutDetail | null;
  };
  booking: ProfessionalPaymentInvoiceBooking;
}

export interface ProfessionalPaymentInvoiceListResponse {
  status: boolean;
  message: string;
  data: ProfessionalPaymentInvoiceItem[];
}

/**
 * POST professional-payment/show-invoice — Professional Payment Invoice List for admin Payout page
 */
export const getProfessionalPaymentInvoiceList = async (
  data: AdminOverviewSummaryRequest
): Promise<ProfessionalPaymentInvoiceListResponse> => {
  const response = await apiClient.post<ProfessionalPaymentInvoiceListResponse>(
    '/professional-payment/show-invoice',
    { api_token: data.api_token }
  );
  return response.data;
};

export interface UpdateProfessionalPaymentInvoiceStatusRequest {
  api_token: string;
  id: number;
  professional_id: number;
}

export interface UpdateProfessionalPaymentInvoiceStatusResponse {
  status: boolean;
  message: string;
  data?: any;
}

/**
 * POST professional-payment/invoice/update-status — mark invoice as paid
 * Body: { api_token, id, professional_id }
 */
export const updateProfessionalPaymentInvoiceStatus = async (
  data: UpdateProfessionalPaymentInvoiceStatusRequest
): Promise<UpdateProfessionalPaymentInvoiceStatusResponse> => {
  const response = await apiClient.post<UpdateProfessionalPaymentInvoiceStatusResponse>(
    '/professional-payment/invoice/update-status',
    data
  );
  return response.data;
};

export interface ProfessionalPayoutRequestItem {
  id: number;
  booking_id: number;
  professional_id?: number;
  status: string;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  booking_status: string;
  selected_date: string;
  selected_time: string;
}

export interface ProfessionalPayoutRequestListResponse {
  status: boolean;
  message: string;
  data: ProfessionalPayoutRequestItem[];
}

/**
 * POST /professional/payout-request — admin list of professional payout requests
 * Body: { api_token }
 */
export const getProfessionalPayoutRequestList = async (
  data: AdminOverviewSummaryRequest
): Promise<ProfessionalPayoutRequestListResponse> => {
  const response = await apiClient.post<ProfessionalPayoutRequestListResponse>(
    '/get/professional/payout-request',
    { api_token: data.api_token }
  );
  return response.data;
};

/** Admin Payout page summary cards — from POST /professional/payout-dashboard */
export interface ProfessionalPayoutDashboardData {
  total_invoices: number;
  paid_invoices: number;
  pending_invoices: number;
  total_amount: number;
  total_paid_amount: number;
  total_pending_amount: number;
}

export interface ProfessionalPayoutDashboardResponse {
  status?: boolean;
  success?: boolean;
  message?: string;
  data?: unknown;
}

function pickPayoutDashboardNumber(source: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const raw = source[key];
    if (raw == null || raw === '') continue;
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

/** Normalize payout dashboard payload (supports nested `data` and snake_case variants). */
export function normalizeProfessionalPayoutDashboard(
  payload: unknown
): ProfessionalPayoutDashboardData | null {
  if (payload == null) return null;
  let record: Record<string, unknown> | null = null;
  if (typeof payload === 'object') {
    const root = payload as Record<string, unknown>;
    const inner = root.data;
    if (inner != null && typeof inner === 'object' && !Array.isArray(inner)) {
      const nested = inner as Record<string, unknown>;
      record =
        nested.data != null && typeof nested.data === 'object' && !Array.isArray(nested.data)
          ? (nested.data as Record<string, unknown>)
          : nested;
    } else {
      record = root;
    }
  }
  if (!record) return null;

  return {
    total_invoices: pickPayoutDashboardNumber(record, [
      'total_invoices',
      'total_invoice',
      'total',
    ]),
    paid_invoices: pickPayoutDashboardNumber(record, [
      'paid_invoices',
      'paid_invoice',
      'paid',
      'paid_count',
    ]),
    pending_invoices: pickPayoutDashboardNumber(record, [
      'pending_invoices',
      'pending_invoice',
      'pending_payment',
      'pending',
      'unpaid_invoices',
    ]),
    total_amount: pickPayoutDashboardNumber(record, [
      'total_amount',
      'total_price',
      'amount',
    ]),
    total_paid_amount: pickPayoutDashboardNumber(record, [
      'total_paid_amount',
      'paid_amount',
      'total_paid',
    ]),
    total_pending_amount: pickPayoutDashboardNumber(record, [
      'total_pending_amount',
      'pending_amount',
      'total_pending',
    ]),
  };
}

/**
 * POST /professional/payout-dashboard — admin payout summary (Total invoices, Paid, Total amount)
 * Body: { api_token }
 */
export const getProfessionalPayoutDashboard = async (
  data: AdminOverviewSummaryRequest
): Promise<ProfessionalPayoutDashboardResponse> => {
  const response = await apiClient.post<ProfessionalPayoutDashboardResponse>(
    '/professional/payout-dashboard',
    { api_token: data.api_token }
  );
  return response.data;
};

export interface UpdateAdminPayoutRequestStatusRequest {
  api_token: string;
  payout_request_id: number;
  status: string;
  admin_note?: string | null;
}

export interface UpdateAdminPayoutRequestStatusResponse {
  status: boolean;
  message: string;
  data?: unknown;
}

/**
 * POST /admin-change/payout-request/status — approve/reject payout request
 * Body: { api_token, payout_request_id, status, admin_note? }
 */
export const updateAdminPayoutRequestStatus = async (
  data: UpdateAdminPayoutRequestStatusRequest
): Promise<UpdateAdminPayoutRequestStatusResponse> => {
  const response = await apiClient.post<UpdateAdminPayoutRequestStatusResponse>(
    '/admin-change/payout-request/status',
    data
  );
  return response.data;
};

// FRA all prices (all professionals) – Admin FRA Base Price page
export interface FraAllPricesPropertyType {
  id: number;
  property_type_name: string;
  price: string;
}

export interface FraAllPricesFloor {
  id: number;
  floor: string;
  price: string;
  property_type_id?: number;
  property_type_name?: string;
  floor_id?: number;
}

export interface FraAllPricesPeople {
  id: number;
  people_name: string | null;
  price: string;
  property_type_id?: number;
  property_type_name?: string;
  people_id?: number;
}

export interface FraAllPricesDuration {
  id: number;
  duration_name: string;
  price: string;
  property_type_id?: number;
  property_type_name?: string;
  duration_id?: number;
}

export interface FraAllPricesProfessionalItem {
  professional_id: number;
  professional_name: string;
  property_types: FraAllPricesPropertyType[];
  floors: FraAllPricesFloor[];
  people: FraAllPricesPeople[];
  durations: FraAllPricesDuration[];
}

export interface FraAllPricesResponse {
  status: boolean;
  message: string;
  data: FraAllPricesProfessionalItem[];
}

/**
 * Fetch all professionals' FRA prices (property types, floors, people, durations).
 * POST https://fireguide.attoexasolutions.com/api/professional-wise/fra-all-prices
 * Body: { api_token } — admin token for dynamic login
 */
export const getFraAllPrices = async (apiToken: string): Promise<FraAllPricesResponse> => {
  const response = await apiClient.post<FraAllPricesResponse>(
    '/professional-wise/fra-all-prices',
    { api_token: apiToken }
  );
  return response.data;
};

// Fire Alarm all prices (all professionals) – Admin Pricing > Fire Alarm tab
export interface AlarmAllPricesBasePrice {
  price: string;
}

export interface AlarmAllPricesOption {
  id: number;
  value: string;
  price: string;
}

export interface AlarmAllPricesProfessionalItem {
  professional_id: number;
  professional_name: string;
  base_prices: AlarmAllPricesBasePrice[];
  smoke_detectors: AlarmAllPricesOption[];
  call_points: AlarmAllPricesOption[];
  floors: AlarmAllPricesOption[];
  panels: AlarmAllPricesOption[];
  last_services: AlarmAllPricesOption[];
  system_types: AlarmAllPricesOption[];
}

export interface AlarmAllPricesResponse {
  status: boolean;
  message: string;
  data: AlarmAllPricesProfessionalItem[];
}

/**
 * Fetch all professionals' Fire Alarm prices.
 * POST https://fireguide.attoexasolutions.com/api/professional-wise/Alarm-all-prices
 * Body: { api_token }
 */
export const getAlarmAllPrices = async (apiToken: string): Promise<AlarmAllPricesResponse> => {
  const response = await apiClient.post<AlarmAllPricesResponse>(
    '/professional-wise/Alarm-all-prices',
    { api_token: apiToken }
  );
  return response.data;
};

// Extinguisher all prices (all professionals) – Admin Pricing > Extinguishers tab
export interface ExtinguisherAllPricesBasePrice {
  price: string;
}

export interface ExtinguisherAllPricesOption {
  id: number;
  value: string;
  price: string;
}

export interface ExtinguisherAllPricesProfessionalItem {
  professional_id: number;
  professional_name: string;
  base_prices: ExtinguisherAllPricesBasePrice[];
  extinguishers: ExtinguisherAllPricesOption[];
  floors: ExtinguisherAllPricesOption[];
  last_services: ExtinguisherAllPricesOption[];
  extinguisher_types: ExtinguisherAllPricesOption[];
}

export interface ExtinguisherAllPricesResponse {
  status: boolean;
  message: string;
  data: ExtinguisherAllPricesProfessionalItem[];
}

/**
 * Fetch all professionals' Extinguisher prices.
 * POST https://fireguide.attoexasolutions.com/api/professional-wise/Extingusher-all-prices
 * Body: { api_token }
 */
export const getExtinguisherAllPrices = async (apiToken: string): Promise<ExtinguisherAllPricesResponse> => {
  const response = await apiClient.post<ExtinguisherAllPricesResponse>(
    '/professional-wise/Extingusher-all-prices',
    { api_token: apiToken }
  );
  return response.data;
};

// Emergency Lighting (Light Testing) all prices – Admin Pricing > Emergency Lighting tab
export interface LightTestingAllPricesBasePrice {
  price: string;
}

export interface LightTestingAllPricesOption {
  id: number;
  value: string;
  price: string;
}

export interface LightTestingAllPricesProfessionalItem {
  professional_id: number;
  professional_name: string;
  base_prices: LightTestingAllPricesBasePrice[];
  lights: LightTestingAllPricesOption[];
  floors: LightTestingAllPricesOption[];
  light_tests: LightTestingAllPricesOption[];
  light_types: LightTestingAllPricesOption[];
}

export interface LightTestingAllPricesResponse {
  status: boolean;
  message: string;
  data: LightTestingAllPricesProfessionalItem[];
}

/**
 * Fetch all professionals' Emergency Lighting (light testing) prices.
 * POST https://fireguide.attoexasolutions.com/api/professional-wise/light-testing-all-prices
 * Body: { api_token }
 */
export const getLightTestingAllPrices = async (apiToken: string): Promise<LightTestingAllPricesResponse> => {
  const response = await apiClient.post<LightTestingAllPricesResponse>(
    '/professional-wise/light-testing-all-prices',
    { api_token: apiToken }
  );
  return response.data;
};

// Training (Marshal) all prices – Admin Pricing > Training tab
export interface MarshalAllPricesBasePrice {
  price: string;
}

export interface MarshalAllPricesOption {
  id: number;
  value: string;
  price: string;
}

export interface MarshalAllPricesProfessionalItem {
  professional_id: number;
  professional_name: string;
  base_prices: MarshalAllPricesBasePrice[];
  people: MarshalAllPricesOption[];
  places: MarshalAllPricesOption[];
  training_on: MarshalAllPricesOption[];
  experience: MarshalAllPricesOption[];
}

export interface MarshalAllPricesResponse {
  status: boolean;
  message: string;
  data: MarshalAllPricesProfessionalItem[];
}

/**
 * Fetch all professionals' Training (Marshal) prices.
 * POST https://fireguide.attoexasolutions.com/api/professional-wise/marshal-all-prices
 * Body: { api_token }
 */
export const getMarshalAllPrices = async (apiToken: string): Promise<MarshalAllPricesResponse> => {
  const response = await apiClient.post<MarshalAllPricesResponse>(
    '/professional-wise/marshal-all-prices',
    { api_token: apiToken }
  );
  return response.data;
};

// Consultation all prices – Admin Pricing > Consultancy tab
export interface ConsultationAllPricesBasePrice {
  price: string;
}

export interface ConsultationAllPricesMode {
  id: number | null;
  value: string | null;
  price: string;
}

export interface ConsultationAllPricesHour {
  id: number;
  value: string;
  price: string;
}

export interface ConsultationAllPricesProfessionalItem {
  professional_id: number;
  professional_name: string;
  base_price: ConsultationAllPricesBasePrice[];
  modes: ConsultationAllPricesMode[];
  hours: ConsultationAllPricesHour[];
}

export interface ConsultationAllPricesResponse {
  status: boolean;
  message: string;
  data: ConsultationAllPricesProfessionalItem[];
}

/**
 * Fetch all professionals' Consultation prices.
 * POST https://fireguide.attoexasolutions.com/api/professional-wise/consultation-all-prices
 * Body: { api_token }
 */
export const getConsultationAllPrices = async (apiToken: string): Promise<ConsultationAllPricesResponse> => {
  const response = await apiClient.post<ConsultationAllPricesResponse>(
    '/professional-wise/consultation-all-prices',
    { api_token: apiToken }
  );
  return response.data;
};

/** Response for POST /professional-consultation-admin/base-price-create */
export interface AdminConsultationBasePriceCreateResponse {
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
 * Create & update Consultation base price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-consultation-admin/base-price-create
 * Body: { api_token, professional_id, price }
 */
export const saveAdminConsultationBasePrice = async (
  apiToken: string,
  professionalId: number,
  price: number
): Promise<AdminConsultationBasePriceCreateResponse> => {
  const response = await apiClient.post<AdminConsultationBasePriceCreateResponse>(
    '/professional-consultation-admin/base-price-create',
    { api_token: apiToken, professional_id: professionalId, price }
  );
  return response.data;
};

/** Response for POST /professional-consultation-admin/base-price-get */
export interface AdminConsultationBasePriceGetResponse {
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
 * Get Consultation base price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-consultation-admin/base-price-get
 * Body: { api_token, professional_id }
 */
export const getAdminConsultationBasePrice = async (
  apiToken: string,
  professionalId: number
): Promise<AdminConsultationBasePriceGetResponse> => {
  const response = await apiClient.post<AdminConsultationBasePriceGetResponse>(
    '/professional-consultation-admin/base-price-get',
    { api_token: apiToken, professional_id: professionalId }
  );
  return response.data;
};

/** Response for POST /professional-consultation-admin/mode-price-create */
export interface AdminConsultationModePriceCreateResponse {
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
 * Create & update Consultation mode (Select Consultation Model) price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-consultation-admin/mode-price-create
 * Body: { api_token, mode_id, professional_id, type: "mode", price }
 */
export const saveAdminConsultationModePrice = async (
  apiToken: string,
  professionalId: number,
  modeId: number,
  price: number
): Promise<AdminConsultationModePriceCreateResponse> => {
  const response = await apiClient.post<AdminConsultationModePriceCreateResponse>(
    '/professional-consultation-admin/mode-price-create',
    {
      api_token: apiToken,
      mode_id: modeId,
      professional_id: professionalId,
      type: 'mode',
      price,
    }
  );
  return response.data;
};

/** Response for POST /professional-consultation-admin/get-single/prices */
export interface AdminConsultationSinglePricesResponse {
  status: boolean;
  message: string;
  data?: {
    professional?: { id: number; name: string };
    mode?: { id: number; people?: number | null; price?: string | number };
    hour?: { id: number; place?: string; price?: string | number };
    total_price?: number;
  };
}

/**
 * Get single Consultation prices for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-consultation-admin/get-single/prices
 * Body: { api_token, professional_id, mode_id, hour_id }
 */
export const getAdminConsultationSinglePrices = async (
  apiToken: string,
  professionalId: number,
  modeId: number,
  hourId: number
): Promise<AdminConsultationSinglePricesResponse> => {
  const response = await apiClient.post<AdminConsultationSinglePricesResponse>(
    '/professional-consultation-admin/get-single/prices',
    { api_token: apiToken, professional_id: professionalId, mode_id: modeId, hour_id: hourId }
  );
  return response.data;
};

/** Response for POST /professional-consultation-admin/hour-price-create */
export interface AdminConsultationHourPriceCreateResponse {
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
 * Create & update Consultation hour (Select Consultation Hours) price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-consultation-admin/hour-price-create
 * Body: { api_token, professional_id, hour_id, type: "hour", price }
 */
export const saveAdminConsultationHourPrice = async (
  apiToken: string,
  professionalId: number,
  hourId: number,
  price: number
): Promise<AdminConsultationHourPriceCreateResponse> => {
  const response = await apiClient.post<AdminConsultationHourPriceCreateResponse>(
    '/professional-consultation-admin/hour-price-create',
    {
      api_token: apiToken,
      professional_id: professionalId,
      hour_id: hourId,
      type: 'hour',
      price,
    }
  );
  return response.data;
};

/** Response for POST /professional-marshal-admin/base-price-get */
export interface AdminMarshalBasePriceGetResponse {
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
 * Get Professional Marshal (Training) base price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-marshal-admin/base-price-get
 * Body: { api_token, professional_id }
 */
export const getAdminMarshalBasePrice = async (
  apiToken: string,
  professionalId: number
): Promise<AdminMarshalBasePriceGetResponse> => {
  const response = await apiClient.post<AdminMarshalBasePriceGetResponse>(
    '/professional-marshal-admin/base-price-get',
    { api_token: apiToken, professional_id: professionalId }
  );
  return response.data;
};

/** Response for POST /professional-marshal-admin/base-price-create */
export interface AdminMarshalBasePriceCreateResponse {
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
 * Create & update Professional Marshal (Training) base price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-marshal-admin/base-price-create
 * Body: { api_token, professional_id, price }
 */
export const saveAdminMarshalBasePrice = async (
  apiToken: string,
  professionalId: number,
  price: number
): Promise<AdminMarshalBasePriceCreateResponse> => {
  const response = await apiClient.post<AdminMarshalBasePriceCreateResponse>(
    '/professional-marshal-admin/base-price-create',
    { api_token: apiToken, professional_id: professionalId, price }
  );
  return response.data;
};

/** Response for POST /professional-marshal-admin/people-price-create */
export interface AdminMarshalPeoplePriceCreateResponse {
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
 * Create/update Professional Marshal "Select People" price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-marshal-admin/people-price-create
 * Body: { api_token, professional_id, people_id, type: "people", price }
 */
export const saveAdminMarshalPeoplePrice = async (
  apiToken: string,
  professionalId: number,
  peopleId: number,
  price: number
): Promise<AdminMarshalPeoplePriceCreateResponse> => {
  const response = await apiClient.post<AdminMarshalPeoplePriceCreateResponse>(
    '/professional-marshal-admin/people-price-create',
    { api_token: apiToken, professional_id: professionalId, people_id: peopleId, type: 'people', price }
  );
  return response.data;
};

/** Response for POST /professional-marshal-admin/place-price-create */
export interface AdminMarshalPlacePriceCreateResponse {
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
 * Create/update Professional Marshal "Select Place" price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-marshal-admin/place-price-create
 * Body: { api_token, professional_id, place_id, type: "training_place", price }
 */
export const saveAdminMarshalPlacePrice = async (
  apiToken: string,
  professionalId: number,
  placeId: number,
  price: number
): Promise<AdminMarshalPlacePriceCreateResponse> => {
  const response = await apiClient.post<AdminMarshalPlacePriceCreateResponse>(
    '/professional-marshal-admin/place-price-create',
    { api_token: apiToken, professional_id: professionalId, place_id: placeId, type: 'training_place', price }
  );
  return response.data;
};

/** Response for POST /professional-marshal-admin/training-on-price-create */
export interface AdminMarshalTrainingOnPriceCreateResponse {
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
 * Create/update Professional Marshal "Select Training On" price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-marshal-admin/training-on-price-create
 * Body: { api_token, professional_id, training_on_id, type: "building_type", price }
 */
export const saveAdminMarshalTrainingOnPrice = async (
  apiToken: string,
  professionalId: number,
  trainingOnId: number,
  price: number
): Promise<AdminMarshalTrainingOnPriceCreateResponse> => {
  const response = await apiClient.post<AdminMarshalTrainingOnPriceCreateResponse>(
    '/professional-marshal-admin/training-on-price-create',
    { api_token: apiToken, professional_id: professionalId, training_on_id: trainingOnId, type: 'building_type', price }
  );
  return response.data;
};

/** Response for POST /professional-marshal-admin/experience-price-create */
export interface AdminMarshalExperiencePriceCreateResponse {
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
 * Create/update Professional Marshal "Select Experience" price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-marshal-admin/experience-price-create
 * Body: { api_token, professional_id, experience_id, type: "experience", price }
 */
export const saveAdminMarshalExperiencePrice = async (
  apiToken: string,
  professionalId: number,
  experienceId: number,
  price: number
): Promise<AdminMarshalExperiencePriceCreateResponse> => {
  const response = await apiClient.post<AdminMarshalExperiencePriceCreateResponse>(
    '/professional-marshal-admin/experience-price-create',
    { api_token: apiToken, professional_id: professionalId, experience_id: experienceId, type: 'experience', price }
  );
  return response.data;
};

/** Response for POST /professional-marshal-admin/get-single/prices */
export interface AdminMarshalSinglePricesResponse {
  status: boolean;
  message: string;
  data?: {
    professional?: { id: number; name: string };
    people?: { id: number; people?: string; price?: string };
    place?: { id: number; place?: string; price?: string };
    training_on?: { id: number; training_on?: string; price?: string };
    experience?: { id: number; experience?: string; price?: string };
  };
}

/**
 * Get single Marshal (Training) prices for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-marshal-admin/get-single/prices
 * Body: { api_token, professional_id, people_id, place_id, training_on_id, experience_id }
 */
export const getAdminMarshalSinglePrices = async (
  apiToken: string,
  professionalId: number,
  peopleId: number,
  placeId: number,
  trainingOnId: number,
  experienceId: number
): Promise<AdminMarshalSinglePricesResponse> => {
  const response = await apiClient.post<AdminMarshalSinglePricesResponse>(
    '/professional-marshal-admin/get-single/prices',
    {
      api_token: apiToken,
      professional_id: professionalId,
      people_id: peopleId,
      place_id: placeId,
      training_on_id: trainingOnId,
      experience_id: experienceId,
    }
  );
  return response.data;
};

/** Response for POST /professional-extinguisher-admin/base-price-get */
export interface AdminExtinguisherBasePriceGetResponse {
  status?: boolean;
  message?: string;
  data?: {
    id: number;
    professional_id: number;
    price: string | number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Get Professional Extinguisher base price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-extinguisher-admin/base-price-get
 * Body: { api_token, professional_id }
 */
export const getAdminExtinguisherBasePrice = async (
  apiToken: string,
  professionalId: number
): Promise<AdminExtinguisherBasePriceGetResponse> => {
  const response = await apiClient.post<AdminExtinguisherBasePriceGetResponse>(
    '/professional-extinguisher-admin/base-price-get',
    { api_token: apiToken, professional_id: professionalId }
  );
  return response.data;
};

/** Response for POST /professional-extinguisher-admin/base-price-create */
export interface AdminExtinguisherBasePriceCreateResponse {
  status?: boolean;
  message?: string;
  data?: {
    id: number;
    professional_id: number;
    price: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Create/update Professional Extinguisher base price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-extinguisher-admin/base-price-create
 * Body: { api_token, professional_id, price }
 */
export const saveAdminExtinguisherBasePrice = async (
  apiToken: string,
  professionalId: number,
  price: number
): Promise<AdminExtinguisherBasePriceCreateResponse> => {
  const response = await apiClient.post<AdminExtinguisherBasePriceCreateResponse>(
    '/professional-extinguisher-admin/base-price-create',
    { api_token: apiToken, professional_id: professionalId, price }
  );
  return response.data;
};

/** Response for POST /professional-fire-Extingusher-admin/get-single/prices */
export interface AdminExtinguisherSinglePricesResponse {
  status?: boolean;
  message?: string;
  data?: {
    professional?: { id: number; name: string };
    extinguisher?: { id: number; smoke_detector?: string; price?: string };
    floor?: { id: number; floor?: string; price?: string };
    last_service?: { id: number; last_service?: string; price?: string };
    extinguisher_type?: { id: number; system_type?: string; price?: string };
  };
}

/**
 * Get single Extinguisher prices for a professional (Admin). Admin token in request body.
 * POST https://fireguide.attoexasolutions.com/api/professional-fire-Extingusher-admin/get-single/prices
 * Body: { api_token, professional_id, extinguisher_id, floor_id, last_service_id, extinguisher_type_id }
 */
export const getAdminExtinguisherSinglePrices = async (
  apiToken: string,
  professionalId: number,
  extinguisherId: number,
  floorId: number,
  lastServiceId: number,
  extinguisherTypeId: number
): Promise<AdminExtinguisherSinglePricesResponse> => {
  const response = await apiClient.post<AdminExtinguisherSinglePricesResponse>(
    '/professional-fire-Extingusher-admin/get-single/prices',
    {
      api_token: apiToken,
      professional_id: professionalId,
      extinguisher_id: extinguisherId,
      floor_id: floorId,
      last_service_id: lastServiceId,
      extinguisher_type_id: extinguisherTypeId,
    }
  );
  return response.data;
};

/** Response for POST /professional-extinguisher-wise-admin/price-create */
export interface AdminExtinguisherWisePriceCreateResponse {
  status?: boolean;
  message?: string;
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
 * Create/update Professional Extinguisher (Select Extinguisher / floor / type / last_service) price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-extinguisher-wise-admin/price-create
 * Body: { api_token, professional_id, extinguisher_id, type, price }
 * type: "extinguisher" | "floor" | "metarials" | "last_service"
 */
export const saveAdminExtinguisherWisePrice = async (
  apiToken: string,
  professionalId: number,
  extinguisherId: number,
  type: string,
  price: number
): Promise<AdminExtinguisherWisePriceCreateResponse> => {
  const response = await apiClient.post<AdminExtinguisherWisePriceCreateResponse>(
    '/professional-extinguisher-wise-admin/price-create',
    { api_token: apiToken, professional_id: professionalId, extinguisher_id: extinguisherId, type, price }
  );
  return response.data;
};

/** Response for POST /professional-extinguisher-admin/floor-price-create */
export interface AdminExtinguisherFloorPriceCreateResponse {
  status?: boolean;
  message?: string;
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
 * Create/update Professional Extinguisher floor price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-extinguisher-admin/floor-price-create
 * Body: { api_token, professional_id, floor_id, type: "floor", price }
 */
export const saveAdminExtinguisherFloorPrice = async (
  apiToken: string,
  professionalId: number,
  floorId: number,
  price: number
): Promise<AdminExtinguisherFloorPriceCreateResponse> => {
  const response = await apiClient.post<AdminExtinguisherFloorPriceCreateResponse>(
    '/professional-extinguisher-admin/floor-price-create',
    { api_token: apiToken, professional_id: professionalId, floor_id: floorId, type: 'floor', price }
  );
  return response.data;
};

/** Response for POST /professional-extinguisher-admin/last-service-price-create */
export interface AdminExtinguisherLastServicePriceCreateResponse {
  status?: boolean;
  message?: string;
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
 * Create/update Professional Extinguisher last service price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-extinguisher-admin/last-service-price-create
 * Body: { api_token, professional_id, last_service_id, type: "last_service", price }
 */
export const saveAdminExtinguisherLastServicePrice = async (
  apiToken: string,
  professionalId: number,
  lastServiceId: number,
  price: number
): Promise<AdminExtinguisherLastServicePriceCreateResponse> => {
  const response = await apiClient.post<AdminExtinguisherLastServicePriceCreateResponse>(
    '/professional-extinguisher-admin/last-service-price-create',
    { api_token: apiToken, professional_id: professionalId, last_service_id: lastServiceId, type: 'last_service', price }
  );
  return response.data;
};

/** Response for POST /professional-extinguisher-admin/type-price-create */
export interface AdminExtinguisherTypePriceCreateResponse {
  status?: boolean;
  message?: string;
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
 * Create/update Professional Extinguisher type price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-extinguisher-admin/type-price-create
 * Body: { api_token, professional_id, extinguisher_type_id, type: "metarials", price }
 */
export const saveAdminExtinguisherTypePrice = async (
  apiToken: string,
  professionalId: number,
  extinguisherTypeId: number,
  price: number
): Promise<AdminExtinguisherTypePriceCreateResponse> => {
  const response = await apiClient.post<AdminExtinguisherTypePriceCreateResponse>(
    '/professional-extinguisher-admin/type-price-create',
    { api_token: apiToken, professional_id: professionalId, extinguisher_type_id: extinguisherTypeId, type: 'metarials', price }
  );
  return response.data;
};

/** Response for POST /professional-emergency-light-admin/base-price-get */
export interface AdminEmergencyLightBasePriceGetResponse {
  status?: boolean;
  message?: string;
  data?: {
    id: number;
    professional_id: number;
    price: string | number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Get Professional Emergency Light base price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-emergency-light-admin/base-price-get
 * Body: { api_token, professional_id }
 */
export const getAdminEmergencyLightBasePrice = async (
  apiToken: string,
  professionalId: number
): Promise<AdminEmergencyLightBasePriceGetResponse> => {
  const response = await apiClient.post<AdminEmergencyLightBasePriceGetResponse>(
    '/professional-emergency-light-admin/base-price-get',
    { api_token: apiToken, professional_id: professionalId }
  );
  return response.data;
};

/** Response for POST /professional-emergency-light-admin/base-price-create */
export interface AdminEmergencyLightBasePriceCreateResponse {
  status?: boolean;
  message?: string;
  data?: {
    id: number;
    professional_id: number;
    price: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Create/update Professional Emergency Light base price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-emergency-light-admin/base-price-create
 * Body: { api_token, professional_id, price }
 */
export const saveAdminEmergencyLightBasePrice = async (
  apiToken: string,
  professionalId: number,
  price: number
): Promise<AdminEmergencyLightBasePriceCreateResponse> => {
  const response = await apiClient.post<AdminEmergencyLightBasePriceCreateResponse>(
    '/professional-emergency-light-admin/base-price-create',
    { api_token: apiToken, professional_id: professionalId, price }
  );
  return response.data;
};

/** Response for POST /professional-fire-alarm-admin/get-base-price */
export interface AdminFireAlarmBasePriceGetResponse {
  status?: boolean;
  message?: string;
  data?: {
    id: number;
    professional_id: number;
    price: string;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Get Professional Fire Alarm base price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-fire-alarm-admin/get-base-price
 * Body: { api_token, professional_id }
 */
export const getAdminFireAlarmBasePrice = async (
  apiToken: string,
  professionalId: number
): Promise<AdminFireAlarmBasePriceGetResponse> => {
  const response = await apiClient.post<AdminFireAlarmBasePriceGetResponse>(
    '/professional-fire-alarm-admin/get-base-price',
    { api_token: apiToken, professional_id: professionalId }
  );
  return response.data;
};

/** Response for POST /professional-admin/fire-alarm-base-price */
export interface AdminFireAlarmBasePriceSaveResponse {
  status?: boolean;
  message?: string;
  data?: {
    id: number;
    professional_id: number;
    price: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Create/update Professional Fire Alarm base price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-admin/fire-alarm-base-price
 * Body: { api_token, professional_id, price }
 */
export const saveAdminFireAlarmBasePrice = async (
  apiToken: string,
  professionalId: number,
  price: number
): Promise<AdminFireAlarmBasePriceSaveResponse> => {
  const response = await apiClient.post<AdminFireAlarmBasePriceSaveResponse>(
    '/professional-admin/fire-alarm-base-price',
    { api_token: apiToken, professional_id: professionalId, price }
  );
  return response.data;
};

/** Response for POST /professional-admin/get-fra-pricing (fetch whole FRA price by selection) */
export interface AdminFraPricingResponse {
  status?: boolean;
  message?: string;
  data?: {
    professional: { id: number; name: string };
    property_type: { id: number; property_name: string; price: string };
    people: { id: number; number_of_people: string; price: string };
    floor: { id: number; floor: string; price: string };
    duration: { id: number; duration: string; price: string };
    total_price: number;
  };
}

/**
 * Get FRA whole price for a professional by property type, floor, people, duration (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-admin/get-fra-pricing
 * Body: { api_token, professional_id, property_type_id, floor_id, people_id, duration_id }
 */
export const getAdminFraPricing = async (
  apiToken: string,
  professionalId: number,
  propertyTypeId: number,
  floorId: number,
  peopleId: number,
  durationId: number
): Promise<AdminFraPricingResponse> => {
  const response = await apiClient.post<AdminFraPricingResponse>(
    '/professional-admin/get-fra-pricing',
    {
      api_token: apiToken,
      professional_id: professionalId,
      property_type_id: propertyTypeId,
      floor_id: floorId,
      people_id: peopleId,
      duration_id: durationId,
    }
  );
  return response.data;
};

/** Response for POST /professional-admin/fra-property-type */
export interface AdminFraPropertyTypePriceResponse {
  status?: boolean;
  message?: string;
  data?: {
    id: number;
    professional_id: number;
    property_type_id: number;
    price: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Create/update Professional FRA property type (base) price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-admin/fra-property-type
 * Body: { api_token, professional_id, property_type_id, price }
 */
export const saveAdminFraPropertyTypePrice = async (
  apiToken: string,
  professionalId: number,
  propertyTypeId: number,
  price: number
): Promise<AdminFraPropertyTypePriceResponse> => {
  const response = await apiClient.post<AdminFraPropertyTypePriceResponse>(
    '/professional-admin/fra-property-type',
    { api_token: apiToken, professional_id: professionalId, property_type_id: propertyTypeId, price }
  );
  return response.data;
};

/** Response for POST /professional-admin/fra-people */
export interface AdminFraPeoplePriceResponse {
  status?: boolean;
  message?: string;
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
 * Create/update Professional FRA people (approximate people) price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-admin/fra-people
 * Body: { api_token, professional_id, people_id, price }
 */
export const saveAdminFraPeoplePrice = async (
  apiToken: string,
  professionalId: number,
  peopleId: number,
  price: number
): Promise<AdminFraPeoplePriceResponse> => {
  const response = await apiClient.post<AdminFraPeoplePriceResponse>(
    '/professional-admin/fra-people',
    { api_token: apiToken, professional_id: professionalId, people_id: peopleId, price }
  );
  return response.data;
};

/** Response for POST /professional-fra-floor-admin */
export interface AdminFraFloorPriceResponse {
  status?: boolean;
  message?: string;
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
 * Create/update Professional FRA floor price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-fra-floor-admin
 * Body: { api_token, professional_id, floor_id, price }
 */
export const saveAdminFraFloorPrice = async (
  apiToken: string,
  professionalId: number,
  floorId: number,
  price: number
): Promise<AdminFraFloorPriceResponse> => {
  const response = await apiClient.post<AdminFraFloorPriceResponse>(
    '/professional-fra-floor-admin',
    { api_token: apiToken, professional_id: professionalId, floor_id: floorId, price }
  );
  return response.data;
};

/** Response for POST /professional-fra-duration-admin */
export interface AdminFraDurationPriceResponse {
  status?: boolean;
  message?: string;
  data?: {
    id: number;
    professional_id: number;
    duration_id: number;
    price: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Create/update Professional FRA duration (urgency) price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-fra-duration-admin
 * Body: { api_token, professional_id, duration_id, price }
 */
export const saveAdminFraDurationPrice = async (
  apiToken: string,
  professionalId: number,
  durationId: number,
  price: number
): Promise<AdminFraDurationPriceResponse> => {
  const response = await apiClient.post<AdminFraDurationPriceResponse>(
    '/professional-fra-duration-admin',
    { api_token: apiToken, professional_id: professionalId, duration_id: durationId, price }
  );
  return response.data;
};

/** Response for POST /professional-fire-alarm-admin/smoke-detectors/create-price */
export interface AdminFireAlarmSmokeDetectorPriceResponse {
  status?: boolean;
  message?: string;
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
 * Create/update Professional Fire Alarm smoke detectors price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-fire-alarm-admin/smoke-detectors/create-price
 * Body: { api_token, professional_id, smoke_detectors_id, type: "ditectors", price }
 */
export const saveAdminFireAlarmSmokeDetectorPrice = async (
  apiToken: string,
  professionalId: number,
  smokeDetectorsId: number,
  price: number
): Promise<AdminFireAlarmSmokeDetectorPriceResponse> => {
  const response = await apiClient.post<AdminFireAlarmSmokeDetectorPriceResponse>(
    '/professional-fire-alarm-admin/smoke-detectors/create-price',
    {
      api_token: apiToken,
      professional_id: professionalId,
      smoke_detectors_id: smokeDetectorsId,
      type: 'ditectors',
      price,
    }
  );
  return response.data;
};

/** Response for POST /professional-fire-alarm-admin/call-points/create-price */
export interface AdminFireAlarmCallPointPriceResponse {
  status?: boolean;
  message?: string;
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
 * Create/update Professional Fire Alarm call points price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-fire-alarm-admin/call-points/create-price
 * Body: { api_token, professional_id, call_point_id, type: "call_points", price }
 */
export const saveAdminFireAlarmCallPointPrice = async (
  apiToken: string,
  professionalId: number,
  callPointId: number,
  price: number
): Promise<AdminFireAlarmCallPointPriceResponse> => {
  const response = await apiClient.post<AdminFireAlarmCallPointPriceResponse>(
    '/professional-fire-alarm-admin/call-points/create-price',
    {
      api_token: apiToken,
      professional_id: professionalId,
      call_point_id: callPointId,
      type: 'call_points',
      price,
    }
  );
  return response.data;
};

/** Response for POST /professional-fire-alarm-admin/floor/create-price */
export interface AdminFireAlarmFloorPriceResponse {
  status?: boolean;
  message?: string;
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
 * Create/update Professional Fire Alarm floor price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-fire-alarm-admin/floor/create-price
 * Body: { api_token, professional_id, floor_id, type: "floors", price }
 */
export const saveAdminFireAlarmFloorPrice = async (
  apiToken: string,
  professionalId: number,
  floorId: number,
  price: number
): Promise<AdminFireAlarmFloorPriceResponse> => {
  const response = await apiClient.post<AdminFireAlarmFloorPriceResponse>(
    '/professional-fire-alarm-admin/floor/create-price',
    {
      api_token: apiToken,
      professional_id: professionalId,
      floor_id: floorId,
      type: 'floors',
      price,
    }
  );
  return response.data;
};

/** Response for POST /professional-fire-alarm-admin/panel/create-price */
export interface AdminFireAlarmPanelPriceResponse {
  status?: boolean;
  message?: string;
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
 * Create/update Professional Fire Alarm panel price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-fire-alarm-admin/panel/create-price
 * Body: { api_token, professional_id, panel_id, type: "alarm_panels", price }
 */
export const saveAdminFireAlarmPanelPrice = async (
  apiToken: string,
  professionalId: number,
  panelId: number,
  price: number
): Promise<AdminFireAlarmPanelPriceResponse> => {
  const response = await apiClient.post<AdminFireAlarmPanelPriceResponse>(
    '/professional-fire-alarm-admin/panel/create-price',
    {
      api_token: apiToken,
      professional_id: professionalId,
      panel_id: panelId,
      type: 'alarm_panels',
      price,
    }
  );
  return response.data;
};

/** Response for POST /professional-fire-alarm-admin/last-service/create-price */
export interface AdminFireAlarmLastServicePriceResponse {
  status?: boolean;
  message?: string;
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
 * Create/update Professional Fire Alarm last service price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-fire-alarm-admin/last-service/create-price
 * Body: { api_token, professional_id, last_service_id, type: "last_service", price }
 */
export const saveAdminFireAlarmLastServicePrice = async (
  apiToken: string,
  professionalId: number,
  lastServiceId: number,
  price: number
): Promise<AdminFireAlarmLastServicePriceResponse> => {
  const response = await apiClient.post<AdminFireAlarmLastServicePriceResponse>(
    '/professional-fire-alarm-admin/last-service/create-price',
    {
      api_token: apiToken,
      professional_id: professionalId,
      last_service_id: lastServiceId,
      type: 'last_service',
      price,
    }
  );
  return response.data;
};

/** Response for POST /professional-fire-alarm-admin/system-type/create-price */
export interface AdminFireAlarmSystemTypePriceResponse {
  status?: boolean;
  message?: string;
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
 * Create/update Professional Fire Alarm system type price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-fire-alarm-admin/system-type/create-price
 * Body: { api_token, professional_id, system_type_id, type: "system_type", price }
 */
export const saveAdminFireAlarmSystemTypePrice = async (
  apiToken: string,
  professionalId: number,
  systemTypeId: number,
  price: number
): Promise<AdminFireAlarmSystemTypePriceResponse> => {
  const response = await apiClient.post<AdminFireAlarmSystemTypePriceResponse>(
    '/professional-fire-alarm-admin/system-type/create-price',
    {
      api_token: apiToken,
      professional_id: professionalId,
      system_type_id: systemTypeId,
      type: 'system_type',
      price,
    }
  );
  return response.data;
};

/** Response for POST /professional-fire-alarm-admin/get-single/prices */
export interface AdminFireAlarmSinglePricesResponse {
  status?: boolean;
  message?: string;
  data?: {
    professional?: { id: number; name: string };
    smoke_detector?: { id: number; value?: string; price?: string };
    call_point?: { id: number; value?: string; price?: string };
    floor?: { id: number; value?: string; price?: string };
    panel?: { id: number; value?: string; price?: string };
    last_service?: { id: number; value?: string; price?: string };
    system_type?: { id: number; value?: string; price?: string };
    total_price?: number;
  };
}

/**
 * Get Professional Fire Alarm single/addon prices for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-fire-alarm-admin/get-single/prices
 * Body: { api_token, professional_id, smoke_detectors_id, call_point_id, floor_id, panel_id, last_service_id, system_type_id }
 */
export const getAdminFireAlarmSinglePrices = async (
  apiToken: string,
  professionalId: number,
  ids: {
    smoke_detectors_id: number;
    call_point_id: number;
    floor_id: number;
    panel_id: number;
    last_service_id: number;
    system_type_id: number;
  }
): Promise<AdminFireAlarmSinglePricesResponse> => {
  const response = await apiClient.post<AdminFireAlarmSinglePricesResponse>(
    '/professional-fire-alarm-admin/get-single/prices',
    {
      api_token: apiToken,
      professional_id: professionalId,
      smoke_detectors_id: ids.smoke_detectors_id,
      call_point_id: ids.call_point_id,
      floor_id: ids.floor_id,
      panel_id: ids.panel_id,
      last_service_id: ids.last_service_id,
      system_type_id: ids.system_type_id,
    }
  );
  return response.data;
};

/** Response for POST /professional-fire-light-testing-admin/get-single/prices */
export interface AdminEmergencyLightSinglePricesResponse {
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
 * Get single Emergency Lighting prices for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-fire-light-testing-admin/get-single/prices
 * Body: { api_token, professional_id, light_id, floor_id, light_test_id, light_type_id }
 */
export const getAdminEmergencyLightSinglePrices = async (
  apiToken: string,
  professionalId: number,
  lightId: number,
  floorId: number,
  lightTestId: number,
  lightTypeId: number
): Promise<AdminEmergencyLightSinglePricesResponse> => {
  const response = await apiClient.post<AdminEmergencyLightSinglePricesResponse>(
    '/professional-fire-light-testing-admin/get-single/prices',
    {
      api_token: apiToken,
      professional_id: professionalId,
      light_id: lightId,
      floor_id: floorId,
      light_test_id: lightTestId,
      light_type_id: lightTypeId,
    }
  );
  return response.data;
};

/** Response for POST /professional-emergency-light-admin/price-create */
export interface AdminEmergencyLightPriceCreateResponse {
  status?: boolean;
  message?: string;
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
 * Create/update Professional Emergency Light (Select Emergency light) price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-emergency-light-admin/price-create
 * Body: { api_token, professional_id, light_id, type: "light", price }
 */
export const saveAdminEmergencyLightPrice = async (
  apiToken: string,
  professionalId: number,
  lightId: number,
  price: number
): Promise<AdminEmergencyLightPriceCreateResponse> => {
  const response = await apiClient.post<AdminEmergencyLightPriceCreateResponse>(
    '/professional-emergency-light-admin/price-create',
    { api_token: apiToken, professional_id: professionalId, light_id: lightId, type: 'light', price }
  );
  return response.data;
};

/** Response for POST /professional-emergency-light-admin/floor-price-create */
export interface AdminEmergencyLightFloorPriceCreateResponse {
  status?: boolean;
  message?: string;
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
 * Create/update Professional Emergency Light floor price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-emergency-light-admin/floor-price-create
 * Body: { api_token, professional_id, floor_id, type: "floor", price }
 */
export const saveAdminEmergencyLightFloorPrice = async (
  apiToken: string,
  professionalId: number,
  floorId: number,
  price: number
): Promise<AdminEmergencyLightFloorPriceCreateResponse> => {
  const response = await apiClient.post<AdminEmergencyLightFloorPriceCreateResponse>(
    '/professional-emergency-light-admin/floor-price-create',
    { api_token: apiToken, professional_id: professionalId, floor_id: floorId, type: 'floor', price }
  );
  return response.data;
};

/** Response for POST /professional-emergency-light-type-admin/price-create */
export interface AdminEmergencyLightTypePriceCreateResponse {
  status?: boolean;
  message?: string;
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
 * Create/update Professional Emergency Light type price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-emergency-light-type-admin/price-create
 * Body: { api_token, professional_id, light_type_id, type: "light_type", price }
 */
export const saveAdminEmergencyLightTypePrice = async (
  apiToken: string,
  professionalId: number,
  lightTypeId: number,
  price: number
): Promise<AdminEmergencyLightTypePriceCreateResponse> => {
  const response = await apiClient.post<AdminEmergencyLightTypePriceCreateResponse>(
    '/professional-emergency-light-type-admin/price-create',
    { api_token: apiToken, professional_id: professionalId, light_type_id: lightTypeId, type: 'light_type', price }
  );
  return response.data;
};

/** Response for POST /professional-emergency-light-test-admin/price-create */
export interface AdminEmergencyLightTestPriceCreateResponse {
  status?: boolean;
  message?: string;
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
 * Create/update Professional Emergency Light test price for a professional (Admin).
 * POST https://fireguide.attoexasolutions.com/api/professional-emergency-light-test-admin/price-create
 * Body: { api_token, professional_id, light_test_id, type: "light_test", price }
 */
export const saveAdminEmergencyLightTestPrice = async (
  apiToken: string,
  professionalId: number,
  lightTestId: number,
  price: number
): Promise<AdminEmergencyLightTestPriceCreateResponse> => {
  const response = await apiClient.post<AdminEmergencyLightTestPriceCreateResponse>(
    '/professional-emergency-light-test-admin/price-create',
    { api_token: apiToken, professional_id: professionalId, light_test_id: lightTestId, type: 'light_test', price }
  );
  return response.data;
};

// Admin customer summary (Customer Management page)
export interface AdminCustomerSummaryData {
  total_customers: number;
  active_this_month: number;
  new_this_month: number;
  total_revenue: number;
}

export interface AdminCustomerSummaryResponse {
  success: boolean;
  message: string;
  data: AdminCustomerSummaryData;
}

/**
 * Fetch admin customer dashboard summary
 * POST https://fireguide.attoexasolutions.com/api/admin_customer/summary
 */
export const getAdminCustomerSummary = async (
  data: AdminOverviewSummaryRequest
): Promise<AdminCustomerSummaryResponse> => {
  const response = await apiClient.post<AdminCustomerSummaryResponse>(
    '/admin_customer/summary',
    { api_token: data.api_token }
  );
  return response.data;
};

// Admin customer list (Customer Management table)
export interface AdminCustomerItem {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  image: string | null;
  soft_delete: string;
  created_at: string;
  updated_at: string;
  total_bookings: number;
  total_price: number;
  property_address: string;
  last_booking?: string | null;
}

export interface AdminCustomerListResponse {
  success: boolean;
  message: string;
  data: AdminCustomerItem[];
}

/**
 * Fetch admin customer list
 * POST https://fireguide.attoexasolutions.com/api/admin_customer/get
 */
export const getAdminCustomers = async (
  data: AdminOverviewSummaryRequest
): Promise<AdminCustomerListResponse> => {
  const response = await apiClient.post<AdminCustomerListResponse>(
    '/admin_customer/get',
    { api_token: data.api_token }
  );
  return response.data;
};

/** Customer status for take_action: "active" | "inactive" | "suspend" */
export type AdminCustomerStatus = 'active' | 'inactive' | 'suspend';

export interface AdminCustomerTakeActionRequest {
  api_token: string;
  user_id: number;
  status: AdminCustomerStatus;
}

export interface AdminCustomerTakeActionResponse {
  success: boolean;
  message: string;
  data?: { user_id: number; new_status: string };
}

/**
 * Update customer status (active / inactive / suspend)
 * POST https://fireguide.attoexasolutions.com/api/admin_customer/take_action
 */
export const adminCustomerTakeAction = async (
  data: AdminCustomerTakeActionRequest
): Promise<AdminCustomerTakeActionResponse> => {
  const response = await apiClient.post<AdminCustomerTakeActionResponse>(
    '/admin_customer/take_action',
    {
      api_token: data.api_token,
      user_id: data.user_id,
      status: data.status,
    }
  );
  return response.data;
};

/**
 * Delete a customer account (admin).
 * POST https://fireguide.attoexasolutions.com/api/admin_customer/delete
 */
export interface AdminCustomerDeleteRequest {
  api_token: string;
  user_id: number;
}

export const adminCustomerDelete = async (
  data: AdminCustomerDeleteRequest
): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.post<{ success: boolean; message: string }>(
    '/admin_customer/delete',
    { api_token: data.api_token, user_id: data.user_id }
  );
  return response.data;
};

/**
 * Send email to a customer (admin).
 * POST https://fireguide.attoexasolutions.com/api/admin_customer/send_email
 */
export interface AdminCustomerSendEmailRequest {
  api_token: string;
  user_id: number;
  subject: string;
  body: string;
}

export const adminCustomerSendEmail = async (
  data: AdminCustomerSendEmailRequest
): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.post<{ success: boolean; message: string }>(
    '/admin_customer/send_email',
    { api_token: data.api_token, user_id: data.user_id, subject: data.subject, body: data.body }
  );
  return response.data;
};

/**
 * Resolve a customer dispute (admin).
 * POST https://fireguide.attoexasolutions.com/api/admin_customer/resolve_dispute
 */
export interface AdminCustomerResolveDisputeRequest {
  api_token: string;
  user_id: number;
  decision: string;
  message?: string;
}

export const adminCustomerResolveDispute = async (
  data: AdminCustomerResolveDisputeRequest
): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.post<{ success: boolean; message: string }>(
    '/admin_customer/resolve_dispute',
    { api_token: data.api_token, user_id: data.user_id, decision: data.decision, message: data.message }
  );
  return response.data;
};

// Admin professional summary (Professional Management page)
// Response has nested data.data
export interface AdminProfessionalSummaryData {
  total_professional: number;
  approved_professional: number;
  pending_professional: number;
  suspend_professional: number;
}

export interface AdminProfessionalSummaryResponse {
  success: boolean;
  message: string;
  data: { data: AdminProfessionalSummaryData };
}

/**
 * Fetch admin professional dashboard summary
 * POST https://fireguide.attoexasolutions.com/api/admin_professional/summary
 */
export const getAdminProfessionalSummary = async (
  data: AdminOverviewSummaryRequest
): Promise<AdminProfessionalSummaryResponse> => {
  const response = await apiClient.post<AdminProfessionalSummaryResponse>(
    '/admin_professional/summary',
    { api_token: data.api_token }
  );
  return response.data;
};

// Admin professionals list (Professional Management cards)
export interface AdminProfessionalListCertificate {
  id?: number;
  name?: string;
  evidence?: string;
}

export interface AdminProfessionalListExperience {
  id?: number;
  experience_name?: string;
  evidence?: string;
}

export interface AdminProfessionalListItem {
  id: number;
  name: string;
  business_name: string;
  about: string;
  email: string;
  number: string;
  business_location: string;
  status: string;
  post_code: string;
  response_time: string | null;
  booking?: number | string | null;
  completed_booking?: number | string | null;
  rating: number | null;
  review: number | null;
  professional_image: string | null;
  services: string[];
  /** Certificates shown on list cards */
  certificates?: AdminProfessionalListCertificate[];
  /** Experience / expertise rows shown on list cards */
  experience?: AdminProfessionalListExperience[];
  longitude?: number | null;
  latitude?: number | null;
  created_at: string;
  updated_at: string;
}

export interface AdminProfessionalListResponse {
  success: boolean;
  message: string;
  data: AdminProfessionalListItem[];
}

/**
 * Fetch admin professionals list
 * POST https://fireguide.attoexasolutions.com/api/admin_professional/get
 */
export const getAdminProfessionals = async (
  data: AdminOverviewSummaryRequest
): Promise<AdminProfessionalListResponse> => {
  const response = await apiClient.post<AdminProfessionalListResponse>(
    '/admin_professional/get',
    { api_token: data.api_token }
  );
  return response.data;
};

// Admin professional single (Professional Profile modal)
export interface AdminProfessionalCertificate {
  id: number;
  name: string;
  evidence: string;
  status: string;
}

export interface AdminProfessionalService {
  id: number;
  name: string;
  status: string;
}

export interface AdminProfessionalExperience {
  id: number;
  experience_name?: string;
  years?: string | number | null;
  description?: string | null;
  evidence?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AdminProfessionalInsuranceItem {
  id: number;
  title?: string | null;
  price?: string | null;
  provider_name?: string | null;
  document?: string | null;
  status?: string | null;
  expire_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AdminProfessionalIdentityItem {
  id: number;
  professional_id?: number;
  file?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AdminProfessionalMembershipItem {
  id: number;
  organization_name: string;
  membership_type?: string | null;
  reference_id?: string | null;
  member_since?: string | null;
  note?: string | null;
  evidence?: string | null;
  logo?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AdminProfessionalSingleData {
  id: number;
  name: string;
  business_name: string;
  about: string;
  email: string;
  number: string;
  business_location: string;
  longitude: number | null;
  latitude: number | null;
  status: string;
  post_code: string;
  response_time: string | null;
  booking?: number | string | null;
  completed_booking?: number | string | null;
  rating: number | null;
  review: number | null;
  radius?: string | number | null;
  professional_image: string | null;
  services: AdminProfessionalService[];
  certificates: AdminProfessionalCertificate[];
  /** API returns `experience`; some payloads use `experiences`. */
  experience?: AdminProfessionalExperience[];
  experiences?: AdminProfessionalExperience[];
  insurance?: AdminProfessionalInsuranceItem[];
  insurances?: AdminProfessionalInsuranceItem[];
  insurance_coverages?: AdminProfessionalInsuranceItem[];
  identity?: AdminProfessionalIdentityItem[];
  identities?: AdminProfessionalIdentityItem[];
  professional_identity?: AdminProfessionalIdentityItem | AdminProfessionalIdentityItem[];
  membership?: AdminProfessionalMembershipItem[];
  memberships?: AdminProfessionalMembershipItem[];
  created_at: string;
  updated_at: string;
}

export interface AdminProfessionalSingleResponse {
  success: boolean;
  message: string;
  data: AdminProfessionalSingleData;
}

export interface AdminProfessionalSingleRequest {
  api_token: string;
  professional_id: number;
}

/**
 * Fetch single professional details (for profile modal)
 * POST https://fireguide.attoexasolutions.com/api/admin_professional/single-get
 */
export const getAdminProfessionalSingle = async (
  data: AdminProfessionalSingleRequest
): Promise<AdminProfessionalSingleResponse> => {
  const response = await apiClient.post<AdminProfessionalSingleResponse>(
    '/admin_professional/single-get',
    {
      api_token: data.api_token,
      professional_id: data.professional_id,
    }
  );
  return response.data;
};

export interface AdminProfessionalUpdateRequest {
  api_token: string;
  /** Professional row id (admin list / single-get). */
  id: number;
  /** Same as `id` — sent for APIs that expect `professional_id`. */
  professional_id?: number;
  name?: string;
  business_name?: string;
  about?: string;
  email?: string;
  number?: string;
  business_location?: string;
  post_code?: string;
  radius?: string;
  response_time?: string;
  rating?: string;
  review?: string;
}

export interface AdminProfessionalUploadImageResponse {
  success: boolean;
  message: string;
  data?: {
    professional_image?: string;
    image_url?: string;
  };
}

export interface AdminProfessionalUpdateResponse {
  success: boolean;
  message: string;
  data?: AdminProfessionalSingleData;
}

function normalizeAdminProfessionalUpdateResponse(raw: unknown): AdminProfessionalUpdateResponse {
  if (raw == null || typeof raw !== "object") {
    return { success: false, message: "Invalid response from server" };
  }
  const r = raw as Record<string, unknown>;
  const message = typeof r.message === "string" ? r.message : "";
  const success =
    r.success === true ||
    r.status === true ||
    r.status === "success" ||
    (typeof r.status === "string" && r.status.toLowerCase() === "success");
  const failed =
    r.success === false ||
    r.status === false ||
    r.status === "failed" ||
    r.status === "error";
  return {
    success: failed ? false : success || Boolean(message && !failed),
    message,
    data: r.data as AdminProfessionalSingleData | undefined,
  };
}

function isProfessionalNotFoundMessage(message: string): boolean {
  return /professional not found/i.test(message);
}

function buildProfessionalUpdatePayload(data: AdminProfessionalUpdateRequest) {
  const professionalId = data.professional_id ?? data.id;
  const location = data.business_location?.trim();
  return {
    api_token: data.api_token,
    id: professionalId,
    professional_id: professionalId,
    ...(data.name != null && { name: data.name }),
    ...(data.business_name != null && { business_name: data.business_name }),
    ...(data.about != null && { about: data.about }),
    ...(data.email != null && { email: data.email }),
    ...(data.number != null && { number: data.number }),
    ...(location && { business_location: location, location }),
    ...(data.post_code != null && { post_code: data.post_code }),
    ...(data.radius != null && { radius: data.radius }),
    ...(data.response_time != null && { response_time: data.response_time }),
    ...(data.rating != null && { rating: data.rating }),
    ...(data.review != null && { review: data.review }),
  };
}

function buildAdminProfessionalLegacyUpdatePayload(data: AdminProfessionalUpdateRequest) {
  const professionalId = data.professional_id ?? data.id;
  return {
    api_token: data.api_token,
    professional_id: professionalId,
    ...(data.name != null && { name: data.name }),
    ...(data.business_name != null && { business_name: data.business_name }),
    ...(data.about != null && { about: data.about }),
    ...(data.email != null && { email: data.email }),
    ...(data.number != null && { number: data.number }),
    ...(data.business_location != null && { business_location: data.business_location }),
    ...(data.post_code != null && { post_code: data.post_code }),
    ...(data.response_time != null && { response_time: data.response_time }),
  };
}

/**
 * Update professional profile fields (admin edit modal).
 * Tries POST /professional/update first; falls back to POST /admin_professional/update
 * when the admin token cannot resolve a professional on the shared route.
 */
export const adminProfessionalUpdate = async (
  data: AdminProfessionalUpdateRequest
): Promise<AdminProfessionalUpdateResponse> => {
  const primaryPayload = buildProfessionalUpdatePayload(data);

  try {
    const response = await apiClient.post<unknown>('/professional/update', primaryPayload);
    const normalized = normalizeAdminProfessionalUpdateResponse(response.data);
    if (normalized.success || !isProfessionalNotFoundMessage(normalized.message)) {
      return normalized;
    }
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error;
    const msg =
      (error.response?.data as { message?: string } | undefined)?.message ?? error.message;
    if (!isProfessionalNotFoundMessage(msg)) {
      throw error;
    }
  }

  const fallbackResponse = await apiClient.post<unknown>(
    '/admin_professional/update',
    buildAdminProfessionalLegacyUpdatePayload(data)
  );
  return normalizeAdminProfessionalUpdateResponse(fallbackResponse.data);
};

/**
 * Upload / replace a professional profile image (admin)
 * POST /admin_professional/upload-image
 * Body: form-data — api_token, professional_id, file
 */
export const adminProfessionalUploadProfileImage = async (data: {
  api_token: string;
  professional_id: number;
  file: File;
}): Promise<AdminProfessionalUploadImageResponse> => {
  const formData = new FormData();
  formData.append('api_token', data.api_token);
  formData.append('professional_id', String(data.professional_id));
  formData.append('file', data.file);
  const response = await apiClient.post<AdminProfessionalUploadImageResponse>(
    '/admin_professional/upload-image',
    formData
  );
  return response.data;
};

/** Professional status for take_action: "approved" | "pending" | "rejected" */
export type AdminProfessionalStatus = 'approved' | 'pending' | 'rejected';

export interface AdminProfessionalTakeActionRequest {
  api_token: string;
  professional_id: number;
  status: AdminProfessionalStatus;
}

export interface AdminProfessionalTakeActionResponse {
  success: boolean;
  message: string;
  data?: { professional_id: number; new_status: string };
}

/**
 * Update professional status (approved / pending / rejected)
 * POST https://fireguide.attoexasolutions.com/api/admin_professional/take_action
 */
export const adminProfessionalTakeAction = async (
  data: AdminProfessionalTakeActionRequest
): Promise<AdminProfessionalTakeActionResponse> => {
  const response = await apiClient.post<AdminProfessionalTakeActionResponse>(
    '/admin_professional/take_action',
    {
      api_token: data.api_token,
      professional_id: data.professional_id,
      status: data.status,
    }
  );
  return response.data;
};

/** Certificate status for change-certificate-status: "verified" | "rejected" | "pending" */
export type AdminCertificateStatus = 'verified' | 'rejected' | 'pending';

export interface AdminProfessionalChangeCertificateStatusRequest {
  api_token: string;
  professional_id: number;
  certificate_id: number;
  status: AdminCertificateStatus;
}

export interface AdminProfessionalChangeCertificateStatusResponse {
  success: boolean;
  message: string;
  data?: {
    professional_name: string;
    certificate: { id: number; name: string; status: string; created_at: string; updated_at: string };
  };
}

/**
 * Change certificate/evidence status (verified / rejected / pending)
 * POST https://fireguide.attoexasolutions.com/api/admin_professional/change-certificate-status
 */
export const adminProfessionalChangeCertificateStatus = async (
  data: AdminProfessionalChangeCertificateStatusRequest
): Promise<AdminProfessionalChangeCertificateStatusResponse> => {
  const response = await apiClient.post<AdminProfessionalChangeCertificateStatusResponse>(
    '/admin_professional/change-certificate-status',
    {
      api_token: data.api_token,
      professional_id: data.professional_id,
      certificate_id: data.certificate_id,
      status: data.status,
    }
  );
  return response.data;
};

/** Service status for change-service-status: "approved" | "rejected" */
export type AdminServiceStatus = 'approved' | 'rejected';

export interface AdminProfessionalChangeServiceStatusRequest {
  api_token: string;
  professional_id: number;
  selected_service_id: number;
  status: AdminServiceStatus;
}

export interface AdminProfessionalChangeServiceStatusResponse {
  success: boolean;
  message: string;
  data?: {
    professional_name: string;
    service: { selected_service_id: number; service_name: string; status: string; created_at: string; updated_at: string };
  };
}

/**
 * Change service status (approved / rejected)
 * POST https://fireguide.attoexasolutions.com/api/admin_professional/change-servicce-status
 * Note: Backend uses "servicce" (double c) in the path
 */
export const adminProfessionalChangeServiceStatus = async (
  data: AdminProfessionalChangeServiceStatusRequest
): Promise<AdminProfessionalChangeServiceStatusResponse> => {
  const response = await apiClient.post<AdminProfessionalChangeServiceStatusResponse>(
    '/admin_professional/change-servicce-status',
    {
      api_token: data.api_token,
      professional_id: data.professional_id,
      selected_service_id: data.selected_service_id,
      status: data.status,
    }
  );
  return response.data;
};

/** Experience status for change/experience-status: "verified" | "rejected" | "pending" */
export type AdminExperienceStatus = 'verified' | 'rejected' | 'pending';

export interface AdminProfessionalChangeExperienceStatusRequest {
  api_token: string;
  professional_id: number;
  experience_id: number;
  status: AdminExperienceStatus;
}

export interface AdminProfessionalChangeExperienceStatusResponse {
  success: boolean;
  message: string;
  data?: {
    professional_name?: string;
    experience?: { id: number; status: string; created_at?: string; updated_at?: string };
  };
}

/**
 * Change professional experience status (verified / rejected / pending)
 * POST https://fireguide.attoexasolutions.com/api/change/experience-status
 */
export const adminProfessionalChangeExperienceStatus = async (
  data: AdminProfessionalChangeExperienceStatusRequest
): Promise<AdminProfessionalChangeExperienceStatusResponse> => {
  const response = await apiClient.post<AdminProfessionalChangeExperienceStatusResponse>(
    '/change/experience-status',
    {
      api_token: data.api_token,
      professional_id: data.professional_id,
      experience_id: data.experience_id,
      status: data.status,
    }
  );
  return response.data;
};

export interface AdminInsuranceStatusActionRequest {
  api_token: string;
  insurance_id: number;
}

export interface AdminInsuranceStatusActionResponse {
  success?: boolean;
  status?: boolean | string;
  message?: string;
  data?: unknown;
}

/** POST /insurance-coverage/approved — body: api_token, insurance_id */
export const adminApproveInsuranceCoverage = async (
  data: AdminInsuranceStatusActionRequest
): Promise<AdminInsuranceStatusActionResponse> => {
  const response = await apiClient.post<AdminInsuranceStatusActionResponse>(
    '/insurance-coverage/approved',
    {
      api_token: data.api_token,
      insurance_id: data.insurance_id,
    }
  );
  return response.data;
};

/** POST /insurance-coverage/reject — body: api_token, insurance_id */
export const adminRejectInsuranceCoverage = async (
  data: AdminInsuranceStatusActionRequest
): Promise<AdminInsuranceStatusActionResponse> => {
  const response = await apiClient.post<AdminInsuranceStatusActionResponse>(
    '/insurance-coverage/reject',
    {
      api_token: data.api_token,
      insurance_id: data.insurance_id,
    }
  );
  return response.data;
};

export interface AdminMembershipStatusActionRequest {
  api_token: string;
  membership_id: number;
}

export interface AdminMembershipStatusActionResponse {
  success?: boolean;
  status?: boolean | string;
  message?: string;
  data?: unknown;
}

/** POST /admin/approved/membership — body: api_token, membership_id */
export const adminApproveMembership = async (
  data: AdminMembershipStatusActionRequest
): Promise<AdminMembershipStatusActionResponse> => {
  const response = await apiClient.post<AdminMembershipStatusActionResponse>(
    '/admin/approved/membership',
    {
      api_token: data.api_token,
      membership_id: data.membership_id,
    }
  );
  return response.data;
};

/** POST /admin/reject/membership — body: api_token, membership_id */
export const adminRejectMembership = async (
  data: AdminMembershipStatusActionRequest
): Promise<AdminMembershipStatusActionResponse> => {
  const response = await apiClient.post<AdminMembershipStatusActionResponse>(
    '/admin/reject/membership',
    {
      api_token: data.api_token,
      membership_id: data.membership_id,
    }
  );
  return response.data;
};

export interface AdminIdentityStatusActionRequest {
  api_token: string;
  identity_id: number;
}

export interface AdminIdentityStatusActionResponse {
  success?: boolean;
  status?: boolean | string;
  message?: string;
  data?: unknown;
}

/** POST /admin_professional/approved-identity — body: api_token, identity_id */
export const adminApproveProfessionalIdentity = async (
  data: AdminIdentityStatusActionRequest
): Promise<AdminIdentityStatusActionResponse> => {
  const response = await apiClient.post<AdminIdentityStatusActionResponse>(
    '/admin_professional/approved-identity',
    {
      api_token: data.api_token,
      identity_id: data.identity_id,
    }
  );
  return response.data;
};

/** POST /admin_professional/reject-identity — body: api_token, identity_id */
export const adminRejectProfessionalIdentity = async (
  data: AdminIdentityStatusActionRequest
): Promise<AdminIdentityStatusActionResponse> => {
  const response = await apiClient.post<AdminIdentityStatusActionResponse>(
    '/admin_professional/reject-identity',
    {
      api_token: data.api_token,
      identity_id: data.identity_id,
    }
  );
  return response.data;
};

// Admin bookings list (Booking Management page)
export interface AdminBookingListItem {
  id: number;
  selected_date: string;
  selected_time: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  price: string;
  property_address: string;
  city: string;
  post_code: string;
  status: string;
  ref_code: string;
  professional_name: string;
  professional_email?: string | null;
  professional_phone?: string | null;
  service_name: string | null;
  created_at: string;
  payment_status?: string | null;
  platform_commission?: string | number | null;
  professional_payout?: string | number | null;
  selected_service?: {
    type?: string;
    data?: Record<string, { id?: number; value?: string } | string | number | null>;
  } | null;
  custom_id?: string | number | null;
  custom_quote_details?: {
    id?: number;
    service_id?: number;
    request_data?: string | Record<string, unknown>;
    status?: string;
    [key: string]: unknown;
  } | null;
}

export interface AdminBookingListResponse {
  success: boolean;
  message: string;
  data: AdminBookingListItem[];
}

/**
 * Fetch admin bookings list
 * POST https://fireguide.attoexasolutions.com/api/admin_bookings/get
 */
export const getAdminBookings = async (
  data: AdminOverviewSummaryRequest
): Promise<AdminBookingListResponse> => {
  const response = await apiClient.post<AdminBookingListResponse>(
    '/admin_bookings/get',
    { api_token: data.api_token }
  );
  return response.data;
};

// Admin bookings summary (Booking Management stat cards)
export interface AdminBookingsSummaryData {
  total_booking: number;
  pending_booking: number;
  confirmed_booking: number;
  completed_booking: number;
  cancel_booking: number;
}

export interface AdminBookingsSummaryResponse {
  success: boolean;
  message: string;
  data: { data: AdminBookingsSummaryData };
}

/**
 * Fetch admin bookings summary
 * POST https://fireguide.attoexasolutions.com/api/admin_bookings/summary
 */
export const getAdminBookingsSummary = async (
  data: AdminOverviewSummaryRequest
): Promise<AdminBookingsSummaryResponse> => {
  const response = await apiClient.post<AdminBookingsSummaryResponse>(
    '/admin_bookings/summary',
    { api_token: data.api_token }
  );
  return response.data;
};

export interface AdminCancelBookingRequest {
  api_token: string;
  booking_id: number;
  cancellation_reason?: string;
  cancellation_note?: string;
}

export interface AdminCancelBookingResponse {
  success?: boolean;
  status?: string | boolean;
  message?: string;
}

/**
 * Cancel a booking from admin dashboard
 * POST /admin_dashboard/cancel_booking
 */
export const cancelAdminBooking = async (
  data: AdminCancelBookingRequest
): Promise<AdminCancelBookingResponse> => {
  const response = await apiClient.post<AdminCancelBookingResponse>(
    '/admin_dashboard/cancel_booking',
    {
      api_token: data.api_token,
      booking_id: data.booking_id,
      ...(data.cancellation_reason ? { cancellation_reason: data.cancellation_reason } : {}),
      ...(data.cancellation_note?.trim()
        ? { cancellation_note: data.cancellation_note.trim() }
        : {}),
    }
  );
  return response.data;
};

// Admin reviews summary (Review Management stat cards)
export interface AdminReviewsSummaryData {
  total_review: number;
  pending_review: number;
  approved_review: number;
  rejected_review: number;
}

export interface AdminReviewsSummaryResponse {
  success?: boolean;
  status?: string | boolean;
  message?: string;
  data?: AdminReviewsSummaryData | Record<string, unknown>;
}

function pickAdminReviewsSummaryNumber(
  block: Record<string, unknown>,
  keys: string[]
): number {
  for (const key of keys) {
    const raw = block[key];
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string") {
      const n = parseInt(raw, 10);
      if (!Number.isNaN(n)) return n;
    }
  }
  return 0;
}

/** Normalize POST /admin-reviews/summary payload into stat card values. */
export function normalizeAdminReviewsSummary(payload: unknown): AdminReviewsSummaryData | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;

  const success =
    root.success === true ||
    root.status === true ||
    root.status === "success" ||
    root.data != null;
  if (!success && root.data == null) return null;

  let block: Record<string, unknown> = root;
  if (root.data != null && typeof root.data === "object" && !Array.isArray(root.data)) {
    block = root.data as Record<string, unknown>;
  }

  return {
    total_review: pickAdminReviewsSummaryNumber(block, [
      "total_review",
      "total_reviews",
      "total",
    ]),
    pending_review: pickAdminReviewsSummaryNumber(block, [
      "pending_review",
      "pending_reviews",
      "pending",
    ]),
    approved_review: pickAdminReviewsSummaryNumber(block, [
      "approved_review",
      "approved_reviews",
      "approved",
    ]),
    rejected_review: pickAdminReviewsSummaryNumber(block, [
      "rejected_review",
      "rejected_reviews",
      "rejected",
    ]),
  };
}

/**
 * Fetch admin reviews summary (stat cards).
 * POST /admin-reviews/summary — body: { api_token }
 */
export const getAdminReviewsSummary = async (
  data: AdminOverviewSummaryRequest
): Promise<AdminReviewsSummaryData | null> => {
  const response = await apiClient.post<AdminReviewsSummaryResponse>(
    "/admin-reviews/summary",
    { api_token: data.api_token }
  );
  return normalizeAdminReviewsSummary(response.data);
};

// Admin reviews list (Review Management - individual review cards)
export interface AdminReviewListItem {
  id: number;
  reviewer_name: string;
  reviewer_email: string;
  rating: string;
  feedback: string;
  status: string;
  professional_name: string;
  professional_email: string;
  ref_code?: string;
  booking_ref?: string;
  /** For admin “Contact professional” (POST /contact-professional/create); number or numeric string from API. */
  professional_id?: number | string;
  professional_user_id?: number | string;
  professional?: { id?: number };
  services: string[];
  created_at: string;
}

export interface AdminReviewsListResponse {
  success: boolean;
  data: AdminReviewListItem[];
}

/**
 * Fetch admin reviews list
 * POST https://fireguide.attoexasolutions.com/api/admin-reviews/list
 */
export const getAdminReviewsList = async (
  data: AdminOverviewSummaryRequest
): Promise<AdminReviewsListResponse> => {
  const response = await apiClient.post<AdminReviewsListResponse>(
    '/admin-reviews/list',
    { api_token: data.api_token }
  );
  return response.data;
};

/** POST /admin-reviews/approved — body: api_token, id (review id). */
export interface AdminReviewApproveRequest {
  api_token: string;
  id: number;
}

export interface AdminReviewApproveResponse {
  success?: boolean;
  status?: string | boolean;
  message?: string;
  data?: unknown;
}

export const approveAdminReview = async (
  data: AdminReviewApproveRequest
): Promise<AdminReviewApproveResponse> => {
  const response = await apiClient.post<AdminReviewApproveResponse>('/admin-reviews/approved', {
    api_token: data.api_token,
    id: data.id,
  });
  return response.data;
};

/** POST /admin-reviews/reject — body: api_token, id (review id). */
export type AdminReviewRejectRequest = AdminReviewApproveRequest;
export type AdminReviewRejectResponse = AdminReviewApproveResponse;

export const rejectAdminReview = async (
  data: AdminReviewRejectRequest
): Promise<AdminReviewRejectResponse> => {
  const response = await apiClient.post<AdminReviewRejectResponse>('/admin-reviews/reject', {
    api_token: data.api_token,
    id: data.id,
  });
  return response.data;
};

/** POST /contact-professional/create — admin message to a professional. */
export interface ContactProfessionalCreateRequest {
  api_token: string;
  professional_id: number;
  message: string;
}

export interface ContactProfessionalCreateResponse {
  success?: boolean;
  status?: boolean | string;
  message?: string;
  data?: unknown;
}

export const createContactProfessionalMessage = async (
  data: ContactProfessionalCreateRequest
): Promise<ContactProfessionalCreateResponse> => {
  const response = await apiClient.post<ContactProfessionalCreateResponse>(
    '/contact-professional/create',
    {
      api_token: data.api_token,
      professional_id: data.professional_id,
      message: data.message,
    }
  );
  return response.data;
};

/** POST /contact-customer/create — admin message to a customer (reviewer). */
export interface ContactCustomerCreateRequest {
  api_token: string;
  /** Reviewer email from admin reviews list (`reviewer_email`). */
  customer_email: string;
  message: string;
}

export interface ContactCustomerCreateResponse {
  success?: boolean;
  status?: boolean | string;
  message?: string;
  data?: unknown;
}

export const createContactCustomerMessage = async (
  data: ContactCustomerCreateRequest
): Promise<ContactCustomerCreateResponse> => {
  const response = await apiClient.post<ContactCustomerCreateResponse>(
    '/contact-customer/create',
    {
      api_token: data.api_token,
      customer_email: data.customer_email,
      message: data.message,
    }
  );
  return response.data;
};

// Admin notification details (Notifications page - cards + list)
export interface AdminNotificationCards {
  total_notifications: number;
  unread: number;
  /** @deprecated Prefer `payments`; kept for older API responses. */
  critical?: number;
  /** Count for the Payments summary card (`/admin/notifications/summary` or legacy details). */
  payments?: number;
  system_alerts: number;
}

export interface AdminNotificationItem {
  id: number;
  title: string;
  priority: string;
  message: string;
  category: string;
  /** Raw API category/type before UI coercion (e.g. identity, insurance). */
  source_category?: string;
  is_read: number;
  date: string;
  actions: { can_mark_read: boolean; can_delete: boolean };
}

function isAdminNotifRecord(x: unknown): x is Record<string, unknown> {
  return x != null && typeof x === "object" && !Array.isArray(x);
}

function adminNotifStrField(r: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = r[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

/** Pull array from typical Laravel envelopes: `data`, `data.data`, `data.notifications`, `notifications`. */
export function extractAdminNotificationListRows(body: unknown): unknown[] {
  if (body == null) return [];
  if (Array.isArray(body)) return body;
  if (!isAdminNotifRecord(body)) return [];
  if (Array.isArray(body.data)) return body.data;
  const nested = body.data;
  if (isAdminNotifRecord(nested)) {
    if (Array.isArray(nested.data)) return nested.data;
    if (Array.isArray(nested.notifications)) return nested.notifications;
  }
  if (Array.isArray(body.notifications)) return body.notifications;
  return [];
}

function coerceAdminListPriority(raw: unknown): string {
  const v = String(raw ?? "medium").toLowerCase();
  if (v === "critical" || v === "urgent") return "critical";
  if (v === "high") return "high";
  if (v === "low") return "low";
  return "medium";
}

function normalizeAdminNotificationListRow(row: unknown): AdminNotificationItem | null {
  if (!isAdminNotifRecord(row)) return null;
  const idRaw = row.id ?? row.notification_id;
  const id = typeof idRaw === "number" && Number.isFinite(idRaw) ? idRaw : parseInt(String(idRaw ?? ""), 10);
  if (!Number.isFinite(id) || id <= 0) return null;
  const title = adminNotifStrField(row, "title", "subject", "heading", "name") || "Notification";
  const message = adminNotifStrField(row, "message", "content", "body", "description", "text", "details");
  const sourceCategory = adminNotifStrField(row, "category", "type", "notification_type");
  const category = sourceCategory || "general";
  const date =
    adminNotifStrField(row, "date", "created_at", "sent_at", "updated_at") ||
    (typeof row.created_at === "string" ? row.created_at : "");
  const read =
    row.is_read === true ||
    row.is_read === 1 ||
    row.is_read === "1" ||
    row.read === true ||
    row.read === 1;
  const canMark = row.can_mark_read !== false && row.actions_can_mark_read !== false;
  const canDel = row.can_delete !== false && row.actions_can_delete !== false;
  return {
    id,
    title,
    priority: coerceAdminListPriority(row.priority),
    message,
    category,
    source_category: sourceCategory || undefined,
    is_read: read ? 1 : 0,
    date,
    actions: { can_mark_read: canMark, can_delete: canDel },
  };
}

/**
 * POST list endpoints for admin Notifications UI.
 * Paths: `/notifications` (all), `/admin/notifications/unread`, `/admin/notifications/system`, etc.
 */
export const fetchAdminNotificationsByPath = async (
  api_token: string,
  path: string
): Promise<AdminNotificationItem[]> => {
  const response = await apiClient.post<unknown>(path, { api_token });
  const rows = extractAdminNotificationListRows(response.data);
  const out: AdminNotificationItem[] = [];
  for (const row of rows) {
    const n = normalizeAdminNotificationListRow(row);
    if (n) out.push(n);
  }
  return out;
};

export interface AdminNotificationDetailsData {
  cards: AdminNotificationCards;
  notifications: AdminNotificationItem[];
}

export interface AdminNotificationDetailsResponse {
  status: boolean;
  data: AdminNotificationDetailsData;
}

/**
 * Fetch admin notification details (summary cards + notification list)
 * POST https://fireguide.attoexasolutions.com/api/admin_notification/details
 */
export const getAdminNotificationDetails = async (
  data: AdminOverviewSummaryRequest
): Promise<AdminNotificationDetailsResponse> => {
  const response = await apiClient.post<AdminNotificationDetailsResponse>(
    '/admin_notification/details',
    { api_token: data.api_token }
  );
  return response.data;
};

function readNonNegativeSummaryInt(r: Record<string, unknown>, keys: string[]): number {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, Math.floor(v));
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v);
      if (Number.isFinite(n)) return Math.max(0, Math.floor(n));
    }
  }
  return 0;
}

/** Unwrap Laravel-style `{ data }` / nested `data` for summary payloads. */
function extractAdminNotificationsSummaryRecord(body: unknown): Record<string, unknown> | null {
  if (!isAdminNotifRecord(body)) return null;
  const layers: Record<string, unknown>[] = [body];
  const d1 = body.data;
  if (isAdminNotifRecord(d1)) {
    layers.push(d1);
    const d2 = d1.data;
    if (isAdminNotifRecord(d2)) layers.push(d2);
  }
  const hintKeys = [
    'total_notification',
    'total_notifications',
    'total',
    'unread_notification',
    'unread',
    'payment_notification',
    'payments',
    'critical',
    'system_notification',
    'system_alerts',
    'system',
  ] as const;
  for (const layer of layers) {
    if (hintKeys.some((k) => k in layer && layer[k] != null)) return layer;
  }
  if (isAdminNotifRecord(d1)) return d1;
  return null;
}

function normalizeAdminNotificationsSummaryCards(payload: Record<string, unknown>): AdminNotificationCards {
  const total_notifications = readNonNegativeSummaryInt(payload, [
    'total_notification',
    'total_notifications',
    'total',
    'total_count',
    'all',
  ]);
  const unread = readNonNegativeSummaryInt(payload, [
    'unread_notification',
    'unread',
    'unread_count',
    'unread_notifications',
    'unread_notifications_count',
    'total_unread',
    'notifications_unread',
    'unRead',
  ]);
  const paymentsRaw = readNonNegativeSummaryInt(payload, [
    'payment_notification',
    'payments',
    'payment',
    'payment_notifications',
    'payments_count',
  ]);
  const criticalRaw = readNonNegativeSummaryInt(payload, ['critical']);
  const paymentsMerged = paymentsRaw || criticalRaw;
  const system_alerts = readNonNegativeSummaryInt(payload, [
    'system_notification',
    'system_alerts',
    'system',
    'system_count',
    'system_notifications',
  ]);
  return {
    total_notifications,
    unread,
    payments: paymentsMerged,
    ...(criticalRaw > 0 && paymentsRaw === 0 ? { critical: criticalRaw } : {}),
    system_alerts,
  };
}

/**
 * Summary stat cards for admin Notifications (Total, Unread, Payments, System).
 * POST `/admin/notifications/summary` with `{ api_token }`.
 */
export const getAdminNotificationsSummary = async (
  data: AdminOverviewSummaryRequest
): Promise<AdminNotificationCards | null> => {
  const response = await apiClient.post<unknown>('/admin/notifications/summary', {
    api_token: data.api_token,
  });
  const body = response.data;
  if (isAdminNotifRecord(body)) {
    if (body.success === false || body.status === false) return null;
  }
  const record = extractAdminNotificationsSummaryRecord(body);
  if (!record) return null;
  return normalizeAdminNotificationsSummaryCards(record);
};

function throwIfAdminNotificationMutationFailed(body: unknown): void {
  if (!isAdminNotifRecord(body)) return;
  if (body.success === false || body.status === false) {
    const msg =
      typeof body.message === 'string'
        ? body.message
        : typeof body.error === 'string'
          ? body.error
          : 'Request failed';
    throw new Error(msg);
  }
}

export interface AdminNotificationIdRequest extends AdminOverviewSummaryRequest {
  notification_id: number;
}

/** POST `/admin/notifications/mark_as_read_all` — body `{ api_token }`. */
export const adminMarkAllNotificationsAsRead = async (
  data: AdminOverviewSummaryRequest
): Promise<void> => {
  const response = await apiClient.post<unknown>('/admin/notifications/mark_as_read_all', {
    api_token: data.api_token,
  });
  throwIfAdminNotificationMutationFailed(response.data);
};

/** POST `/notifications/all_delete` — body `{ api_token }` (admin clear-all). */
export const adminClearAllNotifications = async (data: AdminOverviewSummaryRequest): Promise<void> => {
  const response = await apiClient.post<unknown>('/notifications/all_delete', {
    api_token: data.api_token,
  });
  throwIfAdminNotificationMutationFailed(response.data);
};

/** POST `/admin/notifications/mark_as_read` — body `{ api_token, notification_id }`. */
export const adminMarkNotificationAsRead = async (data: AdminNotificationIdRequest): Promise<void> => {
  const response = await apiClient.post<unknown>('/admin/notifications/mark_as_read', {
    api_token: data.api_token,
    notification_id: data.notification_id,
  });
  throwIfAdminNotificationMutationFailed(response.data);
};

/** POST `/admin/notifications/single-delete` — body `{ api_token, notification_id }`. */
export const adminDeleteSingleNotification = async (data: AdminNotificationIdRequest): Promise<void> => {
  const response = await apiClient.post<unknown>('/admin/notifications/single-delete', {
    api_token: data.api_token,
    notification_id: data.notification_id,
  });
  throwIfAdminNotificationMutationFailed(response.data);
};

// Admin payment summary (Payment Management stat cards)
export interface AdminPaymentSummaryData {
  total_revenue: number;
  platform_commission: string;
  commission_rate: string;
  pending_payouts: number;
  total_transactions: number;
}

export interface AdminPaymentSummaryResponse {
  success: boolean;
  data: AdminPaymentSummaryData;
}

/**
 * Fetch admin payment summary
 * POST https://fireguide.attoexasolutions.com/api/admin-payment/summary
 */
export const getAdminPaymentSummary = async (
  data: AdminOverviewSummaryRequest
): Promise<AdminPaymentSummaryResponse> => {
  const response = await apiClient.post<AdminPaymentSummaryResponse>(
    '/admin-payment/summary',
    { api_token: data.api_token }
  );
  return response.data;
};

// Admin payment list (Payment Management table)
export interface AdminPaymentListItem {
  reference: string;
  date: string;
  Parties: string;
  services: { id: number; name: string }[];
  amount: string;
  commission: { rate: string; amount: string };
  professional_earning: string;
  payment_status: string;
  booking_status: string;
}

export interface AdminPaymentListResponse {
  success: boolean;
  data: AdminPaymentListItem[];
}

/**
 * Fetch admin payment list
 * POST https://fireguide.attoexasolutions.com/api/admin-payment/list
 */
export const getAdminPaymentList = async (
  data: AdminOverviewSummaryRequest
): Promise<AdminPaymentListResponse> => {
  const response = await apiClient.post<AdminPaymentListResponse>(
    '/admin-payment/list',
    { api_token: data.api_token }
  );
  return response.data;
};

export type AdminPaymentFilterPeriod = 'all' | 'today' | 'week' | 'month';

export interface AdminPaymentFilterRequest {
  api_token: string;
  filter: AdminPaymentFilterPeriod;
}

/**
 * Filter admin payment list by period.
 * POST https://fireguide.attoexasolutions.com/api/admin-payment/filter
 */
export const getAdminPaymentFilter = async (
  data: AdminPaymentFilterRequest
): Promise<AdminPaymentListResponse> => {
  const response = await apiClient.post<AdminPaymentListResponse>(
    '/admin-payment/filter',
    { api_token: data.api_token, filter: data.filter }
  );
  return response.data;
};

// Platform commission (Commission Settings modal)
export interface PlatformCommissionCreateRequest {
  api_token: string;
  commission_rate: number;
}

export interface PlatformCommissionCreateResponse {
  success: boolean;
  message: string;
  data?: { id: number; commission_rate: string; created_at: string; updated_at: string };
}

/**
 * Create/update platform commission rate
 * POST https://fireguide.attoexasolutions.com/api/platform-commission/create
 */
export const createPlatformCommission = async (
  data: PlatformCommissionCreateRequest
): Promise<PlatformCommissionCreateResponse> => {
  const response = await apiClient.post<PlatformCommissionCreateResponse>(
    '/platform-commission/create',
    { api_token: data.api_token, commission_rate: data.commission_rate }
  );
  return response.data;
};

// Admin SEO settings
export interface AdminSeoSettingsData {
  meta_title: string;
  meta_description: string;
  keywords: string;
  updated_at?: string;
  last_updated_at?: string;
}

export interface AdminSeoSettingsSaveRequest {
  api_token: string;
  meta_title: string;
  meta_description: string;
  keywords: string;
}

export interface AdminSeoSettingsResponse {
  status: boolean;
  message: string;
  data: AdminSeoSettingsData;
}

/**
 * Save admin SEO settings
 * POST https://fireguide.attoexasolutions.com/api/admin/seo/setting
 * Body: { api_token, meta_title, meta_description, keywords }
 */
export const saveAdminSeoSettings = async (
  data: AdminSeoSettingsSaveRequest
): Promise<AdminSeoSettingsResponse> => {
  const body = {
    api_token: data.api_token,
    meta_title: String(data.meta_title ?? "").trim(),
    meta_description: String(data.meta_description ?? "").trim(),
    keywords: String(data.keywords ?? "").trim()
  };
  const response = await apiClient.post<AdminSeoSettingsResponse>(
    '/admin/seo/setting',
    body
  );
  return response.data;
};

/**
 * Fetch admin SEO settings
 * POST https://fireguide.attoexasolutions.com/api/admin/get-seo-setting
 * Body: { api_token }
 */
export const getAdminSeoSettings = async (
  data: AdminOverviewSummaryRequest
): Promise<AdminSeoSettingsResponse> => {
  const response = await apiClient.post<AdminSeoSettingsResponse>(
    '/admin/get-seo-setting',
    { api_token: data.api_token }
  );
  return response.data;
};

// Admin notification settings (Platform Settings - Notification Settings card)
export interface AdminNotificationSettingsData {
  admin_alert_email: string;
  email_notifications: boolean;
  sms_notifications: boolean;
  updated_at?: string;
}

export interface AdminNotificationSettingsSaveRequest {
  api_token: string;
  admin_alert_email: string;
  email_notifications: boolean;
  sms_notifications: boolean;
}

export interface AdminNotificationSettingsResponse {
  status: boolean;
  message?: string;
  data: AdminNotificationSettingsData;
}

/**
 * Save admin notification settings
 * POST https://fireguide.attoexasolutions.com/api/admin/notification/setting
 */
export const saveAdminNotificationSettings = async (
  data: AdminNotificationSettingsSaveRequest
): Promise<AdminNotificationSettingsResponse> => {
  const response = await apiClient.post<AdminNotificationSettingsResponse>(
    '/admin/notification/setting',
    {
      api_token: data.api_token,
      admin_alert_email: data.admin_alert_email,
      email_notifications: data.email_notifications,
      sms_notifications: data.sms_notifications
    }
  );
  return response.data;
};

/**
 * Fetch admin notification settings
 * POST https://fireguide.attoexasolutions.com/api/admin/notification/setting/get
 */
export const getAdminNotificationSettings = async (
  data: AdminOverviewSummaryRequest
): Promise<AdminNotificationSettingsResponse> => {
  const response = await apiClient.post<AdminNotificationSettingsResponse>(
    '/admin/notification/setting/get',
    { api_token: data.api_token }
  );
  return response.data;
};

// Admin system settings (Platform Settings - System Settings card)
export interface AdminSystemSettingsData {
  maintenance_mode: boolean;
  auto_approve_professionals: boolean;
  booking_buffer_time: number;
  cancellation_window: number;
  updated_at?: string;
}

export interface AdminSystemSettingsSaveRequest {
  api_token: string;
  maintenance_mode: boolean;
  auto_approve_professionals: boolean;
  booking_buffer_time: number;
  cancellation_window: number;
}

export interface AdminSystemSettingsResponse {
  status: boolean;
  message?: string;
  data: AdminSystemSettingsData;
}

/**
 * Save admin system settings
 * POST https://fireguide.attoexasolutions.com/api/admin/system/settings
 */
export const saveAdminSystemSettings = async (
  data: AdminSystemSettingsSaveRequest
): Promise<AdminSystemSettingsResponse> => {
  const response = await apiClient.post<AdminSystemSettingsResponse>(
    '/admin/system/settings',
    {
      api_token: data.api_token,
      maintenance_mode: data.maintenance_mode,
      auto_approve_professionals: data.auto_approve_professionals,
      booking_buffer_time: Number(data.booking_buffer_time) || 0,
      cancellation_window: Number(data.cancellation_window) || 0
    }
  );
  return response.data;
};

/**
 * Fetch admin system settings
 * POST https://fireguide.attoexasolutions.com/api/admin/system/control-settings/get
 */
export const getAdminSystemSettings = async (
  data: AdminOverviewSummaryRequest
): Promise<AdminSystemSettingsResponse> => {
  const response = await apiClient.post<AdminSystemSettingsResponse>(
    '/admin/system/control-settings/get',
    { api_token: data.api_token }
  );
  return response.data;
};

// Admin security settings (Platform Settings - Security Settings card)
export interface AdminSecuritySettingsData {
  session_timeout: number;
  max_login_attempts: number;
  updated_at?: string;
}

export interface AdminSecuritySettingsSaveRequest {
  api_token: string;
  session_timeout: number;
  max_login_attempts: number;
}

export interface AdminSecuritySettingsResponse {
  status: boolean;
  message?: string;
  data: AdminSecuritySettingsData;
}

/**
 * Save admin security settings
 * POST https://fireguide.attoexasolutions.com/api/admin/system/security-settings
 */
export const saveAdminSecuritySettings = async (
  data: AdminSecuritySettingsSaveRequest
): Promise<AdminSecuritySettingsResponse> => {
  const response = await apiClient.post<AdminSecuritySettingsResponse>(
    '/admin/system/security-settings',
    {
      api_token: data.api_token,
      session_timeout: Number(data.session_timeout) || 30,
      max_login_attempts: Number(data.max_login_attempts) || 5
    }
  );
  return response.data;
};

/**
 * Fetch admin security settings
 * POST https://fireguide.attoexasolutions.com/api/admin/system/security-settings/get
 */
export const getAdminSecuritySettings = async (
  data: AdminOverviewSummaryRequest
): Promise<AdminSecuritySettingsResponse> => {
  const response = await apiClient.post<AdminSecuritySettingsResponse>(
    '/admin/system/security-settings/get',
    { api_token: data.api_token }
  );
  return response.data;
};

// Admin payment settings (Platform Settings - Payment Settings card)
export interface AdminPaymentSettingsData {
  stripe_public_key?: string;
  stripe_secret_key?: string;
  default_currency?: string;
  updated_at?: string;
}

export interface AdminPaymentSettingsSaveRequest {
  api_token: string;
  stripe_public_key: string;
  stripe_secret_key: string;
  default_currency: string;
}

export interface AdminPaymentSettingsResponse {
  status: boolean;
  message?: string;
  data: AdminPaymentSettingsData;
}

/**
 * Save admin payment settings
 * POST https://fireguide.attoexasolutions.com/api/admin/payment-settings/save
 */
export const saveAdminPaymentSettings = async (
  data: AdminPaymentSettingsSaveRequest
): Promise<AdminPaymentSettingsResponse> => {
  const response = await apiClient.post<AdminPaymentSettingsResponse>(
    '/admin/payment-settings/save',
    {
      api_token: data.api_token,
      stripe_public_key: data.stripe_public_key,
      stripe_secret_key: data.stripe_secret_key,
      default_currency: (data.default_currency || "GBP").toUpperCase()
    }
  );
  return response.data;
};

/**
 * Fetch admin payment settings
 * POST https://fireguide.attoexasolutions.com/api/admin/payment-settings/get
 */
export const getAdminPaymentSettings = async (
  data: AdminOverviewSummaryRequest
): Promise<AdminPaymentSettingsResponse> => {
  const response = await apiClient.post<AdminPaymentSettingsResponse>(
    '/admin/payment-settings/get',
    { api_token: data.api_token }
  );
  return response.data;
};

/** POST /professional-notice-period/get-for-admin — body: { api_token } */
export interface AdminNoticePeriodProfessional {
  id?: number;
  name?: string;
  email?: string;
  business_name?: string;
  number?: string;
  business_location?: string;
  status?: string;
}

export interface AdminNoticePeriodItem {
  id: number;
  notice_days: number;
  professional?: AdminNoticePeriodProfessional | null;
}

export interface GetAdminProfessionalNoticePeriodsResponse {
  status?: boolean;
  success?: boolean;
  message?: string;
  data?: AdminNoticePeriodItem[] | null;
}

function normalizeAdminNoticePeriodList(
  body: GetAdminProfessionalNoticePeriodsResponse | Record<string, unknown>
): AdminNoticePeriodItem[] {
  const raw = body?.data;
  if (Array.isArray(raw)) return raw as AdminNoticePeriodItem[];
  if (raw && typeof raw === "object" && Array.isArray((raw as { data?: unknown }).data)) {
    return (raw as { data: AdminNoticePeriodItem[] }).data;
  }
  return [];
}

export const getAdminProfessionalNoticePeriods = async (
  api_token: string
): Promise<{ ok: boolean; data: AdminNoticePeriodItem[]; message?: string }> => {
  const response = await apiClient.post<GetAdminProfessionalNoticePeriodsResponse>(
    '/professional-notice-period/get-for-admin',
    { api_token }
  );
  const body = response.data;
  const list = normalizeAdminNoticePeriodList(body as GetAdminProfessionalNoticePeriodsResponse);
  const ok = body?.status === true || body?.success === true;
  return { ok, data: list, message: body?.message };
};

export interface AdminRadiusUpdateRequest {
  api_token: string;
  radius: number;
}

export interface AdminRadiusGetResponse {
  status: boolean;
  message?: string;
  radius?: number;
}

export interface AdminRadiusUpdateResponse {
  status: boolean;
  message?: string;
  radius?: number;
}

/**
 * Get platform default search/service radius (miles).
 * POST /radius/get
 */
export const getAdminRadius = async (
  api_token: string
): Promise<AdminRadiusGetResponse> => {
  const response = await apiClient.post<AdminRadiusGetResponse>('/radius/get', {
    api_token,
  });
  return response.data;
};

/**
 * Update platform default search/service radius (miles).
 * POST /radius/update
 */
export const updateAdminRadius = async (
  data: AdminRadiusUpdateRequest
): Promise<AdminRadiusUpdateResponse> => {
  const response = await apiClient.post<AdminRadiusUpdateResponse>('/radius/update', {
    api_token: data.api_token,
    radius: Number(data.radius),
  });
  return response.data;
};
