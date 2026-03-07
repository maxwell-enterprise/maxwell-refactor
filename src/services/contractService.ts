
import { ContractTemplate, ContractInstance, ClauseItem, MasterNode } from '../types/contract';
import { APP_CONFIG } from '../lib/config';
import { DevDatabase } from '../utils/devDatabase';
import { supabase } from '../lib/supabaseClient';
import { CommunicationService } from './communicationService';
import { WhatsAppService } from './whatsappService';
import { DataService } from './dataService'; // Needed for member lookup
import { STORE_PRODUCTS } from '../constants';

// --- SEED DATA FROM PDF ---
const SEED_CLAUSES: ClauseItem[] = [
    // SECTION: Payment & Ticket Policies
    { id: 'CL-PAY-01', section: 'Payment & Ticket Policies', title: 'Full Payment', text: 'Program fees must be made in full before attending IMC.' },
    { id: 'CL-PAY-02', section: 'Payment & Ticket Policies', title: 'Video Completion', text: 'MLCTM must complete all Speaking, Coaching, and Mastermind videos on the online platform before attending IMC.' },
    { id: 'CL-PAY-03', section: 'Payment & Ticket Policies', title: 'Certification Req', text: 'MLCT Certificate will be issued after MLCTM completes all the Speaking, Coaching, and Mastermind content, and have attended IMC for 2 full days.' },
    { id: 'CL-PAY-04', section: 'Payment & Ticket Policies', title: 'Platform Access', text: 'Access to platform is according to payments made: IDR 30 million paid = 10% content; 100% paid = 100% content. 30 days late payment - access will be suspended until payment resumes.' },
    { id: 'CL-PAY-05', section: 'Payment & Ticket Policies', title: 'Non-transferable', text: 'MLCT certificate is non-transferable.' },
    { id: 'CL-PAY-06', section: 'Payment & Ticket Policies', title: 'No Group Discounts', text: 'There are no group discounts for couples, families, community, and professional groups.' },
    { id: 'CL-PAY-07', section: 'Payment & Ticket Policies', title: 'Platform Sharing', text: 'MLCTM may not share the MLCT platform access to their spouse, children, friends or friends.' },
    { id: 'CL-PAY-08', section: 'Payment & Ticket Policies', title: 'Ticket Transfer', text: 'Ticket to Mentorship and all other events except IMC is transferable, but not refundable or exchangeable for monetary value. This ticket is valid until you attend the conference.' },
    { id: 'CL-PAY-09', section: 'Payment & Ticket Policies', title: 'Ticket Expiry', text: 'Failure to pay after 90 days, will be subject to a delinquent account whereby the membership and all its benefits will be permanently deleted with no refunds to all the payments made.' },
    
    // SECTION: Code of Conduct
    { id: 'CL-CODE-01', section: 'Code of Conduct', title: 'Integrity', text: 'Integrity – I walk with integrity with everyone and in everything I do, including words, deeds, financial dealings, conduct, personal relationships and business relationships.' },
    { id: 'CL-CODE-02', section: 'Code of Conduct', title: 'Truth', text: 'Truth – I am truthful in my interactions always.' },
    { id: 'CL-CODE-03', section: 'Code of Conduct', title: 'Excellence', text: 'Excellence – I am committed to excellence in everything I do.' },
    { id: 'CL-CODE-04', section: 'Code of Conduct', title: 'Honor', text: 'Honor – I honor every member of the Maxwell Leadership Certified Team.' },
    
    // SECTION: Social Media
    { id: 'CL-SOC-01', section: 'Social Media Guidelines', title: 'Images', text: 'Images: communicate using static (not GIF or Video) images in good taste; avoid links to (or posts shared from) other sites.' },
    { id: 'CL-SOC-02', section: 'Social Media Guidelines', title: 'General Content', text: 'Relate clearly to our MLCT lines of business, MLCT events, products, or services; share short relevant questions or ideas; encourage one another.' },
    
    // SECTION: Intellectual Property
    { id: 'CL-IP-01', section: 'Intellectual Property', title: 'John Maxwell Material', text: 'All John Maxwell material that is licensed to team members to use must be utilized with copyright/trademark credit to John Maxwell.' },
    { id: 'CL-IP-02', section: 'Intellectual Property', title: 'Usage Rights', text: 'Usage of material is provided through licensure of certain materials to Maxwell Leadership Certified Team members based on their Membership level. Please see "Rights of Use Document" to determine how and what material may be used.' }
];

