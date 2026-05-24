/// <reference types="vite/client" />
import axios from 'axios';
import { resolveApiBaseUrl } from '../lib/apiBaseUrl';

// TypeScript types for Address Store request
export interface StoreAddressRequest {
  api_token: string;
  tag: string;
  adress_line: string; // Note: API uses "adress_line" (typo in API)
  city: string;
  postal_code: string;
  country: string;
  is_default_address: boolean;
  is_favourite_address: boolean;
}

export interface StoreAddressResponse {
  status?: string;
  success?: boolean;
  message?: string;
  error?: string;
  data?: {
    id: number;
    tag: string;
    adress_line: string;
    city: string;
    postal_code: string;
    country: string;
    is_default_address: boolean;
    is_favourite_address: boolean;
    created_at?: string;
    updated_at?: string;
  };
}

export interface UpdateAddressRequest {
  api_token: string;
  id: number;
  tag: string;
  adress_line: string;
  city: string;
  postal_code: string;
  country: string;
  is_default_address: boolean;
  is_favourite_address: boolean;
}

export interface UpdateAddressResponse {
  status?: string;
  success?: boolean;
  message?: string;
  error?: string;
  data?: {
    id: number;
    tag: string;
    adress_line: string;
    city: string;
    postal_code: string;
    country: string;
    is_default_address: boolean;
    is_favourite_address: boolean;
    created_at?: string;
    updated_at?: string;
  };
}

export interface DeleteAddressRequest {
  api_token: string;
  id: number;
}

export interface DeleteAddressResponse {
  status?: string;
  success?: boolean;
  message?: string;
  error?: string;
}

export interface AddressResponse {
  id: number;
  tag: string;
  adress_line: string;
  city: string;
  postal_code: string;
  country: string;
  is_default_address: number; // API returns 1 or 0
  is_favourite_address: number; // API returns 1 or 0
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface FetchAddressesResponse {
  status?: string;
  success?: boolean;
  message?: string;
  error?: string;
  data?: AddressResponse[];
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
 * Fetch all addresses for the authenticated user
 * @param api_token - The API token for authentication
 * @returns Promise with the API response containing array of addresses
 */
export const fetchAddresses = async (
  api_token: string
): Promise<FetchAddressesResponse> => {
  try {
    const response = await apiClient.get<FetchAddressesResponse>(
      '/addresses',
      {
        params: {
          api_token: api_token
        }
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
          status: 'error',
          message: error.response.data?.message || 'Failed to fetch addresses',
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

/**
 * Update an existing address (backend expects POST, same as Postman /addresses_update)
 * @param data - Address data to update (must include id)
 * @returns Promise with the API response
 */
export const updateAddress = async (
  data: UpdateAddressRequest
): Promise<UpdateAddressResponse> => {
  try {
    const response = await apiClient.post<UpdateAddressResponse>(
      '/addresses_update',
      data
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Handle axios errors
      if (error.response) {
        // Server responded with error status
        throw {
          success: false,
          status: error.response.status,
          statusCode: error.response.status,
          message: error.response.data?.message || 'Failed to update address',
          error: error.response.data?.error || error.message,
          response: error.response,
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

/**
 * Store a new address
 * @param data - Address data to store
 * @returns Promise with the API response
 */
export const storeAddress = async (
  data: StoreAddressRequest
): Promise<StoreAddressResponse> => {
  try {
    const response = await apiClient.post<StoreAddressResponse>(
      '/addresses_store',
      data
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Handle axios errors
      if (error.response) {
        // Server responded with error status
        throw {
          success: false,
          status: 'error',
          message: error.response.data?.message || 'Failed to store address',
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

/**
 * Delete an address (backend expects POST with JSON body, same pattern as addresses_update)
 * @param data - Address deletion data (must include api_token and id)
 * @returns Promise with the API response
 */
export const deleteAddress = async (
  data: DeleteAddressRequest
): Promise<DeleteAddressResponse> => {
  try {
    const response = await apiClient.post<DeleteAddressResponse>(
      '/addresses_delete',
      data
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Handle axios errors
      if (error.response) {
        // Server responded with error status
        throw {
          success: false,
          status: error.response.status,
          statusCode: error.response.status,
          message: error.response.data?.message || 'Failed to delete address',
          error: error.response.data?.error || error.message,
          response: error.response,
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
