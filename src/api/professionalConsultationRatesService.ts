import axios from 'axios';
import { resolveApiBaseUrl } from '../lib/apiBaseUrl';

const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

export interface ProfessionalConsultationRateItem {
  id: number;
  professional_id: number;
  remote_hourly_rate: string;
  onsite_hourly_rate: string;
  created_by: number;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalConsultationRatesResponse {
  status: boolean;
  message: string;
  data: ProfessionalConsultationRateItem | ProfessionalConsultationRateItem[];
}

export interface StoreConsultationRateResponse {
  status: boolean;
  message: string;
  data: ProfessionalConsultationRateItem;
}

/**
 * Store a new professional consultation rate
 * POST https://fireguide.attoexasolutions.com/api/professional-consultation-rates/store
 * Body: { api_token, remote_hourly_rate, onsite_hourly_rate }
 */
export const storeProfessionalConsultationRate = async (
  apiToken: string,
  remoteHourlyRate: number,
  onsiteHourlyRate: number
): Promise<StoreConsultationRateResponse> => {
  try {
    const response = await apiClient.post<StoreConsultationRateResponse>(
      '/professional-consultation-rates/store',
      {
        api_token: apiToken,
        remote_hourly_rate: remoteHourlyRate,
        onsite_hourly_rate: onsiteHourlyRate,
      }
    );
    if (response.data?.status && response.data?.data) {
      return response.data;
    }
    throw new Error((response.data as { message?: string })?.message || 'Store failed');
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? err.message;
      throw new Error(typeof msg === 'string' ? msg : 'Failed to add consultation rate');
    }
    throw err;
  }
};

/**
 * Fetch professional consultation rates
 * GET https://fireguide.attoexasolutions.com/api/professional-consultation-rates/get-all
 * Returns a single record or array depending on API
 */
export const getProfessionalConsultationRatesAll = async (
  apiToken?: string | null
): Promise<ProfessionalConsultationRatesResponse> => {
  const response = await apiClient.get<ProfessionalConsultationRatesResponse>(
    '/professional-consultation-rates/get-all',
    apiToken ? { params: { api_token: apiToken } } : undefined
  );
  return response.data;
};

export interface UpdateConsultationRateResponse {
  status: boolean;
  message: string;
  data: ProfessionalConsultationRateItem;
}

/**
 * Update professional consultation rates
 * POST https://fireguide.attoexasolutions.com/api/professional-consultation-rates/update
 * Body: { api_token, remote_hourly_rate, onsite_hourly_rate, professional_id? } — professional_id required for admin
 */
export const updateProfessionalConsultationRate = async (
  apiToken: string,
  remoteHourlyRate: number,
  onsiteHourlyRate: number,
  professionalId?: number
): Promise<UpdateConsultationRateResponse> => {
  try {
    const payload: Record<string, unknown> = {
      api_token: apiToken,
      remote_hourly_rate: remoteHourlyRate,
      onsite_hourly_rate: onsiteHourlyRate,
    };
    if (professionalId != null) {
      payload.professional_id = professionalId;
    }
    const response = await apiClient.post<UpdateConsultationRateResponse>(
      '/professional-consultation-rates/update',
      payload
    );
    if (response.data?.status && response.data?.data) {
      return response.data;
    }
    throw new Error((response.data as { message?: string })?.message || 'Update failed');
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? err.message;
      throw new Error(typeof msg === 'string' ? msg : 'Failed to update consultation rate');
    }
    throw err;
  }
};

export interface DeleteConsultationRateResponse {
  status: boolean;
  message: string;
}

/**
 * Delete professional consultation rates
 * POST https://fireguide.attoexasolutions.com/api/professional-consultation-rates/delete
 * Body: { api_token, id, professional_id? } — id=consultation rate id; professional_id for admin
 */
export const deleteProfessionalConsultationRate = async (
  apiToken: string,
  id: number,
  professionalId?: number
): Promise<DeleteConsultationRateResponse> => {
  try {
    const payload: Record<string, unknown> = { api_token: apiToken, id };
    if (professionalId != null) {
      payload.professional_id = professionalId;
    }
    const response = await apiClient.post<DeleteConsultationRateResponse>(
      '/professional-consultation-rates/delete',
      payload
    );
    if (response.data?.status) {
      return response.data;
    }
    throw new Error((response.data as { message?: string })?.message || 'Delete failed');
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? err.message;
      throw new Error(typeof msg === 'string' ? msg : 'Failed to delete consultation rate');
    }
    throw err;
  }
};
