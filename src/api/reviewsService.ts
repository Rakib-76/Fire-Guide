/// <reference types="vite/client" />
import axios from 'axios';
import { resolveApiBaseUrl } from '../lib/apiBaseUrl';

// TypeScript types for Review API response
export interface ReviewCreator {
  id: number;
  full_name: string;
}

export interface ReviewUpdater {
  id: number;
  full_name: string;
}

export interface ReviewProfessional {
  id: number;
  name: string | null;
}

export interface ReviewResponse {
  id: number;
  name: string;
  rating: string;
  feedback: string;
  created_at: string;
  updated_at: string;
  creator: ReviewCreator;
  updater: ReviewUpdater | null;
  professional: ReviewProfessional;
}

export interface ReviewsApiResponse {
  status: string;
  message: string;
  data: ReviewResponse[];
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
 * Fetch all reviews
 * @returns Promise with the API response
 */
export const fetchReviews = async (): Promise<ReviewResponse[]> => {
  try {
    const response = await apiClient.get<ReviewsApiResponse>('/reviews');
    console.log('Reviews API Response:', response.data);
    
    // Handle the response structure: { status: 'success', data: [...] }
    if (response.data.status === 'success' && response.data.data) {
      if (Array.isArray(response.data.data)) {
        console.log('Reviews found:', response.data.data.length);
        return response.data.data;
      }
    }
    
    // Fallback: return empty array if structure is unexpected
    console.warn('Unexpected reviews API response structure:', response.data);
    return [];
  } catch (error) {
    console.error('Error fetching reviews:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to fetch reviews',
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
 * Professional profile reviews — for customer-facing profile page.
 * POST https://fireguide.attoexasolutions.com/api/professional-profile/reviews
 * Body: { professional_id }
 * Response: { status: true, message: string, data: [{ id, name, rating, feedback, created_at }] }
 */
export interface ProfessionalProfileReviewItem {
  id: number;
  name: string;
  rating: string;
  feedback: string;
  created_at: string;
}

export interface ProfessionalProfileReviewsResponse {
  status: boolean;
  message: string;
  data: ProfessionalProfileReviewItem[];
}

export const fetchProfessionalProfileReviews = async (
  professionalId: number
): Promise<ProfessionalProfileReviewItem[]> => {
  const response = await apiClient.post<ProfessionalProfileReviewsResponse>(
    '/professional-profile/reviews',
    { professional_id: professionalId }
  );
  const payload = response.data as { status?: boolean; message?: string; data?: ProfessionalProfileReviewItem[] };
  const data = Array.isArray(payload?.data) ? payload.data : null;
  if (Array.isArray(data)) {
    return data;
  }
  throw new Error(payload?.message || 'Failed to fetch reviews');
};

// TypeScript types for Create Review request
export interface CreateReviewRequest {
  api_token: string;
  name: string;
  /** Reviewer email — API field name is `email`. */
  email: string;
  rating: string;
  feedback: string;
  professional_id: number;
}

// TypeScript types for Create Review response
export interface CreateReviewResponse {
  status: string;
  message: string;
  data?: ReviewResponse;
  success?: boolean;
  error?: string;
}

/** POST /reviews/show — body: { id } (review id only). */
export interface ShowReviewResponse {
  success?: boolean;
  status?: string | boolean;
  message?: string;
  data?: ReviewResponse | Record<string, unknown>;
}

/**
 * Fetch a single review by id.
 * POST /reviews/show
 */
export const showReview = async (id: number): Promise<ShowReviewResponse> => {
  try {
    const response = await apiClient.post<ShowReviewResponse>('/reviews/show', { id });
    return response.data;
  } catch (error) {
    console.error('Error fetching review:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to fetch review',
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
 * Create a new review
 * @param data - Review creation data
 * @returns Promise with the API response
 */
export const createReview = async (
  data: CreateReviewRequest
): Promise<CreateReviewResponse> => {
  try {
    const response = await apiClient.post<CreateReviewResponse>(
      '/reviews/store',
      {
        api_token: data.api_token,
        name: data.name,
        email: data.email,
        rating: data.rating,
        feedback: data.feedback,
        professional_id: data.professional_id
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error creating review:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to create review',
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

// TypeScript types for Update Review request
export interface UpdateReviewRequest {
  api_token: string;
  id: number;
  name: string;
  rating: string;
  feedback: string;
  professional_id: number;
}

// TypeScript types for Update Review response
export interface UpdateReviewResponse {
  status: string;
  message: string;
  data?: ReviewResponse;
  success?: boolean;
  error?: string;
}

/**
 * Update an existing review
 * @param data - Review update data
 * @returns Promise with the API response
 */
export const updateReview = async (
  data: UpdateReviewRequest
): Promise<UpdateReviewResponse> => {
  try {
    const response = await apiClient.post<UpdateReviewResponse>(
      '/reviews/update',
      {
        api_token: data.api_token,
        id: data.id,
        name: data.name,
        rating: data.rating,
        feedback: data.feedback,
        professional_id: data.professional_id
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating review:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to update review',
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

// TypeScript types for Delete Review request
export interface DeleteReviewRequest {
  api_token: string;
  id: number;
}

// TypeScript types for Delete Review response
export interface DeleteReviewResponse {
  status?: string;
  success?: boolean;
  message?: string;
  error?: string;
}

/**
 * Delete a review
 * @param data - Review deletion data
 * @returns Promise with the API response
 */
export const deleteReview = async (
  data: DeleteReviewRequest
): Promise<DeleteReviewResponse> => {
  try {
    const response = await apiClient.post<DeleteReviewResponse>(
      '/reviews/delete',
      {
        api_token: data.api_token,
        id: data.id
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error deleting review:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to delete review',
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
