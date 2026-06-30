import { apiRequest } from '../repositories/api/apiClient';
import { workspaceFetch } from '../lib/workspaceApi';

export type EventCampaignStats = {
  targeted: number;
  active: number;
  pendingLogin: number;
  dismissed: number;
  converted: number;
  skippedHasTicket: number;
};

export type EventCampaign = {
  id: string;
  name: string;
  formId: string;
  formTitle: string;
  targetProductId: string;
  linkedDiscountCode?: string;
  mustBeAccepted: boolean;
  createdAt: string;
  stats: EventCampaignStats;
};

export type FormRespondentOption = {
  name: string;
  email: string;
  userId?: string;
  submittedAt: string;
};

export type EventCampaignOffer = {
  assignmentId: string;
  campaignId: string;
  campaignName: string;
  formTitle: string;
  targetProductId: string;
  linkedDiscountCode?: string;
  mustBeAccepted: boolean;
  recipientName?: string;
};

export type EventCampaignAnalyticsSummary = {
  totalCampaigns: number;
  totalAssignments: number;
  active: number;
  pendingLogin: number;
  dismissed: number;
  converted: number;
  skippedHasTicket: number;
};

export function buildEventCampaignCheckoutSearch(
  offer: Pick<EventCampaignOffer, 'targetProductId' | 'linkedDiscountCode'>,
): string {
  const params = new URLSearchParams();
  params.set('product', offer.targetProductId);
  if (offer.linkedDiscountCode?.trim()) {
    params.set('discount', offer.linkedDiscountCode.trim().toUpperCase());
  }
  params.set('checkout', '1');
  return params.toString();
}

export const EventCampaignService = {
  listCampaigns: async (): Promise<EventCampaign[]> => {
    const rows = await apiRequest<EventCampaign[]>('/event-campaigns');
    return Array.isArray(rows) ? rows : [];
  },

  listFormRespondents: async (formId: string): Promise<FormRespondentOption[]> => {
    const rows = await apiRequest<FormRespondentOption[]>(
      `/event-campaigns/forms/${encodeURIComponent(formId)}/respondents`,
    );
    return Array.isArray(rows) ? rows : [];
  },

  sendCampaign: async (payload: {
    name: string;
    formId: string;
    targetProductId: string;
    linkedDiscountCode?: string;
    mustBeAccepted: boolean;
    recipientEmails: string[];
  }): Promise<{ id: string; name: string; stats: Record<string, number> }> => {
    return apiRequest('/event-campaigns/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getAnalyticsSummary: async (): Promise<EventCampaignAnalyticsSummary> => {
    return apiRequest<EventCampaignAnalyticsSummary>(
      '/event-campaigns/analytics/summary',
    );
  },

  getPendingOffers: async (): Promise<EventCampaignOffer[]> => {
    const res = await workspaceFetch('/me/event-campaigns/pending', {
      method: 'GET',
    });
    if (res.status === 401 || res.status === 403) return [];
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Request failed with status ${res.status}`);
    }
    const rows = (await res.json()) as EventCampaignOffer[];
    return Array.isArray(rows) ? rows : [];
  },

  dismissOffer: async (assignmentId: string): Promise<void> => {
    const res = await workspaceFetch(
      `/me/event-campaigns/${encodeURIComponent(assignmentId)}/dismiss`,
      { method: 'POST' },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Request failed with status ${res.status}`);
    }
  },
};
