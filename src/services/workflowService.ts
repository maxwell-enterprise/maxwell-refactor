
// This service is now deprecated. 
// All Workflow logic (Templates, Instantiation) has been merged into OpsService and the new WorkflowRepository.
// We redirect calls to OpsService for backward compatibility if needed, though best practice is to update imports.

import { OpsService } from './opsService';

export const WorkflowService = {
    getTemplates: OpsService.getTemplates,
    saveTemplate: OpsService.saveTemplate,
    duplicateTemplate: OpsService.duplicateTemplate,
    deleteTemplate: OpsService.deleteTemplate,
    triggerWorkflow: OpsService.triggerWorkflow
};
