import React from "react";
import { ViewState, UserRole } from "../../../types/index";
import Dashboard from "../../../components/Dashboard";
import MemberDashboard from "../../../components/MemberDashboard";
import CRM from "../../../components/CRM";
import LeadsDashboard from "../../../components/LeadsDashboard";
import FinancePage from "../../../modules/finance/pages/FinancePage";
import Operations from "../../../components/Operations";
import EventsAdmin from "../../../components/EventsOps";
import Store from "../../../components/Store";
import Marketing from "../../../components/Marketing";
import CommunicationHub from "../../../components/CommunicationHub";
import AdminSecurity from "../../../components/AdminSecurity";
import SchemaViewer from "../../../components/admin/SchemaViewer";
import AutomationQueue from "../../../components/admin/AutomationQueue";
import AIUsageDashboard from "../../../components/admin/AIUsageDashboard";
import GamificationConfig from "../../../components/admin/GamificationConfig";
import MyTasks from "../../../components/MyTasks";
import Wallet from "../../../components/Wallet";
import Storefront from "../../../components/store/Storefront";
import Enablement from "../../../components/Enablement";
import AICoach from "../../../components/AICoach";
import ProfileSettings from "../../../components/settings/ProfileSettings";
import GateScannerView from "../../../components/attendance/GateScannerView";
import MemberAttendanceScanner from "../../../components/attendance/MemberAttendanceScanner";
import ContractManager from "../../../components/operations/ContractManager";
import AttendanceConsole from "../../../components/attendance/AttendanceConsole";
import CertificationGrid from "../../../components/academy/CertificationGrid";
import CertificationConfig from "../../../components/admin/CertificationConfig";
import CommissionConfig from "../../../components/admin/CommissionConfig";
import YouthDashboard from "../../../components/dashboard/YouthDashboard";
import MyTribe from "../../../components/MyTribe";
import CMSAdmin from "../../../components/CMSAdmin";
import AutomationCenter from "../../../components/system/AutomationCenter";
import TagManagement from "../../../components/admin/TagManagement";
import SystemMaintenance from "../../../components/admin/SystemMaintenance";
import EventMarketplace from "../../../components/EventMarketplace";

/**
 * Pure view resolver: maps ViewState to the corresponding component.
 * Extracted from App.tsx for separation of concerns.
 */
export function resolveView(
  currentView: ViewState,
  userRole: UserRole,
  isPersonalZone: boolean,
  onNavigate: (v: ViewState) => void
): React.ReactNode {
  switch (currentView) {
    case ViewState.DASHBOARD:
      return (userRole === UserRole.MEMBER || isPersonalZone)
        ? <MemberDashboard onNavigate={onNavigate} />
        : <Dashboard />;

    case ViewState.CRM: return <CRM />;
    case ViewState.LEADS: return <LeadsDashboard />;
    case ViewState.FINANCE: return <FinancePage />;
    case ViewState.OPERATIONS: return <Operations />;
    case ViewState.EVENTS_ADMIN: return <EventsAdmin />;
    case ViewState.CERTIFICATION_GRID: return <CertificationGrid />;
    case ViewState.CERTIFICATION_RULES: return <CertificationConfig />;
    case ViewState.CONTRACTS: return <ContractManager />;
    case ViewState.STORE_ADMIN: return <Store />;
    case ViewState.MARKETING: return <Marketing />;
    case ViewState.COMMUNICATION: return <CommunicationHub />;
    case ViewState.SECURITY: return <AdminSecurity />;
    case ViewState.DB_SCHEMA: return <SchemaViewer />;
    case ViewState.AUTOMATION_QUEUE: return <AutomationQueue />;
    case ViewState.AI_USAGE: return <AIUsageDashboard />;
    case ViewState.GAMIFICATION: return <GamificationConfig />;
    case ViewState.COMMISSION_CONFIG: return <CommissionConfig />;
    case ViewState.YOUTH_ADMIN: return <YouthDashboard />;
    case ViewState.MY_TRIBE: return <MyTribe />;
    case ViewState.CMS_ADMIN: return <CMSAdmin />;
    case ViewState.AUTOMATION_CENTER: return <AutomationCenter />;
    case ViewState.ATTENDANCE_CONSOLE: return <AttendanceConsole />;
    case ViewState.MY_TASKS: return <MyTasks />;
    case ViewState.WALLET: return <Wallet onNavigate={onNavigate} />;
    case ViewState.STORE_CATALOG: return <Storefront />;
    case ViewState.EVENT_MARKETPLACE: return <EventMarketplace />;
    case ViewState.ENABLEMENT: return <Enablement />;
    case ViewState.AI_COACH: return <AICoach />;
    case ViewState.SETTINGS: return <ProfileSettings />;
    case ViewState.GATE_SCANNER: return <GateScannerView />;
    case ViewState.MEMBER_ATTENDANCE: return <MemberAttendanceScanner />;
    case ViewState.TAG_MANAGEMENT: return <TagManagement />;
    case ViewState.SYSTEM_MAINTENANCE: return <SystemMaintenance />;
    default: return <Dashboard />;
  }
}
