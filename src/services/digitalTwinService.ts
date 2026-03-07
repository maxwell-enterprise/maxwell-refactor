
import { MentorPersona } from '../types/mentoring';
import { DevDatabase } from '../utils/devDatabase';
import { APP_CONFIG } from '../lib/config';
import { supabase } from '../lib/supabaseClient';

const SEED_PERSONA: MentorPersona = {
    id: 'P-FAC-1',
    mentorId: 'fac-1',
    name: 'David Tjokrorahardjo',
    tone: 'Direct, vision-focused, uses metaphors of growth and leadership as influence.',
    coreKnowledge: [
        '5 Levels of Leadership',
        'Law of the Lid',
        'High Road Leadership',
        'Corporate Governance'
    ],
    voiceSamples: [
        "Leadership isn't about the title, it's about the influence.",
        "Everything rises and falls on leadership."
    ],
    aiIntents: {
        'M0002': 'Challenge him on his current scalability. He is doing too much himself.'
    }
};

export const DigitalTwinService = {
    getPersona: async (mentorId: string): Promise<MentorPersona> => {
        if (APP_CONFIG.USE_MOCK) {
            try {
                const personas = await DevDatabase.getAll<MentorPersona>('mentor_personas');
                const found = personas.find(p => p.mentorId === mentorId);
                if (found) return found;
                
                // Seed if missing
                if (mentorId === 'fac-1' || mentorId === 'admin-1') {
                    await DevDatabase.add('mentor_personas', SEED_PERSONA);
                    return SEED_PERSONA;
                }
            } catch (e) {
                return SEED_PERSONA;
            }
            return SEED_PERSONA;
        }

        if (!supabase) return SEED_PERSONA;
        const { data } = await supabase.from('mentor_personas').select('*').eq('mentorId', mentorId).single();
        return data || SEED_PERSONA;
    },

    updateIntent: async (mentorId: string, menteeId: string, intent: string): Promise<void> => {
        const persona = await DigitalTwinService.getPersona(mentorId);
        if (!persona) return;

        const updatedPersona = {
            ...persona,
            aiIntents: {
                ...persona.aiIntents,
                [menteeId]: intent
            }
        };

        if (APP_CONFIG.USE_MOCK) {
            await DevDatabase.add('mentor_personas', updatedPersona);
            return;
        }

        if (supabase) {
            await supabase.from('mentor_personas').upsert(updatedPersona);
        }
    }
};