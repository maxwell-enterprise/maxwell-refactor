
import React, { useState } from 'react';
import { useAccess } from '../context/SecurityContext'; 
import { ShoppingBag, Ticket, Settings, PieChart, Warehouse, History } from 'lucide-react';
import Storefront from './store/Storefront';
import InventoryManager from './store/InventoryManager';
import DiscountManager from './store/DiscountManager';
import PricingRulesManager from './store/PricingRulesManager'; 
import DiscountAnalytics from './store/DiscountAnalytics'; 
import PurchaseHistory from './store/PurchaseHistory'; // NEW

const Store: React.FC = () => {
  const { can: canManageInventory } = useAccess('ops_inventory');
  const { can: canManageDiscounts } = useAccess('mkt_discounts');
  
  const [activeTab, setActiveTab] = useState<'catalog' | 'inventory' | 'discounts' | 'rules' | 'analytics' | 'history'>('catalog');

  return (
    <div className="page-container relative w-full min-w-0 animate-fade-in">
      <div className="mb-4 flex shrink-0 flex-col gap-4 sm:mb-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Marketplace & Resources</h1>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">Acquire certification packages, tickets, and learning tools.</p>
        </div>
        
        <div className="max-w-full overflow-x-scroll-touch rounded-xl bg-slate-100 p-1 shadow-inner">
          <div className="inline-flex flex-nowrap gap-0.5">
             <button 
                type="button"
                onClick={() => setActiveTab('catalog')} 
                className={`flex shrink-0 items-center whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-bold transition-all sm:px-4 sm:text-sm ${activeTab === 'catalog' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
             >
                <ShoppingBag size={16} className="mr-1.5 shrink-0 sm:mr-2" /> Store
             </button>

             <button 
                type="button"
                onClick={() => setActiveTab('history')} 
                className={`flex shrink-0 items-center whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-bold transition-all sm:px-4 sm:text-sm ${activeTab === 'history' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
             >
                <History size={16} className="mr-1.5 shrink-0 sm:mr-2" /> My Orders
             </button>
             
             {canManageInventory('READ') && (
                 <button 
                    type="button"
                    onClick={() => setActiveTab('inventory')} 
                    className={`flex shrink-0 items-center whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-bold transition-all sm:px-4 sm:text-sm ${activeTab === 'inventory' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                    <Warehouse size={16} className="mr-1.5 shrink-0 sm:mr-2" /> Warehouse
                 </button>
             )}
             
             {canManageDiscounts('READ') && (
                 <>
                    <button 
                        type="button"
                        onClick={() => setActiveTab('discounts')} 
                        className={`flex shrink-0 items-center whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-bold transition-all sm:px-4 sm:text-sm ${activeTab === 'discounts' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Ticket size={16} className="mr-1.5 shrink-0 sm:mr-2" /> Vouchers
                    </button>
                    <button 
                        type="button"
                        onClick={() => setActiveTab('rules')} 
                        className={`flex shrink-0 items-center whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-bold transition-all sm:px-4 sm:text-sm ${activeTab === 'rules' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Settings size={16} className="mr-1.5 shrink-0 sm:mr-2" /> Rules
                    </button>
                    <button 
                        type="button"
                        onClick={() => setActiveTab('analytics')} 
                        className={`flex shrink-0 items-center whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-bold transition-all sm:px-4 sm:text-sm ${activeTab === 'analytics' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <PieChart size={16} className="mr-1.5 shrink-0 sm:mr-2" /> Stats
                    </button>
                 </>
             )}
          </div>
        </div>
      </div>

      <div className="relative min-h-0 min-w-0 flex-1">
          {activeTab === 'catalog' && <Storefront allowWorkspaceCheckoutConfig />}
          {activeTab === 'history' && <PurchaseHistory />}
          {activeTab === 'inventory' && <InventoryManager />}
          {activeTab === 'discounts' && <DiscountManager />}
          {activeTab === 'rules' && <PricingRulesManager />}
          {activeTab === 'analytics' && <DiscountAnalytics />}
      </div>
    </div>
  );
};

export default Store;
