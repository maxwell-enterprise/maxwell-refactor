
import { WhatsAppTask, WhatsAppTemplate } from '../types/index';

export const WA_TASKS_SEED: WhatsAppTask[] = [
    {
        id: 'WA-001',
        recipientName: 'David Pratomo',
        recipientPhone: '6281807171976',
        category: 'REGISTRATION',
        message: 'Hi David! 👋 Welcome to Maxwell Leadership Indonesia.',
        status: 'PENDING',
        createdAt: new Date(Date.now() - 3600000).toISOString()
    }
];

export const WA_TEMPLATES_SEED: WhatsAppTemplate[] = [
    // ==========================================
    // AUTOMATED SYSTEM TEMPLATES (Triggered by System Events)
    // ==========================================
    
    // --- FINANCE (AUTO) ---
    {
        id: 'TPL-FIN-PAID', category: 'FINANCE', label: 'Payment Received',
        message: 'Hi {{member_name}}, pembayaran Anda sebesar {{amount}} untuk {{product_name}} telah kami terima! ✅\n\nTransaksi ID: {{transaction_id}}\nAkses Anda sudah aktif. Selamat belajar!',
        variables: ['member_name', 'amount', 'product_name', 'transaction_id'], isDefault: true, linkedTriggerId: 'PAYMENT_SUCCESS', uiContext: ['GENERAL']
    },
    {
        id: 'TPL-FIN-INV', category: 'FINANCE', label: 'New Invoice',
        message: 'Halo {{member_name}}, invoice baru #{{invoice_number}} telah terbit sebesar {{amount}}. \n\nMohon lakukan pembayaran sebelum {{due_date}}. \nLink: {{payment_link}}\n\nTerima kasih!',
        variables: ['member_name', 'invoice_number', 'amount', 'due_date', 'payment_link'], isDefault: true, linkedTriggerId: 'INVOICE_GENERATED', uiContext: ['GENERAL']
    },
    {
        id: 'TPL-FIN-COMM', category: 'FINANCE', label: 'Commission Payout',
        message: 'Selamat {{member_name}}! 💸 Komisi sebesar {{amount}} telah kami transfer ke rekening Anda. Terus semangat menginspirasi!',
        variables: ['member_name', 'amount'], isDefault: true, linkedTriggerId: 'COMMISSION_PAID', uiContext: ['GENERAL']
    },

    // --- SALES / CRM (AUTO) ---
    {
        id: 'TPL-CRM-WELCOME', category: 'ONBOARDING', label: 'Welcome (New Member)',
        message: 'Selamat datang di keluarga besar Maxwell Leadership, {{member_name}}! 🤝\n\nPerjalanan kepemimpinan Anda dimulai sekarang. Silakan login ke portal member Anda di sini: https://portal.maxwell.com',
        variables: ['member_name'], isDefault: true, linkedTriggerId: 'NEW_MEMBER_REGISTRATION', uiContext: ['GENERAL']
    },
    {
        id: 'TPL-CRM-LEAD', category: 'MARKETING', label: 'Hot Lead Follow-up',
        message: 'Hi {{member_name}}, saya melihat Anda tertarik dengan {{interest}}. Apakah ada waktu untuk ngobrol sebentar mengenai kebutuhan tim Anda?',
        variables: ['member_name', 'interest'], isDefault: true, linkedTriggerId: 'LEAD_HOT_QUALIFIED', uiContext: ['GENERAL']
    },

    // --- EVENT (AUTO) ---
    {
        id: 'TPL-EVT-TICKET', category: 'EVENT', label: 'Ticket Issued',
        message: 'Hi {{member_name}}, tiket Anda untuk {{event_name}} sudah siap! 🎟️\n\nLihat tiket: {{ticket_link}}\nSampai jumpa di lokasi!',
        variables: ['member_name', 'event_name', 'ticket_link'], isDefault: true, linkedTriggerId: 'TICKET_ISSUED', uiContext: ['GENERAL']
    },
    {
        id: 'TPL-EVT-H1', category: 'EVENT', label: 'Event Reminder (H-1)',
        message: 'Besok adalah harinya! 🚀\n\nEvent: {{event_name}}\nWaktu: {{start_time}}\n\nPastikan QR Code Anda siap. See you!',
        variables: ['event_name', 'start_time'], isDefault: true, linkedTriggerId: 'EVENT_REMINDER_24H', uiContext: ['GENERAL']
    },

    // --- OPS / LOGISTICS (AUTO) ---
    {
        id: 'TPL-OPS-SHIP', category: 'LOGISTICS', label: 'Shipping Update',
        message: 'Paket Anda ({{items}}) sedang dalam perjalanan! 🚚\n\nKurir: {{courier}}\nResi: {{tracking_number}}\n\nCek status pengiriman di website kurir.',
        variables: ['items', 'courier', 'tracking_number'], isDefault: true, linkedTriggerId: 'SHIPPING_UPDATED', uiContext: ['GENERAL']
    },

    // ==========================================
    // MANUAL QUICK-ACTION TEMPLATES (For Buttons)
    // ==========================================

    // --- CRM BUTTONS (Member Directory) ---
    {
        id: 'MAN-CRM-PROFILE', category: 'CRM', label: 'Profile Update Request',
        message: 'Halo Pak/Bu {{member_name}}, salam dari Admin Maxwell. Kami sedang memperbarui database member. Apakah boleh dibantu konfirmasi alamat email dan nama perusahaan saat ini? Terima kasih.',
        variables: ['member_name'], isDefault: true, uiContext: ['CRM_MEMBER_LIST']
    },
    {
        id: 'MAN-CRM-GREET', category: 'CRM', label: 'Personal Greeting',
        message: 'Hi {{member_name}}! Apa kabar? Semoga sehat selalu. Sekedar menyapa dan mendoakan kesuksesan untuk {{member_company}}. Have a great week!',
        variables: ['member_name', 'member_company'], isDefault: true, uiContext: ['CRM_MEMBER_LIST']
    },

    // --- MARKETING BUTTONS (Leads Pipeline) ---
    {
        id: 'MAN-MKT-INTRO', category: 'MARKETING', label: 'Leads Intro',
        message: 'Selamat siang {{member_name}}, saya dari tim Maxwell Leadership. Terima kasih sudah menunjukan ketertarikan pada program kami. Apakah ada waktu luang minggu ini untuk diskusi singkat via Zoom?',
        variables: ['member_name'], isDefault: true, uiContext: ['LEADS_PIPELINE']
    },
    {
        id: 'MAN-MKT-PROMO', category: 'MARKETING', label: 'Special Offer',
        message: 'Hi {{member_name}}, khusus bulan ini kami ada penawaran spesial. Jika mendaftar sebelum tanggal 25, ada potongan Early Bird. Info lengkap: https://maxwell.com/promo',
        variables: ['member_name'], isDefault: true, uiContext: ['LEADS_PIPELINE']
    },

    // --- OPERATIONS BUTTONS (Task List) ---
    {
        id: 'MAN-OPS-STATUS', category: 'LOGISTICS', label: 'Order Status Update',
        message: 'Siang Kak {{member_name}}, mau info untuk pesanan {{product_name}}. Status saat ini: {{order_status}}. Kami akan kabari lagi jika sudah dikirim ya. Thanks!',
        variables: ['member_name', 'product_name', 'order_status'], isDefault: true, uiContext: ['OPS_LOGISTICS']
    },
    {
        id: 'MAN-OPS-ADDRESS', category: 'LOGISTICS', label: 'Address Confirmation',
        message: 'Halo {{member_name}}, untuk pengiriman {{product_name}}, mohon konfirmasi apakah alamat ini masih sesuai: {{shipping_address}}? Terima kasih.',
        variables: ['member_name', 'product_name', 'shipping_address'], isDefault: true, uiContext: ['OPS_LOGISTICS']
    },

    // --- FINANCE BUTTONS (Commissions) ---
    {
        id: 'MAN-FIN-NOTIFY', category: 'FINANCE', label: 'Manual Transfer Notify',
        message: 'Hi {{member_name}}, barusan finance kami melakukan transfer komisi sebesar {{comm_amount}} (Ref: Penjualan {{comm_source}}). Mohon dicek ya. Thank you partner!',
        variables: ['member_name', 'comm_amount', 'comm_source'], isDefault: true, uiContext: ['FINANCE_COMMISSION']
    },

    // --- EVENT ATTENDANCE BUTTONS ---
    {
        id: 'MAN-EVT-THANKS', category: 'EVENT', label: 'Post-Event Thanks',
        message: 'Terima kasih sudah hadir di {{event_name}}, {{member_name}}! Senang bisa bertemu tadi. Materi presentasi bisa diakses di Member Portal besok pagi ya.',
        variables: ['member_name', 'event_name'], isDefault: true, uiContext: ['EVENT_ATTENDANCE']
    },
    
    // --- TRIBE / ENGAGEMENT BUTTONS ---
    {
        id: 'MAN-ENG-CHECKIN', category: 'ENGAGEMENT', label: 'Mentoring Check-in',
        message: 'Hi {{member_name}}, bagaimana progress action plan minggu ini? Jangan lupa sesi mentoring berikutnya akan diadakan minggu depan.',
        variables: ['member_name'], isDefault: true, uiContext: ['TRIBE_MEMBER']
    },

    // --- LEGAL / CONTRACT ---
    {
        id: 'MAN-LEG-SIGN', category: 'LEGAL', label: 'Contract Signing Reminder',
        message: 'Dear {{member_name}}, dokumen {{product_name}} menunggu tanda tangan Anda. Mohon cek di: {{link}}',
        variables: ['member_name', 'product_name', 'link'], isDefault: true, uiContext: ['LEGAL_CONTRACT']
    },

    // --- YOUTH ---
    {
        id: 'MAN-YOUTH-PING', category: 'CRM', label: 'School Follow-up',
        message: 'Halo {{member_name}} dari {{company_name}}. Bagaimana kabar? Apakah ada update mengenai proposal program iChoose untuk siswa?',
        variables: ['member_name', 'company_name'], isDefault: true, uiContext: ['YOUTH_SCHOOL']
    }
];
