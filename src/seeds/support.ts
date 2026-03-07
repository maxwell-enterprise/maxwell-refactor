
import { SupportTicket, UserRole } from '../types/index';

export const MOCK_TICKETS_SEED: SupportTicket[] = [
    {
        id: 'TKT-001',
        memberId: 'M0002',
        memberName: 'David Pratomo',
        subject: 'Cannot access Module 4 on LMS',
        description: 'I get a 403 Forbidden error when clicking the link.',
        priority: 'HIGH',
        status: 'NEW',
        assignedRole: UserRole.FACILITATOR,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'TKT-002',
        memberId: 'M0004',
        memberName: 'Budijanto Jutanti Gunawan',
        subject: 'Invoice incorrect amount',
        description: 'The invoice shows 30jt but I have a 10% discount.',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        assignedRole: UserRole.FINANCE,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date().toISOString()
    }
];
