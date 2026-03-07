
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccess } from '../context/SecurityContext'; 
import { ShoppingBag, Box, Ticket, Settings, PieChart, Warehouse, History } from 'lucide-react';
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
    <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-64px)] flex flex-col animate-fade-in relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Marketplace & Resources</h1>
          <p className="text-slate-500 mt-1">Acquire certification packages, tickets, and learning tools.</p>
        </div>
        
        <div className="bg-slate-100 p-1 rounded-lg flex shadow-inner overflow-x-auto">
             <button 
                onClick={() => setActiveTab('catalog')} 
                className={`flex items-center px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'catalog' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
             >
                <ShoppingBag size={16} className="mr-2" /> Store
             </button>

             <button 
                onClick={() => setActiveTab('history')} 
                className={`flex items-center px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'history' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
             >
                <History size={16} className="mr-2" /> My Orders
             </button>
             
             {canManageInventory('READ') && (
                 <button 
                    onClick={() => setActiveTab('inventory')} 
                    className={`flex items-center px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'inventory' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                    <Warehouse size={16} className="mr-2" /> Warehouse
                 </button>
             )}
             
             {canManageDiscounts('READ') && (
                 <>
                    <button 
                        onClick={() => setActiveTab('discounts')} 
                        className={`flex items-center px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'discounts' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Ticket size={16} className="mr-2" /> Vouchers
                    </button>
                    <button 
                        onClick={() => setActiveTab('rules')} 
                        className={`flex items-center px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'rules' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Settings size={16} className="mr-2" /> Rules
                    </button>
                    <button 
                        onClick={() => setActiveTab('analytics')} 
                        className={`flex items-center px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'analytics' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <PieChart size={16} className="mr-2" /> Stats
                    </button>
                 </>
             )}
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
          {activeTab === 'catalog' && <Storefront />}
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
