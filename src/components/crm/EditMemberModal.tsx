
import React, { useState, useMemo, useEffect } from 'react';
import { Member } from '../../types/index';
import { 
    User, MapPin, Briefcase, Crown, Shield, Save, X, Calendar, 
    AlertTriangle, Plus, CheckCircle, Tag, Mail, Phone, Globe, Linkedin, Building,
    Settings, Trash2, Edit2, ChevronLeft, Lock
} from 'lucide-react';
import { MEMBER_DATA } from '../../constants';
import { useAccess } from '../../context/SecurityContext';

// --- ROBUST EDITABLE SELECT COMPONENT ---
const EditableSelect = ({ 
    label, 
    value, 
    options, 
    onChange,
    onListUpdate 
}: { 
    label: string, 
    value: string, 
    options: string[], 
    onChange: (val: string) => void,
    onListUpdate: (newOptions: string[]) => void
}) => {
    // RBAC: Only those with System Database WRITE access can modify dropdown lists
    const { can } = useAccess('sys_database');
    const canManage = can('WRITE');

    const [isManaging, setIsManaging] = useState(false);
    const [editingItem, setEditingItem] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [newItemValue, setNewItemValue] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    // -- CRUD HANDLERS --

    const handleAddItem = () => {
        if (newItemValue && !options.includes(newItemValue)) {
            onListUpdate([...options, newItemValue]);
            onChange(newItemValue); // Auto select new item
            setNewItemValue('');
            setIsAdding(false);
        }
    };

    const handleDeleteItem = (itemToDelete: string) => {
        if (window.confirm(`Are you sure you want to remove "${itemToDelete}" from the list?`)) {
            const newOpts = options.filter(o => o !== itemToDelete);
            onListUpdate(newOpts);
            // If the deleted item was selected, clear the selection
            if (value === itemToDelete) {
                onChange('');
            }
        }
    };

    const startEdit = (item: string) => {
        setEditingItem(item);
        setEditValue(item);
    };

    const saveEdit = () => {
        if (editValue && editValue !== editingItem) {
            // Check duplicate
            if (options.includes(editValue)) {
                alert('This option already exists.');
                return;
            }
            const newOpts = options.map(o => o === editingItem ? editValue : o);
            onListUpdate(newOpts);
            
            // If we edited the currently selected value, update the selection too
            if (value === editingItem) {
                onChange(editValue);
            }
        }
        setEditingItem(null);
        setEditValue('');
    };

    // -- RENDERERS --

    if (isManaging) {
        return (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 animate-fade-in">
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200">
                    <button 
                        onClick={() => setIsManaging(false)} 
                        className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center"
                    >
                        <ChevronLeft size={12} className="mr-1"/> Back to Select
                    </button>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Managing List</span>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                    {options.map(opt => (
                        <div key={opt} className="flex items-center justify-between group bg-white p-2 rounded border border-slate-100 shadow-sm">
                            {editingItem === opt ? (
                                <div className="flex gap-1 w-full">
                                    <input 
                                        type="text" 
                                        className="flex-1 text-xs border border-blue-300 rounded px-2 py-1 outline-none"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                                        autoFocus
                                    />
                                    <button onClick={saveEdit} className="text-green-600 hover:bg-green-50 p-1 rounded"><CheckCircle size={14}/></button>
                                    <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:bg-slate-50 p-1 rounded"><X size={14}/></button>
                                </div>
                            ) : (
                                <>
                                    <span className="text-xs font-medium text-slate-700 truncate">{opt}</span>
                                    <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => startEdit(opt)} className="text-blue-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50"><Edit2 size={12}/></button>
                                        <button onClick={() => handleDeleteItem(opt)} className="text-slate-300 hover:text-red-500 p-1 rounded hover:bg-red-50"><Trash2 size={12}/></button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>

                {/* ADD NEW ROW */}
                <div className="mt-3 pt-2 border-t border-slate-200">
                    {isAdding ? (
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                className="flex-1 text-xs border border-blue-300 rounded px-2 py-1.5 outline-none"
                                placeholder="New option name..."
                                value={newItemValue}
                                onChange={(e) => setNewItemValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                                autoFocus
                            />
                            <button onClick={handleAddItem} className="bg-blue-600 text-white px-2 rounded hover:bg-blue-700 text-xs font-bold">Add</button>
                            <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600 px-1"><X size={14}/></button>
                        </div>
                    ) : (
                        <button onClick={() => setIsAdding(true)} className="w-full py-1.5 border-2 border-dashed border-slate-200 text-slate-400 rounded-lg text-xs font-bold hover:border-blue-300 hover:text-blue-500 transition-colors flex items-center justify-center">
                            <Plus size={12} className="mr-1"/> Add New Item
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // NORMAL SELECT VIEW
    return (
        <div>
            <div className="flex justify-between items-end mb-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase">
                    {label}
                </label>
                {canManage && (
                    <button 
                        onClick={() => setIsManaging(true)} 
                        className="text-[10px] font-medium text-blue-600 hover:text-blue-800 flex items-center bg-blue-50 px-2 py-0.5 rounded transition-colors"
                        title="Manage Dropdown List"
                    >
                        <Settings size={10} className="mr-1"/> Manage List
                    </button>
                )}
            </div>
            
            <div className="relative">
                <select 
                    className="w-full p-3 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:border-blue-500 appearance-none"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                >
                    <option value="">-- Select {label} --</option>
                    {options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
                {/* Custom chevron to look better */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
            </div>
        </div>
    );
};

interface EditMemberModalProps {
    member: Member;
    onClose: () => void;
    onSave: (updated: Member) => void;
}

const EditMemberModal: React.FC<EditMemberModalProps> = ({ member, onClose, onSave }) => {
    // Initial State with Defaults for missing fields
    const [formData, setFormData] = useState<Member>({ 
        ...member,
        tags: member.tags || [],
        serviceLevel: member.serviceLevel || 'STANDARD',
        address: member.address || { street: '', city: '', state: '', zipCode: '', country: '' },
        company: member.company || '',
        jobTitle: member.jobTitle || '',
        industry: member.industry || '',
        birthDate: member.birthDate || '',
        linkedinUrl: member.linkedinUrl || '',
        category: member.category || 'Member',
        nTagStatus: member.nTagStatus || 'Not yet'
    });

    // --- MANAGEABLE LISTS STATE ---
    // In a real app, these would come from a Context or API. Here we initialize from data + defaults.
    const [categoryList, setCategoryList] = useState<string[]>(() => {
        return Array.from(new Set([...MEMBER_DATA.map(m => m.category), 'President', 'Partner', 'Member', 'VIP', 'Faculty Member'])).sort();
    });

    const [programList, setProgramList] = useState<string[]>(() => {
        return Array.from(new Set([...MEMBER_DATA.map(m => m.program), 'Full Access', 'Regis 105', 'Scholarship'])).sort();
    });

    // Helper to parse "Mar 2024" to "2024-03" for input type="month"
    const getMonthValue = (dateStr: string) => {
        if (!dateStr) return '';
        if (dateStr.match(/^[A-Za-z]{3} \d{4}$/)) {
            const date = new Date(Date.parse(`1 ${dateStr}`)); 
            if (isNaN(date.getTime())) return ''; 
            return date.toISOString().slice(0, 7); 
        }
        if (dateStr.match(/^\d{4}-\d{2}$/)) return dateStr;
        return '';
    };

    // Helper to format "2024-03" back to "Mar 2024"
    const formatMonthValue = (isoMonth: string) => {
        if (!isoMonth) return '';
        const [year, month] = isoMonth.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    const [originalJoinMonth] = useState(member.joinMonth);
    const [dateChangeReason, setDateChangeReason] = useState('');
    const hasJoinDateChanged = formData.joinMonth !== originalJoinMonth;

    const [activeTab, setActiveTab] = useState<'PROFILE' | 'CONTACT' | 'PROFESSIONAL' | 'MEMBERSHIP' | 'SYSTEM'>('PROFILE');
    const [newTag, setNewTag] = useState('');

    const handleChange = (field: keyof Member, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAddressChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, address: { ...prev.address, [field]: value } }));
    };

    const handleAddTag = () => {
        if(newTag && !formData.tags?.includes(newTag)) {
            setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), newTag.toUpperCase()] }));
            setNewTag('');
        }
    };

    const handleRemoveTag = (tag: string) => {
        setFormData(prev => ({ ...prev, tags: prev.tags?.filter(t => t !== tag) }));
    };

    const handleInternalSave = () => {
        if (hasJoinDateChanged && !dateChangeReason.trim()) {
            alert("Administrative Action Required: Please provide a justification for changing the historical Join Date.");
            return;
        }
        onSave(formData);
    };

    const navItems = [
        { id: 'PROFILE', label: 'Profile & Identity', icon: User },
        { id: 'CONTACT', label: 'Contact & Logistics', icon: MapPin },
        { id: 'PROFESSIONAL', label: 'Professional Info', icon: Briefcase },
        { id: 'MEMBERSHIP', label: 'Contract & Standing', icon: Crown },
        { id: 'SYSTEM', label: 'System & Access', icon: Shield },
    ];

    return (
        <div className="fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fade-in-up border border-slate-200">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                            {formData.name.substring(0,2).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">{formData.name}</h2>
                            <p className="text-xs text-slate-500 flex items-center gap-2">
                                ID: <span className="font-mono">{formData.id}</span>
                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                {formData.lifecycleStage || 'MEMBER'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Main Body */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar Nav */}
                    <div className="w-64 bg-slate-50 border-r border-slate-200 flex-shrink-0 flex flex-col p-4">
                        <div className="space-y-1">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id as any)}
                                        className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                                            isActive 
                                            ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200' 
                                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                        }`}
                                    >
                                        <Icon size={18} className={`mr-3 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto bg-white p-8">
                        
                        {/* 1. PROFILE TAB */}
                        {activeTab === 'PROFILE' && (
                            <div className="space-y-6 max-w-2xl animate-fade-in">
                                <div><h3 className="text-lg font-bold text-slate-900 mb-1">Personal Identity</h3><p className="text-sm text-slate-500">Basic biographical information.</p></div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Full Name</label>
                                        <input type="text" className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.name} onChange={e => handleChange('name', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Date of Birth</label>
                                        <input type="date" className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.birthDate} onChange={e => handleChange('birthDate', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Gender</label>
                                        <select className="w-full p-3 border border-slate-300 rounded-lg text-sm bg-white" value={formData.gender || ''} onChange={e => handleChange('gender', e.target.value)}>
                                            <option value="">-- Select --</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 2. CONTACT TAB */}
                        {activeTab === 'CONTACT' && (
                            <div className="space-y-6 max-w-2xl animate-fade-in">
                                <div><h3 className="text-lg font-bold text-slate-900 mb-1">Contact & Logistics</h3><p className="text-sm text-slate-500">Communication channels and shipping details.</p></div>
                                
                                <div className="grid grid-cols-2 gap-6 mb-6">
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 flex items-center"><Mail size={12} className="mr-1"/> Email Address</label>
                                        <input type="email" className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.email} onChange={e => handleChange('email', e.target.value)} />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 flex items-center"><Phone size={12} className="mr-1"/> Phone / WhatsApp</label>
                                        <input type="tel" className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.phone} onChange={e => handleChange('phone', e.target.value)} />
                                    </div>
                                </div>

                                <div className="border-t border-slate-200 pt-6">
                                    <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center"><MapPin size={16} className="mr-2 text-slate-400"/> Shipping Address</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-xs text-slate-500 mb-1">Street Address</label>
                                            <input type="text" className="w-full p-3 border border-slate-300 rounded-lg text-sm" value={formData.address?.street || ''} onChange={e => handleAddressChange('street', e.target.value)} placeholder="Jl. Sudirman No..." />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">City</label>
                                            <input type="text" className="w-full p-3 border border-slate-300 rounded-lg text-sm" value={formData.address?.city || ''} onChange={e => handleAddressChange('city', e.target.value)} placeholder="Jakarta Selatan" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">State / Province</label>
                                            <input type="text" className="w-full p-3 border border-slate-300 rounded-lg text-sm" value={formData.address?.state || ''} onChange={e => handleAddressChange('state', e.target.value)} placeholder="DKI Jakarta" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Zip Code</label>
                                            <input type="text" className="w-full p-3 border border-slate-300 rounded-lg text-sm" value={formData.address?.zipCode || ''} onChange={e => handleAddressChange('zipCode', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Country</label>
                                            <input type="text" className="w-full p-3 border border-slate-300 rounded-lg text-sm" value={formData.address?.country || 'Indonesia'} onChange={e => handleAddressChange('country', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3. PROFESSIONAL TAB */}
                        {activeTab === 'PROFESSIONAL' && (
                            <div className="space-y-6 max-w-2xl animate-fade-in">
                                <div><h3 className="text-lg font-bold text-slate-900 mb-1">Professional Background</h3><p className="text-sm text-slate-500">Career and industry details.</p></div>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 flex items-center"><Building size={12} className="mr-1"/> Company / Organization</label>
                                        <input type="text" className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.company} onChange={e => handleChange('company', e.target.value)} placeholder="PT Maxwell Leadership" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Job Title</label>
                                            <input type="text" className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.jobTitle} onChange={e => handleChange('jobTitle', e.target.value)} placeholder="Director" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Industry</label>
                                            <input type="text" className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.industry} onChange={e => handleChange('industry', e.target.value)} placeholder="Consulting" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 flex items-center"><Linkedin size={12} className="mr-1"/> LinkedIn URL</label>
                                        <input type="url" className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.linkedinUrl} onChange={e => handleChange('linkedinUrl', e.target.value)} placeholder="https://linkedin.com/in/..." />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 4. MEMBERSHIP TAB */}
                        {activeTab === 'MEMBERSHIP' && (
                            <div className="space-y-6 max-w-2xl animate-fade-in">
                                <div><h3 className="text-lg font-bold text-slate-900 mb-1">Contract & Standing</h3><p className="text-sm text-slate-500">Membership details, tenure, and program info.</p></div>
                                
                                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-5">
                                    <div className="grid grid-cols-2 gap-5">
                                        <div className="col-span-1">
                                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 flex items-center justify-between">
                                                <span className="flex items-center"><Calendar size={12} className="mr-1"/> Join Date</span>
                                                {hasJoinDateChanged && <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-bold flex items-center"><AlertTriangle size={8} className="mr-1"/> Modified</span>}
                                            </label>
                                            <input type="month" className={`w-full p-3 border rounded-lg text-sm bg-white ${hasJoinDateChanged ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-300'}`} value={getMonthValue(formData.joinMonth)} onChange={e => handleChange('joinMonth', formatMonthValue(e.target.value))} />
                                            {hasJoinDateChanged && <div className="mt-3 animate-fade-in"><label className="block text-xs font-bold text-amber-700 uppercase mb-1">Justification <span className="text-red-500">*</span></label><textarea className="w-full p-2 border border-amber-300 rounded-lg text-xs bg-amber-50 h-20 resize-none outline-none" value={dateChangeReason} onChange={(e) => setDateChangeReason(e.target.value)} placeholder="Why was the join date changed?" /></div>}
                                        </div>
                                        
                                        {/* MANAGED DROPDOWN 1: CATEGORY */}
                                        <div>
                                            <EditableSelect 
                                                label="Member Category" 
                                                value={formData.category} 
                                                options={categoryList} 
                                                onChange={(val) => handleChange('category', val)}
                                                onListUpdate={setCategoryList}
                                            />
                                        </div>
                                        
                                        {/* MANAGED DROPDOWN 2: PROGRAM */}
                                        <div className="col-span-2">
                                            <EditableSelect 
                                                label="Current Program" 
                                                value={formData.program} 
                                                options={programList} 
                                                onChange={(val) => handleChange('program', val)}
                                                onListUpdate={setProgramList}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 border-t border-slate-200 pt-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Mentorship (Mos)</label>
                                            <input type="number" className="w-full p-2 border border-slate-300 rounded-lg text-sm text-center" value={formData.mentorshipDuration} onChange={e => handleChange('mentorshipDuration', Number(e.target.value))} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">N-Tag Status</label>
                                            <select className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white" value={formData.nTagStatus} onChange={e => handleChange('nTagStatus', e.target.value)}>
                                                <option value="Not yet">Not yet</option>
                                                <option value="Ordered">Ordered</option>
                                                <option value="Received">Received</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center justify-center pt-4">
                                            <label className="flex items-center cursor-pointer">
                                                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" checked={formData.scholarship} onChange={e => handleChange('scholarship', e.target.checked)} />
                                                <span className="ml-2 text-sm font-bold text-slate-700">Scholarship</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 5. SYSTEM TAB */}
                        {activeTab === 'SYSTEM' && (
                            <div className="space-y-6 max-w-2xl animate-fade-in">
                                <div><h3 className="text-lg font-bold text-slate-900 mb-1">System & Access Control</h3><p className="text-sm text-slate-500">Lifecycle stage and access tags.</p></div>
                                
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Lifecycle Stage</label>
                                        <select className="w-full p-3 border border-slate-300 rounded-lg text-sm bg-white" value={formData.lifecycleStage || 'MEMBER'} onChange={e => handleChange('lifecycleStage', e.target.value)}>
                                            <option value="GUEST">Guest</option>
                                            <option value="IDENTIFIED">Identified</option>
                                            <option value="PARTICIPANT">Participant</option>
                                            <option value="MEMBER">Member</option>
                                            <option value="CERTIFIED">Certified</option>
                                            <option value="FACILITATOR">Facilitator</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Service Level</label>
                                        <select className="w-full p-3 border border-slate-300 rounded-lg text-sm bg-white" value={formData.serviceLevel || 'STANDARD'} onChange={e => handleChange('serviceLevel', e.target.value)}>
                                            <option value="STANDARD">Standard</option>
                                            <option value="VIP">VIP</option>
                                            <option value="PRESTIGE">Prestige</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="border-t border-slate-200 pt-4">
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-2 flex items-center">
                                        <Tag size={12} className="mr-1" /> Business Tags
                                    </label>
                                    <div className="flex flex-wrap gap-2 mb-3 min-h-[30px]">
                                        {formData.tags?.length === 0 && <span className="text-xs text-slate-400 italic">No tags assigned.</span>}
                                        {formData.tags?.map(tag => (
                                            <span key={tag} className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-md text-xs font-bold text-slate-700 flex items-center group">
                                                {tag}
                                                <button onClick={() => handleRemoveTag(tag)} className="ml-1.5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={12}/></button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            className="flex-1 p-2 text-xs border border-slate-300 rounded outline-none uppercase" 
                                            placeholder="ADD TAG (E.G. FOUNDER)"
                                            value={newTag}
                                            onChange={e => setNewTag(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                                        />
                                        <button onClick={handleAddTag} className="px-3 py-2 bg-slate-800 text-white rounded text-xs font-bold hover:bg-slate-700">Add</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-between items-center">
                    <div className="text-xs text-slate-400">Last edited: {new Date().toLocaleDateString()}</div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">Cancel</button>
                        <button onClick={handleInternalSave} disabled={hasJoinDateChanged && !dateChangeReason.trim()} className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-md disabled:opacity-50 transition-all flex items-center"><Save size={16} className="mr-2" /> Save Changes</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditMemberModal;
