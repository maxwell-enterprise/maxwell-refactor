import { apiRequest } from '../repositories/api/apiClient';

export const ReferralService = {
    wasClaimed(ref: string): boolean {
        return false;
    },

    async claim(ref: string): Promise<{ applied: boolean; facilitatorName?: string }> {
        const normalized = ref.trim();
        if (!normalized) return { applied: false };
        const result = await apiRequest<{ applied: boolean; facilitatorName?: string }>(
            '/members/me/referral/claim',
            {
                method: 'POST',
                body: JSON.stringify({ ref: normalized }),
                skipBackendFailureTracking: true,
            },
        );
        return result;
    },
};
