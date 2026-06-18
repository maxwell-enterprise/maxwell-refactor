export enum QuestionType {
  SHORT_ANSWER = 'SHORT_ANSWER',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  CHECKBOX = 'CHECKBOX',
  DROPDOWN = 'DROPDOWN',
  LINEAR_SCALE = 'LINEAR_SCALE',
  DATE = 'DATE',
  TIME = 'TIME'
}

export enum DataSource {
  CUSTOM = 'CUSTOM',
  PRODUCTS = 'PRODUCTS',
  EVENTS = 'EVENTS'
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  required: boolean;
  options?: string[]; // Custom options if DataSource is CUSTOM
  dataSource?: DataSource; // Data source for options
  dataSourceFilter?: string[]; // IDs of products/events selected by admin to be included
  correctAnswer?: string | string[]; // For quizzes
  points?: number; // Score value for this question
  scaleConfig?: {
    min: number;
    max: number;
    minLabel?: string;
    maxLabel?: string;
  };
}

export interface FormSession {
  id: string;
  name: string; // e.g., 'Internal Team Sprint' or event name
  eventId?: string; // Tying to an event in DB if applicable
  createdAt: string;
}

export interface FormDefinition {
  id: string;
  title: string;
  description?: string;
  isQuiz: boolean;
  questions: Question[];
  sessions?: FormSession[];
  createdAt: string;
  createdBy: string;
  active: boolean;
  successMessage?: string;
}

export interface FormResponse {
  id: string;
  formId: string;
  sessionId?: string; // Which session/deployment they used
  deploymentName?: string;
  eventId?: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  answers: Record<string, unknown>; // questionId -> answer
  score?: number;
  maxScore?: number;
  submittedAt: string;
}
