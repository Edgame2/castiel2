/**
 * Integration Provider Service
 * Handles integration provider catalog management
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { IntegrationProvider } from '../types/integration.types';

export class IntegrationProviderService {
  private containerName = 'integration_providers';

  /**
   * Create a new integration provider
   */
  async create(input: {
    category: string;
    provider: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    authMethods: string[];
    supportedEntities: string[];
    requiresUserScoping?: boolean;
    webhookSupport: boolean;
    documentationUrl?: string;
    createdBy: string;
  }): Promise<IntegrationProvider> {
    if (!input.category) {
      throw new BadRequestError('category is required');
    }
    if (!input.provider) {
      throw new BadRequestError('provider is required');
    }
    if (!input.name) {
      throw new BadRequestError('name is required');
    }

    const provider: IntegrationProvider = {
      id: uuidv4(),
      category: input.category,
      provider: input.provider,
      name: input.name,
      description: input.description,
      icon: input.icon,
      color: input.color,
      authMethods: input.authMethods as any,
      supportedEntities: input.supportedEntities,
      requiresUserScoping: input.requiresUserScoping || false,
      webhookSupport: input.webhookSupport,
      documentationUrl: input.documentationUrl,
      isSystem: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: input.createdBy,
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(provider, {
        partitionKey: input.category,
      });

      if (!resource) {
        throw new Error('Failed to create integration provider');
      }

      return resource as IntegrationProvider;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Integration provider with this provider name already exists');
      }
      throw error;
    }
  }

  /**
   * Get provider by ID
   */
  async getById(providerId: string, category: string): Promise<IntegrationProvider> {
    if (!providerId || !category) {
      throw new BadRequestError('providerId and category are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(providerId, category).read<IntegrationProvider>();

      if (!resource) {
        throw new NotFoundError(`Integration provider ${providerId} not found`);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError(`Integration provider ${providerId} not found`);
      }
      throw error;
    }
  }

  /**
   * Get provider by provider name
   */
  async getByProviderName(provider: string): Promise<IntegrationProvider | null> {
    if (!provider) {
      throw new BadRequestError('provider is required');
    }

    const container = getContainer(this.containerName);
    const { resources } = await container.items
      .query<IntegrationProvider>({
        query: 'SELECT * FROM c WHERE c.provider = @provider AND c.isActive = true',
        parameters: [{ name: '@provider', value: provider }],
      })
      .fetchAll();

    return resources.length > 0 ? resources[0] : null;
  }

  /**
   * List providers
   */
  async list(filters?: {
    category?: string;
    isActive?: boolean;
    limit?: number;
  }): Promise<IntegrationProvider[]> {
    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE 1=1';
    const parameters: any[] = [];

    if (filters?.category) {
      query += ' AND c.category = @category';
      parameters.push({ name: '@category', value: filters.category });
    }

    if (filters?.isActive !== undefined) {
      query += ' AND c.isActive = @isActive';
      parameters.push({ name: '@isActive', value: filters.isActive });
    } else {
      query += ' AND c.isActive = true';
    }

    query += ' ORDER BY c.category ASC, c.name ASC';

    const limit = filters?.limit || 100;

    try {
      const { resources } = await container.items
        .query<IntegrationProvider>({
          query,
          parameters,
        })
        .fetchAll();

      return resources.slice(0, limit);
    } catch (error: any) {
      throw new Error(`Failed to list integration providers: ${error.message}`);
    }
  }

  /**
   * Update provider
   */
  async update(
    providerId: string,
    category: string,
    input: {
      name?: string;
      description?: string;
      icon?: string;
      color?: string;
      authMethods?: string[];
      supportedEntities?: string[];
      webhookSupport?: boolean;
      documentationUrl?: string;
      isActive?: boolean;
    }
  ): Promise<IntegrationProvider> {
    const existing = await this.getById(providerId, category);

    if (existing.isSystem) {
      throw new BadRequestError('Cannot update system integration provider');
    }

    const updated: IntegrationProvider = {
      ...existing,
      ...input,
      authMethods: input.authMethods || existing.authMethods,
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(providerId, category).replace(updated);

      if (!resource) {
        throw new Error('Failed to update integration provider');
      }

      return resource as IntegrationProvider;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError(`Integration provider ${providerId} not found`);
      }
      throw error;
    }
  }

  /**
   * Delete provider (deactivate)
   */
  async delete(providerId: string, category: string): Promise<void> {
    const existing = await this.getById(providerId, category);

    if (existing.isSystem) {
      throw new BadRequestError('Cannot delete system integration provider');
    }

    await this.update(providerId, category, {
      isActive: false,
    });
  }
}

