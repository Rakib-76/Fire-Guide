/// <reference types="vite/client" />
import axios from 'axios';
import { resolveApiBaseUrl } from '../lib/apiBaseUrl';

// TypeScript types for Qualification Certification response
export interface QualificationCertificationResponse {
  id: number;
  title: string;
  certification_date: string;
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
    name: string;
  } | null;
}

export interface QualificationsApiResponse {
  status: string;
  message: string;
  data: QualificationCertificationResponse[];
}

export interface UpdateCertificationRequest {
  api_token: string;
  id: number;
  title: string;
  certification_date: string; // YYYY-MM-DD format
  professional_id: number;
}

export interface UpdateCertificationResponse {
  status?: string;
  success?: boolean;
  message?: string;
  error?: string;
}

export interface DeleteCertificationRequest {
  api_token: string;
  id: number;
}

export interface DeleteCertificationResponse {
  status?: string;
  success?: boolean;
  message?: string;
  error?: string;
}

// TypeScript types for Create Experience (similar to Create Certification)
export interface CreateExperienceRequest {
  api_token: string;
  experience_name: string;
  description: string;
  evidence: string | File; // Base64 string (images) or File object (documents)
  status?: string;
  professional_id?: number;
}

export interface CreateExperienceResponse {
  status?: boolean | string;
  success?: boolean;
  message?: string;
  data?: {
    id: number;
    professional_id: number;
    experience_name: string;
    description: string;
    evidence: string;
    status: string;
    created_at: string;
    updated_at: string;
  };
  error?: string;
}

export interface CreateCertificationRequest {
  api_token: string;
  title?: string; // Optional for backward compatibility
  certification_date?: string; // Optional: YYYY-MM-DD format
  professional_id?: number; // Optional: may be inferred from token
  // New required fields
  certificate_name: string;
  description: string;
  evidence: string | File; // Base64 encoded file data (for images) or File object (for documents)
  status: string; // e.g., "pending", "verified", "rejected"
}

export interface CreateCertificationResponse {
  status?: string;
  success?: boolean;
  message?: string;
  error?: string;
  data?: QualificationCertificationResponse;
}

export interface UpdateEvidenceRequest {
  api_token: string;
  id: number; // Evidence ID
  professional_id: number;
  evidence: string | File; // Base64 encoded file data (for images) or File object (for documents)
}

export interface UpdateEvidenceResponse {
  status?: boolean | string;
  success?: boolean;
  message?: string;
  data?: {
    certificate_id: number;
    evidence: string;
    status: string;
  };
  error?: string;
}

/**
 * Professional profile certifications — for customer-facing profile page.
 * POST https://fireguide.attoexasolutions.com/api/professional-profile/certifications
 * Body: { professional_id }
 * Response: { status, message, data: [{ id, name, description, evidence, status, created_at }] }
 */
export interface ProfessionalProfileCertificationItem {
  id: number;
  name: string;
  description: string;
  evidence: string;
  status: string;
  created_at: string;
}

export interface ProfessionalProfileCertificationsResponse {
  status: boolean;
  message: string;
  data: ProfessionalProfileCertificationItem[];
}

export const fetchProfessionalProfileCertifications = async (
  professionalId: number
): Promise<ProfessionalProfileCertificationItem[]> => {
  const response = await apiClient.post<ProfessionalProfileCertificationsResponse>(
    '/professional-profile/certifications',
    { professional_id: professionalId }
  );
  const payload = response.data as { status?: boolean; message?: string; data?: ProfessionalProfileCertificationItem[] };
  const data = Array.isArray(payload?.data) ? payload.data : null;
  if (Array.isArray(data)) {
    return data;
  }
  throw new Error(payload?.message || 'Failed to fetch certifications');
};

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

/**
 * Fetch all qualification certifications
 * @returns Promise with the API response
 */
export const fetchQualifications = async (): Promise<QualificationCertificationResponse[]> => {
  try {
    const response = await apiClient.get<QualificationsApiResponse>('/qualifications-certification');
    
    // Handle the response structure
    if (response.data.status === 'success' && response.data.data) {
      return response.data.data; // Direct array
    }
    
    // Fallback: return empty array if structure is unexpected
    return [];
  } catch (error) {
    console.error('Error fetching qualifications:', error);
    throw error;
  }
};

