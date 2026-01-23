/**
 * Integration External User ID Service
 * Manages external user IDs from integrated applications
 */

import { Container } from '@azure/cosmos';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { User, ExternalUserId } from '../types/user.types.js';
import { ExternalUserIdStatus } from '../types/user.types.js';
import type { IntegrationDocument } from '../types/integration.types.js';
import type { IntegrationAdapter } from '../types/adapter.types.js';
import type { AdapterManagerService } from './adapter-manager.service.js';
import type { IntegrationRepository } from '../repositories/integration.repository.js';
import type { AuditLogService } from './audit/audit-log.service.js';
import { AuditCategory, AuditEventType, AuditOutcome } from '../types/audit.types.js';

interface ExternalUserIdServiceOptions {
  userContainer: Container;
  monitoring: IMonitoringProvider;
  adapterManager?: AdapterManagerService;
  integrationRepository?: IntegrationRepository;
  auditLogService?: AuditLogService;
}

interface StoreExternalUserIdInput {
  integrationId: string;
  externalUserId: string;
  integrationName?: string;
  connectionId?: string;
  metadata?: Record<string, any>;
  status?: ExternalUserIdStatus;
}

interface UpdateExternalUserIdInput {
  externalUserId?: string;
  integrationName?: string;
  connectionId?: string;
  metadata?: Record<string, any>;
  status?: ExternalUserIdStatus;
  lastSyncedAt?: Date;
}

/**
 * Integration External User ID Service
 */
export class IntegrationExternalUserIdService {
  private userContainer: Container;
  private monitoring: IMonitoringProvider;
  private adapterManager?: AdapterManagerService;
  private integrationRepository?: IntegrationRepository;
  private auditLogService?: AuditLogService;

  constructor(options: ExternalUserIdServiceOptions) {
    this.userContainer = options.userContainer;
    this.monitoring = options.monitoring;
    this.adapterManager = options.adapterManager;
    this.integrationRepository = options.integrationRepository;
    this.auditLogService = options.auditLogService;
  }

