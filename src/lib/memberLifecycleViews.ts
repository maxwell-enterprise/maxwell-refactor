import type { LifecycleStage, Member } from '../types/index';

/** Urutan untuk UI Evolution Journey & parsing stage dari API/DB. */
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
 * Stage untuk progress member: prioritas baris CRM (`members`) + aturan email;
 * jika belum ada di CRM, pakai `user_entitlements.attributes.lifecycle`.
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

/** Sales Pipeline — belum transaksi berbayar (akuisisi / closing). */
export const LEAD_PIPELINE_LIFECYCLE_STAGES = new Set<LifecycleStage>([
  'GUEST',
  'IDENTIFIED',
  'PARTICIPANT',
]);

/** Member Database — sudah dalam ekosistem berbayar / sertifikasi / delegasi (retensi / upsell). */
export const MEMBER_DATABASE_LIFECYCLE_STAGES = new Set<LifecycleStage>([
  'MEMBER',
  'CERTIFIED',
  'FACILITATOR',
]);

/**
 * Baku produk: `GUEST` = anonim (tanpa identitas tersimpan). Jika sudah ada email di `members`,
 * stage minimal `IDENTIFIED`. Dipakai saat create/update agar data baru konsisten.
 */
export function normalizeLifecycleStageForStoredEmail(
  stage: LifecycleStage,
  email: string | null | undefined,
): LifecycleStage {
  const hasEmail = String(email ?? '').trim().length > 0;
  if (stage === 'GUEST' && hasEmail) return 'IDENTIFIED';
  return stage;
}

/** Hanya untuk filter berdasarkan stage mentah (tanpa aturan email). */
export function isLeadPipelineLifecycle(stage: LifecycleStage): boolean {
  return LEAD_PIPELINE_LIFECYCLE_STAGES.has(stage);
}

export function isMemberDatabaseLifecycle(stage: LifecycleStage): boolean {
  return MEMBER_DATABASE_LIFECYCLE_STAGES.has(stage);
}

/**
 * Sales Pipeline: tampilkan lead yang belum membayar — IDENTIFIED, PARTICIPANT,
 * atau GUEST benar-benar tanpa email. Baris GUEST + email dianggap salah klasifikasi
 * dan tetap ikut pipeline (setara IDENTIFIED) sampai diperbaiki di DB.
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
