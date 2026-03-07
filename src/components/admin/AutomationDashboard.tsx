
import React, { useState, useEffect } from 'react';
import { MASTER_EVENT_REGISTRY } from '../../constants/masterEventRegistry';
import { WhatsAppService } from '../../services/whatsappService';
import { WhatsAppTemplate } from '../../types/index';
import { Zap, MessageSquare, AlertCircle, CheckCircle2, ChevronRight, Info, Activity } from 'lucide-react';

const AutomationDashboard: React.FC = () => {
    const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
    
    useEffect(() => {
        WhatsAppService.getTemplates().then(setTemplates);
    }, []);

    const getMappedTemplate = (triggerId: string) => {
        return templates.find(t => t.linkedTriggerId === triggerId);
    };

    return (
        <div className="h-full bg-slate-50 flex flex-col">
            <div className="p-6 bg-white border-b border-slate-200">
                <h2 className="text-xl font-bold text-slate-900 flex items-center">
                    <Activity className="mr-3 text-blue-600" /> Master Event Registry
                </h2>
                <p className="text-slate-500 mt-1 text-sm">
                    Central nervous system. These events trigger actions across Communication, Operations, and Gamification.
                </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 gap-4">
                    {MASTER_EVENT_REGISTRY.map(event => {
                        const template = getMappedTemplate(event.id);
                        return (
                            <div key={event.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
                                {/* Left: Trigger Info */}
                                <div className="flex-1 min-w-[300px]">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-slate-100 rounded-lg text-slate-600 font-mono text-xs font-bold border border-slate-200">
                                            {event.id}
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                                            event.category === 'FINANCE' ? 'bg-emerald-50 text-emerald-700' :
                                            event.category === 'CRM' ? 'bg-blue-50 text-blue-700' :
                                            event.category === 'EVENT' ? 'bg-purple-50 text-purple-700' :
                                            'bg-slate-100 text-slate-700'
                                        }`}>
                                            {event.category}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {React.createElement(event.icon, { size: 20, className: "text-slate-400" })}
                                        <h3 className="font-bold text-slate-900 text-lg">{event.label}</h3>
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1 ml-7">{event.description}</p>
                                    
                                    <div className="mt-4 ml-7">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Event Payload (Context)</p>
                                        <div className="flex flex-wrap gap-2">
                                            {event.variables.map(v => (
                                                <div key={v.key} className="text-xs bg-slate-50 border border-slate-200 px-2 py-1 rounded flex items-center group cursor-help">
                                                    <span className="font-mono text-slate-600 mr-1">{`{{${v.key}}}`}</span>
                                                    <Info size={10} className="text-slate-300"/>
                                                    {/* Tooltip */}
                                                    <div className="absolute bottom-full mb-2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded hidden group-hover:block whitespace-nowrap z-50 shadow-lg">
                                                        Ex: {v.example}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Mapped Actions */}
                                <div className="md:w-[350px] border-l border-slate-100 md:pl-6 flex flex-col justify-center space-y-3">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Subscribed Actions</h4>
                                    
                                    {/* WA Action */}
                                    {template ? (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-3">
                                            <MessageSquare size={16} className="text-green-600 shrink-0 mt-0.5"/>
                                            <div>
                                                <span className="text-xs font-bold text-green-700 block">WhatsApp: {template.label}</span>
                                                <p className="text-[10px] text-green-600 mt-1 line-clamp-1 italic">"{template.message}"</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-slate-50 border border-slate-200 border-dashed rounded-lg p-3 flex items-center gap-3 opacity-60">
                                            <MessageSquare size={16} className="text-slate-400 shrink-0"/>
                                            <span className="text-xs text-slate-400 italic">No WhatsApp triggered</span>
                                        </div>
                                    )}

                                    {/* Placeholder for other actions visualization (Ops, Game) */}
                                    <div className="flex gap-2">
                                        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2 flex items-center justify-center text-[10px] text-slate-400">
                                            <Zap size={12} className="mr-1"/> Ops Tasks
                                        </div>
                                        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2 flex items-center justify-center text-[10px] text-slate-400">
                                            <Zap size={12} className="mr-1"/> Points
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AutomationDashboard;
