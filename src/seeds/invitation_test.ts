import { EventInvitation, Event } from '../types/index';

// 1. A Special Invite-Only Event
export const INVITE_ONLY_EVENT: Event = {
    id: 'EVT-CEO-DINNER',
    name: 'CEO Roundtable Dinner 2026',
    date: '2026-06-15',
    location: 'Ritz Carlton Pacific Place',
    locationMode: 'OFFLINE',
    capacity: 50,
    attendees: 0,
    revenue: 0,
    status: 'Upcoming',
    type: 'SOLO',
    admissionPolicy: 'INVITED_ONLY',
    creditTags: ['ACCESS_CEO_DINNER'],
    tiers: [
        { id: 'TIER-INVITE', name: 'Invited Guest', quota: 50, grantTagIds: ['ACCESS_CEO_DINNER'], price: 0 }
    ]
};

// 2. Mock Invitation for the "Wallet Tester" user
export const SEED_INVITATIONS: EventInvitation[] = [
    {
        id: 'INV-TEST-001',
        eventId: 'EVT-CEO-DINNER',
        eventName: 'CEO Roundtable Dinner 2026',
        memberId: 'M-WALLET-TEST', // Matches auth_test_user.ts
        memberName: 'Wallet Tester',
        status: 'PENDING',
        validUntil: '2025-12-31T23:59:59Z',
        sentAt: '2025-01-01T10:00:00Z',
        sentBy: 'admin-1'
    }
];