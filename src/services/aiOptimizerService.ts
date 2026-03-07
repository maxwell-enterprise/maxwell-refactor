
import { GoogleGenAI } from "@google/genai";
import { TableDefinition, TableCategory } from './schemaService';
import { AIUsageService } from './aiUsageService';
import { OptimizationResult, UserStory, SchemaChange, OptimizedTable, OptimizationHistoryItem } from '../types/schemaOptimizer';
import { DevDatabase } from '../utils/devDatabase';
import { APP_CONFIG } from '../lib/config';
import { SEED_SCHEMA_HISTORY } from '../seeds/schema_history';

// Helper to determine impacted screens based on table name
const getImpactedScreens = (tableName: string): string[] => {
    const map: Record<string, string[]> = {
        'members': ['CRM > Member Directory', 'Member Profile', 'Auth'],
        'transactions': ['Finance > Ledger', 'My Wallet'],
        'products': ['Store > Catalog', 'Finance > Invoices'],
        'events': ['Operations > Events', 'Member > Event Calendar'],
        'inventory': ['Operations > Inventory', 'Store > Fulfillment'],
        'whatsapp_task_queue': ['Communication > WA Queue'],
        'email_campaigns': ['Communication > Email Campaigns'],
    };
    return map[tableName] || ['System Internal'];
};

