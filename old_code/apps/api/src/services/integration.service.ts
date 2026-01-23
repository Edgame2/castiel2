/**
 * Integration Service
 * Business logic for managing tenant integration instances
 */

import { IntegrationRepository } from '../repositories/integration.repository.js';
import { IntegrationProviderRepository } from '../repositories/integration.repository.js';
import type { CreateSystemNotificationInput } from '../types/notification.types.js';
import type { AuditLogService, UserService } from '@castiel/api-core';
import type {
  IntegrationDocument,
  IntegrationProviderDocument,
  SyncFrequency,
  EntityMapping,
  PullFilter,
} from '../types/integration.types.js';
import type { AuthUser } from '../types/auth.types.js';
import type { IMonitoringProvider } from '@castiel/monitoring';

// Minimal interface for NotificationService to avoid importing the full implementation
// which has optional dependencies (web-push, @azure/communication-email)
interface INotificationService {
  createSystemNotification(input: CreateSystemNotificationInput): Promise<void>;
}

export interface CreateIntegrationInput {
  tenantId: string;
  integrationId: string; // Provider ID
  providerName: string;
  name: string;
  icon?: string;
  description?: string;
  credentialSecretName: string;
  settings?: Record<string, any>;
  syncConfig?: {
    syncEnabled: boolean;
    syncDirection: 'inbound' | 'outbound' | 'bidirectional';
    syncFrequency?: SyncFrequency;
    entityMappings: EntityMapping[];
    pullFilters?: PullFilter[];
    syncUserScoped?: boolean;
  };
  userScoped?: boolean;
  allowedShardTypes?: string[];
  searchEnabled?: boolean;
  searchableEntities?: string[];
  searchFilters?: {
    dateRange?: { start?: Date; end?: Date };
    entityTypes?: string[];
    customFilters?: Record<string, any>;
  };
  instanceUrl?: string;
}

export interface UpdateIntegrationInput {
  name?: string;
  icon?: string;
  description?: string;
  settings?: Record<string, any>;
  syncConfig?: {
    syncEnabled: boolean;
    syncDirection: 'inbound' | 'outbound' | 'bidirectional';
    syncFrequency?: SyncFrequency;
    entityMappings: EntityMapping[];
    pullFilters?: PullFilter[];
    syncUserScoped?: boolean;
  };
  userScoped?: boolean;
  allowedShardTypes?: string[];
  searchEnabled?: boolean;
  searchableEntities?: string[];
  searchFilters?: {
    dateRange?: { start?: Date; end?: Date };
    entityTypes?: string[];
    customFilters?: Record<string, any>;
  };
  instanceUrl?: string;
}

export class IntegrationService {
  private integrationRepository: IntegrationRepository;
  private providerRepository: IntegrationProviderRepository;
  private notificationService?: INotificationService;
  private auditLogService?: AuditLogService;
  private userService?: UserService;
  private monitoring?: IMonitoringProvider;

  constructor(
    integrationRepository: IntegrationRepository,
    providerRepository: IntegrationProviderRepository,
    notificationService?: INotificationService,
    auditLogService?: AuditLogService,
    userService?: UserService,
    monitoring?: IMonitoringProvider
  ) {
    this.integrationRepository = integrationRepository;
    this.providerRepository = providerRepository;
    this.notificationService = notificationService;
    this.auditLogService = auditLogService;
    this.userService = userService;
    this.monitoring = monitoring;
  }

  /**
   * Helper: Get tenant admin user IDs
   */
  private async getTenantAdminUserIds(tenantId: string): Promise<string[]> {
    if (!this.userService) {
      return [];
    }

    try {
      const result = await this.userService.listUsers(tenantId, {
        page: 1,
        limit: 1000, // Large limit to get all users
      });

      // Filter for admin users (roles include 'admin', 'owner', 'tenant_admin', 'super_admin')
      const adminUserIds = result.users
        .filter(user => {
          const roles = user.roles || [];
          return roles.some(role =>
            ['admin', 'owner', 'tenant_admin', 'super_admin', 'super-admin', 'superadmin', 'global_admin'].includes(role.toLowerCase())
          );
        })
        .map(user => user.id);

      return adminUserIds;
    } catch (error) {
      this.monitoring?.trackException(error as Error, { operation: 'integration.get-tenant-admin-ids' });
      return [];
    }
  }

