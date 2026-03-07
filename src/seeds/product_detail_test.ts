
import { Product } from '../types/index';

// A Complex Bundle to test Product Detail Modal
export const DETAILED_PRODUCT_SEED: Product = {
    id: 'PKG-ULTIMATE-EXP',
    title: 'Ultimate Leadership Experience Bundle',
    description: 'The complete package for aspiring leaders. Includes VIP access to the Annual Summit, flexible credits for workshops, and a physical welcome kit delivered to your door.',
    priceIdr: 45000000,
    category: 'Packages',
    imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=1000',
    items: [
        {
            id: 'ITM-TKT-IMC',
            name: 'IMC 2025 VIP Ticket',
            type: 'TICKET',
            quantity: 1,
            meta: { eventId: 'EVT-IMC-25', targetTier: 'VIP' }
        },
        {
            id: 'ITM-CREDIT-FLEX',
            name: 'Workshop Flex Credits',
            type: 'EVENT_CREDIT',
            quantity: 10,
            meta: { creditTag: 'FLEX_CREDIT_2025' }
        },
        {
            id: 'ITM-PHYS-KIT',
            name: 'Executive Welcome Kit',
            type: 'PHYSICAL',
            quantity: 1,
            meta: { skuRef: 'KIT-WELCOME' }
        }
    ],
    hasVariants: true,
    variants: [
        {
            id: 'VAR-INDIVIDUAL',
            name: 'Individual Pass',
            priceIdr: 45000000,
            items: [] // Inherits parent items or define specific
        },
        {
            id: 'VAR-COUPLE',
            name: 'Couple Pass (2x)',
            priceIdr: 80000000,
            items: [
                 {
                    id: 'ITM-TKT-IMC-2',
                    name: 'IMC 2025 VIP Ticket (x2)',
                    type: 'TICKET',
                    quantity: 2,
                    meta: { eventId: 'EVT-IMC-25', targetTier: 'VIP' }
                },
                {
                    id: 'ITM-CREDIT-FLEX-2',
                    name: 'Workshop Flex Credits (x20)',
                    type: 'EVENT_CREDIT',
                    quantity: 20,
                    meta: { creditTag: 'FLEX_CREDIT_2025' }
                }
            ]
        }
    ]
};
