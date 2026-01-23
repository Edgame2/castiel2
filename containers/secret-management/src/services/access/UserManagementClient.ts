/**
 * User Management Client Service
 * Handles communication with the User Management module for RBAC and user data.
 * Per ModuleImplementationGuide Section 5: Dependency Rules
 */

import { getConfig } from '../../config';
import { log } from '../../utils/logger';

export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
  isSuperAdmin?: boolean;
}

export interface UserManagementHealth {
  status: 'ok' | 'error';
  latency_ms?: number;
  message?: string;
}

let userManagementClientInstance: UserManagementClient | null = null;

export class UserManagementClient {
  private baseUrl: string;
  private serviceAuthToken: string;

  constructor(baseUrl: string, serviceAuthToken: string) {
    this.baseUrl = baseUrl;
    this.serviceAuthToken = serviceAuthToken;
    log.info('UserManagementClient initialized', { baseUrl, service: 'secret-management' });
  }

  /**
   * Fetches roles and permissions for a given user.
   * @param userId The ID of the user.
   * @returns An array of UserRole objects.
   */
  async getUserRoles(userId: string): Promise<UserRole[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/users/${userId}/roles`, {
        headers: {
          'Authorization': `Bearer ${this.serviceAuthToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        log.error('Failed to fetch user roles from User Management', { 
          status: response.status, 
          userId,
          service: 'secret-management',
        });
        return []; // Fail-secure: return no roles on error
      }

      const data = await response.json();
      return data.roles || [];
    } catch (error) {
      log.error('Error fetching user roles from User Management', error, { 
        userId,
        service: 'secret-management',
      });
      return []; // Fail-secure: return no roles on error
    }
  }

  /**
   * Fetches organization-specific roles for a user.
   * @param organizationId The ID of the organization.
   * @param userId The ID of the user.
   * @returns An array of UserRole objects.
   */
  async getOrganizationUserRoles(organizationId: string, userId: string): Promise<UserRole[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/organizations/${organizationId}/users/${userId}/roles`, {
        headers: {
          'Authorization': `Bearer ${this.serviceAuthToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        log.error('Failed to fetch organization user roles from User Management', { 
          status: response.status, 
          organizationId, 
          userId,
          service: 'secret-management',
        });
        return []; // Fail-secure
      }

      const data = await response.json();
      return data.roles || [];
    } catch (error) {
      log.error('Error fetching organization user roles from User Management', error, { 
        organizationId, 
        userId,
        service: 'secret-management',
      });
      return []; // Fail-secure
    }
  }

  /**
   * Checks if a user has a specific permission.
   * This method aggregates permissions from all roles.
   * @param userId The ID of the user.
   * @param permission The permission to check.
   * @param organizationId Optional organization ID for context.
   * @returns True if the user has the permission, false otherwise.
   */
  async hasPermission(userId: string, permission: string, organizationId?: string): Promise<boolean> {
    let roles: UserRole[] = [];
    if (organizationId) {
      roles = await this.getOrganizationUserRoles(organizationId, userId);
    } else {
      roles = await this.getUserRoles(userId);
    }

    return roles.some(role => role.permissions.includes(permission));
  }

  /**
   * Performs a health check on the User Management service.
   * @returns Health status and latency.
   */
  async healthCheck(): Promise<UserManagementHealth> {
    const startTime = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const latency = Date.now() - startTime;
      if (response.ok) {
        return { status: 'ok', latency_ms: latency };
      } else {
        const errorText = await response.text();
        return { status: 'error', latency_ms: latency, message: `Service responded with ${response.status}: ${errorText}` };
      }
    } catch (error: any) {
      return { status: 'error', latency_ms: Date.now() - startTime, message: error.message };
    }
  }
}

/**
 * Returns a singleton instance of the UserManagementClient.
 */
export function getUserManagementClient(): UserManagementClient {
  if (!userManagementClientInstance) {
    const config = getConfig();
    const baseUrl = config.services?.user_management?.url;
    const serviceAuthToken = config.service.authToken;

    if (!baseUrl) {
      log.warn('User Management Service URL is not configured. Role-based access will be limited.', {
        service: 'secret-management',
      });
      // Return a mock client that always returns empty roles
      // This allows the system to function without User Management
      return new UserManagementClient('', '');
    }
    if (!serviceAuthToken) {
      throw new Error('Service authentication token is not configured.');
    }
    userManagementClientInstance = new UserManagementClient(baseUrl, serviceAuthToken);
  }
  return userManagementClientInstance;
}

