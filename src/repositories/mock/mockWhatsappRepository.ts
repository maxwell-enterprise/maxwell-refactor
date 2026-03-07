
import { IWhatsappRepository } from '../contracts';
import { WhatsAppTask, WhatsAppTemplate } from '../../types/index';
import { DevDatabase } from '../../utils/devDatabase';
import { WA_TASKS_SEED, WA_TEMPLATES_SEED } from '../../seeds/whatsapp';

export class MockWhatsappRepository implements IWhatsappRepository {
    async getQueue(): Promise<WhatsAppTask[]> {
        try {
            if (await DevDatabase.isEmpty('whatsapp_task_queue')) await DevDatabase.bulkAdd('whatsapp_task_queue', WA_TASKS_SEED);
            return await DevDatabase.getAll<WhatsAppTask>('whatsapp_task_queue');
        } catch (e) {
            return WA_TASKS_SEED;
        }
    }

    async addTask(task: WhatsAppTask): Promise<WhatsAppTask> {
        await DevDatabase.add('whatsapp_task_queue', task);
        return task;
    }

    async updateTask(task: WhatsAppTask): Promise<void> {
        await DevDatabase.add('whatsapp_task_queue', task);
    }

    async deleteTask(id: string): Promise<void> {
        await DevDatabase.delete('whatsapp_task_queue', id);
    }

    async getTemplates(): Promise<WhatsAppTemplate[]> {
        try {
            if (await DevDatabase.isEmpty('whatsapp_templates')) {
                await DevDatabase.bulkAdd('whatsapp_templates', WA_TEMPLATES_SEED);
                return WA_TEMPLATES_SEED;
            }
            return await DevDatabase.getAll<WhatsAppTemplate>('whatsapp_templates');
        } catch (e) {
            return WA_TEMPLATES_SEED;
        }
    }

    async saveTemplate(template: WhatsAppTemplate): Promise<void> {
        await DevDatabase.add('whatsapp_templates', template);
    }

    async resetTemplates(defaults: WhatsAppTemplate[]): Promise<void> {
        await DevDatabase.clear('whatsapp_templates');
        await DevDatabase.bulkAdd('whatsapp_templates', defaults);
    }
}
