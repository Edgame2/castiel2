/**
 * Variable Resolver
 * 
 * Resolves dynamic variables in notification templates
 */

import { TemplateData } from '../types/notification';
import { getDatabaseClient } from '@coder/shared';
import { HttpClient } from '@coder/shared';
import { getConfig } from '../config';

export class VariableResolver {
  private userManagementClient: HttpClient;
  private config = getConfig();

  constructor() {
    this.userManagementClient = new HttpClient({
      baseUrl: this.config.services.user_management.url,
      timeout: this.config.services.user_management.timeout || 5000,
      headers: {
        'x-service-token': process.env.SERVICE_AUTH_TOKEN || '',
        'x-requesting-service': 'notification-manager',
      },
    });
  }

  /**
   * Resolve variables from event data and user context
   */
  async resolveVariables(
    eventData: any,
    recipientId: string,
    organizationId: string
  ): Promise<TemplateData> {
    const variables: TemplateData = {
      // Event data
      ...eventData,
      
      // App URL
      appUrl: this.config.app?.url || 'http://localhost:3000',
      
      // Timestamp
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
    };

    // Fetch user data if recipientId is available
    if (recipientId) {
      try {
        const user = await this.getUserData(recipientId);
        if (user) {
          variables.userName = user.name || user.firstName || 'User';
          variables.userFirstName = user.firstName || 'User';
          variables.userLastName = user.lastName || '';
          variables.userEmail = user.email;
          variables.userPhone = user.phoneNumber;
        }
      } catch (error) {
        // Log but don't fail - user data is optional
        console.warn(`Failed to fetch user data for ${recipientId}:`, error);
      }
    }

    return variables;
  }

  /**
   * Get user data from User Management service
   */
  private async getUserData(userId: string): Promise<{
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phoneNumber: string | null;
  } | null> {
    try {
      // Try to get from database first (faster)
      const db = getDatabaseClient() as any;
      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
        },
      });

      if (user) {
        return user;
      }

      // Fallback to API call
      const response = await this.userManagementClient.get(`/api/v1/users/${userId}`);
      return response as any;
    } catch (error) {
      return null;
    }
  }

  /**
   * Resolve variables synchronously (for simple cases)
   */
  resolveVariablesSync(eventData: any): TemplateData {
    return {
      ...eventData,
      appUrl: this.config.app?.url || 'http://localhost:3000',
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
    };
  }
}

