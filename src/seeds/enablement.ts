
import { KnowledgeArticle, Quiz, QuizAttempt } from '../types/index';

// --- SEED DATA: CONTEXTUAL & OPERATIONAL CONTENT ---
export const SEED_ARTICLES: KnowledgeArticle[] = [
    // A. OPERATIONAL & BUSINESS ("How-To")
    {
        id: 'ART-OPS-001',
        title: 'Sales Mastery: Selling in the Indonesian Market',
        category: 'BUSINESS',
        summary: 'A localized guide on how to position Maxwell programs to Indonesian corporate clients using cultural nuances.',
        content: 'Selling in Indonesia requires a relationship-first approach...',
        readTimeMin: 10,
        isFeatured: true
    },
    {
        id: 'ART-SYS-001',
        title: 'System Guide: Managing Your Member Portal',
        category: 'SYSTEM',
        summary: 'Technical walkthrough: How to check your commission, generate referral links, and access the US LMS.',
        content: 'To access the official US LMS, click the banner at the top of the Success Toolkit...',
        readTimeMin: 5,
        isFeatured: false
    },
    {
        id: 'ART-TRIBE-001',
        title: 'Facilitator Playbook: Building Your Tribe',
        category: 'BUSINESS',
        summary: 'Standard Operating Procedure (SOP) for Facilitators to conduct monthly Round Table sessions.',
        content: 'Step 1: Schedule the session in the "My Tribe" menu...',
        readTimeMin: 15,
        isFeatured: false
    },
    
    // B. DIGITAL TWIN (Event Summaries)
    {
        id: 'ART-EVT-001',
        title: 'Executive Summary: IMC Jakarta 2024',
        category: 'EVENT_RECAP',
        summary: 'Key takeaways and action points from the recent International Maxwell Conference.',
        content: 'The 3 key themes discussed were: 1. Intentional Living, 2. High Road Leadership...',
        readTimeMin: 8,
        isFeatured: true,
        linkedEventId: 'EVT-24-IMC'
    },
    {
        id: 'ART-ACT-001',
        title: 'Action Plan: Developing the Leader Within',
        category: 'WORKSHEET',
        summary: 'Digital worksheet to be filled out after attending the "Developing Leaders" masterclass.',
        content: 'List 3 immediate changes you will make to your daily routine...',
        readTimeMin: 20,
        isFeatured: false,
        linkedEventId: 'EVT-24-DLW'
    }
];

// --- SEED DATA: VALIDATION & ASSESSMENT ---
export const SEED_QUIZZES: Quiz[] = [
    {
        id: 'QUIZ-VAL-001',
        title: 'Validation: 5 Levels of Leadership',
        description: 'Post-Test to validate your understanding after watching the core modules on the Official LMS.',
        linkedEventId: '',
        passingScore: 80,
        questions: [
            { id: 'Q1', text: 'Which level represents leadership based solely on position/title?', options: ['Level 1: Position', 'Level 2: Permission', 'Level 3: Production', 'Level 5: Pinnacle'], correctOptionIndex: 0 },
            { id: 'Q2', text: 'At Level 3 (Production), people follow you because...', options: ['They have to', 'Of what you have done for the organization', 'Of who you are', 'They like you'], correctOptionIndex: 1 }
        ]
    },
    {
        id: 'QUIZ-EVT-001',
        title: 'Post-Event Check: IMC Jakarta',
        description: 'Verify your attendance and key learning points to unlock your certificate.',
        linkedEventId: 'EVT-25-IMC',
        passingScore: 100, // Strict pass
        questions: [
            { id: 'Q1', text: 'What was the main theme of Session 2?', options: ['Financial Freedom', 'High Road Leadership', 'Marketing 101', 'Tech Trends'], correctOptionIndex: 1 }
        ]
    }
];

export const SEED_ATTEMPTS: QuizAttempt[] = [
    { id: 'ATT-001', quizId: 'QUIZ-VAL-001', userId: 'M0002', score: 100, passed: true, completedAt: '2024-10-01T10:00:00Z', eventId: '' }
];
