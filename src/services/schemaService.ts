
import { VIRTUAL_DB, TABLE_METADATA } from '../constants/database';
import { APP_CONFIG } from '../lib/config';
import { OpsService } from './opsService';
import { CampaignService } from './campaignService';
import { EntitlementService, SEED_ENTITLEMENTS } from './entitlementService';
import { ScoutService } from './scoutService';
import { PaymentService } from './paymentService';
import { ConfigService } from './configService';
import { AuditService } from './auditService';
import { PermissionService } from './permissionService';
import { QueueService } from './queueService';
import { UserService } from './userService';
import { CartService } from './cartService';
import { QRService } from './qrService';
import { DiscountService } from './discountService';
import { ContentService } from './contentService';
import { CommunicationService } from './communicationService';
import { WhatsAppService } from './whatsappService';
import { GamificationService } from './gamificationService'; 
import { PDFService } from './pdfService'; 
import { ContractService } from './contractService'; 
import { EnablementService } from './enablementService'; 
import { SupportService } from './supportService'; 
import { DigitalTwinService } from './digitalTwinService'; 
import { MentoringService } from './mentoringService';
import { TribeService } from './tribeService';
import { AIUsageService } from './aiUsageService'; // Added
import { ResearchPersistenceService } from './researchPersistenceService'; // Added
import { CreditTagService } from './creditTagService'; // Added
import { DevDatabase } from '../utils/devDatabase'; // Added for direct access
import { AUTH_TEST_MEMBER, AUTH_TEST_WALLET_ITEMS } from '../seeds/auth_test_user'; // NEW

export interface TableColumn {
    name: string;
    type: 'uuid' | 'text' | 'number' | 'boolean' | 'json' | 'timestamp' | 'array';
    isPk?: boolean;
    isFk?: boolean;
    fkTarget?: string;
    description?: string;
    isMandatory?: boolean;
    cardinality?: string; // New field for schema analysis
    constraints?: string; // New field
}

export type TableCategory = 'CORE_IAM' | 'FINANCE_COMMERCE' | 'OPS_LOGISTICS' | 'CRM_SALES' | 'ENGAGEMENT_LMS' | 'COMMUNICATION' | 'SYSTEM';

export interface TableDefinition {
    tableName: string;
    category: TableCategory;
    description: string;
    columns: TableColumn[];
    rowCount: number;
    getData: (page: number, pageSize: number) => Promise<any[]>;
}

// Updated Category Mapping based on full DevDatabase scan AND new SQL tables
const getCategory = (tableName: string): TableCategory => {
    // CORE / IAM
    if (['sys_internal_users', 'auth_roles', 'user_entitlements', 'system_security_logs', 'user_entitlements_abac', 'system_settings', 'schema_optimizations'].includes(tableName)) return 'CORE_IAM';
    
    // FINANCE
    if (['products', 'transactions', 'payment_transactions', 'payout_transactions', 'active_shopping_carts', 'discounts', 'discount_redemption_logs', 'payment_gateway_attempts', 'tax_invoices', 'royalty_splits', 'pricing_rules', 'commission_rules', 'wallet_transactions'].includes(tableName)) return 'FINANCE_COMMERCE';
    
    // OPS
    if (['events', 'inventory', 'inventory_transactions', 'ops_checklists', 'ops_templates', 'ops_tasks', 'ops_workflow_definitions', 'event_attendance_ledger', 'contract_templates', 'contract_instances', 'contract_master_catalog', 'ref_master_tiers', 'credit_tags', 'master_events', 'master_access_tags', 'event_access_rules', 'event_attendance_logs'].includes(tableName)) return 'OPS_LOGISTICS';
    
    // CRM
    if (['members', 'corporate_members', 'lead_scout_conversations', 'research_results', 'support_tickets', 'member_activity_logs', 'youth_metrics'].includes(tableName)) return 'CRM_SALES';
    
    // ENGAGEMENT
    if (['gamification_profiles', 'gamification_badges', 'gamification_rules', 'gamification_user_profiles', 'wallet_items', 'gift_allocations', 'mentor_personas', 'mentoring_sessions', 'enablement_articles', 'enablement_quizzes', 'enablement_quiz_attempts', 'tribe_mentoring_sessions', 'round_table_sessions', 'certification_rules', 'master_done_tags', 'member_wallets'].includes(tableName)) return 'ENGAGEMENT_LMS';
    
    // COMMUNICATION
    if (['email_campaigns', 'email_templates', 'email_logs', 'whatsapp_task_queue', 'whatsapp_templates', 'cms_content', 'sys_pdf_templates', 'campaigns'].includes(tableName)) return 'COMMUNICATION';
    
    // SYSTEM
    if (['ai_usage_logs', 'system_background_jobs'].includes(tableName)) return 'SYSTEM';

    return 'SYSTEM';
};

