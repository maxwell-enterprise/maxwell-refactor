
import { WalletItem, GiftAllocation } from '../types/access';

// --- TRANSFER TESTING DATA ---

// 1. Initial Wallet Items for Sponsor (User A)
export const SEED_TRANSFER_WALLET: WalletItem[] = [
    {
        id: 'W-SPONSOR-1',
        userId: 'user-1', // Assuming user-1 is current user (Sponsor)
        type: 'TICKET',
        title: 'Leadership Summit 2025 (VIP)',
        subtitle: 'VIP Access',
        status: 'ACTIVE',
        isTransferable: true,
        qrData: 'TICKET:EVT-25-IMC:user-1:W-SPONSOR-1',
        expiryDate: '2025-09-01',
        meta: { eventId: 'EVT-25-IMC', location: 'Grand Ballroom' }
    },
    {
        id: 'W-SPONSOR-2',
        userId: 'user-1', 
        type: 'TICKET',
        title: 'Networking Dinner',
        subtitle: 'Standard Access',
        status: 'ACTIVE',
        isTransferable: true,
        qrData: 'TICKET:EVT-DIN:user-1:W-SPONSOR-2',
        expiryDate: '2025-09-01',
        meta: { eventId: 'EVT-DIN', location: 'Rooftop Lounge' }
    }
];

// 2. Pre-generated Gift for Redemption Testing (Code: GIFT-TEST-2025)
// This simulates a scenario where User B sent a gift to User A, and User A has the code but hasn't claimed it.
// To test: Go to Wallet -> Redeem Code -> Type "GIFT-TEST-2025"
export const SEED_TRANSFER_ALLOCATIONS: GiftAllocation[] = [
    {
        id: 'GA-TEST-001',
        sourceUserId: 'corp-manager-1',
        sourceUserName: 'Corporate Sponsor',
        entitlementId: 'W-HIDDEN-ITEM-99', // This item logic would need to exist in DB, handled by mock check
        itemName: 'Corporate Gift: Masterclass Pass',
        claimToken: 'GIFT-TEST-2025',
        status: 'PENDING',
        createdAt: new Date().toISOString()
    }
];

// Hidden item that belongs to the allocation above (for mock logic to find it)
export const HIDDEN_WALLET_ITEM: WalletItem = {
    id: 'W-HIDDEN-ITEM-99',
    userId: 'corp-manager-1',
    type: 'CREDIT_PASS',
    title: 'Masterclass Bundle (Gift)',
    subtitle: '5 Credits',
    status: 'GIFT_PENDING',
    isTransferable: true,
    expiryDate: '2025-12-31',
    meta: { credits: 5, total: 5 }
};
