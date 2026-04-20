/**
 * Role & lifecycle taxonomy — aligned with `server-maxwell/.../role-taxonomy.ts`.
 * `UserRole` is the JWT / workspace value; do not change strings without a backend migration.
 */

import { UserRole } from '../types/index';

/** Customer lifecycle (ABAC) — `members.lifecycleStage`; not the same as “not logged in”. */
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

/** SoD document labels mapped to application `UserRole` values. */
export const DocumentInternalRole = {
  SUPER_ADMIN: UserRole.SUPER_ADMIN,
  OPS_PRODUCER: UserRole.OPERATIONS,
  MARKETING_SPECIALIST: UserRole.MARKETING,
  SALES_EXECUTIVE: UserRole.SALES,
  FINANCE_CONTROLLER: UserRole.FINANCE,
  FACILITATOR: UserRole.FACILITATOR,
  GATE_KEEPER: UserRole.GATE_KEEPER,
} as const;
