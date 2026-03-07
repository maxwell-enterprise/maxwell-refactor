
import React, { useState, useEffect } from 'react';
import { SchemaService, TableDefinition } from '../../services/schemaService';
import { AISchemaService, AISchemaResponse } from '../../services/aiSchemaService';
import { 
    BrainCircuit, Sparkles, Send, Database, CheckCircle2, 
    Code, BookOpen, AlertCircle, Copy, RefreshCw, Layers
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const AISchemaArchitect: React.FC = () => {
    const { showToast } = useToast();
    const [tables, setTables] = useState<TableDefinition[]>([]);
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<AISchemaResponse | null>(null);
    const [userInput, setUserInput] = useState('');
    const [history, setHistory] = useState<{role: 'user' | 'ai', content: string}[]>([]);

    useEffect(() => {
        SchemaService.getTables().then(setTables);
    }, []);

    const handleGenerate = async (feedback?: string) => {
        setLoading(true);
        try {
            const result = await AISchemaService.generateOptimalSchema(tables, feedback);
            setResponse(result);
            setHistory(prev => [...prev, 
                { role: 'user', content: feedback || 'Initial generation request.' },
                { role: 'ai', content: 'Schema Updated based on your feedback.' }
            ]);
        } catch (e) {
            showToast('AI Generation failed. Check API Key.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCopySQL = () => {
        if (!response) return;
        navigator.clipboard.writeText(response.sql);
        showToast('SQL copied to clipboard!', 'success');
    };

    return (
        <div className="flex h-full bg-slate-50 overflow-hidden animate-fade-in">
            {/* LEFT: Chat & Context */}
            <div className="w-80 border-r border-slate-200 bg-white flex flex-col">
                <div className="p-4 border-b border-slate-100 bg-slate-900 text-white">
                    <h3 className="font-bold flex items-center gap-2">
                        <BrainCircuit size={18} className="text-blue-400" />
                        AI Architect
                    </h3>
                    <p className="text-[10px] text-blue-300 uppercase font-bold tracking-widest mt-1">Supabase SQL Designer</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {history.length === 0 ? (
                        <div className="text-center py-8">
                            <Sparkles size={32} className="mx-auto mb-4 text-indigo-500 opacity-30"/>
                            <p className="text-xs text-slate-500 italic">"I've analyzed your {tables.length} mock tables. Ready to build your production SQL blueprint."</p>
                        </div>
                    ) : (
                        history.map((h, i) => (
                            <div key={i} className={`p-3 rounded-xl text-xs ${h.role === 'user' ? 'bg-blue-50 text-blue-700 ml-4 border border-blue-100' : 'bg-slate-100 text-slate-600 mr-4'}`}>
                                <p className="font-bold uppercase text-[9px] mb-1 opacity-50">{h.role === 'user' ? 'You' : 'Architect'}</p>
                                {h.content}
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 space-y-3">
                    <textarea 
                        className="w-full p-3 border border-slate-200 rounded-xl text-xs h-24 resize-none outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all"
                        placeholder="e.g. 'Ensure transactions link to members via email' or 'Add soft-delete support'..."
                        value={userInput}
                        onChange={e => setUserInput(e.target.value)}
                    />
                    <button 
                        onClick={() => handleGenerate(userInput)}
                        disabled={loading}
                        className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-blue-600 transition-all flex items-center justify-center disabled:opacity-50"
                    >
                        {loading ? <RefreshCw size={14} className="animate-spin mr-2"/> : <Send size={14} className="mr-2"/>}
                        {response ? 'Iterate Design' : 'Start Architect'}
                    </button>
                </div>
            </div>

            {/* RIGHT: Blueprint Output */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {!response && !loading ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center px-12">
                        <Layers size={64} className="mb-6 opacity-10" />
                        <h2 className="text-2xl font-bold text-slate-300">Database Blueprint</h2>
                        <p className="max-w-md mt-2">Click "Start Architect" to let Gemini convert your mock data into a production-ready Supabase SQL schema.</p>
                    </div>
                ) : loading ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500 animate-pulse" />
                        </div>
                        <div>
                            <p className="font-bold text-slate-900">AI is Architecting...</p>
                            <p className="text-xs text-slate-500">Normalizing tables, establishing relations, and defining security.</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-8 animate-fade-in custom-scrollbar bg-white">
                        <div className="max-w-5xl mx-auto space-y-10 pb-20">
                            
                            {/* Explanation */}
                            <section>
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                                    <BookOpen size={20} className="text-blue-600" />
                                    Architectural Logic
                                </h3>
                                <div className="prose prose-sm max-w-none text-slate-600 bg-slate-50 p-6 rounded-2xl border border-slate-100 leading-relaxed whitespace-pre-wrap">
                                    {response.explanation}
                                </div>
                            </section>

                            {/* SQL Code Block */}
                            <section>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                        <Code size={20} className="text-purple-600" />
                                        Supabase SQL Script
                                    </h3>
                                    <button 
                                        onClick={handleCopySQL}
                                        className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100"
                                    >
                                        <Copy size={14}/> Copy SQL
                                    </button>
                                </div>
                                <div className="relative group">
                                    <pre className="bg-slate-900 text-blue-100 p-6 rounded-2xl overflow-x-auto text-xs font-mono border border-slate-800 shadow-xl max-h-[500px]">
                                        {response.sql}
                                    </pre>
                                    <div className="absolute top-4 right-4 bg-white/10 px-2 py-1 rounded text-[10px] text-white/50 uppercase font-bold">PostgreSQL</div>
                                </div>
                                <div className="mt-3 flex items-center gap-2 text-[10px] text-amber-600 bg-amber-50 p-2 rounded border border-amber-100">
                                    <AlertCircle size={12}/>
                                    <span>Warning: Always backup data before running migration scripts in a live environment.</span>
                                </div>
                            </section>

                            {/* Diagram Logic Placeholder (Optional visualization logic) */}
                            {response.visualDiagramCode && (
                                <section>
                                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                                        <Layers size={20} className="text-emerald-600" />
                                        Entity Relationship Map
                                    </h3>
                                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-hidden flex flex-col items-center">
                                         <pre className="text-[10px] text-slate-400 font-mono w-full bg-slate-50 p-4 rounded overflow-x-auto">
                                             {response.visualDiagramCode}
                                         </pre>
                                         <p className="mt-4 text-xs text-slate-400">Copy this code into a Mermaid Live Editor to visualize the connections.</p>
                                    </div>
                                </section>
                            )}

                            <div className="bg-green-50 p-6 rounded-3xl border border-green-100 flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0">
                                    <CheckCircle2 size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-green-900">Blueprint Ready</h4>
                                    <p className="text-sm text-green-700">This schema fulfills all identified business rules from your mock environment.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AISchemaArchitect;
