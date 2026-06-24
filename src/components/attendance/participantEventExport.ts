import * as XLSX from 'xlsx';
import { GiftAllocation } from '../../types/access';
import { GiftRecipientRow } from './participantGiftRecipients';
import {
  buyerTicketBucketLabel,
  classifyWalletTicketForBuyer,
  WalletBuyerRow,
} from './participantWalletBuyers';

type ParticipantAttendanceStatus = 'REGISTERED' | 'CHECKED_IN' | 'MISSING';

export interface ParticipantExportSourceRow {
  ticketId: string;
  memberName: string;
  memberEmail: string;
  memberPhone: string;
  ticketTier: string;
  gateLabel: string;
  operatorLabel: string;
  accessMethod: string;
  status: ParticipantAttendanceStatus;
  checkInTime?: string;
  sessionsAttended: string[];
  socialVerified: boolean;
  socialFollowers: number;
  occupation: string;
  businessType: string;
  businessAccounts: string[];
  communities: string[];
  tags: string[];
}

export interface EventSessionColumn {
  id: string;
  label: string;
}

function formatAttendanceStatus(status: ParticipantAttendanceStatus): string {
  if (status === 'CHECKED_IN') return 'Checked-In';
  if (status === 'MISSING') return 'Missing';
  return 'Registered';
}

function formatCheckInTime(value?: string): string {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function formatSessionAttendance(attended: boolean): string {
  return attended ? 'Yes' : 'No';
}

export function buildParticipantEventExportRows(params: {
  eventName: string;
  eventDate: string;
  purchasers: WalletBuyerRow[];
  participants: ParticipantExportSourceRow[];
  recipients: GiftRecipientRow[];
  gifts: GiftAllocation[];
  sessions: EventSessionColumn[];
}): Record<string, string | number>[] {
  const {
    eventName,
    eventDate,
    purchasers,
    participants,
    recipients,
    gifts,
    sessions,
  } = params;

  const participantByTicketId = new Map(participants.map((row) => [row.ticketId, row]));
  const recipientByTicketId = new Map(recipients.map((row) => [row.ticketId, row]));
  const giftByEntitlementId = new Map(gifts.map((gift) => [gift.entitlementId, gift]));

  const rows: Record<string, string | number>[] = [];

  for (const purchaser of purchasers) {
    for (const ticket of purchaser.tickets) {
      const gift = giftByEntitlementId.get(ticket.id);
      const participant = participantByTicketId.get(ticket.id);
      const recipient = recipientByTicketId.get(ticket.id);
      const bucket = classifyWalletTicketForBuyer(
        ticket,
        purchaser.sourceUserId,
        gift,
        purchaser.buyerEmail,
        purchaser.buyerName,
      );

      const tier =
        typeof ticket.meta?.targetTier === 'string' && ticket.meta.targetTier.trim()
          ? ticket.meta.targetTier
          : ticket.subtitle?.trim() || participant?.ticketTier || recipient?.ticketTier || 'General';

      const row: Record<string, string | number> = {
        Event: eventName,
        'Event Date': eventDate,
        'Ticket ID': ticket.id,
        Item: ticket.title || recipient?.itemName || '',
        Tier: tier,
        'Wallet Status': ticket.status,
        'Distribution Type': buyerTicketBucketLabel(bucket),
        Purchaser: purchaser.buyerName,
        'Purchaser Email': purchaser.buyerEmail,
        'Purchaser Phone': purchaser.buyerPhone,
        Recipient: recipient?.recipientName || '',
        'Recipient Email': recipient?.recipientEmail || '',
        'Recipient Phone': recipient?.recipientPhone || '',
        'Gift Status': recipient?.statusLabel || '',
        'Gift Sent At': recipient?.sentAt ? formatCheckInTime(recipient.sentAt) : '',
        'Gift Claimed At': recipient?.claimedAt ? formatCheckInTime(recipient.claimedAt) : '',
        'Gift Revoked At': recipient?.revokedAt ? formatCheckInTime(recipient.revokedAt) : '',
        Inviter: recipient?.inviterName || purchaser.buyerName,
        'Inviter Email': recipient?.inviterEmail || purchaser.buyerEmail,
        'Inviter Phone': recipient?.inviterPhone || purchaser.buyerPhone,
        Participant: participant?.memberName || '',
        'Participant Email': participant?.memberEmail || '',
        'Participant Phone': participant?.memberPhone || '',
        'Attendance Status': participant ? formatAttendanceStatus(participant.status) : '',
        Gate: participant?.gateLabel || '',
        Operator: participant?.operatorLabel || '',
        'Access Method': participant?.accessMethod || '',
        'Check-In Time': formatCheckInTime(participant?.checkInTime),
        'Verified IG': participant ? (participant.socialVerified ? 'Yes' : 'No') : '',
        'IG Followers': participant && participant.socialFollowers > 0 ? participant.socialFollowers : '',
        Occupation: participant?.occupation || '',
        'Business Type': participant?.businessType || '',
        'Business Account': participant?.businessAccounts.join(', ') || '',
        Community: participant?.communities.join(', ') || '',
        Tags: participant?.tags.join(', ') || '',
      };

      for (const session of sessions) {
        row[session.label] = participant
          ? formatSessionAttendance(participant.sessionsAttended.includes(session.id))
          : '';
      }

      rows.push(row);
    }
  }

  return rows;
}

export function exportParticipantEventWorkbook(params: {
  eventName: string;
  eventDate: string;
  purchasers: WalletBuyerRow[];
  participants: ParticipantExportSourceRow[];
  recipients: GiftRecipientRow[];
  gifts: GiftAllocation[];
  sessions: EventSessionColumn[];
}): void {
  const safeEvent =
    params.eventName.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'event';
  const dateStamp = new Date().toISOString().split('T')[0];
  const rows = buildParticipantEventExportRows(params);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ Event: params.eventName, Note: 'No data' }]),
    'Event Data',
  );

  XLSX.writeFile(wb, `${safeEvent}_event_data_${dateStamp}.xlsx`);
}
