import type {
  LifecycleStage,
  ServiceLevel,
  UserAttributes,
  UserEntitlements,
  WalletItem,
  WalletTransactionHistory,
} from '../../types/access';

function toIsoString(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') return v;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object' && v !== null && 'toISOString' in v) {
    try {
      return (v as Date).toISOString();
    } catch {
      return undefined;
    }
  }
  return String(v);
}

/**
 * Maps Nest `/fe/wallet/items` rows to the FE `WalletItem` contract.
 * Ensures `meta.credits` exists for CREDIT_PASS when backend stores `balance` only.
 */
export function normalizeWalletItem(row: Record<string, unknown>): WalletItem {
  const metaRaw = row.meta;
  const meta =
    metaRaw && typeof metaRaw === 'object' && !Array.isArray(metaRaw)
      ? { ...(metaRaw as Record<string, unknown>) }
      : {};

  const type = String(row.type ?? 'TICKET') as WalletItem['type'];
  if (type === 'CREDIT_PASS' || type === 'MEMBERSHIP') {
    if (meta.credits == null && meta.balance != null) {
      meta.credits = Number(meta.balance);
    }
    if (meta.credits == null && typeof meta.initialBalance === 'number') {
      meta.credits = meta.initialBalance;
    }
  }

  return {
    id: String(row.id ?? ''),
    userId: String(row.userId ?? ''),
    type,
    title: String(row.title ?? ''),
    subtitle: String(row.subtitle ?? ''),
    expiryDate: toIsoString(row.expiryDate),
    qrData: row.qrData != null ? String(row.qrData) : undefined,
    status: String(row.status ?? 'ACTIVE') as WalletItem['status'],
    isTransferable: Boolean(row.isTransferable),
    sponsoredBy: row.sponsoredBy != null ? String(row.sponsoredBy) : undefined,
    meta: Object.keys(meta).length ? meta : undefined,
  };
}

export function normalizeWalletItems(rows: unknown): WalletItem[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) =>
    normalizeWalletItem(r && typeof r === 'object' ? (r as Record<string, unknown>) : {}),
  );
}

export function normalizeWalletHistory(rows: unknown): WalletTransactionHistory[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => {
    const o = r && typeof r === 'object' ? (r as Record<string, unknown>) : {};
    return {
      id: String(o.id ?? ''),
      walletItemId: String(o.walletItemId ?? ''),
      userId: String(o.userId ?? ''),
      transactionType: String(
        o.transactionType ?? 'ADJUSTMENT',
      ) as WalletTransactionHistory['transactionType'],
      amountChange: Number(o.amountChange ?? 0),
      balanceAfter: Number(o.balanceAfter ?? 0),
      referenceId: o.referenceId != null ? String(o.referenceId) : undefined,
      referenceName: o.referenceName != null ? String(o.referenceName) : undefined,
      timestamp: toIsoString(o.timestamp) ?? new Date().toISOString(),
    };
  });
}

const DEFAULT_ENGAGEMENT: UserAttributes['engagement'] = {
  lastActiveDate: new Date().toISOString(),
  eventsAttendedCount: 0,
  contentCompletionRate: 0,
  communityReputationScore: 0,
  leadScore: 0,
};

const DEFAULT_AUTHORITY: UserAttributes['authority'] = {
  canSellPrograms: false,
  canCoachUsers: false,
  canVerifyCertifications: false,
  maxDiscountAuthority: 0,
};

/** When Nest returns sparse `attributes`, keep Evolution Journey / ABAC UI stable. */
export function normalizeUserEntitlements(
  row: Record<string, unknown> | null | undefined,
): UserEntitlements | null {
  if (!row || typeof row !== 'object') return null;
  const userId = String(row.userId ?? '');
  if (!userId) return null;

  const permissions = Array.isArray(row.permissions)
    ? (row.permissions as UserEntitlements['permissions'])
    : [];

  const rawAttr = row.attributes;
  const a =
    rawAttr && typeof rawAttr === 'object' && !Array.isArray(rawAttr)
      ? (rawAttr as Record<string, unknown>)
      : {};

  const engagementRaw = a.engagement;
  const engagement =
    engagementRaw && typeof engagementRaw === 'object'
      ? { ...DEFAULT_ENGAGEMENT, ...(engagementRaw as object) }
      : { ...DEFAULT_ENGAGEMENT };

  const authorityRaw = a.authority;
  const authority =
    authorityRaw && typeof authorityRaw === 'object'
      ? { ...DEFAULT_AUTHORITY, ...(authorityRaw as object) }
      : { ...DEFAULT_AUTHORITY };

  const attributes: UserAttributes = {
    region: (a.region as UserAttributes['region']) ?? 'ID',
    joinDate: typeof a.joinDate === 'string' ? a.joinDate : new Date().toISOString().slice(0, 10),
    company: typeof a.company === 'string' ? a.company : undefined,
    sponsorId: typeof a.sponsorId === 'string' ? a.sponsorId : undefined,
    lifecycle: (a.lifecycle as LifecycleStage) ?? 'GUEST',
    serviceLevel: (a.serviceLevel as ServiceLevel) ?? 'STANDARD',
    tags: Array.isArray(a.tags) ? (a.tags as string[]) : [],
    engagement,
    authority,
  };

  return {
    userId,
    permissions,
    attributes,
    credits: typeof row.credits === 'number' ? row.credits : Number(row.credits ?? 0),
  };
}
