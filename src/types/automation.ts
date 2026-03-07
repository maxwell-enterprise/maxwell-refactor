
import { LucideIcon } from 'lucide-react';

export type TriggerCategory = 'FINANCE' | 'CRM' | 'EVENT' | 'SYSTEM' | 'LOGISTICS';

export interface TriggerVariable {
    key: string;
    label: string;
    example: string;
}

export interface TriggerDefinition {
    id: string;
    label: string;
    description: string;
    category: TriggerCategory;
    iconName: string; // We store string name to map to Icon component
    variables: TriggerVariable[]; // The "Context" provided by this trigger
}

export interface AutomationRule {
    id: string;
    triggerId: string;
    actions: any[]; // Placeholder for future expansion
}

// NEW: Queue System Types
export type QueueStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface AutomationQueueItem {
    id: string;
    triggerType: string; // e.g., 'PAYMENT_SUCCESS', 'NEW_MEMBER'
    contextData: any; // JSON data needed to execute the task (e.g., transactionId, userId)
    status: QueueStatus;
    createdAt: string;
    processedAt?: string;
    errorLog?: string;
    description: string; // Human readable summary for Admin
}