// Helper to generate tree nodes from flat clauses
const generateNodesFromClauses = (clauseIds: string[]): MasterNode[] => {
    const selectedClauses = SEED_CLAUSES.filter(c => clauseIds.includes(c.id));
    const sections = Array.from(new Set(selectedClauses.map(c => c.section)));
    
    return sections.map((sec, idx) => ({
        id: `SEC-${idx}-${Date.now()}`,
        type: 'SECTION',
        label: sec,
        children: selectedClauses.filter(c => c.section === sec).map(c => ({
            id: c.id,
            type: 'CLAUSE',
            label: c.title,
            text: c.text,
            isMandatory: true
        }))
    }));
};

const SEED_TEMPLATES: ContractTemplate[] = [
    {
        id: 'TMPL-FULL-2026',
        productId: 'PKG-MLCT-2026',
        productName: 'MLCT Full Membership 2026',
        name: 'Standard MLCT Agreement 2026',
        selectedClauseIds: SEED_CLAUSES.map(c => c.id),
        rootNodes: generateNodesFromClauses(SEED_CLAUSES.map(c => c.id)),
        version: '1.0',
        isActive: true,
        customHeader: [
            { id: 'def-1', label: 'Member Name', valueTemplate: '<<FULLNAME>>', width: 'HALF' },
            { id: 'def-2', label: 'Total Fees', valueTemplate: '<<TOTALFEES>>', width: 'HALF' },
        ],
        layoutConfig: { 
            showHeaderGrid: true,
            showBonusTable: false, 
            showResourcesTable: false,
            showInclusionsTable: true
        }
    }
];

