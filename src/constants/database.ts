
import { 
    MEMBER_DATA, 
    EVENTS_DATA, 
    TRANSACTIONS_DATA, 
    STORE_PRODUCTS, 
    INVENTORY_DATA, 
    DISCOUNT_DATA, 
    MOCK_TICKETS,
    ENABLEMENT_ARTICLES,
    ENABLEMENT_QUIZZES,
    ENABLEMENT_ATTEMPTS
} from '../constants'; // Fixed: References the root constants.ts file
import { DEFAULT_ROLES } from './securityDefs';
import { AUTOMATION_CATALOG } from './opsCatalog';
import { SCROLL_TEST_DATA } from '../seeds/scroll_test_data';
import { SEED_CREDIT_TAGS } from '../seeds/credit_tags';

// IMPORT DYNAMIC DATA (Mocking the state that usually lives in services)
// In a real app, this file wouldn't exist, we'd query information_schema in SQL.

// --- NEW SQL STRUCTURE SEEDS (Optimized Relational Data) ---
const SQL_MASTER_TAGS = SEED_CREDIT_TAGS.map(t => ({
    id: t.id,
    code: t.code,
    name: t.name,
    type: t.type,
    default_credits: t.usageLimit,
    is_active: t.isActive
}));

// Normalize Events to SQL structure
const SQL_EVENTS_NORMALIZED = EVENTS_DATA.map(e => ({
    id: e.id,
    parent_event_id: e.parentEventId || null,
    name: e.name,
    type: e.type,
    start_time: e.date, // Simplification for mock
    location_name: e.location,
    admission_policy: e.admissionPolicy,
    config: JSON.stringify({ recurring: e.recurringMeta, gates: e.gates }),
    created_at: new Date().toISOString()
}));

// Create Junction Table Data (Many-to-Many)
const SQL_EVENT_ACCESS_RULES = EVENTS_DATA.flatMap(e => 
    e.creditTags.map(tag => ({
        event_id: e.id,
        tag_code: tag, // In real SQL this would be tag_id foreign key
        rule_type: 'REQUIRED'
    }))
);

// Mock Wallet Data
const SQL_MEMBER_WALLETS = [
    { id: 'W-001', user_id: 'M001', tag_id: 'TAG-001', remaining_credits: 0, status: 'ACTIVE', unique_qr_string: 'QR-001', updated_at: new Date().toISOString() },
    { id: 'W-002', user_id: 'M001', tag_id: 'TAG-003', remaining_credits: 1, status: 'ACTIVE', unique_qr_string: 'QR-002', updated_at: new Date().toISOString() }
];

// Mock Ledger
const SQL_WALLET_TRANSACTIONS = [
    { id: 'TX-W-01', wallet_id: 'W-002', type: 'PURCHASE', amount: 1, source_ref_id: 'TRX-100', created_at: '2025-01-01T10:00:00Z' },
    { id: 'TX-W-02', wallet_id: 'W-002', type: 'USAGE', amount: -1, source_ref_id: 'SCAN-99', created_at: '2025-01-15T09:30:00Z' }
];

// 1. Define the Virtual Database Structure (Static Data)
export const VIRTUAL_DB: Record<string, any[]> = {
    // --- EXISTING LEGACY TABLES (Required for UI Components) ---
    members: MEMBER_DATA,
    events: EVENTS_DATA,
    products: STORE_PRODUCTS,
    transactions: TRANSACTIONS_DATA,
    support_tickets: MOCK_TICKETS,
    inventory: INVENTORY_DATA,
    discounts: DISCOUNT_DATA,
    auth_roles: DEFAULT_ROLES,
    system_automations: AUTOMATION_CATALOG,
    enablement_articles: ENABLEMENT_ARTICLES,
    enablement_quizzes: ENABLEMENT_QUIZZES,
    enablement_quiz_attempts: ENABLEMENT_ATTEMPTS,
    ref_categories: Array.from(new Set(MEMBER_DATA.map(m => m.category))).map((c, i) => ({ id: `CAT-${i}`, name: c })),
    ref_programs: Array.from(new Set(MEMBER_DATA.map(m => m.program))).map((p, i) => ({ id: `PRG-${i}`, name: p })),
    layout_scroll_test: SCROLL_TEST_DATA,

    // --- NEW OPTIMIZED SQL TABLES (The "Lock & Key" Architecture) ---
    master_access_tags: SQL_MASTER_TAGS,
    master_events: SQL_EVENTS_NORMALIZED,
    event_access_rules: SQL_EVENT_ACCESS_RULES,
    member_wallets: SQL_MEMBER_WALLETS,
    wallet_transactions: SQL_WALLET_TRANSACTIONS,
    event_attendance_logs: [] // Empty log table structure
};

// 2. Define Explicit Descriptions (Optional, for better UI)
export const TABLE_METADATA: Record<string, string> = {
    // Legacy Descriptions
    members: "Core user data including demographics and membership status.",
    events: "Master registry of classes, summits, and series containers (Frontend View).",
    products: "E-Commerce catalog items available in the Store.",
    transactions: "Financial ledger for POs, Royalties, and Expenses (Accounting).",
    
    // NEW SQL STRUCTURE DESCRIPTIONS
    master_access_tags: "SQL CONFIG: Defines the 'Keys' (Badges/Credits) that grant access. Replaces hardcoded strings.",
    master_events: "SQL CONFIG: Normalized Event table with self-referencing hierarchy (Series -> Class).",
    event_access_rules: "SQL CONFIG: Junction table defining which Tags (Keys) unlock which Events (Locks).",
    member_wallets: "SQL TRANS: The user's keyring. Stores ownership of Tags/Credits.",
    wallet_transactions: "SQL TRANS: Audit trail of credit addition (purchase) and deduction (usage).",
    event_attendance_logs: "SQL TRANS: Final log of successful entry linked to a specific Wallet Item usage."
};
