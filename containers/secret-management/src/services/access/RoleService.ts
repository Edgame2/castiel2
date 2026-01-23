/**
 * Role Service Integration
 * 
 * Integration with User Management module for role-based access control.
 * Per ModuleImplementationGuide Section 5: Dependency Rules
 */

import { getUserManagementClient, UserRole } from './UserManagementClient';
import { log } from '../../utils/logger';

/**
 * Get user roles from User Management module
 */
export async function getUserRoles(
  userId: string,
  organizationId?: string
): Promise<UserRole[]> {
  try {
    const userManagementClient = getUserManagementClient();
    
    // If client is not properly configured (empty baseUrl), return empty roles
    // This allows the system to function without User Management integration
    if (!userManagementClient || !(userManagementClient as any).baseUrl) {
      log.debug('User Management not configured, returning empty roles', {
        userId,
        organizationId,
        service: 'secret-management',
      });
      return [];
    }
    
    if (organizationId) {
      return await userManagementClient.getOrganizationUserRoles(organizationId, userId);
    } else {
      return await userManagementClient.getUserRoles(userId);
    }
  } catch (error) {
    log.error('Failed to fetch user roles from User Management', error, {
      userId,
      organizationId,
      service: 'secret-management',
    });
    // Fail-secure: return empty roles on error
    return [];
  }
}

/**
 * Check if user has permission
 */
export async function hasPermission(
  userId: string,
  permission: string,
  organizationId?: string
): Promise<boolean> {
  const roles = await getUserRoles(userId, organizationId);
  
  // Check if user is super admin
  if (roles.some(r => r.isSuperAdmin)) {
    return true;
  }
  
  // Check if any role has the permission
  return roles.some(r => r.permissions.includes(permission));
}

/**
 * Check if user is super admin
 */
export async function isSuperAdmin(
  userId: string,
  organizationId?: string
): Promise<boolean> {
  const roles = await getUserRoles(userId, organizationId);
  return roles.some(r => r.isSuperAdmin);
}
