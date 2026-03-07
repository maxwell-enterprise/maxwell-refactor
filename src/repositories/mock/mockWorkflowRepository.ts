
import { IWorkflowRepository } from '../contracts';
import { OpsTemplate, OpsChecklist } from '../../types/ops';
import { UserRole } from '../../types/index';
import { DevDatabase } from '../../utils/devDatabase';

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

export class MockWorkflowRepository implements IWorkflowRepository {
    // --- TEMPLATES ---
    async getTemplates(): Promise<OpsTemplate[]> {
        try {
            if (await DevDatabase.isEmpty('ops_templates')) {
                await DevDatabase.bulkAdd('ops_templates', SEED_TEMPLATES);
                return SEED_TEMPLATES;
            }
            return await DevDatabase.getAll<OpsTemplate>('ops_templates');
        } catch (e) {
            return SEED_TEMPLATES;
        }
    }

    async saveTemplate(template: OpsTemplate): Promise<void> {
        await DevDatabase.add('ops_templates', template);
    }

    async deleteTemplate(id: string): Promise<void> {
        await DevDatabase.delete('ops_templates', id);
    }

    // --- CHECKLISTS ---
    async getChecklists(): Promise<OpsChecklist[]> {
        try {
            if (await DevDatabase.isEmpty('ops_checklists')) {
                await DevDatabase.bulkAdd('ops_checklists', SEED_CHECKLISTS);
                return SEED_CHECKLISTS;
            }
            return await DevDatabase.getAll<OpsChecklist>('ops_checklists');
        } catch (e) {
            return SEED_CHECKLISTS;
        }
    }

    async getChecklistById(id: string): Promise<OpsChecklist | undefined> {
        const all = await this.getChecklists();
        return all.find(c => c.id === id);
    }

    async saveChecklist(checklist: OpsChecklist): Promise<void> {
        await DevDatabase.add('ops_checklists', checklist);
    }
}
