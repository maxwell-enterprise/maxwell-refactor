"use client";

import React from "react";
import dynamic from "next/dynamic";
import { ViewState, UserRole } from "../../../types/index";

/** Code-split each dashboard feature; no visible loading shell (keeps existing UI). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic() erases prop types; views keep their real contracts.
const dynamicView = (importer: () => Promise<{ default: React.ComponentType<any> }>) =>
  dynamic(importer, { loading: () => null, ssr: false });

const Dashboard = dynamicView(() => import("../../../components/Dashboard"));
const MemberDashboard = dynamicView(() => import("../../../components/MemberDashboard"));
const CRM = dynamicView(() => import("../../../components/CRM"));
const LeadsDashboard = dynamicView(() => import("../../../components/LeadsDashboard"));
const FinancePage = dynamicView(() => import("../../../modules/finance/pages/FinancePage"));
const Operations = dynamicView(() => import("../../../components/Operations"));
const EventsAdmin = dynamicView(() => import("../../../components/EventsOps"));
const Store = dynamicView(() => import("../../../components/Store"));
const Marketing = dynamicView(() => import("../../../components/Marketing"));
const CommunicationHub = dynamicView(() => import("../../../components/CommunicationHub"));
const AdminSecurity = dynamicView(() => import("../../../components/AdminSecurity"));
const SchemaViewer = dynamicView(() => import("../../../components/admin/SchemaViewer"));
const AutomationQueue = dynamicView(() => import("../../../components/admin/AutomationQueue"));
const AIUsageDashboard = dynamicView(() => import("../../../components/admin/AIUsageDashboard"));
const GamificationConfig = dynamicView(() => import("../../../components/admin/GamificationConfig"));
const MyTasks = dynamicView(() => import("../../../components/MyTasks"));
const Wallet = dynamicView(() => import("../../../components/Wallet"));
const Storefront = dynamicView(() => import("../../../components/store/Storefront"));
const Enablement = dynamicView(() => import("../../../components/Enablement"));
const AICoach = dynamicView(() => import("../../../components/AICoach"));
const ProfileSettings = dynamicView(() => import("../../../components/settings/ProfileSettings"));
const GateScannerView = dynamicView(() => import("../../../components/attendance/GateScannerView"));
const MemberAttendanceScanner = dynamicView(
  () => import("../../../components/attendance/MemberAttendanceScanner"),
);
const ContractManager = dynamicView(() => import("../../../components/operations/ContractManager"));
const AttendanceConsole = dynamicView(() => import("../../../components/attendance/AttendanceConsole"));
const CertificationGrid = dynamicView(() => import("../../../components/academy/CertificationGrid"));
const CertificationConfig = dynamicView(() => import("../../../components/admin/CertificationConfig"));
const CommissionConfig = dynamicView(() => import("../../../components/admin/CommissionConfig"));
const YouthDashboard = dynamicView(() => import("../../../components/dashboard/YouthDashboard"));
const MyTribe = dynamicView(() => import("../../../components/MyTribe"));
const CMSAdmin = dynamicView(() => import("../../../components/CMSAdmin"));
const AutomationCenter = dynamicView(() => import("../../../components/system/AutomationCenter"));
const TagManagement = dynamicView(() => import("../../../components/admin/TagManagement"));
const SystemMaintenance = dynamicView(() => import("../../../components/admin/SystemMaintenance"));
const EventMarketplace = dynamicView(() => import("../../../components/EventMarketplace"));

/**
 * Pure view resolver: maps ViewState to the corresponding component.
 * Views are lazy-loaded to reduce initial JS and smooth view switches.
 */
export function resolveView(
  currentView: ViewState,
  userRole: UserRole,
  isPersonalZone: boolean,
  onNavigate: (v: ViewState) => void,
): React.ReactNode {
  switch (currentView) {
    case ViewState.DASHBOARD:
      return userRole === UserRole.MEMBER || isPersonalZone ? (
        <MemberDashboard onNavigate={onNavigate} />
      ) : (
        <Dashboard />
      );

    case ViewState.CRM:
      return <CRM />;
    case ViewState.LEADS:
      return <LeadsDashboard />;
    case ViewState.FINANCE:
      return <FinancePage />;
    case ViewState.OPERATIONS:
      return <Operations />;
    case ViewState.EVENTS_ADMIN:
      return <EventsAdmin />;
    case ViewState.CERTIFICATION_GRID:
      return <CertificationGrid />;
    case ViewState.CERTIFICATION_RULES:
      return <CertificationConfig />;
    case ViewState.CONTRACTS:
      return <ContractManager />;
    case ViewState.STORE_ADMIN:
      return <Store />;
    case ViewState.MARKETING:
      return <Marketing />;
    case ViewState.COMMUNICATION:
      return <CommunicationHub />;
    case ViewState.SECURITY:
      return <AdminSecurity />;
    case ViewState.DB_SCHEMA:
      return <SchemaViewer />;
    case ViewState.AUTOMATION_QUEUE:
      return <AutomationQueue />;
    case ViewState.AI_USAGE:
      return <AIUsageDashboard />;
    case ViewState.GAMIFICATION:
      return <GamificationConfig />;
    case ViewState.COMMISSION_CONFIG:
      return <CommissionConfig />;
    case ViewState.YOUTH_ADMIN:
      return <YouthDashboard />;
    case ViewState.MY_TRIBE:
      return <MyTribe />;
    case ViewState.CMS_ADMIN:
      return <CMSAdmin />;
    case ViewState.AUTOMATION_CENTER:
      return <AutomationCenter />;
    case ViewState.ATTENDANCE_CONSOLE:
      return <AttendanceConsole />;
    case ViewState.MY_TASKS:
      return <MyTasks />;
    case ViewState.WALLET:
      return <Wallet onNavigate={onNavigate} />;
    case ViewState.STORE_CATALOG:
      return <Storefront />;
    case ViewState.EVENT_MARKETPLACE:
      return <EventMarketplace />;
    case ViewState.ENABLEMENT:
      return <Enablement />;
    case ViewState.AI_COACH:
      return <AICoach />;
    case ViewState.SETTINGS:
      return <ProfileSettings />;
    case ViewState.GATE_SCANNER:
      return <GateScannerView />;
    case ViewState.MEMBER_ATTENDANCE:
      return <MemberAttendanceScanner />;
    case ViewState.TAG_MANAGEMENT:
      return <TagManagement />;
    case ViewState.SYSTEM_MAINTENANCE:
      return <SystemMaintenance />;
    default:
      return <Dashboard />;
  }
}
