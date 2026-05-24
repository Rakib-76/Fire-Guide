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

export interface ProfessionalFraBasePriceItem {
  id: number;
  professional_id: number;
  property_type_id: number;
  non_intrusive_base_price: string;
  intrusive_base_price: string;
  created_by: number;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
  property_type?: {
    id: number;
    property_type_name: string;
  };
}

export interface ProfessionalFraBasePricesResponse {
  status: boolean;
  message: string;
  data: ProfessionalFraBasePriceItem[];
}

export interface StoreFraBasePriceResponse {
  status: boolean;
  message: string;
  data: ProfessionalFraBasePriceItem;
}

/**
 * Store a new professional FRA base price
 * POST https://fireguide.attoexasolutions.com/api/professional-fra-base-prices/store
 * Body: { api_token, property_type_id, non_intrusive_base_price, intrusive_base_price }
 */
export const storeProfessionalFraBasePrice = async (
  apiToken: string,
  propertyTypeId: number,
  nonIntrusiveBasePrice: number,
  intrusiveBasePrice: number
): Promise<StoreFraBasePriceResponse> => {
  try {
    const response = await apiClient.post<StoreFraBasePriceResponse>(
      '/professional-fra-base-prices/store',
      {
        api_token: apiToken,
        property_type_id: propertyTypeId,
        non_intrusive_base_price: nonIntrusiveBasePrice,
        intrusive_base_price: intrusiveBasePrice,
      }
    );
    if (response.data?.status && response.data?.data) {
      return response.data;
    }
    throw new Error((response.data as { message?: string })?.message || 'Store failed');
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? err.message;
      throw new Error(typeof msg === 'string' ? msg : 'Failed to add FRA base price');
    }
    throw err;
  }
};

/**
 * Fetch all professional FRA base prices
 * GET https://fireguide.attoexasolutions.com/api/professional-fra-base-prices/get-all
 */
export const getProfessionalFraBasePricesAll = async (
  apiToken?: string | null
): Promise<ProfessionalFraBasePricesResponse> => {
  const response = await apiClient.get<ProfessionalFraBasePricesResponse>(
    '/professional-fra-base-prices/get-all',
    apiToken ? { params: { api_token: apiToken } } : undefined
  );
  return response.data;
};

export interface UpdateFraBasePriceResponse {
  status: boolean;
  message: string;
  data: ProfessionalFraBasePriceItem;
}

/**
 * Update a professional FRA base price
 * POST https://fireguide.attoexasolutions.com/api/professional-fra-base-prices/update
 * Body: { api_token, id, non_intrusive_base_price, intrusive_base_price }
 */
export const updateProfessionalFraBasePrice = async (
  apiToken: string,
  id: number,
  nonIntrusiveBasePrice: number,
  intrusiveBasePrice: number
): Promise<UpdateFraBasePriceResponse> => {
  try {
    const response = await apiClient.post<UpdateFraBasePriceResponse>(
      '/professional-fra-base-prices/update',
      {
        api_token: apiToken,
        id,
        non_intrusive_base_price: nonIntrusiveBasePrice,
        intrusive_base_price: intrusiveBasePrice,
      }
    );
    if (response.data?.status && response.data?.data) {
      return response.data;
    }
    throw new Error((response.data as { message?: string })?.message || 'Update failed');
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? err.message;
      throw new Error(typeof msg === 'string' ? msg : 'Failed to update FRA base price');
    }
    throw err;
  }
};

export interface DeleteFraBasePriceResponse {
  status: boolean;
  message: string;
}

/**
 * Delete a professional FRA base price
 * POST https://fireguide.attoexasolutions.com/api/professional-fra-base-prices/delete
 * Body: { api_token, id, professional_id? } — professional_id required for admin
 */
export const deleteProfessionalFraBasePrice = async (
  apiToken: string,
  id: number,
  professionalId?: number
): Promise<DeleteFraBasePriceResponse> => {
  try {
    const payload: Record<string, unknown> = {
      api_token: apiToken,
      id,
    };
    if (professionalId != null) {
      payload.professional_id = professionalId;
    }
    const response = await apiClient.post<DeleteFraBasePriceResponse>(
      '/professional-fra-base-prices/delete',
      payload
    );
    if (response.data?.status) {
      return response.data;
    }
    throw new Error((response.data as { message?: string })?.message || 'Delete failed');
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? err.message;
      throw new Error(typeof msg === 'string' ? msg : 'Failed to delete FRA base price');
    }
    throw err;
  }
};
