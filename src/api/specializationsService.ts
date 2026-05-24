import axios from 'axios';
import { resolveApiBaseUrl } from '../lib/apiBaseUrl';

// Types for specializations API
export interface SpecializationItem {
  id: number;
  title: string;
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

export interface SpecializationsApiResponse {
  status: string;
  message: string;
  data: SpecializationItem[];
}

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

/**
 * Fetch all specializations
 * @returns Promise with the API response
 */
export const fetchSpecializations = async (): Promise<SpecializationItem[]> => {
  try {
    const response = await apiClient.get<SpecializationsApiResponse>('/specialization');
    
    // Handle the response structure
    if (response.data.status === 'success' && response.data.data) {
      return response.data.data; // Direct array
    }
    
    // Fallback: return empty array if structure is unexpected
    return [];
  } catch (error) {
    console.error('Error fetching specializations:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to fetch specializations',
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

export interface CreateSpecializationRequest {
  api_token: string;
  title: string;
  professional_id: number;
}

export interface CreateSpecializationResponse {
  status?: string;
  success?: boolean;
  message?: string;
  error?: string;
  data?: SpecializationItem;
}

/**
 * Create a new specialization
 * @param data - Specialization creation data
 * @returns Promise with the API response
 */
export const createSpecialization = async (data: CreateSpecializationRequest): Promise<CreateSpecializationResponse> => {
  try {
    const response = await apiClient.post<CreateSpecializationResponse>('/specialization/create', data);
    return response.data;
  } catch (error) {
    console.error('Error creating specialization:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to create specialization',
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

export interface UpdateSpecializationRequest {
  api_token: string;
  id: number;
  title: string;
  professional_id: number;
}

export interface UpdateSpecializationResponse {
  status?: string;
  success?: boolean;
  message?: string;
  error?: string;
  data?: SpecializationItem;
}

/**
 * Update an existing specialization
 * @param data - Specialization update data
 * @returns Promise with the API response
 */
export const updateSpecialization = async (data: UpdateSpecializationRequest): Promise<UpdateSpecializationResponse> => {
  try {
    const response = await apiClient.post<UpdateSpecializationResponse>('/specialization/update', data);
    return response.data;
  } catch (error) {
    console.error('Error updating specialization:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to update specialization',
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

export interface DeleteSpecializationRequest {
  api_token: string;
  id: number;
}

export interface DeleteSpecializationResponse {
  status?: string;
  success?: boolean;
  message?: string;
  error?: string;
}

/**
 * Delete a specialization
 * @param data - Specialization deletion data
 * @returns Promise with the API response
 */
export const deleteSpecialization = async (data: DeleteSpecializationRequest): Promise<DeleteSpecializationResponse> => {
  try {
    const response = await apiClient.post<DeleteSpecializationResponse>('/specialization/delete', data);
    return response.data;
  } catch (error) {
    console.error('Error deleting specialization:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to delete specialization',
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
