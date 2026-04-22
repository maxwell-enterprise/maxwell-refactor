
import React, { useState, useEffect, useRef } from 'react';
import { Event, EventType, LocationMode, OperationalSession, EventSelectionConfig } from '../../../types/index';
import { MasterDoneTag } from '../../../types/certification';
import { 
    X, Save, Calendar, Clock, MapPin, Tag, Users, Layers, 
    ShieldCheck, Box, Link, Image as ImageIcon, Settings, Info, 
    Globe, Monitor, Map, ListFilter, CheckSquare, Eye, EyeOff, AlertCircle
} from 'lucide-react';
import TierManager from './TierManager';
import SessionLogisticsManager from './SessionLogisticsManager';
import { useToast } from '../../../context/ToastContext';
import { uploadEventBannerImage } from '../../../lib/eventBannerUpload';
import { ClipLoader } from 'react-spinners';

interface EventFormProps {
    isOpen: boolean;
    isEditing: boolean;
    initialData: Partial<Event>;
    masterDoneTags: MasterDoneTag[];
    availableCreditTags: { code: string, label: string }[];
    
    bundleableEvents: Event[];
    availableContainers: Event[];
    
    orphanEvents: Event[];
    linkedChildren: Event[];
    onManageChild: (childId: string, action: 'LINK' | 'UNLINK') => void;

    onClose: () => void;
    onSave: (data: Partial<Event>) => void;
    isSaving?: boolean;
}

/** Keeps controlled inputs stable (never undefined → defined on first keystroke). */
function normalizeEventFormData(data: Partial<Event>): Partial<Event> {
    const sel = data.selectionConfig;
    return {
        ...data,
        name: data.name ?? '',
        date: data.date ?? '',
        time: data.time ?? '',
        location: data.location ?? '',
        description: data.description ?? '',
        type: data.type ?? 'SOLO',
        status: data.status ?? 'Upcoming',
        admissionPolicy: data.admissionPolicy ?? 'PRE_BOOKED',
        locationMode: data.locationMode ?? 'OFFLINE',
        creditTags: data.creditTags ?? [],
        capacity: data.capacity ?? 0,
        isVisibleInCatalog:
            data.isVisibleInCatalog !== undefined ? data.isVisibleInCatalog : true,
        banner_url: data.banner_url ?? '',
        endDate: data.endDate ?? '',
        selectionConfig: {
            mode: sel?.mode ?? 'BUNDLE',
            minSelect: sel?.minSelect ?? 1,
            maxSelect: sel?.maxSelect ?? 1,
        },
    };
}

