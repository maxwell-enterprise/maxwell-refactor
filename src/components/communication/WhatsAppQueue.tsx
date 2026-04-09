
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { WhatsAppService } from '../../services/whatsappService';
import { WhatsAppTask, WATaskCategory, WATaskStatus } from '../../types/index';
import { useToast } from '../../context/ToastContext';
import { 
    MessageCircle, Search, Filter, Trash2, CheckCircle, Clock, 
    ExternalLink, Send, Copy, Archive, RefreshCw, UserPlus, CreditCard, Calendar,
    Check, Loader2
} from 'lucide-react';

const WhatsAppQueue: React.FC = () => {
    const { showToast } = useToast();
    const [tasks, setTasks] = useState<WhatsAppTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<WATaskCategory | 'ALL'>('ALL');
    
    // Default show Pending & Clicked (hide Archived by default)
    const [filterStatus, setFilterStatus] = useState<WATaskStatus | 'ALL' | 'ACTIVE'>('ACTIVE');
    /** Ref = kunci sinkron (anti double-tap sebelum re-render); bump = paksa update UI disabled */
    const busyRef = useRef<Set<string>>(new Set());
    const [, bumpBusy] = useState(0);
    const loadInFlight = useRef(false);

    const isTaskBusy = (key: string) => busyRef.current.has(key);

    const withTaskLock = async (key: string, fn: () => Promise<void>) => {
        if (busyRef.current.has(key)) return;
        busyRef.current.add(key);
        bumpBusy((n) => n + 1);
        try {
            await fn();
        } finally {
            busyRef.current.delete(key);
            bumpBusy((n) => n + 1);
        }
    };

    useEffect(() => {
        loadTasks();
    }, []);

    const loadTasks = async () => {
        if (loadInFlight.current) return;
        loadInFlight.current = true;
        setLoading(true);
        try {
            const data = await WhatsAppService.getQueue();
            setTasks(data);
        } catch (e) {
            showToast(
                e instanceof Error ? e.message : 'Gagal memuat antrian',
                'error',
            );
        } finally {
            setLoading(false);
            loadInFlight.current = false;
        }
    };

    const handleSendClick = async (task: WhatsAppTask) => {
        const key = `send:${task.id}`;
        await withTaskLock(key, async () => {
            try {
                const url = WhatsAppService.generateLink(
                    task.recipientPhone,
                    task.message,
                );
                window.open(url, '_blank');

                if (task.status !== 'CLICKED') {
                    await WhatsAppService.markAsClicked(task.id);
                    setTasks((prev) =>
                        prev.map((t) =>
                            t.id === task.id ? { ...t, status: 'CLICKED' } : t,
                        ),
                    );
                }

                showToast(`Opened WhatsApp for ${task.recipientName}`, 'success');
            } catch (e) {
                showToast(
                    e instanceof Error
                        ? e.message
                        : 'Gagal memperbarui status tugas',
                    'error',
                );
            }
        });
    };

    const handleArchive = async (id: string) => {
        const key = `arch:${id}`;
        await withTaskLock(key, async () => {
            try {
                await WhatsAppService.archiveTask(id);
                setTasks((prev) =>
                    prev.map((t) =>
                        t.id === id ? { ...t, status: 'ARCHIVED' } : t,
                    ),
                );
                showToast('Task archived', 'info');
            } catch (e) {
                showToast(
                    e instanceof Error ? e.message : 'Gagal mengarsipkan',
                    'error',
                );
            }
        });
    };

    const handleDelete = async (id: string) => {
        if (
            !window.confirm(
                'Are you sure you want to permanently delete this task?',
            )
        )
            return;
        const key = `del:${id}`;
        await withTaskLock(key, async () => {
            try {
                await WhatsAppService.deleteTask(id);
                setTasks((prev) => prev.filter((t) => t.id !== id));
                showToast('Task removed', 'info');
            } catch (e) {
                showToast(
                    e instanceof Error ? e.message : 'Gagal menghapus tugas',
                    'error',
                );
            }
        });
    };

    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            const matchesSearch = t.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  t.recipientPhone.includes(searchTerm);
            const matchesCat = filterCategory === 'ALL' || t.category === filterCategory;
            
            let matchesStatus = true;
            if (filterStatus === 'ACTIVE') {
                matchesStatus = t.status !== 'ARCHIVED';
            } else if (filterStatus !== 'ALL') {
                matchesStatus = t.status === filterStatus;
            }
            
            return matchesSearch && matchesCat && matchesStatus;
        });
    }, [tasks, searchTerm, filterCategory, filterStatus]);

    const getCategoryIcon = (cat: WATaskCategory) => {
        switch(cat) {
            case 'REGISTRATION': return <UserPlus size={16} className="text-blue-600"/>;
            case 'PAYMENT_REMINDER': return <CreditCard size={16} className="text-amber-600"/>;
            case 'EVENT_INFO': return <Calendar size={16} className="text-purple-600"/>;
            default: return <MessageCircle size={16} className="text-slate-600"/>;
        }
    };

    return (
        <div className="h-full min-h-0 min-w-0 flex flex-col bg-white">
            {/* Header / Filters */}
            <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-col gap-3 sm:gap-4 bg-slate-50 min-w-0">
                <div className="flex gap-2 items-center min-w-0 w-full">
                    <div className="relative flex-1 min-w-0 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search name or phone..." 
                            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:border-green-500 outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => loadTasks()}
                        disabled={loading}
                        className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-600 disabled:opacity-40 disabled:pointer-events-none"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                <div className="flex flex-wrap gap-2 min-w-0">
                    <select 
                        className="min-w-0 flex-1 sm:flex-none px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none"
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value as any)}
                    >
                        <option value="ALL">All Categories</option>
                        <option value="REGISTRATION">Registration</option>
                        <option value="PAYMENT_REMINDER">Payment</option>
                        <option value="EVENT_INFO">Event</option>
                    </select>
                    
                    <select 
                        className="min-w-0 flex-1 sm:flex-none px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                    >
                        <option value="ACTIVE">Active (Pending & Sent)</option>
                        <option value="PENDING">Pending Only</option>
                        <option value="CLICKED">Sent Only</option>
                        <option value="ARCHIVED">Archived</option>
                        <option value="ALL">All History</option>
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
                        <RefreshCw className="animate-spin text-green-500" size={24} />
                        <span className="text-sm font-medium">Memuat antrian WhatsApp…</span>
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="max-w-lg mx-auto flex flex-col items-center text-center py-16 px-4">
                        <MessageCircle className="text-slate-200 mb-3" size={44} />
                        <p className="text-sm font-semibold text-slate-800">Antrian kosong</p>
                        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                            Belum ada tugas WhatsApp di database (0 data). Tugas dari otomatisasi atau input manual akan tampil di sini.
                        </p>
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="max-w-lg mx-auto flex flex-col items-center text-center py-16 px-4">
                        <Filter className="text-slate-200 mb-3" size={40} />
                        <p className="text-sm font-semibold text-slate-800">Tidak ada tugas yang cocok</p>
                        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                            Ada {tasks.length} tugas di database, tapi tidak ada yang sesuai pencarian atau filter saat ini. Kosongkan kotak cari atau pilih &quot;All History&quot; / kategori lain.
                        </p>
                    </div>
                ) : (
                    filteredTasks.map(task => (
                        <div key={task.id} className={`bg-white p-4 rounded-xl border shadow-sm transition-all hover:shadow-md flex flex-col md:flex-row gap-4 items-start md:items-center ${task.status === 'CLICKED' ? 'border-green-200 bg-green-50/30' : task.status === 'ARCHIVED' ? 'opacity-60 grayscale bg-slate-50' : 'border-slate-200'}`}>
                            
                            {/* Left: Icon & Info */}
                            <div className="flex items-start gap-4 flex-1">
                                <div className={`p-3 rounded-full ${task.status === 'CLICKED' ? 'bg-green-100' : task.status === 'ARCHIVED' ? 'bg-slate-200' : 'bg-blue-50'}`}>
                                    {getCategoryIcon(task.category)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-slate-900">{task.recipientName}</h4>
                                        <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{task.recipientPhone}</span>
                                        
                                        {/* Status Badges */}
                                        {task.status === 'CLICKED' && (
                                            <span className="text-[10px] bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-bold flex items-center">
                                                <CheckCircle size={10} className="mr-1"/> Sent
                                            </span>
                                        )}
                                        {task.status === 'PENDING' && (
                                            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold flex items-center">
                                                <Clock size={10} className="mr-1"/> Pending
                                            </span>
                                        )}
                                        {task.status === 'ARCHIVED' && (
                                            <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full font-bold flex items-center">
                                                <Archive size={10} className="mr-1"/> Archived
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 line-clamp-2 italic bg-slate-50 p-2 rounded border border-slate-100 max-w-xl">
                                        "{task.message}"
                                    </p>
                                    <div className="mt-2 text-[10px] text-slate-400">
                                        Created: {new Date(task.createdAt).toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Actions */}
                            <div className="flex gap-2 w-full md:w-auto justify-end items-center">
                                <button 
                                    onClick={() => { navigator.clipboard.writeText(task.message); showToast('Message copied', 'info'); }}
                                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                    title="Copy Text"
                                >
                                    <Copy size={18}/>
                                </button>
                                
                                {task.status !== 'ARCHIVED' ? (
                                <button 
                                    type="button"
                                    onClick={() => handleArchive(task.id)}
                                    disabled={isTaskBusy(`arch:${task.id}`) || isTaskBusy(`send:${task.id}`)}
                                    className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none"
                                    title="Archive (Done)"
                                >
                                    <Archive size={18}/>
                                </button>
                                ) : (
                                    <button 
                                        type="button"
                                        onClick={() => handleDelete(task.id)}
                                        disabled={isTaskBusy(`del:${task.id}`)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none"
                                        title="Permanently Delete"
                                    >
                                        <Trash2 size={18}/>
                                    </button>
                                )}

                                <button 
                                    type="button"
                                    onClick={() => handleSendClick(task)}
                                    disabled={isTaskBusy(`send:${task.id}`)}
                                    className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center shadow-md transition-all transform active:scale-95 disabled:opacity-60 disabled:pointer-events-none ${
                                        task.status === 'PENDING' 
                                        ? 'bg-[#25D366] text-white hover:bg-[#20bd5a]' 
                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    {isTaskBusy(`send:${task.id}`) ? (
                                        <Loader2 size={16} className="mr-2 animate-spin shrink-0" />
                                    ) : task.status === 'PENDING' ? (
                                        <Send size={16} className="mr-2 shrink-0" />
                                    ) : (
                                        <RefreshCw size={14} className="mr-2 shrink-0" />
                                    )}
                                    {isTaskBusy(`send:${task.id}`)
                                        ? 'Memproses…'
                                        : task.status === 'PENDING'
                                          ? 'Send WA'
                                          : 'Resend'}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default WhatsAppQueue;
