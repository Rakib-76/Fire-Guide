import axios from 'axios';
import { resolveApiBaseUrl } from '../lib/apiBaseUrl';

// Types for pricing API
export interface PriceItem {
  id: number;
  title: string;
  price: string;
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
}

export interface PricesApiResponse {
  status: string;
  message: string;
  data: {
    current_page: number;
    data: PriceItem[];
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    links: Array<{
      url: string | null;
      label: string;
      active: boolean;
    }>;
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number;
    total: number;
  };
}

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

export interface CreatePriceRequest {
  api_token: string;
  title: string;
  price: string;
}

export interface CreatePriceResponse {
  status?: string;
  success?: boolean;
  message?: string;
  error?: string;
  data?: PriceItem;
}

/**
 * Fetch all prices
 * @param page - Page number for pagination (default: 1)
 * @returns Promise with the API response
 */
export const fetchPrices = async (page: number = 1): Promise<PriceItem[]> => {
  try {
    const response = await apiClient.get<PricesApiResponse>('/price', {
      params: { page },
    });
    
    // Handle the paginated response structure
    if (response.data.status === 'success' && response.data.data?.data) {
      return response.data.data.data; // Access the nested data array
    }
    
    // Fallback: return empty array if structure is unexpected
    return [];
  } catch (error) {
    console.error('Error fetching prices:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to fetch prices',
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

export interface UpdatePriceRequest {
  api_token: string;
  id: number;
  title: string;
  price: string;
}

export interface UpdatePriceResponse {
  status?: string;
  success?: boolean;
  message?: string;
  error?: string;
  data?: PriceItem;
}

export interface DeletePriceRequest {
  api_token: string;
  id: number;
}

export interface DeletePriceResponse {
  status?: string;
  success?: boolean;
  message?: string;
  error?: string;
}

/**
 * Create a new price
 * @param data - Price creation data
 * @returns Promise with the API response
 */
export const createPrice = async (data: CreatePriceRequest): Promise<CreatePriceResponse> => {
  try {
    const response = await apiClient.post<CreatePriceResponse>('/price/create', data);
    return response.data;
  } catch (error) {
    console.error('Error creating price:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to create price',
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
 * Update an existing price
 * @param data - Price update data
 * @returns Promise with the API response
 */
export const updatePrice = async (data: UpdatePriceRequest): Promise<UpdatePriceResponse> => {
  try {
    const response = await apiClient.post<UpdatePriceResponse>('/price/update', data);
    return response.data;
  } catch (error) {
    console.error('Error updating price:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to update price',
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
 * Delete a price
 * @param data - Price deletion data
 * @returns Promise with the API response
 */
export const deletePrice = async (data: DeletePriceRequest): Promise<DeletePriceResponse> => {
  try {
    const response = await apiClient.post<DeletePriceResponse>('/price/delete', data);
    return response.data;
  } catch (error) {
    console.error('Error deleting price:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to delete price',
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
