import React from 'react';
import { Bot, Lightbulb, AlertTriangle, CheckCircle } from 'lucide-react';
import { MarketingInsight } from '../../services/aiService';

interface AIMarketingAdvisorProps {
  insights: MarketingInsight[];
  analyzing: boolean;
}

const AIMarketingAdvisor: React.FC<AIMarketingAdvisorProps> = ({ insights, analyzing }) => {
  return (
    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10"><Bot size={128} /></div>
        <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
                <div className="bg-indigo-500/30 p-2 rounded-lg backdrop-blur-sm border border-indigo-400/30">
                    <Bot size={24} className="text-indigo-300" />
                </div>
                <h2 className="text-xl font-bold">AI Marketing Advisor</h2>
                {analyzing && <span className="text-xs text-indigo-300 animate-pulse">Analyzing data...</span>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {insights.length > 0 ? insights.map((insight, idx) => (
                    <div key={idx} className={`p-4 rounded-xl border backdrop-blur-sm bg-white/5 ${
                        insight.type === 'OPPORTUNITY' ? 'border-blue-400/50' : 
                        insight.type === 'WARNING' ? 'border-yellow-400/50' : 'border-green-400/50'
                    }`}>
                        <div className="flex items-center mb-2">
                            {insight.type === 'OPPORTUNITY' && <Lightbulb size={18} className="text-blue-300 mr-2"/>}
                            {insight.type === 'WARNING' && <AlertTriangle size={18} className="text-yellow-300 mr-2"/>}
                            {insight.type === 'SUCCESS' && <CheckCircle size={18} className="text-green-300 mr-2"/>}
                            <h3 className="font-bold text-sm">{insight.title}</h3>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{insight.description}</p>
                    </div>
                )) : (
                    <div className="col-span-3 text-center py-8 text-slate-400 text-sm">
                        {analyzing ? 'Consulting with Gemini AI...' : 'Running intelligent analysis on your campaign performance...'}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default AIMarketingAdvisor;