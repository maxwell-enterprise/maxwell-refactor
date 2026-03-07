
import { Member } from '../types/index';

// Members specific to Certification Testing
export const CERT_INTEGRATION_MEMBERS: Member[] = [
    { 
        id: 'CERT-TEST-01', 
        name: 'Sarah Candidate', 
        email: 'sarah.c@test.com', 
        phone: '081100001', 
        category: 'Member', 
        scholarship: false, 
        joinMonth: '2025-01', 
        program: 'Certification', 
        mentorshipDuration: 12, 
        nTagStatus: 'Received', 
        platform: 'IN', 
        regInUS: false, 
        lifecycleStage: 'MEMBER',
        // Partially complete tags for "Core Leadership Practitioner" (Need 5, has 3)
        earnedDoneTags: ['DONE_SESSION_A1', 'DONE_SESSION_A2', 'DONE_SESSION_A3'] 
    },
    { 
        id: 'CERT-TEST-02', 
        name: 'Mike Master', 
        email: 'mike.m@test.com', 
        phone: '081100002', 
        category: 'Member', 
        scholarship: false, 
        joinMonth: '2025-01', 
        program: 'Certification', 
        mentorshipDuration: 12, 
        nTagStatus: 'Received', 
        platform: 'IN', 
        regInUS: false, 
        lifecycleStage: 'CERTIFIED',
        // Fully complete
        earnedDoneTags: ['DONE_SESSION_A1', 'DONE_SESSION_A2', 'DONE_SESSION_A3', 'DONE_SESSION_A4', 'DONE_SESSION_A5'] 
    },
    { 
        id: 'CERT-TEST-03', 
        name: 'Newbie Nick', 
        email: 'nick@test.com', 
        phone: '081100003', 
        category: 'Member', 
        scholarship: false, 
        joinMonth: '2025-02', 
        program: 'Certification', 
        mentorshipDuration: 12, 
        nTagStatus: 'Not yet', 
        platform: 'IN', 
        regInUS: false, 
        lifecycleStage: 'MEMBER',
        // No tags
        earnedDoneTags: [] 
    }
];
