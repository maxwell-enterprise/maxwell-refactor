import { Event, Product } from '../types/index';

// 1. EVENT with Limited Quota
export const SHARED_INV_EVENT: Event = {
    id: 'EVT-SHARED-STOCK',
    name: 'Limited Seat Workshop',
    date: '2026-08-01',
    location: 'Room 101',
    locationMode: 'OFFLINE',
    capacity: 10,
    attendees: 0,
    revenue: 0,
    status: 'Upcoming',
    type: 'SOLO',
    creditTags: ['ACCESS_LIMITED'],
    admissionPolicy: 'PRE_BOOKED',
    tiers: [
        { 
            id: 'TIER-LIMITED', // Stable ID for test
            name: 'Standard Seat', 
            quota: 5, // Only 5 seats total
            quotaSold: 4, // 4 Already sold! Only 1 left.
            grantTagIds: ['ACCESS_LIMITED'], 
            price: 100000 
        }
    ]
};

// 2. PRODUCT selling that ticket
export const SHARED_INV_PRODUCT: Product = {
    id: 'PKG-LIMITED-TICKET',
    title: 'Workshop Ticket',
    description: 'Entry to limited workshop.',
    priceIdr: 100000,
    category: 'Packages',
    imageUrl: '',
    hasVariants: false,
    items: [
        {
            id: 'ITM-TKT-LIMIT',
            name: 'Workshop Ticket',
            type: 'TICKET',
            quantity: 1,
            meta: { 
                eventId: 'EVT-SHARED-STOCK',
                targetTier: 'TIER-LIMITED' // Must match Event Tier ID
            }
        }
    ]
};