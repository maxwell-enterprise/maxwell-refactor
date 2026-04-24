
import React, { useState } from 'react';
import { DataService } from '../services/dataService';
import { Transaction } from '../types/index';
import { Lock, AlertTriangle, BookOpen } from 'lucide-react';
import { useAccess } from '../context/SecurityContext';
import TransactionModal from './finance/TransactionModal';
import SettlementHub from './finance/SettlementHub';
import CommissionPayoutPanel from './finance/CommissionPayoutPanel';
import RefundManager from './finance/RefundManager';
import UnifiedLedger from './finance/UnifiedLedger';
import { FinanceForecastDashboard } from './finance/FinanceForecastDashboard';
import { useToast } from '../context/ToastContext';

const Finance: React.FC = () => {
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
      return (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] text-slate-400">
              <Lock size={64} className="mb-4 text-slate-200" />
              <h2 className="text-xl font-bold text-slate-600">Restricted Financial Data</h2>
              <p>Your role does not have permission to view the Finance Dashboard.</p>
          </div>
      );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pb-20 pt-4 animate-fade-in relative sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Treasury & Settlements</h1>
          <p className="text-slate-500 mt-1">Unified ledger for AR, AP, and performance-based commissions.</p>
        </div>
        
        <div className="-mx-1 overflow-x-auto pb-1">
          <div className="flex min-w-max bg-slate-100 p-1 rounded-xl shadow-inner">
          <button onClick={() => setActiveTab('DASHBOARD')} className={`px-3 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap sm:px-4 ${activeTab === 'DASHBOARD' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>Forecast</button>
          <button onClick={() => setActiveTab('UNIFIED_LEDGER')} className={`px-3 py-2 text-sm font-bold rounded-lg transition-all flex items-center whitespace-nowrap sm:px-4 ${activeTab === 'UNIFIED_LEDGER' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>
              <BookOpen size={14} className="mr-1.5"/> Ledger
          </button>
          <button onClick={() => setActiveTab('LEDGER_HUB')} className={`px-3 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap sm:px-4 ${activeTab === 'LEDGER_HUB' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>Settlement Hub</button>
          <button onClick={() => setActiveTab('PAYOUTS')} className={`px-3 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap sm:px-4 ${activeTab === 'PAYOUTS' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>Payouts</button>
          <button onClick={() => setActiveTab('EXCEPTIONS')} className={`px-3 py-2 text-sm font-bold rounded-lg transition-all flex items-center whitespace-nowrap sm:px-4 ${activeTab === 'EXCEPTIONS' ? 'bg-white shadow text-rose-700' : 'text-slate-500'}`}>
              <AlertTriangle size={12} className="mr-1.5"/> Exceptions
          </button>
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

export default Finance;
