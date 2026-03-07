
import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import CommandPalette from '../components/common/CommandPalette'; 
import { ViewState, UserRole } from '../types/index';
import { Menu, Bell, Search, UserCircle, ChevronDown, CheckCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TaskService, UnifiedTask } from '../services/taskService';
import PersonaSwitcherModal from '../components/auth/PersonaSwitcherModal'; // NEW IMPORT

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  isPersonalZone: boolean;
  onToggleZone: (isPersonal: boolean) => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, currentView, onNavigate, isPersonalZone, onToggleZone }) => {
  const { user, userRole, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Replace simple menu state with modal state
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  
  // Command Palette State
  const [isCmdOpen, setIsCmdOpen] = useState(false);
  
  // Notification State
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingTasks, setPendingTasks] = useState<UnifiedTask[]>([]);

  // Hotkey Listener for Cmd+K / Ctrl+K
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
              e.preventDefault();
              setIsCmdOpen(prev => !prev);
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
      // Poll for tasks for notifications
      if (userRole !== UserRole.GUEST) {
          TaskService.getMyTasks(userRole).then(tasks => {
              setPendingTasks(tasks);
          });
      }
  }, [userRole, currentView]); 

  const highPriorityCount = pendingTasks.filter(t => t.priority === 'HIGH').length;

  return (
    <div className="h-screen w-full bg-slate-50 flex overflow-hidden font-sans text-slate-900">
      <Sidebar 
        currentView={currentView} 
        onNavigate={onNavigate} 
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        userRole={userRole}
        isPersonalZone={isPersonalZone}
        onToggleZone={onToggleZone}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* --- MODERN HEADER START --- */}
        <header className="h-[72px] px-6 z-40 sticky top-0 transition-all duration-300 flex items-center justify-between
            bg-white/85 backdrop-blur-xl border-b border-slate-200/80 
            shadow-[0_8px_30px_rgb(0,0,0,0.04)] shrink-0"
        >
          {/* Decorative Pattern Layer */}
          <div 
            className="absolute inset-0 z-0 opacity-40 pointer-events-none" 
            style={{ 
                backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', 
                backgroundSize: '24px 24px' 
            }}
          ></div>
          
          {/* Content Wrapper */}
          <div className="relative z-10 flex items-center justify-between w-full">
              {/* Left: Mobile Toggle & Context Title */}
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                >
                  <Menu size={24} />
                </button>
                
                {/* Mobile Search Trigger */}
                <button 
                  onClick={() => setIsCmdOpen(true)}
                  className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                >
                  <Search size={24} />
                </button>
                
                {/* Breadcrumb / Title area */}
                <div className="hidden md:flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center">
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse ${isPersonalZone ? 'bg-indigo-500' : 'bg-blue-500'}`}></span>
                        {isPersonalZone ? 'Personal Zone' : 'Workspace'}
                    </span>
                    <h2 className="text-sm font-bold text-slate-800 tracking-tight">
                        {currentView === ViewState.DASHBOARD 
                            ? (isPersonalZone ? 'Member Dashboard' : 'Executive Dashboard') 
                            : currentView.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </h2>
                </div>
              </div>

              {/* Center/Right: Actions Area */}
              <div className="flex items-center gap-4 md:gap-6">
                
                {/* Global Command Trigger (Desktop) */}
                <div 
                    onClick={() => setIsCmdOpen(true)}
                    className="hidden lg:flex relative group w-72 cursor-pointer"
                >
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                   </div>
                   <div 
                      className="block w-full pl-10 pr-12 py-2.5 bg-slate-50/50 border border-slate-200/80 rounded-xl text-sm text-slate-500 hover:bg-white hover:border-slate-300 transition-all shadow-sm flex items-center"
                   >
                       Search or type command...
                   </div>
                   <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <kbd className="hidden xl:inline-flex items-center gap-1 px-1.5 py-0.5 border border-slate-200 rounded-md text-[10px] font-medium text-slate-400 bg-slate-100/50">
                        ⌘ K
                      </kbd>
                   </div>
                </div>

                {/* --- NEW PERSONA SWITCHER --- */}
                <div className="hidden md:block">
                    <button 
                        onClick={() => setShowPersonaModal(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-full text-xs font-medium text-slate-600 transition-all hover:border-indigo-300 hover:shadow-md shadow-sm group"
                        title="Switch User Persona"
                    >
                        <RefreshCw size={12} className="text-indigo-500 group-hover:rotate-180 transition-transform duration-500" />
                        <span className="text-slate-400">View as:</span>
                        <span className="font-bold text-slate-800 max-w-[100px] truncate">{user?.fullName || 'Guest'}</span>
                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 uppercase">{userRole.replace('Super ','')}</span>
                    </button>
                </div>
                
                {/* Divider */}
                <div className="hidden md:block w-px h-8 bg-slate-200 mx-1"></div>

                {/* Notification & Profile Group */}
                <div className="flex items-center gap-3">
                    {/* Notification Bell */}
                    <div className="relative">
                        <button 
                            onClick={() => setShowNotifications(!showNotifications)}
                            className={`relative p-2.5 rounded-full transition-all duration-200 ${showNotifications ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
                        >
                            <Bell size={20} />
                            {pendingTasks.length > 0 && (
                                <span className={`absolute top-2 right-2.5 h-2 w-2 rounded-full ring-2 ring-white ${highPriorityCount > 0 ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                            )}
                        </button>

                        {showNotifications && (
                            <div className="absolute top-full right-0 mt-4 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-fade-in-up origin-top-right">
                                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 backdrop-blur-sm">
                                    <h4 className="font-bold text-sm text-slate-800">Notifications</h4>
                                    <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{pendingTasks.length} New</span>
                                </div>
                                <div className="max-h-72 overflow-y-auto custom-scrollbar">
                                    {pendingTasks.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400">
                                            <CheckCircle size={32} className="mx-auto mb-3 text-slate-200"/>
                                            <p className="text-xs">You're all caught up!</p>
                                        </div>
                                    ) : (
                                        pendingTasks.slice(0, 5).map(task => (
                                            <button 
                                                key={task.id}
                                                onClick={() => { onNavigate(ViewState.MY_TASKS); setShowNotifications(false); }}
                                                className="w-full text-left p-4 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors group"
                                            >
                                                <div className="flex justify-between items-start mb-1.5">
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${task.priority === 'HIGH' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                        {task.priority}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 group-hover:text-slate-500">{new Date(task.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-sm font-semibold text-slate-800 truncate mb-0.5">{task.title}</p>
                                                <p className="text-xs text-slate-500 truncate">{task.description}</p>
                                            </button>
                                        ))
                                    )}
                                </div>
                                <div className="p-2 border-t border-slate-100 bg-slate-50">
                                    <button 
                                        onClick={() => { onNavigate(ViewState.MY_TASKS); setShowNotifications(false); }}
                                        className="w-full py-2 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        View Action Center
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Profile */}
                    <div className="flex items-center gap-3 pl-1 cursor-pointer group" onClick={() => onNavigate(ViewState.SETTINGS)}>
                      <div className="text-right hidden md:block">
                          <div className="text-sm font-bold text-slate-800 leading-none group-hover:text-blue-600 transition-colors">{user?.fullName}</div>
                          <div className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wide">Online</div>
                      </div>
                      <div className="h-10 w-10 rounded-full p-0.5 bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md group-hover:shadow-lg transition-all ring-2 ring-white">
                        <div className="h-full w-full rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-white">
                            {user?.avatarUrl ? (
                                <img src={user.avatarUrl} alt={user.fullName} className="h-full w-full object-cover" />
                            ) : (
                                <UserCircle size={24} className="text-slate-400" />
                            )}
                        </div>
                      </div>
                    </div>
                </div>
              </div>
          </div>
        </header>
        {/* --- MODERN HEADER END --- */}

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-0 relative bg-slate-50">
          {children}
        </main>

        {/* Global Command Palette */}
        <CommandPalette 
            isOpen={isCmdOpen} 
            onClose={() => setIsCmdOpen(false)} 
            onNavigate={onNavigate} 
        />
        
        {/* New Persona Switcher Modal */}
        {showPersonaModal && (
            <PersonaSwitcherModal onClose={() => setShowPersonaModal(false)} />
        )}
      </div>
    </div>
  );
};

export default DashboardLayout;
