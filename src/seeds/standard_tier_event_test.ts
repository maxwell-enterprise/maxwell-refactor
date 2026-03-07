import { Event } from '../types/index';

// Event specifically designed to test the Master Tier linkage
export const STANDARD_TIER_EVENT: Event = {
    id: 'EVT-STD-TIER-TEST',
    name: 'Standardized Tier Gala 2025',
    date: '2025-12-15',
    location: 'Ritz Carlton',
    locationMode: 'OFFLINE',
    capacity: 300,
    attendees: 0,
    revenue: 0,
    status: 'Upcoming',
    type: 'SOLO', // Updated
    creditTags: ['STD_GALA_25'],
    admissionPolicy: 'PRE_BOOKED',
    // These IDs MUST match the seeds/master_tiers.ts
    tiers: [
        { id: 'VIP', name: 'VIP Access', grantTagIds: ['STD_GALA_VIP'], quota: 50 },
        { id: 'GENERAL', name: 'General Admission', grantTagIds: ['STD_GALA_GEN'], quota: 200 },
        { id: 'MEDIA', name: 'Media / Press', grantTagIds: ['STD_GALA_MEDIA'], quota: 20 } 
    ]
};