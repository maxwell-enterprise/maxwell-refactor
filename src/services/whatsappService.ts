

import { WhatsAppTask, WATaskCategory, WhatsAppTemplate, WATaskStatus, WAUIContext } from '../types/index';
import { SystemTriggerType } from '../types/ops';
import { RepositoryFactory } from './repositories/index';
import { WA_TEMPLATES_SEED } from '../seeds/whatsapp';

export const WhatsAppService = {
    
    // --- TASK QUEUE METHODS ---
    getQueue: async (): Promise<WhatsAppTask[]> => {
        return await RepositoryFactory.getWhatsappRepository().getQueue();
    },

    addTask: async (taskData: Omit<WhatsAppTask, 'id' | 'status' | 'createdAt'> & { status?: WATaskStatus }): Promise<WhatsAppTask> => {
        const newTask: WhatsAppTask = {
            id: `WA-${Date.now()}`,
            ...taskData,
            status: taskData.status || 'PENDING',
            createdAt: new Date().toISOString()
        };
        
        return await RepositoryFactory.getWhatsappRepository().addTask(newTask);
    },

    markAsClicked: async (id: string): Promise<void> => {
        const repo = RepositoryFactory.getWhatsappRepository();
        const all = await repo.getQueue();
        const task = all.find(t => t.id === id);
        if (task) {
            task.status = 'CLICKED';
            await repo.updateTask(task);
        }
    },

    archiveTask: async (id: string): Promise<void> => {
        const repo = RepositoryFactory.getWhatsappRepository();
        const all = await repo.getQueue();
        const task = all.find(t => t.id === id);
        if (task) {
            task.status = 'ARCHIVED';
            await repo.updateTask(task);
        }
    },

    deleteTask: async (id: string): Promise<void> => {
        await RepositoryFactory.getWhatsappRepository().deleteTask(id);
    },

    // --- TEMPLATE MANAGEMENT ---

    getTemplates: async (): Promise<WhatsAppTemplate[]> => {
        return await RepositoryFactory.getWhatsappRepository().getTemplates();
    },
    
    // UPDATED: CORE FILTERING LOGIC (The Brain)
    getManualTemplates: async (currentContext?: WAUIContext): Promise<WhatsAppTemplate[]> => {
        const all = await WhatsAppService.getTemplates();
        
        return all.filter(t => {
            // 1. Must be a Manual template (Not triggered by system automation)
            if (t.linkedTriggerId) return false;

            // 2. Normalize Data (Handle legacy string vs new array)
            let allowedLocations: string[] = [];
            if (Array.isArray(t.uiContext)) {
                allowedLocations = t.uiContext;
            } else if (typeof t.uiContext === 'string') {
                allowedLocations = [t.uiContext];
            } else {
                allowedLocations = ['GENERAL']; // Default if undefined
            }

            // 3. Logic Check
            const isGeneralTemplate = allowedLocations.includes('GENERAL');
            
            // If the button is in a specific context (e.g. CRM)
            if (currentContext) {
                // Show if it's a GENERAL template OR if it's assigned to THIS context
                return isGeneralTemplate || allowedLocations.includes(currentContext);
            }

            // If the button didn't specify context (fallback), show everything
            return true; 
        });
    },

    saveTemplate: async (template: WhatsAppTemplate): Promise<void> => {
        await RepositoryFactory.getWhatsappRepository().saveTemplate(template);
    },

    resetTemplatesToDefault: async (): Promise<void> => {
        await RepositoryFactory.getWhatsappRepository().resetTemplates(WA_TEMPLATES_SEED);
    },

    // --- AUTOMATION ENGINE (THE GLUE) ---
    // This function is called by system hooks
    processSystemTrigger: async (triggerId: SystemTriggerType, recipient: { name: string, phone: string }, context: Record<string, any>) => {
        console.log(`[WA AUTOMATION] Processing trigger: ${triggerId} for ${recipient.name}`);
        
        const templates = await WhatsAppService.getTemplates();
        const template = templates.find(t => t.linkedTriggerId === triggerId);

        if (!template) {
            console.log(`[WA AUTOMATION] No template mapped for ${triggerId}. Skipping.`);
            return;
        }

        // Inject standard member name if missing from context but available in recipient object
        const finalContext = { ...context, member_name: recipient.name }; 

        const message = WhatsAppService.interpolateMessage(template.message, finalContext);

        // Add to Queue (Status PENDING so admin can review and click send)
        await WhatsAppService.addTask({
            recipientName: recipient.name,
            recipientPhone: recipient.phone,
            category: template.category,
            message: message,
            status: 'PENDING'
        });
        
        console.log(`[WA AUTOMATION] Task Enqueued: ${message}`);
    },

    // --- UTILS ---
    
    interpolateMessage: (template: string, variables: Record<string, any>): string => {
        let message = template;
        Object.keys(variables).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'gi'); // Case insensitive
            let val = variables[key];
            if (typeof val === 'number') val = val.toLocaleString('id-ID'); // Auto format numbers
            message = message.replace(regex, String(val || ''));
        });
        
        // Safety cleanup for unreplaced vars (optional, currently leaves them visible for debugging)
        return message;
    },

    formatPhoneForLink: (phone: string): string => {
        let clean = phone.replace(/\D/g, ''); 
        if (clean.startsWith('0')) {
            clean = '62' + clean.slice(1);
        }
        return clean;
    },

    generateLink: (phone: string, message: string): string => {
        const cleanPhone = WhatsAppService.formatPhoneForLink(phone);
        const encodedMsg = encodeURIComponent(message);
        return `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
    }
};