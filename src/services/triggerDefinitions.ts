import { TRIGGER_CATALOG } from '../constants/triggerCatalog';
import type { TriggerDefinition, TriggerCategory } from '../types/automation';
import { isSystemApiMode, systemApi } from '../lib/systemApi';
import type { AutomationTriggerApiRow } from '../lib/systemApi';

const EMAIL_WELCOME_FALLBACK: TriggerDefinition = {
  id: 'EMAIL_WELCOME_SENT',
  label: 'Welcome Email Sent',
  description: 'Triggered when onboarding email is dispatched.',
  category: 'SYSTEM',
  iconName: 'Mail',
  variables: [{ key: 'member_name', label: 'Recipient', example: 'New User' }],
};

function staticTriggers(): TriggerDefinition[] {
  return [...TRIGGER_CATALOG, EMAIL_WELCOME_FALLBACK];
}

function isTriggerCategory(v: string): v is TriggerCategory {
  return (
    v === 'FINANCE' ||
    v === 'CRM' ||
    v === 'EVENT' ||
    v === 'SYSTEM' ||
    v === 'LOGISTICS'
  );
}

function mapApiToDefinition(row: AutomationTriggerApiRow): TriggerDefinition {
  const category = isTriggerCategory(row.category) ? row.category : 'SYSTEM';
  const vars = Array.isArray(row.variables) ? row.variables : [];
  return {
    id: row.id,
    label: row.label,
    description: row.description,
    category,
    iconName: row.iconName || 'Zap',
    variables: vars.map((v) => ({
      key: v.key,
      label: v.label,
      example: v.example,
    })),
  };
}

/**
 * Loads automation trigger definitions for admin UI (Select Trigger).
 * - **API mode** (`DOMAINS.SYSTEM === 'API'`): `GET /fe/system/automation-triggers`
 *   → Postgres table `automation_trigger_definitions` (seeded on Nest startup if empty).
 * - **Otherwise / on error**: in-app `TRIGGER_CATALOG` + welcome email fallback.
 */
export async function loadTriggerDefinitions(): Promise<TriggerDefinition[]> {
  if (!isSystemApiMode()) {
    return staticTriggers();
  }
  try {
    const rows = await systemApi.getAutomationTriggers();
    if (!rows.length) return staticTriggers();
    return rows.map(mapApiToDefinition);
  } catch {
    return staticTriggers();
  }
}
