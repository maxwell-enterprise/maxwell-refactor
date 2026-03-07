
// MASTER CATALOG TYPES
export interface ClauseItem {
    id: string;
    section: string; // e.g., "Payment Policies", "Code of Conduct"
    title: string;   // e.g., "30 days late payment"
    text: string;    // The full legal text
    tags?: string[]; // e.g., ["Mandatory", "Finance"]
}

// NEW: Tree Node for Document Structure
export interface MasterNode {
    id: string;
    type: 'SECTION' | 'CLAUSE' | 'TABLE_REF' | 'SIGNATURE'; // Added SIGNATURE
    label: string;
    text?: string; // Only for CLAUSE
    tableId?: string; // Only for TABLE_REF (Points to a ContractTableDefinition id)
    children?: MasterNode[]; // Only for SECTION
    isMandatory?: boolean;
    
    // Signature Specifics
    closingStatement?: string; 
    showCompanySignature?: boolean;
    companySignatoryName?: string; // NEW: Customizable name for company rep
}

// NEW: Dynamic Header Configuration
export interface ContractHeaderField {
    id: string;
    label: string; // e.g. "Full Name"
    valueTemplate: string; // e.g. "<<FULLNAME>>"
    width?: 'HALF' | 'FULL'; // Grid span
}

// NEW: Dynamic Table Configuration
export interface ContractTableColumn {
    id: string;
    headerLabel: string;
    widthPercent?: number; // Optional width
}

export interface ContractTableRow {
    id: string;
    cells: Record<string, string>; // Map columnId -> value
}

export interface ContractTableDefinition {
    id: string;
    title: string;
    description?: string; // Subtitle
    columns: ContractTableColumn[];
    rows: ContractTableRow[];
}

// TEMPLATE TYPES
export interface ContractTemplate {
    id: string;
    productId: string; // ONE Template per Product
    productName: string; 
    name: string; // e.g., "MLCT Agreement 2025"
    
    // Document Styling
    logoUrl?: string;
    documentTitle?: string;
    documentSubtitle?: string;

    selectedClauseIds: string[]; // Legacy flat list reference
    rootNodes?: MasterNode[]; // Tree structure for visual ordering
    
    // NEW: Flexible Component Config
    customHeader?: ContractHeaderField[];
    customTables?: ContractTableDefinition[];

    version: string;
    isActive: boolean;
    
    // Legacy Toggles (Keep for backward compatibility during migration)
    layoutConfig?: {
        showHeaderGrid?: boolean;
        showBonusTable?: boolean;
        showResourcesTable?: boolean;
        showInclusionsTable?: boolean;
    };
}

// TRANSACTION INSTANCE TYPES
export interface ContractInstance {
    id: string;
    transactionId?: string;
    memberId: string;
    templateId: string;
    status: 'DRAFT' | 'PUBLISHED' | 'SIGNED';
    
    // Document Styling Snapshot
    logoUrl?: string;
    documentTitle?: string;
    documentSubtitle?: string;

    // Snapshot of clauses/nodes at the time of creation
    clauses: ClauseItem[];
    rootNodes?: MasterNode[]; 
    selectedNodeIds?: string[];
    
    // Snapshot of layout
    customHeader?: ContractHeaderField[];
    customTables?: ContractTableDefinition[];

    // Dynamic Data (Injected Variables)
    customerData: {
        name: string;
        mlctNumber: string;
        joinDate: string;
        programName: string;
        totalFees: number;
        email: string;
        phone: string;
        address: string;
    };

    signedAt?: string;
    signatureUrl?: string;
}
