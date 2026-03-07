
import React, { useState, useEffect } from 'react';
import { AutomationQueueService } from '../../services/automationQueueService';
import { AutomationQueueItem } from '../../types/automation';
import { Play, CheckCircle2, AlertCircle, Clock, RotateCw, List } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const AutomationQueue: React.FC = () => {
    const { showToast } = useToast();
    const [queue, setQueue] = useState<AutomationQueueItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    useEffect(() => {
        loadQueue();
    }, []);

    const loadQueue = async () => {
        setLoading(true);
        const data = await AutomationQueueService.getPendingItems();
        setQueue(data);
        setLoading(false);
    };

    const handleProcessBatch = async () => {
        if (queue.length === 0) return;
        
        if (!window.confirm(`Start processing ${queue.length} items? This action cannot be undone.`)) return;

        setProcessing(true);
        setProgress({ current: 0, total: queue.length });

        await AutomationQueueService.processBatch(queue, (curr, total) => {
            setProgress({ current: curr, total: total });
        });

        showToast('Batch processing completed.', 'success');
        setProcessing(false);
        loadQueue();
    };

    const handleProcessSingle = async (item: AutomationQueueItem) => {
        setProcessing(true);
        const success = await AutomationQueueService.processItem(item);
        setProcessing(false);
        if (success) {
            showToast('Task executed successfully', 'success');
            loadQueue();
        } else {
            showToast('Task failed to execute', 'error');
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto h-[calc(100vh-64px)] flex flex-col animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                        <RotateCw className="mr-3 text-blue-600" /> System Automation Queue
                    </h1>
                    <p className="text-slate-500 mt-1">Pending system triggers waiting for execution.</p>
                </div>
                
                <div className="flex gap-3">
                    <button onClick={loadQueue} className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-500" disabled={processing}>
                        <RotateCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    
                    <button 
                        onClick={handleProcessBatch}
                        disabled={queue.length === 0 || processing}
                        className={`px-6 py-2 rounded-lg font-bold text-white flex items-center shadow-lg transition-all ${
                            queue.length === 0 ? 'bg-slate-300 cursor-not-allowed' : 
                            processing ? 'bg-blue-800 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {processing ? (
                            <span>Processing {progress.current}/{progress.total}</span>
                        ) : (
                            <>
                                <Play size={18} className="mr-2 fill-white" /> Execute Batch ({queue.length})
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Progress Bar */}
            {processing && (
                <div className="mb-6 bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                    <div className="flex justify-between text-xs font-bold text-blue-800 mb-2">
                        <span>Automation in progress...</span>
                        <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                    </div>
                    <div className="w-full h-3 bg-blue-100 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-blue-600 transition-all duration-300 ease-out"
                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                        ></div>
                    </div>
                    <p className="text-[10px] text-blue-500 mt-2 text-center">Please do not close this window.</p>
                </div>
            )}

            {/* Queue List */}
            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 flex items-center">
                        <List size={16} className="mr-2"/> Pending Tasks
                    </h3>
                    <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">{queue.length}</span>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                    {queue.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <CheckCircle2 size={48} className="mb-4 text-green-200" />
                            <p className="font-bold text-slate-600">All Systems Operational</p>
                            <p className="text-sm">No pending triggers in the queue.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white text-slate-500 font-bold border-b border-slate-100 sticky top-0">
                                <tr>
                                    <th className="p-4">Trigger Type</th>
                                    <th className="p-4">Description</th>
                                    <th className="p-4">Queued At</th>
                                    <th className="p-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {queue.map((item) => (
                                    <tr key={item.id} className="hover:bg-blue-50/50 transition-colors group">
                                        <td className="p-4">
                                            <div className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded w-fit border border-blue-100">
                                                {item.triggerType}
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-1 font-mono">{item.id}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-slate-800 font-medium">{item.description}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">
                                                Context: {JSON.stringify(item.contextData).substring(0, 50)}...
                                            </div>
                                            {item.status === 'FAILED' && (
                                                <div className="text-xs text-red-600 font-bold mt-1 flex items-center">
                                                    <AlertCircle size={10} className="mr-1"/> Error: {item.errorLog}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-slate-500 text-xs">
                                            <div className="flex items-center">
                                                <Clock size={12} className="mr-1.5"/>
                                                {new Date(item.createdAt).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => handleProcessSingle(item)}
                                                disabled={processing}
                                                className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-800 hover:text-white hover:border-slate-800 text-xs font-bold transition-colors disabled:opacity-50"
                                            >
                                                Run Now
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AutomationQueue;
