import { ViewState } from '../types/index';

export type CustomViewFeature = {
  id: string;
  view: ViewState;
  label: string;
  resourceId: string | null;
};

export const ALWAYS_ON_CUSTOM_VIEWS: ReadonlySet<ViewState> = new Set([
  ViewState.DASHBOARD,
]);

export function toViewFeatureId(view: ViewState): string {
  return `view_${String(view).toLowerCase()}`;
}

export const CUSTOM_VIEW_FEATURES: readonly CustomViewFeature[] = [
  { id: toViewFeatureId(ViewState.DASHBOARD), view: ViewState.DASHBOARD, label: 'Cockpit', resourceId: null },
  { id: toViewFeatureId(ViewState.ATTENDANCE_CONSOLE), view: ViewState.ATTENDANCE_CONSOLE, label: 'Command Center', resourceId: null },
  { id: toViewFeatureId(ViewState.GATE_SCANNER), view: ViewState.GATE_SCANNER, label: 'Gate Scanner', resourceId: null },
  { id: toViewFeatureId(ViewState.MY_TASKS), view: ViewState.MY_TASKS, label: 'Action Center', resourceId: null },
  { id: toViewFeatureId(ViewState.CRM), view: ViewState.CRM, label: 'Member Database', resourceId: 'crm_members' },
  { id: toViewFeatureId(ViewState.LEADS), view: ViewState.LEADS, label: 'Sales Pipeline', resourceId: 'crm_leads' },
  { id: toViewFeatureId(ViewState.PAID_CONVERSIONS), view: ViewState.PAID_CONVERSIONS, label: 'Paid Conversions', resourceId: 'mkt_paid_conversions' },
  { id: toViewFeatureId(ViewState.MARKETING), view: ViewState.MARKETING, label: 'Campaigns', resourceId: 'mkt_campaigns' },
  { id: toViewFeatureId(ViewState.CMS_ADMIN), view: ViewState.CMS_ADMIN, label: 'Content Hub', resourceId: 'cms_content' },
  { id: toViewFeatureId(ViewState.COMMUNICATION), view: ViewState.COMMUNICATION, label: 'Comms & WA', resourceId: 'sys_communication' },
  { id: toViewFeatureId(ViewState.GAMIFICATION), view: ViewState.GAMIFICATION, label: 'Gamification', resourceId: null },
  { id: toViewFeatureId(ViewState.YOUTH_ADMIN), view: ViewState.YOUTH_ADMIN, label: 'Youth Impact', resourceId: null },
  { id: toViewFeatureId(ViewState.OPERATIONS), view: ViewState.OPERATIONS, label: 'Ops Center', resourceId: 'ops_event_mgmt' },
  { id: toViewFeatureId(ViewState.EVENTS_ADMIN), view: ViewState.EVENTS_ADMIN, label: 'Event Mgmt', resourceId: 'ops_event_mgmt' },
  { id: toViewFeatureId(ViewState.FORMS_ADMIN), view: ViewState.FORMS_ADMIN, label: 'Forms & Quizzes', resourceId: 'ops_event_mgmt' },
  { id: toViewFeatureId(ViewState.CERTIFICATION_GRID), view: ViewState.CERTIFICATION_GRID, label: 'Cert. Progress', resourceId: 'ops_event_mgmt' },
  { id: toViewFeatureId(ViewState.CERTIFICATION_RULES), view: ViewState.CERTIFICATION_RULES, label: 'Cert. Rules', resourceId: 'ops_event_mgmt' },
  { id: toViewFeatureId(ViewState.TAG_MANAGEMENT), view: ViewState.TAG_MANAGEMENT, label: 'Tag Master', resourceId: 'ops_event_mgmt' },
  { id: toViewFeatureId(ViewState.CONTRACTS), view: ViewState.CONTRACTS, label: 'Contracts', resourceId: 'sys_contracts' },
  { id: toViewFeatureId(ViewState.STORE_ADMIN), view: ViewState.STORE_ADMIN, label: 'Product', resourceId: 'ops_inventory' },
  { id: toViewFeatureId(ViewState.FINANCE), view: ViewState.FINANCE, label: 'Finance', resourceId: 'fin_invoices' },
  { id: toViewFeatureId(ViewState.COMMISSION_CONFIG), view: ViewState.COMMISSION_CONFIG, label: 'Commissions', resourceId: 'fin_invoices' },
  { id: toViewFeatureId(ViewState.AUTOMATION_CENTER), view: ViewState.AUTOMATION_CENTER, label: 'Automations', resourceId: 'sys_database' },
  { id: toViewFeatureId(ViewState.SECURITY), view: ViewState.SECURITY, label: 'Security', resourceId: 'sys_iam' },
  { id: toViewFeatureId(ViewState.DB_SCHEMA), view: ViewState.DB_SCHEMA, label: 'Database', resourceId: 'sys_database' },
  { id: toViewFeatureId(ViewState.AI_USAGE), view: ViewState.AI_USAGE, label: 'AI Usage', resourceId: 'sys_ai_usage' },
  { id: toViewFeatureId(ViewState.SYSTEM_MAINTENANCE), view: ViewState.SYSTEM_MAINTENANCE, label: 'Maintenance', resourceId: 'sys_maintenance' },
];

export const CUSTOM_VIEW_FEATURE_BY_VIEW: ReadonlyMap<ViewState, CustomViewFeature> =
  new Map(CUSTOM_VIEW_FEATURES.map((feature) => [feature.view, feature]));

/** Custom roles store view ids (`view_cms_admin`); IAM resources use slugs (`cms_content`). */
export function customRoleGrantsResource(
  allowedFeatures: readonly string[],
  resourceId: string,
): boolean {
  if (allowedFeatures.includes(resourceId)) {
    return true;
  }
  return CUSTOM_VIEW_FEATURES.some(
    (feature) =>
      feature.resourceId === resourceId &&
      allowedFeatures.includes(feature.id),
  );
}
