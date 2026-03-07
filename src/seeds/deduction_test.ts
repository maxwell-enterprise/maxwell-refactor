import { WalletItem, CreditTagMaster } from '../types/access';
import { Event, Product } from '../types/index';
import { ATTENDANCE_TEST_GATES } from './attendance_testing';

// 1. A dedicated user for deduction testing
export const DEDUCTION_TEST_USER_ID = 'M-DEDUCT-TEST';

// 2. A wallet item with limited credits
export const DEDUCTION_TEST_WALLET: WalletItem[] = [
    {
        id: 'W-DEDUCT-01',
        userId: DEDUCTION_TEST_USER_ID,
        type: 'CREDIT_PASS',
        title: 'Punch Card (5 Classes)',
        subtitle: 'Deductible',
        status: 'ACTIVE',
        isTransferable: false,
        expiryDate: '2025-12-31',
        meta: { 
            credits: 5, 
            total: 5, 
            tag: 'TAG_DEDUCT_TEST',
            isUnlimited: false
        }
    }
];

// 3. MASTER TAG DEFINITION (Required for Tag Registry)
export const DEDUCTION_TEST_TAG: CreditTagMaster = {
    id: 'TAG-DEF-DEDUCT',
    code: 'TAG_DEDUCT_TEST',
    name: 'Class Punch Card',
    description: 'Valid for Drop-in Yoga and Gym access.',
    type: 'CONSUMABLE_CREDIT',
    usageLimit: 1, // Deducts 1 per use
    isActive: true
};

// 4. PRODUCT (To test "Buying" this entitlement)
export const DEDUCTION_TEST_PRODUCT: Product = {
    id: 'PKG-PUNCH-CARD',
    title: '5-Class Punch Card',
    description: 'Get access to 5 drop-in sessions.',
    priceIdr: 750000,
    category: 'Packages',
    imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a',
    hasVariants: false,
    items: [
        {
            id: 'ITM-PUNCH-5',
            name: 'Class Credits',
            type: 'EVENT_CREDIT',
            quantity: 5,
            meta: { creditTag: 'TAG_DEDUCT_TEST', expiration: '2025-12-31' }
        }
    ]
};

// 5. EVENT configured for on-site deduction WITH GATES
export const DEDUCTION_TEST_EVENT: Event = {
    id: 'EVT-DEDUCT-TEST',
    name: 'Drop-In Yoga Class',
    date: '2025-06-01',
    location: 'Studio 1',
    locationMode: 'OFFLINE',
    capacity: 20,
    attendees: 0,
    revenue: 0,
    status: 'Upcoming',
    type: 'SOLO',
    admissionPolicy: 'ON_SITE_DEDUCTION', // Critical setting
    creditTags: ['TAG_DEDUCT_TEST'], // Matches the wallet item
    parentEventId: undefined,
    // Add gates so the scanner knows this event exists and has entry points
    gates: [
        {
            id: 'GATE-STUDIO-1',
            name: 'Studio Entrance',
            allowedTiers: ['GENERAL'], // On-site deduction usually maps to GENERAL
            assignedUserIds: ['gate-1', 'gate-2'],
            isActive: true
        }
    ]
};