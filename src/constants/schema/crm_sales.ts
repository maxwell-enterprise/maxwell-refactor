
import { ModifiedTableDef } from './types';

export const CRM_SALES_TABLES: ModifiedTableDef[] = [
    // 1. THE ENTITY: Companies / Organizations (B2B Layer)
    {
        tableName: 'crm_companies',
        referenceRawTable: 'members', // Extracted from 'company' string in members
        reasoning: "NORMALIZATION: Moving 'company' string to a dedicated table allows B2B management. We can now track multiple members belonging to one organization ('Corporate Account') and manage contract status at the entity level.",
        columns: [
            { name: 'id', type: 'uuid', isPk: true, constraints: 'DEFAULT gen_random_uuid()' },
            { name: 'name', type: 'varchar(255)', constraints: 'NOT NULL' },
            { name: 'industry', type: 'varchar(100)' },
            { name: 'size_range', type: 'varchar(50)', description: 'e.g. 1-50, 51-200, Enterprise' },
            { name: 'website', type: 'varchar(255)' },
            { name: 'tax_id', type: 'varchar(50)', description: 'NPWP for invoicing' },
            { name: 'account_manager_id', type: 'uuid', isFk: true, fkTarget: 'sys_internal_users.id', description: 'Sales rep responsible for this account' },
            { name: 'created_at', type: 'timestamptz', constraints: 'DEFAULT NOW()' },
            { name: 'updated_at', type: 'timestamptz', constraints: 'DEFAULT NOW()' }
        ],
        sqlDefinition: `CREATE TABLE crm_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  size_range VARCHAR(50),
  website VARCHAR(255),
  tax_id VARCHAR(50), -- NPWP
  account_manager_id UUID REFERENCES sys_internal_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`
    },

    // 2. THE CORE: Members (Individuals)
    {
        tableName: 'members',
        referenceRawTable: 'members',
        reasoning: "SINGLE SOURCE OF TRUTH: This table merges User Input (Identity), Admin Input (Lifecycle), and AI Enrichment (Social Profile). We use JSONB for 'social_profile' to allow AI flexibility without frequent schema migrations.",
        columns: [
            { name: 'id', type: 'uuid', isPk: true, constraints: 'DEFAULT gen_random_uuid()' },
            { name: 'email', type: 'varchar(255)', constraints: 'UNIQUE NOT NULL' },
            { name: 'phone', type: 'varchar(50)' },
            { name: 'full_name', type: 'varchar(255)', constraints: 'NOT NULL' },
            
            // Professional Info (Searchable)
            { name: 'job_title', type: 'varchar(100)' },
            { name: 'company_name', type: 'varchar(255)', description: 'Denormalized for quick search, linked via company_id if B2B' },
            { name: 'company_id', type: 'uuid', isFk: true, fkTarget: 'crm_companies.id' },
            { name: 'linkedin_url', type: 'varchar(500)' },
            
            // Demographics
            { name: 'birth_date', type: 'date' },
            { name: 'gender', type: 'varchar(20)' },
            { name: 'city', type: 'varchar(100)' },
            { name: 'country', type: 'varchar(100)', constraints: "DEFAULT 'Indonesia'" },

            // System Status (The "State Machine")
            { name: 'lifecycle_stage', type: 'varchar(50)', constraints: "NOT NULL DEFAULT 'GUEST' CHECK (lifecycle_stage IN ('GUEST', 'IDENTIFIED', 'PARTICIPANT', 'MEMBER', 'CERTIFIED', 'FACILITATOR'))" },
            { name: 'service_level', type: 'varchar(50)', constraints: "DEFAULT 'STANDARD' CHECK (service_level IN ('STANDARD', 'VIP', 'PRESTIGE'))" },
            { name: 'join_date', type: 'date', constraints: 'DEFAULT CURRENT_DATE' },
            
            // AI & Intelligence Data (The "Enrichment" Layer)
            { name: 'social_profile', type: 'jsonb', description: 'AI Populated: { igVerified: bool, igFollowers: int, communities: string[], businessType: string }' },
            { name: 'ai_research_last_run', type: 'timestamptz', description: 'When was the last Deep Research performed?' },
            { name: 'wealth_segment', type: 'varchar(20)', description: 'AI Inferred: MASS, AFFLUENT, HNW' },
            
            // Metrics
            { name: 'engagement_score', type: 'integer', constraints: 'DEFAULT 0' },
            
            { name: 'created_at', type: 'timestamptz', constraints: 'DEFAULT NOW()' },
            { name: 'updated_at', type: 'timestamptz', constraints: 'DEFAULT NOW()' }
        ],
        sqlDefinition: `CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity (User Input)
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  full_name VARCHAR(255) NOT NULL,
  
  -- Professional (Hybrid Input)
  job_title VARCHAR(100),
  company_name VARCHAR(255),
  company_id UUID REFERENCES crm_companies(id),
  linkedin_url VARCHAR(500),
  
  -- Demographics
  birth_date DATE,
  gender VARCHAR(20),
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Indonesia',

  -- System Status (Admin Controlled)
  lifecycle_stage VARCHAR(50) NOT NULL DEFAULT 'GUEST',
  service_level VARCHAR(50) DEFAULT 'STANDARD',
  join_date DATE DEFAULT CURRENT_DATE,
  
  -- AI Enrichment Layer (Gemini Input)
  social_profile JSONB, 
  -- Example JSON: 
  -- { 
  --    "igVerified": true, 
  --    "igFollowers": 15000, 
  --    "businessType": "F&B", 
  --    "communities": ["HIPMI", "JCI"] 
  -- }
  
  ai_research_last_run TIMESTAMPTZ,
  wealth_segment VARCHAR(20), -- Inferred class

  engagement_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`
    },

    // 3. SEGMENTATION: Master Tags
    {
        tableName: 'crm_tags',
        referenceRawTable: 'members', // Implicitly from tags array
        reasoning: "MASTER DATA: Central repository for all segmentation tags. Replaces magic strings. Categories help UI filtering (e.g. 'Interests' vs 'System Flags').",
        columns: [
            { name: 'id', type: 'uuid', isPk: true, constraints: 'DEFAULT gen_random_uuid()' },
            { name: 'slug', type: 'varchar(50)', constraints: 'UNIQUE NOT NULL', description: 'Machine readable, e.g. "high_net_worth"' },
            { name: 'label', type: 'varchar(100)', constraints: 'NOT NULL' },
            { name: 'color', type: 'varchar(20)', constraints: "DEFAULT 'blue'" },
            { name: 'category', type: 'varchar(50)', constraints: "DEFAULT 'GENERAL'" }
        ],
        sqlDefinition: `CREATE TABLE crm_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  color VARCHAR(20) DEFAULT 'blue',
  category VARCHAR(50) DEFAULT 'GENERAL' -- e.g. 'AI_INFERRED', 'MANUAL', 'SYSTEM'
);`
    },

    // 4. SEGMENTATION: Member Tags (Junction)
    {
        tableName: 'crm_member_tags',
        referenceRawTable: 'members',
        reasoning: "MANY-TO-MANY: Resolves the `tags: string[]` array. Allows efficient querying like 'Find all VIPs in Jakarta'.",
        columns: [
            { name: 'member_id', type: 'uuid', isPk: true, isFk: true, fkTarget: 'members.id', constraints: 'ON DELETE CASCADE' },
            { name: 'tag_id', type: 'uuid', isPk: true, isFk: true, fkTarget: 'crm_tags.id', constraints: 'ON DELETE CASCADE' },
            { name: 'assigned_at', type: 'timestamptz', constraints: 'DEFAULT NOW()' },
            { name: 'assigned_by', type: 'uuid', isFk: true, fkTarget: 'sys_internal_users.id' }
        ],
        sqlDefinition: `CREATE TABLE crm_member_tags (
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES crm_tags(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES sys_internal_users(id),
  PRIMARY KEY (member_id, tag_id)
);`
    },

    // 5. HISTORY: Interaction Logs
    {
        tableName: 'crm_interaction_logs',
        referenceRawTable: 'members', // Replaces 'notes' field
        reasoning: "AUDIT TRAIL: Replaces the single 'notes' text field. Allows recording history of Calls, Meetings, AI Research Runs, and Emails.",
        columns: [
            { name: 'id', type: 'uuid', isPk: true, constraints: 'DEFAULT gen_random_uuid()' },
            { name: 'member_id', type: 'uuid', isFk: true, fkTarget: 'members.id', constraints: 'ON DELETE CASCADE' },
            { name: 'interaction_type', type: 'varchar(20)', constraints: "CHECK (interaction_type IN ('NOTE', 'CALL', 'MEETING', 'AI_RESEARCH', 'WHATSAPP'))" },
            { name: 'summary', type: 'text', constraints: 'NOT NULL' },
            { name: 'sentiment', type: 'varchar(20)', description: 'Positive, Neutral, Negative' },
            { name: 'created_by_user_id', type: 'uuid', isFk: true, fkTarget: 'sys_internal_users.id' },
            { name: 'created_at', type: 'timestamptz', constraints: 'DEFAULT NOW()' }
        ],
        sqlDefinition: `CREATE TABLE crm_interaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  interaction_type VARCHAR(20) CHECK (interaction_type IN ('NOTE', 'CALL', 'MEETING', 'AI_RESEARCH', 'WHATSAPP')),
  summary TEXT NOT NULL,
  sentiment VARCHAR(20),
  created_by_user_id UUID REFERENCES sys_internal_users(id), -- Null if System/AI
  created_at TIMESTAMPTZ DEFAULT NOW()
);`
    }
];
