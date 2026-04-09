import { OpsChecklist, OpsTemplate } from '../../types/ops';
import { IWorkflowRepository } from '../contracts';
import { apiRequest } from './apiClient';

function normalizeTemplate(template: OpsTemplate): OpsTemplate {
  return {
    id: template.id,
    name: template.name,
    description: template.description || '',
    triggerType: template.triggerType || 'PRODUCT_PURCHASE',
    triggerEventId: template.triggerEventId,
    triggerProductId: template.triggerProductId || 'ALL',
    items: Array.isArray(template.items) ? template.items : [],
    isActive: template.isActive !== false,
  };
}

function normalizeChecklist(checklist: OpsChecklist): OpsChecklist {
  return {
    id: checklist.id,
    templateId: checklist.templateId || '',
    transactionId: checklist.transactionId || '',
    memberId: checklist.memberId || '',
    memberName: checklist.memberName || '',
    productName: checklist.productName || '',
    status: checklist.status || 'ACTIVE',
    progress: Number.isFinite(checklist.progress) ? checklist.progress : 0,
    createdAt: checklist.createdAt || new Date().toISOString(),
    updatedAt:
      checklist.updatedAt || checklist.createdAt || new Date().toISOString(),
    tasks: Array.isArray(checklist.tasks) ? checklist.tasks : [],
  };
}

export class ApiWorkflowRepository implements IWorkflowRepository {
  async getTemplates(): Promise<OpsTemplate[]> {
    const data = await apiRequest<OpsTemplate[]>('/store/ops-templates');
    return data.map(normalizeTemplate);
  }

  async saveTemplate(template: OpsTemplate): Promise<void> {
    await apiRequest<void>(
      `/store/ops-templates/${encodeURIComponent(template.id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(normalizeTemplate(template)),
      },
    );
  }

  async deleteTemplate(id: string): Promise<void> {
    await apiRequest<void>(`/store/ops-templates/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  async getChecklists(): Promise<OpsChecklist[]> {
    const data = await apiRequest<OpsChecklist[]>('/store/ops-checklists');
    return data.map(normalizeChecklist);
  }

  async getChecklistById(id: string): Promise<OpsChecklist | undefined> {
    try {
      const checklist = await apiRequest<OpsChecklist>(
        `/store/ops-checklists/lookup/${encodeURIComponent(id)}`,
      );
      return normalizeChecklist(checklist);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Checklist not found')
      ) {
        return undefined;
      }

      if (error instanceof Error && error.message.includes('404')) {
        return undefined;
      }

      throw error;
    }
  }

  async saveChecklist(checklist: OpsChecklist): Promise<void> {
    await apiRequest<void>(
      `/store/ops-checklists/${encodeURIComponent(checklist.id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(normalizeChecklist(checklist)),
      },
    );
  }
}
