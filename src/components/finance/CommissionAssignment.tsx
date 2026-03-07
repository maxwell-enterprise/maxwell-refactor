
import React, { useState, useEffect } from 'react';
import { CommissionService } from '../../services/commissionService';
import { CommissionCandidate, CommissionRule } from '../../types/commission';
import { useToast } from '../../context/ToastContext';
import { 
    CheckCircle2, AlertCircle, DollarSign, UserCheck, 
    ArrowRight, Search, Filter, UserPlus
} from 'lucide-react';
import WhatsAppQuickAction from '../common/WhatsAppQuickAction';
import { Member } from '../../types/index';
import { DataService } from '../../services/dataService';

const CommissionAssignment: React.FC = () => {
    const { showToast } = useToast();
    const [candidates, setCandidates] = useState<CommissionCandidate[]>([]);
    const [rules, setRules] = useState<CommissionRule[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Selection State
    const [selectedCandidate, setSelectedCandidate] = useState<CommissionCandidate | null>(null);
    const [selectedRule, setSelectedRule] = useState<CommissionRule | null>(null);
    const [beneficiary, setBeneficiary] = useState<Member | null>(null); // To store full beneficiary details for WA

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [cands, rls] = await Promise.all([
            CommissionService.getUnassignedCandidates(),
            CommissionService.getRules()
        ]);
        setCandidates(cands);
        setRules(rls);
        setLoading(false);
    };

    const handleSelectCandidate = async (c: CommissionCandidate) => {
        setSelectedCandidate(c);
        setSelectedRule(null);
        setBeneficiary(null); // Reset beneficiary

        // Auto-select rule if possible (Mock logic: First matching rule)
        const match = rules.find(r => r.targetProductId === 'ALL' || r.targetProductId === c.productName); // Simplified match
        if (match) setSelectedRule(match);

        // If candidate has suggested beneficiary, try to fetch full details
        if (c.suggestedBeneficiary) {
            const allMembers = await DataService.getMembers();
            const found = allMembers.find(m => m.id === c.suggestedBeneficiary?.id);
            if (found) setBeneficiary(found);
        }
    };

    const handleConfirmAssignment = async () => {
        if (!selectedCandidate || !selectedRule || !selectedCandidate.suggestedBeneficiary) {
            showToast('Missing assignment details.', 'error');
            return;
        }

        await CommissionService.assignCommission(
            selectedCandidate, 
            selectedCandidate.suggestedBeneficiary.id, 
            selectedRule
        );
        
        showToast('Commission assigned successfully', 'success');
        setSelectedCandidate(null);
        loadData();
    };

    const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

    const calculatedCommission = selectedCandidate && selectedRule 
        ? CommissionService.calculateCommission(selectedCandidate.amount, selectedRule) 
        : 0;

    return (
        <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-64px)] flex flex-col animate-fade-in">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                    <UserCheck className="mr-3 text-green-600" /> Commission Assignment
                </h1>
                <p className="text-slate-500 mt-1">Review sales transactions and attribute commissions to facilitators.</p>
            </div>

            <div className="flex gap-6 h-full overflow-hidden">
                {/* LEFT: CANDIDATE LIST */}
                <div className="w-1/3 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-700 text-sm">
                        Unassigned Transactions ({candidates.length})
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {loading && <div className="p-4 text-center text-slate-400">Loading...</div>}
                        {!loading && candidates.length === 0 && <div className="p-8 text-center text-slate-400">No pending assignments.</div>}
                        
                        {candidates.map(c => (
                            <div 
                                key={c.transactionId}
                                onClick={() => handleSelectCandidate(c)}
                                className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedCandidate?.transactionId === c.transactionId ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-slate-200 hover:border-blue-300'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-slate-900">{c.buyerName}</span>
                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 rounded">{c.transactionId}</span>
                                </div>
                                <div className="text-xs text-slate-500 mb-2">{c.productName}</div>
                                <div className="font-mono font-bold text-slate-800 text-sm">{formatIDR(c.amount)}</div>
                                
                                {c.suggestedBeneficiary && (
                                    <div className="mt-2 flex justify-between items-center">
                                        <div className="text-[10px] bg-green-50 text-green-700 px-2 py-1 rounded flex items-center border border-green-100">
                                            <UserPlus size={10} className="mr-1"/> Suggested: {c.suggestedBeneficiary.name}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: ACTION PANEL */}
                <div className="flex-1 bg-white rounded-xl border border-slate-200 flex flex-col shadow-sm">
                    {selectedCandidate ? (
                        <div className="flex flex-col h-full">
                            <div className="p-6 border-b border-slate-100">
                                <h3 className="text-lg font-bold text-slate-900 mb-4">Assignment Details</h3>
                                
                                <div className="grid grid-cols-2 gap-6 mb-6">
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Transaction</label>
                                        <div className="font-bold text-lg text-slate-900 mt-1">{formatIDR(selectedCandidate.amount)}</div>
                                        <div className="text-xs text-slate-500 mt-1">{selectedCandidate.productName}</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Beneficiary (Calculated)</label>
                                        <div className="font-bold text-lg text-slate-900 mt-1">{selectedCandidate.suggestedBeneficiary?.name || 'Manual Selection'}</div>
                                        <div className="text-xs text-slate-500 mt-1">{selectedCandidate.suggestedBeneficiary?.reason || 'Select Rule'}</div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Applied Logic Rule</label>
                                    <select 
                                        className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-white"
                                        value={selectedRule?.id || ''}
                                        onChange={(e) => setSelectedRule(rules.find(r => r.id === e.target.value) || null)}
                                    >
                                        <option value="">-- Select Commission Rule --</option>
                                        {rules.map(r => (
                                            <option key={r.id} value={r.id}>{r.name} ({r.type === 'PERCENTAGE_ON_SALES' ? `${r.value}%` : formatIDR(r.value)})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex-1 p-6 bg-slate-50/50 flex flex-col justify-center items-center">
                                <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl w-full max-w-md">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <p className="text-slate-400 text-xs font-bold uppercase mb-1">Total Payout</p>
                                            <p className="text-4xl font-bold">{formatIDR(calculatedCommission)}</p>
                                        </div>
                                        <div className="p-3 bg-white/10 rounded-xl">
                                            <DollarSign size={24} className="text-green-400"/>
                                        </div>
                                    </div>

                                    {beneficiary && selectedRule && (
                                        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-700">
                                            <p className="text-xs text-slate-400">Notify {beneficiary.name}:</p>
                                            <WhatsAppQuickAction 
                                                phone={beneficiary.phone || '62812345678'} // Fallback if missing
                                                name={beneficiary.name}
                                                context="FINANCE_COMMISSION"
                                                variant="ghost"
                                                label="Send WA Notification"
                                                contextData={{
                                                    member_name: beneficiary.name,
                                                    comm_amount: formatIDR(calculatedCommission),
                                                    comm_source: selectedCandidate.buyerName
                                                }}
                                            />
                                        </div>
                                    )}

                                    <button 
                                        onClick={handleConfirmAssignment}
                                        disabled={!selectedRule}
                                        className="w-full mt-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all shadow-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <CheckCircle2 size={18} className="mr-2"/> Confirm Payout
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <AlertCircle size={48} className="mb-4 opacity-20"/>
                            <p>Select a transaction to assign commission.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommissionAssignment;
