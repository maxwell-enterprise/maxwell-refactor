
import { Role, Permission, SodRule, SecurityAuditLog } from '../types/security';
import { SOD_RULES, PERMISSIONS, DEFAULT_ROLES } from '../constants/securityDefs';
import { APP_CONFIG } from '../lib/config';
import { isSystemApiMode, systemApi } from '../lib/systemApi';
import { DevDatabase } from '../utils/devDatabase';
import { supabase } from '../lib/supabaseClient';
import { BROWSE_DATA_TEST_SEED } from '../seeds/browse_data_test';

export const PermissionService = {
  
  detectSodViolations: (permissionIds: string[]): string[] => {
    const violations: string[] = [];
    SOD_RULES.forEach(rule => {
      const hasConflict = rule.conflictingPermissions.every(p => permissionIds.includes(p));
      if (hasConflict) violations.push(rule.id);
    });
    return violations;
  },

  getSodRules: (ruleIds: string[]): SodRule[] => {
    return SOD_RULES.filter(r => ruleIds.includes(r.id));
  },

  getPermissionsGrouped: () => {
    const grouped: Record<string, Permission[]> = {};
    PERMISSIONS.forEach(p => {
      if (!grouped[p.category]) grouped[p.category] = [];
      grouped[p.category].push(p);
    });
    return grouped;
  },

  logEvent: async (actor: string, action: string, details: string) => {
      if (isSystemApiMode()) {
        return systemApi.postSecurityLog({ actor, action, details });
      }

      const log: SecurityAuditLog = {
          id: `LOG-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor,
          action,
          details
      };
      
      if (APP_CONFIG.USE_MOCK) {
          await DevDatabase.add('system_security_logs', log);
          return log;
      }

      if (supabase) {
          await supabase.from('system_security_logs').insert(log);
      }
      return log;
  },

  getLogs: async (): Promise<SecurityAuditLog[]> => {
      if (isSystemApiMode()) {
          return systemApi.getSecurityLogs();
      }
      if (APP_CONFIG.USE_MOCK) {
          try {
              // Fallback to BROWSE_DATA_TEST_SEED if empty to ensure Browse Data tab has content
              if(await DevDatabase.isEmpty('system_security_logs')) {
                  await DevDatabase.bulkAdd('system_security_logs', BROWSE_DATA_TEST_SEED);
                  return BROWSE_DATA_TEST_SEED;
              }
              return await DevDatabase.getAll<SecurityAuditLog>('system_security_logs');
          } catch(e) { return BROWSE_DATA_TEST_SEED; }
      }
      if (!supabase) return [];
      const { data } = await supabase.from('system_security_logs').select('*').order('timestamp', { ascending: false });
      return data || [];
  },

  // --- ROLE PERSISTENCE ---
  getRoles: async (): Promise<Role[]> => {
      if (isSystemApiMode()) {
          return systemApi.getSecurityRoles();
      }
      if (APP_CONFIG.USE_MOCK) {
          try {
              if (await DevDatabase.isEmpty('auth_roles')) {
                  await DevDatabase.bulkAdd('auth_roles', DEFAULT_ROLES);
                  return DEFAULT_ROLES;
              }
              return await DevDatabase.getAll<Role>('auth_roles');
          } catch(e) { return DEFAULT_ROLES; }
      }
      
      if (!supabase) return DEFAULT_ROLES;
      const { data } = await supabase.from('auth_roles').select('*');
      return data || DEFAULT_ROLES;
  },

  saveRole: async (role: Role): Promise<void> => {
      if (isSystemApiMode()) {
          await systemApi.putSecurityRole(role.id, role);
          return;
      }
      if (APP_CONFIG.USE_MOCK) {
          await DevDatabase.add('auth_roles', role);
          return;
      }
      if (!supabase) return;
      await supabase.from('auth_roles').upsert(role);
  }
};
