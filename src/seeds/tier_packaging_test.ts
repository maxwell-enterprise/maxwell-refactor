import { Event, Product } from '../types/index';

// 1. EVENT WITH DEFINED TIERS
export const TIER_TEST_EVENT: Event = {
    id: 'EVT-TIER-SUMMIT',
    name: 'Grand Leadership Summit 2025',
    date: '2025-11-20',
    location: 'Ballroom A',
    locationMode: 'OFFLINE',
    capacity: 500,
    attendees: 0,
    revenue: 0,
    status: 'Upcoming',
    type: 'SOLO', // Updated
    creditTags: ['ACCESS_SUMMIT_25'],
    admissionPolicy: 'PRE_BOOKED',
    tiers: [
        { id: 'VIP', name: 'VIP Access', price: 2000000, grantTagIds: ['ACCESS_SUMMIT_25_VIP'], quota: 50 },
        { id: 'REG', name: 'Regular Access', price: 500000, grantTagIds: ['ACCESS_SUMMIT_25_REG'], quota: 200 }
    ]
};

// 2. PRODUCT WITH VARIANTS (PACKAGING)
// This product sells access to the event above, but packages it differently.
export const TIER_TEST_PRODUCT: Product = {
    id: 'PKG-SUMMIT-2025',
    title: 'Summit 2025 Experience',
    description: 'Choose your experience level for the upcoming summit.',
    priceIdr: 0, // Base price ignored if variants exist
    category: 'Packages',
    imageUrl: 'https://images.unsplash.com/photo-1544531586-fde5298cdd40',
    items: [], // Root items ignored
    hasVariants: true,
    variants: [
        {
            id: 'VAR-GOLD',
            name: 'Gold Package (VIP)',
            priceIdr: 2500000,
            items: [
                { 
                    id: 'ITM-TKT-VIP', 
                    name: 'Summit VIP Ticket', 
                    type: 'TICKET', 
                    quantity: 1, 
                    meta: { 
                        eventId: 'EVT-TIER-SUMMIT',
                        targetTier: 'VIP', // Explicit link to Event Tier
                        isTransferable: false
                    }
                },
                {
                    id: 'ITM-MERCH',
                    name: 'VIP Swag Bag',
                    type: 'PHYSICAL',
                    quantity: 1,
                    meta: { skuRef: 'MERCH-VIP' }
                }
            ]
        },
        {
            id: 'VAR-SILVER',
            name: 'Silver Package (Regular)',
            priceIdr: 600000,
            items: [
                { 
                    id: 'ITM-TKT-REG', 
                    name: 'Summit Regular Ticket', 
                    type: 'TICKET', 
                    quantity: 1, 
                    meta: { 
                        eventId: 'EVT-TIER-SUMMIT',
                        targetTier: 'REG', // Explicit link to Event Tier
                        isTransferable: true
                    }
                }
            ]
        }
    ]
};