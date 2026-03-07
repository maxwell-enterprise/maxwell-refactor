
import { IInventoryRepository } from '../contracts';
import { InventoryItem, InventoryTransaction } from '../../types/index';
import { supabase } from '../../lib/supabaseClient';

export class SupabaseInventoryRepository implements IInventoryRepository {
    async getAll(): Promise<InventoryItem[]> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data, error } = await supabase.from('inventory').select('*');
        if (error) {
            console.error("Supabase Inventory Fetch Error:", error);
            return [];
        }
        return data as InventoryItem[];
    }

    async upsert(item: InventoryItem): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { error } = await supabase.from('inventory').upsert(item);
        if (error) throw error;
    }

    async getTransactions(): Promise<InventoryTransaction[]> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data, error } = await supabase.from('inventory_transactions').select('*').order('timestamp', { ascending: false });
        if (error) return [];
        return data as InventoryTransaction[];
    }

    async logTransaction(tx: InventoryTransaction): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { error } = await supabase.from('inventory_transactions').insert(tx);
        if (error) throw error;
    }
}
