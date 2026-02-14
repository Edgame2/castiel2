/**
 * User Management Service Client
 * Per ModuleImplementationGuide Section 5: Dependency Rules
 * 
 * Provides integration with User Management module for RBAC
 */

import { ServiceClient } from '@coder/shared';
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
  tenantId?: string;
  roles: UserRole[];
  isSuperAdmin: boolean;
}

export interface TenantUserRole {
  userId: string;
  tenantId: string;
  roles: UserRole[];
  isTenantAdmin: boolean;
}

/**
 * Client for User Management service
 * Handles RBAC queries to determine user permissions
 */
export class UserManagementClient {
  private baseUrl: string;
  private serviceClient: ServiceClient;
  private authToken?: string;

  constructor() {
    const config = getConfig();
    this.baseUrl = config.services.user_management.url;
    this.serviceClient = new ServiceClient({
      baseURL: config.services.user_management.url,
      timeout: 5000,
    });
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
      const data = await this.serviceClient.get<{ data?: UserRolesResponse }>(
        `/api/v1/users/${userId}/roles`,
        {
          headers: {
            'Content-Type': 'application/json',
            // In production, would include service-to-service auth token
          },
        }
      );
      
      return {
        userId: data.data?.userId || userId,
        tenantId: data.data?.tenantId ?? (data.data as { organizationId?: string }).organizationId,
        roles: data.data?.roles || [],
        isSuperAdmin: data.data?.isSuperAdmin || false,
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        log.warn('User not found in User Management service', { userId });
        // Return default response for unknown users
        return {
          userId,
          roles: [],
          isSuperAdmin: false,
        };
      }
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
   * Get user's roles for a specific tenant
   * @param userId - User ID
   * @param tenantId - Tenant ID
   * @returns Tenant-specific roles
   */
  async getTenantUserRoles(userId: string, tenantId: string): Promise<TenantUserRole> {
    try {
      const url = `${this.baseUrl}/api/v1/tenants/${tenantId}/users/${userId}/roles`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          log.warn('User-tenant relationship not found', { userId, tenantId });
          return {
            userId,
            tenantId,
            roles: [],
            isTenantAdmin: false,
          };
        }
        throw new Error(`User Management API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as {
        data?: { userId?: string; tenantId?: string; organizationId?: string; roles?: UserRole[]; isOrgAdmin?: boolean; isTenantAdmin?: boolean };
      };
      return {
        userId: data.data?.userId || userId,
        tenantId: data.data?.tenantId ?? data.data?.organizationId ?? tenantId,
        roles: data.data?.roles || [],
        isTenantAdmin: data.data?.isTenantAdmin ?? data.data?.isOrgAdmin ?? false,
      };
    } catch (error) {
      log.error('Failed to fetch tenant user roles', error, { userId, tenantId });
      // Return default response on error (fail secure - no permissions)
      return {
        userId,
        tenantId,
        roles: [],
        isTenantAdmin: false,
      };
    }
  }

  /**
   * Check if user has a specific permission
   * @param userId - User ID
   * @param permission - Permission to check
   * @param tenantId - Optional tenant ID for tenant-scoped permissions
   * @returns True if user has permission
   */
  async hasPermission(
    userId: string,
    permission: string,
    tenantId?: string
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

      // Check tenant-specific roles if tenantId provided
      if (tenantId) {
        const tenantRoles = await this.getTenantUserRoles(userId, tenantId);
        if (tenantRoles.isTenantAdmin) {
          if (!permission.includes('.all') && !permission.includes('_all')) {
            return true;
          }
        }
        for (const role of tenantRoles.roles) {
          if (role.permissions.includes(permission) || role.permissions.includes('*')) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      log.error('Failed to check user permission', error, { userId, permission, tenantId });
      // Fail secure - deny permission on error
      return false;
    }
  }

  /**
   * Health check for User Management service
   */
  async healthCheck(): Promise<{ status: 'ok' | 'error'; latency_ms?: number; message?: string }> {
    const startTime = Date.now();
    try {
      await this.serviceClient.get('/health', { timeout: 5000 });
      const latency = Date.now() - startTime;
      return { status: 'ok', latency_ms: latency };
    } catch (error: any) {
      const latency = Date.now() - startTime;
      return {
        status: 'error',
        latency_ms: latency,
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



