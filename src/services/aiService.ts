
import { GoogleGenAI } from "@google/genai";
import { Campaign, Discount, Product } from '../types/index';
import { AIUsageService } from './aiUsageService'; // LOGGING

export interface MarketingInsight {
    title: string;
    description: string;
    type: 'OPPORTUNITY' | 'WARNING' | 'SUCCESS';
}

export const AIService = {
  /**
   * Sends a message to the AI Coach persona
   */
  chatWithCoach: async (message: string, userContext: any) => {
    // If we have an API Key, use the real Gemini model
    if (process.env.API_KEY) {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const model = "gemini-3-flash-preview";
            const systemPrompt = `You are a Leadership Coach based on John Maxwell's principles. 
            User Context: ${JSON.stringify(userContext)}.
            Answer briefly and inspiringly.`;
            
            const response = await ai.models.generateContent({
                model,
                contents: message,
                config: { systemInstruction: systemPrompt }
            });
            const responseText = response.text ?? "";

            // Log usage
            await AIUsageService.logCall({
                userId: userContext?.id || 'unknown',
                featureName: 'AI Coach Chat',
                model,
                prompt: message,
                response: responseText
            });

            return responseText;
        } catch (e) {
            console.error("Gemini API Error", e);
            // Fallback to mock if API fails
        }
    }
    
    // Mock response for UI development or Offline
    return new Promise<string>((resolve) => {
      setTimeout(() => {
        resolve("That's a profound insight. Leadership is indeed about influence. Have you tried applying the 'Law of Connection' with your team recently?");
      }, 1000);
    });
  },

  /**
   * Generates business insights for the Dashboard
   */
  generateBusinessInsights: async (data: any) => {
    return {
        insight: "Scholarship applications are up 15% in the Indonesia region.",
        action: "Review scholarship budget for Q3."
    };
  },

  /**
   * NEW: Content Generation for CMS
   */
  generateContent: async (topic: string, type: 'ARTICLE' | 'AD', productContext?: Product): Promise<{ title: string, body: string }> => {
      // Simulate AI Generation Latency
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (type === 'AD') {
          return {
              title: `Unlock Your Potential with ${productContext?.title || topic}`,
              body: `Are you ready to take your leadership to the next level? The ${productContext?.title || 'program'} is designed for leaders who demand excellence. Don't just lead—transform. Limited seats available.`
          };
      } else {
          return {
              title: `The 3 Pillars of ${topic}`,
              body: `In today's rapidly changing world, ${topic} is more critical than ever. \n\nJohn Maxwell teaches us that everything rises and falls on leadership. But how does that apply to ${topic}? \n\n1. **Vision:** You must see it before you can seize it.\n2. **Influence:** Leadership is not position, it's influence.\n3. **Growth:** If you're not growing, you're dying.\n\nApplying these principles to your daily routine will yield exponential results.`
          };
      }
  },

  /**
   * Analyzes marketing campaign data and returns actionable advice
   */
  generateMarketingInsights: async (campaigns: Campaign[], discounts: Discount[]): Promise<MarketingInsight[]> => {
      // In a real app, we would send `JSON.stringify({campaigns, discounts})` to Gemini.
      // Here we simulate the AI logic with deterministic rules.
      
      return new Promise((resolve) => {
          setTimeout(() => {
              const insights: MarketingInsight[] = [];

              // Logic 1: High Traffic, Low Conversion (Wastage)
              const trafficWastage = campaigns.find(c => c.clicks > 500 && (c.conversions / c.clicks) < 0.01);
              if (trafficWastage) {
                  insights.push({
                      title: `Improve Conversion on ${trafficWastage.name}`,
                      description: `The campaign "${trafficWastage.name}" drives massive traffic (${trafficWastage.clicks} clicks) but only has ${(trafficWastage.conversions/trafficWastage.clicks*100).toFixed(1)}% conversion. Consider adding a 'Time-Limited' discount or optimizing the landing page.`,
                      type: 'WARNING'
                  });
              }

              // Logic 2: High Value Channel (Scalability)
              const bestChannel = [...campaigns].sort((a,b) => (b.revenue/b.clicks) - (a.revenue/a.clicks))[0];
              if (bestChannel && bestChannel.conversions > 5) {
                  insights.push({
                      title: `Scale Up: ${bestChannel.category.replace('_',' ')}`,
                      description: `Your ${bestChannel.category} campaigns generate the highest revenue per click. Recommendation: Shift 20% of the budget from offline events to this channel.`,
                      type: 'SUCCESS'
                  });
              }

              // Logic 3: Voucher Utilization (Urgency)
              const underUsedVoucher = discounts.find(d => d.maxUsageLimit && (d.currentUsageCount / d.maxUsageLimit) < 0.2);
              if (underUsedVoucher) {
                  insights.push({
                      title: `Promote Voucher: ${underUsedVoucher.code}`,
                      description: `The voucher ${underUsedVoucher.code} has very low utilization. Try attaching this code to the next Email Blast to boost engagement.`,
                      type: 'OPPORTUNITY'
                  });
              }

              resolve(insights);
          }, 1500);
      });
  }
};
