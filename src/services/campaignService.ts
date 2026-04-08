import { Campaign } from '../types/index';
import { APP_CONFIG } from '../lib/config';

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
  const sourceCode = normalizeOptionalString(data.sourceCode) || '';
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

const fetchJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const baseUrl = APP_CONFIG.API_BASE_URL.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const response = await fetch(`${baseUrl}${normalizedPath}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
};

export const CampaignService = {
  getCampaigns: async (): Promise<Campaign[]> => {
    return await fetchJson<Campaign[]>('/campaigns');
  },

  createCampaign: async (data: Partial<Campaign>): Promise<Campaign> => {
    const payload = sanitizeCampaignPayload(data);
    return await fetchJson<Campaign>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateCampaign: async (id: string, data: Partial<Campaign>): Promise<Campaign | null> => {
    const payload = sanitizeCampaignPayload(data);
    return await fetchJson<Campaign>(`/campaigns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  trackClick: async (source: string) => {
      await fetchJson<{ success: boolean }>('/campaigns/track-click', {
        method: 'POST',
        body: JSON.stringify({ sourceCode: source }),
      });
  },

  trackConversion: async (source: string, amount: number) => {
      await fetchJson<{ success: boolean }>('/campaigns/track-conversion', {
        method: 'POST',
        body: JSON.stringify({ sourceCode: source, amount }),
      });
  },

  bulkUpsertCampaigns: async (items: Partial<Campaign>[]): Promise<{ inserted: number; updated: number; total: number }> => {
      return await fetchJson<{ inserted: number; updated: number; total: number }>('/campaigns/bulk', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'upsert',
          items: items.map(sanitizeCampaignPayload),
        }),
      });
  }
};
