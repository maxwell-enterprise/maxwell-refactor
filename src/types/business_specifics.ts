
// Types specific to the detailed business requirements

export type RoundTableProgram = 'iChoose' | 'iDo' | 'iLead';

export interface RoundTableSession {
    id: string;
    facilitatorId: string;
    schoolName: string;
    program: RoundTableProgram;
    currentLesson: number; // 1 to 16
    totalParticipants: number;
    startDate: string;
    status: 'ACTIVE' | 'COMPLETED';
    createdAt: string;
}

export interface TaxInvoiceDetails {
    transactionId: string;
    npwp: string;
    companyName: string;
    companyAddress: string;
    fakturPajakNo: string;
    taxAmount: number;
    generatedAt: string;
}

export interface YouthMetric {
    id: string;
    schoolName: string;
    contactPerson: string;
    status: 'LEAD' | 'MOU_SIGNED' | 'PROGRAM_ACTIVE';
    studentsImpacted: number;
    programType: RoundTableProgram;
}

export interface RoyaltySplit {
    sourceTransactionId: string;
    amountDT: number;
    amountJohn: number;
    amountOrg: number;
    calculatedAt: string;
}
