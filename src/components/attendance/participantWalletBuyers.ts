import { GiftAllocation, WalletItem } from '../../types/access';
import { Member, UserProfile } from '../../types/index';
import { PaymentTransaction } from '../../types/index';
import { capitalizeProfileWords } from '../../lib/formatProfileText';

export type BuyerTicketBucket = 'SELF' | 'SHARING_POOL' | 'PENDING_SEND' | 'CLAIMED_RECIPIENT';

export interface WalletBuyerRow {
  sourceUserId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  ticketCount: number;
  selfCount: number;
  poolCount: number;
  pendingShareCount: number;
  claimedCount: number;
  tickets: WalletItem[];
}

export const normalizeEmail = (value?: string | null) => value?.trim().toLowerCase() ?? '';

export const toTitleFromEmail = (email?: string) => {
  const alias = email ? email.split('@')[0].replace(/[._-]+/g, ' ') : '';
  return alias
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

function formatBuyerDisplayName(value?: string | null): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return '';
  return capitalizeProfileWords(trimmed);
}

function pickGiftSourceUserName(gifts: GiftAllocation[], sourceUserId: string): string {
  for (const gift of gifts) {
    if (gift.sourceUserId === sourceUserId && gift.sourceUserName?.trim()) {
      return gift.sourceUserName.trim();
    }
  }
  return '';
}

export function resolveTicketSourceUserId(
  ticket: WalletItem,
  giftByEntitlementId: Map<string, GiftAllocation>,
): string {
  const gift = giftByEntitlementId.get(ticket.id);
  if (gift?.sourceUserId?.trim()) return gift.sourceUserId.trim();
  return ticket.userId;
}

export function readTicketRecipientEmail(ticket: WalletItem): string {
  return typeof ticket.meta?.recipientEmail === 'string' ? ticket.meta.recipientEmail.trim() : '';
}

export function readTicketRecipientName(ticket: WalletItem): string {
  return typeof ticket.meta?.recipientName === 'string' ? ticket.meta.recipientName.trim() : '';
}

export function readTicketRecipientPhone(ticket: WalletItem): string {
  return typeof ticket.meta?.recipientPhone === 'string' ? ticket.meta.recipientPhone.trim() : '';
}

/** e.g. `Sherly Gunawan (shar3.lee@gmail.com/+62812...)` */
export function formatRecipientToLine(params: {
  name?: string;
  email?: string;
  phone?: string;
}): string {
  const name = params.name?.trim() ?? '';
  const email = params.email?.trim() ?? '';
  const phone = params.phone?.trim() ?? '';
  const contactDetail = [email, phone].filter(Boolean).join('/');
  const displayName = name || email || phone || 'Guest';

  if (contactDetail && displayName !== contactDetail) {
    return `To: ${displayName} (${contactDetail})`;
  }
  return `To: ${displayName}`;
}

export function isAutoBuyerSelfTicket(ticket: WalletItem): boolean {
  return ticket.meta?.autoBuyerSelf === true;
}

/** Buyer personal ticket — including checkout `autoBuyerSelf` stamped with buyer email/name. */
export function isBuyerOwnedSelfTicket(
  ticket: WalletItem,
  sourceUserId: string,
  buyerEmail: string,
  buyerName = '',
): boolean {
  if (isAutoBuyerSelfTicket(ticket)) return true;
  if (ticket.userId !== sourceUserId) return false;
  if (ticket.isTransferable !== true) return true;

  const recipientEmail = normalizeEmail(readTicketRecipientEmail(ticket));
  const buyerEmailNorm = normalizeEmail(buyerEmail);
  if (recipientEmail && buyerEmailNorm && recipientEmail === buyerEmailNorm) {
    return true;
  }

  const buyerNameNorm = buyerName.trim().toLowerCase();
  const recipientName = readTicketRecipientName(ticket).toLowerCase();
  if (buyerNameNorm && recipientName && recipientName === buyerNameNorm) {
    return true;
  }

  return false;
}

