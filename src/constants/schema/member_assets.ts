
import { ModifiedTableDef } from './types';

export const MEMBER_ASSET_TABLES: ModifiedTableDef[] = [
    {
        tableName: 'member_wallets',
        referenceRawTable: 'wallet_items',
        reasoning: "STATE TRACKING: Replaces the NoSQL 'wallet_items' collection. This table strictly tracks 'User has Tag'. It is the user's Keyring.",
        columns: [
            { name: 'id', type: 'uuid', isPk: true },
            { name: 'user_id', type: 'uuid', isFk: true, fkTarget: 'members.id' },
            { name: 'tag_id', type: 'uuid', isFk: true, fkTarget: 'master_access_tags.id' },
            { name: 'remaining_credits', type: 'integer', constraints: 'DEFAULT 0' },
            { name: 'status', type: 'varchar(20)', constraints: "DEFAULT 'ACTIVE'" },
            { name: 'expiry_date', type: 'timestamptz' },
            { name: 'source_transaction_id', type: 'uuid', isFk: true, fkTarget: 'transactions.id' },
            { name: 'is_transferable', type: 'boolean', constraints: 'DEFAULT FALSE' },
            { name: 'sponsored_by_name', type: 'varchar(255)', description: 'For gifted items (Recipient view)' },
            { name: 'metadata', type: 'jsonb', description: 'Flexible storage (e.g. { recipientHint: "Budi", recipientEmail: "..." } for sender view). "recipientName" key is used to track guest assignment.' },
            { name: 'created_at', type: 'timestamptz', constraints: 'DEFAULT NOW()' }
        ],
        sqlDefinition: `CREATE TABLE member_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES members(id),
  tag_id UUID REFERENCES master_access_tags(id),
  remaining_credits INTEGER DEFAULT 0, -- 9999 for Unlimited
  status VARCHAR(20) DEFAULT 'ACTIVE',
  expiry_date TIMESTAMPTZ,
  source_transaction_id UUID, -- Audit link to purchase
  is_transferable BOOLEAN DEFAULT FALSE,
  sponsored_by_name VARCHAR(255),
  metadata JSONB, -- Stores UI hints like recipient info for pending gifts, or guest assignment
  created_at TIMESTAMPTZ DEFAULT NOW()
);`
    },
    // New Table for Gift Allocations
    {
        tableName: 'gift_allocations',
        referenceRawTable: 'gift_allocations',
        reasoning: "TRANSFER LOGIC: Tracks temporary state of transferable assets while they are 'in flight' (generated link but not yet claimed).",
        columns: [
            { name: 'id', type: 'uuid', isPk: true },
            { name: 'source_user_id', type: 'uuid', isFk: true, fkTarget: 'members.id' },
            { name: 'wallet_item_id', type: 'uuid', isFk: true, fkTarget: 'member_wallets.id' },
            { name: 'claim_token', type: 'varchar(100)', constraints: 'UNIQUE NOT NULL' },
            { name: 'target_email', type: 'varchar(255)' },
            { name: 'status', type: 'varchar(20)', constraints: "DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CLAIMED', 'REVOKED'))" },
            { name: 'claimed_by_user_id', type: 'uuid', isFk: true, fkTarget: 'members.id' },
            { name: 'claimed_at', type: 'timestamptz' },
            { name: 'created_at', type: 'timestamptz', constraints: 'DEFAULT NOW()' }
        ],
        sqlDefinition: `CREATE TABLE gift_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_user_id UUID REFERENCES members(id),
  wallet_item_id UUID REFERENCES member_wallets(id),
  claim_token VARCHAR(100) UNIQUE NOT NULL,
  target_email VARCHAR(255),
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CLAIMED', 'REVOKED')),
  claimed_by_user_id UUID REFERENCES members(id),
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`
    }
];
