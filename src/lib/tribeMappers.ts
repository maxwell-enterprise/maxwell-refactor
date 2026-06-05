import type { TribeMember, TribeMentoringSession } from '../types/tribe';

export type TribeDownlineApiRow = {
  memberId: string;
  name: string;
  email: string;
  phone: string;
  program: string;
  joinDate: string;
  lifecycleStage: string;
  tags: string[];
  engagement: {
    lastActiveDate?: string;
    eventsAttendedCount?: number;
    contentCompletionRate?: number;
    communityReputationScore?: number;
    leadScore?: number;
  } | null;
  company?: string | null;
  jobTitle?: string | null;
  facilitatorName?: string | null;
  facilitatorType?: string | null;
};

export type TribeSessionApiRow = {
  id: string;
  facilitatorId: string;
  facilitatorName: string;
  eventName: string;
  memberId: string;
  memberName: string;
  notes: string;
  createdAt: string;
};

function readEngagementCount(
  engagement: TribeDownlineApiRow['engagement'],
  key: 'eventsAttendedCount' | 'contentCompletionRate',
): number {
  const raw = engagement?.[key];
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
}

export function computeMentoringProgress(
  engagement: TribeDownlineApiRow['engagement'],
  passedQuizCount = 0,
): number {
  const attendanceCount = readEngagementCount(engagement, 'eventsAttendedCount');
  const contentRate = readEngagementCount(engagement, 'contentCompletionRate');
  const attendanceScore = Math.min(100, (attendanceCount / 12) * 100);
  const quizScore = Math.min(100, (passedQuizCount / 2) * 100);
  const blended = quizScore > 0
    ? quizScore * 0.5 + attendanceScore * 0.3 + contentRate * 0.2
    : attendanceScore * 0.5 + contentRate * 0.35 + 16;
  return Math.min(100, Math.round(blended));
}

export function resolveTribePaymentStatus(
  tags: string[] | null | undefined,
): TribeMember['paymentStatus'] {
  const normalized = (tags ?? []).map((t) => String(t).toLowerCase());
  if (normalized.some((t) => t.includes('overdue') || t === 'payment_overdue')) {
    return 'OVERDUE';
  }
  if (
    normalized.some(
      (t) => t.includes('unpaid') || t.includes('pending') || t === 'ordered',
    )
  ) {
    return 'UNPAID';
  }
  return 'PAID';
}

export function mapDownlineToTribeMember(row: TribeDownlineApiRow): TribeMember {
  return {
    memberId: row.memberId,
    name: row.name,
    email: row.email,
    phone: row.phone || '',
    program: row.program || '—',
    joinDate: row.joinDate || '',
    paymentStatus: resolveTribePaymentStatus(row.tags),
    mentoringProgress: computeMentoringProgress(row.engagement),
    nextEventName: undefined,
    nextEventDate: undefined,
    lastInvoiceId: undefined,
    facilitatorName: row.facilitatorName ?? undefined,
    facilitatorType: row.facilitatorType ?? undefined,
  };
}

export function mapSessionRowToTribeSession(
  row: TribeSessionApiRow,
): TribeMentoringSession {
  const created = row.createdAt ? new Date(row.createdAt) : new Date();
  const dateIso = Number.isNaN(created.getTime())
    ? new Date().toISOString().slice(0, 10)
    : created.toISOString().slice(0, 10);
  const timeLabel = Number.isNaN(created.getTime())
    ? 'TBD'
    : created.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      });

  return {
    id: row.id,
    facilitatorId: row.facilitatorId,
    title: row.eventName?.trim() || 'Mentoring Session',
    description:
      row.notes?.trim() ||
      (row.memberName ? `Session with ${row.memberName}` : 'Tribe mentoring'),
    date: dateIso,
    time: timeLabel,
    meetingLink: undefined,
    attendeeIds: row.memberId ? [row.memberId] : [],
    status: 'SCHEDULED',
  };
}
