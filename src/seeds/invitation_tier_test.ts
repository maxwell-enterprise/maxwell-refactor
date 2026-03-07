import { EventInvitation, Event } from '../types/index';

export const INVITATION_TIER_EVENT: Event = {
    id: 'EVT-INVITE-TIER-TEST',
    name: 'Gala Dinner 2026',
    date: '2026-12-31',
    location: 'Ballroom',
    locationMode: 'OFFLINE',
    capacity: 100,
    attendees: 0,
    revenue: 0,
    status: 'Upcoming',
    type: 'SOLO',
    admissionPolicy: 'INVITED_ONLY',
    creditTags: ['ACCESS_GALA_VIP', 'ACCESS_GALA_REG'],
    tiers: [
        { id: 'TIER-GALA-VIP', name: 'VIP Guest', quota: 10, grantTagIds: ['ACCESS_GALA_VIP'], price: 0 },
        { id: 'TIER-GALA-REG', name: 'Regular Guest', quota: 50, grantTagIds: ['ACCESS_GALA_REG'], price: 0 }
    ]
};

export const INVITATION_TIER_SEED: EventInvitation[] = [
    {
        id: 'INV-TIER-TEST-1',
        eventId: 'EVT-INVITE-TIER-TEST',
        eventName: 'Gala Dinner 2026',
        tierId: 'TIER-GALA-VIP',
        tierName: 'VIP Guest',
        memberId: 'M-WALLET-TEST',
        memberName: 'Wallet Tester',
        status: 'PENDING',
        validUntil: '2026-12-30T23:59:59Z',
        sentAt: new Date().toISOString(),
        sentBy: 'admin-1'
    }
];