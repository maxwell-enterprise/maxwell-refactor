
import { UserProfile, UserRole, Product, Event, ProductItem, Member } from '../types/index';
import { UserEntitlements, Entitlement, GiftAllocation, CorporateTeamMember, WalletItem, WalletMemberHub, WalletTransactionHistory } from '../types/access';
import { CommunicationService } from './communicationService'; 
import { DataService } from './dataService'; 
import { getTagDefinition } from '../constants/tagRegistry'; 
import { RepositoryFactory } from './repositories/index'; 
import { APP_CONFIG } from '../lib/config';
import { apiRequest } from '../repositories/api/apiClient';

export const SEED_ENTITLEMENTS: UserEntitlements[] = [
    {
        userId: 'M0001',
        permissions: ['CONTENT_LIBRARY_ACCESS'],
        attributes: {
            region: 'ID',
            joinDate: '2020-01-01',
            lifecycle: 'FACILITATOR',
            serviceLevel: 'VIP',
            tags: ['Founding_Member', 'President'],
            engagement: { lastActiveDate: new Date().toISOString(), eventsAttendedCount: 20, contentCompletionRate: 100, communityReputationScore: 1000, leadScore: 0 },
            authority: { canSellPrograms: true, canCoachUsers: true, canVerifyCertifications: true, maxDiscountAuthority: 25 }
        },
        credits: 0
    }
];

