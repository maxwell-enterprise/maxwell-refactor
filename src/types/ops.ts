
import { UserRole } from './index';

// --- ENUMS & CONSTANTS ---

export type OpsTaskType = 'AUTOMATED' | 'MANUAL' | 'CUSTOMER_WAITING';
export type OpsTaskScope = 'USER_LEVEL' | 'PRODUCT_LEVEL';
export type OpsTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'FAILED';

// NEW: Registry of all possible system events that can autocomplete a task OR trigger a WA message
export type SystemTriggerType = 
  // FINANCE
  | 'PAYMENT_SUCCESS' 
  | 'PAYMENT_PARTIAL'
  | 'PAYMENT_FAILED'
  | 'INVOICE_GENERATED'
  | 'INVOICE_OVERDUE'
  | 'INVOICE_SENT'
  | 'COMMISSION_PAID'
  
  // CRM / SALES
  | 'NEW_MEMBER_REGISTRATION'
  | 'MEMBER_UPGRADE_VIP'
  | 'LEAD_HOT_QUALIFIED'
  | 'MEMBER_BIRTHDAY'
  
  // EVENT
  | 'TICKET_ISSUED'
  | 'EVENT_REMINDER_14D' // NEW
  | 'EVENT_REMINDER_7D'  // NEW
  | 'EVENT_REMINDER_3D'  // NEW
  | 'EVENT_REMINDER_24H'
  | 'EVENT_CHECK_IN'
  | 'EVENT_NO_SHOW'
  
  // LOGISTICS & OPS
  | 'ORDER_PACKED'
  | 'SHIPPING_UPDATED' // Resi uploaded
  | 'ORDER_DELIVERED'
  
  // LEGAL & SYSTEM
  | 'CONTRACT_READY'
  | 'CONTRACT_SIGNED'
  | 'ACCOUNT_ACTIVATED'
  | 'PASSWORD_RESET_REQ'
  | 'EMAIL_WELCOME_SENT'
  
  // CERTIFICATION
  | 'CERTIFICATE_ISSUED';

// --- TEMPLATES (Config) ---

export interface OpsTemplateItem {
  id: string;
  title: string;
  description: string;
  type: OpsTaskType;
  scope: OpsTaskScope;
  assignedRole: UserRole; // Who is responsible?
  isBlocking: boolean; // Does this stop the process?
  slaHours?: number; // Service Level Agreement in hours
  
  // NEW: If type is AUTOMATED, this field is required
  systemTrigger?: SystemTriggerType; 
}

export interface OpsTemplate {
  id: string;
  name: string;
  description?: string; // Human readable desc
  
  // Trigger Logic
  triggerType: 'PRODUCT_PURCHASE' | 'SYSTEM_EVENT';
  triggerEventId?: SystemTriggerType; // If SYSTEM_EVENT
  triggerProductId?: string | 'ALL'; // If PRODUCT_PURCHASE
  
  items: OpsTemplateItem[];
  isActive: boolean;
}

// --- RUNTIME ENTITIES ---

export interface OpsLogEntry {
  timestamp: string;
  actor: string;
  action: string; // 'STATUS_CHANGE', 'NOTE', 'SYSTEM_EVENT'
  note?: string;
}

export interface OpsTask {
  id: string;
  templateItemId: string; // Link back to config
  title: string;
  description: string;
  type: OpsTaskType;
  scope: OpsTaskScope;
  
  status: OpsTaskStatus;
  assignedRole: UserRole;
  
  // New: To display which system event we are waiting for
  systemTrigger?: SystemTriggerType;

  initiatedAt: string;
  completedAt?: string;
  completedBy?: string; // User ID or 'SYSTEM'
  
  logs: OpsLogEntry[];
}

export interface OpsChecklist {
  id: string;
  templateId: string; // Which SOP spawned this?
  transactionId: string; // Context
  memberId: string; // Context
  memberName: string;
  productName: string;
  
  status: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';
  progress: number; // 0-100
  createdAt: string;
  updatedAt: string;
  
  tasks: OpsTask[];
}