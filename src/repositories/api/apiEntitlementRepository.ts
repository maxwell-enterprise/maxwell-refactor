import { CreateWalletGiftInput, IEntitlementRepository } from '../contracts';
import {
  CorporateTeamMember,
  GiftAllocation,
  UserEntitlements,
  WalletItem,
  WalletMemberHub,
  WalletTransactionHistory,
} from '../../types/access';
import { apiRequest } from './apiClient';
import {
  normalizeUserEntitlements,
  normalizeWalletHistory,
  normalizeWalletItem,
  normalizeWalletItems,
} from './walletAdapters';

export class ApiEntitlementRepository implements IEntitlementRepository {
  async getUserEntitlements(userId: string): Promise<UserEntitlements | null> {
    const raw = await apiRequest<Record<string, unknown> | null>(
      `/wallet/entitlements/${encodeURIComponent(userId)}`,
    );
    return normalizeUserEntitlements(raw);
  }

  async upsertUserEntitlements(entitlements: UserEntitlements): Promise<void> {
    await apiRequest<UserEntitlements>(
      `/wallet/entitlements/${encodeURIComponent(entitlements.userId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(entitlements),
      },
    );
  }

  async getWalletItems(userId: string): Promise<WalletItem[]> {
    const rows = await apiRequest<unknown>(
      `/wallet/items?userId=${encodeURIComponent(userId)}`,
    );
    return normalizeWalletItems(rows);
  }

  async getAllWalletItems(): Promise<WalletItem[]> {
    const rows = await apiRequest<unknown>('/wallet/items');
    return normalizeWalletItems(rows);
  }

  async getWalletItemById(id: string): Promise<WalletItem | null> {
    const raw = await apiRequest<Record<string, unknown> | null>(
      `/wallet/items/${encodeURIComponent(id)}`,
    );
    if (!raw) return null;
    return normalizeWalletItem(raw);
  }

  async upsertWalletItem(item: WalletItem): Promise<void> {
    await apiRequest<WalletItem>(`/wallet/items/${encodeURIComponent(item.id)}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    });
  }

  async upsertWalletItems(items: WalletItem[]): Promise<void> {
    await apiRequest<WalletItem[]>('/wallet/items/bulk', {
      method: 'PUT',
      body: JSON.stringify({ items }),
    });
  }

  async getWalletHistory(userId: string): Promise<WalletTransactionHistory[]> {
    const rows = await apiRequest<unknown>(
      `/wallet/history/list?userId=${encodeURIComponent(userId)}`,
    );
    return normalizeWalletHistory(rows);
  }

  async getWalletMemberHub(_userId: string): Promise<WalletMemberHub | null> {
    try {
      return await apiRequest<WalletMemberHub>('/wallet/member-hub');
    } catch {
      return null;
    }
  }

  async logWalletTransaction(tx: WalletTransactionHistory): Promise<void> {
    await apiRequest<WalletTransactionHistory>('/wallet/history', {
      method: 'POST',
      body: JSON.stringify(tx),
    });
  }

  async getGiftAllocations(): Promise<GiftAllocation[]> {
    return apiRequest<GiftAllocation[]>('/wallet/gift-allocations');
  }

  async upsertGiftAllocation(gift: GiftAllocation): Promise<void> {
    await apiRequest<GiftAllocation>(
      `/wallet/gift-allocations/${encodeURIComponent(gift.id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(gift),
      },
    );
  }

  async createGift(input: CreateWalletGiftInput): Promise<GiftAllocation> {
    return apiRequest<GiftAllocation>('/wallet/gifts', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async claimGift(token: string): Promise<WalletItem> {
    const raw = await apiRequest<Record<string, unknown>>(
      `/wallet/gifts/claim?token=${encodeURIComponent(token)}`,
    );
    return normalizeWalletItem(raw);
  }

  async revokeGift(id: string, reason?: string): Promise<GiftAllocation> {
    return apiRequest<GiftAllocation>(`/wallet/gifts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
  }

  async getGiftInbox(userEmail: string): Promise<GiftAllocation[]> {
    return apiRequest<GiftAllocation[]>(
      `/wallet/gifts/inbox?email=${encodeURIComponent(userEmail)}`,
    );
  }

  async getSentGifts(): Promise<GiftAllocation[]> {
    return apiRequest<GiftAllocation[]>('/wallet/gifts/sent');
  }

  async getReceivedGifts(): Promise<GiftAllocation[]> {
    return apiRequest<GiftAllocation[]>('/wallet/gifts/received');
  }

  async getTeamMembers(orgId: string): Promise<CorporateTeamMember[]> {
    return apiRequest<CorporateTeamMember[]>(
      `/wallet/team-members?orgId=${encodeURIComponent(orgId)}`,
    );
  }

  async upsertTeamMember(
    member: CorporateTeamMember & { orgId: string },
  ): Promise<void> {
    await apiRequest<CorporateTeamMember>(
      `/wallet/team-members/${encodeURIComponent(member.id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(member),
      },
    );
  }

  async deleteTeamMember(id: string): Promise<void> {
    await apiRequest<void>(`/wallet/team-members/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }
}
