
import { CreateWalletGiftInput, IEntitlementRepository } from '../contracts';
import { UserEntitlements, WalletItem, GiftAllocation, CorporateTeamMember, WalletMemberHub, WalletTransactionHistory } from '../../types/access';
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

    async getWalletMemberHub(_userId: string): Promise<WalletMemberHub | null> {
        return null;
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

    async createGift(input: CreateWalletGiftInput): Promise<GiftAllocation> {
        const ticket = await this.getWalletItemById(input.walletItemId);
        if (!ticket) throw new Error("Wallet item not found");
        ticket.status = 'PENDING_CLAIM';
        ticket.meta = {
            ...(ticket.meta || {}),
            recipientName: input.recipientName,
            recipientEmail: input.recipientEmail,
            recipientPhone: input.recipientPhone,
            pendingClaimIssuedAt: new Date().toISOString(),
        };
        await this.upsertWalletItem(ticket);
        const gift: GiftAllocation = {
            id: `GFT-${Date.now()}`,
            sourceUserId: ticket.userId,
            sourceUserName: 'Supabase Sender',
            entitlementId: ticket.id,
            itemName: ticket.title,
            targetEmail: input.recipientEmail,
            recipientPhone: input.recipientPhone,
            claimToken: `gift_${Date.now()}`,
            tokenExpiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
            deliveryMethod: input.deliveryMethod,
            giftMessage: input.giftMessage,
            status: 'PENDING',
            createdAt: new Date().toISOString(),
        };
        await this.upsertGiftAllocation(gift);
        return gift;
    }

    async claimGift(token: string): Promise<WalletItem> {
        const gifts = await this.getGiftAllocations();
        const gift = gifts.find(g => g.claimToken === token);
        if (!gift) throw new Error("Gift not found");
        const ticket = await this.getWalletItemById(gift.entitlementId);
        if (!ticket) throw new Error("Wallet item not found");
        ticket.status = 'ACTIVE';
        await this.upsertWalletItem(ticket);
        gift.status = 'CLAIMED';
        gift.claimedAt = new Date().toISOString();
        await this.upsertGiftAllocation(gift);
        return ticket;
    }

    async revokeGift(id: string, _reason?: string): Promise<GiftAllocation> {
        const gifts = await this.getGiftAllocations();
        const gift = gifts.find(g => g.id === id);
        if (!gift) throw new Error("Gift not found");
        gift.status = 'REVOKED';
        gift.revokedAt = new Date().toISOString();
        await this.upsertGiftAllocation(gift);
        const ticket = await this.getWalletItemById(gift.entitlementId);
        if (ticket) {
            ticket.status = 'ACTIVE';
            await this.upsertWalletItem(ticket);
        }
        return gift;
    }

    async getGiftInbox(userEmail: string): Promise<GiftAllocation[]> {
        if (!supabase) throw new Error("Supabase client not initialized");
        const email = userEmail.trim().toLowerCase();
        const { data, error } = await supabase
            .from('gift_allocations')
            .select('*')
            .eq('status', 'PENDING')
            .ilike('targetEmail', email);
        if (error) return [];
        return (data as GiftAllocation[]) || [];
    }

    async getSentGifts(): Promise<GiftAllocation[]> {
        return this.getGiftAllocations();
    }

    async getReceivedGifts(): Promise<GiftAllocation[]> {
        return this.getGiftAllocations();
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
