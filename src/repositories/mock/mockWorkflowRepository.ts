
import { IWorkflowRepository } from '../contracts';
import { OpsTemplate, OpsChecklist } from '../../types/ops';
import { UserRole } from '../../types/index';

// Initial Seed for Templates
const SEED_TEMPLATES: OpsTemplate[] = [
    {
        id: 'TPL-SHIPPING',
        name: 'Standard Shipping Workflow',
        triggerType: 'PRODUCT_PURCHASE',
        triggerProductId: 'ALL',
        isActive: true,
        items: [
            { id: 't1', title: 'Verify Address', description: 'Check if shipping address is complete.', type: 'MANUAL', scope: 'USER_LEVEL', assignedRole: UserRole.OPERATIONS, isBlocking: true },
            { id: 't2', title: 'Pack Items', description: 'Pick items from warehouse and pack.', type: 'MANUAL', scope: 'PRODUCT_LEVEL', assignedRole: UserRole.OPERATIONS, isBlocking: true },
            { id: 't3', title: 'Upload AWB', description: 'Input tracking number from courier.', type: 'MANUAL', scope: 'PRODUCT_LEVEL', assignedRole: UserRole.OPERATIONS, isBlocking: true }
        ]
    }
];

const SEED_CHECKLISTS: OpsChecklist[] = [
    {
        id: 'CHK-001',
        templateId: 'TPL-SHIPPING',
        transactionId: 'TRX-9988',
        memberId: 'M002',
        memberName: 'David Pratomo',
        productName: 'Book Bundle: Leadership Gold',
        status: 'ACTIVE',
        progress: 33,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tasks: [
            { id: 'task-1', templateItemId: 't1', title: 'Verify Address', description: 'Check completeness', type: 'MANUAL', scope: 'USER_LEVEL', status: 'COMPLETED', assignedRole: UserRole.OPERATIONS, initiatedAt: new Date().toISOString(), logs: [] },
            { id: 'task-2', templateItemId: 't2', title: 'Pack Items', description: 'Pick from shelf A1', type: 'MANUAL', scope: 'PRODUCT_LEVEL', status: 'PENDING', assignedRole: UserRole.OPERATIONS, initiatedAt: new Date().toISOString(), logs: [] },
            { id: 'task-3', templateItemId: 't3', title: 'Upload AWB', description: 'Input JNE/J&T Resi', type: 'MANUAL', scope: 'PRODUCT_LEVEL', status: 'PENDING', assignedRole: UserRole.OPERATIONS, initiatedAt: new Date().toISOString(), logs: [] }
        ]
    }
];

let memoryTemplates: OpsTemplate[] | null = null;
let memoryChecklists: OpsChecklist[] | null = null;

function cloneTemplates(): OpsTemplate[] {
    return JSON.parse(JSON.stringify(SEED_TEMPLATES)) as OpsTemplate[];
}

function cloneChecklists(): OpsChecklist[] {
    return JSON.parse(JSON.stringify(SEED_CHECKLISTS)) as OpsChecklist[];
}

export class MockWorkflowRepository implements IWorkflowRepository {
    async getTemplates(): Promise<OpsTemplate[]> {
        if (!memoryTemplates) memoryTemplates = cloneTemplates();
        return memoryTemplates;
    }

    async saveTemplate(template: OpsTemplate): Promise<void> {
        if (!memoryTemplates) memoryTemplates = cloneTemplates();
        const i = memoryTemplates.findIndex((t) => t.id === template.id);
        if (i >= 0) memoryTemplates[i] = template;
        else memoryTemplates.push(template);
    }

    async deleteTemplate(id: string): Promise<void> {
        if (!memoryTemplates) memoryTemplates = cloneTemplates();
        memoryTemplates = memoryTemplates.filter((t) => t.id !== id);
    }

    async getChecklists(): Promise<OpsChecklist[]> {
        if (!memoryChecklists) memoryChecklists = cloneChecklists();
        return memoryChecklists;
    }

    async getChecklistById(id: string): Promise<OpsChecklist | undefined> {
        const all = await this.getChecklists();
        return all.find((c) => c.id === id);
    }

    async saveChecklist(checklist: OpsChecklist): Promise<void> {
        if (!memoryChecklists) memoryChecklists = cloneChecklists();
        const i = memoryChecklists.findIndex((c) => c.id === checklist.id);
        if (i >= 0) memoryChecklists[i] = checklist;
        else memoryChecklists.push(checklist);
    }
}
