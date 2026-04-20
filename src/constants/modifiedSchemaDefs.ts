
import { ModifiedTableDef } from './schema/types';

export const MODIFIED_SCHEMA_DEFS: ModifiedTableDef[] = [
    // --- CORE & IAM ---
    {
        tableName: 'sys_internal_users',
        referenceRawTable: 'sys_internal_users',
        reasoning: "Internal staff identity management with RBAC.",
        sqlDefinition: "CREATE TABLE sys_internal_users (id UUID PRIMARY KEY, email TEXT UNIQUE, role_id UUID, full_name TEXT);",
        columns: [{name: 'id', type: 'uuid', isPk: true}, {name: 'email', type: 'text'}, {name: 'role_id', type: 'uuid', isFk: true}]
    },
    // --- FINANCE & COMMERCE ---
    {
        tableName: 'transactions',
        referenceRawTable: 'transactions',
        reasoning: "Primary ledger for all financial transactions (PO, expense, sales).",
        sqlDefinition: "CREATE TABLE transactions (id UUID PRIMARY KEY, member_id UUID, amount DECIMAL, status TEXT, type TEXT);",
        columns: [{name: 'id', type: 'uuid', isPk: true}, {name: 'member_id', type: 'uuid', isFk: true}]
    },
    {
        tableName: 'payment_transactions',
        referenceRawTable: 'payment_transactions',
        reasoning: "Payment gateway detail log and automated reconciliation.",
        sqlDefinition: "CREATE TABLE payment_transactions (id UUID PRIMARY KEY, order_id TEXT, amount DECIMAL, method TEXT, status TEXT);",
        columns: [{name: 'id', type: 'uuid', isPk: true}]
    },
    // --- OPS & LOGISTICS ---
    {
        tableName: 'master_events',
        referenceRawTable: 'events',
        reasoning: "Definition of a lock or secured resource; supports series–session hierarchy.",
        sqlDefinition: "CREATE TABLE master_events (id UUID PRIMARY KEY, parent_id UUID, name TEXT, admission_policy TEXT);",
        columns: [{name: 'id', type: 'uuid', isPk: true}]
    },
    // --- CRM & SALES ---
    {
        tableName: 'members',
        referenceRawTable: 'members',
        reasoning: "Primary participant database with lifecycle stage tracking.",
        sqlDefinition: "CREATE TABLE members (id UUID PRIMARY KEY, full_name TEXT, email TEXT UNIQUE, lifecycle_stage TEXT);",
        columns: [{name: 'id', type: 'uuid', isPk: true}]
    },
    // --- ENGAGEMENT & ASSETS ---
    {
        tableName: 'member_wallets',
        referenceRawTable: 'wallet_items',
        reasoning: "Digital wallet storing member keys (tags/tickets).",
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
        reasoning: "Audit trail for ticket transfers between members; preserves ownership integrity.",
        sqlDefinition: "CREATE TABLE gift_allocations (id UUID PRIMARY KEY, source_id UUID, target_email TEXT, wallet_item_id UUID, status TEXT);",
        columns: [
            {name: 'id', type: 'uuid', isPk: true},
            {name: 'source_id', type: 'uuid', isFk: true, fkTarget: 'members.id'},
            {name: 'wallet_item_id', type: 'uuid', isFk: true, fkTarget: 'member_wallets.id'}
        ]
    }
];
