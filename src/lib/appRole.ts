import { UserRole } from '../types/index';

const ROLE_VALUES = new Set(Object.values(UserRole));

function normalizeRoleKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ');
}

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

/**
 * Maps API/DB `appRole` strings to `UserRole`. Tolerates casing, underscores, spaces.
 */
export function parseAppRoleString(
  value: string | null | undefined,
): UserRole {
  const list = parseAppRoleList(value);
  if (list.length > 0) {
    return list[0];
  }

  const v = (value ?? '').trim();
  if (ROLE_VALUES.has(v as UserRole)) {
    return v as UserRole;
  }

  const key = normalizeRoleKey(v);
  for (const canonical of Object.values(UserRole)) {
    if (normalizeRoleKey(canonical) === key) {
      return canonical;
    }
  }

  if (key === 'admin' || key === 'superadmin' || key === 'super admin') {
    return UserRole.SUPER_ADMIN;
  }
  if (key === 'gatekeeper' || key === 'gate keeper') {
    return UserRole.GATE_KEEPER;
  }

  return UserRole.MEMBER;
}

export function parseAppRoleList(
  value: string | null | undefined,
): UserRole[] {
  const raw = String(value ?? '').trim();
  if (!raw) return [UserRole.MEMBER];

  const unique = new Set<UserRole>();
  const push = (token: string) => {
    const parsed = parseAppRoleStringSingle(token);
    if (parsed) unique.add(parsed);
  };

  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      const parsedJson = JSON.parse(raw);
      if (Array.isArray(parsedJson)) {
        parsedJson.forEach((item) => {
          if (typeof item === 'string') push(item);
        });
      }
    } catch {
      /* ignore and continue with delimiter parsing */
    }
  }

  if (unique.size === 0) {
    raw.split(/[,\n;|]+/).forEach(push);
  }

  if (unique.size === 0) {
    return [parseAppRoleStringSingle(raw) ?? UserRole.MEMBER];
  }

  return Array.from(unique).slice(0, 2);
}

function parseAppRoleStringSingle(value: string): UserRole | null {
  const v = (value ?? '').trim();
  if (!v) return null;
  if (ROLE_VALUES.has(v as UserRole)) {
    return v as UserRole;
  }

  const key = normalizeRoleKey(v);
  for (const canonical of Object.values(UserRole)) {
    if (normalizeRoleKey(canonical) === key) {
      return canonical;
    }
  }

  if (key === 'admin' || key === 'superadmin' || key === 'super admin') {
    return UserRole.SUPER_ADMIN;
  }
  if (key === 'gatekeeper' || key === 'gate keeper') {
    return UserRole.GATE_KEEPER;
  }

  return null;
}

export function assertAssignableRole(value: string): UserRole {
  const v = value.trim();
  if (!ROLE_VALUES.has(v as UserRole)) {
    throw new Error(`Invalid role: ${value}`);
  }
  return v as UserRole;
}
