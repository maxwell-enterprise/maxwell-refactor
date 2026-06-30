
import React, { useState, useEffect } from 'react';
import { TribeService } from '../../services/tribeService';
import { PayoutTransaction } from '../../types/tribe';
import { CheckCircle2, User } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/index';

const CommissionPayoutPanel: React.FC = () => {
  const { showToast } = useToast();
  const { user, userRole } = useAuth();
  const [payouts, setPayouts] = useState<PayoutTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPayouts = async () => {
    setLoading(true);
    try {
      const viewerId = user?.id ?? '';
      const isFinanceViewer =
        userRole === UserRole.FINANCE || userRole === UserRole.SUPER_ADMIN;
      const data = isFinanceViewer
          ? await TribeService.getAllPayouts()
          : await TribeService.getMyCommissions(viewerId);
      setPayouts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPayouts();
  }, [user?.id, userRole]);

  const handleApprove = async (id: string) => {
    try {
      await TribeService.markPayoutPaid(id);
      await loadPayouts();
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
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading payouts…</td></tr>
            ) : payouts.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400">No payout records.</td></tr>
            ) : payouts.map(p => (
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
                      onClick={() => void handleApprove(p.id)}
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
