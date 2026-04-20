
import React, { useState, useEffect, useCallback } from 'react';
import { UserRole, UserProfile, Member } from '../../types/index';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { UserService } from '../../services/userService';
import { Search, UserCog, Check, XCircle, Mail, Key, UserPlus, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import MemberLookup from '../common/MemberLookup'; // NEW IMPORT
import { workspaceFetch } from '../../lib/workspaceApi';
import { ApiRequestError } from '../../repositories/api/apiClient';
import { useAccountDeletionRealtime } from '../../hooks/useAccountDeletionRealtime';
import { setWorkspaceToken } from '../../lib/workspaceAuthToken';

/** Roles assignable from Security quick-actions. */
const SECURITY_QUICK_ASSIGN_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.FINANCE,
  UserRole.OPERATIONS,
  UserRole.MARKETING,
  UserRole.SALES,
];

function selectRoleOptionsForUser(user: UserProfile): UserRole[] {
  if (
    !SECURITY_QUICK_ASSIGN_ROLES.includes(user.role) &&
    user.role !== UserRole.MEMBER
  ) {
    return [user.role, ...SECURITY_QUICK_ASSIGN_ROLES];
  }
  return [...SECURITY_QUICK_ASSIGN_ROLES];
}

type PendingDeletionRequest = {
  id: string;
  createdAt: string;
  reason: string;
  user: { id: string; email: string; fullName: string; role: string };
};

