import { ICommunicationRepository } from '../contracts';
import { EmailCampaign, EmailLog, EmailTemplate } from '../../types/index';
import { apiRequest } from './apiClient';

export class ApiCommunicationRepository implements ICommunicationRepository {
  async getTemplates(): Promise<EmailTemplate[]> {
    return apiRequest<EmailTemplate[]>('/communication/email/templates');
  }

  async getCampaigns(): Promise<EmailCampaign[]> {
    return apiRequest<EmailCampaign[]>('/communication/email/campaigns');
  }

  async createCampaign(campaign: EmailCampaign): Promise<EmailCampaign> {
    return apiRequest<EmailCampaign>('/communication/email/campaigns', {
      method: 'POST',
      body: JSON.stringify(campaign),
    });
  }

  async getLogs(): Promise<EmailLog[]> {
    return apiRequest<EmailLog[]>('/communication/email/logs');
  }

  async createLog(log: EmailLog): Promise<void> {
    await apiRequest('/communication/email/logs', {
      method: 'POST',
      body: JSON.stringify(log),
    });
  }
}
