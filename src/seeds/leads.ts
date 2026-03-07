
import { Member } from '../types/index';

const today = new Date();
const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
const currentYear = today.getFullYear();

export const LEAD_DATA_SEED: Member[] = [
    // 1. HOT LEAD - CORPORATE DECISION MAKER
    {
        id: "L-001",
        name: "Bambang Wijaya",
        email: "b.wijaya@megatech.co.id",
        phone: "628119988776",
        category: "Guest", // Still a guest until paid
        scholarship: false,
        joinMonth: `${currentYear}-${currentMonth}`,
        program: "Corporate Inquiry",
        mentorshipDuration: 0,
        nTagStatus: "Not yet",
        platform: "IN",
        regInUS: false,
        lifecycleStage: "IDENTIFIED",
        company: "Mega Tech Indonesia",
        jobTitle: "Chief Executive Officer",
        industry: "Technology",
        tags: ["Decision_Maker", "High_Net_Worth", "B2B_Potential"],
        address: { city: "Jakarta Selatan" }
    },
    // 2. WARM LEAD - HR MANAGER (Active Participant)
    {
        id: "L-002",
        name: "Siti Aminah",
        email: "siti.hr@banknasional.com",
        phone: "628123456789",
        category: "Guest",
        scholarship: false,
        joinMonth: `${currentYear}-${currentMonth}`,
        program: "Training Inquiry",
        mentorshipDuration: 0,
        nTagStatus: "Not yet",
        platform: "IN",
        regInUS: false,
        lifecycleStage: "PARTICIPANT", // Has attended free webinars
        company: "Bank Nasional",
        jobTitle: "L&D Manager",
        industry: "Banking",
        tags: ["Corporate_HR", "Team_Training"],
        address: { city: "Jakarta Pusat" }
    },
    // 3. COLD LEAD - MINIMAL INFO
    {
        id: "L-003",
        name: "Rudi Hartono",
        email: "rudi.gamer123@gmail.com",
        phone: "6285551234",
        category: "Guest",
        scholarship: false,
        joinMonth: `${currentYear}-${currentMonth}`,
        program: "General Interest",
        mentorshipDuration: 0,
        nTagStatus: "Not yet",
        platform: "Digital",
        regInUS: false,
        lifecycleStage: "GUEST",
        tags: [],
        address: {}
    },
    // 4. WARM LEAD - SME OWNER
    {
        id: "L-004",
        name: "Maya Creative",
        email: "maya@designstudio.id",
        phone: "628188822233",
        category: "Guest",
        scholarship: false,
        joinMonth: `${currentYear}-${currentMonth}`,
        program: "Entrepreneurship",
        mentorshipDuration: 0,
        nTagStatus: "Not yet",
        platform: "IN",
        regInUS: false,
        lifecycleStage: "IDENTIFIED",
        company: "Maya Design Studio",
        jobTitle: "Owner",
        tags: ["SME", "Networking"],
        address: { city: "Bandung" }
    },
    // 5. SCHOLARSHIP SEEKER
    {
        id: "L-005",
        name: "Andi Pratama",
        email: "andi.student@univ.ac.id",
        phone: "628999000111",
        category: "Guest",
        scholarship: true, // Interested in scholarship
        joinMonth: `${currentYear}-${currentMonth}`,
        program: "Youth Leadership",
        mentorshipDuration: 0,
        nTagStatus: "Not yet",
        platform: "Digital",
        regInUS: false,
        lifecycleStage: "IDENTIFIED",
        jobTitle: "Student Council President",
        tags: ["Youth_Leader", "Scholarship_Applicant"],
        address: { city: "Yogyakarta" }
    }
];
