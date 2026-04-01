
import { MasterTier } from '../types/reference';
import { SEED_MASTER_TIERS } from '../seeds/master_tiers';
import { APP_CONFIG, assertExternalApiMode, BackendMode } from '../lib/config';
import { DevDatabase } from '../utils/devDatabase';
import { supabase } from '../lib/supabaseClient';
import { apiRequest } from '../repositories/api/apiClient';

interface ApiMasterTier {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    basePriceIdr?: number | string | null;
    createdAt?: string;
}

const shouldUseApi = () =>
    !APP_CONFIG.USE_MOCK_GLOBAL &&
    (APP_CONFIG.DOMAINS.OPS === 'API' || APP_CONFIG.DOMAINS.EVENTS === 'API');

const getReferenceMode = (): BackendMode =>
    shouldUseApi() ? 'API' : APP_CONFIG.USE_MOCK ? 'MOCK' : 'SUPABASE';

const normalizeBasePriceIdr = (value: ApiMasterTier['basePriceIdr']): number | undefined => {
    if (value === null || value === undefined || value === '') return undefined;
    const normalized = typeof value === 'string' ? Number(value) : value;
    return Number.isFinite(normalized) ? normalized : undefined;
};

const mapApiMasterTier = (tier: ApiMasterTier): MasterTier => ({
    backendId: tier.id,
    id: tier.code,
    name: tier.name,
    description: tier.description ?? undefined,
    basePriceIdr: normalizeBasePriceIdr(tier.basePriceIdr),
    createdAt: tier.createdAt
});

export const ReferenceService = {
    
    getMasterTiers: async (): Promise<MasterTier[]> => {
        assertExternalApiMode('Master tiers', getReferenceMode());
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
        assertExternalApiMode('Master tiers', getReferenceMode());

        if (shouldUseApi()) {
            const payload = JSON.stringify({
                code: formattedTier.id,
                name: formattedTier.name,
                description: formattedTier.description?.trim() || undefined,
                basePriceIdr: formattedTier.basePriceIdr
            });

            const targetId = formattedTier.backendId
                ?? (await apiRequest<ApiMasterTier[]>('/master-tiers')).find(item => item.code === formattedTier.id)?.id;

            if (targetId) {
                await apiRequest<ApiMasterTier>(`/master-tiers/${encodeURIComponent(targetId)}`, {
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

    deleteMasterTier: async (tier: Pick<MasterTier, 'id' | 'backendId'>): Promise<void> => {
        assertExternalApiMode('Master tiers', getReferenceMode());
        if (shouldUseApi()) {
            const targetId = tier.backendId
                ?? (await apiRequest<ApiMasterTier[]>('/master-tiers')).find(item => item.code === tier.id || item.id === tier.id)?.id;
            if (!targetId) return;
            await apiRequest<void>(`/master-tiers/${encodeURIComponent(targetId)}`, {
                method: 'DELETE'
            });
            return;
        }

        if (APP_CONFIG.USE_MOCK) {
            await DevDatabase.delete('ref_master_tiers', tier.id);
            return;
        }
        if (supabase) {
            await supabase.from('ref_master_tiers').delete().eq('id', tier.id);
        }
    }
};
