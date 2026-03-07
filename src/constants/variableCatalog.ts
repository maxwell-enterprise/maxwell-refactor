
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
    { key: 'member_name', label: 'Full Name', category: 'MEMBER', description: 'Nama lengkap member', example: 'Budi Santoso' },
    { key: 'member_first_name', label: 'First Name', category: 'MEMBER', description: 'Nama depan (panggilan)', example: 'Budi' },
    { key: 'member_email', label: 'Email Address', category: 'MEMBER', description: 'Email aktif member', example: 'budi@gmail.com' },
    { key: 'member_phone', label: 'Phone Number', category: 'MEMBER', description: 'Format internasional (62...)', example: '62812345678' },
    { key: 'member_company', label: 'Company Name', category: 'MEMBER', description: 'Perusahaan tempat member bekerja', example: 'PT Maju Mundur' },
    { key: 'member_job_title', label: 'Job Title', category: 'MEMBER', description: 'Jabatan member', example: 'Direktur Utama' },
    { key: 'member_tier', label: 'Membership Tier', category: 'MEMBER', description: 'Level membership (VIP, Partner, dll)', example: 'VIP' },
    { key: 'member_join_date', label: 'Join Date', category: 'MEMBER', description: 'Tanggal bergabung', example: '15 Jan 2024' },
    { key: 'member_sponsor', label: 'Sponsor Name', category: 'MEMBER', description: 'Nama orang yang mereferensikan', example: 'Andi Wijaya' },

    // 2. EVENT CONTEXT
    { key: 'event_name', label: 'Event Name', category: 'EVENT', description: 'Judul acara', example: 'Leadership Summit 2025' },
    { key: 'event_date', label: 'Event Date', category: 'EVENT', description: 'Tanggal mulai acara', example: '25 Agustus 2025' },
    { key: 'event_time', label: 'Event Time', category: 'EVENT', description: 'Waktu mulai (WIB)', example: '09:00 WIB' },
    { key: 'event_location', label: 'Location / Venue', category: 'EVENT', description: 'Nama tempat atau Hotel', example: 'Grand Ballroom, Hotel Mulia' },
    { key: 'event_map_link', label: 'Google Maps Link', category: 'EVENT', description: 'Link lokasi peta', example: 'https://maps.google.com/...' },
    { key: 'event_virtual_link', label: 'Zoom/Meet Link', category: 'EVENT', description: 'Link webinar (jika online)', example: 'https://zoom.us/j/...' },
    { key: 'event_checkin_qr', label: 'QR Code URL', category: 'EVENT', description: 'Link gambar QR Code unik', example: 'https://qr.api/...' },
    { key: 'ticket_id', label: 'Ticket ID', category: 'EVENT', description: 'Kode unik tiket', example: 'TKT-882910' },

    // 3. TRANSACTION & COMMERCE
    { key: 'trx_id', label: 'Transaction ID', category: 'TRANSACTION', description: 'Nomor referensi transaksi', example: 'TRX-2025-001' },
    { key: 'trx_date', label: 'Transaction Date', category: 'TRANSACTION', description: 'Tanggal pembelian', example: '10 Feb 2025' },
    { key: 'product_name', label: 'Product Name', category: 'TRANSACTION', description: 'Nama item utama yang dibeli', example: 'Masterclass Bundle' },
    { key: 'trx_amount', label: 'Total Amount', category: 'TRANSACTION', description: 'Total bayar (Format IDR)', example: 'Rp 15.000.000' },
    { key: 'discount_code', label: 'Voucher Used', category: 'TRANSACTION', description: 'Kode diskon yang dipakai', example: 'EARLYBIRD' },
    { key: 'payment_method', label: 'Payment Method', category: 'TRANSACTION', description: 'Metode pembayaran', example: 'BCA Virtual Account' },
    { key: 'invoice_link', label: 'Invoice PDF Link', category: 'TRANSACTION', description: 'Link download invoice', example: 'https://portal.maxwell.com/inv/...' },
    { key: 'va_number', label: 'VA Number', category: 'TRANSACTION', description: 'Nomor Virtual Account', example: '880012345678' },

    // 4. OPERATION & LOGISTICS
    { key: 'shipping_address', label: 'Shipping Address', category: 'OPERATION', description: 'Alamat pengiriman lengkap', example: 'Jl. Sudirman No. 1...' },
    { key: 'tracking_number', label: 'AWB / Resi', category: 'OPERATION', description: 'Nomor resi kurir', example: 'JNE88221199' },
    { key: 'courier_name', label: 'Courier Service', category: 'OPERATION', description: 'Nama ekspedisi', example: 'JNE REG' },
    { key: 'order_status', label: 'Order Status', category: 'OPERATION', description: 'Status pesanan saat ini', example: 'Shipped' },

    // 5. COMMISSION & PARTNER
    { key: 'comm_amount', label: 'Commission Amount', category: 'COMMISSION', description: 'Nilai komisi yang diterima', example: 'Rp 1.500.000' },
    { key: 'comm_source', label: 'Source Member', category: 'COMMISSION', description: 'Member yang melakukan pembelian', example: 'Client A' },
    { key: 'payout_date', label: 'Payout Date', category: 'COMMISSION', description: 'Tanggal pencairan dana', example: '05 Mar 2025' },

    // 6. SYSTEM & TIME
    { key: 'current_date', label: 'Today\'s Date', category: 'SYSTEM', description: 'Tanggal hari ini (saat generate)', example: '01 Mar 2025' },
    { key: 'company_name', label: 'Our Company Name', category: 'SYSTEM', description: 'Nama entitas resmi kita', example: 'Maxwell Leadership Indonesia' },
    { key: 'support_whatsapp', label: 'Support WA', category: 'SYSTEM', description: 'Nomor WA Admin CS', example: '62811...' },
];

export const VARIABLE_CATEGORIES: { id: VariableCategory; label: string; icon: any }[] = [
    { id: 'MEMBER', label: 'User Profile', icon: User },
    { id: 'EVENT', label: 'Event Details', icon: Calendar },
    { id: 'TRANSACTION', label: 'Finance & Sales', icon: CreditCard },
    { id: 'OPERATION', label: 'Logistics', icon: Box },
    { id: 'COMMISSION', label: 'Partner/Comm', icon: Award },
    { id: 'SYSTEM', label: 'System', icon: Clock },
];
