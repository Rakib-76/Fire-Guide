import axios from 'axios';
import { resolveApiBaseUrl } from '../lib/apiBaseUrl';

const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

export interface PricingRuleItem {
  id: number;
  pricing_rule_group_id: number;
  min_value: number;
  max_value: number;
  option_key: string | null;
  option_label: string | null;
  extra_price: string;
  is_custom_quote_trigger: number;
  created_at: string;
  updated_at: string;
  group?: {
    id: number;
    rule_name: string;
    service_id: number;
  };
}

export interface PricingRulesResponse {
  status: boolean;
  message: string;
  data: PricingRuleItem[];
}

export interface PricingRuleSingleResponse {
  status: boolean;
  message: string;
  data: PricingRuleItem;
}

/**
 * Fetch a single pricing rule by ID
 * POST https://fireguide.attoexasolutions.com/api/pricing-rules/get-single
 * Body: { api_token, id }
 */
export const getPricingRuleSingle = async (
  apiToken: string,
  id: number
): Promise<PricingRuleSingleResponse> => {
  try {
    const response = await apiClient.post<PricingRuleSingleResponse>(
      '/pricing-rules/get-single',
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
 * Update a pricing rule
 * POST https://fireguide.attoexasolutions.com/api/pricing-rules/update
 * Body: { api_token, id, pricing_rule_group_id, min_value, max_value, option_key, option_label, extra_price, is_custom_quote_trigger }
 */
export const updatePricingRule = async (
  apiToken: string,
  id: number,
  pricingRuleGroupId: number,
  minValue: number,
  maxValue: number,
  optionKey: string | null,
  optionLabel: string | null,
  extraPrice: number,
  isCustomQuoteTrigger: boolean
): Promise<{ status: boolean; message?: string }> => {
  try {
    const response = await apiClient.post<{ status: boolean; message?: string }>(
      '/pricing-rules/update',
      {
        api_token: apiToken,
        id,
        pricing_rule_group_id: pricingRuleGroupId,
        min_value: minValue,
        max_value: maxValue,
        option_key: optionKey,
        option_label: optionLabel,
        extra_price: extraPrice,
        is_custom_quote_trigger: isCustomQuoteTrigger,
      }
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
 * Delete a pricing rule
 * POST https://fireguide.attoexasolutions.com/api/pricing-rules/delete
 * Body: { api_token, id }
 */
export const deletePricingRule = async (
  apiToken: string,
  id: number
): Promise<{ status: boolean; message?: string }> => {
  try {
    const response = await apiClient.post<{ status: boolean; message?: string }>(
      '/pricing-rules/delete',
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
 * Create a new pricing rule
 * POST https://fireguide.attoexasolutions.com/api/pricing-rules/store
 * Body: { api_token, pricing_rule_group_id, min_value, max_value, option_key, option_label, extra_price, is_custom_quote_trigger }
 */
export const storePricingRule = async (
  apiToken: string,
  pricingRuleGroupId: number,
  minValue: number,
  maxValue: number,
  optionKey: string | null,
  optionLabel: string | null,
  extraPrice: number,
  isCustomQuoteTrigger: boolean
): Promise<{ status: boolean; message?: string; data?: PricingRuleItem }> => {
  try {
    const response = await apiClient.post<
      { status: boolean; message?: string; data?: PricingRuleItem }
    >('/pricing-rules/store', {
      api_token: apiToken,
      pricing_rule_group_id: pricingRuleGroupId,
      min_value: minValue,
      max_value: maxValue,
      option_key: optionKey,
      option_label: optionLabel,
      extra_price: extraPrice,
      is_custom_quote_trigger: isCustomQuoteTrigger,
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
 * Fetch all pricing rules for a rule group
 * POST https://fireguide.attoexasolutions.com/api/pricing-rules/get-all
 * Body: { api_token, pricing_rule_group_id }
 */
export const getPricingRulesAll = async (
  apiToken: string,
  pricingRuleGroupId: number
): Promise<PricingRulesResponse> => {
  try {
    const response = await apiClient.post<PricingRulesResponse>(
      '/pricing-rules/get-all',
      { api_token: apiToken, pricing_rule_group_id: pricingRuleGroupId }
    );
    const body = response.data;
    if (body?.status && Array.isArray(body?.data)) {
      return body;
    }
    return { status: true, message: body?.message ?? '', data: [] };
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? err.message;
      throw new Error(typeof msg === 'string' ? msg : 'Failed to fetch pricing rules');
    }
    throw err;
  }
};
