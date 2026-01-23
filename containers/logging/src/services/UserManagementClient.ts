/**
 * User Management Service Client
 * Per ModuleImplementationGuide Section 5: Dependency Rules
 * 
 * Provides integration with User Management module for RBAC
 */

import { getConfig } from '../config';
import { log } from '../utils/logger';

export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
  isSuperAdmin?: boolean;
}

export interface UserRolesResponse {
  userId: string;
  organizationId?: string;
  roles: UserRole[];
  isSuperAdmin: boolean;
}

export interface OrganizationUserRole {
  userId: string;
  organizationId: string;
  roles: UserRole[];
  isOrgAdmin: boolean;
}

/**
 * Client for User Management service
 * Handles RBAC queries to determine user permissions
 */
export class UserManagementClient {
  private baseUrl: string;
  private authToken?: string;

  constructor() {
    const config = getConfig();
    this.baseUrl = config.services.user_management.url;
    // Service-to-service auth token would come from config
    // For now, we'll rely on the JWT passed through from the request
  }

  /**
   * Get user roles and permissions
   * @param userId - User ID
   * @returns User roles and permissions
   */
  async getUserRoles(userId: string): Promise<UserRolesResponse> {
    try {
      const url = `${this.baseUrl}/api/v1/users/${userId}/roles`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // In production, would include service-to-service auth token
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          log.warn('User not found in User Management service', { userId });
          // Return default response for unknown users
          return {
            userId,
            roles: [],
            isSuperAdmin: false,
          };
        }
        throw new Error(`User Management API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        userId: data.data?.userId || userId,
        organizationId: data.data?.organizationId,
        roles: data.data?.roles || [],
        isSuperAdmin: data.data?.isSuperAdmin || false,
      };
    } catch (error) {
      log.error('Failed to fetch user roles from User Management', error, { userId });
      // Return default response on error (fail secure - no permissions)
      return {
        userId,
        roles: [],
        isSuperAdmin: false,
      };
    }
  }

  /**
   * Get user's roles for a specific organization
   * @param userId - User ID
   * @param organizationId - Organization ID
   * @returns Organization-specific roles
   */
  async getOrganizationUserRoles(
    userId: string,
    organizationId: string
  ): Promise<OrganizationUserRole> {
    try {
      const url = `${this.baseUrl}/api/v1/organizations/${organizationId}/users/${userId}/roles`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          log.warn('User-organization relationship not found', { userId, organizationId });
          return {
            userId,
            organizationId,
            roles: [],
            isOrgAdmin: false,
          };
        }
        throw new Error(`User Management API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        userId: data.data?.userId || userId,
        organizationId: data.data?.organizationId || organizationId,
        roles: data.data?.roles || [],
        isOrgAdmin: data.data?.isOrgAdmin || false,
      };
    } catch (error) {
      log.error('Failed to fetch organization user roles', error, { userId, organizationId });
      // Return default response on error (fail secure - no permissions)
      return {
        userId,
        organizationId,
        roles: [],
        isOrgAdmin: false,
      };
    }
  }

  /**
   * Check if user has a specific permission
   * @param userId - User ID
   * @param permission - Permission to check
   * @param organizationId - Optional organization ID for org-scoped permissions
   * @returns True if user has permission
   */
  async hasPermission(
    userId: string,
    permission: string,
    organizationId?: string
  ): Promise<boolean> {
    try {
      // Get user roles
      const userRoles = await this.getUserRoles(userId);
      
      // Super Admin has all permissions
      if (userRoles.isSuperAdmin) {
        return true;
      }

      // Check global roles
      for (const role of userRoles.roles) {
        if (role.permissions.includes(permission) || role.permissions.includes('*')) {
          return true;
        }
      }

      // Check organization-specific roles if organizationId provided
      if (organizationId) {
        const orgRoles = await this.getOrganizationUserRoles(userId, organizationId);
        
        // Org Admin typically has most permissions within their org
        if (orgRoles.isOrgAdmin) {
          // Check if permission is org-scoped (not requiring super admin)
          if (!permission.includes('.all') && !permission.includes('_all')) {
            return true;
          }
        }

        for (const role of orgRoles.roles) {
          if (role.permissions.includes(permission) || role.permissions.includes('*')) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      log.error('Failed to check user permission', error, { userId, permission, organizationId });
      // Fail secure - deny permission on error
      return false;
    }
  }

  /**
   * Health check for User Management service
   */
  async healthCheck(): Promise<{ status: 'ok' | 'error'; latency_ms?: number; message?: string }> {
    try {
      const startTime = Date.now();
      const url = `${this.baseUrl}/health`;
      
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        return { status: 'ok', latency_ms: latency };
      }

      return {
        status: 'error',
        latency_ms: latency,
        message: `Health check failed: ${response.status}`,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Health check failed',
      };
    }
  }
}

// Singleton instance
let userManagementClient: UserManagementClient | null = null;

/**
 * Get or create User Management client instance
 */
export function getUserManagementClient(): UserManagementClient {
  if (!userManagementClient) {
    userManagementClient = new UserManagementClient();
  }
  return userManagementClient;
}



