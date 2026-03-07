
import { WalletTransactionHistory } from '../types/access';

export const SEED_WALLET_HISTORY: WalletTransactionHistory[] = [
    {
        id: 'HIST-001',
        walletItemId: 'GENERAL',
        userId: 'M-WALLET-TEST',
        transactionType: 'PURCHASE',
        amountChange: 1,
        balanceAfter: 0,
        referenceId: 'PO-2024-001',
        referenceName: 'Purchased: Gold Member Package',
        timestamp: new Date(Date.now() - 10000000).toISOString()
    },
    {
        id: 'HIST-002',
        walletItemId: 'W-TEST-002',
        userId: 'M-WALLET-TEST',
        transactionType: 'REDEMPTION',
        amountChange: -1,
        balanceAfter: 4,
        referenceId: 'EVT-JAN-25',
        referenceName: 'Redeemed for: Jan Monthly Meetup',
        timestamp: new Date(Date.now() - 5000000).toISOString()
    },
    {
        id: 'HIST-003',
        walletItemId: 'W-TEST-003',
        userId: 'M-WALLET-TEST',
        transactionType: 'TRANSFER_OUT',
        amountChange: -1,
        balanceAfter: 0,
        referenceId: 'GIFT-99',
        referenceName: 'Gifted to: friend@test.com',
        timestamp: new Date(Date.now() - 100000).toISOString()
    }
];
