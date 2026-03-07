
import React, { useState, useMemo } from 'react';
import { Role, ResourceDefinition, AccessLevel, DataScope, AccessPolicy } from '../../types/security';
import { SECURE_RESOURCES } from '../../constants/securityDefs';
import { Shield, Eye, Edit3, Trash2, Globe, User, Users, Lock, DollarSign, AlertCircle, CheckCircle2, Sliders } from 'lucide-react';

interface AdvancedRoleEditorProps {
  role: Role;
  onUpdatePolicy: (resourceId: string, policy: AccessPolicy) => void;
  isReadOnly: boolean;
}

const AdvancedRoleEditor: React.FC<AdvancedRoleEditorProps> = ({ role, onUpdatePolicy, isReadOnly }) => {
  const [activeCategory, setActiveCategory] = useState<string>('FINANCE');

  // Group Resources
  const resourcesByCategory = useMemo(() => {
      const grouped: Record<string, ResourceDefinition[]> = {};
      SECURE_RESOURCES.forEach(r => {
          if (!grouped[r.category]) grouped[r.category] = [];
          grouped[r.category].push(r);
      });
      return grouped;
  }, []);

  const categories = Object.keys(resourcesByCategory);

  const getPolicy = (resourceId: string): AccessPolicy => {
      return role.policies?.[resourceId] || { 
          resourceId, 
          accessLevel: 'NONE', 
          scope: 'OWN' 
      };
  };

  const handleAccessChange = (resourceId: string, level: AccessLevel) => {
      const current = getPolicy(resourceId);
      onUpdatePolicy(resourceId, { ...current, accessLevel: level });
  };

  const handleScopeChange = (resourceId: string, scope: DataScope) => {
      const current = getPolicy(resourceId);
      onUpdatePolicy(resourceId, { ...current, scope });
  };

  const handleLimitChange = (resourceId: string, amount: number) => {
      const current = getPolicy(resourceId);
      onUpdatePolicy(resourceId, { 
          ...current, 
          authorityLimit: { ...current.authorityLimit, maxAmount: amount } 
      });
  };

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  // --- RENDERERS ---

  const AccessLevelSelector = ({ resource, policy }: { resource: ResourceDefinition, policy: AccessPolicy }) => {
      const levels: { val: AccessLevel, icon: any, label: string, color: string }[] = [
          { val: 'NONE', icon: Lock, label: 'No Access', color: 'bg-slate-100 text-slate-400' },
          { val: 'READ', icon: Eye, label: 'View Only', color: 'bg-blue-100 text-blue-600' },
          { val: 'WRITE', icon: Edit3, label: 'Edit', color: 'bg-amber-100 text-amber-600' },
          { val: 'FULL', icon: Trash2, label: 'Full Control', color: 'bg-red-100 text-red-600' },
      ];

      return (
          <div className="flex bg-slate-100 p-1 rounded-lg">
              {levels.map((lvl) => (
                  <button
                    key={lvl.val}
                    onClick={() => handleAccessChange(resource.id, lvl.val)}
                    disabled={isReadOnly}
                    className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md text-xs font-bold transition-all ${
                        policy.accessLevel === lvl.val 
                        ? `${lvl.color} shadow-sm ring-1 ring-black/5` 
                        : 'text-slate-500 hover:bg-slate-200'
                    }`}
                    title={lvl.label}
                  >
                      <lvl.icon size={14} className="mr-1 md:mr-2" />
                      <span className="hidden md:inline">{lvl.label}</span>
                  </button>
              ))}
          </div>
      );
  };

  const ScopeSelector = ({ resource, policy }: { resource: ResourceDefinition, policy: AccessPolicy }) => {
      if (!resource.supportsScoping || policy.accessLevel === 'NONE') return null;

      const scopes: { val: DataScope, icon: any, label: string }[] = [
          { val: 'OWN', icon: User, label: 'Own Only' },
          { val: 'TEAM', icon: Users, label: 'Department' },
          { val: 'ALL', icon: Globe, label: 'Everything' },
      ];

      return (
          <div className="mt-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Data Visibility Scope</label>
              <div className="flex gap-2">
                  {scopes.map(s => (
                      <button
                        key={s.val}
                        onClick={() => handleScopeChange(resource.id, s.val)}
                        disabled={isReadOnly}
                        className={`flex items-center px-3 py-1.5 rounded-full text-xs border transition-colors ${
                            policy.scope === s.val 
                            ? 'bg-slate-800 text-white border-slate-800' 
                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                        }`}
                      >
                          <s.icon size={12} className="mr-1.5" />
                          {s.label}
                      </button>
                  ))}
              </div>
          </div>
      );
  };

  const AuthorityLimitInput = ({ resource, policy }: { resource: ResourceDefinition, policy: AccessPolicy }) => {
      if (!resource.supportsAuthority || policy.accessLevel === 'NONE' || policy.accessLevel === 'READ') return null;

      const limit = policy.authorityLimit?.maxAmount || 0;

      return (
          <div className="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center">
                      <DollarSign size={10} className="mr-1" /> Level of Authority (Limit)
                  </label>
                  <span className="text-xs font-mono font-bold text-slate-900">{limit > 0 ? formatIDR(limit) : 'Unlimited'}</span>
              </div>
              <input 
                  type="range" 
                  min="0" 
                  max="1000000000" 
                  step="1000000"
                  value={limit}
                  disabled={isReadOnly}
                  onChange={(e) => handleLimitChange(resource.id, Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                  User can {policy.accessLevel === 'FULL' ? 'Delete/Refund' : 'Approve/Create'} transactions up to this value.
              </p>
          </div>
      );
  };

  return (
    <div className="flex flex-col md:flex-row h-full gap-6">
        {/* Sidebar Categories */}
        <div className="w-full md:w-48 flex-shrink-0 space-y-1">
            {categories.map(cat => (
                <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all flex justify-between items-center ${
                        activeCategory === cat 
                        ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                        : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                    }`}
                >
                    {cat}
                    {activeCategory === cat && <ChevronRight size={14} />}
                </button>
            ))}
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            <div className="bg-slate-900 text-white p-4 rounded-xl mb-4">
                <h3 className="font-bold flex items-center">
                    <Shield size={18} className="mr-2 text-blue-400" />
                    Advanced Access Control
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                    Configure granular permissions (CRUD), data scoping (RLS), and authority limits for {role.name}.
                </p>
            </div>

            {resourcesByCategory[activeCategory]?.map(resource => {
                const policy = getPolicy(resource.id);
                return (
                    <div key={resource.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-bold text-slate-900 text-base">{resource.name}</h4>
                                <p className="text-xs text-slate-500 mt-0.5">{resource.description}</p>
                            </div>
                            <div className="bg-slate-100 text-slate-500 text-[10px] px-2 py-1 rounded font-mono">
                                {resource.id}
                            </div>
                        </div>

                        {/* 1. Access Level */}
                        <AccessLevelSelector resource={resource} policy={policy} />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* 2. Scoping (RLS) */}
                            <ScopeSelector resource={resource} policy={policy} />

                            {/* 3. Authority Limit */}
                            <AuthorityLimitInput resource={resource} policy={policy} />
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );
};

// Helper Icon
const ChevronRight = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
);

export default AdvancedRoleEditor;
