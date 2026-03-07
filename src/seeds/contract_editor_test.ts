
import { ContractTemplate, MasterNode } from '../types/contract';

// A template specifically designed to test Table Preview, Deletion, Reordering and Signature
export const CONTRACT_EDITOR_TEST_SEED: ContractTemplate = {
    id: 'TMPL-TEST-EDITOR',
    productId: 'PKG-TEST-001',
    productName: 'Editor Reliability Test Package',
    name: 'Advanced Feature Test Agreement',
    version: '2.1',
    isActive: true,
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Maxwell_Logo.jpg',
    documentTitle: 'Service Agreement',
    documentSubtitle: 'Testing Environment',
    selectedClauseIds: [],
    customHeader: [
        { id: 'h1', label: 'Client Name', valueTemplate: '<<FULLNAME>>', width: 'HALF' },
        { id: 'h2', label: 'Date', valueTemplate: '<<DATEJOINED>>', width: 'HALF' }
    ],
    customTables: [
        {
            id: 'TBL-TEST-1',
            title: 'Deliverables Schedule',
            description: 'Phase 1 breakdown',
            columns: [
                { id: 'c1', headerLabel: 'Phase', widthPercent: 30 },
                { id: 'c2', headerLabel: 'Description', widthPercent: 70 }
            ],
            rows: [
                { id: 'r1', cells: { 'c1': 'Kickoff', 'c2': 'Initial meeting and requirement gathering' } },
                { id: 'r2', cells: { 'c1': 'Execution', 'c2': 'Implementation of agreed services' } }
            ]
        }
    ],
    rootNodes: [
        {
            id: 'SEC-01',
            type: 'SECTION',
            label: '1. Introduction',
            children: [
                {
                    id: 'CL-01',
                    type: 'CLAUSE',
                    label: 'Parties',
                    text: 'This agreement is made between Maxwell Leadership and <<FULLNAME>>.',
                    isMandatory: true
                }
            ]
        },
        {
            id: 'TBL-REF-01',
            type: 'TABLE_REF',
            label: 'Schedule Table',
            tableId: 'TBL-TEST-1'
        },
        {
            id: 'SEC-02',
            type: 'SECTION',
            label: '2. Terms',
            children: [
                {
                    id: 'CL-02',
                    type: 'CLAUSE',
                    label: 'Confidentiality',
                    text: 'Both parties agree to maintain strict confidentiality regarding all proprietary information.',
                    isMandatory: true
                }
            ]
        },
        {
            id: 'SIG-01',
            type: 'SIGNATURE',
            label: 'Signature Area',
            closingStatement: 'I, <<FULLNAME>>, hereby acknowledge and agree to the terms above.',
            showCompanySignature: true
        }
    ]
};
