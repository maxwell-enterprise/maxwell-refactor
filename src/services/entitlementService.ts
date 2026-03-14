
import { UserProfile, UserRole, Product, Event, ProductItem, Member } from '../types/index';
import { UserEntitlements, Entitlement, GiftAllocation, CorporateTeamMember, WalletItem, WalletTransactionHistory } from '../types/access';
import { CommunicationService } from './communicationService'; 
import { DataService } from './dataService'; 
import { getTagDefinition } from '../constants/tagRegistry'; 
import { RepositoryFactory } from './repositories/index'; 

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
      if (pass && pass.meta && pass.meta.credits >= qty) {
          pass.meta.credits -= qty;
          await repo.upsertWalletItem(pass);
          
          // Log the credit burn to ledger
          await repo.logWalletTransaction({
              id: `TX-USAGE-${Date.now()}`,
              userId: pass.userId,
              walletItemId: pass.id,
              transactionType: 'USAGE',
              amountChange: -qty,
              balanceAfter: pass.meta.credits,
              referenceId: eventId,
              timestamp: new Date().toISOString()
          });
          return true;
      }
      return false;
  },

  // Fix: Added redeemAndAssign for EventMarketplace
  redeemAndAssign: async (userId: string, passId: string, eventId: string, assignee: { type: string, name: string, email: string, phone: string }): Promise<void> => {
      // 1. Consume Credit
      const success = await EntitlementService.consumePassUsage(passId, 1, eventId);
      if (!success) throw new Error("Insufficient credits");

      // 2. Fetch Event Context
      const allEvents = await DataService.getEvents();
      const event = allEvents.find(e => e.id === eventId);
      if (!event) throw new Error("Event not found");

      const repo = RepositoryFactory.getEntitlementRepository();
      const ticketId = `TKT-REDEEM-${Date.now()}`;
      
      const newTicket: WalletItem = {
          id: ticketId,
          userId: assignee.type === 'MYSELF' ? userId : 'PENDING_GUEST', 
          type: 'TICKET',
          title: event.name,
          subtitle: assignee.type === 'MYSELF' ? 'Standard Admission' : `Guest: ${assignee.name}`,
          status: 'ACTIVE',
          isTransferable: assignee.type !== 'MYSELF',
          expiryDate: event.date,
          qrData: `TICKET:${event.id}:${userId}:${ticketId}`,
          meta: { 
              eventId, 
              location: event.location,
              // IMPORTANT: Save online/offline context to ticket
              locationMode: event.locationMode, 
              onlineMeetingLink: event.onlineMeetingLink,
              recipientName: assignee.name,
              recipientEmail: assignee.email,
              recipientPhone: assignee.phone
          }
      };

      // 3. Persist and potentially distribute if guest
      if (assignee.type !== 'MYSELF') {
          await repo.upsertWalletItem(newTicket);
          await EntitlementService.distributeTickets(userId, 'Sponsor', [{ ...assignee, ticketId }]);
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

      const newTicket: WalletItem = {
          id: ticketId,
          userId: assignee.type === 'MYSELF' ? userId : 'PENDING_GUEST',
          type: 'TICKET',
          title: event.name,
          subtitle: assignee.type === 'MYSELF' 
              ? `${event.admissionPolicy === 'ON_SITE_DEDUCTION' ? 'Pay at Gate' : 'Free Registration'}` 
              : `Guest: ${assignee.name}`,
          status: 'ACTIVE',
          isTransferable: assignee.type !== 'MYSELF',
          expiryDate: event.date,
          qrData: `TICKET:${event.id}:${userId}:${ticketId}`,
          meta: {
              eventId,
              location: event.location,
              locationMode: event.locationMode,
              onlineMeetingLink: event.onlineMeetingLink,
              admissionPolicy: event.admissionPolicy,
              recipientName: assignee.name,
              recipientEmail: assignee.email,
              recipientPhone: assignee.phone
          }
      };

      if (assignee.type !== 'MYSELF') {
          await repo.upsertWalletItem(newTicket);
          await EntitlementService.distributeTickets(userId, 'Sponsor', [{ ...assignee, ticketId }]);
      } else {
          await repo.upsertWalletItem(newTicket);
      }
  },

  // Fix: Added revokeTicketGift for DistributionLedger and GiftManagementModal
  revokeTicketGift: async (userId: string, giftId: string): Promise<void> => {
      const repo = RepositoryFactory.getEntitlementRepository();
      const gifts = await repo.getGiftAllocations();
      const gift = gifts.find(g => g.id === giftId);
      
      if (!gift) throw new Error("Gift record not found");
      if (gift.status !== 'PENDING') throw new Error("Only pending gifts can be revoked.");
      
      // Return ticket to original owner
      const ticket = await repo.getWalletItemById(gift.entitlementId);
      if (ticket) {
          ticket.userId = userId;
          ticket.status = 'ACTIVE';
          // Using bracket notation to avoid TS error on dynamically added prop if not in interface
          delete (ticket as any).sponsoredBy;
          await repo.upsertWalletItem(ticket);
      }
      
      // Update gift status to prevent double-processing
      gift.status = 'REVOKED';
      await repo.upsertGiftAllocation(gift);
  },

  // --- NEW: DISTRIBUTION LOGIC (MOBILE OPTIMIZED) ---
  distributeTickets: async (
      donorId: string, 
      donorName: string, 
      recipients: { name: string, email: string, phone: string, ticketId: string }[]
  ): Promise<void> => {
      const repo = RepositoryFactory.getEntitlementRepository();
      
      for (const recipient of recipients) {
          // 1. Resolve or Create Shadow Member
          const members = await DataService.getMembers();
          let targetMember = members.find(m => m.email.toLowerCase() === recipient.email.toLowerCase());
          
          if (!targetMember) {
              const newMember: Member = {
                  id: `M-SHADOW-${Date.now()}-${Math.floor(Math.random()*1000)}`,
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
                  engagement: { lastActiveDate: new Date().toISOString(), eventsAttendedCount: 0, contentCompletionRate: 0, communityReputationScore: 0, leadScore: 0 }
              };
              await DataService.addMember(newMember);
              targetMember = newMember;
          }

          // 2. Atomic Transfer of Ownership
          const donorTicket = await repo.getWalletItemById(recipient.ticketId);
          if (donorTicket) {
              donorTicket.userId = targetMember.id;
              donorTicket.status = 'ACTIVE';
              donorTicket.sponsoredBy = donorName;
              await repo.upsertWalletItem(donorTicket);

              // 3. Log Allocation for Audit
              const allocation: GiftAllocation = {
                  id: `DISTR-${Date.now()}-${Math.floor(Math.random()*1000)}`,
                  sourceUserId: donorId,
                  sourceUserName: donorName,
                  entitlementId: donorTicket.id,
                  itemName: donorTicket.title,
                  targetEmail: recipient.email,
                  claimToken: `DISTR-${Math.floor(100000 + Math.random() * 900000)}`,
                  status: 'CLAIMED',
                  claimedByUserId: targetMember.id,
                  claimedAt: new Date().toISOString(),
                  createdAt: new Date().toISOString()
              };
              await repo.upsertGiftAllocation(allocation);
              
              // 4. Log Transaction History for Ledger
              await repo.logWalletTransaction({
                  id: `TX-GIFT-${Date.now()}`,
                  userId: donorId,
                  walletItemId: donorTicket.id,
                  transactionType: 'TRANSFER_OUT',
                  amountChange: -1,
                  balanceAfter: 0,
                  referenceName: `Gifted to ${recipient.name}`,
                  timestamp: new Date().toISOString()
              });
          }
      }
  },

  getAllGifts: async (): Promise<GiftAllocation[]> => {
      return await RepositoryFactory.getEntitlementRepository().getGiftAllocations();
  },

  processTransactionEntitlements: async (userId: string, items: { id: string, variantId?: string, quantity: number }[]): Promise<void> => {
      const allProducts = await DataService.getProducts(); 
      const allEvents = await DataService.getEvents();
      const newWalletItems: WalletItem[] = [];

      for (const item of items) {
          const productDef = allProducts.find(p => p.id === item.id);
          if (!productDef) continue;
          const generated = generateWalletItems(userId, productDef, item.quantity, item.variantId, allEvents);
          newWalletItems.push(...generated);
      }

      if (newWalletItems.length > 0) {
          await RepositoryFactory.getEntitlementRepository().upsertWalletItems(newWalletItems);
      }
  }
};

