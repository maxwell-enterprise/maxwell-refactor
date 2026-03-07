import { Event } from '../types/index';
import { GateDefinition } from '../types/attendance';

// Use 'SOLO' type for single events like Festivals in the new hierarchy
export const ATTENDANCE_TEST_EVENT: Event = {
    id: 'EVT-TEST-GALA',
    name: 'Grand Gala 2025',
    date: '2025-12-01',
    location: 'Jakarta Convention Center',
    locationMode: 'OFFLINE',
    capacity: 2000,
    attendees: 0,
    revenue: 0,
    status: 'Upcoming',
    type: 'SOLO', // Updated from 'FESTIVAL'
    creditTags: ['GALA_VIP', 'GALA_GENERAL'],
    admissionPolicy: 'PRE_BOOKED'
};

export const ATTENDANCE_TEST_GATES: GateDefinition[] = [
    {
        id: 'GATE-A',
        label: 'Gate A (VIP Only)',
        allowedTiers: ['VIP', 'VVIP'],
        location: 'North Lobby'
    },
    {
        id: 'GATE-B',
        label: 'Gate B (General Admission)',
        allowedTiers: ['GENERAL'],
        location: 'West Wing'
    },
    {
        id: 'GATE-C',
        label: 'Gate C (All Access)',
        allowedTiers: ['GENERAL', 'VIP', 'VVIP', 'CREW', 'SPEAKER'],
        location: 'East Wing'
    }
];

export const TIER_MAPPING: Record<string, 'GENERAL' | 'VIP' | 'VVIP'> = {
    'GALA_VIP': 'VIP',
    'GALA_GENERAL': 'GENERAL',
    'IMC_VIP_ACCESS': 'VIP',
    'IMC_GENERAL_ACCESS': 'GENERAL'
};