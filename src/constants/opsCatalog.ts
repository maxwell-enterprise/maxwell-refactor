
import { SystemTriggerType } from '../types/ops';
import { CreditCard, Mail, QrCode, Truck, FileCheck, UserCheck, Ticket } from 'lucide-react';

export interface AutomationCatalogItem {
    id: SystemTriggerType;
    label: string;
    category: 'FINANCE' | 'EVENT' | 'SYSTEM' | 'LOGISTICS';
    description: string;
    icon: any;
}

export const AUTOMATION_CATALOG: AutomationCatalogItem[] = [
    // FINANCE
    {
        id: 'PAYMENT_SUCCESS',
        label: 'Payment Received (Full)',
        category: 'FINANCE',
        description: 'Triggered when Payment Gateway sends "Settlement" status.',
        icon: CreditCard
    },
    {
        id: 'INVOICE_SENT',
        label: 'Invoice Email Sent',
        category: 'FINANCE',
        description: 'Triggered after PDF generation and email dispatch.',
        icon: Mail
    },
    
    // EVENT
    {
        id: 'TICKET_ISSUED',
        label: 'Ticket Issued',
        category: 'EVENT',
        description: 'Triggered when Wallet Item/QR is generated for user.',
        icon: Ticket
    },
    {
        id: 'EVENT_CHECK_IN',
        label: 'Event Attendance (QR Scan)',
        category: 'EVENT',
        description: 'Triggered when user badge is successfully scanned at venue.',
        icon: QrCode
    },

    // LOGISTICS
    {
        id: 'SHIPPING_UPDATED',
        label: 'Tracking Number Added',
        category: 'LOGISTICS',
        description: 'Triggered when logistics partner updates AWB/Resi.',
        icon: Truck
    },

    // SYSTEM
    {
        id: 'EMAIL_WELCOME_SENT',
        label: 'Welcome Email Sent',
        category: 'SYSTEM',
        description: 'Triggered when onboarding email sequence starts.',
        icon: Mail
    },
    {
        id: 'CONTRACT_SIGNED',
        label: 'Digital Contract Signed',
        category: 'SYSTEM',
        description: 'Triggered when E-Sign provider confirms signature.',
        icon: FileCheck
    },
    {
        id: 'ACCOUNT_ACTIVATED',
        label: 'Account Activated',
        category: 'SYSTEM',
        description: 'Triggered when user logs in for the first time.',
        icon: UserCheck
    }
];
