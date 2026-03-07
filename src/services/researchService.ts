
import { GoogleGenAI, Type } from "@google/genai";
import { ResearchContext, ResearchResult } from '../types/research';
import { AIUsageService } from './aiUsageService';

export const ResearchService = {
  /**
   * Performs deep web research with a specific focus on finding social links and qualifying leads.
   */
  performDeepResearch: async (context: ResearchContext): Promise<Omit<ResearchResult, 'memberId'>> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      Perform a detailed OSINT (Open-Source Intelligence) investigation for a sales prospect at Maxwell Leadership Indonesia. 

      **Target Profile:**
      - Full Name: ${context.fullName}
      - Email: ${context.email || 'Not available'}
      - Company: ${context.company || 'Not specified'}
      - City: ${context.city || 'Not specified'}

      **MANDATORY EXTRACTION TASKS:**

      1.  **INSTAGRAM INTELLIGENCE (Priority):** 
          - Search specifically for their Instagram profile.
          - Extract or Estimate **Follower Count** from search snippets (e.g. "10k Followers"). If unknown, set to 0.
          - Check for **Blue Tick / Verified** status clues.
          - Identify associated **Business Brands** or **Communities** listed in their bio (e.g. "Owner @brandname", "Member of HIPMI").

      2.  **PROFESSIONAL PERSONA & WEALTH INDICATORS:** 
          - Current Role & Company Scale (Startup, SME, Enterprise).
          - **Wealth Segment Inference:** Based on role, company size, and digital presence, infer if they are: 'MASS', 'AFFLUENT', or 'HNW' (High Net Worth).
          - Digital Footprint summary.

      3.  **SALES QUALIFICATION:**
          - Willingness to Grow (1-10) & Ability to Pay (1-10).
          - Recommend a Maxwell Product.

      4.  **OUTPUT FORMAT:**
          Return STRICT JSON matching the schema below. Do not use markdown code blocks.
    `;
    
    const model = 'gemini-3-pro-preview';
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, enum: ["FOUND", "AMBIGUOUS", "NOT_FOUND"] },
            personProfile: {
              type: Type.OBJECT,
              properties: {
                currentRole: { type: Type.STRING },
                companyScale: { type: Type.STRING },
                location: { type: Type.STRING },
                professionalSummary: { type: Type.STRING },
                keyAchievements: { type: Type.ARRAY, items: { type: Type.STRING } },
                digitalFootprint: { type: Type.STRING }
              }
            },
            socialIntelligence: {
              type: Type.OBJECT,
              properties: {
                  instagramHandle: { type: Type.STRING },
                  instagramFollowers: { type: Type.NUMBER, description: "Numeric estimate, e.g. 1500" },
                  isVerified: { type: Type.BOOLEAN },
                  businessAccounts: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Brand handles found in bio" },
                  primaryCommunity: { type: Type.STRING, description: "e.g. JCI, HIPMI, Church Community" },
                  inferredWealthSegment: { type: Type.STRING, enum: ["MASS", "AFFLUENT", "HNW"], description: "Estimated wealth class based on digital footprint" }
              }
            },
            socialLinks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  platform: { type: Type.STRING },
                  url: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                  snippet: { type: Type.STRING }
                }
              }
            },
            scoring: {
              type: Type.OBJECT,
              properties: {
                willingnessToGrow: { type: Type.NUMBER },
                abilityToPay: { type: Type.NUMBER },
                accuracyScore: { type: Type.NUMBER }
              }
            },
            triage: {
              type: Type.OBJECT,
              properties: {
                recommendedMaxwellProduct: { type: Type.STRING },
                salesStrategy: { type: Type.STRING },
                perceivedChallenges: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            },
            alternativeMatches: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  links: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              }
            }
          }
        }
      }
    });

    // --- LOG AI USAGE ---
    await AIUsageService.logCall({
        userId: context.userId || 'unknown',
        featureName: context.featureName || 'CRM Deep Research',
        model,
        prompt,
        response: response.text
    });
    
    const result = JSON.parse(response.text);
    
    // Grounding for manual audit
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const links = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title,
        uri: chunk.web.uri
      }));

    return { 
      ...result, 
      id: `RES-${Date.now()}`,
      timestamp: new Date().toISOString(),
      groundingLinks: links 
    };
  }
};
