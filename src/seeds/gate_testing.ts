import { Event, UserRole, UserProfile } from '../types/index';
import { EventGateConfig } from '../types/attendance';

// --- USERS FOR GATE TESTING ---
export const GATE_TEST_USERS: UserProfile[] = [
    { 
        id: 'gate-1', 
        fullName: 'Gate Keeper Alpha', 
        email: 'gate@maxwell.com', 
        role: UserRole.GATE_KEEPER, 
        provider: 'email',
        avatarUrl: 'https://ui-avatars.com/api/?name=Gate+Alpha'
    },
    { 
        id: 'gate-2', 
        fullName: 'Gate Keeper Beta', 
        email: 'gate2@maxwell.com', 
        role: UserRole.GATE_KEEPER, 
        provider: 'email',
        avatarUrl: 'https://ui-avatars.com/api/?name=Gate+Beta'
    }
];

// --- GATE CONFIGS ---
export const ATTENDANCE_TEST_GATES: EventGateConfig[] = [
    {
        id: 'GT-01',
        name: 'Main Entrance (All Access)',
        allowedTiers: ['VIP', 'GENERAL', 'VVIP'],
        assignedUserIds: ['gate-1', 'gate-2'],
        isActive: true
    },
    {
        id: 'GT-02',
        name: 'VIP Lounge Entry',
        allowedTiers: ['VIP', 'VVIP'],
        assignedUserIds: ['gate-1'],
        isActive: true
    }
];

// --- EVENT WITH GATES ---
export const GATE_TEST_EVENT: Event = {
    id: 'EVT-GATE-LOGIC-TEST',
    name: 'Gate Logic Simulation 2025',
    date: '2025-11-20',
    location: 'Test Venue',
    locationMode: 'OFFLINE',
    capacity: 100,
    attendees: 0,
    revenue: 0,
    status: 'Upcoming',
    type: 'SOLO', // Updated
    creditTags: ['TEST_TAG'],
    admissionPolicy: 'PRE_BOOKED',
    gates: ATTENDANCE_TEST_GATES
};