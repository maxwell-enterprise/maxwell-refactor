
import { OptimizationHistoryItem } from '../types/schemaOptimizer';

export const SEED_SCHEMA_HISTORY: OptimizationHistoryItem[] = [
    {
        id: 'HIST-SEED-001',
        version: 1,
        timestamp: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        summary: 'Initial Baseline Analysis',
        result: {
            originalSchema: [], // Populated dynamically in real app, kept empty for seed brevity or mock logic
            optimizedSchema: [],
            changes: [
                { type: 'RENAME_COLUMN', entity: 'members', field: 'joinMonth', oldValue: 'joinMonth', newValue: 'join_date', reason: 'Standardize to snake_case', impact: 'LOW' }
            ],
            sqlMigration: '-- Initial migration draft',
            analysisSummary: 'Detected inconsistent naming conventions across CRM module.'
        }
    }
];
