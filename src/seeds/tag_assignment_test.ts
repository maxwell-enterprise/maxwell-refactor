import { Event, EventTierDefinition } from '../types/index';
import { CreditTagMaster } from '../types/access';

// 1. Tags specific for this test
export const SEED_TEST_TAGS: CreditTagMaster[] = [
    {
        id: 'TAG-TEST-GOLD',
        code: 'GOLD_MEMBER_2025',
        name: 'Gold Membership 2025',
        type: 'UNLIMITED_ACCESS',
        usageLimit: 0,
        description: 'Grants access to Gold tier events.',
        isActive: true
    },
    {
        id: 'TAG-TEST-SINGLE',
        code: 'SINGLE_ENTRY_PASS',
        name: 'Single Entry Pass',
        type: 'CONSUMABLE_CREDIT',
        usageLimit: 1,
        description: 'One-time use for workshops.',
        isActive: true
    }
];

// 2. Events that use these tags
export const SEED_TEST_TAG_EVENTS: Event[] = [
    {
        id: 'EVT-TEST-ASSIGN-1',
        name: 'Gold Gala Dinner',
        date: '2025-12-01',
        location: 'Jakarta',
        locationMode: 'OFFLINE',
        capacity: 100,
        attendees: 0,
        revenue: 0,
        status: 'Upcoming',
        type: 'SOLO',
        creditTags: ['GOLD_MEMBER_2025'], // Requires Gold Tag
        admissionPolicy: 'PRE_BOOKED',
        tiers: [
            {
                id: 'TIER-GALA-VIP',
                name: 'VIP Table',
                quota: 10,
                grantTagIds: ['GOLD_MEMBER_2025'] // Buying this grants the tag
            }
        ]
    },
    {
        id: 'EVT-TEST-ASSIGN-2',
        name: 'Open Workshop',
        date: '2025-12-02',
        location: 'Online',
        locationMode: 'ONLINE',
        capacity: 50,
        attendees: 0,
        revenue: 0,
        status: 'Upcoming',
        type: 'SESSION',
        creditTags: ['SINGLE_ENTRY_PASS'], // Requires Single Pass
        admissionPolicy: 'PRE_BOOKED',
        tiers: [
            {
                id: 'TIER-WORKSHOP-GEN',
                name: 'General Ticket',
                quota: 50,
                grantTagIds: ['SINGLE_ENTRY_PASS'] // Buying grants the pass
            }
        ]
    }
];