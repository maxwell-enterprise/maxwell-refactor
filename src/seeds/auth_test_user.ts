
import { Member } from '../types/index';
import { WalletItem } from '../types/access';

// 1. A Specific Test User for Wallet Verification
export const AUTH_TEST_MEMBER: Member = {
    id: "M-WALLET-TEST",
    name: "Wallet Tester",
    email: "wallet.test@maxwell.com", // Login with this email
    phone: "628999111222",
    category: "Member",
    scholarship: false,
    joinMonth: "2025-01",
    program: "Full Access",
    mentorshipDuration: 12,
    nTagStatus: "Received",
    platform: "Digital",
    regInUS: false,
    lifecycleStage: "MEMBER",
    company: "Test Corp",
    tags: ["Test_User"]
};

// 2. Pre-filled Wallet Items for this user
export const AUTH_TEST_WALLET_ITEMS: WalletItem[] = [
    {
        id: "W-TEST-001",
        userId: "M-WALLET-TEST", // Matches the member ID
        type: "TICKET",
        title: "Test Event Ticket",
        subtitle: "VIP Access",
        status: "ACTIVE",
        isTransferable: true,
        expiryDate: "2025-12-31",
        qrData: "TICKET:TEST:M-WALLET-TEST:W-TEST-001"
    },
    {
        id: "W-TEST-002",
        userId: "M-WALLET-TEST",
        type: "CREDIT_PASS",
        title: "Test Credit Bundle",
        subtitle: "5 Credits",
        status: "ACTIVE",
        isTransferable: false,
        expiryDate: "2025-12-31",
        meta: { credits: 5, total: 5, tag: "FLEX_CREDIT_2025" }
    }
];