export const AIOptimizerService = {
  
  // --- PERSISTENCE METHODS ---
  getHistory: async (): Promise<OptimizationHistoryItem[]> => {
      if (APP_CONFIG.USE_MOCK) {
          try {
              if (await DevDatabase.isEmpty('schema_optimizations')) {
                  await DevDatabase.bulkAdd('schema_optimizations', SEED_SCHEMA_HISTORY);
                  return SEED_SCHEMA_HISTORY;
              }
              const history = await DevDatabase.getAll<OptimizationHistoryItem>('schema_optimizations');
              return history.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          } catch(e) { return SEED_SCHEMA_HISTORY; }
      }
      return []; // Supabase implementation omitted for brevity in this slice
  },

  saveHistory: async (result: OptimizationResult): Promise<void> => {
      const history = await AIOptimizerService.getHistory();
      const latestVersion = history.length > 0 ? Math.max(...history.map(h => h.version)) : 0;
      
      // SANITIZATION: Remove functions (getData) from TableDefinition objects before saving to IDB
      // IndexedDB cannot store functions, causing DataCloneError
      const sanitizeTables = (tables: TableDefinition[]) => {
          return tables.map(t => {
              // Destructure to separate getData from the rest of the properties
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { getData, ...serializableTable } = t;
              return serializableTable;
          });
      };

      const sanitizedResult = {
          ...result,
          originalSchema: sanitizeTables(result.originalSchema),
          optimizedSchema: sanitizeTables(result.optimizedSchema)
      };

      const newItem: OptimizationHistoryItem = {
          id: `HIST-${Date.now()}`,
          version: latestVersion + 1,
          timestamp: new Date().toISOString(),
          summary: `Optimization Run (Found ${result.changes.length} suggestions)`,
          result: sanitizedResult as OptimizationResult // Cast back to satisfy type, knowing getData is missing
      };

      if (APP_CONFIG.USE_MOCK) {
          await DevDatabase.add('schema_optimizations', newItem);
      }
  },

  optimizeSchema: async (
    allTables: TableDefinition[], 
    userStories: UserStory[],
    customFeedback?: string,
    onProgress?: (stage: string) => void
  ): Promise<OptimizationResult> => {
    
    if (!process.env.API_KEY) {
        throw new Error("Gemini API Key missing.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-pro-preview';

    // Group tables by category to chunk requests
    const categories: TableCategory[] = ['CORE_IAM', 'FINANCE_COMMERCE', 'OPS_LOGISTICS', 'CRM_SALES', 'ENGAGEMENT_LMS', 'COMMUNICATION', 'SYSTEM'];
    
    let allChanges: SchemaChange[] = [];
    let allOptimizedTables: OptimizedTable[] = [];
    let accumulatedSQL = "";
    let accumulatedSummary = "";

    // ITERATIVE PROCESSING
    for (const category of categories) {
        const categoryTables = allTables.filter(t => t.category === category);
        if (categoryTables.length === 0) continue;

        if (onProgress) onProgress(`Analyzing Domain: ${category}...`);

        // 1. Prepare Context Chunk
        const schemaContext = categoryTables.map(t => ({
            tableName: t.tableName,
            columns: t.columns.map(c => `${c.name} (${c.type})`).join(', '),
            description: t.description
        }));

        // Filter stories relevant to this domain (heuristic matching)
        const domainKeywords = category.split('_');
        const relevantStories = userStories.filter(s => 
            domainKeywords.some(k => s.epic.includes(k) || s.text.toLowerCase().includes(k.toLowerCase()))
        );
        const storyContext = relevantStories.map(s => `- ${s.text}`).join('\n');

        const prompt = `
            You are a Data Architect optimizing the '${category}' domain of a web application.
            
            **Input Context:**
            1. Current Tables (Mock/IndexedDB): ${JSON.stringify(schemaContext)}
            2. Business Needs (User Stories): \n${storyContext}
            3. Global Architect Instructions: "${customFeedback || ''}"
            
            **CRITICAL RULES:**
            - ALL column names MUST be in 'snake_case'. Convert any 'camelCase' (e.g., 'userId') to 'snake_case' (e.g., 'user_id').
            - Be consistent across all tables. 'memberId' in one table and 'member_id' in another is FORBIDDEN. Use 'member_id' everywhere.
            - Ensure Foreign Keys are clearly identified.

            **Task:**
            Analyze these specific tables. Suggest improvements (renaming, type fixing, missing FKs).
            Identify which screens might be impacted based on table names.

            **Output Format (Strict JSON):**
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
                "sqlFragment": "SQL CREATE/ALTER statements...",
                "summary": "Brief analysis of this domain..."
            }
        `;

        try {
            // Set temperature to 0 for consistency
            const response = await ai.models.generateContent({
                model,
                contents: prompt,
                config: { 
                    responseMimeType: "application/json",
                    temperature: 0 
                }
            });

            await AIUsageService.logCall({
                userId: 'admin',
                featureName: `Schema Opt - ${category}`,
                model,
                prompt: `Optimization for ${category}`,
                response: response.text
            });

            const result = JSON.parse(response.text);
            
            if (result.changes) allChanges = [...allChanges, ...result.changes];
            if (result.sqlFragment) accumulatedSQL += `\n/* --- ${category} --- */\n${result.sqlFragment}\n`;
            if (result.summary) accumulatedSummary += `### ${category}\n${result.summary}\n`;

        } catch (e) {
            console.error(`Failed to optimize category ${category}`, e);
        }
    }

    // Post-processing: Construct "Optimized Schema" object for UI
    allOptimizedTables = allTables.map(t => {
        const tableChanges = allChanges.filter(c => c.entity === t.tableName);
        const newCols = t.columns.map(c => {
            const rename = tableChanges.find(ch => ch.type === 'RENAME_COLUMN' && ch.field === c.name);
            const typeChange = tableChanges.find(ch => ch.type === 'CHANGE_TYPE' && ch.field === c.name);
            return {
                ...c,
                name: rename ? rename.newValue! : c.name,
                type: typeChange ? typeChange.newValue as any : c.type
            };
        });
        
        // Handle Added Columns
        tableChanges.filter(ch => ch.type === 'ADD_COLUMN').forEach(ch => {
            newCols.push({ 
                name: ch.field!, 
                type: 'text', 
                description: 'New Field' 
            });
        });

        return {
            ...t,
            columns: newCols
        };
    });

    const finalResult: OptimizationResult = {
        originalSchema: allTables,
        optimizedSchema: allOptimizedTables,
        changes: allChanges,
        sqlMigration: accumulatedSQL,
        analysisSummary: accumulatedSummary
    };

    // PERSIST RESULT
    await AIOptimizerService.saveHistory(finalResult);

    return finalResult;
  }
};
