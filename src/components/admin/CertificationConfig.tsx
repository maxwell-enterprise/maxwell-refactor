
import React, { useState, useEffect } from 'react';
import { CertificationService } from '../../services/certificationService';
import { CertificationRule, MasterDoneTag } from '../../types/certification';
import { useToast } from '../../context/ToastContext';
import { Plus, Save, Trash2, Award, ListChecks, CheckCircle2, X, Tag, Edit3 } from 'lucide-react';

const CertificationConfig: React.FC = () => {
    const { showToast } = useToast();
    const [rules, setRules] = useState<CertificationRule[]>([]);
    const [tags, setTags] = useState<MasterDoneTag[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'RULES' | 'TAGS'>('RULES');
    
    // Editor States
    const [isEditingRule, setIsEditingRule] = useState(false);
    const [editRule, setEditRule] = useState<Partial<CertificationRule>>({});
    
    const [isEditingTag, setIsEditingTag] = useState(false);
    const [editTag, setEditTag] = useState<Partial<MasterDoneTag>>({});
    
    // Tag Input State for Rule Editor
    const [tagInput, setTagInput] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [rData, tData] = await Promise.all([
            CertificationService.getRules(),
            CertificationService.getMasterTags()
        ]);
        setRules(rData);
        setTags(tData);
        setLoading(false);
    };

    // --- RULE LOGIC ---
    const handleCreateRule = () => {
        setEditRule({
            id: `CERT-${Date.now()}`,
            name: 'New Certification',
            description: '',
            logic: 'REQUIRE_ALL',
            requiredTags: [],
            isActive: true,
            minCountValue: 1
        });
        setIsEditingRule(true);
    };

    const handleEditRule = (rule: CertificationRule) => {
        setEditRule(JSON.parse(JSON.stringify(rule)));
        setIsEditingRule(true);
    };

    const handleSaveRule = async () => {
        if (!editRule.name || !editRule.requiredTags || editRule.requiredTags.length === 0) {
            showToast('Name and at least one tag are required.', 'error');
            return;
        }
        await CertificationService.saveRule(editRule as CertificationRule);
        showToast('Rule saved successfully', 'success');
        setIsEditingRule(false);
        loadData();
    };

    const addTagToRule = () => {
        // Now we can select from existing tags, or type a new one manually if needed (legacy)
        if(tagInput && !editRule.requiredTags?.includes(tagInput)) {
            setEditRule(prev => ({
                ...prev,
                requiredTags: [...(prev.requiredTags || []), tagInput]
            }));
            setTagInput('');
        }
    };
    
    const addMasterTagToRule = (tagCode: string) => {
        if(tagCode && !editRule.requiredTags?.includes(tagCode)) {
            setEditRule(prev => ({
                ...prev,
                requiredTags: [...(prev.requiredTags || []), tagCode]
            }));
        }
    };

    const removeTagFromRule = (tag: string) => {
        setEditRule(prev => ({
            ...prev,
            requiredTags: prev.requiredTags?.filter(t => t !== tag)
        }));
    };

    // --- TAG LOGIC ---
    const handleCreateTag = () => {
        setEditTag({
            id: `TAG-${Date.now()}`,
            code: 'DONE_',
            label: 'New Completion Tag',
            category: 'CORE',
            description: ''
        });
        setIsEditingTag(true);
    };

    const handleEditTag = (tag: MasterDoneTag) => {
        setEditTag({ ...tag });
        setIsEditingTag(true);
    };

    const handleSaveTag = async () => {
        if (!editTag.code || !editTag.label) {
            showToast('Code and Label are required.', 'error');
            return;
        }
        await CertificationService.saveMasterTag(editTag as MasterDoneTag);
        showToast('Master Tag saved.', 'success');
        setIsEditingTag(false);
        loadData();
    };

    // --- RENDERERS ---

    const renderRuleEditor = () => (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl shadow-2xl overflow-hidden animate-scale-in">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-slate-900 flex items-center">
                        <Award className="mr-2 text-blue-600"/> {editRule.id?.startsWith('CERT') ? 'New Certification' : 'Edit Rule'}
                    </h3>
                    <button onClick={() => setIsEditingRule(false)}><X size={20} className="text-slate-400"/></button>
                </div>
                
                <div className="p-6 space-y-5 overflow-y-auto">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Certificate Name</label>
                        <input 
                            type="text" className="w-full p-2 border border-slate-300 rounded" 
                            value={editRule.name} onChange={e => setEditRule({...editRule, name: e.target.value})} 
                            placeholder="e.g. Master Practitioner"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                        <textarea 
                            className="w-full p-2 border border-slate-300 rounded h-20 resize-none" 
                            value={editRule.description} onChange={e => setEditRule({...editRule, description: e.target.value})} 
                        />
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h4 className="text-sm font-bold text-slate-800 mb-3">Logic Configuration</h4>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-[10px] text-slate-500 uppercase mb-1">Condition Type</label>
                                <select 
                                    className="w-full p-2 border border-slate-300 rounded bg-white text-sm"
                                    value={editRule.logic}
                                    onChange={e => setEditRule({...editRule, logic: e.target.value as any})}
                                >
                                    <option value="REQUIRE_ALL">Require ALL Tags (AND)</option>
                                    <option value="REQUIRE_ANY">Require ANY Tag (OR)</option>
                                    <option value="MIN_COUNT">Minimum Count of Tags</option>
                                </select>
                            </div>
                            {editRule.logic === 'MIN_COUNT' && (
                                <div>
                                    <label className="block text-[10px] text-slate-500 uppercase mb-1">Min Count</label>
                                    <input 
                                        type="number" className="w-full p-2 border border-slate-300 rounded text-sm"
                                        value={editRule.minCountValue}
                                        onChange={e => setEditRule({...editRule, minCountValue: Number(e.target.value)})}
                                    />
                                </div>
                            )}
                        </div>

                        <label className="block text-[10px] text-slate-500 uppercase mb-1">Required "Done Tags"</label>
                        
                        {/* Tag Selector from Master List */}
                        <div className="mb-2">
                            <select 
                                className="w-full p-2 border border-slate-300 rounded text-sm bg-white"
                                onChange={(e) => { if(e.target.value) addMasterTagToRule(e.target.value); e.target.value = ''; }}
                            >
                                <option value="">-- Add from Tag Library --</option>
                                {tags.map(t => (
                                    <option key={t.id} value={t.code} disabled={editRule.requiredTags?.includes(t.code)}>
                                        {t.label} ({t.code})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Manual Fallback */}
                        <div className="flex gap-2 mb-2">
                            <input 
                                type="text" className="flex-1 p-2 border border-slate-300 rounded text-sm"
                                placeholder="Or type manual tag code..."
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addTagToRule()}
                            />
                            <button onClick={addTagToRule} className="px-3 bg-blue-100 text-blue-700 rounded text-sm font-bold">Add Manual</button>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-2">
                            {editRule.requiredTags?.map(tag => (
                                <span key={tag} className="text-xs bg-white border border-slate-300 px-2 py-1 rounded flex items-center shadow-sm">
                                    {tag}
                                    <button onClick={() => removeTagFromRule(tag)} className="ml-2 text-red-500"><X size={12}/></button>
                                </span>
                            ))}
                            {editRule.requiredTags?.length === 0 && <span className="text-xs text-slate-400 italic">No tags added.</span>}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 shrink-0 flex justify-end bg-slate-50">
                    <button onClick={handleSaveRule} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold flex items-center hover:bg-blue-700">
                        <Save size={16} className="mr-2"/> Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );

    const renderTagEditor = () => (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-scale-in">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
                    <h3 className="font-bold text-indigo-900 flex items-center">
                        <Tag className="mr-2"/> {editTag.id ? 'Edit Tag' : 'New Master Tag'}
                    </h3>
                    <button onClick={() => setIsEditingTag(false)}><X size={20} className="text-slate-400"/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tag Code (System ID)</label>
                        <input 
                            type="text" className="w-full p-2 border border-slate-300 rounded font-mono text-sm uppercase" 
                            value={editTag.code} onChange={e => setEditTag({...editTag, code: e.target.value.toUpperCase().replace(/\s/g, '_')})}
                            placeholder="DONE_MODULE_NAME"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Unique identifier used in Event Config. Use underscores.</p>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Label (Readable)</label>
                        <input 
                            type="text" className="w-full p-2 border border-slate-300 rounded text-sm" 
                            value={editTag.label} onChange={e => setEditTag({...editTag, label: e.target.value})}
                            placeholder="Module 1 Completion"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                        <select 
                            className="w-full p-2 border border-slate-300 rounded text-sm bg-white"
                            value={editTag.category}
                            onChange={e => setEditTag({...editTag, category: e.target.value as any})}
                        >
                            <option value="CORE">Core Module</option>
                            <option value="ELECTIVE">Elective</option>
                            <option value="SPECIAL">Special Event</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                        <input 
                            type="text" className="w-full p-2 border border-slate-300 rounded text-sm" 
                            value={editTag.description} onChange={e => setEditTag({...editTag, description: e.target.value})}
                            placeholder="Internal notes..."
                        />
                    </div>
                    <div className="flex justify-end pt-4">
                        <button onClick={handleSaveTag} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold flex items-center hover:bg-indigo-700">
                            <Save size={16} className="mr-2"/> Save Tag
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                        <Award className="mr-3 text-amber-500" /> Certification Rules
                    </h1>
                    <p className="text-slate-500 mt-1">Define logic for automated achievement issuance.</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button 
                        onClick={() => { setActiveTab('RULES'); setIsEditingTag(false); setIsEditingRule(false); }} 
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'RULES' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}
                    >
                        Rules Engine
                    </button>
                    <button 
                        onClick={() => { setActiveTab('TAGS'); setIsEditingTag(false); setIsEditingRule(false); }} 
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'TAGS' ? 'bg-white shadow text-indigo-700' : 'text-slate-500'}`}
                    >
                        Tag Library
                    </button>
                </div>
            </div>

            {/* TAB CONTENT */}
            
            {activeTab === 'RULES' && (
                <>
                {isEditingRule && renderRuleEditor()}
                {!isEditingRule && (
                    <div className="space-y-4">
                        <div className="flex justify-end">
                            <button onClick={handleCreateRule} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center hover:bg-blue-700 shadow-sm">
                                <Plus size={16} className="mr-2"/> New Rule
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {rules.map(rule => (
                                <div key={rule.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative">
                                    <button onClick={() => handleEditRule(rule)} className="absolute top-4 right-4 text-slate-400 hover:text-blue-600 p-1"><ListChecks size={18}/></button>
                                    
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                                            <Award size={24}/>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900">{rule.name}</h3>
                                            <p className="text-xs text-slate-500 line-clamp-2 mt-1">{rule.description}</p>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 font-medium">Logic</span>
                                            <span className="font-mono font-bold text-blue-700">{rule.logic.replace('_', ' ')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 font-medium">Required Tags</span>
                                            <span className="font-bold">{rule.requiredTags.length}</span>
                                        </div>
                                        {rule.logic === 'MIN_COUNT' && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-500 font-medium">Min Count</span>
                                                <span className="font-bold">{rule.minCountValue}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                </>
            )}

            {activeTab === 'TAGS' && (
                <>
                {isEditingTag && renderTagEditor()}
                {!isEditingTag && (
                    <div className="space-y-4">
                        <div className="flex justify-end">
                             <button onClick={handleCreateTag} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center hover:bg-indigo-700 shadow-sm">
                                <Plus size={16} className="mr-2"/> New Master Tag
                            </button>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                    <tr>
                                        <th className="p-4">Tag Label</th>
                                        <th className="p-4">System Code</th>
                                        <th className="p-4">Category</th>
                                        <th className="p-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {tags.map(tag => (
                                        <tr key={tag.id} className="hover:bg-slate-50">
                                            <td className="p-4 font-bold text-slate-900">{tag.label}</td>
                                            <td className="p-4 font-mono text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded w-fit">{tag.code}</td>
                                            <td className="p-4">
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase ${tag.category === 'CORE' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                    {tag.category}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button onClick={() => handleEditTag(tag)} className="text-slate-400 hover:text-indigo-600"><Edit3 size={16}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {tags.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400">No master tags defined.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                </>
            )}
        </div>
    );
};

export default CertificationConfig;
