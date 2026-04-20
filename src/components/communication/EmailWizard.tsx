
import React, { useState, useMemo, useRef } from 'react';
import { EmailCampaign, EmailAttachment } from '../../types/index';
import { MEMBER_DATA } from '../../constants';
import { TRIGGER_CATALOG } from '../../constants/triggerCatalog';
import { TriggerDefinition } from '../../types/automation';
import { CommunicationService } from '../../services/communicationService';
import { PDFService } from '../../services/pdfService';
import { useToast } from '../../context/ToastContext';
import { 
    X, Clock, Users, Zap, Calendar, Sparkles, Paperclip, 
    ChevronRight, CheckCircle, File, FileText, ArrowRight, Loader2
} from 'lucide-react';
import RichTextEditor from './RichTextEditor';
import TriggerSelector from '../automation/TriggerSelector';

interface EmailWizardProps {
    onClose: () => void;
    onComplete: () => void;
}

const EmailWizard: React.FC<EmailWizardProps> = ({ onClose, onComplete }) => {
    const { showToast } = useToast();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    
    // Campaign State
    const [campaign, setCampaign] = useState<Partial<EmailCampaign>>({
        name: '',
        triggerType: 'IMMEDIATE',
        audienceFilter: {},
        attachments: [],
        subject: '',
        body: 'Dear {{name}},<br/><br/>'
    });

    // New State for Selected Trigger Definition (for context variables)
    const [selectedTriggerDef, setSelectedTriggerDef] = useState<TriggerDefinition | null>(null);

    // AI State
    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiGenerating, setIsAiGenerating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const submitLockRef = useRef(false);

    // Attachment State
    const [pdfTemplates, setPdfTemplates] = useState<any[]>([]);
    
    // Load PDF Templates on mount
    React.useEffect(() => {
        PDFService.getTemplates().then(setPdfTemplates);
    }, []);

    // Estimated Audience Calculation
    const estimatedAudience = useMemo(() => {
        if (!campaign.audienceFilter || Object.keys(campaign.audienceFilter).length === 0) return MEMBER_DATA.length;
        const filter = campaign.audienceFilter;
        return MEMBER_DATA.filter(m => {
            const matchCat = !filter.category || m.category === filter.category;
            const matchStage = !filter.lifecycleStage || m.lifecycleStage === filter.lifecycleStage;
            const matchEvent = !filter.eventId || Math.random() > 0.7; // Mock
            return matchCat && matchStage && matchEvent;
        }).length;
    }, [campaign.audienceFilter]);

    // Available Variables Logic: Combines Standard Member Vars + Trigger Specific Vars
    const availableVariables = useMemo(() => {
        const standardVars = ['name', 'email', 'phone', 'company', 'join_date'];
        if (!selectedTriggerDef) return standardVars;
        
        // Add trigger variables
        const triggerVars = selectedTriggerDef.variables.map(v => v.key);
        return [...standardVars, ...triggerVars];
    }, [selectedTriggerDef]);

    const handleTriggerSelect = (triggerDef: TriggerDefinition) => {
        setSelectedTriggerDef(triggerDef);
        setCampaign({
            ...campaign, 
            triggerType: 'SYSTEM_EVENT',
            eventRelativeConfig: { ...campaign.eventRelativeConfig!, eventId: triggerDef.id } // Storing Trigger ID in eventId for backend compatibility
        });
    };

    const handleAiGenerate = async () => {
        if (!aiPrompt) return;
        setIsAiGenerating(true);
        
        // Pass context to AI
        const context = `
            Sender: Maxwell Leadership System
            Audience: ${campaign.audienceFilter?.category || 'All Members'}
            Trigger: ${selectedTriggerDef ? selectedTriggerDef.label : campaign.triggerType}
            Available Data: ${availableVariables.join(', ')}
            User Goal: ${aiPrompt}
        `;
        
        const result = await CommunicationService.generateEmailContent(context, 'PROFESSIONAL');
        setCampaign(prev => ({ ...prev, subject: result.subject, body: result.body }));
        setIsAiGenerating(false);
    };

    const handleAddAttachment = (type: 'STATIC_FILE' | 'DYNAMIC_PDF', value: string) => {
        const newAtt: EmailAttachment = {
            id: `att-${Date.now()}`,
            name: type === 'DYNAMIC_PDF' ? 'Personalized Document.pdf' : 'Brochure.pdf',
            type,
            url: type === 'STATIC_FILE' ? value : undefined,
            pdfTemplateId: type === 'DYNAMIC_PDF' ? value : undefined
        };
        setCampaign(prev => ({ ...prev, attachments: [...(prev.attachments || []), newAtt] }));
    };

    const handleSubmit = async () => {
        if (submitLockRef.current || isSubmitting) return;
        if (!campaign.subject || !campaign.body || !campaign.name) {
            showToast('Please complete all required fields.', 'error');
            return;
        }
        submitLockRef.current = true;
        setIsSubmitting(true);
        try {
            await CommunicationService.createCampaign(campaign);
            onComplete();
        } catch (e) {
            showToast(
                e instanceof Error ? e.message : 'Failed to save campaign. Please try again.',
                'error',
            );
        } finally {
            submitLockRef.current = false;
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
                
                {/* Header */}
                <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">New Email Creator</h2>
                        <div className="flex gap-2 mt-2 items-center text-xs font-bold text-slate-400">
                            <span className={`px-2 py-1 rounded ${step >= 1 ? 'bg-blue-100 text-blue-700' : ''}`}>1. Logic</span>
                            <ChevronRight size={12} />
                            <span className={`px-2 py-1 rounded ${step >= 2 ? 'bg-blue-100 text-blue-700' : ''}`}>2. Audience</span>
                            <ChevronRight size={12} />
                            <span className={`px-2 py-1 rounded ${step >= 3 ? 'bg-blue-100 text-blue-700' : ''}`}>3. Content</span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="text-slate-400 hover:text-slate-700 disabled:opacity-40 disabled:pointer-events-none"
                    >
                        <X size={24}/>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
                    
                    {/* STEP 1: LOGISTICS (WHEN & WHY) */}
                    {step === 1 && (
                        <div className="max-w-5xl mx-auto space-y-8">
                            <div className="grid grid-cols-12 gap-8">
                                {/* Left Column: Basic Info & Main Mode */}
                                <div className="col-span-4 space-y-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Campaign Name</label>
                                        <input 
                                            type="text" 
                                            className="w-full p-4 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" 
                                            placeholder="e.g. Invoice Confirmation 2025"
                                            value={campaign.name}
                                            onChange={e => setCampaign({...campaign, name: e.target.value})}
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <label className="block text-xs font-bold text-slate-500 uppercase">Trigger Mode</label>
                                        
                                        <button 
                                            onClick={() => { setCampaign({...campaign, triggerType: 'IMMEDIATE'}); setSelectedTriggerDef(null); }}
                                            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${['SCHEDULED', 'IMMEDIATE'].includes(campaign.triggerType || '') ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                                        >
                                            <div className="flex items-center mb-2">
                                                <Calendar size={20} className={`${['SCHEDULED', 'IMMEDIATE'].includes(campaign.triggerType || '') ? 'text-blue-600' : 'text-slate-400'} mr-3`} />
                                                <span className="font-bold text-slate-900">Time Based</span>
                                            </div>
                                            <p className="text-xs text-slate-500">Send immediately or schedule for later.</p>
                                        </button>

                                        <button 
                                            onClick={() => { setCampaign({...campaign, triggerType: 'SYSTEM_EVENT'}); }}
                                            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${campaign.triggerType === 'SYSTEM_EVENT' ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                                        >
                                            <div className="flex items-center mb-2">
                                                <Zap size={20} className={`${campaign.triggerType === 'SYSTEM_EVENT' ? 'text-blue-600' : 'text-slate-400'} mr-3`} />
                                                <span className="font-bold text-slate-900">System Trigger</span>
                                            </div>
                                            <p className="text-xs text-slate-500">Automated by events (e.g. Payment).</p>
                                        </button>
                                    </div>
                                    
                                    {['SCHEDULED', 'IMMEDIATE'].includes(campaign.triggerType || '') && (
                                        <div className="bg-white p-4 rounded-xl border border-slate-200 animate-fade-in">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Schedule</label>
                                            <input 
                                                type="datetime-local" 
                                                className="w-full p-3 border border-slate-300 rounded-lg text-sm"
                                                onChange={(e) => setCampaign({...campaign, triggerType: 'SCHEDULED', scheduledAt: e.target.value})}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Right Column: Advanced Selector */}
                                <div className="col-span-8">
                                    {campaign.triggerType === 'SYSTEM_EVENT' ? (
                                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col overflow-hidden animate-fade-in">
                                            <div className="p-4 border-b border-slate-100 bg-slate-50">
                                                <h3 className="font-bold text-slate-800 text-sm flex items-center">
                                                    <Zap size={16} className="mr-2 text-indigo-600" />
                                                    Select Automation Trigger
                                                </h3>
                                            </div>
                                            <div className="flex-1 p-4 overflow-hidden">
                                                <TriggerSelector 
                                                    selectedTriggerId={selectedTriggerDef?.id}
                                                    onSelect={handleTriggerSelect}
                                                    className="h-full"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 bg-slate-50/50">
                                            <div className="text-center">
                                                <Clock size={48} className="mx-auto mb-4 opacity-50" />
                                                <p className="text-sm">Standard Blast Mode Selected.</p>
                                                <p className="text-xs mt-1">Select "System Trigger" to configure automation.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: AUDIENCE (WHO) */}
                    {step === 2 && (
                        <div className="max-w-2xl mx-auto space-y-6">
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">Target Audience</h3>
                                <p className="text-slate-500">Filter the recipients for this email.</p>
                            </div>

                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-2xl text-white shadow-lg flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                        <Users className="text-white" size={24} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-2xl">{estimatedAudience}</div>
                                        <div className="text-blue-100 text-sm">Estimated Recipients</div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Member Tier</label>
                                        <select 
                                            className="w-full p-3 border border-slate-300 rounded-xl text-sm outline-none"
                                            onChange={(e) => setCampaign({...campaign, audienceFilter: {...campaign.audienceFilter, category: e.target.value}})}
                                        >
                                            <option value="">All Tiers</option>
                                            <option value="President">President</option>
                                            <option value="Partner">Partner</option>
                                            <option value="Member">Member</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Lifecycle Stage</label>
                                        <select 
                                            className="w-full p-3 border border-slate-300 rounded-xl text-sm outline-none"
                                            onChange={(e) => setCampaign({...campaign, audienceFilter: {...campaign.audienceFilter, lifecycleStage: e.target.value}})}
                                        >
                                            <option value="">All Stages</option>
                                            <option value="GUEST">Guest</option>
                                            <option value="MEMBER">Member</option>
                                            <option value="CERTIFIED">Certified</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: CONTENT (WHAT) */}
                    {step === 3 && (
                        <div className="flex gap-6 h-full">
                            <div className="flex-1 space-y-4 flex flex-col h-full">
                                
                                {/* Header Info */}
                                <div className="flex justify-between items-end">
                                    <div className="flex-1 mr-4">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email Subject</label>
                                        <input 
                                            type="text" 
                                            className="w-full p-4 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="Enter a catchy subject line..."
                                            value={campaign.subject}
                                            onChange={e => setCampaign({...campaign, subject: e.target.value})}
                                        />
                                    </div>
                                    {selectedTriggerDef && (
                                        <div className="bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-lg text-xs text-indigo-700 max-w-xs">
                                            <strong>Context:</strong> {selectedTriggerDef.label} active. <br/>
                                            {selectedTriggerDef.variables.length} dynamic variables available.
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex-1 flex flex-col min-h-0">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Message Content</label>
                                    <div className="flex-1 min-h-0 relative">
                                        <RichTextEditor 
                                            value={campaign.body || ''} 
                                            onChange={(val) => setCampaign({...campaign, body: val})}
                                            availableVariables={availableVariables}
                                        />
                                    </div>
                                </div>

                                {/* Attachments Area */}
                                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm mt-4">
                                    <h4 className="text-xs font-bold text-slate-700 uppercase mb-3 flex items-center">
                                        <Paperclip size={14} className="mr-1"/> Attachments
                                    </h4>
                                    
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {campaign.attachments?.map(att => (
                                            <div key={att.id} className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center text-xs shadow-sm font-medium text-slate-700">
                                                {att.type === 'DYNAMIC_PDF' ? <FileText size={14} className="text-red-500 mr-2"/> : <File size={14} className="text-blue-500 mr-2"/>}
                                                {att.name}
                                                <button className="ml-2 text-slate-400 hover:text-red-500 p-1"><X size={12}/></button>
                                            </div>
                                        ))}
                                        {campaign.attachments?.length === 0 && <span className="text-xs text-slate-400 italic">No files attached.</span>}
                                    </div>

                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleAddAttachment('STATIC_FILE', 'url')}
                                            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-100 flex items-center text-slate-600 transition-colors"
                                        >
                                            <File size={14} className="mr-2"/> Upload File
                                        </button>
                                        <div className="relative group">
                                            <button className="px-4 py-2 bg-red-50 border border-red-100 rounded-lg text-xs font-bold hover:bg-red-100 flex items-center text-red-600 transition-colors">
                                                <FileText size={14} className="mr-2"/> Attach Smart PDF
                                            </button>
                                            <div className="absolute bottom-full left-0 mb-2 w-56 bg-white border border-slate-200 shadow-xl rounded-xl hidden group-hover:block z-50 overflow-hidden">
                                                <div className="p-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase">Select Template</div>
                                                {pdfTemplates.map(tpl => (
                                                    <button 
                                                        key={tpl.id}
                                                        onClick={() => handleAddAttachment('DYNAMIC_PDF', tpl.id)}
                                                        className="w-full text-left px-4 py-3 text-xs hover:bg-blue-50 text-slate-700 border-b border-slate-50 last:border-0"
                                                    >
                                                        {tpl.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* AI Sidebar */}
                            <div className="w-80 bg-gradient-to-b from-indigo-50 to-white p-6 rounded-2xl border border-indigo-100 flex flex-col h-full shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-lg shadow-indigo-200"><Sparkles size={18}/></div>
                                    <h3 className="font-bold text-indigo-900">AI Writer</h3>
                                </div>
                                <p className="text-xs text-indigo-700 mb-4 leading-relaxed bg-indigo-100/50 p-3 rounded-lg">
                                    I'll draft the email based on your logic: 
                                    <br/><strong>Trigger:</strong> {selectedTriggerDef ? selectedTriggerDef.label : campaign.triggerType}
                                    <br/><strong>Audience:</strong> {campaign.audienceFilter?.category || 'All'}
                                </p>
                                <textarea 
                                    className="w-full p-4 border border-indigo-200 rounded-xl text-sm mb-4 outline-none focus:border-indigo-500 h-40 resize-none bg-white shadow-inner"
                                    placeholder="Tell AI what to write (e.g. 'Write a polite invoice reminder with a sense of urgency')..."
                                    value={aiPrompt}
                                    onChange={e => setAiPrompt(e.target.value)}
                                ></textarea>
                                <button 
                                    onClick={handleAiGenerate}
                                    disabled={isAiGenerating || !aiPrompt}
                                    className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-lg shadow-indigo-200 mt-auto"
                                >
                                    {isAiGenerating ? 'Drafting Magic...' : 'Generate Content'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-5 border-t border-slate-100 bg-white flex justify-between z-20">
                    <button 
                        type="button"
                        onClick={() => setStep(prev => Math.max(1, prev - 1) as any)}
                        disabled={step === 1 || isSubmitting}
                        className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl disabled:opacity-30 transition-colors"
                    >
                        Back
                    </button>
                    {step < 3 ? (
                        <button 
                            type="button"
                            onClick={() => setStep(prev => prev + 1 as any)}
                            disabled={isSubmitting}
                            className="px-8 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-lg flex items-center transition-all disabled:opacity-50 disabled:pointer-events-none"
                        >
                            Next Step <ChevronRight size={16} className="ml-2"/>
                        </button>
                    ) : (
                        <button 
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-8 py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg flex items-center shadow-green-200 transition-all disabled:opacity-70 disabled:pointer-events-none disabled:hover:scale-100"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={18} className="mr-2 animate-spin" /> Menyimpan…
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={18} className="mr-2"/> Finish & Launch
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmailWizard;
