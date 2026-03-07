
import { WalletItem } from '../types/access';
import { MEMBER_DATA_SEED } from './members';
import { AUTH_TEST_WALLET_ITEMS } from './auth_test_user';

// Helper to generate a random future date
const getFutureDate = (months = 12) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
};

export const POPULATED_WALLET_SEED: WalletItem[] = [
    // 1. Keep Auth Test Items
    ...AUTH_TEST_WALLET_ITEMS,

    // 2. VIP MEMBER WALLET (M-VIP-001)
    {
        id: 'W-VIP-001-TKT',
        userId: 'M-VIP-001',
        type: 'TICKET',
        title: 'IMC 2026 (VIP)',
        subtitle: 'Front Row Access',
        status: 'ACTIVE',
        isTransferable: false,
        expiryDate: '2026-09-02',
        qrData: 'TICKET:EVT-IMC-26:M-VIP-001:W-VIP-001-TKT',
        meta: { 
            eventId: 'EVT-IMC-26', 
            location: 'Jakarta Convention Center',
            targetTier: 'VIP', 
            creditTag: 'ACCESS_IMC_26_VIP'
        }
    },
    {
        id: 'W-VIP-001-PASS',
        userId: 'M-VIP-001',
        type: 'CREDIT_PASS',
        title: '2026 Annual Pass',
        subtitle: 'Unlimited Series Access',
        status: 'ACTIVE',
        isTransferable: false,
        expiryDate: '2026-12-31',
        meta: { 
            tag: 'SERIES_2026_FULL', 
            isUnlimited: true,
            credits: 9999
        }
    },

    // 3. REGULAR MEMBER WALLET (M-REG-001)
    {
        id: 'W-REG-001-TKT',
        userId: 'M-REG-001',
        type: 'TICKET',
        title: 'IMC 2026 (General)',
        subtitle: 'Standard Entry',
        status: 'ACTIVE',
        isTransferable: true,
        expiryDate: '2026-09-02',
        qrData: 'TICKET:EVT-IMC-26:M-REG-001:W-REG-001-TKT',
        meta: { 
            eventId: 'EVT-IMC-26', 
            location: 'Jakarta Convention Center',
            targetTier: 'GENERAL',
            creditTag: 'ACCESS_IMC_26_GEN'
        }
    },

    // 4. MEDIA GUEST WALLET (M-MEDIA-001)
    {
        id: 'W-MEDIA-001-PASS',
        userId: 'M-MEDIA-001',
        type: 'TICKET',
        title: 'IMC 2026 Press Pass',
        subtitle: 'All Access Media',
        status: 'ACTIVE',
        isTransferable: false,
        expiryDate: '2026-09-02',
        qrData: 'TICKET:EVT-IMC-26:M-MEDIA-001:W-MEDIA-001-PASS',
        meta: { 
            eventId: 'EVT-IMC-26', 
            location: 'Jakarta Convention Center',
            targetTier: 'MEDIA',
            creditTag: 'ACCESS_IMC_MEDIA'
        }
    },

    // 5. BULK GENERATION (For other members - Give them FLEX CREDITS)
    ...MEMBER_DATA_SEED.filter(m => !m.id.startsWith('M-')).flatMap(member => {
        const items: WalletItem[] = [];
        
        // Everyone gets welcome credits compatible with 2026 events
        items.push({
            id: `W-${member.id}-WELCOME`,
            userId: member.id,
            type: 'CREDIT_PASS',
            title: '2026 Flex Credits',
            subtitle: 'Redeemable for Sessions',
            status: 'ACTIVE',
            isTransferable: false,
            expiryDate: getFutureDate(18),
            meta: { credits: 3, total: 3, tag: 'FLEX_CREDIT_2026' }
        });

        return items;
    })
];
