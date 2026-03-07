
import { ModifiedTableDef } from './types';

export const OPS_EVENT_TABLES: ModifiedTableDef[] = [
    // 1. THE ANCHOR: Master Event Definition
    {
        tableName: 'master_events',
        referenceRawTable: 'events',
        reasoning: "HIERARCHY UPDATE: Implements 'SOLO', 'CONTAINER', 'SESSION' types. Added 'selection_config' for Option Containers.",
        columns: [
            { name: 'id', type: 'uuid', isPk: true, constraints: 'DEFAULT gen_random_uuid()' },
            { name: 'parent_event_id', type: 'uuid', isFk: true, fkTarget: 'master_events.id', description: 'For Session -> Container hierarchy' },
            { name: 'name', type: 'varchar(255)', constraints: 'NOT NULL' },
            { name: 'description', type: 'text' },
            { name: 'banner_url', type: 'varchar(500)' },
            
            // TIMING
            { name: 'start_time', type: 'timestamptz', constraints: 'NOT NULL' },
            { name: 'end_time', type: 'timestamptz' },
            { name: 'booking_start', type: 'timestamptz' },
            { name: 'booking_end', type: 'timestamptz' },
            { name: 'grace_period_minutes', type: 'integer', constraints: 'DEFAULT 30' },

            // LOCATION (HYBRID)
            { name: 'location_mode', type: 'varchar(20)', constraints: "CHECK (location_mode IN ('OFFLINE', 'ONLINE', 'HYBRID'))" },
            { name: 'location_name', type: 'varchar(255)' },
            { name: 'location_map_link', type: 'text' },
            { name: 'online_meeting_link', type: 'text' },
            
            // CONFIG
            { name: 'type', type: 'varchar(20)', constraints: "CHECK (type IN ('SOLO', 'CONTAINER', 'SESSION'))" },
            { name: 'status', type: 'varchar(20)', constraints: "DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED'))" },
            { name: 'admission_policy', type: 'varchar(50)', constraints: "DEFAULT 'PRE_BOOKED' CHECK (admission_policy IN ('PRE_BOOKED', 'OPEN_MEMBER', 'OPEN_PUBLIC', 'ON_SITE_DEDUCTION', 'INVITED_ONLY'))" },
            { name: 'completion_tag_id', type: 'varchar(50)', description: 'Done Tag granted on attendance' },
            
            { name: 'is_recurring', type: 'boolean', constraints: 'DEFAULT FALSE' },
            { name: 'recurrence_pattern', type: 'jsonb', description: '{freq: WEEKLY, day: MON}' },

            // NEW: Selection Config for Option Containers
            { name: 'selection_config', type: 'jsonb', description: '{mode: "OPTION", minSelect: 1, maxSelect: 3}' },

            { name: 'created_at', type: 'timestamptz', constraints: 'DEFAULT NOW()' },
            { name: 'updated_at', type: 'timestamptz', constraints: 'DEFAULT NOW()' }
        ],
        sqlDefinition: `CREATE TABLE master_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_event_id UUID REFERENCES master_events(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  banner_url VARCHAR(500),
  
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  booking_start TIMESTAMPTZ,
  booking_end TIMESTAMPTZ,
  grace_period_minutes INTEGER DEFAULT 30,

  location_mode VARCHAR(20) CHECK (location_mode IN ('OFFLINE', 'ONLINE', 'HYBRID')),
  location_name VARCHAR(255),
  location_map_link TEXT,
  online_meeting_link TEXT,

  type VARCHAR(20) CHECK (type IN ('SOLO', 'CONTAINER', 'SESSION')),
  status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED')),
  admission_policy VARCHAR(50) DEFAULT 'PRE_BOOKED',
  completion_tag_id VARCHAR(50),
  
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern JSONB,
  selection_config JSONB, -- Stores {mode, minSelect, maxSelect}

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`
    },
    
    // NEW: EVENT INVITATIONS (Internal Members)
    {
        tableName: 'event_invitations',
        referenceRawTable: 'event_invitations',
        reasoning: "INVITATION LOGIC: Manages invites for existing Members. 'claim_wallet_id' links to the generated ticket upon acceptance for audit trail.",
        columns: [
            { name: 'id', type: 'uuid', isPk: true, constraints: 'DEFAULT gen_random_uuid()' },
            { name: 'event_id', type: 'uuid', isFk: true, fkTarget: 'master_events.id', constraints: 'ON DELETE CASCADE' },
            { name: 'tier_id', type: 'uuid', isFk: true, fkTarget: 'event_tiers.id', description: 'The specific ticket type offered' },
            { name: 'member_id', type: 'uuid', isFk: true, fkTarget: 'members.id', constraints: 'ON DELETE CASCADE' },
            { name: 'status', type: 'varchar(20)', constraints: "DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED'))" },
            { name: 'valid_until', type: 'timestamptz', constraints: 'NOT NULL' },
            { name: 'claim_wallet_id', type: 'uuid', isFk: true, fkTarget: 'member_wallets.id', description: 'ID of ticket generated if accepted' },
            { name: 'sent_at', type: 'timestamptz', constraints: 'DEFAULT NOW()' },
            { name: 'sent_by', type: 'uuid', isFk: true, fkTarget: 'sys_internal_users.id' }
        ],
        sqlDefinition: `CREATE TABLE event_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES master_events(id) ON DELETE CASCADE,
  tier_id UUID REFERENCES event_tiers(id), 
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED')),
  valid_until TIMESTAMPTZ NOT NULL,
  claim_wallet_id UUID REFERENCES member_wallets(id), -- Null until accepted
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  sent_by UUID REFERENCES sys_internal_users(id)
);`
    },

    // 2. THE INVENTORY: Event Tiers (Ticket Types)
    {
        tableName: 'event_tiers',
        referenceRawTable: 'events', 
        reasoning: "INVENTORY SEPARATION: Allows precise quota management per ticket type (VIP, Reg, Early Bird).",
        columns: [
            { name: 'id', type: 'uuid', isPk: true, constraints: 'DEFAULT gen_random_uuid()' },
            { name: 'event_id', type: 'uuid', isFk: true, fkTarget: 'master_events.id', constraints: 'ON DELETE CASCADE' },
            { name: 'name', type: 'varchar(100)', constraints: 'NOT NULL' },
            { name: 'price', type: 'decimal(12,2)', constraints: 'DEFAULT 0' },
            { name: 'quota_total', type: 'integer', constraints: 'NOT NULL' },
            { name: 'quota_sold', type: 'integer', constraints: 'DEFAULT 0' },
            { name: 'is_active', type: 'boolean', constraints: 'DEFAULT TRUE' }
        ],
        sqlDefinition: `CREATE TABLE event_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES master_events(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL, -- e.g. "VIP Early Bird"
  price DECIMAL(12,2) DEFAULT 0,
  quota_total INTEGER NOT NULL,
  quota_sold INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);`
    },

    // 2b. TIER GRANTS (Junction Table for M:N Tags)
    {
        tableName: 'event_tier_grants',
        referenceRawTable: 'events', 
        reasoning: "GRANT LOGIC: This is the 'Granted By' table. It defines which Tags (Keys) are issued when a specific Ticket Tier is purchased.",
        columns: [
            { name: 'tier_id', type: 'uuid', isPk: true, isFk: true, fkTarget: 'event_tiers.id', constraints: 'ON DELETE CASCADE' },
            { name: 'tag_id', type: 'uuid', isPk: true, isFk: true, fkTarget: 'master_access_tags.id', constraints: 'ON DELETE CASCADE' }
        ],
        sqlDefinition: `CREATE TABLE event_tier_grants (
  tier_id UUID REFERENCES event_tiers(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES master_access_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (tier_id, tag_id)
);`
    },

    // 3. THE LOGIC: Access Rules (Lock & Key Config)
    {
        tableName: 'event_access_rules',
        referenceRawTable: 'events',
        reasoning: "REQUIREMENT LOGIC: This is the 'Required By' table. Decouples 'Event' from 'Tags'. Defines which Tags (Keys) are REQUIRED to enter this Event.",
        columns: [
            { name: 'id', type: 'uuid', isPk: true },
            { name: 'event_id', type: 'uuid', isFk: true, fkTarget: 'master_events.id', constraints: 'ON DELETE CASCADE' },
            { name: 'tag_id', type: 'uuid', isFk: true, fkTarget: 'master_access_tags.id' },
            { name: 'rule_type', type: 'varchar(20)', constraints: "DEFAULT 'REQUIRED' CHECK (rule_type IN ('REQUIRED', 'OPTIONAL', 'BLACKLIST'))" },
            { name: 'priority', type: 'integer', constraints: 'DEFAULT 0' }
        ],
        sqlDefinition: `CREATE TABLE event_access_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES master_events(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES master_access_tags(id),
  rule_type VARCHAR(20) DEFAULT 'REQUIRED', 
  priority INTEGER DEFAULT 0,
  UNIQUE(event_id, tag_id)
);`
    },

    // 4. THE PHYSICAL LAYER: Gates (Scanner Config)
    {
        tableName: 'event_gates',
        referenceRawTable: 'events',
        reasoning: "OPERATIONAL CONFIG: Defines physical entry points. Critical for the Scanner App to know which 'Allowed Tiers' are valid at this specific gate.",
        columns: [
            { name: 'id', type: 'uuid', isPk: true },
            { name: 'event_id', type: 'uuid', isFk: true, fkTarget: 'master_events.id', constraints: 'ON DELETE CASCADE' },
            { name: 'name', type: 'varchar(100)', constraints: 'NOT NULL' },
            { name: 'allowed_tier_ids', type: 'jsonb', description: 'Array of Tier IDs allowed here' },
            { name: 'assigned_staff_ids', type: 'jsonb', description: 'Array of User IDs (Gatekeepers)' },
            { name: 'is_active', type: 'boolean', constraints: 'DEFAULT TRUE' }
        ],
        sqlDefinition: `CREATE TABLE event_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES master_events(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL, -- e.g. "North Entrance VIP"
  allowed_tier_ids JSONB, -- Array of UUIDs from event_tiers
  assigned_staff_ids JSONB, -- Array of UUIDs from sys_internal_users
  is_active BOOLEAN DEFAULT TRUE
);`
    },

    // 5. THE PRE-GAME: Guest Lists / RSVPs (External)
    {
        tableName: 'event_guest_lists',
        referenceRawTable: 'members', 
        reasoning: "EXTERNAL GUEST MANAGEMENT: Handles RSVPs for non-members or bulk uploads. Separated from internal 'event_invitations' to allow messier data (names without IDs).",
        columns: [
            { name: 'id', type: 'uuid', isPk: true },
            { name: 'event_id', type: 'uuid', isFk: true, fkTarget: 'master_events.id' },
            { name: 'guest_name', type: 'varchar(255)', constraints: 'NOT NULL' },
            { name: 'guest_email', type: 'varchar(255)' },
            { name: 'guest_phone', type: 'varchar(50)' },
            { name: 'rsvp_status', type: 'varchar(20)', constraints: "DEFAULT 'PENDING' CHECK (rsvp_status IN ('PENDING','ACCEPTED','DECLINED','WAITLIST'))" },
            { name: 'inviter_member_id', type: 'uuid', isFk: true, fkTarget: 'members.id', description: 'If invited by a member' },
            { name: 'created_at', type: 'timestamptz', constraints: 'DEFAULT NOW()' }
        ],
        sqlDefinition: `CREATE TABLE event_guest_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES master_events(id) ON DELETE CASCADE,
  guest_name VARCHAR(255) NOT NULL,
  guest_email VARCHAR(255),
  guest_phone VARCHAR(50),
  rsvp_status VARCHAR(20) DEFAULT 'PENDING',
  inviter_member_id UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);`
    },

    // 6. THE EXECUTION: Attendance Ledger
    {
        tableName: 'event_attendance_ledger',
        referenceRawTable: 'event_attendance_ledger',
        reasoning: "AUDIT LOG: Immutable record of entry. Links specific Wallet Item usage to a specific Gate and Time.",
        columns: [
            { name: 'id', type: 'uuid', isPk: true },
            { name: 'event_id', type: 'uuid', isFk: true, fkTarget: 'master_events.id' },
            { name: 'gate_id', type: 'uuid', isFk: true, fkTarget: 'event_gates.id' },
            { name: 'wallet_item_id', type: 'uuid', isFk: true, fkTarget: 'member_wallets.id', description: 'The specific ticket OR credit pass used' },
            { name: 'scanned_at', type: 'timestamptz', constraints: 'NOT NULL' },
            { name: 'scanned_by_user_id', type: 'uuid', isFk: true, fkTarget: 'sys_internal_users.id' },
            { name: 'scan_result', type: 'varchar(20)', constraints: "DEFAULT 'SUCCESS'" },
            { name: 'is_offline_sync', type: 'boolean', constraints: 'DEFAULT FALSE' }
        ],
        sqlDefinition: `CREATE TABLE event_attendance_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES master_events(id),
  gate_id UUID REFERENCES event_gates(id),
  wallet_item_id UUID REFERENCES member_wallets(id),
  scanned_at TIMESTAMPTZ NOT NULL,
  scanned_by_user_id UUID REFERENCES sys_internal_users(id),
  scan_result VARCHAR(20) DEFAULT 'SUCCESS',
  is_offline_sync BOOLEAN DEFAULT FALSE
);`
    }
];
