
import React, { useState, useEffect } from 'react';
import { X, FileText, CreditCard, Calendar, User, AlignLeft, DollarSign, CheckCircle, AlertCircle, MapPin } from 'lucide-react';
import { Transaction, Event } from '../../types/index';
import { formatEventSelectLabel } from '../../utils/selectLabels';
import TaxInvoiceForm from './TaxInvoiceForm';
import { SpecificBusinessService } from '../../services/specificBusinessService';
import { DataService } from '../../services/dataService';
import { FinanceService, FinanceVendor } from '../../services/financeService';
import { APP_CONFIG } from '../../lib/config';

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (transaction: Omit<Transaction, 'id' | 'status'>) => Promise<string | undefined>;
}

type TransactionType = 'PO' | 'Expense';

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSave }) => {
    const [activeTab, setActiveTab] = useState<TransactionType>('PO');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showTaxForm, setShowTaxForm] = useState(false);
    const [lastTransactionId, setLastTransactionId] = useState('');
    const [events, setEvents] = useState<Event[]>([]);
    const [vendors, setVendors] = useState<FinanceVendor[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        payee: '',
        description: '',
        amount: '' as string | number,
        date: new Date().toISOString().split('T')[0],
        eventId: ''
    });

    useEffect(() => {
        if (!isOpen) return;
        void (async () => {
            const [ev, ven] = await Promise.all([
                DataService.getEvents(),
                FinanceService.listFinanceVendors(),
            ]);
            setEvents(ev);
            setVendors(ven);
        })();
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.payee || !formData.description || !formData.amount) return;
        if (!formData.eventId) {
            return;
        }

        setIsSubmitting(true);
        
        const finalDescription = activeTab === 'PO' 
            ? `${formData.payee}: ${formData.description}`
            : `${formData.description} (Claim by ${formData.payee})`;

        const transactionData = {
            date: formData.date,
            type: activeTab,
            description: finalDescription,
            amount: Number(formData.amount),
            eventId: formData.eventId
        };

        try {
            if (activeTab === 'PO') {
                await FinanceService.ensureFinanceVendor(formData.payee);
            }

            const savedId = await onSave(transactionData);
            const recordId = savedId ?? '';

            if (activeTab === 'PO' && Number(formData.amount) > 10000000 && APP_CONFIG.USE_MOCK) {
                await SpecificBusinessService.calculateAndSaveRoyalties(recordId, Number(formData.amount));
            }

            setIsSubmitting(false);
            if (activeTab === 'PO' && recordId) {
                setLastTransactionId(recordId);
                setShowTaxForm(true);
            } else {
                onClose();
                setFormData({ payee: '', description: '', amount: '', date: new Date().toISOString().split('T')[0], eventId: '' });
            }
        } catch {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Create New Record</h3>
                        <p className="text-xs text-slate-500">Finance & Cost Control</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-200 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {showTaxForm ? (
                    <div className="p-6">
                        <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4 text-sm flex items-center">
                            <CheckCircle size={16} className="mr-2"/> Transaction Recorded.
                        </div>
                        <p className="text-sm text-slate-600 mb-4">Do you need to generate a Tax Invoice (Faktur Pajak) for this transaction?</p>
                        
                        <TaxInvoiceForm 
                            transactionId={lastTransactionId} 
                            amount={Number(formData.amount)} 
                            onClose={() => {
                                setShowTaxForm(false);
                                onClose();
                                setFormData({ payee: '', description: '', amount: '', date: new Date().toISOString().split('T')[0], eventId: '' });
                            }} 
                        />
                        <button onClick={() => { setShowTaxForm(false); onClose(); }} className="w-full text-center text-xs text-slate-400 mt-4 hover:underline">Skip Tax Invoice</button>
                    </div>
                ) : (
                    <>
                        {/* Tabs */}
                        <div className="flex border-b border-slate-100">
                            <button 
                                onClick={() => setActiveTab('PO')}
                                className={`flex-1 py-3 text-sm font-bold flex items-center justify-center transition-colors ${activeTab === 'PO' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                <FileText size={16} className="mr-2"/> Purchase Order
                            </button>
                            <button 
                                onClick={() => setActiveTab('Expense')}
                                className={`flex-1 py-3 text-sm font-bold flex items-center justify-center transition-colors ${activeTab === 'Expense' ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                <CreditCard size={16} className="mr-2"/> Expense Claim
                            </button>
                        </div>

                        {/* Body */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            
                            {/* Context Banner */}
                            <div className={`p-3 rounded-lg border flex items-start gap-3 ${activeTab === 'PO' ? 'bg-blue-50 border-blue-100 text-blue-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
                                {activeTab === 'PO' ? <FileText size={18} className="shrink-0 mt-0.5"/> : <AlertCircle size={18} className="shrink-0 mt-0.5"/>}
                                <div className="text-xs leading-relaxed">
                                    {activeTab === 'PO' 
                                        ? "Creates a formal request to pay a Vendor. Requires approval before funds are released." 
                                        : "Reimburse a staff member for operational costs. Must attach proof later."}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center">
                                        <User size={12} className="mr-1"/> {activeTab === 'PO' ? 'Vendor / Supplier' : 'Staff Name / Claimant'}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        list={activeTab === 'PO' && vendors.length > 0 ? 'finance-vendor-list' : undefined}
                                        autoFocus
                                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder={activeTab === 'PO' ? "e.g. PT Catering Sejahtera" : "e.g. Budi Santoso"}
                                        value={formData.payee}
                                        onChange={(e) => setFormData({ ...formData, payee: e.target.value })}
                                    />
                                    {activeTab === 'PO' && vendors.length > 0 && (
                                      <datalist id="finance-vendor-list">
                                        {vendors.map((v) => (
                                          <option key={v.id} value={v.name} />
                                        ))}
                                      </datalist>
                                    )}
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center">
                                        <AlignLeft size={12} className="mr-1"/> Description / Item Details
                                    </label>
                                    <textarea 
                                        required
                                        rows={2}
                                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                        placeholder={activeTab === 'PO' ? "e.g. Venue Rental Deposit for Summit" : "e.g. Taxi reimbursement for client meeting"}
                                        value={formData.description}
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center">
                                        <Calendar size={12} className="mr-1"/> Transaction Date
                                    </label>
                                    <input 
                                        type="date" 
                                        required
                                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.date}
                                        onChange={e => setFormData({...formData, date: e.target.value})}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center">
                                        <DollarSign size={12} className="mr-1"/> Amount (IDR)
                                    </label>
                                    <input 
                                        type="number" 
                                        required
                                        min="0"
                                        className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="0"
                                        value={formData.amount}
                                        onChange={e => setFormData({...formData, amount: e.target.value})}
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center">
                                        <MapPin size={12} className="mr-1"/> Allocation (Event / Cost Center)
                                    </label>
                                    <select 
                                        required
                                        className="mobile-safe-select rounded-lg border border-slate-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.eventId}
                                        onChange={e => setFormData({...formData, eventId: e.target.value})}
                                    >
                                        <option value="">— Select event (required) —</option>
                                        {events.map((evt) => (
                                            <option key={evt.id} value={evt.id} title={`${evt.name} (${evt.date})`}>
                                                {formatEventSelectLabel(evt)}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-slate-400 mt-1">Event tag is required for P&amp;L reporting.</p>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button 
                                    type="button" 
                                    onClick={onClose} 
                                    className="flex-1 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className={`flex-[2] py-2.5 text-white font-bold rounded-xl shadow-lg transition-colors flex items-center justify-center text-sm disabled:opacity-50 ${activeTab === 'PO' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                                >
                                    {isSubmitting ? 'Processing...' : (
                                        <>
                                            <CheckCircle size={16} className="mr-2" />
                                            {activeTab === 'PO' ? 'Create Purchase Order' : 'Submit Claim'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default TransactionModal;
