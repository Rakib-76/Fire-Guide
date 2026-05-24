import axios from 'axios';
import { resolveApiBaseUrl } from '../lib/apiBaseUrl';

const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

export interface ProfessionalServiceBasePriceItem {
  id: number;
  professional_id: number;
  service_id: number;
  base_price: string;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  professional?: {
    id: number;
    name: string;
    business_name?: string;
    about?: string;
    email?: string;
    number?: string;
    business_location?: string;
    post_code?: string;
    status?: string;
  };
  service?: {
    id: number;
    service_name: string;
    type?: string;
    status?: string;
    price?: string;
    description?: string;
  };
  creator?: { id: number; full_name: string };
  updater?: { id: number; full_name: string };
}

export interface ProfessionalServiceBasePricesResponse {
  status: boolean;
  message: string;
  data: ProfessionalServiceBasePriceItem[];
}

export interface ProfessionalServiceBasePriceSingleResponse {
  status: boolean;
  data: ProfessionalServiceBasePriceItem;
}

/** Normalized base price payload used by professional pricing tabs (matches module GET responses). */
export interface ResolvedProfessionalModuleBasePrice {
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
 * Fetch all professional service base prices
 * GET https://fireguide.attoexasolutions.com/api/professional-service-base-prices/get-all
 */
export const getProfessionalServiceBasePricesAll = async (
  apiToken?: string | null
): Promise<ProfessionalServiceBasePricesResponse> => {
  const response = await apiClient.get<ProfessionalServiceBasePricesResponse>(
    '/professional-service-base-prices/get-all',
    apiToken
      ? {
          params: { api_token: apiToken },
          headers: { Authorization: `Bearer ${apiToken}` },
        }
      : undefined
  );
  return response.data;
};

/**
 * Resolve base price from GET …/professional-service-base-prices/get-all when per-module POST routes 404.
 * Matches the first row whose `service.service_name` matches `serviceNameMatch`.
 */
export async function tryResolveProfessionalBasePriceFromRegistry(
  apiToken: string,
  serviceNameMatch: RegExp
): Promise<ResolvedProfessionalModuleBasePrice | null> {
  try {
    const res = await getProfessionalServiceBasePricesAll(apiToken);
    if (!res?.status || !Array.isArray(res.data)) {
      return null;
    }
    const row = res.data.find((r) => serviceNameMatch.test(String(r.service?.service_name ?? '')));
    if (!row) {
      return { status: false, message: 'No matching service in base price registry.' };
    }
    return {
      status: true,
      message: res.message || 'ok',
      data: {
        id: row.id,
        professional_id: row.professional_id,
        price: String(row.base_price ?? '0'),
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Fetch a single professional service base price by ID
 * POST https://fireguide.attoexasolutions.com/api/professional-service-base-prices/get-single
 * Body: { api_token, id } — id must come from the get-all API response
 */
export const getProfessionalServiceBasePriceSingle = async (
  apiToken: string,
  id: number
): Promise<ProfessionalServiceBasePriceSingleResponse> => {
  try {
    const response = await apiClient.post<ProfessionalServiceBasePriceSingleResponse>(
      '/professional-service-base-prices/get-single',
      { api_token: apiToken, id },
      { headers: { Authorization: `Bearer ${apiToken}` } }
    );
    const body = response.data;
    if (body?.status && body?.data) {
      return { status: true, data: body.data };
    }
    throw new Error((body as { message?: string })?.message || 'Invalid response');
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? err.message;
      throw new Error(typeof msg === 'string' ? msg : 'Failed to load details');
    }
    throw err;
  }
};

export interface UpdateBasePriceResponse {
  status: boolean;
  message: string;
  data: ProfessionalServiceBasePriceItem;
}

/**
 * Update a professional service base price
 * POST https://fireguide.attoexasolutions.com/api/professional-service-base-prices/update
 * Body: { api_token, id, professional_id?, service_id, base_price }
 * professional_id is required when admin updates; optional for professional updating own record
 */
export const updateProfessionalServiceBasePrice = async (
  apiToken: string,
  id: number,
  serviceId: number,
  basePrice: string,
  professionalId?: number
): Promise<UpdateBasePriceResponse> => {
  try {
    const payload: Record<string, unknown> = {
      api_token: apiToken,
      id,
      service_id: serviceId,
      base_price: String(basePrice),
    };
    if (professionalId != null) {
      payload.professional_id = professionalId;
    }
    const response = await apiClient.post<UpdateBasePriceResponse>(
      '/professional-service-base-prices/update',
      payload,
      { headers: { Authorization: `Bearer ${apiToken}` } }
    );
    if (response.data?.status && response.data?.data) {
      return response.data;
    }
    throw new Error((response.data as { message?: string })?.message || 'Update failed');
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 409) {
      throw new Error('Base price already set for this service.');
    }
    throw err;
  }
};

export interface StoreBasePriceResponse {
  status: boolean;
  message: string;
  data: ProfessionalServiceBasePriceItem;
}

export interface DeleteBasePriceResponse {
  status: boolean;
  message: string;
}

/**
 * Delete a professional service base price
 * POST https://fireguide.attoexasolutions.com/api/professional-service-base-prices/delete
 * Body: { api_token, service_id, professional_id? } — professional_id required for admin
 */
export const deleteProfessionalServiceBasePrice = async (
  apiToken: string,
  serviceId: number,
  professionalId?: number
): Promise<DeleteBasePriceResponse> => {
  try {
    const payload: Record<string, unknown> = {
      api_token: apiToken,
      service_id: serviceId,
    };
    if (professionalId != null) {
      payload.professional_id = professionalId;
    }
    const response = await apiClient.post<DeleteBasePriceResponse>(
      '/professional-service-base-prices/delete',
      payload,
      { headers: { Authorization: `Bearer ${apiToken}` } }
    );
    if (response.data?.status) {
      return response.data;
    }
    throw new Error((response.data as { message?: string })?.message || 'Delete failed');
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? err.message;
      throw new Error(typeof msg === 'string' ? msg : 'Failed to delete base price');
    }
    throw err;
  }
};

/**
 * Create a new professional service base price
 * POST https://fireguide.attoexasolutions.com/api/professional-service-base-prices/store
 * Body: { api_token, service_id, base_price } — service_id from Services API dropdown
 */
export const storeProfessionalServiceBasePrice = async (
  apiToken: string,
  serviceId: number,
  basePrice: string
): Promise<StoreBasePriceResponse> => {
  try {
    const response = await apiClient.post<StoreBasePriceResponse>(
      '/professional-service-base-prices/store',
      {
        api_token: apiToken,
        service_id: serviceId,
        base_price: String(basePrice),
      },
      { headers: { Authorization: `Bearer ${apiToken}` } }
    );
    if (response.data?.status && response.data?.data) {
      return response.data;
    }
    throw new Error((response.data as { message?: string })?.message || 'Create failed');
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 409) {
      throw new Error('Base price already set for this service.');
    }
    throw err;
  }
};

