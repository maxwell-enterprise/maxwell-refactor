/**
 * Taksonomi role & lifecycle — selaras `server-maxwell/.../role-taxonomy.ts`.
 * `UserRole` = nilai JWT / workspace user; jangan ubah string tanpa migrasi backend.
 */

import { UserRole } from '../types/index';

/** Lifecycle pelanggan (ABAC) — `members.lifecycleStage`; bukan status “belum login”. */
export const MemberLifecycle = {
  GUEST: 'GUEST',
  IDENTIFIED: 'IDENTIFIED',
  PARTICIPANT: 'PARTICIPANT',
  MEMBER: 'MEMBER',
  CERTIFIED: 'CERTIFIED',
  FACILITATOR: 'FACILITATOR',
} as const;

export type MemberLifecycleStage =
  (typeof MemberLifecycle)[keyof typeof MemberLifecycle];

/** Label dokumen SoD → `UserRole` yang dipakai aplikasi. */
export const DocumentInternalRole = {
  SUPER_ADMIN: UserRole.SUPER_ADMIN,
  OPS_PRODUCER: UserRole.OPERATIONS,
  MARKETING_SPECIALIST: UserRole.MARKETING,
  SALES_EXECUTIVE: UserRole.SALES,
  FINANCE_CONTROLLER: UserRole.FINANCE,
  FACILITATOR: UserRole.FACILITATOR,
  GATE_KEEPER: UserRole.GATE_KEEPER,
} as const;
