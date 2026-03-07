
import React, { useState } from 'react';
import { ImportConflict, ImportStrategy } from '../../services/importStrategy';
import { AlertTriangle, X, Merge, RotateCcw, SkipForward, ArrowRight } from 'lucide-react';

interface ImportConflictModalProps {
    conflicts: ImportConflict[];
    onResolve: (strategy: ImportStrategy) => void;
    onCancel: () => void;
}

const ImportConflictModal: React.FC<ImportConflictModalProps> = ({ conflicts, onResolve, onCancel }) => {
    // Preview first 3 conflicts
    const preview = conflicts.slice(0, 3);

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
                <div className="p-6 bg-amber-50 border-b border-amber-100 flex items-start gap-4">
                    <div className="p-3 bg-amber-100 text-amber-600 rounded-full shrink-0">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Duplicate Records Found</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            We found <b>{conflicts.length} rows</b> in your file that match existing members (by Email or Phone).
                        </p>
                    </div>
                </div>

                <div className="p-6 max-h-[40vh] overflow-y-auto bg-slate-50">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Conflict Preview</h4>
                    <div className="space-y-3">
                        {preview.map((c, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 text-sm shadow-sm">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-slate-800">{c.existing.name}</span>
                                    <span className="text-xs font-mono text-slate-400">ID: {c.existing.id}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div className="text-red-500 bg-red-50 p-2 rounded">
                                        <p className="font-bold mb-1">Existing Data</p>
                                        <p>{c.existing.email}</p>
                                        <p>{c.existing.company || '-'}</p>
                                    </div>
                                    <div className="flex items-center justify-center text-slate-400">
                                        <ArrowRight size={16} />
                                    </div>
                                    <div className="text-green-600 bg-green-50 p-2 rounded -ml-16">
                                        <p className="font-bold mb-1">Incoming Data</p>
                                        <p>{c.incoming.email}</p>
                                        <p>{c.incoming.company || '-'}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {conflicts.length > 3 && (
                            <p className="text-center text-xs text-slate-400 italic">...and {conflicts.length - 3} more.</p>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-white border-t border-slate-100">
                    <p className="text-sm font-bold text-slate-900 mb-4">How should we handle these duplicates?</p>
                    <div className="grid grid-cols-1 gap-3">
                        <button 
                            onClick={() => onResolve('SMART_MERGE')}
                            className="flex items-center p-3 border border-blue-200 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors text-left group"
                        >
                            <div className="p-2 bg-white rounded-lg text-blue-600 mr-3 shadow-sm group-hover:scale-110 transition-transform">
                                <Merge size={20} />
                            </div>
                            <div>
                                <span className="block font-bold text-blue-900 text-sm">Smart Merge (Recommended)</span>
                                <span className="block text-xs text-blue-700">Fill in missing fields only. Keep existing data safe.</span>
                            </div>
                        </button>

                        <button 
                            onClick={() => onResolve('OVERWRITE')}
                            className="flex items-center p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-left group"
                        >
                            <div className="p-2 bg-slate-100 rounded-lg text-slate-600 mr-3 group-hover:scale-110 transition-transform">
                                <RotateCcw size={20} />
                            </div>
                            <div>
                                <span className="block font-bold text-slate-900 text-sm">Overwrite All</span>
                                <span className="block text-xs text-slate-500">Replace existing records with data from Excel.</span>
                            </div>
                        </button>

                        <button 
                            onClick={() => onResolve('SKIP')}
                            className="flex items-center p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-left group"
                        >
                            <div className="p-2 bg-slate-100 rounded-lg text-slate-600 mr-3 group-hover:scale-110 transition-transform">
                                <SkipForward size={20} />
                            </div>
                            <div>
                                <span className="block font-bold text-slate-900 text-sm">Skip Duplicates</span>
                                <span className="block text-xs text-slate-500">Ignore these rows. Only import new members.</span>
                            </div>
                        </button>
                    </div>
                    
                    <button onClick={onCancel} className="mt-4 w-full text-center text-xs text-slate-400 hover:text-slate-600">
                        Cancel Import
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImportConflictModal;
