
import { CreditTagMaster } from '../types/access';
import { RepositoryFactory } from './repositories/index';

export const CreditTagService = {
    
    getAllTags: async (): Promise<CreditTagMaster[]> => {
        return await RepositoryFactory.getCreditTagRepository().getAll();
    },

    upsertTag: async (tag: CreditTagMaster): Promise<void> => {
        // Enforce formatting
        const formattedTag = {
            ...tag,
            code: tag.code.toUpperCase().replace(/\s+/g, '_')
        };
        return await RepositoryFactory.getCreditTagRepository().upsert(formattedTag);
    },

    deleteTag: async (id: string): Promise<void> => {
        return await RepositoryFactory.getCreditTagRepository().delete(id);
    },

    // Helper to get simple list for dropdowns
    getTagOptions: async (): Promise<{ code: string, label: string }[]> => {
        const all = await CreditTagService.getAllTags();
        return all.filter(t => t.isActive).map(t => ({
            code: t.code,
            label: `${t.name} (${t.code})`
        }));
    },
    
    // Core Logic helper used by Entitlement Service fallback
    getTagDefinition: async (code: string) => {
        const all = await CreditTagService.getAllTags();
        return all.find(t => t.code === code);
    }
};
