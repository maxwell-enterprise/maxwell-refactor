import type { LifecycleStage, Member } from '../types/index';

/** Order for Evolution Journey UI and parsing stages from API/DB. */
export const LIFECYCLE_PROGRESSION_ORDER: readonly LifecycleStage[] = [
  'GUEST',
  'IDENTIFIED',
  'PARTICIPANT',
  'MEMBER',
  'CERTIFIED',
  'FACILITATOR',
] as const;

export function parseLifecycleStage(
  raw: string | null | undefined,
): LifecycleStage | null {
  if (raw == null || !String(raw).trim()) return null;
  const t = String(raw).trim().toUpperCase().replace(/\s+/g, '_');
  for (const s of LIFECYCLE_PROGRESSION_ORDER) {
    if (s === t) return s;
  }
  return null;
}

/**
 * Member progress stage: CRM row (`members`) + email rules take priority;
 * if absent in CRM, fall back to `user_entitlements.attributes.lifecycle`.
 */
export function resolveJourneyLifecycleStage(params: {
  member: Pick<Member, 'lifecycleStage' | 'email'> | null | undefined;
  entitlementLifecycle?: string | null;
}): LifecycleStage {
  const fromEntitlements = parseLifecycleStage(
    params.entitlementLifecycle ?? undefined,
  );
  const m = params.member;
  if (m) {
    return normalizeLifecycleStageForStoredEmail(
      m.lifecycleStage,
      m.email,
    );
  }
  return fromEntitlements ?? 'GUEST';
}

/** Sales pipeline — no paid transaction yet (acquisition / closing). */
export const LEAD_PIPELINE_LIFECYCLE_STAGES = new Set<LifecycleStage>([
  'GUEST',
  'IDENTIFIED',
  'PARTICIPANT',
]);

/** Member database — paid ecosystem / certification / delegation (retention / upsell). */
export const MEMBER_DATABASE_LIFECYCLE_STAGES = new Set<LifecycleStage>([
  'MEMBER',
  'CERTIFIED',
  'FACILITATOR',
]);

/**
 * Product rule: `GUEST` = anonymous (no stored identity). If `members` already has an email,
 * minimum stage is `IDENTIFIED`. Used on create/update so new data stays consistent.
 */
export function normalizeLifecycleStageForStoredEmail(
  stage: LifecycleStage,
  email: string | null | undefined,
): LifecycleStage {
  const hasEmail = String(email ?? '').trim().length > 0;
  if (stage === 'GUEST' && hasEmail) return 'IDENTIFIED';
  return stage;
}

/** Filter by raw stage only (no email normalization). */
export function isLeadPipelineLifecycle(stage: LifecycleStage): boolean {
  return LEAD_PIPELINE_LIFECYCLE_STAGES.has(stage);
}

export function isMemberDatabaseLifecycle(stage: LifecycleStage): boolean {
  return MEMBER_DATABASE_LIFECYCLE_STAGES.has(stage);
}

/**
 * Sales pipeline: unpaid leads — IDENTIFIED, PARTICIPANT, or GUEST with no email.
 * GUEST rows that already have email are treated as misclassified and stay in the
 * pipeline (same as IDENTIFIED) until corrected in the database.
 */
export function isSalesPipelineLead(
  m: Pick<Member, 'lifecycleStage' | 'email'>,
): boolean {
  const effective = normalizeLifecycleStageForStoredEmail(
    m.lifecycleStage,
    m.email,
  );
  if (effective === 'IDENTIFIED' || effective === 'PARTICIPANT') return true;
  if (effective === 'GUEST') return !String(m.email ?? '').trim();
  return false;
}
