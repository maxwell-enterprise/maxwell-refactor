
import { UserRole } from './index';

export interface ActionItem {
  id: string;
  task: string;
  category: 'GROWTH' | 'EXECUTION' | 'RELATIONSHIP';
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE';
  dueDate?: string;
  sourceSessionId: string;
}

export interface MentoringMessage {
  id: string;
  sender: 'MENTOR_AI' | 'MENTEE';
  text: string;
  timestamp: string;
  isSummary?: boolean; // Flag if this is a condensed version of history
}

export interface SessionMemory {
  distilledContext: string; // Pointers from old conversations (no fillers)
  recentFullHistory: MentoringMessage[]; // Last 5 raw messages
}

export interface MentorPersona {
  id: string;
  mentorId: string;
  name: string;
  tone: string; // e.g., "Direct, Socratic, encouraging"
  coreKnowledge: string[]; // Specific focus areas
  voiceSamples: string[]; // Actual chat snippets for the AI to learn "soul"
  aiIntents: Record<string, string>; // MenteeID -> Specific direction for the AI
}

export interface MentoringSession {
  id: string;
  menteeId: string;
  mentorId: string;
  status: 'ACTIVE' | 'COMPLETED';
  memory: SessionMemory;
  lastSummary: string;
  actionPlan: ActionItem[];
  progressScore: number; // 0-100
  updatedAt: string;
}
