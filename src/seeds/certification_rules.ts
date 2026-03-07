
import { CertificationRule } from '../types/certification';

export const CERTIFICATION_RULES_SEED: CertificationRule[] = [
    {
        id: 'CERT-MAX-FOUNDATION',
        name: 'Maxwell Foundation Certified',
        description: 'Awarded for completing the 3 introductory leadership sessions.',
        logic: 'REQUIRE_ALL',
        requiredTags: ['DONE_SESSION_A1', 'DONE_SESSION_A2', 'DONE_SESSION_A3'],
        isActive: true,
        badgeUrl: 'https://cdn-icons-png.flaticon.com/512/2921/2921222.png' // Mock icon
    },
    {
        id: 'CERT-LEADERSHIP-CORE',
        name: 'Core Leadership Practitioner',
        description: 'Awarded for completing any 5 Core modules.',
        logic: 'MIN_COUNT',
        requiredTags: [
            'DONE_SESSION_A1', 'DONE_SESSION_A2', 'DONE_SESSION_A3', 
            'DONE_SESSION_A4', 'DONE_SESSION_A5', 'DONE_SESSION_A6',
            'DONE_SESSION_A7', 'DONE_SESSION_A8'
        ],
        minCountValue: 5,
        isActive: true,
        badgeUrl: 'https://cdn-icons-png.flaticon.com/512/625/625398.png'
    },
    {
        id: 'CERT-MASTER-2026',
        name: 'Maxwell Mentorship Graduate 2026',
        description: 'Complete the full 2026 Mentorship Series.',
        logic: 'REQUIRE_ALL',
        requiredTags: [
            'DONE_SESSION_A1', 'DONE_SESSION_A2', 'DONE_SESSION_A3', 'DONE_SESSION_A4', 
            'DONE_SESSION_A5', 'DONE_SESSION_A6', 'DONE_SESSION_A7', 'DONE_SESSION_A8',
            'DONE_SESSION_A9', 'DONE_SESSION_A10', 'DONE_SESSION_A11', 'DONE_SESSION_A12',
            'DONE_SESSION_A13', 'DONE_SESSION_A14', 'DONE_SESSION_A15', 'DONE_SESSION_A16'
        ],
        isActive: true,
        badgeUrl: 'https://cdn-icons-png.flaticon.com/512/2997/2997235.png'
    }
];