/**
 * Update a qualification certification
 * @param data - Update certification data
 * @returns Promise with the API response
 */
export const updateCertification = async (
  data: UpdateCertificationRequest
): Promise<UpdateCertificationResponse> => {
  try {
    const response = await apiClient.post<UpdateCertificationResponse>(
      '/qualifications-certification/update',
      {
        api_token: data.api_token,
        id: data.id,
        title: data.title,
        certification_date: data.certification_date,
        professional_id: data.professional_id
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating certification:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to update certification',
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
 * Create a new experience with evidence
 * BaseURL: https://fireguide.attoexasolutions.com/api/experiences-certification/create
 * Method: POST
 * - Images: JSON body with base64 evidence
 * - Documents (PDF, Word, Excel, etc.): FormData with File object
 */
export const createExperience = async (
  data: CreateExperienceRequest
): Promise<CreateExperienceResponse> => {
  try {
    const isFileObject = data.evidence instanceof File;
    let response: any;

    if (isFileObject) {
      // For documents (PDF, Word, Excel, etc.): send File object as FormData
      const formData = new FormData();
      formData.append('api_token', data.api_token);
      formData.append('experience_name', data.experience_name);
      formData.append('description', data.description);
      formData.append('evidence', data.evidence as File);
      formData.append('status', data.status || 'pending');

      // Add optional fields if provided
      if (data.professional_id) {
        formData.append('professional_id', data.professional_id.toString());
      }

      console.log('POST /experiences-certification/create - Request (FormData):', {
        endpoint: '/experiences-certification/create',
        hasApiToken: !!data.api_token,
        experience_name: data.experience_name,
        description: data.description,
        evidence: `File: ${(data.evidence as File).name}`,
        status: data.status || 'pending',
      });

      response = await apiClient.post<CreateExperienceResponse>(
        '/experiences-certification/create',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
    } else {
      // For images: send base64 string as JSON body
      const requestBody: any = {
        api_token: data.api_token,
        experience_name: data.experience_name,
        description: data.description,
        evidence: data.evidence as string,
        status: data.status || 'pending',
      };

      if (data.professional_id) {
        requestBody.professional_id = data.professional_id;
      }

      console.log('POST /experiences-certification/create - Request (JSON):', {
        endpoint: '/experiences-certification/create',
        hasApiToken: !!data.api_token,
        experience_name: data.experience_name,
        description: data.description,
        evidence: 'Base64 string',
        status: data.status || 'pending',
      });

      response = await apiClient.post<CreateExperienceResponse>(
        '/experiences-certification/create',
        requestBody
      );
    }
    console.log('POST /experiences-certification/create - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating experience:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          status: false,
          message: error.response.data?.message || 'Failed to create experience',
          error: error.response.data?.error || error.message,
        };
      } else if (error.request) {
        throw {
          status: false,
          message: 'Network error. Please check your connection.',
          error: 'Network error',
        };
      }
    }
    throw {
      status: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Delete a qualification certification
 * @param data - Delete certification data (api_token and id)
 * @returns Promise with the API response
 */
export const deleteCertification = async (
  data: DeleteCertificationRequest
): Promise<DeleteCertificationResponse> => {
  try {
    const response = await apiClient.post<DeleteCertificationResponse>(
      '/qualifications-certification/delete',
      {
        api_token: data.api_token,
        id: data.id
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error deleting certification:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to delete certification',
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
 * Create a new qualification certification
 * @param data - Create certification data
 * @returns Promise with the API response
 */
export const createCertification = async (
  data: CreateCertificationRequest
): Promise<CreateCertificationResponse> => {
  try {
    const isFileObject = data.evidence instanceof File;
    let response: any;

    if (isFileObject) {
      // For documents (PDF, Word, Excel, etc.): send File object as FormData
      const formData = new FormData();
      formData.append('api_token', data.api_token);
      formData.append('certificate_name', data.certificate_name);
      formData.append('description', data.description);
      formData.append('evidence', data.evidence as File);
      formData.append('status', data.status);

      // Add optional fields if provided
      if (data.title) {
        formData.append('title', data.title);
      }
      if (data.certification_date) {
        formData.append('certification_date', data.certification_date);
      }
      if (data.professional_id) {
        formData.append('professional_id', data.professional_id.toString());
      }

      console.log('POST /qualifications-certification/create - Request (FormData):', {
        endpoint: '/qualifications-certification/create',
        hasApiToken: !!data.api_token,
        certificate_name: data.certificate_name,
        description: data.description,
        evidence: `File: ${(data.evidence as File).name}`,
        status: data.status,
      });

      response = await apiClient.post<CreateCertificationResponse>(
        '/qualifications-certification/create',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
    } else {
      // For images: send base64 string as JSON body
      const requestBody: any = {
        api_token: data.api_token,
        certificate_name: data.certificate_name,
        description: data.description,
        evidence: data.evidence as string,
        status: data.status,
      };

      // Add optional fields if provided (for backward compatibility)
      if (data.title) {
        requestBody.title = data.title;
      }
      if (data.certification_date) {
        requestBody.certification_date = data.certification_date;
      }
      if (data.professional_id) {
        requestBody.professional_id = data.professional_id;
      }

      console.log('POST /qualifications-certification/create - Request (JSON):', {
        endpoint: '/qualifications-certification/create',
        hasApiToken: !!requestBody.api_token,
        certificate_name: requestBody.certificate_name,
        description: requestBody.description,
        evidence: requestBody.evidence ? `${requestBody.evidence.substring(0, 50)}...` : 'not provided',
        status: requestBody.status,
        title: requestBody.title || 'not provided',
        certification_date: requestBody.certification_date || 'not provided',
        professional_id: requestBody.professional_id || 'not provided'
      });

      response = await apiClient.post<CreateCertificationResponse>(
        '/qualifications-certification/create',
        requestBody,
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('POST /qualifications-certification/create - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating certification:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error('API Error Response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
        });
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to create certification',
          error: error.response.data?.error || error.message,
          status: error.response.status,
        };
      } else if (error.request) {
        console.error('No response received. Request was made but no response:', error.request);
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
 * Update evidence for a qualification certification
 * BaseURL: https://fireguide.attoexasolutions.com/api/qualifications-certification/update_evidence
 * Method: POST
 * - Images: JSON body with base64 evidence
 * - Documents (PDF, Word, Excel, etc.): FormData with File object
 */
export const updateEvidence = async (
  data: UpdateEvidenceRequest
): Promise<UpdateEvidenceResponse> => {
  try {
    const isFileObject = data.evidence instanceof File;
    let response: any;

    if (isFileObject) {
      // For documents (PDF, Word, Excel, etc.): send File object as FormData
      const formData = new FormData();
      formData.append('api_token', data.api_token);
      formData.append('id', data.id.toString());
      formData.append('professional_id', data.professional_id.toString());
      formData.append('evidence', data.evidence as File);

      console.log('POST /qualifications-certification/update_evidence - Request (FormData):', {
        endpoint: '/qualifications-certification/update_evidence',
        hasApiToken: !!data.api_token,
        id: data.id,
        professional_id: data.professional_id,
        evidence: `File: ${(data.evidence as File).name}`,
      });

      response = await apiClient.post<UpdateEvidenceResponse>(
        '/qualifications-certification/update_evidence',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
    } else {
      // For images: send base64 string as JSON body
      const requestBody: any = {
        api_token: data.api_token,
        id: data.id,
        professional_id: data.professional_id,
        evidence: data.evidence as string,
      };

      console.log('POST /qualifications-certification/update_evidence - Request (JSON):', {
        endpoint: '/qualifications-certification/update_evidence',
        hasApiToken: !!requestBody.api_token,
        id: requestBody.id,
        professional_id: requestBody.professional_id,
        evidence: requestBody.evidence ? `${requestBody.evidence.substring(0, 50)}...` : 'not provided',
      });

      response = await apiClient.post<UpdateEvidenceResponse>(
        '/qualifications-certification/update_evidence',
        requestBody,
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('POST /qualifications-certification/update_evidence - Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating evidence:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error('API Error Response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
        });
        throw {
          success: false,
          message: error.response.data?.message || 'Failed to update evidence',
          error: error.response.data?.error || error.message,
          status: error.response.status,
        };
      } else if (error.request) {
        console.error('No response received. Request was made but no response:', error.request);
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