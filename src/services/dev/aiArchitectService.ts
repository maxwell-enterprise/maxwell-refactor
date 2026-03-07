
import { GoogleGenAI, Type } from "@google/genai";
import { HarvestedContext } from './contextHarvester';
import { AIUsageService } from '../aiUsageService';
import { DevDatabase } from '../../utils/devDatabase';

export type ArchitectPhase = 'DISCOVERY' | 'RELATIONS' | 'LIFECYCLE' | 'SECURITY' | 'FINAL';

export interface ArchitectIteration {
    phase: ArchitectPhase;
    aiResponse: any;
    timestamp: string;
}

export const AIArchitectService = {
    /**
     * Conducts an iterative architectural review with Gemini
     */
    runIteration: async (
        phase: ArchitectPhase, 
        context: HarvestedContext, 
        history: ArchitectIteration[],
        userFeedback?: string
    ): Promise<any> => {
        if (!process.env.API_KEY) throw new Error("API Key Missing");

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const model = 'gemini-3-pro-preview';

        const phaseInstructions: Record<ArchitectPhase, string> = {
            'DISCOVERY': 'Phase 1: Identify all entities and their primary fields based on the mock tables and sample data provided. Suggest a normalized Postgres structure.',
            'RELATIONS': 'Phase 2: Establish relationships between entities. Identify foreign keys, cardinality (1:N, M:N), and junction tables needed for Supabase.',
            'LIFECYCLE': 'Phase 3: Define lifecycle states, enums, and business invariants (e.g., "Cannot sign contract until invoice is PAID").',
            'SECURITY': 'Phase 4: Design Supabase RLS (Row Level Security) policies based on the Auth Roles and Resource permissions.',
            'FINAL': 'Phase 5: Produce a complete JSON Data Contract and the corresponding SQL Migration script.'
        };

        const systemInstruction = `
            You are a World-Class Data Engineer specializing in PostgreSQL and Supabase.
            Your mission is to iteratively build a PRODUCTION-READY data contract for "Maxwell Leadership Enterprise".
            
            Current Phase Instructions: ${phaseInstructions[phase]}
            
            Format your response in STRICT JSON:
            {
                "entities": [...],
                "relationships": [...],
                "invariants": [...],
                "rls_policies": [...],
                "sql": "...",
                "explanation": "...",
                "version": "1.0.x"
            }
        `;

        const prompt = `
            CONTEXT HARVESTED FROM APP:
            Enums: ${context.enums}
            Tables: ${JSON.stringify(context.tables.map(t => ({ name: t.tableName, cols: t.columns })))}
            Samples: ${JSON.stringify(context.sampleData)}
            
            PREVIOUS ITERATIONS:
            ${JSON.stringify(history)}
            
            USER INPUT/FEEDBACK:
            ${userFeedback || "Proceed with current phase optimization."}
        `;

        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { 
                systemInstruction,
                responseMimeType: "application/json"
            }
        });

        const result = JSON.parse(response.text);

        // Log usage
        await AIUsageService.logCall({
            userId: 'dev-architect',
            featureName: `Architect Iteration - ${phase}`,
            model,
            prompt,
            response: response.text
        });

        return result;
    },

    saveBlueprint: async (blueprint: any) => {
        await DevDatabase.add('system_settings', { id: 'AI_BLUEPRINT_DRAFT', config: blueprint });
    },

    getSavedBlueprint: async () => {
        const data = await DevDatabase.getAll<any>('system_settings');
        return data.find(d => d.id === 'AI_BLUEPRINT_DRAFT')?.config || null;
    }
};
