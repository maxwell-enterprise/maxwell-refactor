import { IEntitlementRepository } from '../contracts';
import {
  CorporateTeamMember,
  GiftAllocation,
  UserEntitlements,
  WalletItem,
  WalletTransactionHistory,
} from '../../types/access';
import { apiRequest } from './apiClient';

export class ApiEntitlementRepository implements IEntitlementRepository {
  async getUserEntitlements(userId: string): Promise<UserEntitlements | null> {
    return apiRequest<UserEntitlements | null>(
      `/wallet/entitlements/${encodeURIComponent(userId)}`,
    );
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
    return apiRequest<WalletItem[]>(
      `/wallet/items?userId=${encodeURIComponent(userId)}`,
    );
  }

  async getAllWalletItems(): Promise<WalletItem[]> {
    return apiRequest<WalletItem[]>('/wallet/items');
  }

  async getWalletItemById(id: string): Promise<WalletItem | null> {
    return apiRequest<WalletItem | null>(
      `/wallet/items/${encodeURIComponent(id)}`,
    );
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
    return apiRequest<WalletTransactionHistory[]>(
      `/wallet/history/list?userId=${encodeURIComponent(userId)}`,
    );
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
