
import { Member, Transaction, Event } from '../../types/index';

const DB_NAME = 'MAXWELL_DEV_SANDBOX_V1';
const DB_VERSION = 26; // Add offline_checkin_queue for gate scanner sync

export const DevDatabase = {

    open: (): Promise<IDBDatabase> => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                const oldVersion = event.oldVersion;

                if (oldVersion < 23 && db.objectStoreNames.contains('commission_rules')) {
                    db.deleteObjectStore('commission_rules');
                }

                if (oldVersion < 24) {
                    if (db.objectStoreNames.contains('ops_checklists')) {
                        db.deleteObjectStore('ops_checklists');
                    }
                    if (db.objectStoreNames.contains('ops_templates')) {
                        db.deleteObjectStore('ops_templates');
                    }
                }

                if (oldVersion < 25 && db.objectStoreNames.contains('youth_metrics')) {
                    db.deleteObjectStore('youth_metrics');
                }

                if (oldVersion < 26 && !db.objectStoreNames.contains('offline_checkin_queue')) {
                    db.createObjectStore('offline_checkin_queue', { keyPath: 'id' });
                }

                // --- CORE STORES ---
                if (!db.objectStoreNames.contains('members')) db.createObjectStore('members', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('transactions')) db.createObjectStore('transactions', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('events')) db.createObjectStore('events', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('products')) db.createObjectStore('products', { keyPath: 'id' });

                // --- OPS (workflows: Postgres via Nest; default domain mode is API when API_BASE_URL set) ---
                if (!db.objectStoreNames.contains('inventory')) db.createObjectStore('inventory', { keyPath: 'sku' });
                if (!db.objectStoreNames.contains('inventory_transactions')) db.createObjectStore('inventory_transactions', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('event_invitations')) db.createObjectStore('event_invitations', { keyPath: 'id' });

                // --- ACCESS ---
                if (!db.objectStoreNames.contains('user_entitlements')) db.createObjectStore('user_entitlements', { keyPath: 'userId' });
                if (!db.objectStoreNames.contains('gift_allocations')) db.createObjectStore('gift_allocations', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('wallet_items')) db.createObjectStore('wallet_items', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('credit_tags')) db.createObjectStore('credit_tags', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('wallet_transactions')) db.createObjectStore('wallet_transactions', { keyPath: 'id' });

                // --- MARKETING ---
                if (!db.objectStoreNames.contains('campaigns')) db.createObjectStore('campaigns', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('discount_redemption_logs')) db.createObjectStore('discount_redemption_logs', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('pricing_rules')) db.createObjectStore('pricing_rules', { keyPath: 'id' });

                // --- INTELLIGENCE ---
                if (!db.objectStoreNames.contains('ai_usage_logs')) db.createObjectStore('ai_usage_logs', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('research_results')) db.createObjectStore('research_results', { keyPath: 'memberId' });
                if (!db.objectStoreNames.contains('support_tickets')) db.createObjectStore('support_tickets', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('member_activity_logs')) db.createObjectStore('member_activity_logs', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('mentor_personas')) db.createObjectStore('mentor_personas', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('mentoring_sessions')) db.createObjectStore('mentoring_sessions', { keyPath: 'id' });

                // --- GAMIFICATION ---
                if (!db.objectStoreNames.contains('gamification_profiles')) db.createObjectStore('gamification_profiles', { keyPath: 'userId' });
                if (!db.objectStoreNames.contains('gamification_badges')) db.createObjectStore('gamification_badges', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('gamification_rules')) db.createObjectStore('gamification_rules', { keyPath: 'id' });

                // --- COMMERCE & FINANCE ---
                if (!db.objectStoreNames.contains('payment_transactions')) db.createObjectStore('payment_transactions', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('tax_invoices')) db.createObjectStore('tax_invoices', { keyPath: 'transactionId' });
                if (!db.objectStoreNames.contains('royalty_splits')) db.createObjectStore('royalty_splits', { keyPath: 'sourceTransactionId' });
                if (!db.objectStoreNames.contains('royalty_contracts')) db.createObjectStore('royalty_contracts', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('payout_transactions')) db.createObjectStore('payout_transactions', { keyPath: 'id' });

                // --- COMMUNICATION ---
                if (!db.objectStoreNames.contains('cms_content')) db.createObjectStore('cms_content', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('email_campaigns')) db.createObjectStore('email_campaigns', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('email_templates')) db.createObjectStore('email_templates', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('email_logs')) db.createObjectStore('email_logs', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('whatsapp_task_queue')) db.createObjectStore('whatsapp_task_queue', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('whatsapp_templates')) db.createObjectStore('whatsapp_templates', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('sys_pdf_templates')) db.createObjectStore('sys_pdf_templates', { keyPath: 'id' });

                // --- SYSTEM & OTHER ---
                if (!db.objectStoreNames.contains('tribe_mentoring_sessions')) db.createObjectStore('tribe_mentoring_sessions', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('lead_scout_conversations')) db.createObjectStore('lead_scout_conversations', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('contract_templates')) db.createObjectStore('contract_templates', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('contract_instances')) db.createObjectStore('contract_instances', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('contract_master_catalog')) db.createObjectStore('contract_master_catalog', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('enablement_articles')) db.createObjectStore('enablement_articles', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('enablement_quizzes')) db.createObjectStore('enablement_quizzes', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('enablement_quiz_attempts')) db.createObjectStore('enablement_quiz_attempts', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('sys_internal_users')) db.createObjectStore('sys_internal_users', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('active_shopping_carts')) db.createObjectStore('active_shopping_carts', { keyPath: 'sessionId' });
                if (!db.objectStoreNames.contains('event_attendance_ledger')) db.createObjectStore('event_attendance_ledger', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('offline_checkin_queue')) db.createObjectStore('offline_checkin_queue', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('system_security_logs')) db.createObjectStore('system_security_logs', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('system_background_jobs')) db.createObjectStore('system_background_jobs', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('system_settings')) db.createObjectStore('system_settings', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('round_table_sessions')) db.createObjectStore('round_table_sessions', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('corporate_members')) db.createObjectStore('corporate_members', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('ref_master_tiers')) db.createObjectStore('ref_master_tiers', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('certification_rules')) db.createObjectStore('certification_rules', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('master_done_tags')) db.createObjectStore('master_done_tags', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('schema_optimizations')) db.createObjectStore('schema_optimizations', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('auth_roles')) db.createObjectStore('auth_roles', { keyPath: 'id' });
            };

            request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
            request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);
        });
    },

    getStoreNames: async (): Promise<string[]> => {
        const db = await DevDatabase.open();
        return Array.from(db.objectStoreNames);
    },

    getAll: async <T>(storeName: string): Promise<T[]> => {
        const db = await DevDatabase.open();
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction(storeName, 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result as T[]);
                request.onerror = () => reject(request.error);
            } catch (e) { resolve([]); }
        });
    },

    add: async (storeName: string, item: any): Promise<void> => {
        const db = await DevDatabase.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(item);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    delete: async (storeName: string, key: string | number): Promise<void> => {
        const db = await DevDatabase.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    bulkAdd: async (storeName: string, items: any[]): Promise<void> => {
        const db = await DevDatabase.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            items.forEach(item => store.put(item));
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    },

    clear: async (storeName: string): Promise<void> => {
        const db = await DevDatabase.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    isEmpty: async (storeName: string): Promise<boolean> => {
        const db = await DevDatabase.open();
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction(storeName, 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.count();
                request.onsuccess = () => resolve(request.result === 0);
                request.onerror = () => reject(request.error);
            } catch (e) { resolve(true); }
        });
    }
};
