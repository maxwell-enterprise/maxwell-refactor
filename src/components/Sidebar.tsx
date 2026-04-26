
import React from 'react';
import { 
  LayoutDashboard, Users, CalendarDays, Store, Banknote, 
  Target, Mail, Trophy, FileText, CheckSquare, Database, 
  LayoutTemplate, ShieldAlert, BarChart2, School, Percent, CircuitBoard,
  UserCircle, Briefcase, GraduationCap, Settings, LogOut, Sparkles, ShoppingBag,
  MonitorPlay, ScanLine, Grid3X3, Award, Tag, HardDrive
} from 'lucide-react';
import { ViewState, UserRole } from '../types/index';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  isOpen: boolean;
  toggleSidebar: () => void;
  userRole: UserRole;
  isPersonalZone: boolean;
  onToggleZone: (isPersonal: boolean) => void;
}

const WORKSPACE_ROLES = [
  UserRole.SUPER_ADMIN, 
  UserRole.FINANCE, 
  UserRole.OPERATIONS, 
  UserRole.MARKETING, 
  UserRole.SALES, 
  UserRole.FACILITATOR, 
  UserRole.GATE_KEEPER
];

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, isOpen, toggleSidebar, userRole, isPersonalZone, onToggleZone }) => {
  const { logout } = useAuth();

  /** Promoted / internal staff: any role except Member sees Workspace ↔ My Zone. Pure members only see the user sidebar. */
  const showWorkspaceMyZoneToggle = userRole !== UserRole.MEMBER;

  const handleSwitchContext = (targetZone: 'WORKSPACE' | 'MY_ZONE') => {
      onToggleZone(targetZone === 'MY_ZONE');
      onNavigate(ViewState.DASHBOARD); 
  };

  const workspaceMenuGroups = [
    {
      title: null,
      items: [
        { id: ViewState.DASHBOARD, label: 'Cockpit', icon: <LayoutDashboard size={18} />, resourceId: null, roleReq: [UserRole.SUPER_ADMIN, UserRole.FINANCE, UserRole.OPERATIONS, UserRole.MARKETING] }, 
        { id: ViewState.ATTENDANCE_CONSOLE, label: 'Command Center', icon: <MonitorPlay size={18} />, resourceId: null, roleReq: [UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.GATE_KEEPER] },
        { id: ViewState.GATE_SCANNER, label: 'Gate Scanner', icon: <ScanLine size={18} />, resourceId: null, roleReq: [UserRole.GATE_KEEPER, UserRole.SUPER_ADMIN, UserRole.OPERATIONS] },
        { id: ViewState.MY_TASKS, label: 'Action Center', icon: <CheckSquare size={18} />, resourceId: null, roleReq: WORKSPACE_ROLES.filter(r => r !== UserRole.GATE_KEEPER) },
      ]
    },
    {
      title: 'Growth & CRM',
      items: [
        { id: ViewState.CRM, label: 'Member Database', icon: <Users size={18} />, resourceId: 'crm_members', roleReq: [UserRole.SUPER_ADMIN, UserRole.SALES, UserRole.OPERATIONS, UserRole.FINANCE] },
        { id: ViewState.LEADS, label: 'Sales Pipeline', icon: <Target size={18} />, resourceId: 'crm_leads', roleReq: [UserRole.SUPER_ADMIN, UserRole.SALES, UserRole.MARKETING] },
        { id: ViewState.MARKETING, label: 'Campaigns', icon: <Sparkles size={18} />, resourceId: 'mkt_campaigns', roleReq: [UserRole.SUPER_ADMIN, UserRole.MARKETING] },
        { id: ViewState.CMS_ADMIN, label: 'Content Hub', icon: <LayoutTemplate size={18} />, resourceId: 'cms_content', roleReq: [UserRole.SUPER_ADMIN, UserRole.MARKETING] }, 
        { id: ViewState.COMMUNICATION, label: 'Comms & WA', icon: <Mail size={18} />, resourceId: 'sys_communication', roleReq: [UserRole.SUPER_ADMIN, UserRole.MARKETING, UserRole.OPERATIONS] },
        { id: ViewState.GAMIFICATION, label: 'Gamification', icon: <Trophy size={18} />, resourceId: null, roleReq: [UserRole.SUPER_ADMIN, UserRole.MARKETING] }, 
        { id: ViewState.YOUTH_ADMIN, label: 'Youth Impact', icon: <School size={18} />, resourceId: null, roleReq: [UserRole.SUPER_ADMIN, UserRole.MARKETING] }, 
      ]
    },
    {
      title: 'Operations',
      items: [
        { id: ViewState.OPERATIONS, label: 'Ops Center', icon: <CircuitBoard size={18} />, resourceId: 'ops_event_mgmt', roleReq: [UserRole.SUPER_ADMIN, UserRole.OPERATIONS] },
        { id: ViewState.EVENTS_ADMIN, label: 'Event Mgmt', icon: <CalendarDays size={18} />, resourceId: 'ops_event_mgmt', roleReq: [UserRole.SUPER_ADMIN, UserRole.OPERATIONS] },
        { id: ViewState.CERTIFICATION_GRID, label: 'Cert. Progress', icon: <Grid3X3 size={18} />, resourceId: 'ops_event_mgmt', roleReq: [UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.FACILITATOR] },
        { id: ViewState.CERTIFICATION_RULES, label: 'Cert. Rules', icon: <Award size={18} />, resourceId: 'ops_event_mgmt', roleReq: [UserRole.SUPER_ADMIN, UserRole.OPERATIONS] },
        { id: ViewState.TAG_MANAGEMENT, label: 'Tag Master', icon: <Tag size={18} />, resourceId: 'ops_event_mgmt', roleReq: [UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.MARKETING] },
        { id: ViewState.CONTRACTS, label: 'Contracts', icon: <FileText size={18} />, resourceId: 'sys_contracts', roleReq: [UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.SALES, UserRole.FINANCE] },
        { id: ViewState.STORE_ADMIN, label: 'Product', icon: <Store size={18} />, resourceId: 'ops_inventory', roleReq: [UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.MARKETING] },
        { id: ViewState.FINANCE, label: 'Finance', icon: <Banknote size={18} />, resourceId: 'fin_invoices', roleReq: [UserRole.SUPER_ADMIN, UserRole.FINANCE] },
        { id: ViewState.COMMISSION_CONFIG, label: 'Commissions', icon: <Percent size={18} />, resourceId: 'fin_invoices', roleReq: [UserRole.SUPER_ADMIN, UserRole.FINANCE] }, 
      ]
    },
    {
      title: 'System',
      items: [
        { id: ViewState.AUTOMATION_CENTER, label: 'Automations', icon: <CircuitBoard size={18} />, resourceId: 'sys_database', roleReq: [UserRole.SUPER_ADMIN, UserRole.OPERATIONS, UserRole.MARKETING] }, 
        { id: ViewState.SECURITY, label: 'Security', icon: <ShieldAlert size={18} />, resourceId: 'sys_iam', roleReq: [UserRole.SUPER_ADMIN] },
        { id: ViewState.DB_SCHEMA, label: 'Database', icon: <Database size={18} />, resourceId: 'sys_database', roleReq: [UserRole.SUPER_ADMIN] },
        { id: ViewState.AI_USAGE, label: 'AI Usage', icon: <BarChart2 size={18} />, resourceId: null, roleReq: [UserRole.SUPER_ADMIN] },
        { id: ViewState.SYSTEM_MAINTENANCE, label: 'Maintenance', icon: <HardDrive size={18} />, resourceId: null, roleReq: [UserRole.SUPER_ADMIN] }, // NEW
      ]
    }
  ];

  const hasAccess = (allowedRoles: UserRole[]) => {
    if (userRole === UserRole.SUPER_ADMIN) return true;
    if (allowedRoles.includes(userRole)) return true;
    // Entry staff promoted as Guest: same workspace nav slice as Sales where Sales is allowed.
    if (userRole === UserRole.GUEST && allowedRoles.includes(UserRole.SALES)) return true;
    return false;
  };

  const isMemberMode = isPersonalZone || userRole === UserRole.MEMBER;

  return (
    <div className="relative h-full w-0 shrink-0 lg:w-72">
      {/* One flex child for the shell: mobile width 0 so main fills; lg reserves 288px like before. */}
      {isOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <div
        className={[
          'flex flex-col h-full w-72 bg-slate-900 text-white border-r border-slate-800',
          'fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-out',
          'lg:static lg:inset-auto lg:z-auto lg:translate-x-0 lg:transform-none',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="p-4 bg-slate-950/50 shrink-0">
             <div className="flex items-center gap-3 mb-6 px-2">
                <img
                    src="/mxwel.png"
                    alt="Maxwell logo"
                    className="h-8 w-8 rounded-lg object-cover shadow-lg shadow-blue-900/50"
                />
                <div>
                    <span className="font-bold text-sm tracking-wide block">Maxwell Leadership</span>
                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Enterprise</span>
                </div>
             </div>

             {showWorkspaceMyZoneToggle && (
                 <div className="bg-slate-800 p-1 rounded-xl flex shadow-inner border border-slate-700/50 relative overflow-hidden">
                     <div 
                        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-slate-700 rounded-lg shadow-sm transition-all duration-300 ease-out ${isMemberMode ? 'translate-x-[calc(100%+4px)]' : 'translate-x-1'}`}
                     ></div>
                     <button 
                        onClick={() => handleSwitchContext('WORKSPACE')}
                        className={`flex-1 flex items-center justify-center py-2 rounded-lg text-xs font-bold relative z-10 transition-colors ${!isMemberMode ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
                     >
                         <Briefcase size={14} className="mr-2"/> Workspace
                     </button>
                     <button 
                        onClick={() => handleSwitchContext('MY_ZONE')}
                        className={`flex-1 flex items-center justify-center py-2 rounded-lg text-xs font-bold relative z-10 transition-colors ${isMemberMode ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
                     >
                         <UserCircle size={14} className="mr-2"/> My Zone
                     </button>
                 </div>
             )}
        </div>

        <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
            {isMemberMode ? (
                <div className="px-3 space-y-1">
                    <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Personal Growth</div>
                    <button onClick={() => onNavigate(ViewState.DASHBOARD)} className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${currentView === ViewState.DASHBOARD ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                        <LayoutDashboard size={18} className="mr-3" /> Dashboard
                    </button>
                    <button onClick={() => onNavigate(ViewState.EVENT_MARKETPLACE)} className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${currentView === ViewState.EVENT_MARKETPLACE ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                        <CalendarDays size={18} className="mr-3" /> Event Catalogue
                    </button>
                    <button onClick={() => onNavigate(ViewState.WALLET)} className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${currentView === ViewState.WALLET ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                        <Banknote size={18} className="mr-3" /> My Wallet
                    </button>
                    <button onClick={() => onNavigate(ViewState.STORE_CATALOG)} className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${currentView === ViewState.STORE_CATALOG ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                        <ShoppingBag size={18} className="mr-3" /> Store
                    </button>
                    <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-4">Learning</div>
                    <button onClick={() => onNavigate(ViewState.ENABLEMENT)} className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${currentView === ViewState.ENABLEMENT ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                        <GraduationCap size={18} className="mr-3" /> Success Toolkit
                    </button>
                    <button onClick={() => onNavigate(ViewState.AI_COACH)} className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${currentView === ViewState.AI_COACH ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                        <Sparkles size={18} className="mr-3" /> AI Coach
                    </button>
                    <button onClick={() => onNavigate(ViewState.MY_TRIBE)} className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${currentView === ViewState.MY_TRIBE ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                        <Users size={18} className="mr-3" /> My Tribe
                    </button>
                    <div className="my-4 border-t border-slate-800 mx-3"></div>
                    <button onClick={() => onNavigate(ViewState.SETTINGS)} className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${currentView === ViewState.SETTINGS ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                        <Settings size={18} className="mr-3" /> Settings
                    </button>
                </div>
            ) : (
                workspaceMenuGroups.map((group, idx) => (
                  <div key={idx} className="mb-6 px-3">
                    {group.title && (
                      <h4 className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{group.title}</h4>
                    )}
                    <div className="space-y-0.5">
                      {group.items.filter(item => hasAccess(item.roleReq)).map(item => (
                        <button
                          key={item.id}
                          onClick={() => onNavigate(item.id)}
                          className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                            currentView === item.id 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          <span className={`mr-3 ${currentView === item.id ? 'text-white' : 'text-slate-500 group-hover:text-white'}`}>{item.icon}</span>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
            )}
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/30 shrink-0">
            <button 
                onClick={logout}
                className="w-full flex items-center justify-center px-4 py-2 text-xs font-bold text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
            >
                <LogOut size={14} className="mr-2"/> Sign Out
            </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
