import { IWhatsappRepository } from '../contracts';
import { WhatsAppTask, WhatsAppTemplate } from '../../types/index';
import { apiRequest } from './apiClient';

export class ApiWhatsappRepository implements IWhatsappRepository {
    async getQueue(): Promise<WhatsAppTask[]> {
        return apiRequest<WhatsAppTask[]>('/communication/whatsapp/queue');
    }

    async addTask(task: WhatsAppTask): Promise<WhatsAppTask> {
        return apiRequest<WhatsAppTask>('/communication/whatsapp/queue', {
            method: 'POST',
            body: JSON.stringify(task),
        });
    }

    async updateTask(task: WhatsAppTask): Promise<void> {
        await apiRequest<void>('/communication/whatsapp/queue', {
            method: 'PUT',
            body: JSON.stringify(task),
        });
    }

    async deleteTask(id: string): Promise<void> {
        await apiRequest<void>(`/communication/whatsapp/queue/${encodeURIComponent(id)}`, {
            method: 'DELETE',
        });
    }

    async getTemplates(): Promise<WhatsAppTemplate[]> {
        return apiRequest<WhatsAppTemplate[]>('/communication/whatsapp/templates');
    }

    async saveTemplate(template: WhatsAppTemplate): Promise<void> {
        await apiRequest<void>(`/communication/whatsapp/templates/${encodeURIComponent(template.id)}`, {
            method: 'PUT',
            body: JSON.stringify(template),
        });
    }

    async resetTemplates(defaults: WhatsAppTemplate[]): Promise<void> {
        await apiRequest<void>('/communication/whatsapp/templates/reset', {
            method: 'POST',
            body: JSON.stringify({ templates: defaults }),
        });
    }
}
