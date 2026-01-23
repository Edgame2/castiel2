import { Container, CosmosClient, SqlQuerySpec } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';
import {
  IntegrationProviderDocument,
  IntegrationDocument,
  IntegrationConnection,
  ConnectionStatus,
} from '../types/integration.types.js';

/**
 * Integration Provider Repository
 * Manages system-level integration provider definitions
 */
export class IntegrationProviderRepository {
  private container: Container;

  constructor(client: CosmosClient, databaseId: string, containerId: string = 'integration_providers') {
    this.container = client.database(databaseId).container(containerId);
  }

  /**
   * Create integration provider
   */
  async create(input: Omit<IntegrationProviderDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<IntegrationProviderDocument> {
    const now = new Date();
    const provider: IntegrationProviderDocument = {
      id: uuidv4(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    const { resource } = await this.container.items.create(provider);
    return resource as IntegrationProviderDocument;
  }

  /**
   * Update integration provider
   */
  async update(
    id: string,
    category: string,
    input: Partial<Omit<IntegrationProviderDocument, 'id' | 'category' | 'createdAt' | 'createdBy'>> & { updatedBy: string }
  ): Promise<IntegrationProviderDocument | null> {
    const existing = await this.findById(id, category);
    if (!existing) {return null;}

    const updated: IntegrationProviderDocument = {
      ...existing,
      ...input,
      updatedAt: new Date(),
    };

    const { resource } = await this.container
      .item(id, category)
      .replace(updated);
    return resource as IntegrationProviderDocument;
  }

  /**
   * Delete integration provider
   */
  async delete(id: string, category: string): Promise<boolean> {
    try {
      await this.container.item(id, category).delete();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Find by ID
   */
  async findById(id: string, category: string): Promise<IntegrationProviderDocument | null> {
    try {
      const { resource } = await this.container.item(id, category).read<IntegrationProviderDocument>();
      return resource || null;
    } catch {
      return null;
    }
  }

  /**
   * Find by provider name and category
   */
  async findByProvider(category: string, provider: string): Promise<IntegrationProviderDocument | null> {
    const query: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.category = @category AND c.provider = @provider',
      parameters: [
        { name: '@category', value: category },
        { name: '@provider', value: provider },
      ],
    };

    const { resources } = await this.container.items.query<IntegrationProviderDocument>(query).fetchAll();
    return resources[0] || null;
  }

  /**
   * Find by provider ID (searches across all categories)
   */
  async findByIdAcrossCategories(id: string): Promise<IntegrationProviderDocument | null> {
    const query: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.id = @id',
      parameters: [{ name: '@id', value: id }],
    };

    const { resources } = await this.container.items.query<IntegrationProviderDocument>(query).fetchAll();
    return resources[0] || null;
  }

  /**
   * Find by provider name (searches across all categories)
   */
  async findByProviderName(provider: string): Promise<IntegrationProviderDocument | null> {
    const query: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.provider = @provider',
      parameters: [{ name: '@provider', value: provider }],
    };

    const { resources } = await this.container.items.query<IntegrationProviderDocument>(query).fetchAll();
    return resources[0] || null;
  }

  /**
   * List integration providers
   */
  async list(options: {
    category?: string;
    status?: 'active' | 'beta' | 'deprecated' | 'disabled';
    audience?: 'system' | 'tenant';
    supportsSearch?: boolean;
    supportsNotifications?: boolean;
    requiresUserScoping?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ providers: IntegrationProviderDocument[]; total: number; hasMore: boolean }> {
    const { category, status, audience, supportsSearch, supportsNotifications, requiresUserScoping, limit = 50, offset = 0 } = options;

    const conditions: string[] = [];
    const parameters: { name: string; value: any }[] = [];

    if (category) {
      conditions.push('c.category = @category');
      parameters.push({ name: '@category', value: category });
    }

    if (status) {
      conditions.push('c.status = @status');
      parameters.push({ name: '@status', value: status });
    }

    if (audience) {
      conditions.push('c.audience = @audience');
      parameters.push({ name: '@audience', value: audience });
    }

    if (supportsSearch !== undefined) {
      conditions.push('c.supportsSearch = @supportsSearch');
      parameters.push({ name: '@supportsSearch', value: supportsSearch });
    }

    if (supportsNotifications !== undefined) {
      conditions.push('c.supportsNotifications = @supportsNotifications');
      parameters.push({ name: '@supportsNotifications', value: supportsNotifications });
    }

    if (requiresUserScoping !== undefined) {
      conditions.push('c.requiresUserScoping = @requiresUserScoping');
      parameters.push({ name: '@requiresUserScoping', value: requiresUserScoping });
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countQuery: SqlQuerySpec = {
      query: `SELECT VALUE COUNT(1) FROM c ${whereClause}`,
      parameters,
    };
    const { resources: countResult } = await this.container.items.query<number>(countQuery).fetchAll();
    const total = countResult[0] || 0;

    // Data query
    const dataQuery: SqlQuerySpec = {
      query: `SELECT * FROM c ${whereClause} ORDER BY c.displayName OFFSET ${offset} LIMIT ${limit}`,
      parameters,
    };
    const { resources } = await this.container.items.query<IntegrationProviderDocument>(dataQuery).fetchAll();

    return {
      providers: resources,
      total,
      hasMore: offset + resources.length < total,
    };
  }
}

/**
 * Integration Repository
 * Manages tenant-specific integration instances
 */
export class IntegrationRepository {
  private container: Container;

  constructor(client: CosmosClient, databaseId: string, containerId: string = 'integrations') {
    this.container = client.database(databaseId).container(containerId);
  }

  /**
   * Create integration instance
   */
  async create(input: Omit<IntegrationDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<IntegrationDocument> {
    const now = new Date();
    const integration: IntegrationDocument = {
      id: uuidv4(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    const { resource } = await this.container.items.create(integration);
    return resource as IntegrationDocument;
  }

  /**
   * Update integration instance
   */
  async update(
    id: string,
    tenantId: string,
    input: Partial<Omit<IntegrationDocument, 'id' | 'tenantId' | 'createdAt' | 'enabledAt' | 'enabledBy'>>
  ): Promise<IntegrationDocument | null> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {return null;}

    const updated: IntegrationDocument = {
      ...existing,
      ...input,
      updatedAt: new Date(),
    };

    const { resource } = await this.container
      .item(id, tenantId)
      .replace(updated);
    return resource as IntegrationDocument;
  }

  /**
   * Delete integration instance
   */
  async delete(id: string, tenantId: string): Promise<boolean> {
    try {
      await this.container.item(id, tenantId).delete();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Find by ID
   */
  async findById(id: string, tenantId: string): Promise<IntegrationDocument | null> {
    try {
      const { resource } = await this.container.item(id, tenantId).read<IntegrationDocument>();
      return resource || null;
    } catch {
      return null;
    }
  }

  /**
   * Find by provider name and instance name
   */
  async findByProviderAndName(
    tenantId: string,
    providerName: string,
    name: string
  ): Promise<IntegrationDocument | null> {
    const query: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.providerName = @providerName AND c.name = @name',
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@providerName', value: providerName },
        { name: '@name', value: name },
      ],
    };

    const { resources } = await this.container.items.query<IntegrationDocument>(query).fetchAll();
    return resources[0] || null;
  }

  /**
   * List integrations for tenant
   */
  async list(options: {
    tenantId: string;
    providerName?: string;
    status?: 'pending' | 'connected' | 'error' | 'disabled';
    searchEnabled?: boolean;
    userScoped?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ integrations: IntegrationDocument[]; total: number; hasMore: boolean }> {
    const { tenantId, providerName, status, searchEnabled, userScoped, limit = 50, offset = 0 } = options;

    const conditions: string[] = ['c.tenantId = @tenantId'];
    const parameters: { name: string; value: any }[] = [
      { name: '@tenantId', value: tenantId },
    ];

    if (providerName) {
      conditions.push('c.providerName = @providerName');
      parameters.push({ name: '@providerName', value: providerName });
    }

    if (status) {
      conditions.push('c.status = @status');
      parameters.push({ name: '@status', value: status });
    }

    if (searchEnabled !== undefined) {
      conditions.push('c.searchEnabled = @searchEnabled');
      parameters.push({ name: '@searchEnabled', value: searchEnabled });
    }

    if (userScoped !== undefined) {
      conditions.push('c.userScoped = @userScoped');
      parameters.push({ name: '@userScoped', value: userScoped });
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Count query
    const countQuery: SqlQuerySpec = {
      query: `SELECT VALUE COUNT(1) FROM c ${whereClause}`,
      parameters,
    };
    const { resources: countResult } = await this.container.items.query<number>(countQuery).fetchAll();
    const total = countResult[0] || 0;

    // Data query
    const dataQuery: SqlQuerySpec = {
      query: `SELECT * FROM c ${whereClause} ORDER BY c.name OFFSET ${offset} LIMIT ${limit}`,
      parameters,
    };
    const { resources } = await this.container.items.query<IntegrationDocument>(dataQuery).fetchAll();

    return {
      integrations: resources,
      total,
      hasMore: offset + resources.length < total,
    };
  }
}

/**
 * Integration Connection Repository
 * Manages connection credentials (system/tenant/user-scoped)
 */
export class IntegrationConnectionRepository {
  private container: Container;

  constructor(client: CosmosClient, databaseId: string, containerId: string = 'integration-connections') {
    this.container = client.database(databaseId).container(containerId);
  }

  /**
   * Create connection
   */
  async create(input: Omit<IntegrationConnection, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<IntegrationConnection> {
    const now = new Date();
    const connection: IntegrationConnection = {
      id: input.id || uuidv4(),
      usageCount: input.usageCount ?? 0, // Initialize to 0 if not provided
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    const { resource } = await this.container.items.create(connection);
    return resource as IntegrationConnection;
  }

  /**
   * Update connection
   */
  async update(
    id: string,
    integrationId: string,
    input: Partial<Omit<IntegrationConnection, 'id' | 'integrationId' | 'scope' | 'tenantId' | 'userId' | 'createdAt' | 'createdBy'>>
  ): Promise<IntegrationConnection | null> {
    const existing = await this.findById(id, integrationId);
    if (!existing) {return null;}

    const updated: IntegrationConnection = {
      ...existing,
      ...input,
      updatedAt: new Date(),
    };

    const { resource } = await this.container
      .item(id, integrationId)
      .replace(updated);
    return resource as IntegrationConnection;
  }

  /**
   * Delete connection
   */
  async delete(id: string, integrationId: string): Promise<boolean> {
    try {
      await this.container.item(id, integrationId).delete();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Find by ID
   */
  async findById(id: string, integrationId: string): Promise<IntegrationConnection | null> {
    try {
      const { resource } = await this.container.item(id, integrationId).read<IntegrationConnection>();
      return resource || null;
    } catch {
      return null;
    }
  }

  /**
   * Find connection for integration by scope
   */
  async findByIntegration(
    integrationId: string,
    scope: 'system' | 'tenant' | 'user',
    tenantId?: string,
    userId?: string
  ): Promise<IntegrationConnection | null> {
    const conditions: string[] = ['c.integrationId = @integrationId', 'c.scope = @scope'];
    const parameters: { name: string; value: any }[] = [
      { name: '@integrationId', value: integrationId },
      { name: '@scope', value: scope },
    ];

    if (scope === 'tenant' || scope === 'user') {
      if (!tenantId) {throw new Error('tenantId is required for tenant or user scope');}
      conditions.push('c.tenantId = @tenantId');
      parameters.push({ name: '@tenantId', value: tenantId });
    }

    if (scope === 'user') {
      if (!userId) {throw new Error('userId is required for user scope');}
      conditions.push('c.userId = @userId');
      parameters.push({ name: '@userId', value: userId });
    }

    const query: SqlQuerySpec = {
      query: `SELECT * FROM c WHERE ${conditions.join(' AND ')}`,
      parameters,
    };

    const { resources } = await this.container.items.query<IntegrationConnection>(query).fetchAll();
    return resources[0] || null;
  }

  /**
   * Find all user-scoped connections for an integration
   */
  async findUserScoped(
    integrationId: string,
    tenantId: string,
    userId?: string
  ): Promise<IntegrationConnection[]> {
    const conditions: string[] = [
      'c.integrationId = @integrationId',
      'c.scope = @scope',
      'c.tenantId = @tenantId',
    ];
    const parameters: { name: string; value: any }[] = [
      { name: '@integrationId', value: integrationId },
      { name: '@scope', value: 'user' },
      { name: '@tenantId', value: tenantId },
    ];

    if (userId) {
      conditions.push('c.userId = @userId');
      parameters.push({ name: '@userId', value: userId });
    }

    const query: SqlQuerySpec = {
      query: `SELECT * FROM c WHERE ${conditions.join(' AND ')}`,
      parameters,
    };

    const { resources } = await this.container.items.query<IntegrationConnection>(query).fetchAll();
    return resources;
  }

  /**
   * Find all user-scoped connections for a tenant/user (across all integrations)
   */
  async findAllUserConnections(
    tenantId: string,
    userId: string
  ): Promise<IntegrationConnection[]> {
    const query: SqlQuerySpec = {
      query: `SELECT * FROM c WHERE c.scope = @scope AND c.tenantId = @tenantId AND c.userId = @userId`,
      parameters: [
        { name: '@scope', value: 'user' },
        { name: '@tenantId', value: tenantId },
        { name: '@userId', value: userId },
      ],
    };

    const { resources } = await this.container.items.query<IntegrationConnection>(query).fetchAll();
    return resources;
  }

  /**
   * Find system-wide connection
   */
  async findSystemConnection(integrationId: string): Promise<IntegrationConnection | null> {
    return this.findByIntegration(integrationId, 'system');
  }

  /**
   * Update OAuth tokens
   */
  async updateOAuthTokens(
    id: string,
    integrationId: string,
    oauth: IntegrationConnection['oauth']
  ): Promise<IntegrationConnection | null> {
    return this.update(id, integrationId, { oauth, lastValidatedAt: new Date() });
  }

  /**
   * Mark connection as expired
   */
  async markExpired(id: string, integrationId: string): Promise<IntegrationConnection | null> {
    return this.update(id, integrationId, { status: 'expired' });
  }
}
