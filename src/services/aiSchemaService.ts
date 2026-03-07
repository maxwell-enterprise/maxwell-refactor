
import { GoogleGenAI } from "@google/genai";
import { TableDefinition } from './schemaService';
import { AIUsageService } from './aiUsageService';

export interface AISchemaResponse {
    sql: string;
    explanation: string;
    visualDiagramCode?: string; // Mermaid format
}

// In a real NodeJS environment, we would use:
// import fs from 'fs';
// const accessDoc = fs.readFileSync('docs/context/01_access_control.md', 'utf-8');
//
// Since we are in a Browser/Vite environment, we simulate the "Reading" of these files.
// Ideally, you would use 'import accessDoc from ../docs/context/01_access_control.md?raw' if Vite config allows.
// For now, we manually map the content here to ensure the AI gets the context without build config changes.

const DOCS_CONTEXT = `
# Business Architecture: Lock & Key Access Control
This application manages high-ticket leadership training events using a "Lock & Key" philosophy.

## Core Concepts
1. **The Lock (Event):** An event is not just a date on a calendar; it is a secured resource.
   - Events can be Hierarchical (Series -> Classes).
   - Events have "Access Rules".

2. **The Key (Access Tag):** Access is NOT granted by "buying a product". Access is granted by "possessing a Tag".
   - Products are merely vehicles to sell Tags.
   - Tags can be "UNLIMITED" (Badge style, e.g., VIP Pass) or "CONSUMABLE" (Punch card style, e.g., 5x Class Pass).

3. **The Wallet:** Users hold Tags in their Wallet.
   - When a user attends an event, the system checks their Wallet for a matching Tag defined in the Event's Access Rules.
   - If the Tag is CONSUMABLE, 1 credit is deducted.

# Database Design Standards
1. **Primary Keys:** Always use UUID type.
2. **Naming Convention:** snake_case for tables and columns.
3. **Relationships:** Use Junction Tables, avoid JSON arrays for FKs.
4. **Audit:** Critical movements must use an append-only Ledger table.
`;

export const AISchemaService = {
  /**
   * Generates a production-ready SQL blueprint from mock definitions
   * NOW WITH CONTEXT AWARENESS
   */
  generateOptimalSchema: async (tables: TableDefinition[], userFeedback?: string): Promise<AISchemaResponse> => {
    if (!process.env.API_KEY) {
        throw new Error("Gemini API Key missing. Ensure you are in a valid environment.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-pro-preview';

    // Prepare table metadata
    const schemaContext = tables.map(t => ({
        name: t.tableName,
        description: t.description,
        columns: t.columns.map(c => ({ 
            name: c.name, 
            type: c.type, 
            isPk: c.isPk, 
            isFk: c.isFk,
            potentialFkTarget: c.fkTarget
        }))
    }));

    const systemInstruction = `
      You are a World-Class Database Architect.
      
      **MISSION:** 
      Transform a "Mock Frontend Schema" into a "Production-Ready SQL Database" optimized for Supabase (PostgreSQL).

      **ARCHITECTURAL CONTEXT (FROM /docs folder):**
      ${DOCS_CONTEXT}

      **CRITICAL TASKS:**
      1. **Normalize Relationships:** Convert legacy JSON arrays (e.g. event.creditTags) into proper 1:N or N:M tables as described in the context.
      2. **Enforce Snake Case:** Convert all camelCase fields to snake_case.
      3. **Foreign Keys:** Explicitly define foreign key constraints.
      
      **OUTPUT FORMAT:**
      Return a JSON object:
      {
        "changes": [
            { 
                "type": "RENAME_COLUMN" | "CHANGE_TYPE" | "ADD_COLUMN" | "REMOVE_COLUMN" | "ADD_RELATION" | "NEW_TABLE",
                "entity": "table_name",
                "field": "column_name",
                "oldValue": "...",
                "newValue": "...",
                "reason": "Why?",
                "impact": "HIGH" | "MEDIUM" | "LOW"
            }
        ],
        "sql": "CREATE TABLE ...",
        "explanation": "Markdown text explaining the design decisions...",
        "visualDiagramCode": "mermaid ER diagram code..."
      }
    `;

    const prompt = `
      Current Schema Definitions:
      ${JSON.stringify(schemaContext, null, 2)}
      
      User Specific Feedback:
      ${userFeedback || "Align the schema strictly with the Lock & Key architecture documentation provided."}
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { 
          systemInstruction,
          responseMimeType: "application/json"
      }
    });

    // Log AI usage
    await AIUsageService.logCall({
        userId: 'admin',
        featureName: 'AI Schema Architect (Context Aware)',
        model,
        prompt: 'Generate Schema with Lock & Key Context',
        response: response.text
    });

    return JSON.parse(response.text) as AISchemaResponse;
  }
};
