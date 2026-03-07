
import React, { useState, useEffect, useMemo } from 'react';
import { WhatsAppService } from '../../services/whatsappService';
import { WhatsAppTask, WATaskCategory, WATaskStatus } from '../../types/index';
import { useToast } from '../../context/ToastContext';
import { 
    MessageCircle, Search, Filter, Trash2, CheckCircle, Clock, 
    ExternalLink, Send, Copy, Archive, RefreshCw, UserPlus, CreditCard, Calendar,
    Check
} from 'lucide-react';

const WhatsAppQueue: React.FC = () => {
    const { showToast } = useToast();
    const [tasks, setTasks] = useState<WhatsAppTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<WATaskCategory | 'ALL'>('ALL');
    
    // Default show Pending & Clicked (hide Archived by default)
    const [filterStatus, setFilterStatus] = useState<WATaskStatus | 'ALL' | 'ACTIVE'>('ACTIVE');

    useEffect(() => {
        loadTasks();
    }, []);

    const loadTasks = async () => {
        setLoading(true);
        const data = await WhatsAppService.getQueue();
        setTasks(data);
        setLoading(false);
    };

    const handleSendClick = async (task: WhatsAppTask) => {
        // 1. Generate Link
        const url = WhatsAppService.generateLink(task.recipientPhone, task.message);
        
        // 2. Open in new tab
        window.open(url, '_blank');
        
        // 3. Update status locally and remotely
        if (task.status !== 'CLICKED') {
            await WhatsAppService.markAsClicked(task.id);
            setTasks(prev => prev.map(t => 
                t.id === task.id ? { ...t, status: 'CLICKED' } : t
            ));
        }
        
        showToast(`Opened WhatsApp for ${task.recipientName}`, 'success');
    };

    const handleArchive = async (id: string) => {
        await WhatsAppService.archiveTask(id);
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'ARCHIVED' } : t));
        showToast('Task archived', 'info');
    };

    const handleDelete = async (id: string) => {
        if(window.confirm('Are you sure you want to permanently delete this task?')) {
            await WhatsAppService.deleteTask(id);
            setTasks(prev => prev.filter(t => t.id !== id));
            showToast('Task removed', 'info');
        }
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
        <div className="h-full flex flex-col bg-white">
            {/* Header / Filters */}
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between bg-slate-50">
                <div className="flex gap-2 items-center">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search name or phone..." 
                            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:border-green-500 outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button onClick={loadTasks} className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-600">
                        <RefreshCw size={16}/>
                    </button>
                </div>

                <div className="flex gap-2">
                    <select 
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none"
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value as any)}
                    >
                        <option value="ALL">All Categories</option>
                        <option value="REGISTRATION">Registration</option>
                        <option value="PAYMENT_REMINDER">Payment</option>
                        <option value="EVENT_INFO">Event</option>
                    </select>
                    
                    <select 
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none"
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
                    <div className="text-center py-10 text-slate-400">Loading queue...</div>
                ) : filteredTasks.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">No WhatsApp tasks found.</div>
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
                                        onClick={() => handleArchive(task.id)}
                                        className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                        title="Archive (Done)"
                                    >
                                        <Archive size={18}/>
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => handleDelete(task.id)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Permanently Delete"
                                    >
                                        <Trash2 size={18}/>
                                    </button>
                                )}

                                <button 
                                    onClick={() => handleSendClick(task)}
                                    className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center shadow-md transition-all transform active:scale-95 ${
                                        task.status === 'PENDING' 
                                        ? 'bg-[#25D366] text-white hover:bg-[#20bd5a]' 
                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    {task.status === 'PENDING' ? <Send size={16} className="mr-2" /> : <RefreshCw size={14} className="mr-2"/>}
                                    {task.status === 'PENDING' ? 'Send WA' : 'Resend'}
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
