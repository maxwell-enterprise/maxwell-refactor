
import React, { useEffect, useState, useRef } from 'react';
import { DataService } from '../../../services/dataService'; 
import { Transaction } from '../../../types/index';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Plus, Receipt, AlertCircle, TrendingUp } from 'lucide-react';
import { useAccess } from '../../../context/SecurityContext'; 
import TransactionModal from '../../../components/finance/TransactionModal'; 
import SettlementHub from '../../../components/finance/SettlementHub'; 
import CommissionPayoutPanel from '../../../components/finance/CommissionPayoutPanel';
import RefundManager from '../../../components/finance/RefundManager';
import UnifiedLedger from '../../../components/finance/UnifiedLedger';
import { useToast } from '../../../context/ToastContext';

const FinancePage: React.FC = () => {
  const { can } = useAccess('fin_invoices');
  const { showToast } = useToast();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'LEDGER_HUB' | 'UNIFIED_LEDGER' | 'PAYOUTS' | 'EXCEPTIONS'>('DASHBOARD');
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  const refreshData = () => {
      setLoading(true);
      DataService.getTransactions().then(data => {
          setTransactions(data);
          setLoading(false);
      });
  };

  useEffect(() => {
      if (can('READ')) refreshData();
  }, [can]);

  const handleCreateTransaction = async (data: Omit<Transaction, 'id' | 'status'>) => {
      const newTx: Transaction = {
          id: `${data.type === 'PO' ? 'PO' : 'EXP'}-${Date.now()}`,
          ...data,
          status: 'Pending'
      };
      await DataService.addTransaction(newTx);
      showToast('Record created successfully.', 'success');
      refreshData();
  };

  const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

  if (!can('READ')) {
      return <div>Access Restricted</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in relative pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Treasury & Settlements</h1>
          <p className="text-slate-500 mt-1">Unified ledger for AR, AP, and performance-based commissions.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
          <button onClick={() => setActiveTab('DASHBOARD')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'DASHBOARD' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>Forecast</button>
          <button onClick={() => setActiveTab('UNIFIED_LEDGER')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'UNIFIED_LEDGER' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>Ledger</button>
          <button onClick={() => setActiveTab('LEDGER_HUB')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'LEDGER_HUB' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>Settlement</button>
          <button onClick={() => setActiveTab('PAYOUTS')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'PAYOUTS' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>Payouts</button>
          <button onClick={() => setActiveTab('EXCEPTIONS')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'EXCEPTIONS' ? 'bg-white shadow text-rose-700' : 'text-slate-500'}`}>Exceptions</button>
        </div>
      </div>

      {activeTab === 'DASHBOARD' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-sm text-slate-500 font-medium">Monthly AR</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatIDR(1245000000)}</h3>
                <div className="mt-4 flex items-center text-xs text-green-600 font-bold"><TrendingUp size={12} className="mr-1"/> +12% from last month</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-sm text-slate-500 font-medium">Pending AP</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatIDR(345000000)}</h3>
                <p className="text-xs text-amber-600 mt-4 font-bold flex items-center"><AlertCircle size={12} className="mr-1"/> 12 Pending Approval</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-sm text-slate-500 font-medium">Total Comm. Accrued</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatIDR(89000000)}</h3>
                <p className="text-xs text-slate-400 mt-4">Due for 8 Facilitators</p>
            </div>
            <div className="bg-slate-900 p-5 rounded-2xl text-white shadow-xl shadow-slate-900/20">
                <p className="text-sm text-slate-400 font-medium">Current Runway</p>
                <h3 className="text-2xl font-bold mt-1">14.2 Months</h3>
                <div className="mt-4 h-1.5 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-blue-500 w-[65%]"></div></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-6">Cashflow Distribution</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[{ month: 'Jan', rev: 400, exp: 240 }, { month: 'Feb', rev: 300, exp: 139 }, { month: 'Mar', rev: 980, exp: 200 }]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="rev" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
                    <Area type="monotone" dataKey="exp" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4">Quick Post</h3>
              <div className="space-y-4">
                <button onClick={() => setIsModalOpen(true)} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg text-blue-600 shadow-sm"><Receipt size={20}/></div>
                    <div className="text-left"><p className="text-sm font-bold text-slate-900">New AP Record</p><p className="text-[10px] text-slate-500">Post vendor invoice or expense</p></div>
                  </div>
                  <Plus size={18} className="text-slate-300 group-hover:text-blue-600 transition-colors"/>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'UNIFIED_LEDGER' && <UnifiedLedger />}
      {activeTab === 'LEDGER_HUB' && <SettlementHub />}
      {activeTab === 'PAYOUTS' && <CommissionPayoutPanel />}
      {activeTab === 'EXCEPTIONS' && <RefundManager />}

      <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleCreateTransaction} />
    </div>
  );
};

export default FinancePage;
