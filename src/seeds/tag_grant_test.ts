import { Event } from '../types/index';
import { CreditTagMaster } from '../types/access';

// 1. New Tag to be Granted
export const GRANT_TEST_TAG: CreditTagMaster = {
    id: 'TAG-GRANT-TEST',
    code: 'GRANT_TEST_TAG',
    name: 'Granted Tag Test',
    type: 'UNLIMITED_ACCESS',
    usageLimit: 0,
    description: 'Tag specifically for testing the Granted By flow',
    isActive: true
};

// 2. Event configured to Grant this tag via Tier
export const GRANT_TEST_EVENT: Event = {
    id: 'EVT-GRANT-TEST',
    name: 'Tag Grant Simulation',
    date: '2025-12-31',
    location: 'Test Lab',
    locationMode: 'OFFLINE',
    capacity: 100,
    attendees: 0,
    revenue: 0,
    status: 'Upcoming',
    type: 'SOLO',
    admissionPolicy: 'PRE_BOOKED',
    creditTags: [], // Not required for entry
    tiers: [
        {
            id: 'TIER-GRANT-01',
            name: 'Granter Tier',
            quota: 50,
            price: 0,
            grantTagIds: ['GRANT_TEST_TAG'] // Grants the tag above
        }
    ]
};