
import { DevDatabase } from '../../utils/devDatabase';
import { SchemaService, TableDefinition } from '../schemaService';

export interface HarvestedContext {
    tables: TableDefinition[];
    sampleData: Record<string, any[]>;
    enums: string; // Serialized string of important enums
}

export const ContextHarvester = {
    /**
     * Scrapes the current mock environment for structural and behavioral context
     */
    harvestCurrentState: async (): Promise<HarvestedContext> => {
        const tables = await SchemaService.getTables();
        const sampleData: Record<string, any[]> = {};

        // Get 2 sample rows per table for data pattern recognition
        for (const table of tables) {
            const data = await table.getData(1, 2);
            sampleData[table.tableName] = data;
        }

        // Hardcoded critical enums for business logic understanding
        const enums = `
            LifecycleStage: GUEST, IDENTIFIED, PARTICIPANT, MEMBER, CERTIFIED, FACILITATOR
            PaymentStatus: PENDING, WAITING_FOR_VERIFICATION, PAID, PARTIAL, OVERDUE, OVERPAID, REFUNDED, EXPIRED, FAILED
            ViewState: DASHBOARD, CRM, FINANCE, OPERATIONS, EVENTS_ADMIN, STORE_ADMIN, MARKETING
            TriageStatus: FOUND, AMBIGUOUS, NOT_FOUND
            AuthRole: SUPER_ADMIN, FINANCE, OPERATIONS, MARKETING, SALES, MEMBER, FACILITATOR
        `;

        return { tables, sampleData, enums };
    }
};
