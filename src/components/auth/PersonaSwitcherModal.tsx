
import React, { useMemo, useState } from 'react';
import { UserRole } from '../../types/index';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { workspaceFetch } from '../../lib/workspaceApi';
import { setWorkspaceToken } from '../../lib/workspaceAuthToken';
import { 
    X, CheckCircle2, RefreshCw, ArrowRightCircle
} from 'lucide-react';

interface PersonaSwitcherModalProps {
    onClose: () => void;
}

const PersonaSwitcherModal: React.FC<PersonaSwitcherModalProps> = ({ onClose }) => {
    const { user: currentUser } = useAuth();
    const { showToast } = useToast();
    const [switchingRole, setSwitchingRole] = useState<string | null>(null);

    const personaRoles = useMemo(() => {
        const assignedRoles = Array.isArray(currentUser?.roles) && currentUser.roles.length > 0
            ? currentUser.roles
            : currentUser?.role
                ? [currentUser.role]
                : [];
        return assignedRoles.filter((role) =>
            [
                UserRole.SUPER_ADMIN,
                UserRole.FINANCE,
                UserRole.OPERATIONS,
                UserRole.MARKETING,
                UserRole.SALES,
                UserRole.GATE_KEEPER,
            ].includes(role),
        );
    }, [currentUser]);

    const handleSwitchRole = async (role: UserRole) => {
        if (!currentUser || currentUser.role === role) return;
        try {
            setSwitchingRole(role);
            const res = await workspaceFetch('/me/active-role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role }),
            });
            if (!res.ok) {
                let message = 'Failed to switch role.';
                try {
                    const payload = await res.json() as { message?: string | string[] };
                    if (typeof payload?.message === 'string') message = payload.message;
                    else if (Array.isArray(payload?.message)) message = payload.message.join(', ');
                } catch {
                    /* ignore */
                }
                showToast(message, 'error');
                return;
            }
            const payload = await res.json() as { token?: string };
            if (typeof payload.token !== 'string' || !payload.token.trim()) {
                showToast('Workspace token was not returned.', 'error');
                return;
            }
            setWorkspaceToken(payload.token);
            showToast(`Switched to ${role}`, 'success');
            onClose();
        } catch {
            showToast('Network error while switching role.', 'error');
        } finally {
            setSwitchingRole(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
                <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 flex items-center">
                            <RefreshCw size={18} className="mr-2 text-indigo-600"/> Persona
                        </h2>
                        <p className="mt-1 text-xs text-slate-500">Switch active workspace role for the current account.</p>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 text-slate-400 transition-colors hover:text-slate-900">
                        <X size={20} />
                    </button>
                </div>

                <div className="bg-slate-50/70 p-6">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            {currentUser?.avatarUrl ? (
                                <img
                                    src={currentUser.avatarUrl}
                                    alt={currentUser.fullName}
                                    className="h-12 w-12 rounded-full border border-slate-200 object-cover"
                                />
                            ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-bold text-slate-600">
                                    {currentUser?.fullName?.slice(0, 1) || 'U'}
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-slate-900">{currentUser?.fullName}</p>
                                <p className="truncate text-xs text-slate-500">{currentUser?.email}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5">
                        <div className="mb-3 flex items-center justify-between">
                            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Persona</p>
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                                Role-aware session
                            </span>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            {personaRoles.map((role) => {
                                const isActive = currentUser?.role === role;
                                const isSwitchingThisRole = switchingRole === role;
                                return (
                                    <button
                                        key={role}
                                        type="button"
                                        disabled={isActive || isSwitchingThisRole}
                                        onClick={() => void handleSwitchRole(role)}
                                        className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${
                                            isActive
                                                ? 'border-indigo-200 bg-indigo-50 ring-1 ring-indigo-200'
                                                : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg'
                                        } ${isSwitchingThisRole ? 'cursor-progress' : ''}`}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 to-indigo-500/0 transition-opacity group-hover:from-indigo-500/[0.04] group-hover:to-sky-500/[0.08]" />
                                        <div className="relative flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{role}</p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {isActive ? 'Current active role' : 'Click or hover-target this card to switch role'}
                                                </p>
                                            </div>
                                            <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${
                                                isActive
                                                    ? 'border-indigo-200 bg-indigo-100 text-indigo-700'
                                                    : 'border-slate-200 bg-slate-50 text-slate-600 group-hover:border-indigo-200 group-hover:bg-indigo-50 group-hover:text-indigo-700'
                                            }`}>
                                                {isActive ? (
                                                    <>
                                                        <CheckCircle2 size={10} className="mr-1" />
                                                        Active
                                                    </>
                                                ) : isSwitchingThisRole ? (
                                                    <>
                                                        <RefreshCw size={10} className="mr-1 animate-spin" />
                                                        Switching
                                                    </>
                                                ) : (
                                                    <>
                                                        <ArrowRightCircle size={10} className="mr-1" />
                                                        Switch
                                                    </>
                                                )}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PersonaSwitcherModal;
