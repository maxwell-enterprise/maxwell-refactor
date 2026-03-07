
import { CreditTagMaster } from '../types/access';

export const SEED_CREDIT_TAGS: CreditTagMaster[] = [
    // --- SERIES TAGS ---
    {
        id: 'TAG-001',
        code: 'SERIES_2026_FULL',
        name: 'Annual Pass 2026',
        type: 'UNLIMITED_ACCESS',
        usageLimit: 0,
        description: 'Unlimited access to all Series 2026 events.',
        isActive: true
    },
    // --- IMC 2026 TAGS ---
    {
        id: 'TAG-IMC-26-VIP',
        code: 'ACCESS_IMC_26_VIP',
        name: 'IMC 2026 VIP Access',
        type: 'UNLIMITED_ACCESS',
        usageLimit: 0,
        description: 'Grants access to VIP Entrance and Front Row seats.',
        isActive: true
    },
    {
        id: 'TAG-IMC-26-GEN',
        code: 'ACCESS_IMC_26_GEN',
        name: 'IMC 2026 General Entry',
        type: 'CONSUMABLE_CREDIT',
        usageLimit: 1,
        description: 'Standard one-time entry for the conference.',
        isActive: true
    },
    // --- CONSUMABLE TAGS ---
    {
        id: 'TAG-003',
        code: 'TICKET_JAN_26',
        name: 'January 26 Single Ticket',
        type: 'CONSUMABLE_CREDIT',
        usageLimit: 1,
        description: 'Single use ticket for January session.',
        isActive: true
    },
    {
        id: 'TAG-004',
        code: 'FLEX_CREDIT_2026',
        name: 'Flex Credit 2026',
        type: 'CONSUMABLE_CREDIT',
        usageLimit: 1, 
        description: 'Flexible credit for bundle packages in 2026.',
        isActive: true
    },
    {
        id: 'TAG-005',
        code: 'DTR_CREDIT',
        name: 'DTR Seminar Pass',
        type: 'CONSUMABLE_CREDIT',
        usageLimit: 1,
        description: 'Access to DTR special seminar.',
        isActive: true
    }
];
