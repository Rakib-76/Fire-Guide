import axios from 'axios';
import { resolveApiBaseUrl } from '../lib/apiBaseUrl';

const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

export interface ContactUsMailRequest {
  full_name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export interface ContactUsMailResponse {
  status?: boolean | string;
  success?: boolean;
  message?: string;
  error?: string;
}

/**
 * POST /contact-us-mail — public contact form (no api_token).
 */
export const sendContactUsMail = async (
  payload: ContactUsMailRequest
): Promise<ContactUsMailResponse> => {
  const response = await apiClient.post<ContactUsMailResponse>('/contact-us-mail', payload);
  return response.data;
};
