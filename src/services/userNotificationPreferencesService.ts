import { apiRequest } from '../repositories/api/apiClient';

export type UserNotificationPreferences = {
  emailTransactional: boolean;
  emailMarketing: boolean;
  smsAlerts: boolean;
};

function legacyPath(userId: string): string {
  return `/account-settings/users/${encodeURIComponent(userId)}/notification-preferences`;
}

export const UserNotificationPreferencesService = {
  async getMe(): Promise<UserNotificationPreferences> {
    return apiRequest<UserNotificationPreferences>('/account-settings/me/notification-preferences', {
      method: 'GET',
    });
  },

  async patchMe(
    patch: Partial<UserNotificationPreferences>,
  ): Promise<UserNotificationPreferences> {
    return apiRequest<UserNotificationPreferences>('/account-settings/me/notification-preferences', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  async get(userId: string): Promise<UserNotificationPreferences> {
    return apiRequest<UserNotificationPreferences>(legacyPath(userId), {
      method: 'GET',
    });
  },

  async patch(
    userId: string,
    patch: Partial<UserNotificationPreferences>,
  ): Promise<UserNotificationPreferences> {
    return apiRequest<UserNotificationPreferences>(legacyPath(userId), {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },
};
