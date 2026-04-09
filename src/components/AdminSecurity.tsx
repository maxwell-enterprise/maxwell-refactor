
import React, { useState, useEffect, useRef } from 'react';
import { useSecurity, useAccess } from '../context/SecurityContext'; // NEW IMPORT useAccess
import { useToast } from '../context/ToastContext';
import RoleManager from './security/RoleManager';
import AdvancedRoleEditor from './security/AdvancedRoleEditor'; 
import UserAccessManager from './security/UserAccessManager';
import { ShieldCheck, History, Users, Sliders, Save, RotateCcw, AlertCircle, Lock, Download, Upload, FileSpreadsheet } from 'lucide-react';
import { AccessPolicy, Role } from '../types/security';
import { ExcelHelper } from '../utils/excelHelper';

const AdminSecurity: React.FC = () => {
  const { roles, saveRoleChanges, auditLogs, bulkImportRoles } = useSecurity();
  
  // --- ACCESS CHECK ---
  // We use the new 'sys_iam' resource to guard this entire panel logic
  const { can: canManageIAM } = useAccess('sys_iam');

  const { showToast } = useToast();
  // Safe default: Fallback to first role ID or empty string if no roles exist to prevent crash
  const [selectedRoleId, setSelectedRoleId] = useState<string>(roles.length > 0 ? roles[0].id : '');
  const [activeTab, setActiveTab] = useState<'USERS' | 'MATRIX' | 'AUDIT'>('USERS');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- DRAFT STATE LOGIC ---
  const [workingRole, setWorkingRole] = useState<Role | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); // FIXED TYPO: was 'hasUnsaved changes'

  useEffect(() => {
      // Defensive check: Ensure roles exist
      if (!roles || roles.length === 0) return;

      const original = roles.find(r => r.id === selectedRoleId);
      if (original) {
          // Deep copy to ensure immutability during edit
          try {
            setWorkingRole(JSON.parse(JSON.stringify(original)));
            setHasUnsavedChanges(false);
          } catch (e) {
            console.error("Failed to parse role data", e);
            showToast("Error loading role data", "error");
          }
      }
  }, [selectedRoleId, roles]);

  // Is the current user allowed to edit?
  // Now strictly driven by the 'sys_iam' WRITE permission
  const canEdit = canManageIAM('WRITE');

  // Handle Local Updates (Draft)
  const handleLocalPolicyUpdate = (resourceId: string, policy: AccessPolicy) => {
      if (!workingRole) return;
      setWorkingRole(prev => {
          if (!prev) return null;
          return {
              ...prev,
              policies: {
                  ...prev.policies,
                  [resourceId]: policy
              }
          };
      });
      setHasUnsavedChanges(true);
  };

  // Commit Changes to Global State
  const handleSaveChanges = () => {
      if (workingRole) {
          saveRoleChanges(workingRole);
          setHasUnsavedChanges(false);
          showToast(`Security policies for ${workingRole.name} updated successfully.`, 'success');
      }
  };

  // Revert Changes
  const handleDiscardChanges = () => {
      const original = roles.find(r => r.id === selectedRoleId);
      if (original) {
          setWorkingRole(JSON.parse(JSON.stringify(original)));
          setHasUnsavedChanges(false);
          showToast('Changes discarded.', 'info');
      }
  };

  const handleRoleSelection = (id: string) => {
      if (hasUnsavedChanges) {
          if (window.confirm("You have unsaved changes. Discard them?")) {
              setSelectedRoleId(id);
          }
      } else {
          setSelectedRoleId(id);
      }
  };

  // --- EXCEL LOGIC ---
  const handleExportRoles = () => {
      const exportData = roles.map(r => ({
          ID: r.id,
          Name: r.name,
          Description: r.description,
          Permissions: r.permissions.join(', '),
          // Serialize policies to string because Excel can't handle deep nesting naturally
          PoliciesJSON: JSON.stringify(r.policies) 
      }));
      ExcelHelper.exportToExcel(exportData, 'RBAC_Roles_Config');
      showToast('Roles configuration exported.', 'success');
  };

  const handleImportRoles = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(!file) return;
      try {
          const raw = await ExcelHelper.importFromExcel<any>(file);
          const newRoles: Role[] = raw.map(r => ({
              id: r.ID || `ROLE_CUSTOM_${Date.now()}`,
              name: r.Name,
              description: r.Description,
              permissions: r.Permissions ? r.Permissions.split(',').map((p: string) => p.trim()) : [],
              policies: r.PoliciesJSON ? JSON.parse(r.PoliciesJSON) : {},
              isSystemRole: false // Imported roles are custom by default to be safe
          }));
          
          bulkImportRoles(newRoles);
          showToast(`Imported ${newRoles.length} roles.`, 'success');
      } catch (err) {
          console.error(err);
          showToast('Failed to import roles. Check JSON format in Excel.', 'error');
      }
      if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadTemplate = () => {
      const template = [{
          ID: 'ROLE_NEW',
          Name: 'New Custom Role',
          Description: 'Description here',
          Permissions: 'MKT_VIEW, FIN_VIEW',
          PoliciesJSON: '{"mkt_campaigns":{"resourceId":"mkt_campaigns","accessLevel":"READ","scope":"ALL"}}'
      }];
      ExcelHelper.exportToExcel(template, 'Role_Import_Template');
      showToast('Template downloaded.', 'info');
  };

  // If user doesn't even have READ access, block the view (Fail Safe)
  if (!canManageIAM('READ')) {
      return (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Lock size={64} className="mb-4 text-slate-200" />
              <h2 className="text-xl font-bold text-slate-600">Access Restricted</h2>
              <p>You do not have permission to view Security Settings.</p>
          </div>
      );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col animate-fade-in bg-slate-50">
       {/* Header + tabs */}
       <div className="shrink-0 border-b border-slate-200 bg-white">
        <div className="page-container pb-3 pt-4 sm:pb-4 sm:pt-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ShieldCheck className="h-5 w-5" strokeWidth={2} aria-hidden />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight tracking-tight text-slate-900 sm:text-2xl">
                Security & Access Control Center
              </h1>
              <p className="mt-1.5 text-sm leading-normal text-slate-600 sm:text-[15px]">
                Enterprise governance, risk, and compliance (GRC).
              </p>
            </div>
          </div>
        </div>

        <div className="page-container pb-3 pt-0 sm:pb-4">
          <div className="max-w-full min-w-0 overflow-x-scroll-touch rounded-lg bg-slate-100 p-0.5 shadow-inner">
            <div className="inline-flex w-max min-w-full flex-nowrap gap-0.5 sm:w-full sm:min-w-0">
                <button 
                    type="button"
                    onClick={() => setActiveTab('USERS')}
                    className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-md px-3 py-2 text-xs font-bold transition-colors sm:flex-1 sm:justify-center sm:text-sm ${activeTab === 'USERS' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/90' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Users size={16} className="mr-2 shrink-0" aria-hidden /> User Access
                </button>
                <button 
                    type="button"
                    onClick={() => setActiveTab('MATRIX')}
                    className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-md px-3 py-2 text-xs font-bold transition-colors sm:flex-1 sm:justify-center sm:text-sm ${activeTab === 'MATRIX' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/90' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Sliders size={16} className="mr-2 shrink-0" aria-hidden /> Access Policies
                </button>
                <button 
                    type="button"
                    onClick={() => setActiveTab('AUDIT')}
                    className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-md px-3 py-2 text-xs font-bold transition-colors sm:flex-1 sm:justify-center sm:text-sm ${activeTab === 'AUDIT' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/90' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <History size={16} className="mr-2 shrink-0" aria-hidden /> Audit Logs
                </button>
            </div>
          </div>
        </div>

        {activeTab === 'MATRIX' && canManageIAM('FULL') && (
          <div className="page-container flex flex-col gap-2 border-t border-slate-100 pb-4 pt-3 sm:flex-row sm:items-center sm:justify-start sm:gap-3">
            <input type="file" ref={fileInputRef} hidden onChange={handleImportRoles} accept=".xlsx,.xls"/>
            <p className="text-xs font-medium text-slate-500 sm:sr-only">Role data (Excel)</p>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
                  <button type="button" onClick={handleDownloadTemplate} className="touch-target flex items-center justify-center px-3 text-slate-500 hover:bg-slate-50 sm:h-9 sm:min-h-0 sm:min-w-0 border-r border-slate-200" title="Download import template"><FileSpreadsheet size={16}/></button>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="touch-target flex items-center px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 sm:h-9 sm:min-h-0 sm:min-w-0"><Upload size={14} className="mr-2 shrink-0"/> Import</button>
              </div>
              <button type="button" onClick={handleExportRoles} className="touch-target inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 sm:h-9">
                <Download size={16} className="shrink-0" aria-hidden />
                Export roles
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="page-container flex min-h-0 flex-1 flex-col py-4 sm:py-6">
      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-6">
          {activeTab === 'USERS' && (
              <div className="min-h-0 w-full flex-1">
                  <UserAccessManager />
              </div>
          )}

          {activeTab === 'MATRIX' && (
            <>
              {/* Role list: full width on small screens, sidebar on lg */}
              <div className="w-full shrink-0 lg:w-1/4 lg:min-w-[220px]">
                  <RoleManager 
                    roles={roles} 
                    selectedRoleId={selectedRoleId} 
                    onSelectRole={handleRoleSelection} 
                  />
              </div>

              {/* Advanced editor */}
              <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
                  {workingRole ? (
                      <>
                        <div className="flex-1 overflow-hidden">
                            <AdvancedRoleEditor 
                                role={workingRole}
                                onUpdatePolicy={handleLocalPolicyUpdate}
                                isReadOnly={!canEdit}
                            />
                        </div>
                        
                        {/* SAVE BAR - Only visible when changes exist AND user can edit */}
                        {hasUnsavedChanges && canEdit && (
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 animate-fade-in-up z-20">
                                <span className="text-sm font-medium flex items-center">
                                    <AlertCircle size={16} className="text-amber-400 mr-2" />
                                    Unsaved Changes
                                </span>
                                <div className="h-4 w-px bg-slate-600"></div>
                                <button 
                                    onClick={handleDiscardChanges}
                                    className="text-xs font-bold text-slate-300 hover:text-white flex items-center"
                                >
                                    <RotateCcw size={14} className="mr-1" /> Revert
                                </button>
                                <button 
                                    onClick={handleSaveChanges}
                                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-1.5 rounded-full transition-colors flex items-center"
                                >
                                    <Save size={14} className="mr-1" /> Save & Apply
                                </button>
                            </div>
                        )}
                        
                        {/* READ ONLY BANNER */}
                        {!canEdit && (
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-amber-100 text-amber-800 px-6 py-2 rounded-full shadow-lg text-xs font-bold flex items-center z-20">
                                <Lock size={12} className="mr-2" /> Read Only Mode
                            </div>
                        )}
                      </>
                  ) : (
                      <div className="flex items-center justify-center h-full text-slate-400">Loading Role Configuration...</div>
                  )}
              </div>
            </>
          )}

          {activeTab === 'AUDIT' && (
              <div className="flex w-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
                  <div className="border-b border-slate-200 bg-slate-50 p-4">
                      <h3 className="font-bold text-slate-800 flex items-center">
                          <History size={18} className="mr-2 text-slate-500"/> System Audit Trail
                      </h3>
                  </div>
                  <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
                    <table className="w-full min-w-[560px] text-left text-sm">
                        <thead className="bg-slate-50 font-medium text-slate-500">
                            <tr>
                                <th className="p-4">Timestamp</th>
                                <th className="p-4">Actor</th>
                                <th className="p-4">Action</th>
                                <th className="p-4">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {auditLogs.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-400">No logs recorded yet.</td></tr>
                            ) : (
                                auditLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50">
                                        <td className="p-4 font-mono text-slate-500 text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                                        <td className="p-4 font-medium text-slate-800">{log.actor}</td>
                                        <td className="p-4">
                                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">{log.action}</span>
                                        </td>
                                        <td className="p-4 text-slate-600">{log.details}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                  </div>
              </div>
          )}
      </div>
      </div>
    </div>
  );
};

export default AdminSecurity;
