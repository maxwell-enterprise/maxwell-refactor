
import React, { useState, useEffect } from 'react';
import { UserRole, UserProfile, Member } from '../../types/index';
import { useToast } from '../../context/ToastContext';
import { UserService } from '../../services/userService';
import { Search, UserCog, Check, XCircle, Mail, Key, UserPlus, Loader2 } from 'lucide-react';
import MemberLookup from '../common/MemberLookup'; // NEW IMPORT

const UserAccessManager: React.FC = () => {
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);

  // Load from Service
  useEffect(() => {
      loadUsers();
  }, []);

  const loadUsers = async () => {
      setLoading(true);
      const data = await UserService.getAllUsers();
      setUsers(data);
      setLoading(false);
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    await UserService.updateUserRole(userId, newRole);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    showToast(`User role updated to ${newRole}`, 'success');
  };

  const handlePromoteMember = async (member: Member) => {
      // Check duplicate
      if (users.some(u => u.email === member.email)) {
          showToast('This member is already an internal user.', 'error');
          return;
      }

      const newStaff: UserProfile = {
          id: member.id, 
          email: member.email || `user.${member.id}@maxwell.com`,
          fullName: member.name,
          role: UserRole.GUEST,
          avatarUrl: `https://ui-avatars.com/api/?name=${member.name.replace(' ', '+')}&background=random`,
          provider: 'email'
      };
      
      await UserService.addUser(newStaff);
      await loadUsers(); 
      
      showToast(`${member.name} promoted to Staff (Guest Role)`, 'success');
      setIsPromoteModalOpen(false);
  };

  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (role: UserRole) => {
      switch(role) {
          case UserRole.SUPER_ADMIN: return 'bg-slate-800 text-white border-slate-700';
          case UserRole.FINANCE: return 'bg-emerald-100 text-emerald-800 border-emerald-200';
          case UserRole.MARKETING: return 'bg-purple-100 text-purple-800 border-purple-200';
          case UserRole.OPERATIONS: return 'bg-blue-100 text-blue-800 border-blue-200';
          case UserRole.GUEST: return 'bg-slate-100 text-slate-500 border-slate-200';
          default: return 'bg-amber-100 text-amber-800 border-amber-200';
      }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full animate-fade-in relative">
        {/* Header & Filter */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50">
            <h3 className="font-bold text-slate-800 flex items-center">
                <UserCog size={18} className="mr-2 text-blue-600"/> Internal Staff & Access
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
                        {filteredUsers.map(user => (
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
                                        onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                                    >
                                        {Object.values(UserRole).map(role => (
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
                                        <button className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg" title="Reset Password">
                                            <Key size={16} />
                                        </button>
                                        <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Revoke Access">
                                            <XCircle size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
        
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
                    <div className="p-6">
                        <p className="text-sm text-slate-500 mb-4">
                            Search for an existing member in the CRM to grant them internal system access.
                        </p>
                        
                        <MemberLookup 
                            onSelect={handlePromoteMember}
                            placeholder="Find member by name or email..."
                        />
                        
                        <div className="mt-4 bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                            <strong>Note:</strong> Promoting a member creates a staff account linked to their profile. They will start with the <strong>Guest</strong> role.
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default UserAccessManager;
