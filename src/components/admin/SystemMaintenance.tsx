
import React, { useState, useRef } from 'react';
import { BackupService } from '../../services/backupService';
import { DownloadCloud, UploadCloud, Trash2, AlertTriangle, CheckCircle, RefreshCw, HardDrive, DatabaseBackup, Info } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { SeedService } from '../../services/seedService';

const SystemMaintenance: React.FC = () => {
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    const handleBackup = async () => {
        setLoading(true);
        try {
            await BackupService.createBackup();
            showToast('Backup downloaded successfully.', 'success');
        } catch (e) {
            showToast('Backup failed.', 'error');
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleRestoreClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!confirm("WARNING: Restoring will OVERWRITE all current data. Continue?")) {
            if(fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setLoading(true);
        try {
            // Restore implies data will exist, so allow seeding/normal behavior
            localStorage.removeItem('MAXWELL_SKIP_SEED');
            
            await BackupService.restoreBackup(file);
            showToast('System restored successfully. Reloading...', 'success');
            setTimeout(() => window.location.reload(), 1500);
        } catch (e) {
            showToast('Restore failed. Invalid file format?', 'error');
            console.error(e);
            setLoading(false);
        }
    };

    const handleFactoryReset = async (loadSeeds: boolean) => {
        setLoading(true);
        try {
            // First backup
            await BackupService.createBackup();
            
            // Then clear
            await BackupService.clearDatabase();
            
            if (loadSeeds) {
                // User wants data, ensure seed service runs
                localStorage.removeItem('MAXWELL_SKIP_SEED');
                await SeedService.init();
                showToast('System reset to Factory Default (Test Data Loaded).', 'success');
            } else {
                // User wants EMPTY, set flag to prevent auto-seed on reload
                localStorage.setItem('MAXWELL_SKIP_SEED', 'true');
                showToast('System completely emptied. Auto-seeding disabled.', 'success');
            }
            
            setTimeout(() => window.location.reload(), 1500);
        } catch (e) {
            showToast('Reset failed.', 'error');
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto h-[calc(100vh-64px)] flex flex-col animate-fade-in">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                    <DatabaseBackup className="mr-3 text-indigo-600" /> System Maintenance
                </h1>
                <p className="text-slate-500 mt-1">Manage database snapshots, disaster recovery, and system resets.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 1. BACKUP */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-full mb-4">
                        <DownloadCloud size={32} />
                    </div>
                    <h3 className="font-bold text-slate-900 text-lg">Create Backup</h3>
                    <p className="text-xs text-slate-500 mt-2 mb-6 leading-relaxed">
                        Generate a full JSON snapshot of the current database state. 
                        Includes all members, transactions, settings, and logs.
                    </p>
                    <button 
                        onClick={handleBackup}
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg flex items-center justify-center disabled:opacity-50"
                    >
                        {loading ? <RefreshCw className="animate-spin mr-2"/> : <DownloadCloud className="mr-2" size={18}/>}
                        {loading ? 'Processing...' : 'Download Snapshot'}
                    </button>
                </div>

                {/* 2. RESTORE */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
                    <div className="p-4 bg-green-50 text-green-600 rounded-full mb-4">
                        <UploadCloud size={32} />
                    </div>
                    <h3 className="font-bold text-slate-900 text-lg">Restore Data</h3>
                    <p className="text-xs text-slate-500 mt-2 mb-6 leading-relaxed">
                        Upload a previously generated backup file to restore the system state.
                        <span className="text-red-500 font-bold block mt-1">Warning: Overwrites current data.</span>
                    </p>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".json" 
                        onChange={handleFileChange}
                    />
                    <button 
                        onClick={handleRestoreClick}
                        disabled={loading}
                        className="w-full py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:border-green-500 hover:text-green-600 transition-colors flex items-center justify-center disabled:opacity-50"
                    >
                        <UploadCloud className="mr-2" size={18}/> Select File
                    </button>
                </div>

                {/* 3. RESET */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-red-100 text-red-600 px-3 py-1 text-[10px] font-bold rounded-bl-xl">DANGER ZONE</div>
                    
                    {!showResetConfirm ? (
                        <>
                            <div className="p-4 bg-red-50 text-red-600 rounded-full mb-4">
                                <Trash2 size={32} />
                            </div>
                            <h3 className="font-bold text-slate-900 text-lg">Factory Reset</h3>
                            <p className="text-xs text-slate-500 mt-2 mb-6 leading-relaxed">
                                Wipe all data from the local database. 
                                A backup will be automatically downloaded before deletion.
                            </p>
                            <button 
                                onClick={() => setShowResetConfirm(true)}
                                disabled={loading}
                                className="w-full py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl font-bold hover:bg-red-600 hover:text-white transition-colors flex items-center justify-center disabled:opacity-50"
                            >
                                <Trash2 className="mr-2" size={18}/> Reset System
                            </button>
                        </>
                    ) : (
                        <div className="w-full h-full flex flex-col justify-center animate-fade-in">
                            <AlertTriangle size={48} className="mx-auto text-amber-500 mb-3" />
                            <h4 className="font-bold text-slate-900 mb-2">Confirm Reset?</h4>
                            <p className="text-xs text-slate-500 mb-4">After clearing, what should we load?</p>
                            
                            <div className="space-y-2 w-full">
                                <button 
                                    onClick={() => handleFactoryReset(true)}
                                    className="w-full py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700"
                                >
                                    Load Test Data (Seed)
                                </button>
                                <button 
                                    onClick={() => handleFactoryReset(false)}
                                    className="w-full py-2 bg-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-300"
                                >
                                    Keep Empty
                                </button>
                                <button 
                                    onClick={() => setShowResetConfirm(false)}
                                    className="w-full py-2 text-slate-400 text-xs hover:text-slate-600"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {/* Storage Info */}
            <div className="mt-8 bg-slate-100 p-4 rounded-xl flex items-center justify-between border border-slate-200">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg text-slate-600"><HardDrive size={20}/></div>
                    <div>
                        <h4 className="font-bold text-sm text-slate-700">Local Storage Status</h4>
                        <p className="text-xs text-slate-500">IndexedDB: MAXWELL_DEV_SANDBOX_V1</p>
                    </div>
                </div>
                <div className="flex items-center text-xs text-slate-400">
                    <Info size={14} className="mr-1"/> 
                    Data persists in this browser until cleared.
                </div>
            </div>
        </div>
    );
};

export default SystemMaintenance;
