
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Lock, Bell, Camera, Save, LogOut } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { UserService } from '../../services/userService';

const ProfileSettings: React.FC = () => {
    const { user, logout } = useAuth();
    const { showToast } = useToast();
    
    const [activeTab, setActiveTab] = useState<'PROFILE' | 'SECURITY' | 'NOTIFICATIONS'>('PROFILE');
    const [isLoading, setIsLoading] = useState(false);

    // Profile State
    const [formData, setFormData] = useState({
        fullName: user?.fullName || '',
        email: user?.email || '',
        // These fields are mock for now as they aren't on UserProfile type yet, 
        // but we handle basic fields.
        phone: '081234567890', 
        title: 'Member'
    });

    // Password State
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });

    // Notification State
    const [notifications, setNotifications] = useState({
        emailMarketing: true,
        emailTransactional: true,
        sms: false
    });

    const handleSaveProfile = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            await UserService.updateUserProfile(user.id, {
                fullName: formData.fullName,
                // Email usually requires re-verification, we simulate update here
                email: formData.email
            });
            showToast('Profile updated successfully', 'success');
        } catch (e) {
            showToast('Failed to update profile', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSavePassword = () => {
        if (passwords.new !== passwords.confirm) {
            showToast('New passwords do not match', 'error');
            return;
        }
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            setPasswords({ current: '', new: '', confirm: '' });
            showToast('Password changed successfully (Mock)', 'success');
        }, 800);
    };

    return (
        <div className="p-6 max-w-4xl mx-auto animate-fade-in">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Account Settings</h1>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Navigation */}
                <div className="w-full md:w-64 flex-shrink-0">
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-6 flex flex-col items-center border-b border-slate-100 bg-slate-50">
                            <div className="relative group cursor-pointer">
                                <div className="w-20 h-20 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-md">
                                    {user?.avatarUrl ? (
                                        <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={40} className="w-full h-full p-4 text-slate-400" />
                                    )}
                                </div>
                                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera size={24} className="text-white" />
                                </div>
                            </div>
                            <h3 className="font-bold text-slate-900 mt-3">{formData.fullName || user?.fullName}</h3>
                            <p className="text-xs text-slate-500">{user?.role}</p>
                        </div>
                        
                        <nav className="p-2 space-y-1">
                            <button 
                                onClick={() => setActiveTab('PROFILE')}
                                className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'PROFILE' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <User size={18} className="mr-3"/> Profile
                            </button>
                            <button 
                                onClick={() => setActiveTab('SECURITY')}
                                className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'SECURITY' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <Lock size={18} className="mr-3"/> Security
                            </button>
                            <button 
                                onClick={() => setActiveTab('NOTIFICATIONS')}
                                className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'NOTIFICATIONS' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <Bell size={18} className="mr-3"/> Notifications
                            </button>
                        </nav>
                        
                        <div className="p-4 border-t border-slate-100">
                            <button onClick={logout} className="w-full flex items-center px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                <LogOut size={18} className="mr-3"/> Sign Out
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 md:p-8">
                        
                        {activeTab === 'PROFILE' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Personal Information</h2>
                                    <p className="text-sm text-slate-500">Update your public profile and contact details.</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                                        <input 
                                            type="text" 
                                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Job Title</label>
                                        <input 
                                            type="text" 
                                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.title}
                                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                                        <input 
                                            type="email" 
                                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.email}
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                                        <input 
                                            type="tel" 
                                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="pt-4 flex justify-end">
                                    <button 
                                        onClick={handleSaveProfile}
                                        disabled={isLoading}
                                        className="bg-slate-900 text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors flex items-center disabled:opacity-50"
                                    >
                                        {isLoading ? 'Saving...' : <><Save size={16} className="mr-2"/> Save Changes</>}
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'SECURITY' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Security & Password</h2>
                                    <p className="text-sm text-slate-500">Manage your password and login security.</p>
                                </div>
                                <div className="max-w-md space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Current Password</label>
                                        <input 
                                            type="password" 
                                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={passwords.current}
                                            onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">New Password</label>
                                        <input 
                                            type="password" 
                                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={passwords.new}
                                            onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirm New Password</label>
                                        <input 
                                            type="password" 
                                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={passwords.confirm}
                                            onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="pt-4 flex justify-end">
                                    <button 
                                        onClick={handleSavePassword}
                                        disabled={isLoading || !passwords.current || !passwords.new}
                                        className="bg-slate-900 text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors flex items-center disabled:opacity-50"
                                    >
                                        {isLoading ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'NOTIFICATIONS' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Notification Preferences</h2>
                                    <p className="text-sm text-slate-500">Control what emails and alerts you receive.</p>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-sm">Transactional Emails</h4>
                                            <p className="text-xs text-slate-500">Invoices, tickets, and system alerts.</p>
                                        </div>
                                        <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                                            <input type="checkbox" checked={notifications.emailTransactional} disabled className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer checked:right-0 right-5" />
                                            <label className="toggle-label block overflow-hidden h-5 rounded-full bg-green-300 cursor-pointer"></label>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-sm">Marketing & Newsletters</h4>
                                            <p className="text-xs text-slate-500">Event updates, new courses, and promotions.</p>
                                        </div>
                                        <button 
                                            onClick={() => setNotifications(prev => ({...prev, emailMarketing: !prev.emailMarketing}))}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications.emailMarketing ? 'bg-blue-600' : 'bg-slate-200'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications.emailMarketing ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-sm">SMS Alerts</h4>
                                            <p className="text-xs text-slate-500">Urgent notifications to your phone.</p>
                                        </div>
                                        <button 
                                            onClick={() => setNotifications(prev => ({...prev, sms: !prev.sms}))}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications.sms ? 'bg-blue-600' : 'bg-slate-200'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications.sms ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileSettings;
