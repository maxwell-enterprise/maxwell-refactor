
import { EventInvitation, Member } from '../types/index';
import { RepositoryFactory } from './repositories/index';
import { DataService } from './dataService';
import { EntitlementService } from './entitlementService';
import { DataUtils } from '../utils/dataUtils';

export const InvitationService = {
    /**
     * Get all invitations (Admin)
     */
    getAllInvitations: async (): Promise<EventInvitation[]> => {
        return await RepositoryFactory.getInvitationRepository().getAll();
    },

    /**
     * Get valid invitations for a user
     */
    getMyInvitations: async (userId: string): Promise<EventInvitation[]> => {
        const all = await RepositoryFactory.getInvitationRepository().getMemberInvitations(userId);
        const now = new Date();
        // Filter: Must be PENDING and NOT EXPIRED
        return all.filter(inv => 
            inv.status === 'PENDING' && 
            new Date(inv.validUntil) > now
        );
    },

    /**
     * Admin: Send Invitations to a list of members
     */
    sendInvitations: async (
        targetMemberIds: string[], 
        eventId: string, 
        tierId: string, // NEW: Mandatory Tier ID
        validUntil: string, // YYYY-MM-DD
        adminId: string
    ): Promise<void> => {
        const event = await DataService.getEvents().then(evts => evts.find(e => e.id === eventId));
        if (!event) throw new Error("Event not found");

        // Verify tier exists
        const tier = event.tiers?.find(t => t.id === tierId);
        if (!tier) throw new Error("Selected tier not found in event.");

        const members = await DataService.getMembers();
        const targets = members.filter(m => targetMemberIds.includes(m.id));

        const invitations: EventInvitation[] = targets.map(member => ({
            id: `INV-${DataUtils.generateID()}`,
            eventId,
            eventName: event.name,
            tierId: tierId, // Store Tier
            tierName: tier.name, // Store Name snapshot
            memberId: member.id,
            memberName: member.name,
            status: 'PENDING',
            validUntil: new Date(validUntil + 'T23:59:59').toISOString(),
            sentAt: new Date().toISOString(),
            sentBy: adminId
        }));

        await RepositoryFactory.getInvitationRepository().createInvitations(invitations);
    },

    /**
     * User: Accept Invitation (Generate Ticket)
     * Updated: Uses tierId from invitation. Generates ticket directly (gift) without deducting credits.
     */
    acceptInvitation: async (invitationId: string, userId: string, selectedSubEventIds?: string[]): Promise<void> => {
        const repo = RepositoryFactory.getInvitationRepository();
        const invitations = await repo.getMemberInvitations(userId);
        const invitation = invitations.find(i => i.id === invitationId);
        
        if (!invitation) throw new Error("Invitation not found");
        if (invitation.status !== 'PENDING') throw new Error("Invitation already processed");
        if (new Date(invitation.validUntil) < new Date()) throw new Error("Invitation expired");

        const events = await DataService.getEvents();
        const event = events.find(e => e.id === invitation.eventId);
        if (!event) throw new Error("Event data missing");

        // --- OPTION CONTAINER LOGIC ---
        if (event.type === 'CONTAINER' && event.selectionConfig?.mode === 'OPTION') {
            if (!selectedSubEventIds || selectedSubEventIds.length === 0) {
                 throw new Error("You must select at least one event from the options.");
            }
            if (selectedSubEventIds.length < event.selectionConfig.minSelect) {
                throw new Error(`Minimum selection is ${event.selectionConfig.minSelect}.`);
            }
            if (selectedSubEventIds.length > event.selectionConfig.maxSelect) {
                throw new Error(`Maximum selection is ${event.selectionConfig.maxSelect}.`);
            }

            // Issue tickets for SELECTED children only
            for (const subId of selectedSubEventIds) {
                const subEvent = events.find(e => e.id === subId);
                if (subEvent) {
                    await issueGiftTicket(userId, subEvent, invitation.id, invitation.tierName || 'Invited Guest', invitation.tierId);
                }
            }
        } 
        // --- STANDARD BUNDLE / SOLO LOGIC ---
        else {
             // Issue ticket for the main event (or container) using the Tier from Invite
             await issueGiftTicket(userId, event, invitation.id, invitation.tierName || 'Invited Guest', invitation.tierId);
        }

        // 2. Update Invitation Status
        invitation.status = 'ACCEPTED';
        await repo.updateInvitation(invitation);
    },

    /**
     * Decline
     */
    declineInvitation: async (invitationId: string, userId: string): Promise<void> => {
        const repo = RepositoryFactory.getInvitationRepository();
        const invitations = await repo.getMemberInvitations(userId);
        const invitation = invitations.find(i => i.id === invitationId);
        
        if (invitation && invitation.status === 'PENDING') {
            invitation.status = 'DECLINED';
            await repo.updateInvitation(invitation);
        }
    }
};

// Helper: Issues a ticket directly to wallet (Status ACTIVE) without credit check
async function issueGiftTicket(userId: string, event: any, invitationId: string, tierName: string, tierId?: string) {
    const newTicket = {
        id: `TKT-INV-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        userId: userId,
        type: 'TICKET' as const,
        title: event.name,
        subtitle: tierName, // Use Tier Name from Invitation
        status: 'ACTIVE' as const, // Automatically Active
        isTransferable: false, // Invitations usually strictly personal
        qrData: `TICKET:${event.id}:${userId}:TKT-INV-${Date.now()}`,
        expiryDate: event.date,
        meta: { 
            eventId: event.id, 
            location: event.location,
            targetTier: tierId || 'VIP', 
            invitationId: invitationId
        }
    };
    await RepositoryFactory.getEntitlementRepository().upsertWalletItem(newTicket);
}