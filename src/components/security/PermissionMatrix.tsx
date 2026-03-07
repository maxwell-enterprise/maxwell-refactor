
import React, { useMemo } from 'react';
import { Role, Permission, SodRule } from '../../types/security';
import { PermissionService } from '../../services/permissionService';
import { AlertTriangle, CheckSquare, Square, ShieldAlert } from 'lucide-react';

interface PermissionMatrixProps {
  role: Role;
  onUpdatePermissions: (permIds: string[]) => void;
  isReadOnly: boolean;
}

const PermissionMatrix: React.FC<PermissionMatrixProps> = ({ role, onUpdatePermissions, isReadOnly }) => {
  const groupedPermissions = useMemo(() => PermissionService.getPermissionsGrouped(), []);
  const sodViolations = useMemo(() => PermissionService.getSodRules(role.sodViolations || []), [role.sodViolations]);

  const togglePermission = (permId: string) => {
      if (isReadOnly) return;
      const current = role.permissions;
      if (current.includes(permId)) {
          onUpdatePermissions(current.filter(id => id !== permId));
      } else {
          onUpdatePermissions([...current, permId]);
      }
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-xl font-bold text-slate-900">{role.name}</h2>
                <p className="text-slate-500 text-sm">{role.description}</p>
            </div>
            <div className="flex items-center space-x-2">
                {role.isSystemRole && <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded text-xs font-bold uppercase border border-slate-200">System Locked</span>}
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-bold uppercase border border-blue-200">Active</span>
            </div>
        </div>

        {/* SOD Conflict Monitor */}
        {sodViolations.length > 0 ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-fade-in">
                <div className="flex items-center mb-3">
                    <ShieldAlert className="text-red-600 mr-2" size={20} />
                    <h3 className="font-bold text-red-800">Segregation of Duties (SOD) Violation Detected</h3>
                </div>
                <div className="space-y-2">
                    {sodViolations.map(rule => (
                        <div key={rule.id} className="bg-white p-3 rounded-lg border border-red-100 shadow-sm flex items-start">
                            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5 mr-3" size={16} />
                            <div>
                                <div className="font-bold text-sm text-slate-800">{rule.name} <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded ml-2">{rule.severity}</span></div>
                                <p className="text-xs text-slate-600 mt-1">{rule.description}</p>
                                <div className="mt-2 text-xs text-slate-400">
                                    Conflict between: {rule.conflictingPermissions.join(' + ')}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ) : (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center text-sm text-green-800">
                <CheckSquare size={16} className="mr-2" />
                This role complies with all Governance & SOD Policies.
            </div>
        )}

        {/* Permission Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(groupedPermissions).map(([category, perms]: [string, Permission[]]) => (
                <div key={category} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                        <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">{category} Domain</h4>
                    </div>
                    <div className="p-2">
                        {perms.map(perm => {
                            const isSelected = role.permissions.includes(perm.id);
                            return (
                                <button
                                    key={perm.id}
                                    onClick={() => togglePermission(perm.id)}
                                    disabled={isReadOnly}
                                    className={`w-full flex items-start p-3 rounded-lg transition-colors text-left group ${isReadOnly ? 'opacity-75 cursor-not-allowed' : 'hover:bg-blue-50'}`}
                                >
                                    <div className={`mt-0.5 mr-3 ${isSelected ? 'text-blue-600' : 'text-slate-300 group-hover:text-blue-400'}`}>
                                        {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                                    </div>
                                    <div>
                                        <div className={`text-sm font-medium ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>{perm.label}</div>
                                        <div className="text-xs text-slate-400">{perm.description}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};

export default PermissionMatrix;
