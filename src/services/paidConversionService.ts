import { PaidConversionRecord } from '../types/index';
import { apiRequest } from '../repositories/api/apiClient';

type PaidConversionListResponse = {
  items: PaidConversionRecord[];
  total: number;
  counts: { all: number; lead: number; paid: number };
};

export const PaidConversionService = {
  list: async (params?: {
    search?: string;
    campaignSourceCode?: string;
    campaignOnly?: boolean;
    picMemberId?: string;
    stageSegment?: 'ALL' | 'LEAD' | 'PAID';
    eventType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaidConversionListResponse> => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.campaignSourceCode) {
      query.set('campaignSourceCode', params.campaignSourceCode);
    }
    if (params?.campaignOnly) query.set('campaignOnly', 'true');
    if (params?.picMemberId) query.set('picMemberId', params.picMemberId);
    if (params?.stageSegment && params.stageSegment !== 'ALL') {
      query.set('stageSegment', params.stageSegment);
    }
    if (params?.eventType) query.set('eventType', params.eventType);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    if (params?.limit != null) query.set('limit', String(params.limit));
    if (params?.offset != null) query.set('offset', String(params.offset));

    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiRequest<PaidConversionListResponse>(`/paid-conversions${suffix}`);
  },

  assignPic: async (body: {
    subjectEmail: string;
    subjectMemberId?: string;
    picMemberId?: string;
    picName?: string;
    notes?: string;
  }): Promise<{ assignmentId: string }> => {
    return apiRequest<{ assignmentId: string }>('/paid-conversions/assign-pic', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  trackSignIn: async (body: {
    campaignSourceCode?: string;
    name?: string;
  }): Promise<PaidConversionRecord | null> => {
    return apiRequest<PaidConversionRecord | null>('/paid-conversions/track-sign-in', {
      method: 'POST',
      body: JSON.stringify(body),
      skipBackendFailureTracking: true,
    });
  },
};