  /**
   * Store or update external user ID for a user
   */
  async storeExternalUserId(
    userId: string,
    tenantId: string,
    data: StoreExternalUserIdInput
  ): Promise<void> {
    try {
      // Get current user
      const { resource: user } = await this.userContainer
        .item(userId, tenantId)
        .read<User>();

      if (!user) {
        throw new Error('User not found');
      }

      // Initialize externalUserIds array if it doesn't exist
      const externalUserIds = user.externalUserIds || [];

      // Find existing entry for this integration
      const existingIndex = externalUserIds.findIndex(
        (ext) => ext.integrationId === data.integrationId
      );

      const now = new Date();
      const externalUserId: ExternalUserId = {
        integrationId: data.integrationId,
        externalUserId: data.externalUserId,
        integrationName: data.integrationName,
        connectionId: data.connectionId,
        connectedAt: existingIndex >= 0 
          ? externalUserIds[existingIndex].connectedAt 
          : now,
        lastSyncedAt: now,
        status: data.status || ExternalUserIdStatus.ACTIVE,
        metadata: data.metadata || {},
      };

      if (existingIndex >= 0) {
        externalUserIds[existingIndex] = externalUserId;
      } else {
        externalUserIds.push(externalUserId);
      }

      // Update user document
      await this.userContainer
        .item(userId, tenantId)
        .replace({ ...user, externalUserIds });

      this.monitoring.trackEvent('externalUserId.stored', {
        userId,
        tenantId,
        integrationId: data.integrationId,
        isUpdate: existingIndex >= 0,
      });

      // Audit log
      if (this.auditLogService) {
        await this.auditLogService.log({
          category: AuditCategory.INTEGRATION,
          eventType: existingIndex >= 0 ? AuditEventType.UPDATE : AuditEventType.CREATE,
          outcome: AuditOutcome.SUCCESS,
          tenantId,
          userId,
          metadata: {
            integrationId: data.integrationId,
            externalUserId: data.externalUserId,
          },
        });
      }
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'externalUserId.store',
        userId,
        tenantId,
        integrationId: data.integrationId,
      });
      throw error;
    }
  }

  /**
   * Update external user ID
   */
  async updateExternalUserId(
    userId: string,
    tenantId: string,
    integrationId: string,
    data: UpdateExternalUserIdInput
  ): Promise<void> {
    try {
      const { resource: user } = await this.userContainer
        .item(userId, tenantId)
        .read<User>();

      if (!user) {
        throw new Error('User not found');
      }

      const externalUserIds = user.externalUserIds || [];
      const index = externalUserIds.findIndex(
        (ext) => ext.integrationId === integrationId
      );

      if (index < 0) {
        throw new Error('External user ID not found');
      }

      const existing = externalUserIds[index];
      externalUserIds[index] = {
        ...existing,
        ...data,
        lastSyncedAt: data.lastSyncedAt || existing.lastSyncedAt,
      };

      await this.userContainer
        .item(userId, tenantId)
        .replace({ ...user, externalUserIds });

      this.monitoring.trackEvent('externalUserId.updated', {
        userId,
        tenantId,
        integrationId,
      });

      if (this.auditLogService) {
        await this.auditLogService.log({
          category: AuditCategory.INTEGRATION,
          eventType: AuditEventType.UPDATE,
          outcome: AuditOutcome.SUCCESS,
          tenantId,
          userId,
          metadata: { integrationId },
        });
      }
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'externalUserId.update',
        userId,
        tenantId,
        integrationId,
      });
      throw error;
    }
  }

  /**
   * Get external user ID for a user and integration
   */
  async getExternalUserId(
    userId: string,
    tenantId: string,
    integrationId: string
  ): Promise<ExternalUserId | null> {
    try {
      const { resource: user } = await this.userContainer
        .item(userId, tenantId)
        .read<User>();

      if (!user || !user.externalUserIds) {
        return null;
      }

      return user.externalUserIds.find(
        (ext) => ext.integrationId === integrationId
      ) || null;
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'externalUserId.get',
        userId,
        tenantId,
        integrationId,
      });
      throw error;
    }
  }

  /**
   * Get all external user IDs for a user
   */
  async getAllExternalUserIds(
    userId: string,
    tenantId: string
  ): Promise<ExternalUserId[]> {
    try {
      const { resource: user } = await this.userContainer
        .item(userId, tenantId)
        .read<User>();

      return user?.externalUserIds || [];
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'externalUserId.getAll',
        userId,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Delete external user ID
   */
  async deleteExternalUserId(
    userId: string,
    tenantId: string,
    integrationId: string
  ): Promise<void> {
    try {
      const { resource: user } = await this.userContainer
        .item(userId, tenantId)
        .read<User>();

      if (!user) {
        throw new Error('User not found');
      }

      const externalUserIds = user.externalUserIds || [];
      const filtered = externalUserIds.filter(
        (ext) => ext.integrationId !== integrationId
      );

      if (filtered.length === externalUserIds.length) {
        throw new Error('External user ID not found');
      }

      await this.userContainer
        .item(userId, tenantId)
        .replace({ ...user, externalUserIds: filtered });

      this.monitoring.trackEvent('externalUserId.deleted', {
        userId,
        tenantId,
        integrationId,
      });

      if (this.auditLogService) {
        await this.auditLogService.log({
          category: AuditCategory.INTEGRATION,
          eventType: AuditEventType.DELETE,
          outcome: AuditOutcome.SUCCESS,
          tenantId,
          userId,
          metadata: { integrationId },
        });
      }
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'externalUserId.delete',
        userId,
        tenantId,
        integrationId,
      });
      throw error;
    }
  }

  /**
   * Find user by external user ID
   */
  async findUserByExternalUserId(
    tenantId: string,
    integrationId: string,
    externalUserId: string
  ): Promise<User | null> {
    try {
      const query = `
        SELECT * FROM c
        WHERE c.tenantId = @tenantId
        AND ARRAY_CONTAINS(c.externalUserIds, {
          "integrationId": @integrationId,
          "externalUserId": @externalUserId
        }, true)
      `;

      const { resources } = await this.userContainer.items
        .query({
          query,
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@integrationId', value: integrationId },
            { name: '@externalUserId', value: externalUserId },
          ],
        })
        .fetchAll();

      return resources.length > 0 ? (resources[0] as User) : null;
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'externalUserId.findUser',
        tenantId,
        integrationId,
        externalUserId,
      });
      throw error;
    }
  }

  /**
   * Sync external user IDs from integration
   */
  async syncExternalUserIds(
    tenantId: string,
    integrationId: string
  ): Promise<{ synced: number; errors: number }> {
    if (!this.adapterManager || !this.integrationRepository) {
      throw new Error('AdapterManager and IntegrationRepository required for sync');
    }

    try {
      const integration = await this.integrationRepository.findById(integrationId, tenantId);
      if (!integration) {
        throw new Error('Integration not found');
      }

      const adapter = await this.adapterManager.getAdapter(integration.providerId);
      if (!adapter || !adapter.getExternalUserIds) {
        throw new Error('Adapter does not support external user ID sync');
      }

      const result = await adapter.getExternalUserIds({
        tenantId,
        integrationId,
        connectionId: integration.connectionId,
      });

      let synced = 0;
      let errors = 0;

      for (const mapping of result.mappings) {
        try {
          const user = await this.findUserByExternalUserId(
            tenantId,
            integrationId,
            mapping.externalUserId
          );

          if (user) {
            await this.updateExternalUserId(
              user.id,
              tenantId,
              integrationId,
              {
                externalUserId: mapping.externalUserId,
                lastSyncedAt: new Date(),
                status: ExternalUserIdStatus.ACTIVE,
              }
            );
            synced++;
          }
        } catch (error: any) {
          this.monitoring.trackException(error, {
            operation: 'externalUserId.sync',
            tenantId,
            integrationId,
            externalUserId: mapping.externalUserId,
          });
          errors++;
        }
      }

      this.monitoring.trackEvent('externalUserId.sync.completed', {
        tenantId,
        integrationId,
        synced,
        errors,
      });

      return { synced, errors };
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'externalUserId.sync',
        tenantId,
        integrationId,
      });
      throw error;
    }
  }
}
