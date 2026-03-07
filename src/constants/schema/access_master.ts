
import { ModifiedTableDef } from './types';

export const ACCESS_MASTER_TABLES: ModifiedTableDef[] = [
    {
        tableName: 'master_access_tags',
        referenceRawTable: 'credit_tags',
        reasoning: "TRANSFORMATION: Replaces the loose string array 'Event.creditTags'. We need a strict Master Table for 'Keys' (Tags) to manage properties like usage type (Unlimited vs Consumable) and active status centrally.",
        columns: [
            { name: 'id', type: 'uuid', isPk: true, constraints: 'DEFAULT gen_random_uuid()' },
            { name: 'code', type: 'varchar(50)', constraints: 'UNIQUE, NOT NULL' },
            { name: 'label', type: 'varchar(100)', constraints: 'NOT NULL' },
            { name: 'category', type: 'varchar(20)', constraints: "CHECK (category IN ('CORE', 'ELECTIVE', 'SPECIAL'))" },
            { name: 'usage_type', type: 'varchar(20)', constraints: "CHECK (usage_type IN ('UNLIMITED', 'CONSUMABLE'))" },
            { name: 'default_usage_limit', type: 'integer', constraints: 'DEFAULT 1' },
            { name: 'is_active', type: 'boolean', constraints: 'DEFAULT TRUE' },
            { name: 'created_at', type: 'timestamptz', constraints: 'DEFAULT NOW()' }
        ],
        sqlDefinition: `CREATE TABLE master_access_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'VIP_2025'
  label VARCHAR(100) NOT NULL,
  category VARCHAR(20) CHECK (category IN ('CORE', 'ELECTIVE', 'SPECIAL')),
  usage_type VARCHAR(20) CHECK (usage_type IN ('UNLIMITED', 'CONSUMABLE')),
  default_usage_limit INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`
    },
    // JUNCTION: Event -> Required Tags
    {
        tableName: 'event_access_rules',
        referenceRawTable: 'events',
        reasoning: "ACCESS LOGIC: Defines which tags are required to enter an event. This replaces the 'creditTags' array on the Event object with a normalized M:N relationship.",
        columns: [
             { name: 'event_id', type: 'uuid', isPk: true, isFk: true, fkTarget: 'master_events.id', constraints: 'ON DELETE CASCADE' },
             { name: 'tag_id', type: 'uuid', isPk: true, isFk: true, fkTarget: 'master_access_tags.id', constraints: 'ON DELETE CASCADE' },
             { name: 'rule_type', type: 'varchar(20)', constraints: "DEFAULT 'REQUIRED'" }
        ],
        sqlDefinition: `CREATE TABLE event_access_rules (
  event_id UUID REFERENCES master_events(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES master_access_tags(id) ON DELETE CASCADE,
  rule_type VARCHAR(20) DEFAULT 'REQUIRED', -- REQUIRED, OPTIONAL, BLACKLIST
  PRIMARY KEY (event_id, tag_id)
);`
    },
    // JUNCTION: Event Tier -> Granted Tags
    {
        tableName: 'event_tier_grants',
        referenceRawTable: 'event_tiers',
        reasoning: "ISSUANCE LOGIC: Defines which tags are given when a user purchases a specific Ticket Tier. Replaces 'grantTagIds' array in Tier definition.",
        columns: [
             { name: 'tier_id', type: 'uuid', isPk: true, isFk: true, fkTarget: 'event_tiers.id', constraints: 'ON DELETE CASCADE' },
             { name: 'tag_id', type: 'uuid', isPk: true, isFk: true, fkTarget: 'master_access_tags.id', constraints: 'ON DELETE CASCADE' }
        ],
        sqlDefinition: `CREATE TABLE event_tier_grants (
  tier_id UUID REFERENCES event_tiers(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES master_access_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (tier_id, tag_id)
);`
    }
];
