
import { AutomationQueueItem } from '../types/automation';
import { APP_CONFIG } from '../lib/config';
import { isSystemApiMode, systemApi } from '../lib/systemApi';
import { DevDatabase } from '../utils/devDatabase';
import { supabase } from '../lib/supabaseClient';
import { WhatsAppService } from './whatsappService';
import { CommunicationService } from './communicationService';
import { DataService } from './dataService';

// MOCK SEED DATA
const SEED_QUEUE: AutomationQueueItem[] = [
    {
        id: 'Q-001',
        triggerType: 'PAYMENT_SUCCESS',
        contextData: { name: 'Budi Santoso', phone: '08123456789', amount: 1500000 },
        status: 'PENDING',
        createdAt: new Date(Date.now() - 100000).toISOString(),
        description: 'Send Payment Receipt WA & Email to Budi Santoso'
    },
    {
        id: 'Q-002',
        triggerType: 'NEW_MEMBER_REGISTRATION',
        contextData: { name: 'Siti Aminah', email: 'siti@mail.com' },
        status: 'PENDING',
        createdAt: new Date(Date.now() - 50000).toISOString(),
        description: 'Send Welcome Kit Email to Siti Aminah'
    }
];

export const AutomationQueueService = {
    
    // 1. ADD TO QUEUE (Called by Frontend User Actions)
    addToQueue: async (triggerType: string, contextData: any, description: string): Promise<void> => {
        const item: AutomationQueueItem = {
            id: `Q-${Date.now()}-${Math.floor(Math.random()*1000)}`,
            triggerType,
            contextData,
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            description
        };

        if (isSystemApiMode()) {
            // `/fe/system/automations/queue/*` requires Ops/Marketing/etc.; storefront JWTs
            // (Member/Sales) get 403 and noisy DevTools. Queue intake for commerce is server-owned
            // (checkout / webhooks); client-side WhatsApp/Ops hooks still run from EventBus.
            return;
        } else if (APP_CONFIG.USE_MOCK) {
            await DevDatabase.add('system_background_jobs', item); 
        } else if (supabase) {
            await supabase.from('automation_queue').insert(item);
        }
        console.log(`[AUTO-QUEUE] Added: ${description}`);
    },

    // 2. GET PENDING ITEMS (For Admin UI)
    getPendingItems: async (): Promise<AutomationQueueItem[]> => {
        let items: AutomationQueueItem[] = [];
        if (isSystemApiMode()) {
            try {
                items = await systemApi.getAutomationQueue();
            } catch (e) {
                // Nest/DB down should not break the app or spam the Next.js error overlay
                console.warn(
                    '[AUTO-QUEUE] getAutomationQueue failed (best-effort, empty queue):',
                    e instanceof Error ? e.message : e,
                );
                items = [];
            }
        } else if (APP_CONFIG.USE_MOCK) {
            try {
                if(await DevDatabase.isEmpty('system_background_jobs')) {
                    await DevDatabase.bulkAdd('system_background_jobs', SEED_QUEUE);
                }
                const all = await DevDatabase.getAll<AutomationQueueItem>('system_background_jobs');
                items = all;
            } catch(e) { items = SEED_QUEUE; }
        } else if (supabase) {
            const { data } = await supabase.from('automation_queue').select('*');
            items = data || [];
        }

        // Filter only Pending and sort by oldest first (FIFO)
        return items
            .filter(i => i.status === 'PENDING' || i.status === 'FAILED')
            .sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    },

    // 3. PROCESS SINGLE ITEM (The "Worker" Logic)
    processItem: async (item: AutomationQueueItem): Promise<boolean> => {
        try {
            console.log(`[PROCESSOR] Executing ${item.id}: ${item.triggerType}`);
            
            // --- LOGIC ROUTER ---
            switch (item.triggerType) {
                
                case 'PAYMENT_SUCCESS':
                    // Action 1: Trigger WA
                    await WhatsAppService.processSystemTrigger('PAYMENT_SUCCESS', {
                        name: item.contextData.name,
                        phone: item.contextData.phone
                    }, item.contextData);
                    
                    // Action 2: Send Email
                    await CommunicationService.sendTransactionalEmail('TPL-INVOICE', item.contextData.email || 'user@example.com', item.contextData);
                    break;

                case 'NEW_MEMBER_REGISTRATION':
                    await WhatsAppService.processSystemTrigger('NEW_MEMBER_REGISTRATION', {
                        name: item.contextData.name,
                        phone: item.contextData.phone || ''
                    }, item.contextData);
                    break;
                
                // Add more cases here...
                default:
                    console.warn(`No handler for trigger: ${item.triggerType}`);
            }

            // Update Status to COMPLETED
            const updated: AutomationQueueItem = { 
                ...item, 
                status: 'COMPLETED', 
                processedAt: new Date().toISOString() 
            };
            
            if (isSystemApiMode()) {
                await systemApi.putAutomationQueueItem(updated.id, updated);
            } else if (APP_CONFIG.USE_MOCK) {
                await DevDatabase.add('system_background_jobs', updated);
            } else if (supabase) {
                await supabase.from('automation_queue').upsert(updated);
            }
            
            return true;

        } catch (error: any) {
            console.error(`[PROCESSOR] Failed ${item.id}`, error);
            
            // Update Status to FAILED
            const failed: AutomationQueueItem = { 
                ...item, 
                status: 'FAILED', 
                errorLog: error.message 
            };
            
            if (isSystemApiMode()) {
                await systemApi.putAutomationQueueItem(failed.id, failed);
            } else if (APP_CONFIG.USE_MOCK) {
                await DevDatabase.add('system_background_jobs', failed);
            } else if (supabase) {
                await supabase.from('automation_queue').upsert(failed);
            }
            return false;
        }
    },

    // 4. BATCH PROCESSOR (The "Click All" Logic)
    processBatch: async (items: AutomationQueueItem[], onProgress: (completed: number, total: number) => void) => {
        let completed = 0;
        const total = items.length;

        for (const item of items) {
            await AutomationQueueService.processItem(item);
            completed++;
            onProgress(completed, total);
            // Artificial delay to prevent browser freeze and simulate API calls
            await new Promise(r => setTimeout(r, 500)); 
        }
    },

    // 5. BACKGROUND WORKER PICKER (Atomic-like operation)
    processNextBackgroundTask: async (): Promise<boolean> => {
        try {
            // A. Fetch Pending
            const pending = await AutomationQueueService.getPendingItems();
            if (pending.length === 0) return false;

            // B. Pick Oldest
            const task = pending[0];

            // C. "Lock" it (Set to PROCESSING) - Crucial for avoiding race conditions in distributed systems
            // In Mock/Local, this prevents the same browser loop from picking it twice if async takes time
            const lockedTask: AutomationQueueItem = { ...task, status: 'PROCESSING' };

            if (isSystemApiMode()) {
                try {
                    await systemApi.putAutomationQueueItem(lockedTask.id, lockedTask);
                } catch (e) {
                    console.warn(
                        '[AUTO-QUEUE] lock task failed (skipping):',
                        e instanceof Error ? e.message : e,
                    );
                    return false;
                }
            } else if (APP_CONFIG.USE_MOCK) {
                await DevDatabase.add('system_background_jobs', lockedTask);
            } else if (supabase) {
                await supabase.from('automation_queue').upsert(lockedTask);
            }

            // D. Execute
            // Note: processItem will set it to COMPLETED upon success
            await AutomationQueueService.processItem(lockedTask);
            return true;
        } catch (e) {
            console.warn(
                '[AUTO-QUEUE] processNextBackgroundTask failed (best-effort):',
                e instanceof Error ? e.message : e,
            );
            return false;
        }
    },
};
