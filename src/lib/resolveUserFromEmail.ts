import { UserRole, UserProfile } from '../types/index';
import { UserService } from '../services/userService';
import { DataService } from '../services/dataService';
import { isBootstrapAdminEmail } from './appRole';

/**
 * Maps a signed-in email to the same staff/member profile logic as mock AuthService,
 * so Account Settings and roles stay consistent with the rest of the app.
 * For OAuth (Google), pass name/image so new users get display name and avatar from the provider.
 */
export async function resolveUserFromEmail(
  email: string,
  nameHint?: string | null,
  imageHint?: string | null,
): Promise<UserProfile> {
  const normalizedEmail = email.toLowerCase().trim();

  if (isBootstrapAdminEmail(normalizedEmail)) {
    const local = normalizedEmail.split('@')[0] || 'Admin';
    const displayName = nameHint?.trim() || local;
    return {
      id: `bootstrap-${normalizedEmail.replace(/[^a-z0-9]+/gi, '-')}`,
      fullName: displayName,
      email: normalizedEmail,
      role: UserRole.SUPER_ADMIN,
      avatarUrl:
        imageHint?.trim() ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0f172a&color=fff`,
      provider: imageHint ? 'google' : 'email',
    };
  }

  const staff = await UserService.getAllUsers();
  const foundStaff = staff.find(
    (u) => u.email.toLowerCase() === normalizedEmail,
  );
  if (foundStaff) {
    return {
      ...foundStaff,
      provider: imageHint ? 'google' : foundStaff.provider,
      avatarUrl:
        imageHint?.trim() && !foundStaff.avatarUrl
          ? imageHint.trim()
          : foundStaff.avatarUrl,
    };
  }

  const members = await DataService.getMembers();
  const foundMember = members.find(
    (m) => m.email.toLowerCase() === normalizedEmail,
  );
  if (foundMember) {
    return {
      id: foundMember.id,
      email: foundMember.email,
      fullName: foundMember.name,
      role:
        foundMember.lifecycleStage === 'FACILITATOR'
          ? UserRole.FACILITATOR
          : UserRole.MEMBER,
      avatarUrl:
        imageHint?.trim() ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(foundMember.name)}&background=random`,
      provider: imageHint ? 'google' : 'email',
    };
  }

  if (normalizedEmail.includes('admin')) {
    return {
      id: 'admin-1',
      fullName: nameHint || 'Admin',
      email: normalizedEmail,
      role: UserRole.SUPER_ADMIN,
      provider: 'email',
    };
  }

  const local = normalizedEmail.split('@')[0] || 'User';
  const displayName = nameHint?.trim() || local;
  return {
    id: `guest-${normalizedEmail.replace(/[^a-z0-9]+/gi, '-')}`,
    fullName: displayName,
    email: normalizedEmail,
    role: UserRole.GUEST,
    avatarUrl:
      imageHint?.trim() ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=e2e8f0`,
    provider: imageHint ? 'google' : 'email',
  };
}
