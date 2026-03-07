import { Event, EventInvitation } from '../types/index';

// 1. The Container
export const OPTION_CONTAINER_EVENT: Event = {
    id: 'EVT-OPT-CONTAINER',
    name: 'Executive Workshop Series (Pick 2)',
    date: '2026-07-01',
    location: 'Hybrid',
    locationMode: 'HYBRID',
    capacity: 50,
    attendees: 0,
    revenue: 0,
    status: 'Upcoming',
    type: 'CONTAINER',
    admissionPolicy: 'INVITED_ONLY',
    creditTags: ['EXEC_WORKSHOP_ACCESS'],
    selectionConfig: {
        mode: 'OPTION',
        minSelect: 2,
        maxSelect: 2
    },
    tiers: [
        { id: 'TIER-INVITE-EXEC', name: 'Invited Executive', quota: 50, grantTagIds: ['EXEC_WORKSHOP_ACCESS'] }
    ]
};

// 2. The Options (Children)
export const OPTION_CHILD_1: Event = {
    id: 'EVT-OPT-C1',
    parentEventId: 'EVT-OPT-CONTAINER',
    name: 'Workshop A: Strategic Vision',
    date: '2026-07-05',
    location: 'Online',
    locationMode: 'ONLINE',
    capacity: 50,
    attendees: 0,
    revenue: 0,
    status: 'Upcoming',
    type: 'SESSION',
    admissionPolicy: 'INVITED_ONLY',
    creditTags: []
};

export const OPTION_CHILD_2: Event = {
    id: 'EVT-OPT-C2',
    parentEventId: 'EVT-OPT-CONTAINER',
    name: 'Workshop B: Crisis Management',
    date: '2026-07-06',
    location: 'Online',
    locationMode: 'ONLINE',
    capacity: 50,
    attendees: 0,
    revenue: 0,
    status: 'Upcoming',
    type: 'SESSION',
    admissionPolicy: 'INVITED_ONLY',
    creditTags: []
};

export const OPTION_CHILD_3: Event = {
    id: 'EVT-OPT-C3',
    parentEventId: 'EVT-OPT-CONTAINER',
    name: 'Workshop C: Team Dynamics',
    date: '2026-07-07',
    location: 'Online',
    locationMode: 'ONLINE',
    capacity: 50,
    attendees: 0,
    revenue: 0,
    status: 'Upcoming',
    type: 'SESSION',
    admissionPolicy: 'INVITED_ONLY',
    creditTags: []
};

// 3. The Invitation
export const OPTION_TEST_INVITATION: EventInvitation = {
    id: 'INV-OPT-TEST',
    eventId: 'EVT-OPT-CONTAINER',
    eventName: 'Executive Workshop Series (Pick 2)',
    memberId: 'M-WALLET-TEST',
    memberName: 'Wallet Tester',
    status: 'PENDING',
    validUntil: '2025-12-31T23:59:59Z',
    sentAt: new Date().toISOString(),
    sentBy: 'admin-1'
};