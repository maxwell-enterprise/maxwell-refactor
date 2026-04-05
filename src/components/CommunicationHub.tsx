
import React, { useState, useEffect } from 'react';
import { CommunicationService } from '../services/communicationService';
import { EmailCampaign, EmailLog } from '../types/index';
import { useToast } from '../context/ToastContext';
import { 
    Mail, Plus, Settings, FileText, CheckCircle, AlertCircle, MessageCircle, FileCode, Zap
} from 'lucide-react';
import EmailWizard from './communication/EmailWizard';
import SMTPSettings from './communication/SMTPSettings';
import PDFDesigner from './communication/PDFDesigner';
import WhatsAppQueue from './communication/WhatsAppQueue'; 
import WhatsAppTemplateManager from './communication/WhatsAppTemplateManager'; 

const CommunicationHub: React.FC = () => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'CAMPAIGNS' | 'WA_QUEUE' | 'WA_TEMPLATES' | 'LOGS' | 'PDF_TEMPLATES' | 'SETTINGS'>('CAMPAIGNS');
    const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
    const [logs, setLogs] = useState<EmailLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [isWizardOpen, setIsWizardOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        if (activeTab === 'CAMPAIGNS') {
            const data = await CommunicationService.getCampaigns();
            setCampaigns(data);
        } else if (activeTab === 'LOGS') {
            const data = await CommunicationService.getLogs();
            setLogs(data);
        }
        setLoading(false);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-64px)] flex flex-col animate-fade-in relative">
            
            {/* Page Header */}
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                        <Mail className="mr-3 text-blue-600" /> Communication Hub
                    </h1>
                    <p className="text-slate-500 mt-1">Marketing automation, newsletters, and system notifications.</p>
                </div>
                
                <div className="flex gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto">
                        <button onClick={() => setActiveTab('CAMPAIGNS')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all whitespace-nowrap ${activeTab === 'CAMPAIGNS' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>Campaigns</button>
                        <button onClick={() => setActiveTab('WA_QUEUE')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all flex items-center whitespace-nowrap ${activeTab === 'WA_QUEUE' ? 'bg-white shadow text-green-700' : 'text-slate-500'}`}>
                            <MessageCircle size={14} className="mr-1.5"/> WA Queue
                        </button>
                        <button onClick={() => setActiveTab('WA_TEMPLATES')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all flex items-center whitespace-nowrap ${activeTab === 'WA_TEMPLATES' ? 'bg-white shadow text-green-700' : 'text-slate-500'}`}>
                            <FileCode size={14} className="mr-1.5"/> WA Master
                        </button>
                        <button onClick={() => setActiveTab('LOGS')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all whitespace-nowrap ${activeTab === 'LOGS' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>Logs</button>
                        <button onClick={() => setActiveTab('PDF_TEMPLATES')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all whitespace-nowrap ${activeTab === 'PDF_TEMPLATES' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>PDF</button>
                        <button onClick={() => setActiveTab('SETTINGS')} className={`px-3 py-2 rounded-md transition-all ${activeTab === 'SETTINGS' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}><Settings size={16}/></button>
                    </div>
                    
                    {activeTab === 'CAMPAIGNS' && (
                        <button
                            type="button"
                            onClick={() => setIsWizardOpen(true)}
                            disabled={isWizardOpen}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 flex items-center shadow-lg whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none"
                        >
                            <Plus size={18} className="mr-2"/> New Email
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden bg-white rounded-xl border border-slate-200 shadow-sm relative">
                
                {/* WHATSAPP QUEUE */}
                {activeTab === 'WA_QUEUE' && (
                    <WhatsAppQueue />
                )}

                {/* WHATSAPP TEMPLATES */}
                {activeTab === 'WA_TEMPLATES' && (
                    <div className="p-6 h-full">
                        <WhatsAppTemplateManager />
                    </div>
                )}

                {/* CAMPAIGNS LIST */}
                {activeTab === 'CAMPAIGNS' && (
                    <div className="overflow-auto h-full">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                                <tr>
                                    <th className="p-4">Campaign Name</th>
                                    <th className="p-4">Trigger</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Performance</th>
                                    <th className="p-4">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="p-16 text-center text-slate-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <Zap className="text-blue-400 animate-pulse" size={28} />
                                                <span className="text-sm font-medium">Memuat campaign…</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : campaigns.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-16 text-center">
                                            <div className="max-w-md mx-auto flex flex-col items-center gap-3 text-slate-600">
                                                <FileText className="text-slate-300" size={40} />
                                                <p className="text-sm font-semibold text-slate-800">Belum ada campaign email</p>
                                                <p className="text-sm text-slate-500 leading-relaxed">
                                                    Data di database kosong (0 campaign). Klik <span className="font-bold text-blue-600">New Email</span> di atas untuk membuat campaign pertama.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    campaigns.map(c => (
                                        <tr key={c.id} className="hover:bg-slate-50">
                                            <td className="p-4 font-medium text-slate-900">{c.name}<div className="text-xs text-slate-400 font-normal">{c.subject}</div></td>
                                            <td className="p-4"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">{c.triggerType}</span></td>
                                            <td className="p-4">
                                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${c.status === 'SENT' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {c.status}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex gap-4 text-xs">
                                                    <span className="text-slate-600"><b>{c.stats.sent}</b> Sent</span>
                                                    <span className="text-blue-600"><b>{c.stats.opened}</b> Open</span>
                                                    <span className="text-green-600"><b>{c.stats.clicked}</b> Click</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-500 text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* LOGS LIST */}
                {activeTab === 'LOGS' && (
                     <div className="overflow-auto h-full">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                                <tr>
                                    <th className="p-4">Timestamp</th>
                                    <th className="p-4">Recipient</th>
                                    <th className="p-4">Subject</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Source</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="p-16 text-center text-slate-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <Zap className="text-blue-400 animate-pulse" size={28} />
                                                <span className="text-sm font-medium">Memuat log pengiriman…</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-16 text-center">
                                            <div className="max-w-md mx-auto flex flex-col items-center gap-3 text-slate-600">
                                                <Mail className="text-slate-300" size={40} />
                                                <p className="text-sm font-semibold text-slate-800">Belum ada log email</p>
                                                <p className="text-sm text-slate-500 leading-relaxed">
                                                    Di database belum ada riwayat pengiriman (0 log). Log akan muncul setelah campaign terkirim atau email transaksi dikirim.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map(l => (
                                        <tr key={l.id} className="hover:bg-slate-50">
                                            <td className="p-4 text-xs font-mono text-slate-500 whitespace-nowrap">{new Date(l.sentAt).toLocaleString()}</td>
                                            <td className="p-4 font-medium text-slate-900">{l.recipientEmail}</td>
                                            <td className="p-4 text-slate-600">{l.subject}</td>
                                            <td className="p-4">
                                                <span className={`flex items-center text-xs font-bold ${l.status === 'SUCCESS' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {l.status === 'SUCCESS' ? <CheckCircle size={14} className="mr-1"/> : <AlertCircle size={14} className="mr-1"/>}
                                                    {l.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-xs text-slate-400">
                                                {l.campaignId ? 'Campaign' : 'Transactional'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                     </div>
                )}

                {/* SETTINGS */}
                {activeTab === 'SETTINGS' && (
                    <div className="p-6">
                        <SMTPSettings />
                    </div>
                )}

                {/* PDF DESIGNER */}
                {activeTab === 'PDF_TEMPLATES' && (
                    <div className="p-6 h-full">
                        <PDFDesigner />
                    </div>
                )}
            </div>

            {isWizardOpen && (
                <EmailWizard 
                    onClose={() => setIsWizardOpen(false)} 
                    onComplete={() => { setIsWizardOpen(false); showToast('Email Scheduled Successfully', 'success'); loadData(); }} 
                />
            )}
        </div>
    );
};

export default CommunicationHub;
