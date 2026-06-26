import { GiftAllocation, WalletItem } from '../../types/access';
import { Member, UserProfile } from '../../types/index';
import {
  normalizeEmail,
  readTicketRecipientEmail,
  readTicketRecipientName,
  readTicketRecipientPhone,
  classifyWalletTicketForBuyer,
  type WalletBuyerRow,
} from './participantWalletBuyers';

export type GiftRecipientStatus = 'CLAIMED' | 'PENDING_CLAIM' | 'REVOKED';

export interface GiftRecipientRow {
  id: string;
  giftId: string;
  ticketId: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  inviterName: string;
  inviterEmail: string;
  inviterPhone: string;
  status: GiftRecipientStatus;
  statusLabel: string;
  ticketTier: string;
  itemName: string;
  sentAt: string;
  claimedAt?: string;
  revokedAt?: string;
}

export function formatGiftRecipientStatusLabel(status: GiftRecipientStatus): string {
  switch (status) {
    case 'CLAIMED':
      return 'Claimed';
    case 'REVOKED':
      return 'Revoked';
  }
  return 'Pending claim';
}

function resolveGiftRecipientStatus(
  gift: GiftAllocation,
  ticket?: WalletItem,
): { status: GiftRecipientStatus; statusLabel: string } {
  if (gift.status === 'REVOKED') {
    return { status: 'REVOKED', statusLabel: formatGiftRecipientStatusLabel('REVOKED') };
  }
  if (gift.status === 'CLAIMED' || ticket?.status === 'CLAIMED') {
    return { status: 'CLAIMED', statusLabel: formatGiftRecipientStatusLabel('CLAIMED') };
  }
  return { status: 'PENDING_CLAIM', statusLabel: formatGiftRecipientStatusLabel('PENDING_CLAIM') };
}

function resolveInviterContact(
  sourceUserId: string,
  sourceUserName: string,
  userMap: Map<string, UserProfile>,
  membersById: Map<string, Member>,
  membersByEmail: Map<string, Member>,
): { name: string; email: string; phone: string } {
  const memberById = membersById.get(sourceUserId);
  const workspaceUser = userMap.get(sourceUserId);
  const email =
    normalizeEmail(workspaceUser?.email) ||
    normalizeEmail(memberById?.email) ||
    inferBuyerEmailFromMember(sourceUserId, userMap, membersByEmail, membersById);
  const member = memberById || (email ? membersByEmail.get(email) : undefined);

  return {
    name:
      workspaceUser?.fullName?.trim() ||
      member?.name?.trim() ||
      memberById?.name?.trim() ||
      sourceUserName.trim() ||
      'Unknown',
    email: email || normalizeEmail(member?.email) || '',
    phone: workspaceUser?.phone?.trim() || member?.phone?.trim() || memberById?.phone?.trim() || '',
  };
}

function inferBuyerEmailFromMember(
  sourceUserId: string,
  userMap: Map<string, UserProfile>,
  membersByEmail: Map<string, Member>,
  membersById: Map<string, Member>,
): string {
  const memberById = membersById.get(sourceUserId);
  if (memberById?.email) {
    return normalizeEmail(memberById.email);
  }
  for (const member of membersByEmail.values()) {
    if (member.id === sourceUserId) {
      return normalizeEmail(member.email);
    }
  }
  const user = userMap.get(sourceUserId);
  return normalizeEmail(user?.email);
}

function resolveRecipientIdentity(
  gift: GiftAllocation,
  ticket?: WalletItem,
): { name: string; email: string; phone: string } {
  const email =
    normalizeEmail(gift.targetEmail) ||
    normalizeEmail(readTicketRecipientEmail(ticket ?? ({} as WalletItem)));
  const name =
    gift.recipientName?.trim() ||
    readTicketRecipientName(ticket ?? ({} as WalletItem)) ||
    (email ? email.split('@')[0] : '') ||
    'Guest';
  const phone = gift.recipientPhone?.trim() || readTicketRecipientPhone(ticket ?? ({} as WalletItem)) || '';
  return { name, email, phone };
}