export function isAssignedToExternalRecipient(
  ticket: WalletItem,
  buyerEmail: string,
  buyerName = '',
): boolean {
  if (isAutoBuyerSelfTicket(ticket)) return false;
  if (ticket.isTransferable !== true) return false;

  const recipientEmail = normalizeEmail(readTicketRecipientEmail(ticket));
  if (!recipientEmail) return false;
  const buyerEmailNorm = normalizeEmail(buyerEmail);
  if (buyerEmailNorm && recipientEmail === buyerEmailNorm) return false;

  const buyerNameNorm = buyerName.trim().toLowerCase();
  const recipientName = readTicketRecipientName(ticket).toLowerCase();
  if (buyerNameNorm && recipientName && recipientName === buyerNameNorm) return false;

  return true;
}

export function inferBuyerEmailFromTickets(
  sourceUserId: string,
  buyerTickets: WalletItem[],
  gifts: GiftAllocation[] = [],
  buyerName = '',
): string {
  const giftByEntitlementId = new Map(gifts.map((g) => [g.entitlementId, g]));

  for (const ticket of buyerTickets) {
    if (ticket.userId !== sourceUserId) continue;
    if (isAutoBuyerSelfTicket(ticket) || ticket.isTransferable !== true) {
      const email = normalizeEmail(readTicketRecipientEmail(ticket));
      if (email) return email;
    }
  }

  const ownedOnBuyerWallet = buyerTickets.filter((t) => t.userId === sourceUserId);
  const activePersonalCandidates = ownedOnBuyerWallet.filter((ticket) => {
    if (ticket.status !== 'ACTIVE') return false;
    const gift = giftByEntitlementId.get(ticket.id);
    if (gift?.status === 'PENDING') return false;
    return !!normalizeEmail(readTicketRecipientEmail(ticket));
  });

  if (activePersonalCandidates.length === 1) {
    return normalizeEmail(readTicketRecipientEmail(activePersonalCandidates[0]));
  }

  const buyerNameNorm = buyerName.trim().toLowerCase();
  if (buyerNameNorm) {
    for (const ticket of activePersonalCandidates) {
      const recipientName = readTicketRecipientName(ticket).toLowerCase();
      if (recipientName && recipientName === buyerNameNorm) {
        const email = normalizeEmail(readTicketRecipientEmail(ticket));
        if (email) return email;
      }
    }
  }

  return '';
}

export function inferBuyerNameFromTickets(
  sourceUserId: string,
  buyerTickets: WalletItem[],
  gifts: GiftAllocation[] = [],
  buyerEmail = '',
): string {
  const giftByEntitlementId = new Map(gifts.map((g) => [g.entitlementId, g]));

  for (const ticket of buyerTickets) {
    if (ticket.userId !== sourceUserId) continue;
    if (isAutoBuyerSelfTicket(ticket) || ticket.isTransferable !== true) {
      const name = readTicketRecipientName(ticket);
      if (name) return name;
    }
  }

  const ownedOnBuyerWallet = buyerTickets.filter((t) => t.userId === sourceUserId);
  const activePersonalCandidates = ownedOnBuyerWallet.filter((ticket) => {
    if (ticket.status !== 'ACTIVE') return false;
    const gift = giftByEntitlementId.get(ticket.id);
    if (gift?.status === 'PENDING') return false;
    return !!readTicketRecipientName(ticket);
  });

  if (activePersonalCandidates.length === 1) {
    return readTicketRecipientName(activePersonalCandidates[0]);
  }

  const buyerEmailNorm = normalizeEmail(buyerEmail);
  if (buyerEmailNorm) {
    for (const ticket of activePersonalCandidates) {
      const recipientEmail = normalizeEmail(readTicketRecipientEmail(ticket));
      if (recipientEmail && recipientEmail === buyerEmailNorm) {
        const name = readTicketRecipientName(ticket);
        if (name) return name;
      }
    }
  }

  const buyerNameFromGift = pickGiftSourceUserName(gifts, sourceUserId);
  if (buyerNameFromGift) return buyerNameFromGift;

  return '';
}

