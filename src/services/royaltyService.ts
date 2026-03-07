
import { RoyaltyContract } from '../types/royalty';
import { APP_CONFIG } from '../lib/config';
import { DevDatabase } from '../utils/devDatabase';
import { supabase } from '../lib/supabaseClient';

export const RoyaltyService = {
    getAllContracts: async (): Promise<RoyaltyContract[]> => {
        if (APP_CONFIG.USE_MOCK) {
            try {
                if (await DevDatabase.isEmpty('royalty_contracts')) {
                    return [];
                }
                return await DevDatabase.getAll<RoyaltyContract>('royalty_contracts');
            } catch(e) { return []; }
        }
        if (!supabase) return [];
        const { data } = await supabase.from('royalty_contracts').select('*');
        return data || [];
    },

    getContractsByProduct: async (productId: string): Promise<RoyaltyContract[]> => {
        const all = await RoyaltyService.getAllContracts();
        return all.filter(c => c.productId === productId);
    },

    upsertContract: async (contract: RoyaltyContract): Promise<void> => {
        if (APP_CONFIG.USE_MOCK) {
            await DevDatabase.add('royalty_contracts', contract);
            return;
        }
        if (!supabase) return;
        await supabase.from('royalty_contracts').upsert(contract);
    },

    deleteContract: async (id: string): Promise<void> => {
        if (APP_CONFIG.USE_MOCK) {
            await DevDatabase.delete('royalty_contracts', id);
            return;
        }
        if (!supabase) return;
        await supabase.from('royalty_contracts').delete().eq('id', id);
    }
};
