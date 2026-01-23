/**
 * Integration Service
 * Handles tenant integration instance management
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { ServiceClient } from '@coder/shared/services';
import { BadRequestError, NotFoundError, ForbiddenError } from '@coder/shared/utils/errors';
import {
  Integration,
  CreateIntegrationInput,
  UpdateIntegrationInput,
  IntegrationStatus,
  ConflictResolutionMode,
  SyncDirection,
} from '../types/integration.types';

export class IntegrationService {
  private containerName = 'integration_integrations';
  private secretManagementClient: ServiceClient;

  constructor(secretManagementUrl: string) {
    this.secretManagementClient = new ServiceClient({
      baseUrl: secretManagementUrl,
      timeout: 10000,
      retries: 2,
    });
  }

  /**
   * Create a new integration
   */
  async create(input: CreateIntegrationInput): Promise<Integration> {
    if (!input.tenantId) {
      throw new BadRequestError('tenantId is required');
    }
    if (!input.integrationId) {
      throw new BadRequestError('integrationId is required');
    }
    if (!input.name) {
      throw new BadRequestError('name is required');
    }
    if (!input.credentialSecretName) {
      throw new BadRequestError('credentialSecretName is required');
    }

    // TODO: Verify integration provider exists
    // TODO: Verify credential exists in Secret Management

    const integration: Integration = {
      id: uuidv4(),
      tenantId: input.tenantId,
      integrationId: input.integrationId,
      providerName: '', // Will be populated from provider lookup
      name: input.name,
      description: input.description,
      credentialSecretName: input.credentialSecretName,
      authMethod: input.authMethod,
      instanceUrl: input.instanceUrl,
      settings: input.settings || {},
      syncConfig: input.syncConfig
        ? {
            ...input.syncConfig,
            conflictResolution:
              input.syncConfig.conflictResolution || ConflictResolutionMode.LAST_WRITE_WINS,
          }
        : undefined,
      userScoped: input.userScoped,
      allowedShardTypes: input.allowedShardTypes,
      searchEnabled: input.searchEnabled,
      searchableEntities: input.searchableEntities,
      status: IntegrationStatus.PENDING,
      enabledAt: new Date(),
      enabledBy: input.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(integration, {
        partitionKey: input.tenantId,
      });

      if (!resource) {
        throw new Error('Failed to create integration');
      }

      return resource as Integration;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Integration with this name already exists');
      }
      throw error;
    }
  }

  /**
   * Get integration by ID
   */
  async getById(integrationId: string, tenantId: string): Promise<Integration> {
    if (!integrationId || !tenantId) {
      throw new BadRequestError('integrationId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(integrationId, tenantId).read<Integration>();

      if (!resource) {
        throw new NotFoundError(`Integration ${integrationId} not found`);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError(`Integration ${integrationId} not found`);
      }
      throw error;
    }
  }

  /**
   * Update integration
   */
  async update(
    integrationId: string,
    tenantId: string,
    input: UpdateIntegrationInput
  ): Promise<Integration> {
    const existing = await this.getById(integrationId, tenantId);

    const updated: Integration = {
      ...existing,
      ...input,
      settings: input.settings || existing.settings,
      syncConfig: input.syncConfig || existing.syncConfig,
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(integrationId, tenantId).replace(updated);

      if (!resource) {
        throw new Error('Failed to update integration');
      }

      return resource as Integration;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError(`Integration ${integrationId} not found`);
      }
      throw error;
    }
  }

  /**
   * Delete integration
   */
  async delete(integrationId: string, tenantId: string): Promise<void> {
    const existing = await this.getById(integrationId, tenantId);

    // Deactivate instead of deleting
    await this.update(integrationId, tenantId, {
      status: IntegrationStatus.DISABLED,
    });
  }

  /**
   * List integrations
   */
  async list(
    tenantId: string,
    filters?: {
      providerName?: string;
      status?: IntegrationStatus;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: Integration[]; continuationToken?: string }> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.providerName) {
      query += ' AND c.providerName = @providerName';
      parameters.push({ name: '@providerName', value: filters.providerName });
    }

    if (filters?.status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: filters.status });
    }

    query += ' ORDER BY c.createdAt DESC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<Integration>({
          query,
          parameters,
        })
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to list integrations: ${error.message}`);
    }
  }

  /**
   * Test connection
   */
  async testConnection(integrationId: string, tenantId: string): Promise<{
    success: boolean;
    message?: string;
    connectionStatus?: string;
  }> {
    const integration = await this.getById(integrationId, tenantId);

    // TODO: Implement actual connection test
    // This would involve:
    // 1. Retrieve credentials from Secret Management
    // 2. Attempt to connect to external system
    // 3. Update connection status

    return {
      success: true,
      message: 'Connection test not yet implemented',
      connectionStatus: 'active',
    };
  }
}

