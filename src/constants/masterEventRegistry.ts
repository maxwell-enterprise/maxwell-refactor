
import { SystemTriggerType } from '../types/ops';
import { CreditCard, UserPlus, Ticket, Truck, Gift, Clock, QrCode, FileText, CheckCircle, Flame, Shield, DollarSign } from 'lucide-react';

export type EventCategory = 'FINANCE' | 'CRM' | 'EVENT' | 'SYSTEM' | 'LOGISTICS';

export interface EventVariable {
    key: string;
    label: string;
    example: string;
}

export interface MasterEventDefinition {
    id: SystemTriggerType;
    label: string;
    description: string;
    category: EventCategory;
    icon: any;
    variables: EventVariable[];
}

export const MASTER_EVENT_REGISTRY: MasterEventDefinition[] = [
    // --- FINANCE ---
    {
        id: 'PAYMENT_SUCCESS',
        label: 'Payment Received',
        description: 'Triggered when a transaction is successfully settled.',
        category: 'FINANCE',
        icon: CreditCard,
        variables: [
            { key: 'amount', label: 'Amount Paid', example: 'Rp 1.500.000' },
            { key: 'transaction_id', label: 'Transaction ID', example: 'TRX-9988' },
            { key: 'product_name', label: 'Product', example: 'Masterclass Bundle' },
            { key: 'member_name', label: 'Member Name', example: 'Budi Santoso' }
        ]
    },
    {
        id: 'INVOICE_GENERATED',
        label: 'Invoice Issued',
        description: 'Triggered when a new invoice is created.',
        category: 'FINANCE',
        icon: FileText,
        variables: [
            { key: 'invoice_number', label: 'Invoice #', example: 'INV-2025-001' },
            { key: 'amount', label: 'Total Amount', example: 'Rp 500.000' },
            { key: 'due_date', label: 'Due Date', example: '2025-05-01' }
        ]
    },
    {
        id: 'COMMISSION_PAID',
        label: 'Commission Payout',
        description: 'Triggered when Finance settles a commission payment.',
        category: 'FINANCE',
        icon: DollarSign,
        variables: [
            { key: 'amount', label: 'Amount', example: 'Rp 2.500.000' },
            { key: 'member_name', label: 'Facilitator Name', example: 'Coach David' }
        ]
    },

    // --- CRM ---
    {
        id: 'NEW_MEMBER_REGISTRATION',
        label: 'New Registration',
        description: 'Triggered when a new user creates an account.',
        category: 'CRM',
        icon: UserPlus,
        variables: [
            { key: 'member_name', label: 'Name', example: 'Siti Aminah' },
            { key: 'join_date', label: 'Join Date', example: '2025-03-10' }
        ]
    },
    {
        id: 'LEAD_HOT_QUALIFIED',
        label: 'Hot Lead Detected',
        description: 'Triggered when AI Scout scores a lead > 8/10.',
        category: 'CRM',
        icon: Flame,
        variables: [
            { key: 'lead_score', label: 'Score', example: '9' },
            { key: 'interest', label: 'Interest', example: 'Private Coaching' }
        ]
    },

    // --- EVENT ---
    {
        id: 'TICKET_ISSUED',
        label: 'Ticket Issued',
        description: 'Triggered when a ticket is added to user wallet.',
        category: 'EVENT',
        icon: Ticket,
        variables: [
            { key: 'event_name', label: 'Event Name', example: 'Leadership Summit' },
            { key: 'ticket_link', label: 'Link', example: 'https://...' }
        ]
    },
    {
        id: 'EVENT_CHECK_IN',
        label: 'Event Check-In',
        description: 'Triggered when a user scans their ticket at the venue.',
        category: 'EVENT',
        icon: QrCode,
        variables: [
            { key: 'event_name', label: 'Event Name', example: 'Leadership Summit' },
            { key: 'checkin_time', label: 'Time', example: '08:45 AM' }
        ]
    },
    {
        id: 'EVENT_REMINDER_24H',
        label: 'Event Reminder (H-1)',
        description: 'Triggered 24 hours before event start.',
        category: 'EVENT',
        icon: Clock,
        variables: [
            { key: 'event_name', label: 'Event Name', example: 'Leadership Summit' },
            { key: 'start_time', label: 'Time', example: '09:00 WIB' }
        ]
    },

    // --- LOGISTICS ---
    {
        id: 'SHIPPING_UPDATED',
        label: 'Item Shipped',
        description: 'Triggered when a tracking number is added.',
        category: 'LOGISTICS',
        icon: Truck,
        variables: [
            { key: 'tracking_number', label: 'AWB', example: 'JNE882910' },
            { key: 'courier', label: 'Courier', example: 'JNE' }
        ]
    },

    // --- SYSTEM ---
    {
        id: 'CONTRACT_SIGNED',
        label: 'Contract Signed',
        description: 'Triggered when member signs a digital agreement.',
        category: 'SYSTEM',
        icon: Shield,
        variables: [
            { key: 'document_name', label: 'Document', example: 'Facilitator Agreement' }
        ]
    },
    {
        id: 'EMAIL_WELCOME_SENT',
        label: 'Welcome Email Sent',
        description: 'Triggered when onboarding email is dispatched.',
        category: 'SYSTEM',
        icon: CheckCircle,
        variables: [
            { key: 'member_name', label: 'Recipient', example: 'New User' }
        ]
    }
];