export const EntitlementService = {
  
  getUserEntitlements: async (userId: string): Promise<UserEntitlements | null> => {
    return await RepositoryFactory.getEntitlementRepository().getUserEntitlements(userId);
  },

  getMyWallet: async (userId: string): Promise<WalletItem[]> => {
      return await RepositoryFactory.getEntitlementRepository().getWalletItems(userId);
  },

  /** Digital membership hub (card + CRM id + gamification); Nest uses JWT, mock uses userId. */
  getWalletMemberHub: async (userId: string): Promise<WalletMemberHub | null> => {
      return await RepositoryFactory.getEntitlementRepository().getWalletMemberHub(userId);
  },

  // Fix: Added getWalletItems as an alias for getMyWallet to satisfy external callers
  getWalletItems: async (userId: string): Promise<WalletItem[]> => {
      return await RepositoryFactory.getEntitlementRepository().getWalletItems(userId);
  },

  getAllWalletItems: async (): Promise<WalletItem[]> => {
      return await RepositoryFactory.getEntitlementRepository().getAllWalletItems();
  },

  getWalletItemById: async (id: string): Promise<WalletItem | null> => {
      return await RepositoryFactory.getEntitlementRepository().getWalletItemById(id);
  },

  getHistory: async (userId: string): Promise<WalletTransactionHistory[]> => {
      return await RepositoryFactory.getEntitlementRepository().getWalletHistory(userId);
  },

  // Fix: Added getTeamMembers to satisfy CorporateTeamManager and SchemaService
  getTeamMembers: async (orgId: string): Promise<CorporateTeamMember[]> => {
      return await RepositoryFactory.getEntitlementRepository().getTeamMembers(orgId);
  },

  // Fix: Added inviteTeamMember for CorporateTeamManager
  inviteTeamMember: async (orgId: string, email: string): Promise<void> => {
      const repo = RepositoryFactory.getEntitlementRepository();
      const newMember: CorporateTeamMember = {
          id: `CORP-INV-${Date.now()}`,
          email: email,
          name: email.split('@')[0], // Extract name from email as placeholder
          status: 'INVITED'
      };
      await repo.upsertTeamMember({ ...newMember, orgId });
  },

  // Fix: Added revokeTeamMember for CorporateTeamManager
  revokeTeamMember: async (id: string): Promise<void> => {
      await RepositoryFactory.getEntitlementRepository().deleteTeamMember(id);
  },

  // Fix: Added recordEventAttendance for QRService
  recordEventAttendance: async (userId: string): Promise<void> => {
      const repo = RepositoryFactory.getEntitlementRepository();
      const ent = await repo.getUserEntitlements(userId);
      if (ent) {
          ent.attributes.engagement.eventsAttendedCount++;
          ent.attributes.engagement.lastActiveDate = new Date().toISOString();
          await repo.upsertUserEntitlements(ent);
      }
  },

  // Fix: Added consumePassUsage for AttendanceService
  consumePassUsage: async (passId: string, qty: number, eventId: string): Promise<boolean> => {
      const repo = RepositoryFactory.getEntitlementRepository();
      const pass = await repo.getWalletItemById(passId);
      if (!pass?.meta) return false;

      if (pass.meta.isUnlimited) {
          await repo.logWalletTransaction({
              id: `TX-USAGE-${Date.now()}`,
              userId: pass.userId,
              walletItemId: pass.id,
              transactionType: 'USAGE',
              amountChange: 0,
              balanceAfter: typeof pass.meta.credits === 'number' ? pass.meta.credits : 0,
              referenceId: eventId,
              referenceName: 'Unlimited pass redemption',
              timestamp: new Date().toISOString(),
          });
          return true;
      }

      if (typeof pass.meta.credits === 'number' && pass.meta.credits >= qty) {
          pass.meta.credits -= qty;
          await repo.upsertWalletItem(pass);

          await repo.logWalletTransaction({
              id: `TX-USAGE-${Date.now()}`,
              userId: pass.userId,
              walletItemId: pass.id,
              transactionType: 'USAGE',
              amountChange: -qty,
              balanceAfter: pass.meta.credits,
              referenceId: eventId,
              timestamp: new Date().toISOString(),
          });
          return true;
      }
      return false;
  },

  // Fix: Added redeemAndAssign for EventMarketplace
  redeemAndAssign: async (userId: string, passId: string, eventId: string, assignee: { type: string, name: string, email: string, phone: string }): Promise<void> => {
      const useApi =
          !APP_CONFIG.USE_MOCK_GLOBAL &&
          APP_CONFIG.DOMAINS.ATTENDANCE === 'API';
      if (useApi) {
          await apiRequest('/wallet/redeem-event-credit', {
              method: 'POST',
              body: JSON.stringify({
                  walletItemId: passId,
                  eventId,
                  assignee: {
                      type: assignee.type,
                      name: assignee.name,
                      email: assignee.email,
                      phone: assignee.phone,
                  },
              }),
          });
          return;
      }

      // 1. Consume Credit
      const success = await EntitlementService.consumePassUsage(passId, 1, eventId);
      if (!success) throw new Error("Insufficient credits");

      // 2. Fetch Event Context
      const allEvents = await DataService.getEvents();
      const event = allEvents.find(e => e.id === eventId);
      if (!event) throw new Error("Event not found");

      const repo = RepositoryFactory.getEntitlementRepository();
      const ticketId = `TKT-REDEEM-${Date.now()}`;

      const isDraft = assignee.type === 'DRAFT';
      const isGuest = assignee.type === 'GUEST';

      const venueMeta = {
          eventId,
          location: event.location,
          locationMode: event.locationMode,
          onlineMeetingLink: event.onlineMeetingLink,
      };

      const newTicket: WalletItem = {
          id: ticketId,
          userId: assignee.type === 'MYSELF' || isDraft ? userId : 'PENDING_GUEST',
          type: 'TICKET',
          title: event.name,
          subtitle: assignee.type === 'MYSELF'
              ? 'Standard Admission'
              : isDraft
                ? 'Draft — assign later'
                : `Guest: ${assignee.name}`,
          status: 'ACTIVE',
          isTransferable: assignee.type !== 'MYSELF',
          expiryDate: event.date,
          qrData: `TICKET:${event.id}:${userId}:${ticketId}`,
          meta: isDraft
              ? { ...venueMeta, redemptionMode: 'DRAFT' as const }
              : {
                    ...venueMeta,
                    recipientName: assignee.name,
                    recipientEmail: assignee.email,
                    recipientPhone: assignee.phone,
                },
      };

      // 3. Persist: self + draft stay in purchaser wallet; guest triggers distribution / claim flow
      if (isGuest) {
          await repo.upsertWalletItem(newTicket);
          await EntitlementService.distributeTickets(
              userId,
              'Sponsor',
              [{ name: assignee.name, email: assignee.email, phone: assignee.phone, ticketId }],
              { immediateTransfer: true },
          );
      } else {
          await repo.upsertWalletItem(newTicket);
      }
  },

  // Register for free/open events (OPEN_MEMBER, OPEN_PUBLIC, ON_SITE_DEDUCTION)
  registerFreeEvent: async (userId: string, eventId: string, assignee: { type: string, name: string, email: string, phone: string }): Promise<void> => {
      const allEvents = await DataService.getEvents();
      const event = allEvents.find(e => e.id === eventId);
      if (!event) throw new Error("Event not found");

      const repo = RepositoryFactory.getEntitlementRepository();
      const ticketId = `TKT-FREE-${Date.now()}`;

      const isDraft = assignee.type === 'DRAFT';
      const isGuest = assignee.type === 'GUEST';

      const venueMeta = {
          eventId,
          location: event.location,
          locationMode: event.locationMode,
          onlineMeetingLink: event.onlineMeetingLink,
          admissionPolicy: event.admissionPolicy,
      };

      const newTicket: WalletItem = {
          id: ticketId,
          userId: assignee.type === 'MYSELF' || isDraft ? userId : 'PENDING_GUEST',
          type: 'TICKET',
          title: event.name,
          subtitle: assignee.type === 'MYSELF'
              ? `${event.admissionPolicy === 'ON_SITE_DEDUCTION' ? 'Pay at Gate' : 'Free Registration'}`
              : isDraft
                ? 'Draft — assign later'
                : `Guest: ${assignee.name}`,
          status: 'ACTIVE',
          isTransferable: assignee.type !== 'MYSELF',
          expiryDate: event.date,
          qrData: `TICKET:${event.id}:${userId}:${ticketId}`,
          meta: isDraft
              ? { ...venueMeta, redemptionMode: 'DRAFT' as const }
              : {
                    ...venueMeta,
                    recipientName: assignee.name,
                    recipientEmail: assignee.email,
                    recipientPhone: assignee.phone,
                },
      };

      if (isGuest) {
          await repo.upsertWalletItem(newTicket);
          await EntitlementService.distributeTickets(
              userId,
              'Sponsor',
              [{ name: assignee.name, email: assignee.email, phone: assignee.phone, ticketId }],
              { immediateTransfer: true },
          );
      } else {
          await repo.upsertWalletItem(newTicket);
      }
  },

  // Fix: Added revokeTicketGift for DistributionLedger and GiftManagementModal
  revokeTicketGift: async (userId: string, giftId: string): Promise<void> => {
      const repo = RepositoryFactory.getEntitlementRepository();
      await repo.revokeGift(giftId);
  },

  // --- DISTRIBUTION: default = pending claim (ticket stays with donor); guest checkout uses immediateTransfer ---
  distributeTickets: async (
      donorId: string,
      donorName: string,
      recipients: { name: string; email: string; phone: string; ticketId: string }[],
      opts?: { immediateTransfer?: boolean },
  ): Promise<void> => {
      const repo = RepositoryFactory.getEntitlementRepository();
      const immediate = opts?.immediateTransfer === true;

      for (const recipient of recipients) {
          if (!immediate) {
              await repo.createGift({
                  walletItemId: recipient.ticketId,
                  transferAmount: 1,
                  recipientName: recipient.name,
                  recipientEmail: recipient.email,
                  recipientPhone: recipient.phone,
                  deliveryMethod: recipient.phone ? 'WHATSAPP' : 'EMAIL',
                  giftMessage: `Ticket shared by ${donorName}`,
              });
              continue;
          }

          const donorTicket = await repo.getWalletItemById(recipient.ticketId);
          if (!donorTicket) continue;

          const allocationId = `DISTR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const claimToken = `CLAIM-${Math.floor(100000 + Math.random() * 900000)}`;

          const members = await DataService.getMembers();
          let targetMember = members.find(
              (m) => m.email.toLowerCase() === recipient.email.toLowerCase(),
          );

          if (!targetMember) {
              const newMember: Member = {
                  id: `M-SHADOW-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                  name: recipient.name,
                  email: recipient.email,
                  phone: recipient.phone,
                  category: 'Member',
                  scholarship: false,
                  joinMonth: new Date().toISOString().slice(0, 7),
                  program: 'Gifted Access',
                  mentorshipDuration: 0,
                  nTagStatus: 'Not yet',
                  platform: 'Digital',
                  regInUS: false,
                  lifecycleStage: 'IDENTIFIED',
                  engagement: {
                      lastActiveDate: new Date().toISOString(),
                      eventsAttendedCount: 0,
                      contentCompletionRate: 0,
                      communityReputationScore: 0,
                      leadScore: 0,
                  },
              };
              await DataService.addMember(newMember);
              targetMember = newMember;
          }

          donorTicket.userId = targetMember.id;
          donorTicket.status = 'ACTIVE';
          donorTicket.sponsoredBy = donorName;
          donorTicket.meta = {
              ...(donorTicket.meta || {}),
              recipientName: recipient.name,
              recipientEmail: recipient.email,
              recipientPhone: recipient.phone,
          };
          await repo.upsertWalletItem(donorTicket);

          const allocation: GiftAllocation = {
              id: allocationId,
              sourceUserId: donorId,
              sourceUserName: donorName,
              entitlementId: donorTicket.id,
              itemName: donorTicket.title,
              targetEmail: recipient.email,
              claimToken,
              status: 'CLAIMED',
              claimedByUserId: targetMember.id,
              claimedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
          };
          await repo.upsertGiftAllocation(allocation);

          await repo.logWalletTransaction({
              id: `TX-GIFT-${Date.now()}`,
              userId: donorId,
              walletItemId: donorTicket.id,
              transactionType: 'TRANSFER_OUT',
              amountChange: -1,
              balanceAfter: 0,
              referenceName: `Gifted to ${recipient.name}`,
              timestamp: new Date().toISOString(),
          });
      }
  },

  getAllGifts: async (): Promise<GiftAllocation[]> => {
      return await RepositoryFactory.getEntitlementRepository().getGiftAllocations();
  },

  getSentGifts: async (): Promise<GiftAllocation[]> => {
      return await RepositoryFactory.getEntitlementRepository().getSentGifts();
  },

  getReceivedGifts: async (): Promise<GiftAllocation[]> => {
      return await RepositoryFactory.getEntitlementRepository().getReceivedGifts();
  },

  getGiftInbox: async (userEmail: string): Promise<GiftAllocation[]> => {
      return await RepositoryFactory.getEntitlementRepository().getGiftInbox(userEmail);
  },

  claimTicketGift: async (token: string): Promise<WalletItem> => {
      return await RepositoryFactory.getEntitlementRepository().claimGift(token);
  },

  /**
   * Legacy client-side wallet expansion (optional mock/Supabase flows).
   * Production store purchases: entitlements are granted by Nest `CheckoutEntitlementsService` from
   * `payment_transactions.itemsSnapshot` (includes `variantId` per line).
   */
  processTransactionEntitlements: async (
      userId: string,
      items: { id: string; variantId?: string; quantity: number }[],
      opts?: { orderReference?: string },
  ): Promise<void> => {
      const allProducts = await DataService.getProducts();
      const allEvents = await DataService.getEvents();
      const newWalletItems: WalletItem[] = [];

      for (const item of items) {
          const productDef = allProducts.find((p) => p.id === item.id);
          if (!productDef) continue;
          const generated = generateWalletItems(
              userId,
              productDef,
              item.quantity,
              item.variantId,
              allEvents,
          );
          newWalletItems.push(...generated);
      }

      if (newWalletItems.length > 0) {
          const repo = RepositoryFactory.getEntitlementRepository();
          await repo.upsertWalletItems(newWalletItems);

          const ref = opts?.orderReference;
          const ts = new Date().toISOString();
          for (const w of newWalletItems) {
              const balance =
                  w.type === 'CREDIT_PASS' && w.meta && typeof w.meta.credits === 'number'
                      ? w.meta.credits
                      : 0;
              await repo.logWalletTransaction({
                  id: `TX-PUR-${w.id}-${Date.now()}`,
                  userId,
                  walletItemId: w.id,
                  transactionType: 'PURCHASE',
                  amountChange: w.type === 'CREDIT_PASS' ? balance : 1,
                  balanceAfter: balance,
                  referenceId: ref,
                  referenceName: w.title,
                  timestamp: ts,
              });
          }
      }
  },
};

