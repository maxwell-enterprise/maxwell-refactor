
import { ContractTemplate } from '../types/contract';

// Seed for testing PDF Export capabilities
export const CONTRACT_EXPORT_TEST_SEED: ContractTemplate = {
    id: 'TMPL-PDF-TEST',
    productId: 'PKG-TEST-PDF',
    productName: 'PDF Export Quality Test',
    name: 'Official Service Agreement (Print Ready)',
    version: '3.0',
    isActive: true,
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Maxwell_Logo.jpg',
    documentTitle: 'Professional Services Agreement',
    documentSubtitle: 'Strictly Confidential',
    selectedClauseIds: [],
    customHeader: [
        { id: 'h1', label: 'Client', valueTemplate: '<<FULLNAME>>', width: 'HALF' },
        { id: 'h2', label: 'Agreement Date', valueTemplate: '<<DATEJOINED>>', width: 'HALF' },
        { id: 'h3', label: 'Service Scope', valueTemplate: '<<PROGRAMNAME>>', width: 'FULL' }
    ],
    customTables: [
        {
            id: 'TBL-FEES',
            title: 'Fee Schedule',
            description: 'Breakdown of service charges',
            columns: [
                { id: 'c1', headerLabel: 'Item Description', widthPercent: 60 },
                { id: 'c2', headerLabel: 'Amount (IDR)', widthPercent: 40 }
            ],
            rows: [
                { id: 'r1', cells: { 'c1': 'Consultation Fee', 'c2': '15.000.000' } },
                { id: 'r2', cells: { 'c1': 'Implementation', 'c2': '35.000.000' } },
                { id: 'r3', cells: { 'c1': 'Total', 'c2': '50.000.000' } }
            ]
        }
    ],
    rootNodes: [
        {
            id: 'SEC-A',
            type: 'SECTION',
            label: 'Article 1: Scope of Work',
            children: [
                {
                    id: 'CL-A1',
                    type: 'CLAUSE',
                    label: 'Definitions',
                    text: 'The "Service Provider" refers to Maxwell Leadership. The "Client" refers to <<FULLNAME>>.',
                    isMandatory: true
                },
                {
                    id: 'CL-A2',
                    type: 'CLAUSE',
                    label: 'Deliverables',
                    text: 'Provider agrees to deliver the training modules listed in the Fee Schedule below within 30 days of signing.',
                    isMandatory: true
                }
            ]
        },
        {
            id: 'TBL-REF-FEES',
            type: 'TABLE_REF',
            label: 'Fee Schedule Table',
            tableId: 'TBL-FEES'
        },
        {
            id: 'SEC-B',
            type: 'SECTION',
            label: 'Article 2: Payment Terms',
            children: [
                {
                    id: 'CL-B1',
                    type: 'CLAUSE',
                    label: 'Invoicing',
                    text: 'Invoices shall be paid within 14 days of receipt. Late payments are subject to a 5% penalty.',
                    isMandatory: true
                }
            ]
        },
        {
            id: 'SIG-BLOCK',
            type: 'SIGNATURE',
            label: 'Authorization',
            closingStatement: 'IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first above written.',
            showCompanySignature: true,
            companySignatoryName: 'Sarah Connor (Regional Director)'
        }
    ]
};