export const ContractService = {
    
    // --- CLAUSE LIBRARY ---
    getLibrary: async (): Promise<ClauseItem[]> => {
        if (APP_CONFIG.USE_MOCK) {
            try {
                if (await DevDatabase.isEmpty('contract_master_catalog')) await DevDatabase.bulkAdd('contract_master_catalog', SEED_CLAUSES);
                return await DevDatabase.getAll<ClauseItem>('contract_master_catalog');
            } catch(e) { return SEED_CLAUSES; }
        }
        if (!supabase) return [];
        const { data } = await supabase.from('contract_master_catalog').select('*');
        return data || [];
    },

    getMasterCatalog: async (): Promise<ClauseItem[]> => {
        return ContractService.getLibrary();
    },

    addClausesToLibrary: async (clauses: ClauseItem[]): Promise<void> => {
        if (APP_CONFIG.USE_MOCK) {
            await DevDatabase.bulkAdd('contract_master_catalog', clauses);
            return;
        }
        if (!supabase) return;
        await supabase.from('contract_master_catalog').upsert(clauses);
    },

    // --- TEMPLATES ---
    getTemplates: async (): Promise<ContractTemplate[]> => {
        if (APP_CONFIG.USE_MOCK) {
            try {
                if (await DevDatabase.isEmpty('contract_templates')) await DevDatabase.bulkAdd('contract_templates', SEED_TEMPLATES);
                return await DevDatabase.getAll<ContractTemplate>('contract_templates');
            } catch(e) { return SEED_TEMPLATES; }
        }
        if (!supabase) return [];
        const { data } = await supabase.from('contract_templates').select('*');
        return data || [];
    },

    getTemplateById: async (id: string): Promise<ContractTemplate | undefined> => {
        const templates = await ContractService.getTemplates();
        return templates.find(t => t.id === id);
    },

    saveTemplate: async (template: ContractTemplate): Promise<void> => {
        if (APP_CONFIG.USE_MOCK) {
            await DevDatabase.add('contract_templates', template);
            return;
        }
        if (!supabase) return;
        await supabase.from('contract_templates').upsert(template);
    },

    // --- INSTANCE ---
    getInstances: async (): Promise<ContractInstance[]> => {
        if (APP_CONFIG.USE_MOCK) {
            return await DevDatabase.getAll<ContractInstance>('contract_instances');
        }
        if (!supabase) return [];
        const { data } = await supabase.from('contract_instances').select('*');
        return data || [];
    },

    getMyContracts: async (userId: string): Promise<ContractInstance[]> => {
        const all = await ContractService.getInstances();
        return all.filter(c => c.memberId === userId);
    },

    createInstance: async (productId: string, memberId: string, transactionId: string, amount: number): Promise<ContractInstance | null> => {
        const templates = await ContractService.getTemplates();
        // Fallback to the first available template if exact product match fails (for demo purposes)
        let template = templates.find(t => t.productId === productId && t.isActive);
        if (!template && templates.length > 0) template = templates[0];
        
        if (!template) {
            console.log(`[CONTRACT] No active template found for product ${productId}`);
            return null;
        }

        const library = await ContractService.getLibrary();
        const clauses = library.filter(c => template!.selectedClauseIds.includes(c.id));

        // FETCH MEMBER DATA FOR SNAPSHOT
        const members = await DataService.getMembers();
        const member = members.find(m => m.id === memberId);

        const newInstance: ContractInstance = {
            id: `CTR-${Date.now()}`,
            transactionId,
            memberId,
            templateId: template.id,
            status: 'DRAFT',
            clauses: clauses,
            rootNodes: template.rootNodes, // Copy the tree structure
            selectedNodeIds: template.selectedClauseIds,
            
            // --- CRITICAL FIX: COPY CUSTOM COMPONENTS FROM TEMPLATE ---
            customHeader: template.customHeader,
            customTables: template.customTables,

            customerData: {
                name: member?.name || 'Unknown Member',
                mlctNumber: member?.id || 'PENDING',
                joinDate: member?.joinMonth || new Date().toISOString().split('T')[0],
                programName: template.productName,
                totalFees: amount,
                email: member?.email || '',
                phone: member?.phone || '',
                address: member?.address?.city || ''
            }
        };

        if (APP_CONFIG.USE_MOCK) {
            await DevDatabase.add('contract_instances', newInstance);
        } else if (supabase) {
            await supabase.from('contract_instances').insert(newInstance);
        }

        return newInstance;
    },

    // --- RETROACTIVE GENERATION ---
    scanMissingContracts: async (): Promise<any[]> => {
        // 1. Get all members/transactions
        const members = await DataService.getMembers();
        // 2. Get all existing contracts
        const contracts = await ContractService.getInstances();
        
        // 3. Find members who are "MEMBER" or "CERTIFIED" but have no contract
        const missing = members.filter(m => {
            const hasContract = contracts.some(c => c.memberId === m.id);
            const isPayingMember = m.lifecycleStage === 'MEMBER' || m.lifecycleStage === 'CERTIFIED' || m.lifecycleStage === 'FACILITATOR';
            return isPayingMember && !hasContract;
        });

        return missing.map(m => ({
            memberId: m.id,
            memberName: m.name,
            program: m.program,
            joinDate: m.joinMonth
        }));
    },

    batchGenerate: async (memberIds: string[]): Promise<void> => {
        for (const mid of memberIds) {
            // Find a suitable template (Mocking product ID map)
            // In real app, we look up their purchase history
            await ContractService.createInstance('PKG-MLCT-2026', mid, `TRX-HIST-${mid}`, 30000000);
        }
    },

    publishContract: async (instanceId: string): Promise<void> => {
        if (APP_CONFIG.USE_MOCK) {
            const instances = await DevDatabase.getAll<ContractInstance>('contract_instances');
            const instance = instances.find(i => i.id === instanceId);
            if (instance) {
                instance.status = 'PUBLISHED';
                await DevDatabase.add('contract_instances', instance);
                
                // Triggers
                await CommunicationService.sendTransactionalEmail('TPL-GENERAL', instance.customerData.email, { subject: 'Contract Ready', body: 'Please sign.'});
                await WhatsAppService.processSystemTrigger('CONTRACT_READY', { name: instance.customerData.name, phone: instance.customerData.phone }, { document_name: instance.customerData.programName, sign_link: '#' });
            }
        }
    },

    signContract: async (instanceId: string, signatureUrl: string): Promise<void> => {
        if (APP_CONFIG.USE_MOCK) {
            const instances = await DevDatabase.getAll<ContractInstance>('contract_instances');
            const instance = instances.find(i => i.id === instanceId);
            if (instance) {
                instance.status = 'SIGNED';
                instance.signedAt = new Date().toISOString();
                instance.signatureUrl = signatureUrl;
                await DevDatabase.add('contract_instances', instance);
                
                await WhatsAppService.processSystemTrigger('CONTRACT_SIGNED', { name: instance.customerData.name, phone: instance.customerData.phone }, { signed_date: new Date().toLocaleDateString() });
            }
        }
    }
};
