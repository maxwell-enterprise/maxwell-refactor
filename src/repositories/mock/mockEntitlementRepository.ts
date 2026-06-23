
import { CreateWalletGiftInput, IEntitlementRepository } from '../contracts';
import { UserEntitlements, WalletItem, GiftAllocation, CorporateTeamMember, WalletMemberHub, WalletTransactionHistory } from '../../types/access';
import { DevDatabase } from '../../utils/devDatabase';
import { SEED_ENTITLEMENTS } from '../../services/entitlementService';
import { AUTH_TEST_WALLET_ITEMS } from '../../seeds/auth_test_user';
import { SEED_TRANSFER_ALLOCATIONS } from '../../seeds/transfer_test';
import { SEED_WALLET_HISTORY } from '../../seeds/wallet_history_test'; // NEW SEED

export class MockEntitlementRepository implements IEntitlementRepository {

    async getUserEntitlements(userId: string): Promise<UserEntitlements | null> {
        try {
            if (await DevDatabase.isEmpty('user_entitlements')) {
                await DevDatabase.bulkAdd('user_entitlements', SEED_ENTITLEMENTS);
            }
            const all = await DevDatabase.getAll<UserEntitlements>('user_entitlements');
            return all.find(e => e.userId === userId) || null;
        } catch (e) {
            return null;
        }
    }

    async upsertUserEntitlements(entitlements: UserEntitlements): Promise<void> {
        await DevDatabase.add('user_entitlements', entitlements);
    }

    async getWalletItems(userId: string): Promise<WalletItem[]> {
        try {
            if (await DevDatabase.isEmpty('wallet_items')) {
                await DevDatabase.bulkAdd('wallet_items', AUTH_TEST_WALLET_ITEMS);
                return AUTH_TEST_WALLET_ITEMS.filter(item => item.userId === userId);
            }
            const allItems = await DevDatabase.getAll<WalletItem>('wallet_items');
            return allItems.filter(item => item.userId === userId);
        } catch (e) {
            return [];
        }
    }

    async getAllWalletItems(): Promise<WalletItem[]> {
        try {
            return await DevDatabase.getAll<WalletItem>('wallet_items');
        } catch (e) {
            return AUTH_TEST_WALLET_ITEMS;
        }
    }

    async getWalletItemById(id: string): Promise<WalletItem | null> {
        const all = await this.getAllWalletItems();
        return all.find(i => i.id === id) || null;
    }

    async upsertWalletItem(item: WalletItem): Promise<void> {
        await DevDatabase.add('wallet_items', item);
    }

    async upsertWalletItems(items: WalletItem[]): Promise<void> {
        await DevDatabase.bulkAdd('wallet_items', items);
    }

    // --- NEW: HISTORY METHODS ---
    async getWalletHistory(userId: string): Promise<WalletTransactionHistory[]> {
        try {
            if (await DevDatabase.isEmpty('wallet_transactions')) {
                await DevDatabase.bulkAdd('wallet_transactions', SEED_WALLET_HISTORY);
            }
            const all = await DevDatabase.getAll<WalletTransactionHistory>('wallet_transactions');
            return all.filter(h => h.userId === userId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        } catch (e) {
            return SEED_WALLET_HISTORY.filter(h => h.userId === userId);
        }
    }

    async logWalletTransaction(tx: WalletTransactionHistory): Promise<void> {
        await DevDatabase.add('wallet_transactions', tx);
    }

    async getWalletMemberHub(userId: string): Promise<WalletMemberHub | null> {
        return {
            appUserId: userId,
            displayName: 'Demo Member',
            email: 'member@example.com',
            memberPublicId: `M-${userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) || 'DEMO'}`,
            gateScanQrPayload: `MEMBER:${userId}`,
            membershipTier: 'BRONZE',
            cardNumber: 'MX-DEMO-001',
            gamification: {
                totalPoints: 120,
                currentLevel: '2',
                rank: 8,
            },
            card: null,
        };
    }
    // ----------------------------

    async getGiftAllocations(): Promise<GiftAllocation[]> {
        try {
            if (await DevDatabase.isEmpty('gift_allocations')) {
                await DevDatabase.bulkAdd('gift_allocations', SEED_TRANSFER_ALLOCATIONS);
                return SEED_TRANSFER_ALLOCATIONS;
            }
            return await DevDatabase.getAll<GiftAllocation>('gift_allocations');
        } catch (e) {
            return SEED_TRANSFER_ALLOCATIONS;
        }
    }

    async upsertGiftAllocation(gift: GiftAllocation): Promise<void> {
        await DevDatabase.add('gift_allocations', gift);
    }

    async createGift(input: CreateWalletGiftInput): Promise<GiftAllocation> {
        const ticket = await this.getWalletItemById(input.walletItemId);
        if (!ticket) throw new Error('Wallet item not found');
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
            sourceUserName: 'Mock Sender',
            entitlementId: ticket.id,
            itemName: ticket.title,
            targetEmail: input.recipientEmail,
            recipientName: input.recipientName,
            recipientPhone: input.recipientPhone,
            claimToken: `gift_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
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
        if (!gift) throw new Error('Gift not found');
        const ticket = await this.getWalletItemById(gift.entitlementId);
        if (!ticket) throw new Error('Wallet item not found');
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
        if (!gift) throw new Error('Gift not found');
        gift.status = 'REVOKED';
        gift.revokedAt = new Date().toISOString();
        await this.upsertGiftAllocation(gift);
        const ticket = await this.getWalletItemById(gift.entitlementId);
        if (ticket) {
            ticket.status = 'ACTIVE';
            if (ticket.meta && typeof ticket.meta === 'object') {
                delete ticket.meta.recipientName;
                delete ticket.meta.recipientEmail;
                delete ticket.meta.recipientPhone;
                delete ticket.meta.pendingClaimIssuedAt;
            }
            await this.upsertWalletItem(ticket);
        }
        return gift;
    }

    async getGiftInbox(userEmail: string): Promise<GiftAllocation[]> {
        const email = userEmail.trim().toLowerCase();
        const gifts = await this.getGiftAllocations();
        return gifts.filter(g =>
            g.status === 'PENDING' &&
            ((g.targetEmail || '').toLowerCase() === email)
        );
    }

    async getSentGifts(): Promise<GiftAllocation[]> {
        return this.getGiftAllocations();
    }

    async getReceivedGifts(): Promise<GiftAllocation[]> {
        return this.getGiftAllocations();
    }

    async getTeamMembers(orgId: string): Promise<CorporateTeamMember[]> {
        try {
            if (await DevDatabase.isEmpty('corporate_members')) return [];
            const all = await DevDatabase.getAll<any>('corporate_members');
            return all.filter(m => m.orgId === orgId);
        } catch (e) {
            return [];
        }
    }

    async upsertTeamMember(member: CorporateTeamMember & { orgId: string }): Promise<void> {
        await DevDatabase.add('corporate_members', member);
    }

    async deleteTeamMember(id: string): Promise<void> {
        await DevDatabase.delete('corporate_members', id);
    }
}
