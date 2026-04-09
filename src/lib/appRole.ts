import { UserRole } from '../types/index';

const ROLE_VALUES = new Set(Object.values(UserRole));

/**
 * Comma-separated bootstrap admin emails → Super Admin (Nest DB) and mock `resolveUserFromEmail`.
 * - `APP_ADMIN_EMAILS`: server-only (preferred for production).
 * - `NEXT_PUBLIC_APP_ADMIN_EMAILS`: optional duplicate for local mock/OTP when `APP_ADMIN_EMAILS` is not in the browser bundle.
 */
export function getBootstrapAdminEmails(): Set<string> {
  const raw = [
    process.env.APP_ADMIN_EMAILS,
    process.env.NEXT_PUBLIC_APP_ADMIN_EMAILS,
  ]
    .filter(Boolean)
    .join(',');
  return new Set(
    raw
      .split(/[,;\n\r]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isBootstrapAdminEmail(email: string): boolean {
  return getBootstrapAdminEmails().has(email.trim().toLowerCase());
}

/** Default workspace `User.appRole` DB string (matches `UserRole` enum values). */
export function defaultAppRoleForNewUser(email: string): string {
  return isBootstrapAdminEmail(email)
    ? UserRole.SUPER_ADMIN
    : UserRole.MEMBER;
}

export function parseAppRoleString(
  value: string | null | undefined,
): UserRole {
  const v = (value ?? '').trim();
  if (ROLE_VALUES.has(v as UserRole)) {
    return v as UserRole;
  }
  return UserRole.MEMBER;
}

export function assertAssignableRole(value: string): UserRole {
  const v = value.trim();
  if (!ROLE_VALUES.has(v as UserRole)) {
    throw new Error(`Invalid role: ${value}`);
  }
  return v as UserRole;
}