export function classifyWalletTicketForBuyer(
  ticket: WalletItem,
  sourceUserId: string,
  gift?: GiftAllocation,
  buyerEmail = '',
  buyerName = '',
): BuyerTicketBucket {
  if (gift?.status === 'CLAIMED' && ticket.userId !== sourceUserId) {
    return 'CLAIMED_RECIPIENT';
  }
  if (ticket.userId !== sourceUserId && gift?.sourceUserId === sourceUserId) {
    return 'CLAIMED_RECIPIENT';
  }

  if (isBuyerOwnedSelfTicket(ticket, sourceUserId, buyerEmail, buyerName)) {
    return 'SELF';
  }

  if (ticket.status === 'PENDING_CLAIM' || ticket.status === 'GIFT_PENDING') {
    return 'PENDING_SEND';
  }

  if (gift?.status === 'PENDING') {
    return 'PENDING_SEND';
  }

  const recipientEmail = normalizeEmail(readTicketRecipientEmail(ticket));
  if (
    recipientEmail &&
    isAssignedToExternalRecipient(ticket, buyerEmail, buyerName) &&
    ticket.userId === sourceUserId
  ) {
    return 'PENDING_SEND';
  }

  if (
    ticket.isTransferable === true &&
    ticket.status === 'ACTIVE' &&
    ticket.userId === sourceUserId &&
    !recipientEmail
  ) {
    return 'SHARING_POOL';
  }

  return 'SELF';
}

export function buyerTicketBucketLabel(bucket: BuyerTicketBucket): string {
  switch (bucket) {
    case 'SELF':
      return 'Self ticket';
    case 'SHARING_POOL':
      return 'Ready to assign';
    case 'PENDING_SEND':
      return 'Awaiting claim';
    case 'CLAIMED_RECIPIENT':
      return 'Claimed by recipient';
    default:
      return bucket;
  }
}

export const buyerSummaryLabels = {
  total: 'Total',
  self: 'Self',
  pool: 'Ready to assign',
  sent: 'Sent',
  claimed: 'Claimed',
} as const;

export const buyerSummaryHints: Record<keyof typeof buyerSummaryLabels, string> = {
  total: 'All tickets from this purchase',
  self: 'Personal ticket for the buyer',
  pool: 'Giftable tickets not yet assigned to a guest',
  sent: 'Already assigned — waiting for recipient to claim',
  claimed: 'Recipient has accepted the ticket',
};

function buildPaidBuyerEmailByUserId(
  tickets: WalletItem[],
  gifts: GiftAllocation[],
  payments: PaymentTransaction[],
): Map<string, string> {
  const map = new Map<string, string>();
  const giftByEntitlementId = new Map(gifts.map((g) => [g.entitlementId, g]));
  const paidEmails = new Set(
    payments
      .filter((p) => p.status === 'PAID')
      .map((p) => normalizeEmail(p.customerEmail))
      .filter(Boolean),
  );

  const buckets = new Map<string, WalletItem[]>();
  for (const ticket of tickets) {
    const sourceUserId = resolveTicketSourceUserId(ticket, giftByEntitlementId);
    const list = buckets.get(sourceUserId) ?? [];
    list.push(ticket);
    buckets.set(sourceUserId, list);
  }

  for (const [sourceUserId, buyerTickets] of buckets.entries()) {
    const inferred = inferBuyerEmailFromTickets(sourceUserId, buyerTickets, gifts, '');
    if (inferred) {
      map.set(sourceUserId, inferred);
      continue;
    }

    for (const email of paidEmails) {
      const ownsTicketWithEmail = buyerTickets.some(
        (ticket) =>
          ticket.userId === sourceUserId &&
          normalizeEmail(readTicketRecipientEmail(ticket)) === email,
      );
      if (ownsTicketWithEmail) {
        map.set(sourceUserId, email);
        break;
      }
    }
  }

  return map;
}

