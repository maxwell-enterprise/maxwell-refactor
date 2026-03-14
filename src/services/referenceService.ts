
import { MasterTier } from '../types/reference';
import { SEED_MASTER_TIERS } from '../seeds/master_tiers';
import { APP_CONFIG } from '../lib/config';
import { DevDatabase } from '../utils/devDatabase';
import { supabase } from '../lib/supabaseClient';
import { apiRequest } from '../repositories/api/apiClient';

interface ApiMasterTier {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    basePriceIdr?: number | null;
    createdAt?: string;
}

const shouldUseApi = () =>
    !APP_CONFIG.USE_MOCK_GLOBAL &&
    (APP_CONFIG.DOMAINS.OPS === 'API' || APP_CONFIG.DOMAINS.EVENTS === 'API');

const mapApiMasterTier = (tier: ApiMasterTier): MasterTier => ({
    id: tier.code,
    name: tier.name,
    category: 'PAID',
    defaultColor: 'bg-slate-100 text-slate-600'
});

export const ReferenceService = {
    
    getMasterTiers: async (): Promise<MasterTier[]> => {
        if (shouldUseApi()) {
            const data = await apiRequest<ApiMasterTier[]>('/master-tiers');
            return data.map(mapApiMasterTier);
        }

        if (APP_CONFIG.USE_MOCK) {
            try {
                if (await DevDatabase.isEmpty('ref_master_tiers')) {
                    await DevDatabase.bulkAdd('ref_master_tiers', SEED_MASTER_TIERS);
                    return SEED_MASTER_TIERS;
                }
                return await DevDatabase.getAll<MasterTier>('ref_master_tiers');
            } catch (e) {
                return SEED_MASTER_TIERS;
            }
        }

        if (!supabase) return SEED_MASTER_TIERS;
        
        const { data, error } = await supabase.from('ref_master_tiers').select('*');
        if (error || !data) return SEED_MASTER_TIERS;
        
        return data as MasterTier[];
    },

    upsertMasterTier: async (tier: MasterTier): Promise<void> => {
        // Enforce uppercase ID for consistency
        const formattedTier = { ...tier, id: tier.id.toUpperCase().replace(/\s+/g, '_') };

        if (shouldUseApi()) {
            const existing = (await apiRequest<ApiMasterTier[]>('/master-tiers')).find(item => item.code === formattedTier.id);
            const payload = JSON.stringify({
                code: formattedTier.id,
                name: formattedTier.name
            });

            if (existing) {
                await apiRequest<ApiMasterTier>(`/master-tiers/${encodeURIComponent(existing.id)}`, {
                    method: 'PATCH',
                    body: payload
                });
                return;
            }

            await apiRequest<ApiMasterTier>('/master-tiers', {
                method: 'POST',
                body: payload
            });
            return;
        }
        
        if (APP_CONFIG.USE_MOCK) {
            await DevDatabase.add('ref_master_tiers', formattedTier);
            return;
        }

        if (supabase) {
            await supabase.from('ref_master_tiers').upsert(formattedTier);
        }
    },

    deleteMasterTier: async (id: string): Promise<void> => {
        if (shouldUseApi()) {
            const existing = (await apiRequest<ApiMasterTier[]>('/master-tiers')).find(item => item.code === id || item.id === id);
            if (!existing) return;
            await apiRequest<void>(`/master-tiers/${encodeURIComponent(existing.id)}`, {
                method: 'DELETE'
            });
            return;
        }

        if (APP_CONFIG.USE_MOCK) {
            await DevDatabase.delete('ref_master_tiers', id);
            return;
        }
        if (supabase) {
            await supabase.from('ref_master_tiers').delete().eq('id', id);
        }
    }
};
