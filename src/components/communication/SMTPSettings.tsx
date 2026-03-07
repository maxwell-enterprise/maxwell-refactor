
import React, { useState } from 'react';
import { SMTPConfig } from '../../types/index';
import { Save, Server, ShieldCheck, Mail, AlertCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const SMTPSettings: React.FC = () => {
    const { showToast } = useToast();
    const [config, setConfig] = useState<SMTPConfig>({
        provider: 'SMTP',
        host: 'smtp.gmail.com',
        port: 587,
        user: 'admin@maxwell.com',
        apiKey: '••••••••••••',
        senderEmail: 'no-reply@maxwell.com',
        senderName: 'Maxwell Leadership'
    });

    const handleSave = () => {
        // In real app: Send to API to encrypt and store
        showToast('SMTP Configuration updated successfully.', 'success');
    };

    return (
        <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
                <div className="p-3 bg-slate-900 text-white rounded-lg">
                    <Server size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Email Gateway Configuration</h2>
                    <p className="text-sm text-slate-500">Manage API keys for transactional and marketing emails.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Service Provider</label>
                    <div className="grid grid-cols-3 gap-2">
                        {['SENDGRID', 'MAILGUN', 'SMTP'].map(prov => (
                            <button
                                key={prov}
                                onClick={() => setConfig({...config, provider: prov as any})}
                                className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${config.provider === prov ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
                            >
                                {prov}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Sender Identity</label>
                    <div className="space-y-2">
                        <input 
                            type="text" 
                            className="w-full p-2 border border-slate-200 rounded text-sm" 
                            placeholder="Sender Name" 
                            value={config.senderName} 
                            onChange={e => setConfig({...config, senderName: e.target.value})}
                        />
                        <input 
                            type="email" 
                            className="w-full p-2 border border-slate-200 rounded text-sm" 
                            placeholder="sender@domain.com" 
                            value={config.senderEmail} 
                            onChange={e => setConfig({...config, senderEmail: e.target.value})}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
                <h3 className="font-bold text-slate-800 text-sm flex items-center">
                    <ShieldCheck size={16} className="mr-2 text-green-600"/> Credentials
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Host / API Endpoint</label>
                        <input type="text" className="w-full p-2 border border-slate-300 rounded text-sm font-mono" value={config.host} onChange={e => setConfig({...config, host: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Port</label>
                        <input type="number" className="w-full p-2 border border-slate-300 rounded text-sm font-mono" value={config.port} onChange={e => setConfig({...config, port: Number(e.target.value)})} />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Username / API ID</label>
                        <input type="text" className="w-full p-2 border border-slate-300 rounded text-sm font-mono" value={config.user} onChange={e => setConfig({...config, user: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Password / API Key</label>
                        <input type="password" className="w-full p-2 border border-slate-300 rounded text-sm font-mono" value={config.apiKey} onChange={e => setConfig({...config, apiKey: e.target.value})} />
                    </div>
                </div>
            </div>

            <div className="mt-6 flex justify-between items-center">
                <div className="flex items-center text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
                    <AlertCircle size={16} className="mr-2" />
                    Ensure your domain DNS records (SPF/DKIM) are configured.
                </div>
                <button 
                    onClick={handleSave}
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center shadow-lg"
                >
                    <Save size={18} className="mr-2" /> Save Configuration
                </button>
            </div>
        </div>
    );
};

export default SMTPSettings;