export const SchemaService = {
    
    // NEW: Get the TRUE list of tables existing in IndexedDB
    getRealDBStructure: async (): Promise<string[]> => {
        const db = await DevDatabase.open();
        return Array.from(db.objectStoreNames);
    },

    getTables: async (): Promise<TableDefinition[]> => {
        // Inject Test Data for Auth Verification if needed
        if (APP_CONFIG.USE_MOCK) {
             const existingMembers = await DevDatabase.getAll<any>('members');
             if (!existingMembers.find(m => m.id === AUTH_TEST_MEMBER.id)) {
                 await DevDatabase.add('members', AUTH_TEST_MEMBER);
                 await DevDatabase.bulkAdd('wallet_items', AUTH_TEST_WALLET_ITEMS);
                 console.log("Injected Auth Test Member & Wallet");
             }
        }

        const staticTables = Object.entries(VIRTUAL_DB).map(([tableName, data]) => {
            return generateTableDefinition(tableName, data);
        });

        // Updated Registry to match DevDatabase.ts completely
        const dynamicDataPromises = [
            // --- EXISTING ---
            { name: 'ops_checklists', fetch: OpsService.getChecklists },
            { name: 'campaigns', fetch: CampaignService.getCampaigns },
            { name: 'ops_workflow_definitions', fetch: OpsService.getTemplates }, // This might be redundant if ops_templates is used
            { name: 'lead_scout_conversations', fetch: ScoutService.getAllSessions },
            { name: 'payment_gateway_attempts', fetch: PaymentService.getGatewayLogs },
            { name: 'member_activity_logs', fetch: AuditService.getAllLogs },
            { name: 'system_security_logs', fetch: PermissionService.getLogs },
            { name: 'system_background_jobs', fetch: QueueService.getJobs },
            { name: 'sys_internal_users', fetch: UserService.getAllUsers },
            { name: 'active_shopping_carts', fetch: CartService.getCarts },
            { name: 'event_attendance_ledger', fetch: QRService.getAttendanceLog },
            { name: 'discount_redemption_logs', fetch: DiscountService.getLogs },
            { name: 'support_tickets', fetch: SupportService.getTickets },
            { name: 'mentor_personas', fetch: async () => [await DigitalTwinService.getPersona('fac-1')] },
            { name: 'mentoring_sessions', fetch: async () => { const s = await MentoringService.getSession('M0002'); return [s]; } },
            { name: 'gift_allocations', fetch: EntitlementService.getAllGifts },
            { name: 'cms_content', fetch: ContentService.getAllContent },
            { name: 'email_campaigns', fetch: CommunicationService.getCampaigns },
            { name: 'email_templates', fetch: CommunicationService.getTemplates },
            { name: 'email_logs', fetch: CommunicationService.getLogs },
            { name: 'whatsapp_task_queue', fetch: WhatsAppService.getQueue },
            { name: 'whatsapp_templates', fetch: WhatsAppService.getTemplates },
            { name: 'gamification_user_profiles', fetch: GamificationService.getLeaderboard },
            { name: 'gamification_badges', fetch: GamificationService.getBadges },
            { name: 'gamification_rules', fetch: GamificationService.getRules },
            { name: 'sys_pdf_templates', fetch: PDFService.getTemplates },
            { name: 'contract_templates', fetch: ContractService.getTemplates },
            { name: 'contract_instances', fetch: ContractService.getInstances }, 
            { name: 'contract_master_catalog', fetch: ContractService.getMasterCatalog },
            { name: 'enablement_articles', fetch: EnablementService.getArticles },
            { name: 'enablement_quizzes', fetch: EnablementService.getQuizzes },
            { name: 'enablement_quiz_attempts', fetch: async () => EnablementService.getUserHistory('M0002') },
            { name: 'user_entitlements_abac', fetch: async () => SEED_ENTITLEMENTS }, // Virtual table
            { name: 'corporate_members', fetch: async () => EntitlementService.getTeamMembers('ORG-BCA') },
            { name: 'system_settings', fetch: async () => [ConfigService.getConfig()] },
            // Fix: Changed getMyWallet to getWalletItems
            { name: 'wallet_items', fetch: async () => EntitlementService.getWalletItems('user-1') },
            { name: 'payment_transactions', fetch: PaymentService.getGatewayLogs },
            { name: 'payout_transactions', fetch: TribeService.getAllPayouts },
            { name: 'inventory_transactions', fetch: OpsService.getInventoryTransactions },
            
            // --- NEW: CREDIT TAGS ---
            { name: 'credit_tags', fetch: CreditTagService.getAllTags },

            // --- MISSING TABLES ADDED via GENERIC FETCH or Specific Service ---
            { name: 'ai_usage_logs', fetch: AIUsageService.getLogs },
            { name: 'gamification_profiles', fetch: GamificationService.getAllProfiles }, // Using repo method indirectly if service exposes it, or fallback
            { name: 'ops_templates', fetch: OpsService.getTemplates },
            { name: 'research_results', fetch: ResearchPersistenceService.getAllResults },
            { name: 'user_entitlements', fetch: async () => DevDatabase.getAll('user_entitlements') }, // Real DB table

            // --- OTHER MISSING TABLES FROM DEV DATABASE SCAN ---
            { name: 'round_table_sessions', fetch: async () => DevDatabase.getAll('round_table_sessions') },
            { name: 'tax_invoices', fetch: async () => DevDatabase.getAll('tax_invoices') },
            { name: 'royalty_splits', fetch: async () => DevDatabase.getAll('royalty_splits') },
            { name: 'youth_metrics', fetch: async () => DevDatabase.getAll('youth_metrics') },
            { name: 'pricing_rules', fetch: async () => DevDatabase.getAll('pricing_rules') },
            { name: 'commission_rules', fetch: async () => DevDatabase.getAll('commission_rules') },
            { name: 'ref_master_tiers', fetch: async () => DevDatabase.getAll('ref_master_tiers') },
            { name: 'certification_rules', fetch: async () => DevDatabase.getAll('certification_rules') },
            { name: 'master_done_tags', fetch: async () => DevDatabase.getAll('master_done_tags') },
            { name: 'tribe_mentoring_sessions', fetch: async () => DevDatabase.getAll('tribe_mentoring_sessions') },
            { name: 'schema_optimizations', fetch: async () => DevDatabase.getAll('schema_optimizations') },
        ];

        const dynamicTables = await Promise.all(dynamicDataPromises.map(async (item) => {
            const data = await item.fetch();
            // Fallback safety if fetch returns undefined/null
            return generateTableDefinition(item.name, Array.isArray(data) ? data : []);
        }));

        const checklists = await OpsService.getChecklists();
        const tasksData = checklists.flatMap(c => c.tasks.map(t => ({
            ...t, 
            checklist_id: c.id, 
            checklist_product: c.productName 
        })));
        const tasksTable = generateTableDefinition('ops_tasks', tasksData);

        // Deduplicate: If static table exists, use it. If dynamic overrides, use dynamic.
        const allTablesMap = new Map<string, TableDefinition>();
        
        // 1. Add Static (VIRTUAL_DB) first - this ensures our new SQL tables are present
        staticTables.forEach(t => allTablesMap.set(t.tableName, t));
        
        // 2. Add Dynamic - only overwrite if data is robust
        dynamicTables.forEach(t => {
            if (!allTablesMap.has(t.tableName) || t.rowCount > 0) {
                 allTablesMap.set(t.tableName, t);
            }
        });
        
        allTablesMap.set(tasksTable.tableName, tasksTable);

        return Array.from(allTablesMap.values()).sort((a, b) => a.tableName.localeCompare(b.tableName));
    }
};