const EventForm: React.FC<EventFormProps> = ({ 
    isOpen, isEditing, initialData, masterDoneTags, availableCreditTags,
    bundleableEvents, availableContainers, orphanEvents, linkedChildren, onManageChild,
    onClose, onSave, isSaving = false
}) => {
    const { showToast } = useToast();
    const bannerFileInputRef = useRef<HTMLInputElement>(null);
    const [bannerUploading, setBannerUploading] = useState(false);
    const [formData, setFormData] = useState<Partial<Event>>(() =>
        normalizeEventFormData(initialData),
    );
    const [activeTab, setActiveTab] = useState<'GENERAL' | 'LOCATION' | 'ACCESS' | 'TIERS' | 'LOGISTICS' | 'HIERARCHY'>('GENERAL');
    
    const [expandedTierIndex, setExpandedTierIndex] = useState<number | null>(null);
    
    useEffect(() => {
        setFormData(normalizeEventFormData(initialData));
    }, [initialData]);

    const updateField = (field: keyof Event, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setBannerUploading(true);
        try {
            const url = await uploadEventBannerImage(file);
            updateField('banner_url', url);
            showToast('Banner uploaded; URL filled from storage.', 'success');
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Banner upload failed', 'error');
        } finally {
            setBannerUploading(false);
        }
    };

    const updateSelectionConfig = (field: keyof EventSelectionConfig, value: any) => {
        setFormData(prev => ({
            ...prev,
            selectionConfig: {
                mode: 'BUNDLE',
                minSelect: 1,
                maxSelect: 1,
                ...(prev.selectionConfig || {}),
                [field]: value
            }
        }));
    };

    // Auto-sync tags based on tiers
    useEffect(() => {
        if (formData.tiers && formData.tiers.length > 0) {
            const grantedTags = new Set<string>();
            formData.tiers.forEach(t => t.grantTagIds?.forEach(tag => grantedTags.add(tag)));

            const currentTags = new Set(formData.creditTags || []);
            let hasChange = false;

            grantedTags.forEach(tag => {
                if (!currentTags.has(tag)) {
                    currentTags.add(tag);
                    hasChange = true;
                }
            });

            if (hasChange) {
                setFormData(prev => ({ ...prev, creditTags: Array.from(currentTags) }));
            }
        }
    }, [formData.tiers]);

    const handleSave = () => {
        if (isSaving) return;
        // STRICT VALIDATION
        if (formData.type === 'SESSION') {
            if (!formData.parentEventId) {
                showToast("Action Blocked: You must select a Parent Series for this Sub Event.", "error");
                // Force switch to Hierarchy tab to show user where to fix
                setActiveTab('HIERARCHY');
                return;
            }
        }

        if (!formData.name) {
             showToast("Event Name is required.", "error");
             return;
        }

        onSave(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="font-bold text-slate-900 text-lg">{isEditing ? 'Edit Event' : 'Create New Event'}</h3>
                        <p className="text-xs text-slate-500">{formData.name || 'Untitled'}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-200 transition-all"><X size={24}/></button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                     <div className="w-64 bg-slate-50 border-r border-slate-200 p-2 flex flex-col gap-1 overflow-y-auto">
                        <button onClick={() => setActiveTab('GENERAL')} className={`px-4 py-3 text-sm font-bold rounded-lg text-left flex items-center ${activeTab === 'GENERAL' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
                            <Calendar size={16} className="mr-3"/> General Info
                        </button>
                        <button onClick={() => setActiveTab('LOCATION')} className={`px-4 py-3 text-sm font-bold rounded-lg text-left flex items-center ${activeTab === 'LOCATION' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
                            <Globe size={16} className="mr-3"/> Location & Links
                        </button>
                        <button onClick={() => setActiveTab('ACCESS')} className={`px-4 py-3 text-sm font-bold rounded-lg text-left flex items-center ${activeTab === 'ACCESS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
                            <ShieldCheck size={16} className="mr-3"/> Access & Policy
                        </button>
                        <button onClick={() => setActiveTab('TIERS')} className={`px-4 py-3 text-sm font-bold rounded-lg text-left flex items-center ${activeTab === 'TIERS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
                            <Tag size={16} className="mr-3"/> Ticket Tiers
                        </button>
                        {formData.type !== 'CONTAINER' && (
                            <button onClick={() => setActiveTab('LOGISTICS')} className={`px-4 py-3 text-sm font-bold rounded-lg text-left flex items-center ${activeTab === 'LOGISTICS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
                                <Clock size={16} className="mr-3"/> Session Logistics
                            </button>
                        )}
                        <button 
                            onClick={() => setActiveTab('HIERARCHY')} 
                            className={`px-4 py-3 text-sm font-bold rounded-lg text-left flex items-center 
                                ${activeTab === 'HIERARCHY' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}
                                ${formData.type === 'SESSION' && !formData.parentEventId ? 'text-red-500 bg-red-50 animate-pulse' : ''}
                            `}
                        >
                            <Layers size={16} className="mr-3"/> Hierarchy & Picker
                            {formData.type === 'SESSION' && !formData.parentEventId && <AlertCircle size={14} className="ml-auto text-red-500"/>}
                        </button>
                     </div>

                    <div className="flex-1 overflow-y-auto p-8 bg-white">
                        {activeTab === 'GENERAL' && (
                             <div className="space-y-4 max-w-2xl">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Event Name</label>
                                    <input type="text" className="w-full p-3 border border-slate-300 rounded-lg font-bold" value={formData.name} onChange={e => updateField('name', e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                                        <select className="w-full p-3 border border-slate-300 rounded-lg bg-white" value={formData.type} onChange={e => updateField('type', e.target.value as EventType)}>
                                            <option value="SOLO">Solo Event</option>
                                            <option value="CONTAINER">Series Container</option>
                                            <option value="SESSION">Sub Event</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                                        <select className="w-full p-3 border border-slate-300 rounded-lg bg-white" value={formData.status} onChange={e => updateField('status', e.target.value)}>
                                            <option value="Upcoming">Upcoming</option>
                                            <option value="Completed">Completed</option>
                                            <option value="Cancelled">Cancelled</option>
                                        </select>
                                    </div>
                                </div>
                                
                                {/* Visibility Toggle */}
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${formData.isVisibleInCatalog ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}`}>
                                            {formData.isVisibleInCatalog ? <Eye size={20}/> : <EyeOff size={20}/>}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-900">Show in Public Catalogue</div>
                                            <div className="text-xs text-slate-500">Visible to members in Store/Events page</div>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer"
                                            checked={formData.isVisibleInCatalog}
                                            onChange={e => updateField('isVisibleInCatalog', e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Banner image</label>
                                    <p className="text-xs text-slate-500 mb-2">Paste a URL or upload a file (stored like product images).</p>
                                    <input
                                        ref={bannerFileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        className="hidden"
                                        onChange={handleBannerFileChange}
                                    />
                                    <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 sm:items-start">
                                        <div className="flex-1 min-w-0">
                                            <input 
                                                type="text" 
                                                className="w-full p-3 border border-slate-300 rounded-lg text-sm" 
                                                value={formData.banner_url || ''} 
                                                onChange={e => updateField('banner_url', e.target.value)}
                                                placeholder="https://..."
                                            />
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            <button
                                                type="button"
                                                disabled={bannerUploading}
                                                onClick={() => bannerFileInputRef.current?.click()}
                                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                            >
                                                <ImageIcon size={16} />
                                                {bannerUploading ? 'Uploading…' : 'Upload file'}
                                            </button>
                                            {formData.banner_url && (
                                                <div className="w-20 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                                                    <img src={formData.banner_url} alt="Preview" className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                                    <textarea className="w-full p-3 border border-slate-300 rounded-lg h-24 resize-none" value={formData.description} onChange={e => updateField('description', e.target.value)} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
                                        <input type="date" className="w-full p-3 border border-slate-300 rounded-lg" value={formData.date} onChange={e => updateField('date', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Date</label>
                                        <input type="date" className="w-full p-3 border border-slate-300 rounded-lg" value={formData.endDate || ''} onChange={e => updateField('endDate', e.target.value)} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Time</label>
                                        <input type="text" className="w-full p-3 border border-slate-300 rounded-lg" value={formData.time} onChange={e => updateField('time', e.target.value)} placeholder="09:00" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Capacity</label>
                                        <input
                                            type="number"
                                            className="w-full p-3 border border-slate-300 rounded-lg"
                                            value={formData.capacity ?? 0}
                                            onChange={(e) =>
                                                updateField(
                                                    'capacity',
                                                    Number(e.target.value || 0),
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                             </div>
                        )}

                        {activeTab === 'LOCATION' && (
                            <div className="space-y-6 max-w-2xl animate-fade-in">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-1">Location Settings</h3>
                                    <p className="text-sm text-slate-500">Configure how and where attendees join.</p>
                                </div>

                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-4">Location Mode</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { id: 'OFFLINE', label: 'Offline', icon: MapPin, desc: 'At venue' },
                                            { id: 'ONLINE', label: 'Online', icon: Monitor, desc: 'Zoom/Meet' },
                                            { id: 'HYBRID', label: 'Hybrid', icon: Globe, desc: 'Both' }
                                        ].map((mode) => (
                                            <button
                                                key={mode.id}
                                                onClick={() => updateField('locationMode', mode.id as LocationMode)}
                                                className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${formData.locationMode === mode.id ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'}`}
                                            >
                                                <mode.icon size={24} className="mb-2" />
                                                <span className="font-bold text-sm">{mode.label}</span>
                                                <span className={`text-[10px] ${formData.locationMode === mode.id ? 'text-blue-100' : 'text-slate-400'}`}>{mode.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {(formData.locationMode === 'OFFLINE' || formData.locationMode === 'HYBRID') && (
                                    <div className="space-y-4 animate-fade-in">
                                        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center">
                                                <Map className="mr-2 text-red-500" size={16}/> Venue & Map Details
                                            </label>
                                            <div className="space-y-3">
                                                <input 
                                                    type="text" 
                                                    className="w-full p-3 border border-slate-300 rounded-lg text-sm" 
                                                    placeholder="Venue Name (e.g. Grand Ballroom, Hotel Mulia)" 
                                                    value={formData.location} 
                                                    onChange={e => updateField('location', e.target.value)} 
                                                />
                                                <input 
                                                    type="url" 
                                                    className="w-full p-3 border border-slate-300 rounded-lg text-sm font-mono" 
                                                    placeholder="Google Maps URL (Hidden from store)" 
                                                    value={formData.locationMapLink || ''} 
                                                    onChange={e => updateField('locationMapLink', e.target.value)} 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {(formData.locationMode === 'ONLINE' || formData.locationMode === 'HYBRID') && (
                                    <div className="space-y-4 animate-fade-in">
                                        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center">
                                                <Link className="mr-2 text-blue-500" size={16}/> Virtual Meeting Link
                                            </label>
                                            <input 
                                                type="url" 
                                                className="w-full p-3 border border-slate-300 rounded-lg text-sm font-mono" 
                                                placeholder="Zoom / Google Meet URL (Hidden from store)" 
                                                value={formData.onlineMeetingLink || ''} 
                                                onChange={e => updateField('onlineMeetingLink', e.target.value)} 
                                            />
                                            <p className="text-[10px] text-slate-400 mt-2 italic">* This link is protected. It will only appear in the user's wallet after they have a valid ticket.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {activeTab === 'ACCESS' && (
                             <div className="space-y-6 max-w-2xl">
                                {formData.type !== 'SESSION' && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Admission Policy</label>
                                        <select 
                                            className="w-full p-3 border border-slate-300 rounded-lg bg-white"
                                            value={formData.admissionPolicy}
                                            onChange={e => updateField('admissionPolicy', e.target.value as any)}
                                        >
                                            <option value="PRE_BOOKED">Pre-Booked (Ticket Required)</option>
                                            <option value="ON_SITE_DEDUCTION">Pay at Gate (Credit Deduction)</option>
                                            <option value="OPEN_MEMBER">Open to All Members</option>
                                            <option value="OPEN_PUBLIC">Open Public</option>
                                            <option value="INVITED_ONLY">Invited Only (Private)</option>
                                        </select>
                                    </div>
                                )}
                                
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-bold text-slate-800 text-sm">Required Access Tags (Keys)</h4>
                                        <div className="flex items-center text-[10px] text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                            <Info size={12} className="mr-1"/> Auto-synced with Tiers
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {formData.creditTags?.map(tag => (
                                            <span key={tag} className="text-xs bg-white border border-slate-300 px-2 py-1 rounded flex items-center">
                                                {tag}
                                                <button onClick={() => updateField('creditTags', formData.creditTags?.filter(t => t !== tag))} className="ml-2 text-red-500"><X size={12}/></button>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                    <label className="block text-xs font-bold text-green-800 uppercase mb-2">Completion Award (Done Tag)</label>
                                    <select className="w-full p-2.5 border border-green-200 rounded-lg text-sm bg-white" value={formData.doneTag || ''} onChange={e => updateField('doneTag', e.target.value)}>
                                        <option value="">-- None --</option>
                                        {masterDoneTags.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
                                    </select>
                                </div>
                             </div>
                        )}

                        {activeTab === 'TIERS' && (
                             <div>
                                 <TierManager 
                                    tiers={formData.tiers || []}
                                    eventType={formData.type || 'SOLO'}
                                    availableCreditTags={availableCreditTags}
                                    availableBundles={bundleableEvents}
                                    onChange={(newTiers) => updateField('tiers', newTiers)}
                                    expandedIndex={expandedTierIndex}
                                    setExpandedIndex={setExpandedTierIndex}
                                 />
                             </div>
                        )}

                        {activeTab === 'LOGISTICS' && (
                             <div>
                                 <SessionLogisticsManager 
                                    sessions={formData.sessions || []}
                                    onChange={(newSessions) => updateField('sessions', newSessions)}
                                    baseDate={formData.date || new Date().toISOString().split('T')[0]}
                                 />
                             </div>
                        )}

                        {activeTab === 'HIERARCHY' && (
                             <div className="space-y-8 animate-fade-in">
                                 {/* Only show Parent Series logic if this is NOT a Container */}
                                 {formData.type !== 'CONTAINER' && (
                                     <div>
                                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                             Parent Series {formData.type === 'SESSION' && <span className="text-red-500">*</span>}
                                         </label>
                                         <select 
                                             className={`w-full p-3 border rounded-lg bg-white ${
                                                 formData.type === 'SESSION' && !formData.parentEventId 
                                                 ? 'border-red-300 ring-1 ring-red-200' 
                                                 : 'border-slate-300'
                                             }`} 
                                             value={formData.parentEventId || ''} 
                                             onChange={e => updateField('parentEventId', e.target.value)}
                                         >
                                            <option value="">-- Independent Event --</option>
                                            {availableContainers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        {formData.type === 'SESSION' && !formData.parentEventId && (
                                            <p className="text-[10px] text-red-600 font-bold mt-1 flex items-center animate-pulse">
                                                <AlertCircle size={10} className="mr-1"/> Critical: Sub Events MUST be linked to a Parent Container to function correctly.
                                            </p>
                                        )}
                                     </div>
                                 )}

                                 {/* OPTION CONTAINER CONFIGURATION - RESTORED FEATURE */}
                                 {formData.type === 'CONTAINER' && (
                                     <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 space-y-6">
                                         <div className="flex items-start gap-3">
                                             <div className="p-2 bg-blue-600 text-white rounded-lg"><ListFilter size={20}/></div>
                                             <div>
                                                 <h4 className="font-bold text-blue-900">Container Selection Logic</h4>
                                                 <p className="text-xs text-blue-700">Control how invitees choose sessions from this series.</p>
                                             </div>
                                         </div>

                                         <div className="grid grid-cols-2 gap-4">
                                            <button 
                                                type="button"
                                                onClick={() => updateSelectionConfig('mode', 'BUNDLE')}
                                                className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${(!formData.selectionConfig || formData.selectionConfig.mode === 'BUNDLE') ? 'bg-white border-blue-600 ring-2 ring-blue-100' : 'bg-slate-50 border-slate-200 grayscale opacity-60'}`}
                                            >
                                                <CheckSquare size={24} className="mb-2 text-blue-600"/>
                                                <span className="font-bold text-sm text-slate-900">Full Bundle</span>
                                                <span className="text-[10px] text-slate-500 text-center mt-1">One RSVP grants access to ALL sessions.</span>
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => updateSelectionConfig('mode', 'OPTION')}
                                                className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${formData.selectionConfig?.mode === 'OPTION' ? 'bg-white border-blue-600 ring-2 ring-blue-100' : 'bg-slate-50 border-slate-200 grayscale opacity-60'}`}
                                            >
                                                <ListFilter size={24} className="mb-2 text-blue-600"/>
                                                <span className="font-bold text-sm text-slate-900">Custom Selection</span>
                                                <span className="text-[10px] text-slate-500 text-center mt-1">User picks specific sessions to attend.</span>
                                            </button>
                                         </div>

                                         {formData.selectionConfig?.mode === 'OPTION' && (
                                             <div className="grid grid-cols-2 gap-4 animate-fade-in p-4 bg-white rounded-xl border border-blue-200 shadow-sm">
                                                 <div>
                                                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Min Sessions to Pick</label>
                                                     <input 
                                                        type="number" min="1"
                                                        className="w-full p-2 border border-slate-300 rounded font-bold text-center"
                                                        value={formData.selectionConfig.minSelect}
                                                        onChange={e => updateSelectionConfig('minSelect', Number(e.target.value))}
                                                     />
                                                 </div>
                                                 <div>
                                                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Max Sessions to Pick</label>
                                                     <input 
                                                        type="number" min="1"
                                                        className="w-full p-2 border border-slate-300 rounded font-bold text-center"
                                                        value={formData.selectionConfig.maxSelect}
                                                        onChange={e => updateSelectionConfig('maxSelect', Number(e.target.value))}
                                                     />
                                                 </div>
                                             </div>
                                         )}
                                     </div>
                                 )}
                             </div>
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors text-sm">Cancel</button>
                    <button 
                        disabled={isSaving}
                        onClick={handleSave} 
                        className={`px-8 py-2.5 text-white rounded-xl shadow-lg flex items-center transition-all text-sm font-bold
                            ${(formData.type === 'SESSION' && !formData.parentEventId) 
                                ? 'bg-slate-400 cursor-not-allowed opacity-70' 
                                : 'bg-slate-900 hover:bg-slate-800'
                            }
                            ${isSaving ? 'cursor-not-allowed opacity-75' : ''}
                        `}
                    >
                        {isSaving ? (
                            <>
                                <ClipLoader size={16} color="#ffffff" className="mr-2" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={18} className="mr-2"/> Save Event
                            </>
                        )}
                    </button>
                </div>
             </div>
        </div>
    );
};

export default EventForm;
