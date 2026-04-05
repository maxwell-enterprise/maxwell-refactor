
import React, { useState, useEffect } from 'react';
import { TribeService } from '../../services/tribeService';
import { PayoutTransaction } from '../../types/tribe';
import { CheckCircle2, Clock, Wallet, ArrowRight, User, MoreHorizontal, FileText, Landmark } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const CommissionPayoutPanel: React.FC = () => {
  const { showToast } = useToast();
  const [payouts, setPayouts] = useState<PayoutTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const data = await TribeService.getMyCommissions('admin-1');
        setPayouts(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await TribeService.markPayoutPaid(id);
      setPayouts((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, status: 'PAID' as const, paidAt: new Date().toISOString() }
            : p,
        ),
      );
      showToast('Payout marked as paid.', 'success');
    } catch {
      showToast('Failed to update payout.', 'error');
    }
  };

  const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-slate-900">Commission Payout Queue</h3>
          <p className="text-xs text-slate-500">Process earned commissions for Facilitators.</p>
        </div>
        <button className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors">
          Process Batch (Pending)
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
            <tr>
              <th className="p-4">Beneficiary</th>
              <th className="p-4">Basis Transaction</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payouts.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><User size={16}/></div>
                    <div>
                      <div className="font-bold text-slate-900">{p.beneficiaryId}</div>
                      <div className="text-[10px] text-slate-500 uppercase font-mono">{p.id}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="text-slate-700 font-medium">{p.productName}</div>
                  <div className="text-[10px] text-slate-400">Buyer: {p.sourceMemberName} • {p.ruleApplied}</div>
                </td>
                <td className="p-4 font-mono font-bold text-slate-900">
                  {formatIDR(p.amount)}
                </td>
                <td className="p-4">
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${p.status === 'PAID' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                    {p.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  {p.status === 'PENDING' ? (
                    <button 
                      onClick={() => handleApprove(p.id)}
                      className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-all shadow-sm"
                    >
                      Settle Payment
                    </button>
                  ) : (
                    <div className="text-xs text-green-600 flex items-center justify-end gap-1 font-bold">
                      <CheckCircle2 size={14}/> Settled
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CommissionPayoutPanel;
