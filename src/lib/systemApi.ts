import type { AutomationQueueItem } from '../types/automation';
import type { AIUsageLog } from '../types/index';
import type { Role } from '../types/security';
import type { SecurityAuditLog } from '../types/security';
import { APP_CONFIG } from './config';

const base = () => APP_CONFIG.API_BASE_URL.replace(/\/$/, '');

async function requestJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${base()}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`System API ${res.status} ${url}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

async function requestOk(path: string, init?: RequestInit): Promise<void> {
  const url = `${base()}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`System API ${res.status} ${url}: ${text}`);
  }
}

export type BackgroundJobRow = {
  id: string;
  type: string;
  payload: unknown;
  status: string;
  timestamp: string;
};

export type SchemaOptimizationRow = {
  id: string;
  version: number;
  timestamp: string;
  summary: string;
  result: unknown;
};

export type DatabaseTableDefinitionRow = {
  tableName: string;
  rowCount: number;
  columns: Array<{
    name: string;
    type: string;
    isPk: boolean;
    isFk: boolean;
    fkTarget?: string;
    isMandatory: boolean;
  }>;
};

/** Nest `automation_trigger_definitions` — maps to `TriggerDefinition` on the client. */
export type AutomationTriggerApiRow = {
  id: string;
  label: string;
  description: string;
  category: string;
  iconName: string;
  variables: Array<{ key: string; label: string; example: string }>;
};

/** Nest `/fe/system/*` — use when `DOMAINS.SYSTEM === 'API'`. */
export const systemApi = {
  getSecurityLogs: () =>
    requestJson<SecurityAuditLog[]>('/system/security/logs'),

  postSecurityLog: (body: { actor: string; action: string; details?: string }) =>
    requestJson<SecurityAuditLog>('/system/security/logs', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getSecurityRoles: () => requestJson<Role[]>('/system/security/roles'),

  putSecurityRole: (id: string, body: Role) =>
    requestJson<Role>(`/system/security/roles/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  getAutomationQueue: () =>
    requestJson<AutomationQueueItem[]>('/system/automations/queue'),

  putAutomationQueueItem: (id: string, body: Partial<AutomationQueueItem>) =>
    requestOk(`/system/automations/queue/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  getBackgroundJobs: () =>
    requestJson<BackgroundJobRow[]>('/system/automations/background-jobs'),

  getAutomationTriggers: () =>
    requestJson<AutomationTriggerApiRow[]>('/system/automation-triggers'),

  postBackgroundJob: (body: {
    id?: string;
    type: string;
    payload?: unknown;
    status?: string;
  }) => requestJson<BackgroundJobRow>('/system/automations/background-jobs', {
    method: 'POST',
    body: JSON.stringify(body),
  }),

  getAiUsageLogs: () => requestJson<AIUsageLog[]>('/system/ai-usage/logs'),

  postAiUsageLog: (body: Record<string, unknown>) =>
    requestJson<AIUsageLog>('/system/ai-usage/logs', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getSchemaOptimizations: () =>
    requestJson<SchemaOptimizationRow[]>(
      '/system/database/schema-optimizations',
    ),

  postSchemaOptimization: (body: Record<string, unknown>) =>
    requestJson<SchemaOptimizationRow>(
      '/system/database/schema-optimizations',
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    ),

  getPublicTablesMeta: () =>
    requestJson<{ name: string; rowEstimate: number }[]>(
      '/system/database/tables',
    ),

  getDatabaseTableDefinitions: () =>
    requestJson<DatabaseTableDefinitionRow[]>(
      '/system/database/table-definitions',
    ),

  getDatabaseTableRows: (tableName: string) =>
    requestJson<Record<string, unknown>[]>(
      `/system/database/tables/${encodeURIComponent(tableName)}/rows`,
    ),

  getPgActivity: () =>
    requestJson<{
      items: Array<{
        pid: number;
        usename: string | null;
        applicationName: string | null;
        clientAddr: string | null;
        state: string | null;
        waitEventType: string | null;
        secondsRunning: number | null;
        querySnippet: string;
      }>;
      note?: string;
    }>('/system/database/activity'),

  getMaintenanceStatus: () =>
    requestJson<{
      database: { status: string; latencyMs?: number; message?: string };
      counts: {
        securityLogs: number;
        automationQueue: number;
        backgroundJobs: number;
        aiUsageLogs: number;
      };
    }>('/system/maintenance/status'),
};

export function isSystemApiMode(): boolean {
  return APP_CONFIG.DOMAINS.SYSTEM === 'API';
}
