
import { WalletItem } from '../types/access';

// Scenario:
// 1. User has 5 individual credits of the same type (Should be grouped in UI)
// 2. User has 1 distinct credit (Should stay separate)
// 3. User has a Ticket pending gift to someone (Should show Ribbon UI)

export const WALLET_UI_TEST_ITEMS: WalletItem[] = [
    // --- GROUPABLE CREDITS (5 Items) ---
    {
        id: 'W-CREDIT-01', userId: 'M-WALLET-TEST', type: 'CREDIT_PASS',
        title: 'Workshop Flex Pass', subtitle: 'Standard Credit', status: 'ACTIVE', isTransferable: true,
        expiryDate: '2025-12-31', meta: { credits: 1, total: 1, tag: 'FLEX_CREDIT_2025' }
    },
    {
        id: 'W-CREDIT-02', userId: 'M-WALLET-TEST', type: 'CREDIT_PASS',
        title: 'Workshop Flex Pass', subtitle: 'Standard Credit', status: 'ACTIVE', isTransferable: true,
        expiryDate: '2025-12-31', meta: { credits: 1, total: 1, tag: 'FLEX_CREDIT_2025' }
    },
    {
        id: 'W-CREDIT-03', userId: 'M-WALLET-TEST', type: 'CREDIT_PASS',
        title: 'Workshop Flex Pass', subtitle: 'Standard Credit', status: 'ACTIVE', isTransferable: true,
        expiryDate: '2025-12-31', meta: { credits: 1, total: 1, tag: 'FLEX_CREDIT_2025' }
    },
    {
        id: 'W-CREDIT-04', userId: 'M-WALLET-TEST', type: 'CREDIT_PASS',
        title: 'Workshop Flex Pass', subtitle: 'Standard Credit', status: 'ACTIVE', isTransferable: true,
        expiryDate: '2025-12-31', meta: { credits: 1, total: 1, tag: 'FLEX_CREDIT_2025' }
    },
    {
        id: 'W-CREDIT-05', userId: 'M-WALLET-TEST', type: 'CREDIT_PASS',
        title: 'Workshop Flex Pass', subtitle: 'Standard Credit', status: 'ACTIVE', isTransferable: true,
        expiryDate: '2025-12-31', meta: { credits: 1, total: 1, tag: 'FLEX_CREDIT_2025' }
    },

    // --- DISTINCT CREDIT (Different Expiry or Tag) ---
    {
        id: 'W-CREDIT-SPEC-01', userId: 'M-WALLET-TEST', type: 'CREDIT_PASS',
        title: 'Special DTR Pass', subtitle: 'Event Specific', status: 'ACTIVE', isTransferable: false,
        expiryDate: '2025-06-01', meta: { credits: 1, total: 1, tag: 'DTR_CREDIT' }
    },

    // --- GIFTED TICKET (Pending Claim) ---
    {
        id: 'W-TKT-GIFT-01', userId: 'M-WALLET-TEST', type: 'TICKET',
        title: 'Leadership Summit (VIP)', subtitle: 'For: Budi Santoso', status: 'GIFT_PENDING', isTransferable: true,
        expiryDate: '2025-09-01', qrData: 'TICKET:EVT-IMC-25:GIFTED',
        meta: { 
            eventId: 'EVT-IMC-25', 
            location: 'Jakarta', 
            recipientHint: 'Budi Santoso (budi@test.com)' // UI will use this
        }
    }
];
