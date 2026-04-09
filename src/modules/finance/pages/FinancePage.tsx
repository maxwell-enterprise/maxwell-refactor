
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
    <div className="page-container space-y-5 sm:space-y-6 animate-fade-in relative pb-20 min-w-0">
      <div className="flex flex-col gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">Treasury &amp; Settlements</h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">Unified ledger for AR, AP, and performance-based commissions.</p>
        </div>
        
        <div className="w-full max-w-full overflow-x-scroll-touch rounded-xl bg-slate-100 p-1 shadow-inner">
          <div className="inline-flex min-w-0 flex-nowrap gap-0.5">
          <button type="button" onClick={() => setActiveTab('DASHBOARD')} className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-bold transition-all sm:px-4 sm:text-sm ${activeTab === 'DASHBOARD' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>Forecast</button>
          <button type="button" onClick={() => setActiveTab('UNIFIED_LEDGER')} className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-bold transition-all sm:px-4 sm:text-sm ${activeTab === 'UNIFIED_LEDGER' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>Ledger</button>
          <button type="button" onClick={() => setActiveTab('LEDGER_HUB')} className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-bold transition-all sm:px-4 sm:text-sm ${activeTab === 'LEDGER_HUB' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>Settlement</button>
          <button type="button" onClick={() => setActiveTab('PAYOUTS')} className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-bold transition-all sm:px-4 sm:text-sm ${activeTab === 'PAYOUTS' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>Payouts</button>
          <button type="button" onClick={() => setActiveTab('EXCEPTIONS')} className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-bold transition-all sm:px-4 sm:text-sm ${activeTab === 'EXCEPTIONS' ? 'bg-white shadow text-rose-700' : 'text-slate-500'}`}>Exceptions</button>
          </div>
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
