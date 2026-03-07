
import { ModifiedTableDef } from './types';

export const IAM_SECURITY_TABLES: ModifiedTableDef[] = [
    // 1. THE ACTORS: Internal Users (Staff)
    {
        tableName: 'sys_users',
        referenceRawTable: 'sys_internal_users',
        reasoning: "INTERNAL IDENTITY: Represents staff members. In a unified auth system, this might eventually link to a central 'identities' table, but for now it stands separate from 'members' to enforce separation of concerns between Staff and Customers.",
        columns: [
            { name: 'id', type: 'uuid', isPk: true, constraints: 'DEFAULT gen_random_uuid()' },
            { name: 'email', type: 'varchar(255)', constraints: 'UNIQUE NOT NULL' },
            { name: 'full_name', type: 'varchar(255)', constraints: 'NOT NULL' },
            { name: 'avatar_url', type: 'varchar(500)' },
            { name: 'role_id', type: 'uuid', isFk: true, fkTarget: 'sys_roles.id', constraints: 'NOT NULL' },
            { name: 'linked_member_id', type: 'uuid', isFk: true, fkTarget: 'members.id', description: 'Optional link if staff is also a member' },
            { name: 'is_active', type: 'boolean', constraints: 'DEFAULT TRUE' },
            { name: 'last_login_at', type: 'timestamptz' },
            { name: 'created_at', type: 'timestamptz', constraints: 'DEFAULT NOW()' }
        ],
        sqlDefinition: `CREATE TABLE sys_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500),
  role_id UUID REFERENCES sys_roles(id) NOT NULL,
  linked_member_id UUID REFERENCES members(id), -- Connects Staff to CRM profile
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`
    },

    // 2. THE ROLES: Job Functions
    {
        tableName: 'sys_roles',
        referenceRawTable: 'auth_roles',
        reasoning: "ROLE DEFINITION: Defines the high-level job function (e.g. 'Finance Manager'). 'is_system_locked' prevents deletion of critical built-in roles.",
        columns: [
            { name: 'id', type: 'uuid', isPk: true, constraints: 'DEFAULT gen_random_uuid()' },
            { name: 'name', type: 'varchar(100)', constraints: 'UNIQUE NOT NULL' },
            { name: 'description', type: 'text' },
            { name: 'is_system_locked', type: 'boolean', constraints: 'DEFAULT FALSE' },
            { name: 'created_at', type: 'timestamptz', constraints: 'DEFAULT NOW()' }
        ],
        sqlDefinition: `CREATE TABLE sys_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  is_system_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`
    },

    // 3. THE OBJECTS: Secured Resources
    {
        tableName: 'sys_resources',
        referenceRawTable: 'auth_roles', // Extracted from keys in 'policies' JSON
        reasoning: "RESOURCE REGISTRY: A master list of what we are protecting (e.g. 'fin_invoices', 'crm_leads'). Allows dynamic addition of new features without altering table schema.",
        columns: [
            { name: 'id', type: 'varchar(50)', isPk: true, description: "Slug, e.g. 'fin_invoices'" },
            { name: 'name', type: 'varchar(100)', constraints: 'NOT NULL' },
            { name: 'category', type: 'varchar(50)', constraints: "CHECK (category IN ('FINANCE', 'CRM', 'OPS', 'SYSTEM', 'MARKETING', 'ACADEMY'))" },
            { name: 'supports_scoping', type: 'boolean', constraints: 'DEFAULT FALSE', description: 'Can this be restricted to Own/Team?' },
            { name: 'supports_limit', type: 'boolean', constraints: 'DEFAULT FALSE', description: 'Can this have a monetary limit?' }
        ],
        sqlDefinition: `CREATE TABLE sys_resources (
  id VARCHAR(50) PRIMARY KEY, -- e.g. 'fin_invoices'
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) CHECK (category IN ('FINANCE', 'CRM', 'OPS', 'SYSTEM', 'MARKETING', 'ACADEMY')),
  supports_scoping BOOLEAN DEFAULT FALSE,
  supports_limit BOOLEAN DEFAULT FALSE
);`
    },

    // 4. THE RULES: Access Policies (ABAC/RBAC Hybrid)
    {
        tableName: 'sys_policies',
        referenceRawTable: 'auth_roles', // Normalized from 'policies' JSON
        reasoning: "ABAC CORE: Connects Roles to Resources with granular attributes. Instead of just 'Can Edit', we define 'Can Edit OWN data' or 'Can Approve up to 50M'.",
        columns: [
            { name: 'id', type: 'uuid', isPk: true, constraints: 'DEFAULT gen_random_uuid()' },
            { name: 'role_id', type: 'uuid', isFk: true, fkTarget: 'sys_roles.id', constraints: 'ON DELETE CASCADE' },
            { name: 'resource_id', type: 'varchar(50)', isFk: true, fkTarget: 'sys_resources.id' },
            { name: 'access_level', type: 'varchar(20)', constraints: "CHECK (access_level IN ('NONE', 'READ', 'WRITE', 'FULL'))" },
            { name: 'scope', type: 'varchar(20)', constraints: "DEFAULT 'OWN' CHECK (scope IN ('OWN', 'TEAM', 'ALL'))" },
            { name: 'authority_limit', type: 'decimal(15,2)', description: 'Max monetary value this role can approve/manage' },
            { name: 'updated_at', type: 'timestamptz', constraints: 'DEFAULT NOW()' }
        ],
        sqlDefinition: `CREATE TABLE sys_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES sys_roles(id) ON DELETE CASCADE,
  resource_id VARCHAR(50) REFERENCES sys_resources(id),
  
  -- The "How"
  access_level VARCHAR(20) CHECK (access_level IN ('NONE', 'READ', 'WRITE', 'FULL')),
  scope VARCHAR(20) DEFAULT 'OWN' CHECK (scope IN ('OWN', 'TEAM', 'ALL')),
  authority_limit DECIMAL(15,2), -- e.g. 50,000,000
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, resource_id) -- One policy per resource per role
);`
    },

    // 5. THE AUDIT: Security Logs
    {
        tableName: 'sys_audit_logs',
        referenceRawTable: 'system_security_logs',
        reasoning: "COMPLIANCE: Immutable log of all security-critical actions. 'actor_user_id' links to the specific staff member who performed the action.",
        columns: [
            { name: 'id', type: 'uuid', isPk: true, constraints: 'DEFAULT gen_random_uuid()' },
            { name: 'timestamp', type: 'timestamptz', constraints: 'DEFAULT NOW()' },
            { name: 'actor_user_id', type: 'uuid', isFk: true, fkTarget: 'sys_users.id' },
            { name: 'action_type', type: 'varchar(50)', constraints: 'NOT NULL' },
            { name: 'resource_affected', type: 'varchar(50)' },
            { name: 'details', type: 'text' },
            { name: 'ip_address', type: 'varchar(45)' }
        ],
        sqlDefinition: `CREATE TABLE sys_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  actor_user_id UUID REFERENCES sys_users(id),
  action_type VARCHAR(50) NOT NULL, -- e.g. 'LOGIN', 'UPDATE_POLICY', 'EXPORT_DATA'
  resource_affected VARCHAR(50),
  details TEXT,
  ip_address VARCHAR(45)
);`
    },
    
    // 6. SOD RULES (Governance)
    {
        tableName: 'sys_sod_rules',
        referenceRawTable: 'auth_roles', // Extracted from SOD constants
        reasoning: "GOVERNANCE: Segregation of Duties rules. Defines conflicting permissions (e.g., 'Creator' cannot be 'Approver').",
        columns: [
            { name: 'id', type: 'uuid', isPk: true, constraints: 'DEFAULT gen_random_uuid()' },
            { name: 'name', type: 'varchar(100)' },
            { name: 'description', type: 'text' },
            { name: 'severity', type: 'varchar(20)', constraints: "CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))" },
            { name: 'conflicting_resource_a', type: 'varchar(50)', isFk: true, fkTarget: 'sys_resources.id' },
            { name: 'conflicting_resource_b', type: 'varchar(50)', isFk: true, fkTarget: 'sys_resources.id' }
        ],
        sqlDefinition: `CREATE TABLE sys_sod_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100),
  description TEXT,
  severity VARCHAR(20) CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  conflicting_resource_a VARCHAR(50) REFERENCES sys_resources(id),
  conflicting_resource_b VARCHAR(50) REFERENCES sys_resources(id)
);`
    }
];
