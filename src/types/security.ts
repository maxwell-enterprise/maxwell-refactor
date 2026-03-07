
export type PermissionCategory = 'SALES' | 'MARKETING' | 'FINANCE' | 'OPERATIONS' | 'SYSTEM' | 'ACADEMY';

// --- OLD SIMPLE PERMISSION (DEPRECATED but kept for compatibility) ---
export interface Permission {
  id: string;
  label: string;
  category: PermissionCategory;
  description: string;
}

// --- NEW ADVANCED SECURITY TYPES ---

export type AccessLevel = 'NONE' | 'READ' | 'WRITE' | 'FULL'; // Write = Create/Update, Full = Delete
export type DataScope = 'OWN' | 'TEAM' | 'ALL';

export interface AuthorityLimit {
  currency?: string;
  maxAmount: number; // e.g., 50,000,000
  requiresApproval?: boolean; // If true, even if allowed, needs 2nd signer
}

export interface AccessPolicy {
  resourceId: string; // e.g., 'finance_invoices'
  accessLevel: AccessLevel;
  scope: DataScope;
  authorityLimit?: AuthorityLimit; // Optional constraint
}

export interface ResourceDefinition {
  id: string;
  name: string;
  category: PermissionCategory;
  description: string;
  supportsScoping: boolean; // Does this resource have owner/team fields?
  supportsAuthority: boolean; // Does this resource involve money/risk?
}

export interface SodRule {
  id: string;
  name: string;
  description: string;
  conflictingPermissions: string[]; 
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[]; // Legacy flat permissions
  policies: Record<string, AccessPolicy>; // NEW: Map of ResourceID -> Policy
  isSystemRole?: boolean;
  sodViolations?: string[];
}

export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
}