function resolveCreditPassExpiry(meta?: { expiration?: string; isUnlimited?: boolean }): string | undefined {
    if (meta?.isUnlimited) return undefined;
    const exp = meta?.expiration;
    if (typeof exp === 'string' && exp.trim()) return exp.trim();
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
}

function generateWalletItems(
    userId: string,
    product: Product,
    qty: number,
    variantId?: string,
    allEvents: Event[] = [],
): WalletItem[] {
    const out: WalletItem[] = [];
    let prodItems: ProductItem[] =
        product.hasVariants && variantId
            ? product.variants?.find((v) => v.id === variantId)?.items || product.items
            : product.items;

    if ((!prodItems || prodItems.length === 0) && product.category === 'Token') {
        prodItems = [
            {
                id: 'token-credit-default',
                name: product.title?.trim() || 'Flexible wallet credits',
                type: 'EVENT_CREDIT',
                quantity: 1,
                meta: { creditTag: 'FLEX_CREDIT_2025' },
            },
        ];
    }

    const stamp = () => `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    prodItems.forEach((bom) => {
        const lineUnits = bom.quantity * qty;
        const bomType =
            bom.type === 'TOKEN' ||
            bom.type === 'CREDIT' ||
            bom.type === 'FLEX_CREDIT' ||
            bom.type === 'WALLET_CREDIT'
                ? 'EVENT_CREDIT'
                : bom.type;

        switch (bomType) {
            case 'TICKET': {
                const evt = bom.meta?.eventId
                    ? allEvents.find((e) => e.id === bom.meta.eventId)
                    : undefined;
                for (let i = 0; i < lineUnits; i++) {
                    const id = `W-TKT-${stamp()}-${i}`;
                    out.push({
                        id,
                        userId,
                        type: 'TICKET',
                        title: bom.name,
                        subtitle: evt?.name || 'Event admission',
                        status: 'ACTIVE',
                        isTransferable: bom.meta?.isTransferable ?? true,
                        expiryDate: evt?.date,
                        qrData: evt
                            ? `TICKET:${evt.id}:${userId}:${id}`
                            : `TICKET:${bom.meta?.eventId ?? 'UNKNOWN'}:${userId}:${id}`,
                        meta: {
                            ...bom.meta,
                            eventId: bom.meta?.eventId,
                            targetTier: bom.meta?.targetTier,
                            location: evt?.location,
                            locationMode: evt?.locationMode,
                            onlineMeetingLink: evt?.onlineMeetingLink,
                        },
                    });
                }
                break;
            }
            case 'EVENT_CREDIT':
            case 'RECURRING_PASS': {
                const id = `W-CR-${stamp()}`;
                const tagId = bom.meta?.creditTag as string | undefined;
                const tagDef = tagId ? getTagDefinition(tagId) : null;
                const unlimited =
                    !!bom.meta?.isUnlimited || tagDef?.usageType === 'UNLIMITED_ACCESS';
                const credits = unlimited ? 999_999 : lineUnits;
                out.push({
                    id,
                    userId,
                    type: 'CREDIT_PASS',
                    title: bom.name,
                    subtitle: tagDef?.description || 'Program credits',
                    status: 'ACTIVE',
                    isTransferable: bom.meta?.isTransferable ?? false,
                    expiryDate: resolveCreditPassExpiry(bom.meta),
                    meta: {
                        ...bom.meta,
                        credits,
                        creditTag: tagId,
                        targetTier: bom.meta?.targetTier,
                        isUnlimited: unlimited,
                    },
                });
                break;
            }
            case 'PHYSICAL': {
                for (let i = 0; i < lineUnits; i++) {
                    const id = `W-PHY-${stamp()}-${i}`;
                    out.push({
                        id,
                        userId,
                        type: 'PHYSICAL_ORDER',
                        title: bom.name,
                        subtitle: 'Preparing shipment',
                        status: 'PROCESSING',
                        isTransferable: false,
                        meta: {
                            ...bom.meta,
                            skuRef: bom.meta?.skuRef,
                            productId: product.id,
                        },
                    });
                }
                break;
            }
            case 'DIGITAL_LINK': {
                for (let i = 0; i < lineUnits; i++) {
                    const id = `W-DIG-${stamp()}-${i}`;
                    const url =
                        (typeof bom.meta?.url === 'string' && bom.meta.url) ||
                        (typeof bom.meta?.link === 'string' && bom.meta.link) ||
                        '';
                    out.push({
                        id,
                        userId,
                        type: 'DIGITAL_CONTENT',
                        title: bom.name,
                        subtitle: url ? 'Tap to open your access link' : 'Digital access',
                        status: 'ACTIVE',
                        isTransferable: bom.meta?.isTransferable ?? false,
                        expiryDate: resolveCreditPassExpiry(bom.meta),
                        meta: {
                            ...bom.meta,
                            url: url || undefined,
                        },
                    });
                }
                break;
            }
        }
    });
    return out;
}
