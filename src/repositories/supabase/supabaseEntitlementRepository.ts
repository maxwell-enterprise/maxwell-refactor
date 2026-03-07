
import { IEntitlementRepository } from '../contracts';
import { UserEntitlements, WalletItem, GiftAllocation, CorporateTeamMember, WalletTransactionHistory } from '../../types/access';
import { supabase } from '../../lib/supabaseClient';

export class SupabaseEntitlementRepository implements IEntitlementRepository {

    async getUserEntitlements(userId: string): Promise<UserEntitlements | null> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data, error } = await supabase.from('user_entitlements').select('*').eq('userId', userId).single();
        if (error) return null;
        return data as UserEntitlements;
    }

    async upsertUserEntitlements(entitlements: UserEntitlements): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { error } = await supabase.from('user_entitlements').upsert(entitlements);
        if (error) throw error;
    }

    async getWalletItems(userId: string): Promise<WalletItem[]> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data, error } = await supabase.from('wallet_items').select('*').eq('userId', userId);
        if (error) return [];
        return data as WalletItem[];
    }

    async getAllWalletItems(): Promise<WalletItem[]> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data, error } = await supabase.from('wallet_items').select('*');
        if (error) return [];
        return data as WalletItem[];
    }

    async getWalletItemById(id: string): Promise<WalletItem | null> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data, error } = await supabase.from('wallet_items').select('*').eq('id', id).single();
        if (error) return null;
        return data as WalletItem;
    }

    async upsertWalletItem(item: WalletItem): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { error } = await supabase.from('wallet_items').upsert(item);
        if (error) throw error;
    }

    async upsertWalletItems(items: WalletItem[]): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { error } = await supabase.from('wallet_items').upsert(items);
        if (error) throw error;
    }

    // --- NEW: HISTORY METHODS ---
    async getWalletHistory(userId: string): Promise<WalletTransactionHistory[]> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data, error } = await supabase
            .from('wallet_transactions')
            .select('*')
            .eq('userId', userId)
            .order('timestamp', { ascending: false });
        if (error) return [];
        return data as WalletTransactionHistory[];
    }

    async logWalletTransaction(tx: WalletTransactionHistory): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { error } = await supabase.from('wallet_transactions').insert(tx);
        if (error) throw error;
    }
    // ----------------------------

    async getGiftAllocations(): Promise<GiftAllocation[]> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data } = await supabase.from('gift_allocations').select('*');
        return data as GiftAllocation[] || [];
    }

    async upsertGiftAllocation(gift: GiftAllocation): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { error } = await supabase.from('gift_allocations').upsert(gift);
        if (error) throw error;
    }

    async getTeamMembers(orgId: string): Promise<CorporateTeamMember[]> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { data } = await supabase.from('corporate_members').select('*').eq('orgId', orgId);
        return data as CorporateTeamMember[] || [];
    }

    async upsertTeamMember(member: CorporateTeamMember & { orgId: string }): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { error } = await supabase.from('corporate_members').insert(member);
        if (error) throw error;
    }

    async deleteTeamMember(id: string): Promise<void> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const { error } = await supabase.from('corporate_members').delete().eq('id', id);
        if (error) throw error;
    }
}
