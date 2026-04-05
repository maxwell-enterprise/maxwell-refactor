import { OpsChecklist, OpsTemplate } from '../../types/ops';
import { IWorkflowRepository } from '../contracts';
import { apiRequest } from './apiClient';

export class ApiWorkflowRepository implements IWorkflowRepository {
  async getTemplates(): Promise<OpsTemplate[]> {
    return apiRequest<OpsTemplate[]>('/store/ops-templates');
  }

  async saveTemplate(template: OpsTemplate): Promise<void> {
    await apiRequest(`/store/ops-templates/${encodeURIComponent(template.id)}`, {
      method: 'PUT',
      body: JSON.stringify(template),
    });
  }

  async deleteTemplate(id: string): Promise<void> {
    await apiRequest(`/store/ops-templates/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  async getChecklists(): Promise<OpsChecklist[]> {
    return apiRequest<OpsChecklist[]>('/store/ops-checklists');
  }

  async getChecklistById(id: string): Promise<OpsChecklist | undefined> {
    try {
      return await apiRequest<OpsChecklist>(
        `/store/ops-checklists/lookup/${encodeURIComponent(id)}`,
      );
    } catch {
      return undefined;
    }
  }

  async saveChecklist(checklist: OpsChecklist): Promise<void> {
    await apiRequest(`/store/ops-checklists/${encodeURIComponent(checklist.id)}`, {
      method: 'PUT',
      body: JSON.stringify(checklist),
    });
  }
}
