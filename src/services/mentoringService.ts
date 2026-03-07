
import { GoogleGenAI } from "@google/genai";
import { MentoringSession, MentoringMessage, ActionItem, MentorPersona } from '../types/mentoring';
import { DevDatabase } from '../utils/devDatabase';
import { APP_CONFIG } from '../lib/config';
import { supabase } from '../lib/supabaseClient';

export const MentoringService = {
  /**
   * Orchestrates the chat with the Digital Twin
   */
  async sendMessage(sessionId: string, userText: string, persona: MentorPersona): Promise<{ reply: string; session: MentoringSession }> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Fetch Session
    let session: MentoringSession | undefined;
    if (APP_CONFIG.USE_MOCK) {
        const allSessions = await DevDatabase.getAll<MentoringSession>('mentoring_sessions');
        session = allSessions.find(s => s.id === sessionId);
    } else if (supabase) {
        const { data } = await supabase.from('mentoring_sessions').select('*').eq('id', sessionId).single();
        session = data;
    }

    if (!session) throw new Error("Session not found");

    // 1. Prepare Context (Memory + Intent)
    const mentorIntent = persona.aiIntents[session.menteeId] || "Guide them based on my core principles.";
    const memory = session.memory;
    
    const systemPrompt = `
      YOU ARE THE DIGITAL TWIN OF MENTOR: ${persona.name}.
      TONE: ${persona.tone}
      VOICE SAMPLES (Pattern to mimic): ${persona.voiceSamples.join(' | ')}
      
      CURRENT MENTOR INTENT FOR THIS MENTEE: "${mentorIntent}"
      
      CONVERSATION HISTORY SUMMARY (PREVIOUS SESSIONS):
      ${memory.distilledContext}
      
      KNOWLEDGE BASE: ${persona.coreKnowledge.join(', ')}
      
      RULES:
      - Speak like the mentor in the voice samples.
      - Be direct but transformational.
      - If the mentee makes a commitment, note it down mentally.
      - Never break character.
    `;

    // 2. Call Gemini
    // Prepare history as Content objects with role
    const historyContents = memory.recentFullHistory.map(m => ({
        role: m.sender === 'MENTOR_AI' ? 'model' : 'user',
        parts: [{ text: m.text }]
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
          ...historyContents,
          { role: 'user', parts: [{ text: userText }] }
      ],
      config: {
          systemInstruction: systemPrompt
      }
    });

    const replyText = response.text || "I'm reflecting on that. Tell me more.";

    // 3. Update History
    const newMessage: MentoringMessage = {
        id: `MSG-${Date.now()}`,
        sender: 'MENTEE',
        text: userText,
        timestamp: new Date().toISOString()
    };
    
    const replyMessage: MentoringMessage = {
        id: `MSG-AI-${Date.now()}`,
        sender: 'MENTOR_AI',
        text: replyText,
        timestamp: new Date().toISOString()
    };

    let updatedHistory = [...memory.recentFullHistory, newMessage, replyMessage];

    // 4. MEMORY DISTILLATION (The "Last 5" Rule)
    let newDistilled = memory.distilledContext;
    if (updatedHistory.length > 5) {
        const toDistill = updatedHistory.slice(0, updatedHistory.length - 5);
        updatedHistory = updatedHistory.slice(-5);
        
        // Use AI to condense history into Pointers (no fillers)
        const distillationPrompt = `
          Condense these messages into highly efficient "Pointers" for a mentor's memory. 
          REMOVE filler words. Use bullet points. 
          Focus ONLY on: Problems identified, Solutions discussed, and Commitments made.
          Messages: ${JSON.stringify(toDistill)}
        `;
        const distRes = await ai.models.generateContent({ model: 'gemini-3-flash-lite-latest', contents: distillationPrompt });
        newDistilled += `\n${distRes.text}`;
    }

    const updatedSession: MentoringSession = {
        ...session,
        memory: {
            distilledContext: newDistilled,
            recentFullHistory: updatedHistory
        },
        updatedAt: new Date().toISOString()
    };

    // 5. EXTRACT ACTION ITEMS (Periodic background check)
    if (updatedHistory.length % 2 === 0) {
        const extractorPrompt = `
          Extract a checklist of Action Items from this recent conversation. 
          Return ONLY JSON array of { task: string, category: 'GROWTH' | 'EXECUTION' | 'RELATIONSHIP' }.
          Conversation: ${JSON.stringify(updatedHistory)}
        `;
        const extractRes = await ai.models.generateContent({ 
            model: 'gemini-3-flash-preview', 
            contents: extractorPrompt,
            config: { responseMimeType: 'application/json' }
        });
        try {
            const rawItems = JSON.parse(extractRes.text);
            const newActions: ActionItem[] = rawItems.map((ri: any) => ({
                id: `ACT-${Math.random()}`,
                task: ri.task,
                category: ri.category,
                status: 'PENDING',
                sourceSessionId: session.id
            }));
            updatedSession.actionPlan = [...updatedSession.actionPlan, ...newActions];
        } catch (e) { console.error("Extraction failed", e); }
    }

    // Save
    if (APP_CONFIG.USE_MOCK) {
        await DevDatabase.add('mentoring_sessions', updatedSession);
    } else if (supabase) {
        await supabase.from('mentoring_sessions').upsert(updatedSession);
    }

    return { reply: replyText, session: updatedSession };
  },

  async getSession(menteeId: string): Promise<MentoringSession> {
      let session: MentoringSession | undefined;

      if (APP_CONFIG.USE_MOCK) {
          const all = await DevDatabase.getAll<MentoringSession>('mentoring_sessions');
          session = all.find(s => s.menteeId === menteeId);
      } else if (supabase) {
          const { data } = await supabase.from('mentoring_sessions').select('*').eq('menteeId', menteeId).single();
          session = data;
      }
      
      if (!session) {
          session = {
              id: `SES-MENTOR-${Date.now()}`,
              menteeId,
              mentorId: 'fac-1',
              status: 'ACTIVE',
              memory: { distilledContext: '', recentFullHistory: [] },
              lastSummary: '',
              actionPlan: [],
              progressScore: 10,
              updatedAt: new Date().toISOString()
          };
          
          if (APP_CONFIG.USE_MOCK) await DevDatabase.add('mentoring_sessions', session);
          else if (supabase) await supabase.from('mentoring_sessions').insert(session);
      }
      return session;
  },

  // NEW: Persist Action Item Status
  async toggleActionItem(sessionId: string, actionId: string): Promise<MentoringSession | null> {
      if (APP_CONFIG.USE_MOCK) {
          const sessions = await DevDatabase.getAll<MentoringSession>('mentoring_sessions');
          const session = sessions.find(s => s.id === sessionId);
          if (session) {
              session.actionPlan = session.actionPlan.map(a => 
                  a.id === actionId ? { ...a, status: a.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED' } : a
              );
              // Recalculate progress
              const total = session.actionPlan.length;
              const done = session.actionPlan.filter(a => a.status === 'COMPLETED').length;
              session.progressScore = total > 0 ? Math.round((done / total) * 100) : 0;
              
              await DevDatabase.add('mentoring_sessions', session);
              return session;
          }
          return null;
      }
      return null; // Add Supabase logic if needed
  }
};
