
import { Permission, SodRule, Role, ResourceDefinition, AccessPolicy } from '../types/security';

// --- 1. NEW RESOURCE DEFINITIONS (The Objects we protect) ---
export const SECURE_RESOURCES: ResourceDefinition[] = [
  // SYSTEM & ADMIN
  { id: 'sys_iam', name: 'Identity & Access Mgmt', category: 'SYSTEM', description: 'Configure Roles, Users, and Permissions', supportsScoping: false, supportsAuthority: false },
  { id: 'sys_database', name: 'System Database', category: 'SYSTEM', description: 'Schema Viewer and Low-level Data Access', supportsScoping: false, supportsAuthority: false },
  { id: 'sys_contracts', name: 'Contract Management', category: 'SYSTEM', description: 'Legal Templates, Clauses, and Signatures', supportsScoping: false, supportsAuthority: false }, 
  
  // COMMUNICATION
  { id: 'sys_communication', name: 'Communication Hub', category: 'SYSTEM', description: 'Email Blasts, Templates, PDF Designer, SMTP', supportsScoping: true, supportsAuthority: false },

  // FINANCE
  { id: 'fin_invoices', name: 'Invoices & PO', category: 'FINANCE', description: 'Outgoing invoices and Purchase Orders', supportsScoping: true, supportsAuthority: true },
  { id: 'fin_royalties', name: 'Royalty Settlements', category: 'FINANCE', description: 'Calculations for partners/speakers', supportsScoping: false, supportsAuthority: true },
  { id: 'fin_expenses', name: 'Staff Expenses', category: 'FINANCE', description: 'Reimbursement claims', supportsScoping: true, supportsAuthority: true },
  
  // SALES (CRM)
  { id: 'crm_members', name: 'Member Database', category: 'SALES', description: 'Paid customers (Retain & Upsell)', supportsScoping: true, supportsAuthority: false },
  { id: 'crm_member_facilitator_assignment', name: 'Facilitator Assignment', category: 'SALES', description: 'Assign or move facilitator ownership from member profiling', supportsScoping: false, supportsAuthority: false },
  { id: 'crm_leads', name: 'Leads Pipeline', category: 'SALES', description: 'Guests & Prospects (Acquisition)', supportsScoping: true, supportsAuthority: false }, // UPDATED
  { id: 'mkt_paid_conversions', name: 'Paid Conversions', category: 'MARKETING', description: 'Paid transactions with campaign & PIC attribution', supportsScoping: true, supportsAuthority: false },
  
  // OPS (Strictly Internal)
  { id: 'ops_event_mgmt', name: 'Event Operations', category: 'OPERATIONS', description: 'Workflows, Logistics, Gate Scanner', supportsScoping: false, supportsAuthority: false },
  { id: 'ops_inventory', name: 'Store Inventory', category: 'OPERATIONS', description: 'Stock levels and SKU management', supportsScoping: false, supportsAuthority: false },
  
  // MARKETING & CMS
  { id: 'mkt_campaigns', name: 'Marketing Campaigns', category: 'MARKETING', description: 'Attribution links and analytics', supportsScoping: true, supportsAuthority: false },
  { id: 'mkt_discounts', name: 'Discount Vouchers', category: 'MARKETING', description: 'Price reduction rules', supportsScoping: false, supportsAuthority: true }, 
  { id: 'cms_content', name: 'Content Intelligence', category: 'MARKETING', description: 'Articles, Ads, and Public Portal Content', supportsScoping: true, supportsAuthority: false },

  // PUBLIC / MEMBER FACING (Catalog Access)
  { id: 'cat_events', name: 'Events Catalog', category: 'ACADEMY', description: 'View and register for events', supportsScoping: false, supportsAuthority: false },
  { id: 'cat_store', name: 'Store Catalog', category: 'ACADEMY', description: 'Browse and purchase products', supportsScoping: false, supportsAuthority: false },
];

