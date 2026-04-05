import { Badge, PointRule, UserGamificationProfile } from '../../types/gamification';
import { IGamificationRepository } from '../contracts';
import { apiRequest } from './apiClient';

export class ApiGamificationRepository implements IGamificationRepository {
  async getBadges(): Promise<Badge[]> {
    return apiRequest<Badge[]>('/gamification/badges');
  }

  async upsertBadge(badge: Badge): Promise<void> {
    await apiRequest(`/gamification/badges/${encodeURIComponent(badge.id)}`, {
      method: 'PUT',
      body: JSON.stringify(badge),
    });
  }

  async getRules(): Promise<PointRule[]> {
    return apiRequest<PointRule[]>('/gamification/rules');
  }

  async upsertRule(rule: PointRule): Promise<void> {
    await apiRequest(`/gamification/rules/${encodeURIComponent(rule.id)}`, {
      method: 'PUT',
      body: JSON.stringify(rule),
    });
  }

  async getProfile(userId: string): Promise<UserGamificationProfile | null> {
    try {
      return await apiRequest<UserGamificationProfile>(
        `/gamification/profiles/lookup/${encodeURIComponent(userId)}`,
      );
    } catch {
      return null;
    }
  }

  async getAllProfiles(): Promise<UserGamificationProfile[]> {
    return apiRequest<UserGamificationProfile[]>('/gamification/profiles');
  }

  async upsertProfile(profile: UserGamificationProfile): Promise<void> {
    await apiRequest(
      `/gamification/profiles/${encodeURIComponent(profile.userId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(profile),
      },
    );
  }
}
