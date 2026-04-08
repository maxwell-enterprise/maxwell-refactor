
import { OpsChecklist, OpsTemplate, OpsTaskStatus, SystemTriggerType, OpsTask } from '../types/ops';
import { UserRole, InventoryMovementType, InventoryItem, InventoryTransaction } from '../types/index';
import { RepositoryFactory } from './repositories/index';
import { AuditService } from './auditService'; 
import { apiRequest } from '../repositories/api/apiClient';

export const OpsService = {
    
    // --- INVENTORY MANAGEMENT (MIGRATED TO REPO) ---
    getInventory: async (): Promise<InventoryItem[]> => {
        return await RepositoryFactory.getInventoryRepository().getAll();
    },

    upsertInventoryItem: async (item: InventoryItem): Promise<void> => {
        return await RepositoryFactory.getInventoryRepository().upsert(item);
    },

    getInventoryTransactions: async (): Promise<InventoryTransaction[]> => {
        return await RepositoryFactory.getInventoryRepository().getTransactions();
    },

    updateStock: async (sku: string, quantity: number, type: InventoryMovementType, reference: string, performedBy: string): Promise<void> => {
        const repo = RepositoryFactory.getInventoryRepository();
        const inventory = await repo.getAll();
        const item = inventory.find(i => i.sku === sku);
        if (!item) throw new Error("Item not found");

        let newStock = item.stock;
        if (type === 'GR') newStock += quantity;
        else if (type === 'GI') newStock -= quantity;
        else if (type === 'ADJUSTMENT') newStock = item.stock + quantity; 
        else if (type === 'INITIAL') newStock = quantity;

        item.stock = newStock;
        if (item.stock <= item.reorderLevel) item.status = 'Low Stock';
        if (item.stock <= 0) item.status = 'Out of Stock';
        if (item.stock > item.reorderLevel) item.status = 'In Stock';

        // 1. Update Master via Repo
        await repo.upsert(item);

        // 2. Log Transaction via Repo
        const tx: InventoryTransaction = {
            id: `INV-TRX-${Date.now()}`,
            sku,
            type,
            quantity,
            balanceAfter: newStock,
            reference,
            performedBy,
            timestamp: new Date().toISOString()
        };

        await repo.logTransaction(tx);
    },

    // --- WORKFLOW & TASKS (MIGRATED TO REPO) ---
    getChecklists: async (): Promise<OpsChecklist[]> => {
        return await RepositoryFactory.getWorkflowRepository().getChecklists();
    },

    getChecklistById: async (id: string): Promise<OpsChecklist | undefined> => {
        return await RepositoryFactory.getWorkflowRepository().getChecklistById(id);
    },

    updateTaskStatus: async (checklistId: string, taskId: string, status: OpsTaskStatus, actorRole: UserRole, note: string): Promise<OpsChecklist | null> => {
        const updatedChecklist = await apiRequest<OpsChecklist>(
            `/store/ops-checklists/${encodeURIComponent(checklistId)}/tasks/${encodeURIComponent(taskId)}/status`,
            {
                method: 'PATCH',
                body: JSON.stringify({
                    status,
                    actorRole,
                    note
                })
            }
        );
        return updatedChecklist ?? null;
    },

    // --- TEMPLATES (MIGRATED TO REPO) ---
    getTemplates: async (): Promise<OpsTemplate[]> => {
        return await RepositoryFactory.getWorkflowRepository().getTemplates();
    },
    
    saveTemplate: async (template: OpsTemplate): Promise<void> => {
        return await RepositoryFactory.getWorkflowRepository().saveTemplate(template);
    },

    duplicateTemplate: async (originalId: string): Promise<OpsTemplate | null> => {
        const templates = await OpsService.getTemplates();
        const original = templates.find(t => t.id === originalId);
        
        if (!original) return null;

        const copy: OpsTemplate = {
            ...original,
            id: `TPL-COPY-${Date.now()}`,
            name: `${original.name} (Copy)`,
            isActive: false, // Default to draft
            items: original.items.map(item => ({
                ...item,
                id: `item-${Date.now()}-${Math.floor(Math.random()*1000)}` // Regenerate item IDs
            }))
        };

        await OpsService.saveTemplate(copy);
        return copy;
    },

    deleteTemplate: async (id: string): Promise<void> => {
        return await RepositoryFactory.getWorkflowRepository().deleteTemplate(id);
    },

    // --- AUTOMATION HOOKS (Trigger Logic kept in Service) ---
    handleSystemTrigger: async (trigger: SystemTriggerType, context: any) => {
        console.log(`[OPS ENGINE] Trigger Received: ${trigger}`, context);
        
        const repo = RepositoryFactory.getWorkflowRepository();
        const allChecklists = await repo.getChecklists();
        
        for (const list of allChecklists) {
            // Find task that is PENDING, AUTOMATED, and matches the Trigger
            const waitingTask = list.tasks.find(t => 
                t.status === 'PENDING' && 
                t.type === 'AUTOMATED' && 
                t.systemTrigger === trigger
            );
            
            if (waitingTask) {
                // Verify context (Member ID match)
                if (context.memberId && context.memberId !== list.memberId) continue;

                console.log(`[OPS ENGINE] Auto-completing task ${waitingTask.id} in checklist ${list.id}`);

                // Auto-complete task
                waitingTask.status = 'COMPLETED';
                waitingTask.completedAt = new Date().toISOString();
                waitingTask.completedBy = 'SYSTEM';
                waitingTask.logs.push({
                    timestamp: new Date().toISOString(),
                    actor: 'SYSTEM',
                    action: 'SYSTEM_EVENT',
                    note: `Auto-completed by system event: ${trigger}`
                });

                // Update Progress
                const total = list.tasks.length;
                const done = list.tasks.filter(t => t.status === 'COMPLETED').length;
                list.progress = Math.round((done / total) * 100);
                if (list.progress === 100) list.status = 'COMPLETED';
                list.updatedAt = new Date().toISOString();

                // Save via Repo
                await repo.saveChecklist(list);
                
                // Log Journey Event
                await AuditService.logRealtimeEvent({
                     userId: list.memberId,
                     category: 'SYSTEM',
                     title: `Automated Task: ${waitingTask.title}`,
                     description: `Triggered by ${trigger}`,
                     metadata: { checklistId: list.id, taskId: waitingTask.id }
                });
            }
        }
    },

    triggerWorkflow: async (
        triggerType: 'PRODUCT_PURCHASE' | 'SYSTEM_EVENT', 
        triggerId: string, 
        context: { 
            transactionId?: string; 
            memberId: string; 
            memberName: string; 
            productName?: string; 
        }
    ) => {
        console.log(`[WORKFLOW ENGINE] Checking triggers for: ${triggerType} -> ${triggerId}`);
        
        const repo = RepositoryFactory.getWorkflowRepository();
        const templates = await repo.getTemplates();
        
        // Find matching active templates
        const matchingTemplates = templates.filter(t => {
            if (!t.isActive) return false;
            if (t.triggerType !== triggerType) return false;
            
            if (triggerType === 'SYSTEM_EVENT') {
                return t.triggerEventId === triggerId;
            } else {
                return t.triggerProductId === 'ALL' || t.triggerProductId === triggerId;
            }
        });

        if (matchingTemplates.length === 0) return;

        console.log(`[WORKFLOW ENGINE] Found ${matchingTemplates.length} SOPs. Instantiating tasks...`);

        // Instantiate Checklists
        for (const tpl of matchingTemplates) {
            const checklistId = `CHK-${Date.now()}-${Math.floor(Math.random()*1000)}`;
            
            const tasks: OpsTask[] = tpl.items.map((item, idx) => ({
                id: `TSK-${checklistId}-${idx}`,
                templateItemId: item.id,
                title: item.title,
                description: item.description,
                type: item.type,
                scope: item.scope,
                status: 'PENDING',
                assignedRole: item.assignedRole,
                systemTrigger: item.systemTrigger,
                initiatedAt: new Date().toISOString(),
                logs: []
            }));

            const checklist: OpsChecklist = {
                id: checklistId,
                templateId: tpl.id,
                transactionId: context.transactionId || 'N/A',
                memberId: context.memberId,
                memberName: context.memberName,
                productName: context.productName || tpl.name,
                status: 'ACTIVE',
                progress: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                tasks: tasks
            };

            // Save to Ops DB
            await repo.saveChecklist(checklist);
        }
    }
};