function resolveBuyerIdentity(
  sourceUserId: string,
  buyerTickets: WalletItem[],
  gifts: GiftAllocation[],
  userMap: Map<string, UserProfile>,
  membersByEmail: Map<string, Member>,
  paidBuyerEmailByUserId: Map<string, string>,
): { buyerName: string; buyerEmail: string; buyerPhone: string } {
  const workspaceUser = userMap.get(sourceUserId);
  const workspaceName = workspaceUser?.fullName?.trim() ?? '';

  let buyerEmail =
    normalizeEmail(workspaceUser?.email) ||
    paidBuyerEmailByUserId.get(sourceUserId) ||
    inferBuyerEmailFromTickets(sourceUserId, buyerTickets, gifts, workspaceName) ||
    '';

  let member = buyerEmail ? membersByEmail.get(buyerEmail) : undefined;
  if (!buyerEmail && member?.email) {
    buyerEmail = normalizeEmail(member.email);
  }

  if (!buyerEmail) {
    buyerEmail =
      inferBuyerEmailFromTickets(
        sourceUserId,
        buyerTickets,
        gifts,
        inferBuyerNameFromTickets(sourceUserId, buyerTickets, gifts, ''),
      ) || '';
    member = buyerEmail ? membersByEmail.get(buyerEmail) : undefined;
  }

  const buyerName =
    formatBuyerDisplayName(workspaceName) ||
    formatBuyerDisplayName(member?.name) ||
    formatBuyerDisplayName(
      inferBuyerNameFromTickets(sourceUserId, buyerTickets, gifts, buyerEmail),
    ) ||
    formatBuyerDisplayName(pickGiftSourceUserName(gifts, sourceUserId)) ||
    formatBuyerDisplayName(toTitleFromEmail(buyerEmail)) ||
    formatBuyerDisplayName(toTitleFromEmail(workspaceUser?.email)) ||
    'Unknown purchaser';

  return {
    buyerName,
    buyerEmail: buyerEmail || normalizeEmail(member?.email) || '',
    buyerPhone: workspaceUser?.phone?.trim() || member?.phone?.trim() || '',
  };
}

export function buildWalletBuyerRows(params: {
  tickets: WalletItem[];
  gifts: GiftAllocation[];
  userMap: Map<string, UserProfile>;
  membersByEmail: Map<string, Member>;
  payments?: PaymentTransaction[];
}): WalletBuyerRow[] {
  const { tickets, gifts, userMap, membersByEmail, payments = [] } = params;
  const giftByEntitlementId = new Map(gifts.map((g) => [g.entitlementId, g]));
  const paidBuyerEmailByUserId = buildPaidBuyerEmailByUserId(tickets, gifts, payments);

  const buckets = new Map<string, WalletItem[]>();
  for (const ticket of tickets) {
    const sourceUserId = resolveTicketSourceUserId(ticket, giftByEntitlementId);
    const list = buckets.get(sourceUserId) ?? [];
    list.push(ticket);
    buckets.set(sourceUserId, list);
  }

  const rows: WalletBuyerRow[] = [];
  for (const [sourceUserId, buyerTickets] of buckets.entries()) {
    const { buyerName, buyerEmail, buyerPhone } = resolveBuyerIdentity(
      sourceUserId,
      buyerTickets,
      gifts,
      userMap,
      membersByEmail,
      paidBuyerEmailByUserId,
    );

    let selfCount = 0;
    let poolCount = 0;
    let pendingShareCount = 0;
    let claimedCount = 0;

    for (const ticket of buyerTickets) {
      const bucket = classifyWalletTicketForBuyer(
        ticket,
        sourceUserId,
        giftByEntitlementId.get(ticket.id),
        buyerEmail,
        buyerName,
      );
      if (bucket === 'SELF') selfCount += 1;
      else if (bucket === 'SHARING_POOL') poolCount += 1;
      else if (bucket === 'PENDING_SEND') pendingShareCount += 1;
      else claimedCount += 1;
    }

    rows.push({
      sourceUserId,
      buyerName,
      buyerEmail,
      buyerPhone,
      ticketCount: buyerTickets.length,
      selfCount,
      poolCount,
      pendingShareCount,
      claimedCount,
      tickets: buyerTickets,
    });
  }

  return rows.sort((a, b) => a.buyerName.localeCompare(b.buyerName, undefined, { sensitivity: 'base' }));
}
