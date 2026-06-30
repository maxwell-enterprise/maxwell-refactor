import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { StatCardProps } from '../../types/index';

const StatCard: React.FC<StatCardProps> = ({ title, value, change, subtitle, isPositive, icon, color }) => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-lg ${color}`}>
        {icon}
      </div>
      {change && (
        <div className={`flex items-center text-xs font-medium ${isPositive ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'} px-2 py-1 rounded-full`}>
          {isPositive ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
          {change}
        </div>
      )}
    </div>
    <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
    <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    {subtitle ? (
      <p className="text-[10px] text-slate-400 mt-2 leading-snug">{subtitle}</p>
    ) : null}
  </div>
);

export default StatCard;
