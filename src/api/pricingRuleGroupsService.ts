import axios from 'axios';
import { resolveApiBaseUrl } from '../lib/apiBaseUrl';

const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

export interface PricingRuleGroupItem {
  id: number;
  service_id: number;
  rule_name: string;
  created_at: string;
  updated_at: string;
  service?: {
    id: number;
    service_name: string;
  };
}

export interface PricingRuleGroupsResponse {
  status: boolean;
  message: string;
  data: PricingRuleGroupItem[];
}

export interface PricingRuleGroupSingleResponse {
  status: boolean;
  message: string;
  data: PricingRuleGroupItem;
}

/**
 * Fetch a single pricing rule group by ID
 * POST https://fireguide.attoexasolutions.com/api/pricing-rule-groups/get-single
 * Body: { api_token, id }
 */
export const getPricingRuleGroupSingle = async (
  apiToken: string,
  id: number
): Promise<PricingRuleGroupSingleResponse> => {
  try {
    const response = await apiClient.post<PricingRuleGroupSingleResponse>(
      '/pricing-rule-groups/get-single',
      { api_token: apiToken, id }
    );
    const body = response.data;
    if (body?.status && body?.data) {
      return body;
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

/**
 * Update a pricing rule group
 * POST https://fireguide.attoexasolutions.com/api/pricing-rule-groups/update
 * Body: { api_token, id, service_id, rule_name }
 */
export const updatePricingRuleGroup = async (
  apiToken: string,
  id: number,
  serviceId: number,
  ruleName: string
): Promise<{ status: boolean; message?: string }> => {
  try {
    const response = await apiClient.post<{ status: boolean; message?: string }>(
      '/pricing-rule-groups/update',
      { api_token: apiToken, id, service_id: serviceId, rule_name: ruleName }
    );
    const body = response.data;
    if (!body?.status) {
      throw new Error((body as { message?: string })?.message || 'Update failed');
    }
    return body;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? err.message;
      throw new Error(typeof msg === 'string' ? msg : 'Failed to update');
    }
    throw err;
  }
};

/**
 * Delete a pricing rule group
 * POST https://fireguide.attoexasolutions.com/api/pricing-rule-groups/delete
 * Body: { api_token, id }
 */
export const deletePricingRuleGroup = async (
  apiToken: string,
  id: number
): Promise<{ status: boolean; message?: string }> => {
  try {
    const response = await apiClient.post<{ status: boolean; message?: string }>(
      '/pricing-rule-groups/delete',
      { api_token: apiToken, id }
    );
    const body = response.data;
    if (!body?.status) {
      throw new Error((body as { message?: string })?.message || 'Delete failed');
    }
    return body;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? err.message;
      throw new Error(typeof msg === 'string' ? msg : 'Failed to delete');
    }
    throw err;
  }
};

/**
 * Create a new pricing rule group
 * POST https://fireguide.attoexasolutions.com/api/pricing-rule-groups/store
 * Body: { api_token, service_id, rule_name }
 */
export const storePricingRuleGroup = async (
  apiToken: string,
  serviceId: number,
  ruleName: string
): Promise<{ status: boolean; message?: string; data?: PricingRuleGroupItem }> => {
  try {
    const response = await apiClient.post<
      { status: boolean; message?: string; data?: PricingRuleGroupItem }
    >('/pricing-rule-groups/store', {
      api_token: apiToken,
      service_id: serviceId,
      rule_name: ruleName,
    });
    const body = response.data;
    if (!body?.status) {
      throw new Error((body as { message?: string })?.message || 'Create failed');
    }
    return body;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? err.message;
      throw new Error(typeof msg === 'string' ? msg : 'Failed to create');
    }
    throw err;
  }
};

/**
 * Fetch all pricing rule groups
 * GET https://fireguide.attoexasolutions.com/api/pricing-rule-groups/get-all
 */
export const getPricingRuleGroupsAll = async (
  apiToken?: string | null
): Promise<PricingRuleGroupsResponse> => {
  const response = await apiClient.get<PricingRuleGroupsResponse>(
    '/pricing-rule-groups/get-all',
    apiToken ? { params: { api_token: apiToken } } : undefined
  );
  return response.data;
};