export function buildGiftRecipientRows(params: {
  tickets: WalletItem[];
  gifts: GiftAllocation[];
  userMap: Map<string, UserProfile>;
  membersById: Map<string, Member>;
  membersByEmail: Map<string, Member>;
}): GiftRecipientRow[] {
  const { tickets, gifts, userMap, membersById, membersByEmail } = params;
  const ticketIds = new Set(tickets.map((ticket) => ticket.id));
  const ticketById = new Map(tickets.map((ticket) => [ticket.id, ticket]));
  const coveredTicketIds = new Set<string>();

  const rows: GiftRecipientRow[] = [];

  for (const gift of gifts) {
    if (!ticketIds.has(gift.entitlementId)) continue;
    coveredTicketIds.add(gift.entitlementId);
    const ticket = ticketById.get(gift.entitlementId);
    const recipient = resolveRecipientIdentity(gift, ticket);
    const inviter = resolveInviterContact(
      gift.sourceUserId,
      gift.sourceUserName,
      userMap,
      membersById,
      membersByEmail,
    );
    const { status, statusLabel } = resolveGiftRecipientStatus(gift, ticket);
    const ticketTier =
      typeof ticket?.meta?.targetTier === 'string' && ticket.meta.targetTier.trim()
        ? ticket.meta.targetTier
        : ticket?.subtitle?.trim() || 'General';

    rows.push({
      id: gift.id,
      giftId: gift.id,
      ticketId: gift.entitlementId,
      recipientName: recipient.name,
      recipientEmail: recipient.email,
      recipientPhone: recipient.phone,
      inviterName: inviter.name,
      inviterEmail: inviter.email,
      inviterPhone: inviter.phone,
      status,
      statusLabel,
      ticketTier,
      itemName: gift.itemName || ticket?.title || 'Ticket',
      sentAt: gift.createdAt,
      claimedAt: gift.claimedAt,
      revokedAt: gift.revokedAt,
    });
  }

  for (const ticket of tickets) {
    if (coveredTicketIds.has(ticket.id)) continue;
    if (ticket.isTransferable !== true) continue;

    const recipientEmail = normalizeEmail(readTicketRecipientEmail(ticket));
    const recipientName = readTicketRecipientName(ticket);
    const recipientPhone = readTicketRecipientPhone(ticket);
    if (!recipientEmail && !recipientName && !recipientPhone) continue;

    const inviter = resolveInviterContact(ticket.userId, '', userMap, membersById, membersByEmail);
    const pending =
      ticket.status === 'PENDING_CLAIM' ||
      ticket.status === 'GIFT_PENDING' ||
      Boolean(recipientEmail || recipientName);

    if (!pending) continue;

    rows.push({
      id: `ticket-${ticket.id}`,
      giftId: '',
      ticketId: ticket.id,
      recipientName: recipientName || recipientEmail.split('@')[0] || 'Guest',
      recipientEmail,
      recipientPhone,
      inviterName: inviter.name,
      inviterEmail: inviter.email,
      inviterPhone: inviter.phone,
      status: ticket.status === 'CLAIMED' ? 'CLAIMED' : 'PENDING_CLAIM',
      statusLabel:
        ticket.status === 'CLAIMED'
          ? formatGiftRecipientStatusLabel('CLAIMED')
          : formatGiftRecipientStatusLabel('PENDING_CLAIM'),
      ticketTier:
        typeof ticket.meta?.targetTier === 'string' && ticket.meta.targetTier.trim()
          ? ticket.meta.targetTier
          : ticket.subtitle?.trim() || 'General',
      itemName: ticket.title,
      sentAt: ticket.expiryDate || '',
    });
  }

  return rows
    .filter(isActiveGiftRecipient)
    .sort(
      (a, b) => new Date(b.sentAt || 0).getTime() - new Date(a.sentAt || 0).getTime(),
    );
}

export function isActiveGiftRecipient(row: GiftRecipientRow): boolean {
  return row.status === 'CLAIMED' || row.status === 'PENDING_CLAIM';
}

export function filterActiveGiftRecipients(rows: GiftRecipientRow[]): GiftRecipientRow[] {
  return rows.filter(isActiveGiftRecipient);
}

