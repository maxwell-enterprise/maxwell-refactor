
import { ModifiedTableDef } from './schema/types';

export const MODIFIED_SCHEMA_DEFS: ModifiedTableDef[] = [
    // --- CORE & IAM ---
    {
        tableName: 'sys_internal_users',
        referenceRawTable: 'sys_internal_users',
        reasoning: "Manajemen identitas staf internal dengan RBAC.",
        sqlDefinition: "CREATE TABLE sys_internal_users (id UUID PRIMARY KEY, email TEXT UNIQUE, role_id UUID, full_name TEXT);",
        columns: [{name: 'id', type: 'uuid', isPk: true}, {name: 'email', type: 'text'}, {name: 'role_id', type: 'uuid', isFk: true}]
    },
    // --- FINANCE & COMMERCE ---
    {
        tableName: 'transactions',
        referenceRawTable: 'transactions',
        reasoning: "Ledger utama untuk semua transaksi finansial (PO, Expense, Sales).",
        sqlDefinition: "CREATE TABLE transactions (id UUID PRIMARY KEY, member_id UUID, amount DECIMAL, status TEXT, type TEXT);",
        columns: [{name: 'id', type: 'uuid', isPk: true}, {name: 'member_id', type: 'uuid', isFk: true}]
    },
    {
        tableName: 'payment_transactions',
        referenceRawTable: 'payment_transactions',
        reasoning: "Log detail gateway pembayaran dan rekonsiliasi otomatis.",
        sqlDefinition: "CREATE TABLE payment_transactions (id UUID PRIMARY KEY, order_id TEXT, amount DECIMAL, method TEXT, status TEXT);",
        columns: [{name: 'id', type: 'uuid', isPk: true}]
    },
    // --- OPS & LOGISTICS ---
    {
        tableName: 'master_events',
        referenceRawTable: 'events',
        reasoning: "Definisi 'Lock' atau secured resource. Mendukung hierarki Series-Session.",
        sqlDefinition: "CREATE TABLE master_events (id UUID PRIMARY KEY, parent_id UUID, name TEXT, admission_policy TEXT);",
        columns: [{name: 'id', type: 'uuid', isPk: true}]
    },
    // --- CRM & SALES ---
    {
        tableName: 'members',
        referenceRawTable: 'members',
        reasoning: "Database utama nasabah/peserta dengan tracking lifecycle stage.",
        sqlDefinition: "CREATE TABLE members (id UUID PRIMARY KEY, full_name TEXT, email TEXT UNIQUE, lifecycle_stage TEXT);",
        columns: [{name: 'id', type: 'uuid', isPk: true}]
    },
    // --- ENGAGEMENT & ASSETS ---
    {
        tableName: 'member_wallets',
        referenceRawTable: 'wallet_items',
        reasoning: "Dompet digital yang menyimpan 'Keys' (Tag/Tiket) milik member.",
        sqlDefinition: "CREATE TABLE member_wallets (id UUID PRIMARY KEY, member_id UUID REFERENCES members(id), tag_code TEXT, status TEXT, expiry_date TIMESTAMPTZ);",
        columns: [
            {name: 'id', type: 'uuid', isPk: true},
            {name: 'member_id', type: 'uuid', isFk: true, fkTarget: 'members.id'},
            {name: 'tag_code', type: 'text'},
            {name: 'status', type: 'text'},
            {name: 'expiry_date', type: 'timestamptz'}
        ]
    },
    {
        tableName: 'gift_allocations',
        referenceRawTable: 'gift_allocations',
        reasoning: "Audit trail distribusi tiket antar member. Menjamin integritas pemindahan kepemilikan.",
        sqlDefinition: "CREATE TABLE gift_allocations (id UUID PRIMARY KEY, source_id UUID, target_email TEXT, wallet_item_id UUID, status TEXT);",
        columns: [
            {name: 'id', type: 'uuid', isPk: true},
            {name: 'source_id', type: 'uuid', isFk: true, fkTarget: 'members.id'},
            {name: 'wallet_item_id', type: 'uuid', isFk: true, fkTarget: 'member_wallets.id'}
        ]
    }
];