function generateWalletItems(userId: string, product: Product, qty: number, variantId?: string, allEvents: Event[] = []): WalletItem[] {
    const items: WalletItem[] = [];
    const prodItems = (product.hasVariants && variantId) 
        ? (product.variants?.find(v => v.id === variantId)?.items || product.items)
        : product.items;

    prodItems.forEach(item => {
        for(let i=0; i < item.quantity * qty; i++) {
            const id = `W-${Date.now()}-${Math.floor(Math.random()*10000)}-${i}`;
            const isTicket = item.type === 'TICKET';
            const evt = isTicket ? allEvents.find(e => e.id === item.meta?.eventId) : null;

            items.push({
                id, userId, 
                type: item.type as any,
                title: item.name,
                subtitle: isTicket ? (evt?.name || 'Unknown Event') : (item.type === 'EVENT_CREDIT' ? 'Access Pass' : ''),
                status: 'ACTIVE',
                isTransferable: item.meta?.isTransferable ?? true,
                expiryDate: isTicket ? evt?.date : '2025-12-31',
                qrData: `TICKET:${evt?.id}:${userId}:${id}`,
                meta: {
                    ...item.meta,
                    // IMPORTANT: Enrich ticket with Event context for Online access
                    location: evt?.location,
                    locationMode: evt?.locationMode,
                    onlineMeetingLink: evt?.onlineMeetingLink
                }
            });
        }
    });
    return items;
}
