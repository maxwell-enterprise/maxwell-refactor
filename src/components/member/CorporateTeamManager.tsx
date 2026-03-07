
import React, { useState, useEffect } from 'react';
import { Users, Mail, Trash2, Plus, RefreshCw, AlertCircle, CheckCircle, Crown } from 'lucide-react';
import { EntitlementService } from '../../services/entitlementService';
import { CorporateTeamMember } from '../../types/access';
import { useToast } from '../../context/ToastContext';

const CorporateTeamManager: React.FC<{ orgId: string }> = ({ orgId }) => {
  const { showToast } = useToast();
  const [members, setMembers] = useState<CorporateTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  
  // Mock Limits
  const TOTAL_SEATS = 10;
  const seatsUsed = members.length;

  useEffect(() => {
    loadTeam();
  }, [orgId]);

  const loadTeam = async () => {
    setLoading(true);
    const data = await EntitlementService.getTeamMembers(orgId);
    setMembers(data);
    setLoading(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || seatsUsed >= TOTAL_SEATS) return;

    try {
        await EntitlementService.inviteTeamMember(orgId, inviteEmail);
        showToast('Invitation sent successfully.', 'success');
        setInviteEmail('');
        loadTeam();
    } catch (error) {
        showToast('Failed to invite member.', 'error');
    }
  };

  const handleRevoke = async (id: string) => {
      if (!window.confirm('Are you sure you want to remove this member?')) return;
      
      try {
          await EntitlementService.revokeTeamMember(id);
          showToast('Member removed from organization.', 'success');
          loadTeam();
      } catch (error) {
          showToast('Failed to remove member.', 'error');
      }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-50 to-white">
            <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center">
                    <Crown size={20} className="text-amber-500 mr-2" /> 
                    Team Management
                </h3>
                <p className="text-sm text-slate-500">Manage access for your organization's seats.</p>
            </div>
            <div className="flex items-center gap-3">
                <div className="text-right">
                    <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Seat Utilization</span>
                    <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                                className={`h-full ${seatsUsed >= TOTAL_SEATS ? 'bg-red-500' : 'bg-blue-600'}`} 
                                style={{ width: `${(seatsUsed / TOTAL_SEATS) * 100}%` }}
                            ></div>
                        </div>
                        <span className="text-sm font-bold text-slate-900">{seatsUsed}/{TOTAL_SEATS}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Invite Area */}
        <div className="p-6 bg-slate-50 border-b border-slate-100">
            <form onSubmit={handleInvite} className="flex gap-3">
                <div className="flex-grow relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="email" 
                        placeholder="colleague@company.com" 
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        disabled={seatsUsed >= TOTAL_SEATS}
                    />
                </div>
                <button 
                    type="submit" 
                    disabled={seatsUsed >= TOTAL_SEATS || !inviteEmail}
                    className="bg-slate-900 text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                    <Plus size={16} className="mr-2" /> Invite
                </button>
            </form>
            {seatsUsed >= TOTAL_SEATS && (
                <p className="text-xs text-red-500 mt-2 flex items-center">
                    <AlertCircle size={12} className="mr-1" /> Seat limit reached. Upgrade plan to add more.
                </p>
            )}
        </div>

        {/* Member List */}
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-white text-slate-500 font-medium border-b border-slate-100">
                    <tr>
                        <th className="px-6 py-4">User</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Last Active</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {loading ? (
                        <tr><td colSpan={4} className="p-8 text-center text-slate-400">Loading team data...</td></tr>
                    ) : members.length === 0 ? (
                        <tr><td colSpan={4} className="p-8 text-center text-slate-400">No team members yet. Invite someone above.</td></tr>
                    ) : (
                        members.map(member => (
                            <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 mr-3">
                                            {member.name.substring(0,2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-900">{member.name}</div>
                                            <div className="text-xs text-slate-500">{member.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold 
                                        ${member.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 
                                          member.status === 'INVITED' ? 'bg-amber-100 text-amber-700' : 
                                          'bg-red-100 text-red-700'}`}>
                                        {member.status === 'ACTIVE' && <CheckCircle size={10} className="mr-1" />}
                                        {member.status === 'INVITED' && <RefreshCw size={10} className="mr-1" />}
                                        {member.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                                    {member.lastActive || 'Never'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button 
                                        onClick={() => handleRevoke(member.id)}
                                        className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Revoke Seat"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default CorporateTeamManager;
