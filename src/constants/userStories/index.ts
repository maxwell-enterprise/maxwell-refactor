
import { CRM_STORIES } from './crm';
import { FINANCE_STORIES } from './finance';
import { OPERATIONS_STORIES } from './operations';
import { UserStory } from '../../types/schemaOptimizer';

export const ALL_USER_STORIES: UserStory[] = [
    ...CRM_STORIES,
    ...FINANCE_STORIES,
    ...OPERATIONS_STORIES
];

export const getStoriesByEpic = (epic: string) => ALL_USER_STORIES.filter(s => s.epic === epic);
