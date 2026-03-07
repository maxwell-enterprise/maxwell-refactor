import { Event } from '../types/index';

export const EVENTS_HIERARCHY_SEED: Event[] = [
    // --- 4. FESTIVAL (SOLO with Tiers & Gates) ---
    // This is the MAIN TEST EVENT for Scanner Logic
    {
        id: 'EVT-IMC-26',
        name: 'International Maxwell Conference (IMC) Jakarta 2026',
        date: '2026-09-01',
        location: 'Jakarta Convention Center',
        locationMode: 'OFFLINE',
        type: 'SOLO',
        status: 'Upcoming',
        capacity: 2000,
        attendees: 0,
        revenue: 0,
        admissionPolicy: 'PRE_BOOKED',
        banner_url: 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?auto=format&fit=crop&q=80&w=1000',
        
        // The LOCK: What tags are accepted at this event?
        creditTags: ['ACCESS_IMC_26_VIP', 'ACCESS_IMC_26_GEN', 'FLEX_CREDIT_2026'], 
        
        parentEventId: undefined,
        
        // The INVENTORY: Buying these tiers grants the tags above
        tiers: [
            { 
                id: 'TIER-VIP', 
                name: 'VIP Experience', 
                quota: 200, 
                price: 3500000, 
                grantTagIds: ['ACCESS_IMC_26_VIP'] // Grants the VIP Key
            },
            { 
                id: 'TIER-GEN', 
                name: 'General Admission', 
                quota: 1500, 
                price: 1500000, 
                grantTagIds: ['ACCESS_IMC_26_GEN'] // Grants the General Key
            }
        ],

        // The PHYSICAL GATES: Where can people enter?
        gates: [
            {
                id: 'GATE-01',
                name: 'Main Lobby (General)',
                allowedTiers: ['GENERAL'], // Only General tickets work here
                assignedUserIds: ['gate-1'], // Assigned to Gate Keeper 1
                isActive: true
            },
            {
                id: 'GATE-02',
                name: 'VIP Red Carpet',
                allowedTiers: ['VIP', 'VVIP'], // Only VIPs work here
                assignedUserIds: ['gate-1'], // Gate Keeper 1 handles VIP too
                isActive: true
            }
        ],

        sessions: [
            { id: 'SES-IMC-D1', name: 'Day 1: Conference', startTime: '2026-09-01T08:00', endTime: '2026-09-01T17:00' },
            { id: 'SES-IMC-D2', name: 'Day 2: Workshops', startTime: '2026-09-02T09:00', endTime: '2026-09-02T16:00' }
        ]
    },

    // --- 1. SERIES CONTAINER ---
    {
        id: 'SERIES-2026',
        name: 'Maxwell Mentorship 2026 (Annual Series)',
        date: '2026-01-01',
        location: 'Hybrid',
        locationMode: 'HYBRID',
        type: 'CONTAINER',
        status: 'Upcoming',
        capacity: 1000,
        attendees: 0,
        revenue: 0,
        admissionPolicy: 'PRE_BOOKED',
        creditTags: ['SERIES_2026_FULL'],
        banner_url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=1000',
        tiers: [
            { id: 'TIER-ANNUAL', name: 'Annual Pass', quota: 500, grantTagIds: ['SERIES_2026_FULL'] }
        ]
    },

    // --- 2. SESSIONS (Children) ---
    {
        id: 'EVT-26-JAN',
        name: 'Jan 2026: Intentional Living',
        date: '2026-01-15',
        location: 'Grand Ballroom A',
        locationMode: 'OFFLINE',
        type: 'SESSION',
        status: 'Upcoming',
        capacity: 200,
        attendees: 0,
        revenue: 0,
        admissionPolicy: 'PRE_BOOKED',
        parentEventId: 'SERIES-2026',
        creditTags: ['TICKET_JAN_26', 'SERIES_2026_FULL', 'FLEX_CREDIT_2026'],
        banner_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=1000',
        tiers: [
            { id: 'TIER-SESS-JAN', name: 'Single Session Ticket', quota: 50, grantTagIds: ['TICKET_JAN_26'] }
        ]
    },

    // --- 6. OPEN EVENT (MEMBER ONLY) ---
    {
        id: 'EVT-OPEN-NETWORKING',
        name: 'Friday Networking Night 2026',
        date: '2026-03-20',
        location: 'Maxwell HQ Lounge',
        locationMode: 'OFFLINE',
        type: 'SOLO',
        status: 'Upcoming',
        capacity: 50,
        attendees: 0,
        revenue: 0,
        admissionPolicy: 'OPEN_MEMBER', 
        creditTags: [], 
        banner_url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=1000',
        tiers: [], 
        gates: [
            { id: 'GATE-HQ', name: 'Front Desk', allowedTiers: ['GENERAL'], assignedUserIds: ['gate-1'], isActive: true }
        ]
    },

    // --- 7. SPECIAL WORKSHOP (For Flex Credit Testing) ---
    {
        id: 'EVT-WORKSHOP-26',
        name: 'Public Speaking Masterclass',
        date: '2026-05-10',
        location: 'Training Room B',
        locationMode: 'OFFLINE',
        type: 'SOLO',
        status: 'Upcoming',
        capacity: 30,
        attendees: 0,
        revenue: 0,
        admissionPolicy: 'PRE_BOOKED',
        creditTags: ['FLEX_CREDIT_2026'], // Accepts Flex Credits
        banner_url: 'https://images.unsplash.com/photo-1475721027767-p4d8563d0369?auto=format&fit=crop&q=80&w=1000',
        tiers: [
            { id: 'TIER-WS', name: 'Standard Seat', quota: 30, grantTagIds: [] }
        ]
    }
];