
import { APP_CONFIG } from '../../lib/config';
import { DevDatabase } from '../../utils/devDatabase';
import { MEMBER_DATA, EVENTS_DATA, STORE_PRODUCTS, TRANSACTIONS_DATA } from '../../constants';
import { CERT_TEST_MEMBERS, CERT_TEST_SERIES, CERT_TEST_SESSIONS } from '../../seeds/certification_test';
import { GATE_TEST_EVENT } from '../../seeds/gate_testing';
import { TIER_TEST_EVENT, TIER_TEST_PRODUCT } from '../../seeds/tier_packaging_test';
import { STANDARD_TIER_EVENT } from '../../seeds/standard_tier_event_test';
import { BROWSE_DATA_TEST_SEED } from '../../seeds/browse_data_test';
import { SERIES_CONTAINER_TEST } from '../../seeds/series_container_test';
import { POPULATED_WALLET_SEED } from '../../seeds/wallet_population';
import { DETAILED_PRODUCT_SEED } from '../../seeds/product_detail_test';
import { SEED_WALLET_HISTORY } from '../../seeds/wallet_history_test';
import { WALLET_UI_TEST_ITEMS } from '../../seeds/wallet_ui_test';
import { SEED_TEST_TAGS, SEED_TEST_TAG_EVENTS } from '../../seeds/tag_assignment_test';
import { GRANT_TEST_TAG, GRANT_TEST_EVENT } from '../../seeds/tag_grant_test';
import { DEDUCTION_TEST_EVENT, DEDUCTION_TEST_WALLET, DEDUCTION_TEST_USER_ID, DEDUCTION_TEST_TAG, DEDUCTION_TEST_PRODUCT } from '../../seeds/deduction_test';
import { INVITE_ONLY_EVENT, SEED_INVITATIONS } from '../../seeds/invitation_test';
import { OPTION_CONTAINER_EVENT, OPTION_CHILD_1, OPTION_CHILD_2, OPTION_CHILD_3, OPTION_TEST_INVITATION } from '../../seeds/option_container_test';
import { INVITATION_TIER_EVENT, INVITATION_TIER_SEED } from '../../seeds/invitation_tier_test';

