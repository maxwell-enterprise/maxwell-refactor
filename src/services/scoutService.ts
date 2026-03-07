
import { GoogleGenAI } from "@google/genai";
import { ScoutSession, LeadScore, Member } from '../types/index'; // Added Member
import { APP_CONFIG } from '../lib/config';
import { DevDatabase } from '../utils/devDatabase';
import { supabase } from '../lib/supabaseClient';
import { DataService } from './dataService'; // Import DataService to bridge Scout and CRM

const SCOUT_CONFIG = {
    MAX_AI_REPLIES: 5,
    ADMIN_WA_NUMBER: '628123456789',
    HIGH_TICKET_THRESHOLD: 75000000
};

// Seed for Schema Viewer
const SEED_SESSIONS: ScoutSession[] = [
    {
        id: 'SCT-MOCK-1',
        leadName: 'Budi Santoso',
        leadEmail: 'budi@corp.com',
        createdAt: '2025-02-20T10:00:00Z',
        messages: [{sender: 'ai', text: 'Hello', timestamp: 123}],
        score: { willingness: 4, capacity: 5, tags: ['Decision_Maker'], recommendedProduct: 'Private Coaching' },
        status: 'COMPLETED'
    }
];

export const ScoutService = {
  
  startSession: async (name: string, email: string): Promise<ScoutSession> => {
    // 1. Create the Chat Session
    const session: ScoutSession = {
      id: `SCT-${Date.now()}`,
      leadName: name,
      leadEmail: email,
      createdAt: new Date().toISOString(),
      messages: [
        { 
          sender: 'ai', 
          text: `Hi ${name}! 👋 I'm Maxwell Scout. To give you the best advice, could you tell me a bit about your current role and how big the team you lead is?`, 
          timestamp: Date.now() 
        }
      ],
      score: { willingness: 1, capacity: 1, tags: [] },
      status: 'ACTIVE'
    };

    if (APP_CONFIG.USE_MOCK) {
        await DevDatabase.add('lead_scout_conversations', session);
    } else if (supabase) {
        await supabase.from('lead_scout_conversations').insert(session);
    }

    // 2. BRIDGE TO CRM: Ensure this user exists in Members table as a Lead
    // This allows the Sales Team to see them in "Leads Dashboard" immediately
    try {
        const allMembers = await DataService.getMembers();
        const existingMember = allMembers.find(m => m.email.toLowerCase() === email.toLowerCase());

        if (!existingMember) {
            console.log(`[SCOUT] Creating new Lead in CRM for ${email}`);
            const newLead: Member = {
                id: `LEAD-${Date.now()}`, // Generate a Lead ID
                name: name,
                email: email,
                phone: '', // Phone might be collected later or manually
                category: 'Guest',
                program: 'Scout Inquiry', // Indicator for Sales team
                joinMonth: new Date().toISOString().slice(0, 7),
                lifecycleStage: 'IDENTIFIED', // IMPORTANT: This puts them in the Leads View
                nTagStatus: 'Not yet',
                scholarship: false,
                mentorshipDuration: 0,
                platform: 'Digital',
                regInUS: false,
                tags: ['Scout_User', 'AI_Lead'], // Tag for filtering
                engagement: {
                    lastActiveDate: new Date().toISOString(),
                    eventsAttendedCount: 0,
                    contentCompletionRate: 0,
                    communityReputationScore: 0,
                    leadScore: 10 // Start with base score
                }
            };
            await DataService.addMember(newLead);
        } else {
            console.log(`[SCOUT] User ${email} already exists in CRM. Skipping creation.`);
        }
    } catch (e) {
        console.error("[SCOUT] Failed to sync lead to CRM:", e);
    }

    return session;
  },

  sendMessage: async (session: ScoutSession, userText: string): Promise<{ text: string; session: ScoutSession }> => {
    // 1. Check Reply Limits
    const aiReplyCount = session.messages.filter(m => m.sender === 'ai').length;
    
    if (aiReplyCount >= SCOUT_CONFIG.MAX_AI_REPLIES) {
        const closingMsg = `Thank you! Based on our chat, I see significant potential in your leadership journey. To provide a tailored roadmap for your specific scale, let's continue this directly with our Senior Consultant on WhatsApp.`;
        
        const updatedSession: ScoutSession = {
            ...session,
            status: 'COMPLETED',
            messages: [
                ...session.messages,
                { sender: 'user', text: userText, timestamp: Date.now() },
                { sender: 'ai', text: closingMsg, timestamp: Date.now() + 100 }
            ]
        };
        await ScoutService.updateSession(updatedSession);
        return { text: closingMsg, session: updatedSession };
    }

    // 2. Normal AI Processing (Mocked)
    await new Promise(resolve => setTimeout(resolve, 1500)); 

    let aiResponse = "";
    const lowerText = userText.toLowerCase();
    
    if (lowerText.includes("team") || lowerText.includes("staff") || lowerText.includes("people")) {
        if (lowerText.includes("40") || lowerText.includes("manager") || lowerText.includes("managers")) {
             aiResponse = "Managing a layered team is a Level 4 challenge. When you have leaders reporting to you, your focus must shift from 'doing' to 'empowering'. What's the biggest friction point in your team's execution right now?";
        } else {
             aiResponse = "Leading a team is the first step into Level 2 & 3. It sounds like you are building influence. Do you feel your team follows you because they have to (Title) or because they want to (Relationship)?";
        }
    } else if (lowerText.includes("stuck") || lowerText.includes("time") || lowerText.includes("busy")) {
        aiResponse = "That 'busy trap' is classic Level 3 (Production). You are getting results, but you might be the bottleneck. Have you identified a potential successor you can mentor?";
    } else {
        aiResponse = "That's a valuable perspective. Leadership is indeed a journey of growth. How does this challenge impact your organization's bottom line or culture?";
    }

    const updatedSession = {
      ...session,
      messages: [
        ...session.messages,
        { sender: 'user' as const, text: userText, timestamp: Date.now() },
        { sender: 'ai' as const, text: aiResponse, timestamp: Date.now() + 100 }
      ]
    };

    await ScoutService.updateSession(updatedSession);
    return { text: aiResponse, session: updatedSession };
  },

  updateSession: async (session: ScoutSession) => {
      if (APP_CONFIG.USE_MOCK) {
          await DevDatabase.add('lead_scout_conversations', session);
      } else if (supabase) {
          await supabase.from('lead_scout_conversations').upsert(session);
      }
  },

  qualifyLead: async (text: string, currentScore: LeadScore): Promise<LeadScore> => {
    const newScore = { ...currentScore };
    const lowerText = text.toLowerCase();

    if (lowerText.includes("need") || lowerText.includes("help") || lowerText.includes("grow") || lowerText.includes("change")) {
        newScore.willingness = Math.min(5, newScore.willingness + 1);
    }

    const highCapKeywords = ["director", "vp", "general manager", "gm", "ceo", "founder", "owner", "head of", "budget", "invest"];
    const scaleKeywords = ["40", "50", "100", "hundred", "managers", "leaders", "multiple branches", "teams"];

    if (highCapKeywords.some(kw => lowerText.includes(kw))) {
        newScore.capacity = Math.min(5, newScore.capacity + 2);
        if (!newScore.tags.includes("Decision_Maker")) newScore.tags.push("Decision_Maker");
    }

    if (scaleKeywords.some(kw => lowerText.includes(kw))) {
        newScore.capacity = Math.min(5, newScore.capacity + 1.5);
        if (!newScore.tags.includes("High_Scale_Org")) newScore.tags.push("High_Scale_Org");
    }

    if (newScore.capacity >= 4) {
        newScore.recommendedProduct = "Private Mentorship / Certification (75jt+)";
    } else if (newScore.willingness >= 4) {
        newScore.recommendedProduct = "Masterclass Bundle";
    } else {
        newScore.recommendedProduct = "Books & Digital Course";
    }

    return newScore;
  },

  getWhatsappLink: (session: ScoutSession) => {
      const summary = `Hi Admin, I just finished a session with Maxwell Scout. Name: ${session.leadName}. Score: L${session.score.willingness}/C${session.score.capacity}. Recommendation: ${session.score.recommendedProduct}.`;
      return `https://wa.me/${SCOUT_CONFIG.ADMIN_WA_NUMBER}?text=${encodeURIComponent(summary)}`;
  },

  getAllSessions: async (): Promise<ScoutSession[]> => {
      if (APP_CONFIG.USE_MOCK) {
          try {
              const isEmpty = await DevDatabase.isEmpty('lead_scout_conversations');
              if(isEmpty) {
                  await DevDatabase.bulkAdd('lead_scout_conversations', SEED_SESSIONS);
                  return SEED_SESSIONS;
              }
              return await DevDatabase.getAll<ScoutSession>('lead_scout_conversations');
          } catch(e) { return SEED_SESSIONS; }
      }
      if (!supabase) return [];
      const { data } = await supabase.from('lead_scout_conversations').select('*');
      return data || [];
  }
};