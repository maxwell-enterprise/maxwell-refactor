
import { MasterTier } from '../types/reference';
import { SEED_MASTER_TIERS } from '../seeds/master_tiers';
import { APP_CONFIG } from '../lib/config';
import { DevDatabase } from '../utils/devDatabase';
import { supabase } from '../lib/supabaseClient';

export const ReferenceService = {
    
    getMasterTiers: async (): Promise<MasterTier[]> => {
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
        
        if (APP_CONFIG.USE_MOCK) {
            await DevDatabase.add('ref_master_tiers', formattedTier);
            return;
        }

        if (supabase) {
            await supabase.from('ref_master_tiers').upsert(formattedTier);
        }
    },

    deleteMasterTier: async (id: string): Promise<void> => {
        if (APP_CONFIG.USE_MOCK) {
            await DevDatabase.delete('ref_master_tiers', id);
            return;
        }
        if (supabase) {
            await supabase.from('ref_master_tiers').delete().eq('id', id);
        }
    }
};
