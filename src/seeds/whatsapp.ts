
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
        message: 'Hi {{member_name}}, we received your payment of {{amount}} for {{product_name}}. ✅\n\nTransaction ID: {{transaction_id}}\nYour access is active. Enjoy the program!',
        variables: ['member_name', 'amount', 'product_name', 'transaction_id'], isDefault: true, linkedTriggerId: 'PAYMENT_SUCCESS', uiContext: ['GENERAL']
    },
    {
        id: 'TPL-FIN-INV', category: 'FINANCE', label: 'New Invoice',
        message: 'Hi {{member_name}}, a new invoice #{{invoice_number}} has been issued for {{amount}}.\n\nPlease pay before {{due_date}}.\nLink: {{payment_link}}\n\nThank you!',
        variables: ['member_name', 'invoice_number', 'amount', 'due_date', 'payment_link'], isDefault: true, linkedTriggerId: 'INVOICE_GENERATED', uiContext: ['GENERAL']
    },
    {
        id: 'TPL-FIN-COMM', category: 'FINANCE', label: 'Commission Payout',
        message: 'Congrats {{member_name}}! 💸 We transferred commission of {{amount}} to your account. Keep inspiring!',
        variables: ['member_name', 'amount'], isDefault: true, linkedTriggerId: 'COMMISSION_PAID', uiContext: ['GENERAL']
    },

    // --- SALES / CRM (AUTO) ---
    {
        id: 'TPL-CRM-WELCOME', category: 'ONBOARDING', label: 'Welcome (New Member)',
        message: 'Welcome to the Maxwell Leadership family, {{member_name}}! 🤝\n\nYour leadership journey starts now. Sign in to the member portal here: https://portal.maxwell.com',
        variables: ['member_name'], isDefault: true, linkedTriggerId: 'NEW_MEMBER_REGISTRATION', uiContext: ['GENERAL']
    },
    {
        id: 'TPL-CRM-LEAD', category: 'MARKETING', label: 'Hot Lead Follow-up',
        message: 'Hi {{member_name}}, I noticed your interest in {{interest}}. Do you have a few minutes to chat about what your team needs?',
        variables: ['member_name', 'interest'], isDefault: true, linkedTriggerId: 'LEAD_HOT_QUALIFIED', uiContext: ['GENERAL']
    },

    // --- EVENT (AUTO) ---
    {
        id: 'TPL-EVT-TICKET', category: 'EVENT', label: 'Ticket Issued',
        message: 'Hi {{member_name}}, your ticket for {{event_name}} is ready! 🎟️\n\nView ticket: {{ticket_link}}\nSee you at the venue!',
        variables: ['member_name', 'event_name', 'ticket_link'], isDefault: true, linkedTriggerId: 'TICKET_ISSUED', uiContext: ['GENERAL']
    },
    {
        id: 'TPL-EVT-H1', category: 'EVENT', label: 'Event Reminder (H-1)',
        message: 'Tomorrow is the day! 🚀\n\nEvent: {{event_name}}\nTime: {{start_time}}\n\nHave your QR code ready. See you!',
        variables: ['event_name', 'start_time'], isDefault: true, linkedTriggerId: 'EVENT_REMINDER_24H', uiContext: ['GENERAL']
    },

    // --- OPS / LOGISTICS (AUTO) ---
    {
        id: 'TPL-OPS-SHIP', category: 'LOGISTICS', label: 'Shipping Update',
        message: 'Your package ({{items}}) is on the way! 🚚\n\nCourier: {{courier}}\nTracking: {{tracking_number}}\n\nCheck delivery status on the courier website.',
        variables: ['items', 'courier', 'tracking_number'], isDefault: true, linkedTriggerId: 'SHIPPING_UPDATED', uiContext: ['GENERAL']
    },

    // ==========================================
    // MANUAL QUICK-ACTION TEMPLATES (For Buttons)
    // ==========================================

    // --- CRM BUTTONS (Member Directory) ---
    {
        id: 'MAN-CRM-PROFILE', category: 'CRM', label: 'Profile Update Request',
        message: 'Hi {{member_name}}, this is Maxwell Admin. We are updating our member database. Could you confirm your current email and company name? Thank you.',
        variables: ['member_name'], isDefault: true, uiContext: ['CRM_MEMBER_LIST']
    },
    {
        id: 'MAN-CRM-GREET', category: 'CRM', label: 'Personal Greeting',
        message: 'Hi {{member_name}}! Hope you are well. Just checking in and wishing success to {{member_company}}. Have a great week!',
        variables: ['member_name', 'member_company'], isDefault: true, uiContext: ['CRM_MEMBER_LIST']
    },

    // --- MARKETING BUTTONS (Leads Pipeline) ---
    {
        id: 'MAN-MKT-INTRO', category: 'MARKETING', label: 'Leads Intro',
        message: 'Hi {{member_name}}, I am from the Maxwell Leadership team. Thanks for your interest in our programs. Do you have time this week for a short Zoom chat?',
        variables: ['member_name'], isDefault: true, uiContext: ['LEADS_PIPELINE']
    },
    {
        id: 'MAN-MKT-PROMO', category: 'MARKETING', label: 'Special Offer',
        message: 'Hi {{member_name}}, we have a special offer this month. Register before the 25th for Early Bird pricing. Details: https://maxwell.com/promo',
        variables: ['member_name'], isDefault: true, uiContext: ['LEADS_PIPELINE']
    },

    // --- OPERATIONS BUTTONS (Task List) ---
    {
        id: 'MAN-OPS-STATUS', category: 'LOGISTICS', label: 'Order Status Update',
        message: 'Hi {{member_name}}, quick update on order {{product_name}}. Current status: {{order_status}}. We will let you know when it ships. Thanks!',
        variables: ['member_name', 'product_name', 'order_status'], isDefault: true, uiContext: ['OPS_LOGISTICS']
    },
    {
        id: 'MAN-OPS-ADDRESS', category: 'LOGISTICS', label: 'Address Confirmation',
        message: 'Hi {{member_name}}, for shipment of {{product_name}}, please confirm this address is still correct: {{shipping_address}}? Thank you.',
        variables: ['member_name', 'product_name', 'shipping_address'], isDefault: true, uiContext: ['OPS_LOGISTICS']
    },

    // --- FINANCE BUTTONS (Commissions) ---
    {
        id: 'MAN-FIN-NOTIFY', category: 'FINANCE', label: 'Manual Transfer Notify',
        message: 'Hi {{member_name}}, finance just transferred commission of {{comm_amount}} (ref: sale {{comm_source}}). Please verify receipt. Thank you!',
        variables: ['member_name', 'comm_amount', 'comm_source'], isDefault: true, uiContext: ['FINANCE_COMMISSION']
    },

    // --- EVENT ATTENDANCE BUTTONS ---
    {
        id: 'MAN-EVT-THANKS', category: 'EVENT', label: 'Post-Event Thanks',
        message: 'Thanks for attending {{event_name}}, {{member_name}}! Great to meet you. Slides will be in the member portal tomorrow morning.',
        variables: ['member_name', 'event_name'], isDefault: true, uiContext: ['EVENT_ATTENDANCE']
    },
    
    // --- TRIBE / ENGAGEMENT BUTTONS ---
    {
        id: 'MAN-ENG-CHECKIN', category: 'ENGAGEMENT', label: 'Mentoring Check-in',
        message: 'Hi {{member_name}}, how is your action plan progress this week? Reminder: your next mentoring session is next week.',
        variables: ['member_name'], isDefault: true, uiContext: ['TRIBE_MEMBER']
    },

    // --- LEGAL / CONTRACT ---
    {
        id: 'MAN-LEG-SIGN', category: 'LEGAL', label: 'Contract Signing Reminder',
        message: 'Dear {{member_name}}, document {{product_name}} is waiting for your signature. Please review: {{link}}',
        variables: ['member_name', 'product_name', 'link'], isDefault: true, uiContext: ['LEGAL_CONTRACT']
    },

    // --- YOUTH ---
    {
        id: 'MAN-YOUTH-PING', category: 'CRM', label: 'School Follow-up',
        message: 'Hi {{member_name}} from {{company_name}}. Hope you are well. Any updates on the iChoose program proposal for students?',
        variables: ['member_name', 'company_name'], isDefault: true, uiContext: ['YOUTH_SCHOOL']
    }
];
