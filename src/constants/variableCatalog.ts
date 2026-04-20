
import { User, Calendar, CreditCard, Box, Award, Clock } from 'lucide-react';
import { WAUIContext } from '../types/index';

export type VariableCategory = 'MEMBER' | 'EVENT' | 'TRANSACTION' | 'OPERATION' | 'COMMISSION' | 'SYSTEM';

export interface VariableDefinition {
    key: string;
    label: string;
    category: VariableCategory;
    description: string;
    example: string;
}

// --- VALIDATION MAPPING: Which Context allows which Variables? ---
export const CONTEXT_VARIABLE_RULES: Record<WAUIContext, VariableCategory[]> = {
    'GENERAL': ['MEMBER', 'SYSTEM'],
    'CRM_MEMBER_LIST': ['MEMBER', 'SYSTEM'],
    'LEADS_PIPELINE': ['MEMBER', 'SYSTEM'],
    'OPS_LOGISTICS': ['MEMBER', 'OPERATION', 'SYSTEM'],
    'FINANCE_COMMISSION': ['MEMBER', 'COMMISSION', 'SYSTEM'],
    'EVENT_ATTENDANCE': ['MEMBER', 'EVENT', 'SYSTEM'],
    'TRIBE_MEMBER': ['MEMBER', 'SYSTEM'], // Tribe often uses member context
    'LEGAL_CONTRACT': ['MEMBER', 'SYSTEM'],
    'YOUTH_SCHOOL': ['MEMBER', 'SYSTEM']
};

export const VARIABLE_CATALOG: VariableDefinition[] = [
    // 1. MEMBER / USER CONTEXT
    { key: 'member_name', label: 'Full Name', category: 'MEMBER', description: 'Member full legal name', example: 'Alex Morgan' },
    { key: 'member_first_name', label: 'First Name', category: 'MEMBER', description: 'Preferred first name', example: 'Alex' },
    { key: 'member_email', label: 'Email Address', category: 'MEMBER', description: 'Active member email', example: 'alex@example.com' },
    { key: 'member_phone', label: 'Phone Number', category: 'MEMBER', description: 'International format (e.g. +62…)', example: '62812345678' },
    { key: 'member_company', label: 'Company Name', category: 'MEMBER', description: 'Employer or organization', example: 'Acme Corp' },
    { key: 'member_job_title', label: 'Job Title', category: 'MEMBER', description: 'Member job title', example: 'CEO' },
    { key: 'member_tier', label: 'Membership Tier', category: 'MEMBER', description: 'Membership level (VIP, Partner, etc.)', example: 'VIP' },
    { key: 'member_join_date', label: 'Join Date', category: 'MEMBER', description: 'Date the member joined', example: '15 Jan 2024' },
    { key: 'member_sponsor', label: 'Sponsor Name', category: 'MEMBER', description: 'Referring person or sponsor', example: 'Jamie Lee' },

    // 2. EVENT CONTEXT
    { key: 'event_name', label: 'Event Name', category: 'EVENT', description: 'Event title', example: 'Leadership Summit 2025' },
    { key: 'event_date', label: 'Event Date', category: 'EVENT', description: 'Event start date', example: '25 Aug 2025' },
    { key: 'event_time', label: 'Event Time', category: 'EVENT', description: 'Start time (local TZ)', example: '09:00' },
    { key: 'event_location', label: 'Location / Venue', category: 'EVENT', description: 'Venue or hotel name', example: 'Grand Ballroom, Hotel Mulia' },
    { key: 'event_map_link', label: 'Google Maps Link', category: 'EVENT', description: 'Map link for the venue', example: 'https://maps.google.com/...' },
    { key: 'event_virtual_link', label: 'Zoom/Meet Link', category: 'EVENT', description: 'Webinar link if online', example: 'https://zoom.us/j/...' },
    { key: 'event_checkin_qr', label: 'QR Code URL', category: 'EVENT', description: 'Unique QR image URL', example: 'https://qr.api/...' },
    { key: 'ticket_id', label: 'Ticket ID', category: 'EVENT', description: 'Unique ticket code', example: 'TKT-882910' },

    // 3. TRANSACTION & COMMERCE
    { key: 'trx_id', label: 'Transaction ID', category: 'TRANSACTION', description: 'Transaction reference number', example: 'TRX-2025-001' },
    { key: 'trx_date', label: 'Transaction Date', category: 'TRANSACTION', description: 'Purchase date', example: '10 Feb 2025' },
    { key: 'product_name', label: 'Product Name', category: 'TRANSACTION', description: 'Primary line item purchased', example: 'Masterclass Bundle' },
    { key: 'trx_amount', label: 'Total Amount', category: 'TRANSACTION', description: 'Total paid (IDR format)', example: 'Rp 15.000.000' },
    { key: 'discount_code', label: 'Voucher Used', category: 'TRANSACTION', description: 'Discount code applied', example: 'EARLYBIRD' },
    { key: 'payment_method', label: 'Payment Method', category: 'TRANSACTION', description: 'How the customer paid', example: 'BCA Virtual Account' },
    { key: 'invoice_link', label: 'Invoice PDF Link', category: 'TRANSACTION', description: 'Invoice download URL', example: 'https://portal.maxwell.com/inv/...' },
    { key: 'va_number', label: 'VA Number', category: 'TRANSACTION', description: 'Virtual account number', example: '880012345678' },

    // 4. OPERATION & LOGISTICS
    { key: 'shipping_address', label: 'Shipping Address', category: 'OPERATION', description: 'Full shipping address', example: '123 Main St, Suite 100…' },
    { key: 'tracking_number', label: 'AWB / Resi', category: 'OPERATION', description: 'Courier tracking number', example: 'JNE88221199' },
    { key: 'courier_name', label: 'Courier Service', category: 'OPERATION', description: 'Carrier name', example: 'JNE REG' },
    { key: 'order_status', label: 'Order Status', category: 'OPERATION', description: 'Current fulfillment status', example: 'Shipped' },

    // 5. COMMISSION & PARTNER
    { key: 'comm_amount', label: 'Commission Amount', category: 'COMMISSION', description: 'Commission amount earned', example: 'Rp 1.500.000' },
    { key: 'comm_source', label: 'Source Member', category: 'COMMISSION', description: 'Buyer linked to the commission', example: 'Client A' },
    { key: 'payout_date', label: 'Payout Date', category: 'COMMISSION', description: 'Payout settlement date', example: '05 Mar 2025' },

    // 6. SYSTEM & TIME
    { key: 'current_date', label: 'Today\'s Date', category: 'SYSTEM', description: 'Date at send time', example: '01 Mar 2025' },
    { key: 'company_name', label: 'Our Company Name', category: 'SYSTEM', description: 'Official entity name', example: 'Maxwell Leadership Indonesia' },
    { key: 'support_whatsapp', label: 'Support WA', category: 'SYSTEM', description: 'Support WhatsApp number', example: '62811...' },
];

export const VARIABLE_CATEGORIES: { id: VariableCategory; label: string; icon: any }[] = [
    { id: 'MEMBER', label: 'User Profile', icon: User },
    { id: 'EVENT', label: 'Event Details', icon: Calendar },
    { id: 'TRANSACTION', label: 'Finance & Sales', icon: CreditCard },
    { id: 'OPERATION', label: 'Logistics', icon: Box },
    { id: 'COMMISSION', label: 'Partner/Comm', icon: Award },
    { id: 'SYSTEM', label: 'System', icon: Clock },
];
