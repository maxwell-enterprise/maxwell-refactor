
import { KnowledgeArticle, Quiz, QuizAttempt } from '../types/index';
import { APP_CONFIG } from '../lib/config';
import { DevDatabase } from '../utils/devDatabase';
import { supabase } from '../lib/supabaseClient';
import { ENABLEMENT_ARTICLES, ENABLEMENT_QUIZZES, ENABLEMENT_ATTEMPTS } from '../constants';

export const EnablementService = {
    
    getArticles: async (): Promise<KnowledgeArticle[]> => {
        if (APP_CONFIG.USE_MOCK) {
            try {
                if (await DevDatabase.isEmpty('enablement_articles')) await DevDatabase.bulkAdd('enablement_articles', ENABLEMENT_ARTICLES);
                return await DevDatabase.getAll<KnowledgeArticle>('enablement_articles');
            } catch(e) { return ENABLEMENT_ARTICLES; }
        }
        if (!supabase) return [];
        const { data } = await supabase.from('enablement_articles').select('*');
        return data || [];
    },

    getQuizzes: async (): Promise<Quiz[]> => {
        if (APP_CONFIG.USE_MOCK) {
            try {
                if (await DevDatabase.isEmpty('enablement_quizzes')) await DevDatabase.bulkAdd('enablement_quizzes', ENABLEMENT_QUIZZES);
                return await DevDatabase.getAll<Quiz>('enablement_quizzes');
            } catch(e) { return ENABLEMENT_QUIZZES; }
        }
        if (!supabase) return [];
        const { data } = await supabase.from('enablement_quizzes').select('*');
        return data || [];
    },

    getMaterialsForEvent: async (eventId: string): Promise<{ articles: KnowledgeArticle[], quiz?: Quiz }> => {
        const [allArticles, allQuizzes] = await Promise.all([
            EnablementService.getArticles(),
            EnablementService.getQuizzes()
        ]);
        const relatedArticles = allArticles.filter(a => a.linkedEventId === eventId);
        const relatedQuiz = allQuizzes.find(q => q.linkedEventId === eventId);
        return { articles: relatedArticles, quiz: relatedQuiz };
    },

    submitQuiz: async (userId: string, quizId: string, answers: number[]): Promise<QuizAttempt> => {
        const quizzes = await EnablementService.getQuizzes();
        const quiz = quizzes.find(q => q.id === quizId);
        if (!quiz) throw new Error("Quiz not found");

        let correctCount = 0;
        quiz.questions.forEach((q, idx) => {
            if (answers[idx] === q.correctOptionIndex) correctCount++;
        });

        const score = Math.round((correctCount / quiz.questions.length) * 100);
        const attempt: QuizAttempt = {
            id: `ATT-${Date.now()}`,
            quizId,
            userId,
            score,
            passed: score >= quiz.passingScore,
            completedAt: new Date().toISOString(),
            eventId: quiz.linkedEventId
        };
        
        if (APP_CONFIG.USE_MOCK) {
            await DevDatabase.add('enablement_quiz_attempts', attempt);
            return attempt;
        }

        if (!supabase) throw new Error("No DB");
        const { data, error } = await supabase.from('enablement_quiz_attempts').insert(attempt).select().single();
        if (error) throw error;
        return data;
    },

    getUserHistory: async (userId: string): Promise<QuizAttempt[]> => {
        if (APP_CONFIG.USE_MOCK) {
            try {
                if (await DevDatabase.isEmpty('enablement_quiz_attempts')) await DevDatabase.bulkAdd('enablement_quiz_attempts', ENABLEMENT_ATTEMPTS);
                const all = await DevDatabase.getAll<QuizAttempt>('enablement_quiz_attempts');
                return all.filter(a => a.userId === userId);
            } catch(e) { return ENABLEMENT_ATTEMPTS.filter(a => a.userId === userId); }
        }
        if (!supabase) return [];
        const { data } = await supabase.from('enablement_quiz_attempts').select('*').eq('userId', userId);
        return data || [];
    }
};
