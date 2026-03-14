"use client";

import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { Role, SecurityAuditLog, AccessPolicy, AccessLevel, DataScope } from '../types/security';
import { DEFAULT_ROLES } from '../constants/securityDefs';
import { PermissionService } from '../services/permissionService';
import { useAuth } from './AuthContext';
import { UserRole } from '../types/index';

interface SecurityContextType {
  roles: Role[];
  currentRole: Role | undefined;
  updateRolePermissions: (roleId: string, permissionIds: string[]) => void;
  updateRolePolicy: (roleId: string, resourceId: string, policy: AccessPolicy) => void;
  saveRoleChanges: (updatedRole: Role) => void; 
  hasPermission: (permissionId: string) => boolean;
  auditLogs: SecurityAuditLog[];
  bulkImportRoles: (newRoles: Role[]) => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const SecurityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { userRole } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]); // Init empty, load async
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);

  // 1. Load Roles from DB on mount
  useEffect(() => {
      const load = async () => {
          const loadedRoles = await PermissionService.getRoles();
          setRoles(loadedRoles);
          const loadedLogs = await PermissionService.getLogs();
          setAuditLogs(loadedLogs);
      };
      load();
  }, []);

  const currentRole = useMemo(() => {
      // Fallback to DEFAULT_ROLES if state is empty (during initial load)
      const roleSource = roles.length > 0 ? roles : DEFAULT_ROLES;
      return roleSource.find(r => {
          if (userRole === UserRole.SUPER_ADMIN) return r.id === 'ROLE_SUPER_ADMIN';
          if (userRole === UserRole.FINANCE) return r.id === 'ROLE_FINANCE';
          if (userRole === UserRole.OPERATIONS) return r.id === 'ROLE_OPS';
          if (userRole === UserRole.MARKETING) return r.id === 'ROLE_MARKETING';
          if (userRole === UserRole.SALES) return r.id === 'ROLE_SALES';
          if (userRole === UserRole.MEMBER) return r.id === 'ROLE_MEMBER';
          if (userRole === UserRole.FACILITATOR) return r.id === 'ROLE_MEMBER';
          if (userRole === UserRole.GATE_KEEPER) return r.id === 'ROLE_GUEST';
          return r.id === 'ROLE_MEMBER';
      });
  }, [roles, userRole]);

  const updateRolePermissions = (roleId: string, permissionIds: string[]) => {
    const violations = PermissionService.detectSodViolations(permissionIds);
    setRoles(prev => prev.map(r => {
        if (r.id === roleId) {
            return { ...r, permissions: permissionIds, sodViolations: violations };
        }
        return r;
    }));
    
    PermissionService.logEvent(
        currentRole?.name || 'Unknown', 
        'UPDATE_PERMISSIONS', 
        `Updated permissions for ${roleId}. Violations: ${violations.length}`
    );
  };

  const updateRolePolicy = (roleId: string, resourceId: string, policy: AccessPolicy) => {
      setRoles(prev => prev.map(r => {
          if (r.id === roleId) {
              const updatedPolicies = { ...r.policies, [resourceId]: policy };
              return { ...r, policies: updatedPolicies };
          }
          return r;
      }));
  };

  const saveRoleChanges = async (updatedRole: Role) => {
      // 1. Update Local State
      setRoles(prev => prev.map(r => r.id === updatedRole.id ? updatedRole : r));
      
      // 2. Persist to DB
      await PermissionService.saveRole(updatedRole);

      // 3. Log
      PermissionService.logEvent(
          currentRole?.name || 'Unknown',
          'POLICY_COMMIT',
          `Applied updated security policies for role: ${updatedRole.name}`
      );
  };

  const bulkImportRoles = async (newRoles: Role[]) => {
      // Merge Strategy
      const mergedRoles: Role[] = [...roles];
      const roleMap = new Map(mergedRoles.map(r => [r.id, r]));
      
      for (const r of newRoles) {
          roleMap.set(r.id, r);
          await PermissionService.saveRole(r); // Persist individually
      }
      
      setRoles(Array.from(roleMap.values()));
      
      PermissionService.logEvent(
          currentRole?.name || 'System',
          'BULK_IMPORT',
          `Imported ${newRoles.length} roles configurations.`
      );
  };

  const hasPermission = (permissionId: string): boolean => {
      if (!currentRole) return false;
      if (currentRole.id === 'ROLE_SUPER_ADMIN') return true;
      return currentRole.permissions.includes(permissionId);
  };

  return (
    <SecurityContext.Provider value={{ roles, currentRole, updateRolePermissions, updateRolePolicy, saveRoleChanges, hasPermission, auditLogs, bulkImportRoles }}>
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};

// ... existing useAccess code ...
export interface ResourceAccess {
    can: (requiredLevel: AccessLevel) => boolean;
    scope: DataScope;
    limit: number;
    policy: AccessPolicy | undefined;
}

export const useAccess = (resourceId: string): ResourceAccess => {
    const { currentRole } = useSecurity();

    return useMemo(() => {
        const defaultAccess: ResourceAccess = {
            can: () => false,
            scope: 'OWN',
            limit: 0,
            policy: undefined
        };

        if (!currentRole) return defaultAccess;

        if (currentRole.id === 'ROLE_SUPER_ADMIN') {
            return {
                can: () => true,
                scope: 'ALL',
                limit: Infinity,
                policy: { resourceId, accessLevel: 'FULL', scope: 'ALL' }
            };
        }

        const policy = currentRole.policies?.[resourceId];
        if (!policy) return defaultAccess;

        const levels: Record<AccessLevel, number> = { 'NONE': 0, 'READ': 1, 'WRITE': 2, 'FULL': 3 };
        const userLevelScore = levels[policy.accessLevel] || 0;

        return {
            can: (requiredLevel: AccessLevel) => userLevelScore >= (levels[requiredLevel] || 99),
            scope: policy.scope,
            limit: policy.authorityLimit?.maxAmount || 0,
            policy: policy
        };

    }, [currentRole, resourceId]);
};