const UserAccessManager: React.FC = () => {
  const { user: authUser } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletionRequests, setDeletionRequests] = useState<PendingDeletionRequest[]>([]);
  const [deletionLoading, setDeletionLoading] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);

  // Load from Service
  useEffect(() => {
      loadUsers();
  }, []);

  const loadDeletionRequests = useCallback(async () => {
    if (authUser?.role !== UserRole.SUPER_ADMIN) return;
    setDeletionLoading(true);
    try {
      const res = await workspaceFetch('/admin/account-deletion-requests');
      if (!res.ok) {
        setDeletionRequests([]);
        return;
      }
      const data = (await res.json()) as PendingDeletionRequest[];
      setDeletionRequests(Array.isArray(data) ? data : []);
    } catch {
      setDeletionRequests([]);
    } finally {
      setDeletionLoading(false);
    }
  }, [authUser?.role]);

  useEffect(() => {
    void loadDeletionRequests();
  }, [loadDeletionRequests]);

  useAccountDeletionRealtime(
    authUser?.role === UserRole.SUPER_ADMIN,
    () => {
      void loadDeletionRequests();
    },
  );

  const handleApproveDeletion = async (requestId: string) => {
    const ok = window.confirm(
      'Approve this account deletion? The user will be removed from the system and will no longer be able to sign in.',
    );
    if (!ok) return;
    try {
      const res = await workspaceFetch(
        `/admin/account-deletion-requests/${encodeURIComponent(requestId)}/approve`,
        { method: 'POST' },
      );
      if (!res.ok) {
        let msg = 'Could not approve the request.';
        try {
          const data = (await res.json()) as { message?: string | string[] };
          if (typeof data?.message === 'string') msg = data.message;
          else if (Array.isArray(data?.message)) msg = data.message.join(', ');
        } catch {
          /* ignore */
        }
        showToast(msg, 'error');
        return;
      }
      showToast('Account deletion approved and processed.', 'success');
      await loadDeletionRequests();
      await loadUsers();
    } catch {
      showToast('Network error.', 'error');
    }
  };

  const handleRejectDeletion = async () => {
    if (!rejectTargetId) return;
    try {
      const res = await workspaceFetch(
        `/admin/account-deletion-requests/${encodeURIComponent(rejectTargetId)}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reviewNote: rejectNote.trim() || undefined,
          }),
        },
      );
      if (!res.ok) {
        let msg = 'Could not reject the request.';
        try {
          const data = (await res.json()) as { message?: string | string[] };
          if (typeof data?.message === 'string') msg = data.message;
          else if (Array.isArray(data?.message)) msg = data.message.join(', ');
        } catch {
          /* ignore */
        }
        showToast(msg, 'error');
        return;
      }
      showToast('Request declined; the user was notified.', 'success');
      setRejectTargetId(null);
      setRejectNote('');
      await loadDeletionRequests();
    } catch {
      showToast('Network error.', 'error');
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await UserService.getAllUsers({ rethrowApiError: true });
      setUsers(data);
    } catch (e) {
      setUsers([]);
      if (e instanceof ApiRequestError) {
        if (e.status === 403) {
          setLoadError(
            'Access denied. Only workspace staff (non-Member) can load this list.',
          );
        } else {
          setLoadError(e.message);
        }
      } else {
        setLoadError(
          e instanceof Error ? e.message : 'Failed to load users.',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (user: UserProfile, newRole: UserRole) => {
    const email = user.email?.trim().toLowerCase();
    if (!email) {
      showToast('Selected user has no email address.', 'error');
      return;
    }

    try {
      const res = await workspaceFetch('/admin/role-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, targetRole: newRole }),
      });
      if (!res.ok) {
        let msg = `Failed to update role to ${newRole}.`;
        try {
          const data = (await res.json()) as { message?: string | string[] };
          if (typeof data?.message === 'string') msg = data.message;
          else if (Array.isArray(data?.message)) msg = data.message.join(', ');
        } catch {
          /* ignore */
        }
        showToast(msg, 'error');
        return;
      }

      const payload = (await res.json()) as
        | {
            ok?: boolean;
            mode?: 'updated' | 'pending_signup';
            actorRelogRequired?: boolean;
            actorNewRole?: string;
            actorSessionToken?: string;
          }
        | undefined;

      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
      const isSuperAdminHandover =
        newRole === UserRole.SUPER_ADMIN && user.id !== authUser?.id;
      const shouldRelogActor =
        payload?.actorRelogRequired === true || isSuperAdminHandover;
      if (shouldRelogActor) {
        const replacementToken =
          typeof payload?.actorSessionToken === 'string' &&
          payload.actorSessionToken.trim().length > 0
            ? payload.actorSessionToken
            : null;
        if (replacementToken) {
          setWorkspaceToken(replacementToken);
        }
        if (typeof window !== 'undefined') {
          window.location.replace('/dashboard?view=leads');
        }
        return;
      }

      showToast(`User role updated to ${newRole}`, 'success');
    } catch {
      showToast('Network error while updating role.', 'error');
    }
  };

  const handlePromoteMember = async (member: Member) => {
      const email = member.email?.trim().toLowerCase();
      if (!email) {
          showToast('Selected member has no email address.', 'error');
          return;
      }

      // Check duplicate
      if (users.some((u) => u.email?.trim().toLowerCase() === email)) {
        showToast('This member is already an internal user.', 'error');
        return;
      }

      try {
          // External API mode: promote via Nest RBAC endpoint.
          const res = await workspaceFetch('/admin/role-invites', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, targetRole: UserRole.SALES }),
          });
          if (!res.ok) {
              let msg = 'Failed to promote member.';
              try {
                  const data = (await res.json()) as { message?: string | string[] };
                  if (typeof data?.message === 'string') msg = data.message;
                  else if (Array.isArray(data?.message)) msg = data.message.join(', ');
              } catch {
                  /* ignore */
              }
              showToast(msg, 'error');
              return;
          }

          await loadUsers();
          showToast(`${member.name} promoted to staff (Sales).`, 'success');
          setIsPromoteModalOpen(false);
      } catch {
          showToast('Network error while promoting member.', 'error');
      }
  };

  /** API excludes Member; mock mode may merge CRM — drop Member. Super Admin first. */
  const staffDirectory = [...users]
    .filter((u) => u.role !== UserRole.MEMBER)
    .sort((a, b) => {
      if (a.role === UserRole.SUPER_ADMIN && b.role !== UserRole.SUPER_ADMIN) return -1;
      if (b.role === UserRole.SUPER_ADMIN && a.role !== UserRole.SUPER_ADMIN) return 1;
      return a.email.localeCompare(b.email, undefined, { sensitivity: 'base' });
    });

  const filteredUsers = staffDirectory.filter((u) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  const handleRevokeAccess = async (user: UserProfile) => {
    if (user.role === UserRole.MEMBER) return;
    const ok = window.confirm(`Revoke staff access for ${user.fullName}? This user will be changed to MEMBER and removed from Internal Staff list.`);
    if (!ok) return;
    await handleRoleChange(user, UserRole.MEMBER);
  };

  const getRoleColor = (role: UserRole) => {
      switch(role) {
          case UserRole.SUPER_ADMIN: return 'bg-slate-800 text-white border-slate-700';
          case UserRole.FINANCE: return 'bg-emerald-100 text-emerald-800 border-emerald-200';
          case UserRole.MARKETING: return 'bg-purple-100 text-purple-800 border-purple-200';
          case UserRole.OPERATIONS: return 'bg-blue-100 text-blue-800 border-blue-200';
          case UserRole.SALES: return 'bg-amber-100 text-amber-900 border-amber-200';
          case UserRole.GATE_KEEPER: return 'bg-indigo-100 text-indigo-800 border-indigo-200';
          case UserRole.FACILITATOR: return 'bg-teal-100 text-teal-800 border-teal-200';
          case UserRole.GUEST: return 'bg-slate-100 text-slate-500 border-slate-200';
          default: return 'bg-amber-100 text-amber-800 border-amber-200';
      }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full animate-fade-in relative">
        {/* Header & Filter */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50">
            <h3 className="font-bold text-slate-800 flex items-center">
              <UserCog size={18} className="mr-2 text-blue-600" /> Internal Staff &amp; Access
            </h3>
            <div className="flex gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search staff..." 
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button 
                    onClick={() => setIsPromoteModalOpen(true)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm whitespace-nowrap"
                >
                    <UserPlus size={14} className="mr-2" /> Promote Member
                </button>
            </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <Loader2 className="animate-spin text-slate-400" />
                </div>
            ) : loadError ? (
                <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
                    <p className="max-w-md text-sm text-red-600">{loadError}</p>
                    <button
                        type="button"
                        onClick={() => void loadUsers()}
                        className="text-xs font-bold text-blue-600 hover:underline"
                    >
                        Try again
                    </button>
                </div>
            ) : (
                <table className="w-full text-left text-sm">
                    <thead className="bg-white text-slate-500 font-medium border-b border-slate-100 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3">User Profile</th>
                            <th className="px-6 py-3">Assigned Role</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Quick Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500">
                                    No matching staff or empty list.
                                </td>
                            </tr>
                        ) : null}
                        {filteredUsers.map((user) => {
                            const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;
                            const roleSelectOptions = selectRoleOptionsForUser(user);
                            return (
                            <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        <img src={user.avatarUrl} alt={user.fullName} className="w-9 h-9 rounded-full mr-3 shadow-sm border border-slate-200" />
                                        <div>
                                            <div className="font-bold text-slate-900">{user.fullName}</div>
                                            <div className="text-xs text-slate-500 flex items-center mt-0.5">
                                                <Mail size={10} className="mr-1"/> {user.email}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <select 
                                        className={`text-xs font-bold py-1.5 pl-2 pr-8 rounded-lg border appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${getRoleColor(user.role)}`}
                                        value={user.role}
                                        onChange={(e) => handleRoleChange(user, e.target.value as UserRole)}
                                    >
                                        {roleSelectOptions.map((role) => (
                                            <option key={role} value={role} className="bg-white text-slate-700">
                                                {role}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                                        <Check size={10} className="mr-1" /> Active
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                        <button
                                            disabled
                                            aria-disabled="true"
                                            className="p-2 text-slate-300 rounded-lg cursor-not-allowed"
                                            title="Reset Password (disabled)"
                                        >
                                            <Key size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleRevokeAccess(user)}
                                            disabled={isSuperAdmin}
                                            aria-disabled={isSuperAdmin ? 'true' : undefined}
                                            className={`p-2 rounded-lg ${
                                              isSuperAdmin
                                                ? 'text-slate-300 cursor-not-allowed'
                                                : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                            }`}
                                            title={
                                              isSuperAdmin
                                                ? 'Super Admin access cannot be revoked from Quick Actions.'
                                                : 'Revoke staff access (set role to MEMBER)'
                                            }
                                        >
                                            <XCircle size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>

        {authUser?.role === UserRole.SUPER_ADMIN && (
          <div className="border-t border-slate-200 bg-amber-50/50 p-4">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm mb-3">
              <Trash2 size={16} className="text-amber-700" />
              Account deletion requests (Super Admin)
            </h4>
            {deletionLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="animate-spin text-slate-400" />
              </div>
            ) : deletionRequests.length === 0 ? (
              <p className="text-xs text-slate-600">No pending requests.</p>
            ) : (
              <ul className="space-y-3 max-h-72 overflow-y-auto">
                {deletionRequests.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-lg border border-amber-200 bg-white p-3 text-xs shadow-sm"
                  >
                    <div className="flex flex-wrap justify-between gap-2 font-semibold text-slate-900">
                      <span>{r.user.fullName}</span>
                      <span className="text-slate-500 font-normal">{r.user.email}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {new Date(r.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-2 text-slate-700 whitespace-pre-wrap max-h-32 overflow-y-auto border border-slate-100 rounded p-2 bg-slate-50">
                      {r.reason}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setRejectTargetId(r.id);
                          setRejectNote('');
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleApproveDeletion(r.id)}
                        className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700"
                      >
                        Approve &amp; delete account
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {rejectTargetId && (
          <div className="absolute inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-5 space-y-3">
              <div className="flex gap-2 items-start">
                <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                <div>
                  <h3 className="font-bold text-slate-900">Decline this request?</h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Optional note for the user (shown in their notification).
                  </p>
                </div>
              </div>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                placeholder="Decline reason (optional)"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="px-3 py-2 text-sm font-semibold text-slate-600"
                  onClick={() => {
                    setRejectTargetId(null);
                    setRejectNote('');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-3 py-2 text-sm font-bold rounded-lg bg-slate-900 text-white"
                  onClick={() => void handleRejectDeletion()}
                >
                  Send decline
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Promotion Modal - NOW USING UNIFIED LOOKUP */}
        {isPromoteModalOpen && (
            <div className="absolute inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-start justify-center pt-20 animate-fade-in">
                <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-slate-900 flex items-center">
                            <UserPlus size={18} className="mr-2 text-blue-600"/> Promote Member
                        </h3>
                        <button onClick={() => setIsPromoteModalOpen(false)} className="text-slate-400 hover:text-slate-600"><XCircle size={20}/></button>
                    </div>
                    <div className="p-4 sm:p-6 min-h-[17.5rem] sm:min-h-[20rem]">
                        <MemberLookup
                            onSelect={handlePromoteMember}
                            placeholder="Find member by name or email..."
                        />
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default UserAccessManager;
