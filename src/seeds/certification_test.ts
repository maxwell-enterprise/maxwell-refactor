import { Event, AttendanceRecord, Member } from '../types/index';

// 1. A CERTIFICATION SERIES
export const CERT_TEST_SERIES: Event = {
    id: 'SERIES-TEST-CERT',
    name: 'Leadership Certification 2025 (Test)',
    date: '2025-01-01',
    location: 'Hybrid',
    locationMode: 'HYBRID',
    capacity: 100,
    attendees: 0,
    revenue: 0,
    status: 'Upcoming',
    type: 'CONTAINER', // Updated
    creditTags: ['CERT_TEST_PASS'],
    admissionPolicy: 'PRE_BOOKED'
};

// 2. CHILD SESSIONS
export const CERT_TEST_SESSIONS: Event[] = [
    { id: 'MOD-01', parentEventId: 'SERIES-TEST-CERT', name: 'Mod 1: Vision', date: '2025-01-10', location: 'Zoom', locationMode: 'ONLINE', type: 'SESSION', status: 'Completed', capacity: 50, attendees: 0, revenue: 0, admissionPolicy: 'PRE_BOOKED', creditTags: [] },
    { id: 'MOD-02', parentEventId: 'SERIES-TEST-CERT', name: 'Mod 2: Integrity', date: '2025-02-10', location: 'Zoom', locationMode: 'ONLINE', type: 'SESSION', status: 'Completed', capacity: 50, attendees: 0, revenue: 0, admissionPolicy: 'PRE_BOOKED', creditTags: [] },
    { id: 'MOD-03', parentEventId: 'SERIES-TEST-CERT', name: 'Mod 3: Strategy', date: '2025-03-10', location: 'Zoom', locationMode: 'ONLINE', type: 'SESSION', status: 'Upcoming', capacity: 50, attendees: 0, revenue: 0, admissionPolicy: 'PRE_BOOKED', creditTags: [] },
    { id: 'MOD-04', parentEventId: 'SERIES-TEST-CERT', name: 'Mod 4: Influence', date: '2025-04-10', location: 'Zoom', locationMode: 'ONLINE', type: 'SESSION', status: 'Upcoming', capacity: 50, attendees: 0, revenue: 0, admissionPolicy: 'PRE_BOOKED', creditTags: [] },
];

// 3. MOCK MEMBERS (Students)
export const CERT_TEST_MEMBERS: Member[] = [
    { id: 'STU-01', name: 'Alice Star', email: 'alice@test.com', phone: '0811', category: 'Member', scholarship: false, joinMonth: '2025-01', program: 'Certification', mentorshipDuration: 12, nTagStatus: 'Received', platform: 'IN', regInUS: false, lifecycleStage: 'MEMBER' },
    { id: 'STU-02', name: 'Bob Builder', email: 'bob@test.com', phone: '0812', category: 'Member', scholarship: false, joinMonth: '2025-01', program: 'Certification', mentorshipDuration: 12, nTagStatus: 'Received', platform: 'IN', regInUS: false, lifecycleStage: 'MEMBER' },
    { id: 'STU-03', name: 'Charlie Chap', email: 'charlie@test.com', phone: '0813', category: 'Member', scholarship: false, joinMonth: '2025-01', program: 'Certification', mentorshipDuration: 12, nTagStatus: 'Received', platform: 'IN', regInUS: false, lifecycleStage: 'MEMBER' }
];

// 4. ATTENDANCE HISTORY (Initial State)
export const CERT_TEST_ATTENDANCE: AttendanceRecord[] = [
    // Alice: Perfect Attendance so far
    { id: 'ATT-01-A', eventId: 'MOD-01', memberId: 'STU-01', memberName: 'Alice Star', memberEmail: 'alice@test.com', eventName: 'Mod 1', scannedAt: '2025-01-10', method: 'GATE_SCAN', verificationCode: 'OK', eventColor: '#000', status: 'SUCCESS' },
    { id: 'ATT-02-A', eventId: 'MOD-02', memberId: 'STU-01', memberName: 'Alice Star', memberEmail: 'alice@test.com', eventName: 'Mod 2', scannedAt: '2025-02-10', method: 'GATE_SCAN', verificationCode: 'OK', eventColor: '#000', status: 'SUCCESS' },
    
    // Bob: Missed Mod 2
    { id: 'ATT-01-B', eventId: 'MOD-01', memberId: 'STU-02', memberName: 'Bob Builder', memberEmail: 'bob@test.com', eventName: 'Mod 1', scannedAt: '2025-01-10', method: 'GATE_SCAN', verificationCode: 'OK', eventColor: '#000', status: 'SUCCESS' },
    
    // Charlie: New joiner, no attendance
];