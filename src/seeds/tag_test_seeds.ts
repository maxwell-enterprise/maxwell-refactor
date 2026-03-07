import { WalletItem } from '../types/access';
import { Event } from '../types/index';

// 1. Tag Definitions are in constants/tagRegistry.ts
// Testing Scenarios:
// A. User with Unlimited Pass (Should check in multiple times without decrement)
// B. User with Consumable Pass (Should decrement until 0, then fail)

export const TAG_TEST_WALLET: WalletItem[] = [
    {
        id: 'W-TEST-UNLIMITED',
        userId: 'u-unlimited',
        type: 'CREDIT_PASS',
        title: 'Annual VIP Pass',
        subtitle: 'Unlimited Access',
        status: 'ACTIVE',
        isTransferable: false,
        expiryDate: '2025-12-31',
        meta: { 
            tag: 'SERIES_2025_FULL', 
            isUnlimited: true,
            credits: 9999 
        }
    },
    {
        id: 'W-TEST-CONSUMABLE',
        userId: 'u-consumable',
        type: 'CREDIT_PASS',
        title: '5-Class Bundle',
        subtitle: 'Consumable Credits',
        status: 'ACTIVE',
        isTransferable: true,
        expiryDate: '2025-12-31',
        meta: { 
            tag: 'FLEX_CREDIT_2025', 
            isUnlimited: false,
            credits: 5,
            total: 5
        }
    }
];

export const TAG_TEST_EVENTS: Event[] = [
    {
        id: 'EVT-TEST-VIP',
        name: 'VIP Only Night',
        date: '2025-05-01',
        location: 'Rooftop',
        locationMode: 'OFFLINE',
        type: 'SOLO', // Updated
        status: 'Upcoming',
        capacity: 50,
        attendees: 0,
        revenue: 0,
        admissionPolicy: 'PRE_BOOKED',
        creditTags: ['SERIES_2025_FULL', 'IMC_VIP_ACCESS'] // Requires VIP tag
    },
    {
        id: 'EVT-TEST-CLASS',
        name: 'Standard Workshop',
        date: '2025-05-02',
        location: 'Room A',
        locationMode: 'OFFLINE',
        type: 'SESSION', // Updated
        status: 'Upcoming',
        capacity: 20,
        attendees: 0,
        revenue: 0,
        admissionPolicy: 'PRE_BOOKED',
        creditTags: ['FLEX_CREDIT_2025', 'SERIES_2025_FULL'] // Accepts both
    }
];