
import { ModifiedTableDef } from './types';

export const ENGAGEMENT_LMS_TABLES: ModifiedTableDef[] = [
    // --- GAMIFICATION LAYER ---
    
    // 1. MASTER BADGES
    {
        tableName: 'game_badges',
        referenceRawTable: 'gamification_badges',
        reasoning: "MASTER DATA: Central definition of all achievable badges. Separated from user profiles to allow updating badge metadata (icon, description) globally.",
        columns: [
            { name: 'id', type: 'uuid', isPk: true, constraints: 'DEFAULT gen_random_uuid()' },
            { name: 'code', type: 'varchar(50)', constraints: 'UNIQUE NOT NULL' },
            { name: 'name', type: 'varchar(100)', constraints: 'NOT NULL' },
            { name: 'description', type: 'text' },
            { name: 'icon_ref', type: 'varchar(50)', description: 'Icon name/slug' },
            { name: 'rarity', type: 'varchar(20)', constraints: "CHECK (rarity IN ('COMMON', 'RARE', 'EPIC', 'LEGENDARY'))" },
            { name: 'point_bonus', type: 'integer', constraints: 'DEFAULT 0' },
            { name: 'auto_trigger_type', type: 'varchar(50)', description: 'System event that unlocks this badge' },
            { name: 'is_active', type: 'boolean', constraints: 'DEFAULT TRUE' }
        ],
        sqlDefinition: `CREATE TABLE game_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon_ref VARCHAR(50),
  rarity VARCHAR(20) CHECK (rarity IN ('COMMON', 'RARE', 'EPIC', 'LEGENDARY')),
  point_bonus INTEGER DEFAULT 0,
  auto_trigger_type VARCHAR(50), -- e.g., 'EVENT_ATTENDANCE'
  is_active BOOLEAN DEFAULT TRUE
);`
    },

    // 2. MEMBER BADGES (Junction)
    {
        tableName: 'member_badges',
        referenceRawTable: 'gamification_profiles', // Normalizing the 'badges' array
        reasoning: "MANY-TO-MANY: Records which member has which badge and when it was awarded. Allows querying 'Who has the Early Bird badge?'.",
        columns: [
            { name: 'id', type: 'uuid', isPk: true, constraints: 'DEFAULT gen_random_uuid()' },
            { name: 'member_id', type: 'uuid', isFk: true, fkTarget: 'members.id', constraints: 'ON DELETE CASCADE' },
            { name: 'badge_id', type: 'uuid', isFk: true, fkTarget: 'game_badges.id', constraints: 'ON DELETE CASCADE' },
            { name: 'awarded_at', type: 'timestamptz', constraints: 'DEFAULT NOW()' },
            { name: 'metadata', type: 'jsonb', description: 'Context of award (e.g. event_id)' }
        ],
        sqlDefinition: `CREATE TABLE member_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES game_badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  UNIQUE(member_id, badge_id) -- Prevent duplicate badges
);`
    },

    // 3. MEMBER POINTS (Gamification State)
    {
        tableName: 'member_gamification_stats',
        referenceRawTable: 'gamification_profiles',
        reasoning: "STATE TRACKING: Stores the aggregate points, level, and streaks. Separated from the core 'members' table to keep the core lightweight.",
        columns: [
            { name: 'member_id', type: 'uuid', isPk: true, isFk: true, fkTarget: 'members.id', constraints: 'ON DELETE CASCADE' },
            { name: 'total_points', type: 'integer', constraints: 'DEFAULT 0' },
            { name: 'current_level', type: 'varchar(50)', constraints: "DEFAULT 'Bronze'" },
            { name: 'current_streak', type: 'integer', constraints: 'DEFAULT 0' },
            { name: 'last_activity_at', type: 'timestamptz' },
            { name: 'updated_at', type: 'timestamptz', constraints: 'DEFAULT NOW()' }
        ],
        sqlDefinition: `CREATE TABLE member_gamification_stats (
  member_id UUID PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  current_level VARCHAR(50) DEFAULT 'Bronze',
  current_streak INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`
    },

    // --- MENTORING LAYER ---

    // 4. MENTORING SESSIONS (Header)
    {
        tableName: 'mentoring_sessions',
        referenceRawTable: 'mentoring_sessions',
        reasoning: "INTERACTION HEADER: Represents a long-running mentoring relationship or a single session state. 'memory_context' stores the AI's summarized context of the relationship.",
        columns: [
            { name: 'id', type: 'uuid', isPk: true, constraints: 'DEFAULT gen_random_uuid()' },
            { name: 'mentee_member_id', type: 'uuid', isFk: true, fkTarget: 'members.id', constraints: 'NOT NULL' },
            { name: 'mentor_user_id', type: 'uuid', isFk: true, fkTarget: 'sys_internal_users.id', description: 'The human facilitator or AI Persona base' },
            { name: 'status', type: 'varchar(20)', constraints: "DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'ARCHIVED'))" },
            { name: 'progress_score', type: 'integer', constraints: 'DEFAULT 0' },
            { name: 'ai_memory_context', type: 'text', description: 'Distilled summary of past conversations for AI context window' },
            { name: 'last_interaction_at', type: 'timestamptz' },
            { name: 'created_at', type: 'timestamptz', constraints: 'DEFAULT NOW()' }
        ],
        sqlDefinition: `CREATE TABLE mentoring_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentee_member_id UUID REFERENCES members(id) NOT NULL,
  mentor_user_id UUID REFERENCES sys_internal_users(id),
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'ARCHIVED')),
  progress_score INTEGER DEFAULT 0,
  ai_memory_context TEXT,
  last_interaction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`
    },

    // 5. MENTORING ACTION ITEMS (Tasks)
    {
        tableName: 'mentoring_action_items',
        referenceRawTable: 'mentoring_sessions', // Extracted from 'actionPlan' array
        reasoning: "NORMALIZATION: Action items are individual tasks derived from mentoring. Storing them as rows allows us to track completion rates and deadlines independently of the session blob.",
        columns: [
            { name: 'id', type: 'uuid', isPk: true, constraints: 'DEFAULT gen_random_uuid()' },
            { name: 'session_id', type: 'uuid', isFk: true, fkTarget: 'mentoring_sessions.id', constraints: 'ON DELETE CASCADE' },
            { name: 'task_description', type: 'text', constraints: 'NOT NULL' },
            { name: 'category', type: 'varchar(50)', constraints: "CHECK (category IN ('GROWTH', 'EXECUTION', 'RELATIONSHIP'))" },
            { name: 'status', type: 'varchar(20)', constraints: "DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'OVERDUE'))" },
            { name: 'due_date', type: 'date' },
            { name: 'created_at', type: 'timestamptz', constraints: 'DEFAULT NOW()' }
        ],
        sqlDefinition: `CREATE TABLE mentoring_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES mentoring_sessions(id) ON DELETE CASCADE,
  task_description TEXT NOT NULL,
  category VARCHAR(50) CHECK (category IN ('GROWTH', 'EXECUTION', 'RELATIONSHIP')),
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'OVERDUE')),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`
    },

    // --- LMS / ENABLEMENT LAYER ---

    // 6. QUIZZES (Assessment Header)
    {
        tableName: 'lms_quizzes',
        referenceRawTable: 'enablement_quizzes',
        reasoning: "LMS CORE: Defines the assessment structure. Linked optionally to an Event (Post-Test) or a Product (Certification Exam).",
        columns: [
            { name: 'id', type: 'uuid', isPk: true, constraints: 'DEFAULT gen_random_uuid()' },
            { name: 'title', type: 'varchar(255)', constraints: 'NOT NULL' },
            { name: 'description', type: 'text' },
            { name: 'linked_event_id', type: 'uuid', isFk: true, fkTarget: 'master_events.id' },
            { name: 'passing_score', type: 'integer', constraints: 'DEFAULT 80' },
            { name: 'is_active', type: 'boolean', constraints: 'DEFAULT TRUE' },
            { name: 'created_at', type: 'timestamptz', constraints: 'DEFAULT NOW()' }
        ],
        sqlDefinition: `CREATE TABLE lms_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  linked_event_id UUID REFERENCES master_events(id),
  passing_score INTEGER DEFAULT 80,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`
    },

    // 7. QUIZ QUESTIONS
    {
        tableName: 'lms_quiz_questions',
        referenceRawTable: 'enablement_quizzes', // Extracted from 'questions' array
        reasoning: "NORMALIZATION: Questions extracted from the quiz object. Allows for question banking and randomization in the future.",
        columns: [
            { name: 'id', type: 'uuid', isPk: true, constraints: 'DEFAULT gen_random_uuid()' },
            { name: 'quiz_id', type: 'uuid', isFk: true, fkTarget: 'lms_quizzes.id', constraints: 'ON DELETE CASCADE' },
            { name: 'question_text', type: 'text', constraints: 'NOT NULL' },
            { name: 'options', type: 'jsonb', description: 'Array of strings ["Option A", "Option B"]' },
            { name: 'correct_option_index', type: 'integer', constraints: 'NOT NULL' },
            { name: 'order_index', type: 'integer', constraints: 'DEFAULT 0' }
        ],
        sqlDefinition: `CREATE TABLE lms_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES lms_quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL, -- ["Option A", "Option B"]
  correct_option_index INTEGER NOT NULL,
  order_index INTEGER DEFAULT 0
);`
    },

    // 8. QUIZ ATTEMPTS (Results)
    {
        tableName: 'lms_quiz_attempts',
        referenceRawTable: 'enablement_quiz_attempts',
        reasoning: "AUDIT & PROGRESS: Records every user attempt. Essential for issuing certificates based on passing logic.",
        columns: [
            { name: 'id', type: 'uuid', isPk: true, constraints: 'DEFAULT gen_random_uuid()' },
            { name: 'quiz_id', type: 'uuid', isFk: true, fkTarget: 'lms_quizzes.id', constraints: 'ON DELETE CASCADE' },
            { name: 'member_id', type: 'uuid', isFk: true, fkTarget: 'members.id', constraints: 'ON DELETE CASCADE' },
            { name: 'score', type: 'integer', constraints: 'NOT NULL' },
            { name: 'passed', type: 'boolean', constraints: 'NOT NULL' },
            { name: 'completed_at', type: 'timestamptz', constraints: 'DEFAULT NOW()' },
            { name: 'answers_log', type: 'jsonb', description: 'Stores user answers for review' }
        ],
        sqlDefinition: `CREATE TABLE lms_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES lms_quizzes(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  answers_log JSONB -- Store user answers [0, 1, 0, 3]
);`
    }
];