  /**
   * Helper: Send notification to tenant admins
   */
  private async notifyTenantAdmins(
    tenantId: string,
    notification: {
      name: string;
      content: string;
      link?: string;
      type: 'information' | 'warning' | 'error';
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    if (!this.notificationService || !this.userService) {
      return;
    }

    try {
      const adminUserIds = await this.getTenantAdminUserIds(tenantId);
      
      if (adminUserIds.length === 0) {
        return; // No admins to notify
      }

      // Create notifications for each admin
      for (const userId of adminUserIds) {
        await this.notificationService.createSystemNotification({
          tenantId,
          userId,
          name: notification.name,
          content: notification.content,
          link: notification.link,
          type: notification.type,
          metadata: {
            source: 'integration_system',
            ...notification.metadata,
          },
        });
      }
    } catch (error) {
      // Don't fail if notification fails
      this.monitoring?.trackException(error as Error, { operation: 'integration.send-tenant-admin-notification' });
    }
  }

  /**
   * Create integration instance
   */
  async createIntegration(input: CreateIntegrationInput, user: AuthUser): Promise<IntegrationDocument> {
    // Validate input
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Integration name is required');
    }

    if (!input.providerName || input.providerName.trim().length === 0) {
      throw new Error('Provider name is required');
    }

    // Validate provider exists and is available to tenant
    const provider = await this.providerRepository.findByIdAcrossCategories(input.integrationId);
    if (!provider) {
      throw new Error('Integration provider not found');
    }

    if (provider.audience === 'system') {
      throw new Error('This integration is not available for tenant configuration');
    }

    if (provider.status !== 'active' && provider.status !== 'beta') {
      throw new Error(`Integration provider is ${provider.status} and cannot be configured`);
    }

    // Check for duplicate name
    const existing = await this.integrationRepository.findByProviderAndName(
      input.tenantId,
      input.providerName,
      input.name
    );
    if (existing) {
      throw new Error(`Integration with name "${input.name}" already exists for this provider`);
    }

    // Generate credential secret name for Key Vault
    // Format: tenant-{tenantId}-{providerName}-{instanceId}-oauth
    const instanceId = input.name.toLowerCase().replace(/\s+/g, '-');
    const credentialSecretName = input.credentialSecretName || 
      `tenant-${input.tenantId}-${input.providerName}-${instanceId}-oauth`;

    const integration = await this.integrationRepository.create({
      ...input,
      credentialSecretName,
      status: 'pending' as const,
      connectionStatus: undefined,
      allowedShardTypes: input.allowedShardTypes || [],
      settings: input.settings || {},
      enabledAt: new Date(),
      enabledBy: user.id,
    });

    // Audit log
    await this.auditLogService?.log({
      tenantId: input.tenantId,
      category: 'system' as any,
      eventType: 'integration.instance.enabled' as any,
      outcome: 'success' as any,
      actorId: user.id,
      actorEmail: user.email,
      actorType: 'user', // tenant_admin is a role, not an actor type
      targetId: integration.id,
      targetType: 'integration',
      targetName: integration.name,
      message: `Integration instance "${integration.name}" created`,
      details: {
        providerId: input.integrationId,
        providerName: input.providerName,
        credentialSecretName,
      },
    });

    // Send notification to tenant admins
    if (this.notificationService) {
      try {
        await this.notificationService.createSystemNotification({
          tenantId: input.tenantId,
          userId: user.id, // Notify the user who created it
          name: 'Integration Created',
          content: `Integration "${integration.name}" has been created and is ready to configure.`,
          link: `/integrations/${integration.id}`,
          type: 'information',
          priority: 'medium',
          metadata: {
            integrationId: integration.id,
            integrationName: integration.name,
            providerName: input.providerName,
            action: 'created',
          },
        });
      } catch (error) {
        // Don't fail if notification fails
        this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
          component: 'IntegrationService',
          operation: 'createIntegration',
          context: 'send-creation-notification',
        });
      }
    }

    return integration;
  }

  /**
   * Update integration
   */
  async updateIntegration(
    id: string,
    tenantId: string,
    input: UpdateIntegrationInput,
    user: AuthUser
  ): Promise<IntegrationDocument> {
    const existing = await this.integrationRepository.findById(id, tenantId);
    if (!existing) {
      throw new Error('Integration not found');
    }

    const updated = await this.integrationRepository.update(id, tenantId, input);
    if (!updated) {
      throw new Error('Failed to update integration');
    }

    // Audit log
    await this.auditLogService?.log({
      tenantId,
      category: 'system' as any,
      eventType: 'integration.instance.config.updated' as any,
      outcome: 'success' as any,
      actorId: user.id,
      actorEmail: user.email,
      actorType: 'user', // tenant_admin is a role, not an actor type
      targetId: id,
      targetType: 'integration',
      targetName: updated.name,
      message: `Integration "${updated.name}" configuration updated`,
      details: {
        changes: Object.keys(input),
      },
    });

    // Send notification for configuration changes
    await this.notifyTenantAdmins(tenantId, {
      name: 'Integration Configuration Updated',
      content: `Integration "${updated.name}" configuration has been updated.`,
      link: `/integrations/${updated.id}`,
      type: 'information',
      metadata: {
        integrationId: updated.id,
        integrationName: updated.name,
        providerName: updated.providerName,
        eventType: 'integration.config.updated',
      },
    });

    return updated;
  }

  /**
   * Delete integration
   */
  async deleteIntegration(id: string, tenantId: string, user: AuthUser): Promise<boolean> {
    const existing = await this.integrationRepository.findById(id, tenantId);
    if (!existing) {
      throw new Error('Integration not found');
    }

    const deleted = await this.integrationRepository.delete(id, tenantId);

    if (deleted) {
      // Audit log
      await this.auditLogService?.log({
        tenantId,
        category: 'system' as any,
        eventType: 'integration.instance.deleted' as any,
        outcome: 'success' as any,
        actorId: user.id,
        actorEmail: user.email,
        actorType: 'user', // tenant_admin is a role, not an actor type
        targetId: id,
        targetType: 'integration',
        targetName: existing.name,
        message: `Integration "${existing.name}" deleted`,
      });
    }

    return deleted;
  }

  /**
   * Activate integration
   */
  async activateIntegration(id: string, tenantId: string, user: AuthUser): Promise<IntegrationDocument> {
    const existing = await this.integrationRepository.findById(id, tenantId);
    if (!existing) {
      throw new Error('Integration not found');
    }

    const updated = await this.integrationRepository.update(id, tenantId, {
      status: 'connected',
    });

    if (!updated) {
      throw new Error('Failed to activate integration');
    }

    // Audit log
    await this.auditLogService?.log({
      tenantId,
      category: 'system' as any,
      eventType: 'integration.instance.activated' as any,
      outcome: 'success' as any,
      actorId: user.id,
      actorEmail: user.email,
      actorType: 'user', // tenant_admin is a role, not an actor type
      targetId: id,
      targetType: 'integration',
      targetName: updated.name,
      message: `Integration "${updated.name}" activated`,
    });

    // Send notification to tenant admins
    if (this.notificationService) {
      try {
        await this.notificationService.createSystemNotification({
          tenantId,
          userId: user.id, // Notify the user who activated it
          name: 'Integration Activated',
          content: `Integration "${updated.name}" has been activated and is now available for use.`,
          link: `/integrations/${id}`,
          type: 'information',
          priority: 'medium',
          metadata: {
            integrationId: id,
            integrationName: updated.name,
            providerName: updated.providerName,
            action: 'activated',
          },
        });
      } catch (error) {
        // Don't fail if notification fails
        this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
          component: 'IntegrationService',
          operation: 'activateIntegration',
          context: 'send-activation-notification',
        });
      }
    }

    return updated;
  }

  /**
   * Deactivate integration
   */
  async deactivateIntegration(id: string, tenantId: string, user: AuthUser): Promise<IntegrationDocument> {
    const existing = await this.integrationRepository.findById(id, tenantId);
    if (!existing) {
      throw new Error('Integration not found');
    }

    const updated = await this.integrationRepository.update(id, tenantId, {
      status: 'disabled',
    });

    if (!updated) {
      throw new Error('Failed to deactivate integration');
    }

    // Audit log
    await this.auditLogService?.log({
      tenantId,
      category: 'system' as any,
      eventType: 'integration.instance.deactivated' as any,
      outcome: 'success' as any,
      actorId: user.id,
      actorEmail: user.email,
      actorType: 'user', // tenant_admin is a role, not an actor type
      targetId: id,
      targetType: 'integration',
      targetName: updated.name,
      message: `Integration "${updated.name}" deactivated`,
    });

    // Send notification to tenant admins
    if (this.notificationService) {
      try {
        await this.notificationService.createSystemNotification({
          tenantId,
          userId: user.id, // Notify the user who deactivated it
          name: 'Integration Deactivated',
          content: `Integration "${updated.name}" has been deactivated and is no longer available.`,
          link: `/integrations/${id}`,
          type: 'information',
          priority: 'medium',
          metadata: {
            integrationId: id,
            integrationName: updated.name,
            providerName: updated.providerName,
            action: 'deactivated',
          },
        });
      } catch (error) {
        // Don't fail if notification fails
        this.monitoring?.trackException(error instanceof Error ? error : new Error(String(error)), {
          component: 'IntegrationService',
          operation: 'deactivateIntegration',
          context: 'send-deactivation-notification',
        });
      }
    }

    return updated;
  }

  /**
   * Update data access configuration
   */
  async updateDataAccess(
    id: string,
    tenantId: string,
    allowedShardTypes: string[],
    user: AuthUser
  ): Promise<IntegrationDocument> {
    const existing = await this.integrationRepository.findById(id, tenantId);
    if (!existing) {
      throw new Error('Integration not found');
    }

    const updated = await this.integrationRepository.update(id, tenantId, {
      allowedShardTypes,
    });

    if (!updated) {
      throw new Error('Failed to update data access');
    }

    // Audit log
    await this.auditLogService?.log({
      tenantId,
      category: 'system' as any,
      eventType: 'integration.instance.data_access.updated' as any,
      outcome: 'success' as any,
      actorId: user.id,
      actorEmail: user.email,
      actorType: 'user', // tenant_admin is a role, not an actor type
      targetId: id,
      targetType: 'integration',
      targetName: updated.name,
      message: `Integration "${updated.name}" data access updated`,
      details: {
        allowedShardTypes,
      },
    });

    return updated;
  }

  /**
   * Update search configuration
   */
  async updateSearchConfig(
    id: string,
    tenantId: string,
    config: {
      searchEnabled?: boolean;
      searchableEntities?: string[];
      searchFilters?: {
        dateRange?: { start?: Date; end?: Date };
        entityTypes?: string[];
        customFilters?: Record<string, any>;
      };
    },
    user: AuthUser
  ): Promise<IntegrationDocument> {
    const existing = await this.integrationRepository.findById(id, tenantId);
    if (!existing) {
      throw new Error('Integration not found');
    }

    const updated = await this.integrationRepository.update(id, tenantId, {
      searchEnabled: config.searchEnabled,
      searchableEntities: config.searchableEntities,
      searchFilters: config.searchFilters,
    });

    if (!updated) {
      throw new Error('Failed to update search configuration');
    }

    // Audit log
    await this.auditLogService?.log({
      tenantId,
      category: 'system' as any,
      eventType: 'integration.instance.search.updated' as any,
      outcome: 'success' as any,
      actorId: user.id,
      actorEmail: user.email,
      actorType: 'user', // tenant_admin is a role, not an actor type
      targetId: id,
      targetType: 'integration',
      targetName: updated.name,
      message: `Integration "${updated.name}" search configuration updated`,
    });

    return updated;
  }

  /**
   * List integrations
   */
  async listIntegrations(options: {
    tenantId: string;
    providerName?: string;
    status?: 'pending' | 'connected' | 'error' | 'disabled';
    searchEnabled?: boolean;
    userScoped?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ integrations: IntegrationDocument[]; total: number; hasMore: boolean }> {
    return this.integrationRepository.list(options);
  }

  /**
   * Get integration by ID
   */
  async getIntegration(id: string, tenantId: string): Promise<IntegrationDocument | null> {
    return this.integrationRepository.findById(id, tenantId);
  }
}





