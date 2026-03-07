
import { Event } from '../types/index';

// A pure Container event (Series Parent)
// Should have admissionPolicy implicitly set to PRE_BOOKED by system logic, but not exposed in UI
export const SERIES_CONTAINER_TEST: Event = {
    id: 'SERIES-TEST-BUNDLE',
    name: 'Executive Leadership 2025 Bundle',
    date: '2025-06-01',
    endDate: '2025-12-31',
    location: 'Hybrid',
    locationMode: 'HYBRID',
    type: 'CONTAINER',
    status: 'Upcoming',
    capacity: 1000,
    attendees: 0,
    revenue: 0,
    admissionPolicy: 'PRE_BOOKED', // Logic dictates this
    creditTags: ['EXEC_SERIES_2025'],
    tiers: [
        { 
            id: 'TIER-BUNDLE-FULL', 
            name: 'Full Series Pass', 
            quota: 100, 
            grantTagIds: ['EXEC_SERIES_2025'] 
        }
    ]
};