export const SeedService = {
    /**
     * Runs once on app startup to ensure IndexedDB is populated with necessary mock data.
     */
    init: async () => {
        // CHECK OVERRIDE FLAG
        if (localStorage.getItem('MAXWELL_SKIP_SEED') === 'true') {
            console.log('[SeedService] Seeding skipped by user preference.');
            return;
        }

        console.log('[SeedService] Checking configuration for seeding...');

        // 1. Seed Members
        if (APP_CONFIG.DOMAINS.MEMBERS === 'MOCK') {
            if (await DevDatabase.isEmpty('members')) {
                console.log('[SeedService] Database empty. Injecting Members...');
                // Combine Standard + Test Members
                const combinedMembers = [...MEMBER_DATA, ...CERT_TEST_MEMBERS];

                // Add Deduction User if not present in main list
                if (!combinedMembers.find(m => m.id === DEDUCTION_TEST_USER_ID)) {
                    combinedMembers.push({
                        id: DEDUCTION_TEST_USER_ID,
                        name: 'Deduction Tester',
                        email: 'deduct@test.com',
                        phone: '000',
                        category: 'Member',
                        joinMonth: '2025-01',
                        program: 'Test',
                        mentorshipDuration: 0,
                        nTagStatus: 'Received',
                        platform: 'Digital',
                        regInUS: false,
                        lifecycleStage: 'MEMBER',
                        scholarship: false
                    });
                }
                await DevDatabase.bulkAdd('members', combinedMembers);
            }

            // Seed Wallet History (Only if empty)
            if (await DevDatabase.isEmpty('wallet_transactions')) {
                await DevDatabase.bulkAdd('wallet_transactions', SEED_WALLET_HISTORY);
            }
        }

        // 2. Seed Wallet Items
        if (APP_CONFIG.DOMAINS.MEMBERS === 'MOCK') {
            if (await DevDatabase.isEmpty('wallet_items')) {
                console.log('[SeedService] Database empty. Injecting Wallets...');
                const combinedWallet = [
                    ...POPULATED_WALLET_SEED,
                    ...WALLET_UI_TEST_ITEMS,
                    ...DEDUCTION_TEST_WALLET
                ];
                await DevDatabase.bulkAdd('wallet_items', combinedWallet);
            }
        }

        // 3. Seed Events (And Invitations)
        // REFACTORED: Only seed if the ENTIRE events table is empty.
        // This prevents deleted test events from reappearing on refresh.
        if (APP_CONFIG.DOMAINS.EVENTS === 'MOCK') {
            if (await DevDatabase.isEmpty('events')) {
                console.log('[SeedService] Database empty. Injecting Events...');

                const allEvents = [
                    ...EVENTS_DATA,
                    GATE_TEST_EVENT,
                    TIER_TEST_EVENT,
                    STANDARD_TIER_EVENT,
                    CERT_TEST_SERIES,
                    SERIES_CONTAINER_TEST,
                    ...CERT_TEST_SESSIONS,
                    ...SEED_TEST_TAG_EVENTS,
                    GRANT_TEST_EVENT,
                    DEDUCTION_TEST_EVENT, // Drop-In Yoga is here
                    INVITE_ONLY_EVENT,
                    OPTION_CONTAINER_EVENT,
                    OPTION_CHILD_1,
                    OPTION_CHILD_2,
                    OPTION_CHILD_3,
                    INVITATION_TIER_EVENT
                ];

                await DevDatabase.bulkAdd('events', allEvents);
            }

            // Seed Invitations (Only if empty)
            if (await DevDatabase.isEmpty('event_invitations')) {
                const invites = [...SEED_INVITATIONS, OPTION_TEST_INVITATION, ...INVITATION_TIER_SEED];
                await DevDatabase.bulkAdd('event_invitations', invites);
            }
        }

        // 4. Seed Products
        if (APP_CONFIG.DOMAINS.PRODUCTS === 'MOCK') {
            if (await DevDatabase.isEmpty('products')) {
                console.log('[SeedService] Database empty. Injecting Products...');
                const allProducts = [
                    ...STORE_PRODUCTS,
                    TIER_TEST_PRODUCT,
                    DETAILED_PRODUCT_SEED,
                    DEDUCTION_TEST_PRODUCT
                ];
                await DevDatabase.bulkAdd('products', allProducts);
            }
        }

        // 5. Seed Transactions
        if (APP_CONFIG.DOMAINS.TRANSACTIONS === 'MOCK') {
            if (await DevDatabase.isEmpty('transactions')) {
                await DevDatabase.bulkAdd('transactions', TRANSACTIONS_DATA);
            }
        }

        // 6. Seed Credit Tags
        if (APP_CONFIG.DOMAINS.OPS === 'MOCK') {
            if (await DevDatabase.isEmpty('credit_tags')) {
                // Note: SEED_CREDIT_TAGS is imported inside repositories usually,
                // but here we merge specific test tags if the repo uses this logic.
                // For now, we only inject the specific test tags if the table is empty.
                const newTags = [
                    ...SEED_TEST_TAGS,
                    GRANT_TEST_TAG,
                    DEDUCTION_TEST_TAG
                ];
                await DevDatabase.bulkAdd('credit_tags', newTags);
            }
        }

        // 7. Seed Security Logs
        if (APP_CONFIG.DOMAINS.SYSTEM === 'MOCK') {
            if (await DevDatabase.isEmpty('system_security_logs')) {
                await DevDatabase.bulkAdd('system_security_logs', BROWSE_DATA_TEST_SEED);
            }
        }

        console.log('[SeedService] Initialization Complete.');
    }
};
