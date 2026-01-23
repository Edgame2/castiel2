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
import type { AdapterManagerService, IntegrationRepository, AuditLogService } from '@castiel/api-core';
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
        // Update existing entry
        externalUserIds[existingIndex] = externalUserId;
      } else {
        // Add new entry
        externalUserIds.push(externalUserId);
      }

      // Update user document
      const updatedUser: User = {
        ...user,
        externalUserIds,
        updatedAt: now,
      };

      await this.userContainer
        .item(userId, tenantId)
        .replace(updatedUser);

      // Log audit event
      if (this.auditLogService) {
        await this.auditLogService.log({
          tenantId,
          actorId: 'system',
          actorEmail: 'system@castiel',
          actorType: 'system',
          category: AuditCategory.SYSTEM, // Use SYSTEM category as integration is not available
          eventType: existingIndex >= 0 ? AuditEventType.USER_UPDATE : AuditEventType.USER_CREATE, // Use closest matching event types
          outcome: AuditOutcome.SUCCESS,
          targetId: userId,
          targetType: 'user',
          targetName: user.email,
          message: `${existingIndex >= 0 ? 'Updated' : 'Created'} external user ID for integration ${data.integrationId}`,
          details: {
            integrationId: data.integrationId,
            externalUserId: data.externalUserId,
            integrationName: data.integrationName,
          },
        }).catch((err) => {
          // Don't throw - audit logging should not break main flow
          this.monitoring.trackException(err, {
            operation: 'external-user-id.audit-log',
            userId,
            integrationId: data.integrationId,
          });
        });
      }

      this.monitoring.trackEvent('external_user_id.stored', {
        userId,
        tenantId,
        integrationId: data.integrationId,
        isUpdate: existingIndex >= 0,
      });
    } catch (error) {
      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'external-user-id.store',
        userId,
        tenantId,
        integrationId: data.integrationId,
      });
      throw error;
    }
  }

  /**
   * Get external user ID for a specific integration
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

      return (
        user.externalUserIds.find((ext) => ext.integrationId === integrationId) || null
      );
    } catch (error) {
      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'external-user-id.get',
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

      if (!user || !user.externalUserIds) {
        return [];
      }

      return user.externalUserIds;
    } catch (error) {
      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'external-user-id.get-all',
        userId,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Find user by external ID (reverse lookup)
   * Given an external user ID from an integration, find the internal user
   */
  async getUserByExternalId(
    externalUserId: string,
    tenantId: string,
    integrationId: string
  ): Promise<{
    userId: string;
    email?: string;
    firstname?: string;
    lastname?: string;
  } | null> {
    try {
      // Query users by external ID
      // Note: This requires scanning users, which may be slow for large tenants
      // Consider adding an index or using a separate mapping table for better performance
      // Cosmos DB ARRAY_CONTAINS with nested objects requires matching the exact object structure
      const query = `
        SELECT c.id, c.email, c.firstname, c.lastname, c.externalUserIds
        FROM c
        WHERE c.tenantId = @tenantId
        AND EXISTS(
          SELECT VALUE ext FROM ext IN c.externalUserIds
          WHERE ext.integrationId = @integrationId
          AND ext.externalUserId = @externalUserId
        )
      `;

      const { resources } = await this.userContainer.items
        .query<User>({
          query,
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@integrationId', value: integrationId },
            { name: '@externalUserId', value: externalUserId },
          ],
        })
        .fetchAll();

      if (resources.length === 0) {
        return null;
      }

      const user = resources[0];
      return {
        userId: user.id,
        email: user.email,
        firstname: user.firstName,
        lastname: user.lastName,
      };
    } catch (error) {
      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'external-user-id.get-user-by-external-id',
        tenantId,
        integrationId,
        externalUserId,
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
    updates: UpdateExternalUserIdInput
  ): Promise<void> {
    try {
      const { resource: user } = await this.userContainer
        .item(userId, tenantId)
        .read<User>();

      if (!user) {
        throw new Error('User not found');
      }

      const externalUserIds = user.externalUserIds || [];
      const existingIndex = externalUserIds.findIndex(
        (ext) => ext.integrationId === integrationId
      );

      if (existingIndex < 0) {
        throw new Error('External user ID not found');
      }

      // Update existing entry
      const existing = externalUserIds[existingIndex];
      externalUserIds[existingIndex] = {
        ...existing,
        ...(updates.externalUserId !== undefined && { externalUserId: updates.externalUserId }),
        ...(updates.integrationName !== undefined && { integrationName: updates.integrationName }),
        ...(updates.connectionId !== undefined && { connectionId: updates.connectionId }),
        ...(updates.status !== undefined && { status: updates.status }),
        ...(updates.lastSyncedAt !== undefined && { lastSyncedAt: updates.lastSyncedAt }),
        metadata: {
          ...existing.metadata,
          ...(updates.metadata || {}),
        },
      };

      // Update user document
      const updatedUser: User = {
        ...user,
        externalUserIds,
        updatedAt: new Date(),
      };

      await this.userContainer
        .item(userId, tenantId)
        .replace(updatedUser);

      // Log audit event
      if (this.auditLogService) {
        await this.auditLogService.log({
          tenantId,
          actorId: 'system',
          actorEmail: 'system@castiel',
          actorType: 'system',
          category: AuditCategory.SYSTEM, // Use SYSTEM category as integration is not available
          eventType: AuditEventType.USER_UPDATE, // Use closest matching event type
          outcome: AuditOutcome.SUCCESS,
          targetId: userId,
          targetType: 'user',
          targetName: user.email,
          message: `Updated external user ID for integration ${integrationId}`,
          details: {
            integrationId,
            updates,
          },
        }).catch((err) => {
          this.monitoring.trackException(err, {
            operation: 'external-user-id.audit-log',
            userId,
            integrationId,
          });
        });
      }

      this.monitoring.trackEvent('external_user_id.updated', {
        userId,
        tenantId,
        integrationId,
      });
    } catch (error) {
      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'external-user-id.update',
        userId,
        tenantId,
        integrationId,
      });
      throw error;
    }
  }

  /**
   * Remove external user ID
   */
  async removeExternalUserId(
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

      // Update user document
      const updatedUser: User = {
        ...user,
        externalUserIds: filtered.length > 0 ? filtered : undefined,
        updatedAt: new Date(),
      };

      await this.userContainer
        .item(userId, tenantId)
        .replace(updatedUser);

      // Log audit event
      if (this.auditLogService) {
        await this.auditLogService.log({
          tenantId,
          actorId: 'system',
          actorEmail: 'system@castiel',
          actorType: 'system',
          category: AuditCategory.SYSTEM, // Use SYSTEM category as integration is not available
          eventType: AuditEventType.USER_DELETE, // Use closest matching event type
          outcome: AuditOutcome.SUCCESS,
          targetId: userId,
          targetType: 'user',
          targetName: user.email,
          message: `Removed external user ID for integration ${integrationId}`,
          details: {
            integrationId,
          },
        }).catch((err) => {
          this.monitoring.trackException(err, {
            operation: 'external-user-id.audit-log',
            userId,
            integrationId,
          });
        });
      }

      this.monitoring.trackEvent('external_user_id.removed', {
        userId,
        tenantId,
        integrationId,
      });
    } catch (error) {
      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'external-user-id.remove',
        userId,
        tenantId,
        integrationId,
      });
      throw error;
    }
  }

  /**
   * Sync external user ID from integration connection
   */
  async syncExternalUserIdFromConnection(
    userId: string,
    tenantId: string,
    integrationId: string,
    connectionId: string
  ): Promise<void> {
    try {
      if (!this.adapterManager || !this.integrationRepository) {
        throw new Error('Adapter manager and integration repository required for sync');
      }

      // Get integration
      const integration = await this.integrationRepository.findById(integrationId, tenantId);
      if (!integration) {
        throw new Error('Integration not found');
      }

      // Get adapter
      const adapter = await this.adapterManager.getAdapter(
        integration.providerName,
        integration,
        integration.userScoped ? userId : undefined
      );

      if (!adapter || !adapter.getUserProfile) {
        throw new Error('Adapter does not support getUserProfile');
      }

      // Get user profile from adapter
      const userProfile = await adapter.getUserProfile();

      if (!userProfile || !userProfile.id) {
        throw new Error('Failed to retrieve external user ID from integration');
      }

      // Get integration name
      const integrationName = integration.name || integration.providerName;

      // Store external user ID
      await this.storeExternalUserId(userId, tenantId, {
        integrationId,
        externalUserId: userProfile.id,
        integrationName,
        connectionId,
        metadata: {
          email: userProfile.email,
          name: userProfile.name,
          ...userProfile,
        },
        status: ExternalUserIdStatus.ACTIVE,
      });

      this.monitoring.trackEvent('external_user_id.synced', {
        userId,
        tenantId,
        integrationId,
        connectionId,
      });
    } catch (error) {
      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'external-user-id.sync',
        userId,
        tenantId,
        integrationId,
        connectionId,
      });
      throw error;
    }
  }

  /**
   * Check if external user ID already exists for another user (conflict detection)
   */
  async checkConflict(
    tenantId: string,
    integrationId: string,
    externalUserId: string,
    excludeUserId?: string
  ): Promise<{ exists: boolean; userId?: string; email?: string }> {
    try {
      const query = `
        SELECT c.id, c.email, c.externalUserIds
        FROM c
        WHERE c.tenantId = @tenantId
          AND IS_DEFINED(c.externalUserIds)
          AND ARRAY_LENGTH(c.externalUserIds) > 0
      `;

      const { resources: users } = await this.userContainer.items
        .query<User>({
          query,
          parameters: [{ name: '@tenantId', value: tenantId }],
        })
        .fetchAll();

      for (const user of users) {
        if (excludeUserId && user.id === excludeUserId) {
          continue;
        }

        const matching = user.externalUserIds?.find(
          (ext) =>
            ext.integrationId === integrationId &&
            ext.externalUserId === externalUserId
        );

        if (matching) {
          return {
            exists: true,
            userId: user.id,
            email: user.email,
          };
        }
      }

      return { exists: false };
    } catch (error) {
      this.monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
        operation: 'external-user-id.check-conflict',
        tenantId,
        integrationId,
        externalUserId,
      });
      throw error;
    }
  }
}