const generateTableDefinition = (tableName: string, data: any[]): TableDefinition => {
    const rowCount = data.length;
    const sampleRow = rowCount > 0 ? data[0] : {};
    
    const columns: TableColumn[] = Object.keys(sampleRow).map(key => {
        const value = sampleRow[key];
        const type = detectType(value);
        const isPk = key === 'id' || key === 'sku' || key === 'code';
        
        let isFk = false;
        let fkTarget = '';
        if (key !== 'id' && (key.endsWith('Id') || key.endsWith('_id'))) {
            isFk = true;
            const baseName = key.replace(/Id$|_id$/, '');
            fkTarget = `${baseName}s.id`;
        }

        return {
            name: key,
            type: type,
            isPk: isPk,
            isFk: isFk,
            fkTarget: isFk ? fkTarget : undefined,
            description: key === 'id' ? 'Primary Key' : ''
        };
    });

    return {
        tableName: tableName,
        category: getCategory(tableName),
        description: TABLE_METADATA[tableName] || `Dynamic table for ${tableName}.`,
        columns: columns,
        rowCount: rowCount,
        getData: async (page, size) => {
            return new Promise(resolve => setTimeout(() => resolve(data.slice((page-1)*size, page*size)), 200));
        }
    };
};

const detectType = (val: any): TableColumn['type'] => {
    if (Array.isArray(val)) return 'array';
    if (typeof val === 'number') return 'number';
    if (typeof val === 'boolean') return 'boolean';
    if (typeof val === 'object' && val !== null) return 'json';
    if (typeof val === 'string' && !isNaN(Date.parse(val)) && val.length > 10 && (val.includes('-') || val.includes('/'))) return 'timestamp';
    return 'text';
};
