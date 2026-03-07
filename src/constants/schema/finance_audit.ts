
import { ModifiedTableDef } from './types';

export const FINANCE_AUDIT_TABLES: ModifiedTableDef[] = [
    {
        tableName: 'wallet_transactions',
        referenceRawTable: 'event_attendance_ledger',
        reasoning: "AUDIT LEDGER: Financial integrity for Credits. We never update 'member_wallets' balance without inserting a record here first. Tracks every Credit earned (Purchase) or burned (Scan).",
        columns: [
            { name: 'id', type: 'uuid', isPk: true },
            { name: 'wallet_id', type: 'uuid', isFk: true, fkTarget: 'member_wallets.id' },
            { name: 'transaction_type', type: 'varchar(20)', constraints: "CHECK (type IN ('ADD', 'USAGE', 'EXPIRY'))" },
            { name: 'amount', type: 'integer', constraints: 'NOT NULL' },
            { name: 'reference_id', type: 'uuid', description: 'Link to Sales or Attendance' },
            { name: 'notes', type: 'text' },
            { name: 'created_at', type: 'timestamptz', constraints: 'DEFAULT NOW()' }
        ],
        sqlDefinition: `CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES member_wallets(id),
  transaction_type VARCHAR(20) CHECK (transaction_type IN ('CREDIT_ADD', 'USAGE', 'EXPIRY', 'REVOKE')),
  amount INTEGER NOT NULL, -- Positive for add, Negative for usage
  reference_id UUID, -- Link to Sales Transaction OR Attendance Log
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`
    }
];
