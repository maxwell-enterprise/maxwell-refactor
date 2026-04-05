
import React, { useState } from 'react';
import { DataService } from '../../../services/dataService';
import { Transaction } from '../../../types/index';
import { useAccess } from '../../../context/SecurityContext';
import TransactionModal from '../../../components/finance/TransactionModal';
import SettlementHub from '../../../components/finance/SettlementHub';
import CommissionPayoutPanel from '../../../components/finance/CommissionPayoutPanel';
import RefundManager from '../../../components/finance/RefundManager';
import UnifiedLedger from '../../../components/finance/UnifiedLedger';
import { FinanceForecastDashboard } from '../../../components/finance/FinanceForecastDashboard';
import { useToast } from '../../../context/ToastContext';

const FinancePage: React.FC = () => {
  const { can } = useAccess('fin_invoices');
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'LEDGER_HUB' | 'UNIFIED_LEDGER' | 'PAYOUTS' | 'EXCEPTIONS'>('DASHBOARD');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [forecastRefreshKey, setForecastRefreshKey] = useState(0);

  const handleCreateTransaction = async (data: Omit<Transaction, 'id' | 'status'>) => {
      const newTx: Transaction = {
          id: `${data.type === 'PO' ? 'PO' : 'EXP'}-${Date.now()}`,
          ...data,
          status: 'Pending'
      };
      await DataService.addTransaction(newTx);
      showToast('Record created successfully.', 'success');
      setForecastRefreshKey((k) => k + 1);
  };

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
        <div className="space-y-6">
          <FinanceForecastDashboard
            active={activeTab === 'DASHBOARD'}
            refreshKey={forecastRefreshKey}
            onNewAp={() => setIsModalOpen(true)}
          />
        </div>
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
