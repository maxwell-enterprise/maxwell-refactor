
import React from 'react';
import { Role } from '../../types/security';
import { Shield, Lock, Users, AlertTriangle } from 'lucide-react';

interface RoleManagerProps {
  roles: Role[];
  selectedRoleId: string;
  onSelectRole: (id: string) => void;
}

const RoleManager: React.FC<RoleManagerProps> = ({ roles, selectedRoleId, onSelectRole }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-slate-100 bg-slate-50">
        <h3 className="font-bold text-slate-800 flex items-center">
            <Shield size={18} className="mr-2 text-blue-600"/> Role Hierarchy
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {roles.map(role => (
            <button
                key={role.id}
                onClick={() => onSelectRole(role.id)}
                className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-all ${
                    selectedRoleId === role.id 
                    ? 'bg-blue-50 border-blue-200 text-blue-800 ring-1 ring-blue-200' 
                    : 'hover:bg-slate-50 text-slate-600 border border-transparent'
                }`}
            >
                <div className="flex items-center">
                    <div className={`p-2 rounded-full mr-3 ${role.isSystemRole ? 'bg-slate-200 text-slate-600' : 'bg-white border border-slate-200 text-blue-600'}`}>
                        {role.isSystemRole ? <Lock size={14}/> : <Users size={14}/>}
                    </div>
                    <div>
                        <div className="font-bold text-sm">{role.name}</div>
                        <div className="text-[10px] text-slate-400">{role.permissions.length} Permissions</div>
                    </div>
                </div>
                {role.sodViolations && role.sodViolations.length > 0 && (
                    <div className="text-amber-500" title="SOD Conflict Detected">
                        <AlertTriangle size={16} />
                    </div>
                )}
            </button>
        ))}
      </div>
      <div className="p-4 border-t border-slate-100 bg-slate-50">
          <button className="w-full py-2 bg-white border border-slate-300 text-slate-600 font-medium rounded-lg hover:bg-slate-100 text-sm">
              + Create Custom Role
          </button>
      </div>
    </div>
  );
};

export default RoleManager;
