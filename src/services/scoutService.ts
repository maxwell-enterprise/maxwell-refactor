import { ScoutSession, LeadScore } from '../types/index';
import { APP_CONFIG } from '../lib/config';
import { DevDatabase } from '../utils/devDatabase';
import { supabase } from '../lib/supabaseClient';
import { apiRequest } from '../repositories/api/apiClient';

type ScoutChatApiResponse = {
  reply: string;
  status: 'ACTIVE' | 'COMPLETED';
};

type ScoutLeadRegistrationResponse = {
  created: boolean;
  member: { id: string };
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

    return session;
  },

  sendMessage: async (session: ScoutSession, userText: string): Promise<{ text: string; session: ScoutSession }> => {
    const now = Date.now();
    const result = await apiRequest<ScoutChatApiResponse>(
        '/scout/chat',
        {
            method: 'POST',
            body: JSON.stringify({
                sessionId: session.id,
                leadName: session.leadName,
                leadEmail: session.leadEmail,
                latestUserMessage: userText,
                messages: session.messages,
            }),
            skipBackendFailureTracking: true,
        },
    );

    const updatedSession: ScoutSession = {
      ...session,
      messages: [
        ...session.messages,
        { sender: 'user' as const, text: userText, timestamp: now },
        { sender: 'ai' as const, text: result.reply, timestamp: now + 100 }
      ],
      status: result.status,
    };

    await ScoutService.updateSession(updatedSession);
    return { text: result.reply, session: updatedSession };
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

  registerLeadAtCompletion: async (session: ScoutSession) => {
      return apiRequest<ScoutLeadRegistrationResponse>(
          '/members/public/scout-leads',
          {
              method: 'POST',
              body: JSON.stringify({
                  fullName: session.leadName,
                  email: session.leadEmail,
              }),
              skipBackendFailureTracking: true,
          },
      );
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
