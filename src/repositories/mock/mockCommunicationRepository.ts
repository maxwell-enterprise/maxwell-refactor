
import { ICommunicationRepository } from '../contracts';
import { EmailCampaign, EmailLog, EmailTemplate } from '../../types/index';
import { DevDatabase } from '../../utils/devDatabase';

const SEED_TEMPLATES: EmailTemplate[] = [
    {
        id: 'TPL-INVOICE',
        name: 'Invoice / Receipt',
        category: 'TRANSACTIONAL',
        subject: 'Payment Receipt for {{orderId}}',
        body: 'Dear {{name}},<br/><br/>Thank you for your payment of {{amount}}. Your transaction ID is {{transactionId}}.<br/><br/>Regards,<br/>Maxwell Leadership',
        variables: ['name', 'amount', 'orderId', 'transactionId']
    },
    {
        id: 'TPL-GIFT',
        name: 'Gift Ticket Notification',
        category: 'TRANSACTIONAL',
        subject: 'You have received a gift ticket!',
        body: 'Hi there,<br/><br/>{{senderName}} has gifted you a ticket to <b>{{itemName}}</b>.<br/>Click here to claim: {{claimLink}}<br/><br/>Enjoy!',
        variables: ['senderName', 'itemName', 'claimLink']
    },
    {
        id: 'TPL-REMINDER-H1',
        name: 'Event Reminder (H-1)',
        category: 'MARKETING',
        subject: 'Reminder: {{eventName}} starts tomorrow!',
        body: 'Hello {{name}},<br/><br/>We are excited to see you tomorrow at {{location}}. Please have your QR code ready.<br/><br/>See you soon!',
        variables: ['name', 'eventName', 'location']
    }
];

const SEED_CAMPAIGNS: EmailCampaign[] = [
    {
        id: 'CMP-EMAIL-001',
        name: 'March Newsletter',
        subject: 'Leadership Trends in Q1 2025',
        body: 'Dear Leaders, here is what is trending...',
        status: 'SENT',
        triggerType: 'IMMEDIATE',
        audienceFilter: {},
        stats: { sent: 1250, opened: 800, clicked: 120, createdAt: '2025-03-01T10:00:00Z' },
        createdAt: '2025-03-01T10:00:00Z',
        createdBy: 'Marketing Team'
    }
];

const SEED_LOGS: EmailLog[] = [
    { id: 'LOG-001', recipientEmail: 'member@gmail.com', subject: 'March Newsletter', sentAt: '2025-03-01T10:05:00Z', status: 'SUCCESS', campaignId: 'CMP-EMAIL-001', openedAt: '2025-03-01T12:00:00Z' }
];

export class MockCommunicationRepository implements ICommunicationRepository {
    async getTemplates(): Promise<EmailTemplate[]> {
        try {
            if (await DevDatabase.isEmpty('email_templates')) await DevDatabase.bulkAdd('email_templates', SEED_TEMPLATES);
            return await DevDatabase.getAll<EmailTemplate>('email_templates');
        } catch (e) {
            return SEED_TEMPLATES;
        }
    }

    async getCampaigns(): Promise<EmailCampaign[]> {
        try {
            if (await DevDatabase.isEmpty('email_campaigns')) await DevDatabase.bulkAdd('email_campaigns', SEED_CAMPAIGNS);
            const list = await DevDatabase.getAll<EmailCampaign>('email_campaigns');
            return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } catch (e) {
            return SEED_CAMPAIGNS;
        }
    }

    async createCampaign(campaign: EmailCampaign): Promise<EmailCampaign> {
        await DevDatabase.add('email_campaigns', campaign);
        return campaign;
    }

    async getLogs(): Promise<EmailLog[]> {
        try {
            if (await DevDatabase.isEmpty('email_logs')) await DevDatabase.bulkAdd('email_logs', SEED_LOGS);
            return await DevDatabase.getAll<EmailLog>('email_logs');
        } catch (e) {
            return SEED_LOGS;
        }
    }

    async createLog(log: EmailLog): Promise<void> {
        await DevDatabase.add('email_logs', log);
    }
}