// ... (Rest of file remains unchanged, just ensuring the array above is updated)
// --- 2. OLD PERMISSIONS (Legacy - Kept for compatibility but phasing out) ---
export const PERMISSIONS: Permission[] = [
  { id: 'OPS_VIEW', label: 'View Operations', category: 'OPERATIONS', description: 'Read access to events and inventory' },
  { id: 'MKT_VIEW', label: 'View Marketing', category: 'MARKETING', description: 'View campaigns and performance' },
  { id: 'SALES_VIEW', label: 'View CRM', category: 'SALES', description: 'View member data' },
  { id: 'FIN_VIEW', label: 'View Finance', category: 'FINANCE', description: 'View dashboards and transactions' },
  { id: 'SYS_MANAGE_ACCESS', label: 'Manage Access', category: 'SYSTEM', description: 'Manage roles, users, and permissions' },
  { id: 'SYS_VIEW_LOGS', label: 'View Audit Logs', category: 'SYSTEM', description: 'View security and transaction logs' },
  { id: 'LMS_VIEW', label: 'Access Content', category: 'ACADEMY', description: 'View courses and materials' },
];

export const SOD_RULES: SodRule[] = [
  { id: 'SOD-001', name: 'Commercial & Financial Separation', description: 'Creating discounts vs approving payments.', conflictingPermissions: ['MKT_MANAGE_DISCOUNT', 'FIN_APPROVE_PAYMENT'], severity: 'CRITICAL' },
];

// Helper to generate ALL policies for Admin (Ensures no resource is missed)
const generateAdminPolicies = (): Record<string, AccessPolicy> => {
    const policies: Record<string, AccessPolicy> = {};
    SECURE_RESOURCES.forEach(res => {
        policies[res.id] = {
            resourceId: res.id,
            accessLevel: 'FULL',
            scope: 'ALL',
            authorityLimit: res.supportsAuthority ? { maxAmount: 100000000000 } : undefined // 100 Billion Limit
        };
    });
    return policies;
};

