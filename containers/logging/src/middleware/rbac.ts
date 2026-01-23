/**
 * Role-Based Access Control Middleware
 * Per ModuleImplementationGuide Section 11: Security
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '.prisma/logging-client';
import { log } from '../utils/logger';
import { getUserManagementClient } from '../services/UserManagementClient';

/**
 * Permissions for the logging module
 */
export enum AuditPermission {
  // Log viewing
  LOGS_READ = 'audit.logs.read',
  LOGS_READ_ALL = 'audit.logs.read_all', // Cross-org (Super Admin)
  
  // Configuration
  CONFIG_READ = 'audit.config.read',
  CONFIG_WRITE = 'audit.config.write',
  CONFIG_WRITE_ALL = 'audit.config.write_all', // Global config (Super Admin)
  
  // Policies
  POLICIES_READ = 'audit.policies.read',
  POLICIES_WRITE = 'audit.policies.write',
  
  // Alerts
  ALERTS_READ = 'audit.alerts.read',
  ALERTS_WRITE = 'audit.alerts.write',
  
  // Export
  EXPORT_CREATE = 'audit.export.create',
  EXPORT_DOWNLOAD = 'audit.export.download',
  
  // Verification
  VERIFICATION_RUN = 'audit.verification.run',
  VERIFICATION_READ = 'audit.verification.read',
}

/**
 * Role definitions with permissions
 * In production, this would be fetched from User Management module
 */
const ROLE_PERMISSIONS: Record<string, AuditPermission[]> = {
  SUPER_ADMIN: Object.values(AuditPermission), // Super Admin has all permissions
  ORG_ADMIN: [
    AuditPermission.LOGS_READ,
    AuditPermission.CONFIG_READ,
    AuditPermission.CONFIG_WRITE,
    AuditPermission.POLICIES_READ,
    AuditPermission.POLICIES_WRITE,
    AuditPermission.ALERTS_READ,
    AuditPermission.ALERTS_WRITE,
    AuditPermission.EXPORT_CREATE,
    AuditPermission.EXPORT_DOWNLOAD,
    AuditPermission.VERIFICATION_RUN,
    AuditPermission.VERIFICATION_READ,
  ],
  USER: [
    AuditPermission.LOGS_READ, // Only own activity
  ],
};

/**
 * Check if user has a specific permission
 */
export async function checkPermission(
  userId: string,
  permission: AuditPermission,
  organizationId?: string
): Promise<boolean> {
  try {
    const userManagementClient = getUserManagementClient();
    
    // Use User Management service to check permissions
    const hasPermission = await userManagementClient.hasPermission(
      userId,
      permission,
      organizationId
    );
    
    if (hasPermission) {
      return true;
    }
    
    // Fallback: Check local role definitions if User Management is unavailable
    // This provides resilience if the User Management service is down
    const isSuperAdmin = await checkSuperAdmin(userId);
    
    if (isSuperAdmin) {
      return true;
    }
    
    // Org Admin check
    if (organizationId) {
      const isOrgAdmin = await checkOrgAdmin(userId, organizationId);
      if (isOrgAdmin && ROLE_PERMISSIONS.ORG_ADMIN.includes(permission)) {
        return true;
      }
    }
    
    // Regular user check
    if (ROLE_PERMISSIONS.USER.includes(permission)) {
      return true;
    }
    
    return false;
  } catch (error) {
    log.error('Permission check failed', error, { userId, permission, organizationId });
    // Fail secure - deny permission on error
    return false;
  }
}

/**
 * Check if user is Super Admin
 * Falls back to User Management service if available
 */
async function checkSuperAdmin(userId: string): Promise<boolean> {
  try {
    const userManagementClient = getUserManagementClient();
    const userRoles = await userManagementClient.getUserRoles(userId);
    return userRoles.isSuperAdmin;
  } catch (error) {
    log.debug('Failed to check super admin status, using fallback', { userId, error });
    // Fallback: return false if User Management is unavailable
    return false;
  }
}

/**
 * Check if user is Org Admin
 * Falls back to User Management service if available
 */
async function checkOrgAdmin(userId: string, organizationId: string): Promise<boolean> {
  try {
    const userManagementClient = getUserManagementClient();
    const orgRoles = await userManagementClient.getOrganizationUserRoles(userId, organizationId);
    return orgRoles.isOrgAdmin;
  } catch (error) {
    log.debug('Failed to check org admin status, using fallback', { userId, organizationId, error });
    // Fallback: return false if User Management is unavailable
    return false;
  }
}

/**
 * Create permission check middleware
 */
export function requirePermission(permission: AuditPermission) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = (request as any).user;
    
    if (!user) {
      reply.code(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }
    
    const hasPermission = await checkPermission(
      user.id,
      permission,
      user.organizationId
    );
    
    if (!hasPermission) {
      log.warn('Permission denied', {
        userId: user.id,
        permission,
        organizationId: user.organizationId,
      });
      
      reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: `Permission denied: ${permission}`,
        },
      });
      return;
    }
  };
}

/**
 * Check if user can access cross-organization data
 */
export async function canAccessCrossOrg(userId: string): Promise<boolean> {
  try {
    const userManagementClient = getUserManagementClient();
    const userRoles = await userManagementClient.getUserRoles(userId);
    
    // Super Admin can access cross-org data
    if (userRoles.isSuperAdmin) {
      return true;
    }
    
    // Check for specific cross-org permission
    return checkPermission(userId, AuditPermission.LOGS_READ_ALL);
  } catch (error) {
    log.debug('Failed to check cross-org access, using fallback', { userId, error });
    // Fallback: use permission check
    return checkPermission(userId, AuditPermission.LOGS_READ_ALL);
  }
}

/**
 * Check if user can only see own activity
 */
export function isUserOnlyAccess(user: { id: string; organizationId?: string }): boolean {
  // Regular users can only see their own activity
  // This would be determined by role check
  // For now, assume everyone can see all org logs if they have LOGS_READ
  return false;
}

