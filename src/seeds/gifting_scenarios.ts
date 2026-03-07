
import { WalletItem, GiftAllocation } from '../types/access';
import { UserProfile } from '../types/index';

// 1. Users involved in the scenario
export const GIFTING_USERS: UserProfile[] = [
    { 
        id: 'u-sponsor', 
        fullName: 'Sponsor Manager', 
        email: 'sponsor@corp.com', 
        role: 'MEMBER' as any, 
        provider: 'email',
        avatarUrl: 'https://ui-avatars.com/api/?name=Sponsor+Manager'
    },
    { 
        id: 'u-recipient-pending', 
        fullName: 'Pending Recipient', 
        email: 'pending@corp.com', 
        role: 'MEMBER' as any, 
        provider: 'email'
    },
    { 
        id: 'u-recipient-claimed', 
        fullName: 'Claimed User', 
        email: 'claimed@corp.com', 
        role: 'MEMBER' as any, 
        provider: 'email'
    }
];

// 2. Wallet Items for Sponsor (Initial State)
export const GIFTING_WALLET_ITEMS: WalletItem[] = [
    // Item 1: Active, Transferable (Can be gifted)
    {
        id: 'W-G1',
        userId: 'u-sponsor',
        type: 'TICKET',
        title: 'Leadership Seminar 2025',
        subtitle: 'General Admission',
        status: 'ACTIVE',
        isTransferable: true,
        expiryDate: '2025-12-31',
        qrData: 'TICKET:EVT-2025:W-G1'
    },
    // Item 2: Pending Claim (Already gifted link generated)
    {
        id: 'W-G2',
        userId: 'u-sponsor',
        type: 'TICKET',
        title: 'Leadership Seminar 2025',
        subtitle: 'General Admission',
        status: 'GIFT_PENDING',
        isTransferable: true,
        expiryDate: '2025-12-31',
        qrData: 'TICKET:EVT-2025:W-G2'
    },
    // Item 3: Non-Transferable (Cannot be gifted)
    {
        id: 'W-G3',
        userId: 'u-sponsor',
        type: 'TICKET',
        title: 'Exclusive Dinner',
        subtitle: 'Personal Invitation',
        status: 'ACTIVE',
        isTransferable: false,
        expiryDate: '2025-12-31',
        qrData: 'TICKET:EVT-DIN:W-G3'
    },
    // Item 4: Already Claimed by User C (Transferred)
    {
        id: 'W-G4',
        userId: 'u-recipient-claimed', // Ownership moved
        type: 'TICKET',
        title: 'Leadership Seminar 2025',
        subtitle: 'General Admission',
        status: 'ACTIVE',
        isTransferable: true,
        expiryDate: '2025-12-31',
        qrData: 'TICKET:EVT-2025:W-G4:CLAIMED',
        sponsoredBy: 'Sponsor Manager'
    }
];

// 3. Gift Allocations (Tracking)
export const GIFTING_ALLOCATIONS: GiftAllocation[] = [
    // Allocation for W-G2 (Pending)
    {
        id: 'GA-1',
        sourceUserId: 'u-sponsor',
        sourceUserName: 'Sponsor Manager',
        entitlementId: 'W-G2',
        itemName: 'Leadership Seminar 2025',
        claimToken: 'TOKEN-PENDING-123',
        status: 'PENDING',
        createdAt: new Date().toISOString()
    },
    // Allocation for W-G4 (Claimed)
    {
        id: 'GA-2',
        sourceUserId: 'u-sponsor',
        sourceUserName: 'Sponsor Manager',
        entitlementId: 'W-G4',
        itemName: 'Leadership Seminar 2025',
        claimToken: 'TOKEN-CLAIMED-456',
        status: 'CLAIMED',
        claimedByUserId: 'u-recipient-claimed',
        claimedAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 86400000).toISOString()
    }
];
