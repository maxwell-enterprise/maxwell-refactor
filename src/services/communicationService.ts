
import { EmailCampaign, EmailLog, EmailTemplate } from '../types/index';
import { RepositoryFactory } from './repositories/index';

export const CommunicationService = {
    
    // --- TEMPLATES ---
    getTemplates: async (): Promise<EmailTemplate[]> => {
        return await RepositoryFactory.getCommunicationRepository().getTemplates();
    },

    // --- CAMPAIGNS ---
    getCampaigns: async (): Promise<EmailCampaign[]> => {
        return await RepositoryFactory.getCommunicationRepository().getCampaigns();
    },

    createCampaign: async (campaign: Partial<EmailCampaign>): Promise<EmailCampaign> => {
        const newCampaign: EmailCampaign = {
            id: `CMP-EMAIL-${Date.now()}`,
            name: campaign.name || 'Untitled Campaign',
            subject: campaign.subject || '(No Subject)',
            body: campaign.body || '',
            status: campaign.triggerType === 'IMMEDIATE' ? 'SENT' : 'SCHEDULED',
            triggerType: campaign.triggerType || 'IMMEDIATE',
            scheduledAt: campaign.scheduledAt,
            eventRelativeConfig: campaign.eventRelativeConfig,
            audienceFilter: campaign.audienceFilter || {},
            stats: { sent: 0, opened: 0, clicked: 0, createdAt: new Date().toISOString() },
            createdAt: new Date().toISOString(),
            createdBy: 'Admin'
        };

        const repo = RepositoryFactory.getCommunicationRepository();
        const created = await repo.createCampaign(newCampaign);

        // Logic: Simulate sending immediate campaign
        if (newCampaign.triggerType === 'IMMEDIATE') {
            const audienceSize = Math.floor(Math.random() * 100) + 10;
            // We can't easily update stats via repo directly without a full update method in interface, 
            // but for now let's assume immediate send logs some entries.
            // (In real app, this would be a background job)
            for(let i=0; i<5; i++) {
                await repo.createLog({
                    id: `LOG-${Date.now()}-${i}`,
                    campaignId: created.id,
                    recipientEmail: `user${i}@example.com`,
                    subject: created.subject,
                    sentAt: new Date().toISOString(),
                    status: 'SUCCESS'
                });
            }
        }
        
        return created;
    },

    // --- TRANSACTIONAL SENDING ---
    sendTransactionalEmail: async (templateId: string, recipientEmail: string, data: Record<string, string>): Promise<void> => {
        const templates = await CommunicationService.getTemplates();
        const template = templates.find(t => t.id === templateId);
        if (!template) return;

        let subject = template.subject;
        let body = template.body;

        Object.keys(data).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            subject = subject.replace(regex, data[key]);
            body = body.replace(regex, data[key]);
        });

        const log: EmailLog = {
            id: `LOG-TRX-${Date.now()}`,
            templateId,
            recipientEmail,
            subject,
            sentAt: new Date().toISOString(),
            status: 'SUCCESS',
            metadata: data
        };

        await RepositoryFactory.getCommunicationRepository().createLog(log);
    },

    // --- LOGS ---
    getLogs: async (): Promise<EmailLog[]> => {
        return await RepositoryFactory.getCommunicationRepository().getLogs();
    },

    // --- AI HELPER ---
    generateEmailContent: async (topic: string, tone: 'PROFESSIONAL' | 'EXCITING' | 'URGENT'): Promise<{ subject: string, body: string }> => {
        await new Promise(resolve => setTimeout(resolve, 1500)); // Latency
        
        if (tone === 'EXCITING') {
            return {
                subject: `🚀 Don't Miss Out: ${topic}!`,
                body: `Hi Team,<br/><br/>We have something incredible coming up regarding <b>${topic}</b>. This is your chance to level up!<br/><br/>Click below to join us.`
            };
        } else if (tone === 'URGENT') {
            return {
                subject: `⚠️ Action Required: ${topic}`,
                body: `Dear Member,<br/><br/>This is a final reminder regarding <b>${topic}</b>. Please take action immediately to ensure your access continues.<br/><br/>Regards,`
            };
        }
        return {
            subject: `Update regarding ${topic}`,
            body: `Dear Community,<br/><br/>We would like to share some important information about <b>${topic}</b>.<br/><br/>As John Maxwell says, "Leadership is Influence." We hope this resource adds value to your journey.`
        };
    }
};
