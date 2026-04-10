
import { Member } from '../types/index';

const today = new Date();
const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
const currentYear = today.getFullYear();

// Helper to generate mock Indonesian names for bulk data
const MOCK_NAMES = [
    "Agus Santoso", "Budi Wijaya", "Citra Lestari", "Dewi Ratnasari", "Eko Prasetyo",
    "Fajar Nugroho", "Gita Gutawa", "Hendra Setiawan", "Indah Permatasari", "Joko Susilo"
];

export const MEMBER_DATA_SEED: Member[] = [
  // --- SCENARIO PERSONAS (USE THESE FOR TESTING) ---
  
  // 1. VIP MEMBER (Sultan)
  {
      id: "M-VIP-001",
      name: "Sultan Andara",
      email: "vip@test.com",
      phone: "628111111111",
      category: "VIP",
      scholarship: false,
      joinMonth: "2024-01",
      program: "Platinum Mentorship",
      mentorshipDuration: 24,
      nTagStatus: "Received",
      platform: "US & IN",
      regInUS: true,
      lifecycleStage: 'MEMBER',
      company: 'Andara Corp',
      jobTitle: 'Owner',
      tags: ['VIP', 'High_Net_Worth', 'Influencer']
  },

  // 2. REGULAR MEMBER (Standard)
  {
      id: "M-REG-001",
      name: "Rudi Regular",
      email: "regular@test.com",
      phone: "628222222222",
      category: "Member",
      scholarship: false,
      joinMonth: "2025-01",
      program: "General Membership",
      mentorshipDuration: 12,
      nTagStatus: "Ordered",
      platform: "IN",
      regInUS: false,
      lifecycleStage: 'MEMBER',
      company: 'Generic Pte Ltd',
      jobTitle: 'Manager',
      tags: ['Active']
  },

  // 3. MEDIA GUEST (Wartawan - Not a paying member, but has access)
  {
      id: "M-MEDIA-001",
      name: "Winda Wartawan",
      email: "media@news.com",
      phone: "628333333333",
      category: "Guest", // Key: Category Guest
      scholarship: false,
      joinMonth: `${currentYear}-${currentMonth}`,
      program: "Media Partner",
      mentorshipDuration: 0,
      nTagStatus: "Not yet",
      platform: "Digital",
      regInUS: false,
      lifecycleStage: 'IDENTIFIED', // Ada email => minimal IDENTIFIED (bukan GUEST CRM)
      company: 'Jakarta Daily News',
      jobTitle: 'Senior Editor',
      tags: ['Media', 'Press']
  },

  // --- EXISTING SEEDS ---
  { 
      id: "M0001", 
      name: "David Tjokrorahardjo", 
      email: "david.t@maxwell.com", 
      phone: "628188899900", 
      category: "President", 
      scholarship: false, 
      joinMonth: "2020-01", 
      program: "Founding Member", 
      mentorshipDuration: 60, 
      nTagStatus: "Received", 
      platform: "US & IN", 
      regInUS: true, 
      lifecycleStage: 'FACILITATOR', 
      company: 'Maxwell Leadership Indonesia',
      tags: ['Founding_Member', 'President']
  },
  
  // --- BULK FILLER ---
  ...MOCK_NAMES.map((name, index) => {
      const idStr = (index + 200).toString().padStart(4, '0'); 
      return {
          id: `M${idStr}`,
          name: name,
          email: `${name.toLowerCase().replace(/\s/g, '.')}@example.com`,
          phone: `628${Math.floor(10000000000 + Math.random() * 9000000000)}`, 
          category: "Member",
          scholarship: false, 
          joinMonth: "2025-01",
          program: "Full Access",
          mentorshipDuration: 12,
          nTagStatus: "Received",
          platform: "IN",
          regInUS: false,
          lifecycleStage: 'MEMBER',
          company: `${name.split(' ')[1] || 'Jaya'} Corp`,
          address: { city: 'Jakarta' }
      } as Member;
  })
];