export function countUniqueGiftRecipients(rows: GiftRecipientRow[]): number {
  const keys = new Set<string>();
  for (const row of filterActiveGiftRecipients(rows)) {
    const key =
      normalizeEmail(row.recipientEmail) ||
      row.recipientPhone.trim() ||
      row.recipientName.trim().toLowerCase();
    if (key) keys.add(key);
  }
  return keys.size;
}

export type EventParticipantTicketKind = 'SELF' | 'CLAIMED';

/** Summary "Participants" rows: self tickets + gift tickets with claimed status. */
export interface EventParticipantTicketRow extends GiftRecipientRow {
  participantKind: EventParticipantTicketKind;
  /** When the wallet ticket was created / added (sort key). */
  ticketAddedAt: string;
}

function resolveTicketAddedAt(ticket: WalletItem, gift?: GiftAllocation): string {
  return (
    ticket.createdAt?.trim() ||
    gift?.claimedAt?.trim() ||
    gift?.createdAt?.trim() ||
    ''
  );
}

export function buildEventParticipantTicketRows(params: {
  walletBuyers: WalletBuyerRow[];
  giftRecipientRows: GiftRecipientRow[];
  gifts: GiftAllocation[];
  membersById?: Map<string, Member>;
}): EventParticipantTicketRow[] {
  const { walletBuyers, giftRecipientRows, gifts, membersById } = params;
  const giftByEntitlementId = new Map(gifts.map((gift) => [gift.entitlementId, gift]));
  const rows: EventParticipantTicketRow[] = [];

  for (const buyer of walletBuyers) {
    for (const ticket of buyer.tickets) {
      const gift = giftByEntitlementId.get(ticket.id);
      const bucket = classifyWalletTicketForBuyer(
        ticket,
        buyer.sourceUserId,
        gift,
        buyer.buyerEmail,
        buyer.buyerName,
      );
      if (bucket !== 'SELF') continue;

      const memberOwner = membersById?.get(ticket.userId);
      const recipientEmail =
        normalizeEmail(readTicketRecipientEmail(ticket)) || buyer.buyerEmail;
      const recipientName =
        readTicketRecipientName(ticket) ||
        buyer.buyerName ||
        memberOwner?.name?.trim() ||
        (recipientEmail ? recipientEmail.split('@')[0] : '') ||
        'Guest';
      const recipientPhone =
        readTicketRecipientPhone(ticket) || buyer.buyerPhone || memberOwner?.phone?.trim() || '';
      const ticketTier =
        typeof ticket.meta?.targetTier === 'string' && ticket.meta.targetTier.trim()
          ? ticket.meta.targetTier
          : ticket.subtitle?.trim() || 'General';

      rows.push({
        id: `self-${ticket.id}`,
        giftId: gift?.id ?? '',
        ticketId: ticket.id,
        recipientName,
        recipientEmail,
        recipientPhone,
        inviterName: buyer.buyerName,
        inviterEmail: buyer.buyerEmail,
        inviterPhone: buyer.buyerPhone,
        status: 'CLAIMED',
        statusLabel: 'Self ticket',
        participantKind: 'SELF',
        ticketTier,
        itemName: ticket.title,
        sentAt: resolveTicketAddedAt(ticket, gift) || gift?.createdAt || '',
        ticketAddedAt: resolveTicketAddedAt(ticket, gift),
        claimedAt: gift?.claimedAt,
      });
    }
  }

  for (const row of giftRecipientRows) {
    if (row.status !== 'CLAIMED') continue;
    rows.push({
      ...row,
      participantKind: 'CLAIMED',
      statusLabel: formatGiftRecipientStatusLabel('CLAIMED'),
      ticketAddedAt: row.claimedAt?.trim() || row.sentAt?.trim() || '',
    });
  }

  return rows.sort(
    (a, b) =>
      new Date(b.ticketAddedAt || 0).getTime() - new Date(a.ticketAddedAt || 0).getTime(),
  );
}

export function countEventParticipantTickets(rows: EventParticipantTicketRow[]): number {
  return rows.length;
}