// --- 3. DEFAULT ROLES (Updated with Policies) ---
export const DEFAULT_ROLES: Role[] = [
  {
    id: 'ROLE_SUPER_ADMIN',
    name: 'Super Admin',
    description: 'System Owner. Full Control.',
    permissions: PERMISSIONS.map(p => p.id),
    policies: generateAdminPolicies(),
    isSystemRole: true,
  },
  {
    id: 'ROLE_FINANCE',
    name: 'Finance Manager',
    description: 'Can approve payments up to limit.',
    permissions: ['FIN_VIEW'],
    policies: {
        'fin_invoices': { resourceId: 'fin_invoices', accessLevel: 'FULL', scope: 'ALL', authorityLimit: { maxAmount: 100000000 } },
        'fin_expenses': { resourceId: 'fin_expenses', accessLevel: 'FULL', scope: 'ALL' },
        'fin_royalties': { resourceId: 'fin_royalties', accessLevel: 'READ', scope: 'ALL' },
        'crm_members': { resourceId: 'crm_members', accessLevel: 'READ', scope: 'ALL' },
        'crm_leads': { resourceId: 'crm_leads', accessLevel: 'NONE', scope: 'ALL' }, // Finance doesn't need raw leads
        'ops_inventory': { resourceId: 'ops_inventory', accessLevel: 'READ', scope: 'ALL' },
        'sys_communication': { resourceId: 'sys_communication', accessLevel: 'READ', scope: 'ALL' },
        'sys_contracts': { resourceId: 'sys_contracts', accessLevel: 'READ', scope: 'ALL' } 
    },
    isSystemRole: false,
  },
  {
    id: 'ROLE_SALES',
    name: 'Sales Executive',
    description: 'Focus on Leads Pipeline and Conversion.',
    permissions: ['SALES_VIEW'],
    policies: {
        'crm_leads': { resourceId: 'crm_leads', accessLevel: 'FULL', scope: 'ALL' }, // Full access to Leads
        'mkt_paid_conversions': { resourceId: 'mkt_paid_conversions', accessLevel: 'FULL', scope: 'ALL' },
        'crm_members': { resourceId: 'crm_members', accessLevel: 'READ', scope: 'TEAM' }, // Read-only for paid members
        'mkt_campaigns': { resourceId: 'mkt_campaigns', accessLevel: 'READ', scope: 'ALL' },
        'mkt_discounts': { resourceId: 'mkt_discounts', accessLevel: 'READ', scope: 'ALL' },
        'cat_store': { resourceId: 'cat_store', accessLevel: 'READ', scope: 'ALL' },
        'cat_events': { resourceId: 'cat_events', accessLevel: 'READ', scope: 'ALL' },
        'cms_content': { resourceId: 'cms_content', accessLevel: 'READ', scope: 'ALL' },
        'sys_contracts': { resourceId: 'sys_contracts', accessLevel: 'READ', scope: 'ALL' }
    },
    isSystemRole: false,
  },
  {
    id: 'ROLE_OPS',
    name: 'Operations Manager',
    description: 'Events & Inventory Execution.',
    permissions: ['OPS_VIEW'],
    policies: {
        'ops_event_mgmt': { resourceId: 'ops_event_mgmt', accessLevel: 'FULL', scope: 'ALL' },
        'ops_inventory': { resourceId: 'ops_inventory', accessLevel: 'FULL', scope: 'ALL' },
        'crm_members': { resourceId: 'crm_members', accessLevel: 'FULL', scope: 'ALL' }, // Ops manages Members
        'crm_leads': { resourceId: 'crm_leads', accessLevel: 'READ', scope: 'ALL' }, // Ops sees leads but focuses on members
        'fin_invoices': { resourceId: 'fin_invoices', accessLevel: 'READ', scope: 'ALL' },
        'sys_communication': { resourceId: 'sys_communication', accessLevel: 'WRITE', scope: 'ALL' },
        'sys_contracts': { resourceId: 'sys_contracts', accessLevel: 'WRITE', scope: 'ALL' }
    },
    isSystemRole: false,
  },
  {
    id: 'ROLE_MARKETING',
    name: 'Marketing Specialist',
    description: 'Campaigns, Content & Comm.',
    permissions: ['MKT_VIEW'],
    policies: {
        'mkt_campaigns': { resourceId: 'mkt_campaigns', accessLevel: 'FULL', scope: 'ALL' },
        'mkt_paid_conversions': { resourceId: 'mkt_paid_conversions', accessLevel: 'FULL', scope: 'ALL' },
        'mkt_discounts': { resourceId: 'mkt_discounts', accessLevel: 'FULL', scope: 'ALL' },
        'crm_leads': { resourceId: 'crm_leads', accessLevel: 'READ', scope: 'ALL' }, // Marketing targets leads
        'crm_members': { resourceId: 'crm_members', accessLevel: 'READ', scope: 'ALL' },
        'cat_store': { resourceId: 'cat_store', accessLevel: 'READ', scope: 'ALL' },
        'cms_content': { resourceId: 'cms_content', accessLevel: 'FULL', scope: 'ALL' },
        'sys_communication': { resourceId: 'sys_communication', accessLevel: 'FULL', scope: 'ALL' }
    },
    isSystemRole: false,
  },
  {
    id: 'ROLE_MEMBER',
    name: 'Standard Member',
    description: 'External Customer / Academy Student.',
    permissions: ['LMS_VIEW'],
    policies: {
        'crm_members': { resourceId: 'crm_members', accessLevel: 'WRITE', scope: 'OWN' },
        'fin_invoices': { resourceId: 'fin_invoices', accessLevel: 'READ', scope: 'OWN' },
        'cat_events': { resourceId: 'cat_events', accessLevel: 'READ', scope: 'ALL' },
        'cat_store': { resourceId: 'cat_store', accessLevel: 'READ', scope: 'ALL' },
        'cms_content': { resourceId: 'cms_content', accessLevel: 'READ', scope: 'ALL' }
    },
    isSystemRole: true,
  },
  {
    id: 'ROLE_GUEST',
    name: 'Guest / Lead',
    description: 'Unverified public user.',
    permissions: [],
    policies: {
        'cat_events': { resourceId: 'cat_events', accessLevel: 'READ', scope: 'ALL' },
        'cat_store': { resourceId: 'cat_store', accessLevel: 'READ', scope: 'ALL' },
        'cms_content': { resourceId: 'cms_content', accessLevel: 'READ', scope: 'ALL' }
    }, 
    isSystemRole: true,
  }
];
