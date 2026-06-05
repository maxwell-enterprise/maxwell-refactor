import { Campaign } from '../types/index';
import { apiRequest } from '../repositories/api/apiClient';
import { sanitizeCampaignSourceCodeInput } from '../lib/campaignSourceCode';

const normalizeOptionalString = (value?: string) => {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const buildGeneratedLink = (
  sourceCode: string,
  targetProductId?: string,
  linkedDiscountCode?: string,
) => {
  const params = new URLSearchParams();
  params.set('view', 'store');
  if (targetProductId) params.set('product', targetProductId);
  if (sourceCode) params.set('source', sourceCode);
  if (linkedDiscountCode) params.set('discount', linkedDiscountCode);
  return `/?${params.toString()}`;
};

const sanitizeCampaignPayload = (data: Partial<Campaign>) => {
  const sourceCode = sanitizeCampaignSourceCodeInput(normalizeOptionalString(data.sourceCode) || '');
  const targetProductId = normalizeOptionalString(data.targetProductId);
  const linkedDiscountCode = normalizeOptionalString(data.linkedDiscountCode);

  return {
    ...data,
    sourceCode,
    targetProductId,
    linkedDiscountCode,
    generatedLink:
      data.generatedLink ||
      buildGeneratedLink(sourceCode, targetProductId, linkedDiscountCode),
  };
};

export const CampaignService = {
  getCampaigns: async (): Promise<Campaign[]> => {
    return await apiRequest<Campaign[]>('/campaigns');
  },

  createCampaign: async (data: Partial<Campaign>): Promise<Campaign> => {
    const payload = sanitizeCampaignPayload(data);
    return await apiRequest<Campaign>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateCampaign: async (id: string, data: Partial<Campaign>): Promise<Campaign | null> => {
    const payload = sanitizeCampaignPayload(data);
    return await apiRequest<Campaign>(`/campaigns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteCampaign: async (id: string): Promise<{ ok: boolean }> => {
    return await apiRequest<{ ok: boolean }>(`/campaigns/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  trackClick: async (source: string) => {
      await apiRequest<{ success: boolean }>('/campaigns/track-click', {
        method: 'POST',
        body: JSON.stringify({ sourceCode: source }),
      });
  },

  trackConversion: async (source: string, amount: number) => {
      await apiRequest<{ success: boolean }>('/campaigns/track-conversion', {
        method: 'POST',
        body: JSON.stringify({ sourceCode: source, amount }),
      });
  },

  bulkUpsertCampaigns: async (items: Partial<Campaign>[]): Promise<{ inserted: number; updated: number; total: number }> => {
      return await apiRequest<{ inserted: number; updated: number; total: number }>('/campaigns/bulk', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'upsert',
          items: items.map(sanitizeCampaignPayload),
        }),
      });
  }
};
