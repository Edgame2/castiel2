/**
 * Integration Catalog Repository
 * 
 * Manages integration catalog entries and visibility rules.
 * Stores catalog definitions managed by super admins.
 */

import { Container, CosmosClient, SqlQuerySpec } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';
import {
  IntegrationCatalogEntry,
  CreateIntegrationCatalogInput,
  UpdateIntegrationCatalogInput,
  CatalogListOptions,
  CatalogListResult,
  IntegrationVisibilityRule,
  CreateVisibilityRuleInput,
  UpdateVisibilityRuleInput,
} from '../types/integration.types.js';

/**
 * Integration Catalog Repository
 * Manages system-wide integration catalog
 */
export class IntegrationCatalogRepository {
  private catalogContainer: Container;
  private visibilityContainer: Container;

  constructor(
    client: CosmosClient,
    databaseId: string,
    catalogContainerId: string = 'integration_catalog',
    visibilityContainerId: string = 'integration_visibility'
  ) {
    this.catalogContainer = client.database(databaseId).container(catalogContainerId);
    this.visibilityContainer = client.database(databaseId).container(visibilityContainerId);
  }

  /**
   * Ensure containers exist
   */
  static async ensureContainers(
    client: CosmosClient,
    databaseId: string,
    catalogContainerId: string = 'integration_catalog',
    visibilityContainerId: string = 'integration_visibility'
  ): Promise<{ catalog: Container; visibility: Container }> {
    const database = client.database(databaseId);

    // Catalog container
    const { container: catalogContainer } = await database.containers.createIfNotExists({
      id: catalogContainerId,
      partitionKey: { paths: ['/category'] },
      indexingPolicy: {
        automatic: true,
        indexingMode: 'consistent',
        includedPaths: [{ path: '/*' }],
        excludedPaths: [{ path: '/"_etag"/?' }],
      },
    });

    // Visibility container
    const { container: visibilityContainer } = await database.containers.createIfNotExists({
      id: visibilityContainerId,
      partitionKey: { paths: ['/tenantId'] },
      indexingPolicy: {
        automatic: true,
        indexingMode: 'consistent',
        includedPaths: [{ path: '/*' }],
        excludedPaths: [{ path: '/"_etag"/?' }],
      },
    });

    return { catalog: catalogContainer, visibility: visibilityContainer };
  }

  // ============================================
  // Catalog Entry CRUD
  // ============================================

  /**
   * Create catalog entry
   */
  async createCatalogEntry(input: CreateIntegrationCatalogInput): Promise<IntegrationCatalogEntry> {
    const now = new Date();
    const entry: IntegrationCatalogEntry = {
      id: uuidv4(),
      ...input,
      icon: input.icon || 'plug',
      color: input.color || '#6b7280',
      requiresApproval: input.requiresApproval || false,
      beta: input.beta || false,
      deprecated: input.deprecated || false,
      supportsRealtime: input.supportsRealtime || false,
      supportsWebhooks: input.supportsWebhooks || false,
      rateLimit: input.rateLimit || { requestsPerMinute: 100, requestsPerHour: 5000 },
      status: input.status || 'active',
      version: input.version || '1.0.0',
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy || 'system',
      updatedBy: input.createdBy || 'system', // Use createdBy as default for updatedBy
    };

    const { resource } = await this.catalogContainer.items.create(entry);
    return resource as IntegrationCatalogEntry;
  }

  /**
   * Get catalog entry by ID
   */
  async getCatalogEntry(id: string, category: string): Promise<IntegrationCatalogEntry | null> {
    try {
      const { resource } = await this.catalogContainer.item(id, category).read();
      return (resource as IntegrationCatalogEntry) || null;
    } catch (error: any) {
      if (error.code === 404) {return null;}
      throw error;
    }
  }

  /**
   * Get catalog entry by integration ID
   */
  async getCatalogEntryByIntegrationId(integrationId: string): Promise<IntegrationCatalogEntry | null> {
    const query = `
      SELECT * FROM c 
      WHERE c.integrationId = @integrationId
      LIMIT 1
    `;
    const { resources } = await this.catalogContainer.items
      .query<IntegrationCatalogEntry>({
        query,
        parameters: [{ name: '@integrationId', value: integrationId }],
      })
      .fetchAll();

    return resources.length > 0 ? resources[0] : null;
  }

  /**
   * List catalog entries
   */
  async listCatalogEntries(options?: CatalogListOptions): Promise<CatalogListResult> {
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;
    const filter = options?.filter;

    let query = 'SELECT * FROM c WHERE 1=1';
    const parameters: { name: string; value: any }[] = [];

    if (filter?.category) {
      query += ' AND c.category = @category';
      parameters.push({ name: '@category', value: filter.category });
    }

    if (filter?.visibility) {
      query += ' AND c.visibility = @visibility';
      parameters.push({ name: '@visibility', value: filter.visibility });
    }

    if (filter?.status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: filter.status });
    }

    if (filter?.requiredPlan) {
      query += ' AND c.requiredPlan = @requiredPlan';
      parameters.push({ name: '@requiredPlan', value: filter.requiredPlan });
    }

    if (filter?.beta !== undefined) {
      query += ' AND c.beta = @beta';
      parameters.push({ name: '@beta', value: filter.beta });
    }

    if (filter?.deprecated !== undefined) {
      query += ' AND c.deprecated = @deprecated';
      parameters.push({ name: '@deprecated', value: filter.deprecated });
    }

    if (filter?.searchTerm) {
      const searchLower = filter.searchTerm.toLowerCase();
      query += ' AND (CONTAINS(LOWER(c.name), @searchTerm) OR CONTAINS(LOWER(c.displayName), @searchTerm))';
      parameters.push({ name: '@searchTerm', value: searchLower });
    }

    // Get total count
    const countQuery = `SELECT VALUE COUNT(1) FROM (${query.replace('SELECT *', 'SELECT 1')})`;
    const countResult = await this.catalogContainer.items
      .query<number>({
        query: countQuery,
        parameters,
      })
      .fetchAll();
    const total = countResult.resources[0] || 0;

    // Get paginated results
    query += ' ORDER BY c.displayName ASC OFFSET @offset LIMIT @limit';
    parameters.push(
      { name: '@offset', value: offset },
      { name: '@limit', value: limit }
    );

    const { resources } = await this.catalogContainer.items
      .query<IntegrationCatalogEntry>({
        query,
        parameters,
      })
      .fetchAll();

    return {
      entries: resources,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Update catalog entry
   */
  async updateCatalogEntry(
    id: string,
    category: string,
    input: UpdateIntegrationCatalogInput
  ): Promise<IntegrationCatalogEntry | null> {
    const existing = await this.getCatalogEntry(id, category);
    if (!existing) {return null;}

    const updated: IntegrationCatalogEntry = {
      ...existing,
      ...input,
      updatedAt: new Date(),
    };

    const { resource } = await this.catalogContainer.item(id, category).replace(updated);
    return resource as IntegrationCatalogEntry;
  }

  /**
   * Delete catalog entry
   */
  async deleteCatalogEntry(id: string, category: string): Promise<boolean> {
    try {
      await this.catalogContainer.item(id, category).delete();
      return true;
    } catch (error: any) {
      if (error.code === 404) {return false;}
      throw error;
    }
  }

  /**
   * Deprecate integration (soft delete)
   */
  async deprecateCatalogEntry(id: string, category: string, updatedBy: string): Promise<IntegrationCatalogEntry | null> {
    return this.updateCatalogEntry(id, category, {
      status: 'deprecated',
      deprecated: true,
      updatedBy,
    });
  }

  /**
   * Get integrations by category
   */
  async getCatalogEntriesByCategory(category: string): Promise<IntegrationCatalogEntry[]> {
    const query = 'SELECT * FROM c WHERE c.category = @category AND c.status != "deprecated"';
    const { resources } = await this.catalogContainer.items
      .query<IntegrationCatalogEntry>({
        query,
        parameters: [{ name: '@category', value: category }],
      })
      .fetchAll();
    return resources;
  }

  // ============================================
  // Visibility Rules CRUD
  // ============================================

  /**
   * Create visibility rule
   */
  async createVisibilityRule(input: CreateVisibilityRuleInput): Promise<IntegrationVisibilityRule> {
    const now = new Date();
    const rule: IntegrationVisibilityRule = {
      id: uuidv4(),
      ...input,
      isVisible: input.isVisible ?? true,
      isEnabled: input.isEnabled ?? true,
      requiresApproval: input.requiresApproval ?? false,
      isApproved: input.isApproved ?? true,
      createdAt: now,
      updatedAt: now,
    };

    const { resource } = await this.visibilityContainer.items.create(rule);
    return resource as IntegrationVisibilityRule;
  }

  /**
   * Get visibility rule
   */
  async getVisibilityRule(id: string, tenantId: string): Promise<IntegrationVisibilityRule | null> {
    try {
      const { resource } = await this.visibilityContainer.item(id, tenantId).read();
      return (resource as IntegrationVisibilityRule) || null;
    } catch (error: any) {
      if (error.code === 404) {return null;}
      throw error;
    }
  }

  /**
   * Get visibility rule by tenant and integration
   */
  async getVisibilityRuleByTenantAndIntegration(
    tenantId: string,
    integrationId: string
  ): Promise<IntegrationVisibilityRule | null> {
    const query = `
      SELECT * FROM c 
      WHERE c.tenantId = @tenantId AND c.integrationId = @integrationId
      LIMIT 1
    `;
    const { resources } = await this.visibilityContainer.items
      .query<IntegrationVisibilityRule>({
        query,
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@integrationId', value: integrationId },
        ],
      })
      .fetchAll();

    return resources.length > 0 ? resources[0] : null;
  }

  /**
   * List visibility rules for tenant
   */
  async listVisibilityRulesForTenant(tenantId: string): Promise<IntegrationVisibilityRule[]> {
    const query = 'SELECT * FROM c WHERE c.tenantId = @tenantId ORDER BY c.createdAt DESC';
    const { resources } = await this.visibilityContainer.items
      .query<IntegrationVisibilityRule>({
        query,
        parameters: [{ name: '@tenantId', value: tenantId }],
      })
      .fetchAll();
    return resources;
  }

  /**
   * List visibility rules for integration
   */
  async listVisibilityRulesForIntegration(integrationId: string): Promise<IntegrationVisibilityRule[]> {
    const query = 'SELECT * FROM c WHERE c.integrationId = @integrationId ORDER BY c.createdAt DESC';
    const { resources } = await this.visibilityContainer.items
      .query<IntegrationVisibilityRule>({
        query,
        parameters: [{ name: '@integrationId', value: integrationId }],
      })
      .fetchAll();
    return resources;
  }

  /**
   * Update visibility rule
   */
  async updateVisibilityRule(
    id: string,
    tenantId: string,
    input: UpdateVisibilityRuleInput
  ): Promise<IntegrationVisibilityRule | null> {
    const existing = await this.getVisibilityRule(id, tenantId);
    if (!existing) {return null;}

    const updated: IntegrationVisibilityRule = {
      ...existing,
      ...input,
      updatedAt: new Date(),
    };

    const { resource } = await this.visibilityContainer.item(id, tenantId).replace(updated);
    return resource as IntegrationVisibilityRule;
  }

  /**
   * Delete visibility rule
   */
  async deleteVisibilityRule(id: string, tenantId: string): Promise<boolean> {
    try {
      await this.visibilityContainer.item(id, tenantId).delete();
      return true;
    } catch (error: any) {
      if (error.code === 404) {return false;}
      throw error;
    }
  }

  /**
   * Approve integration for tenant
   */
  async approveIntegrationForTenant(
    id: string,
    tenantId: string,
    approvedBy: string
  ): Promise<IntegrationVisibilityRule | null> {
    const existing = await this.getVisibilityRule(id, tenantId);
    if (!existing) {return null;}

    const updated: IntegrationVisibilityRule = {
      ...existing,
      isApproved: true,
      approvedAt: new Date(),
      approvedBy,
      updatedAt: new Date(),
    };

    const { resource } = await this.visibilityContainer.item(id, tenantId).replace(updated);
    return resource as IntegrationVisibilityRule;
  }

  /**
   * Deny integration for tenant
   */
  async denyIntegrationForTenant(
    id: string,
    tenantId: string,
    denialReason: string,
    approvedBy: string
  ): Promise<IntegrationVisibilityRule | null> {
    const existing = await this.getVisibilityRule(id, tenantId);
    if (!existing) {return null;}

    const updated: IntegrationVisibilityRule = {
      ...existing,
      isApproved: false,
      deniedAt: new Date(),
      denialReason,
      approvedBy,
      updatedAt: new Date(),
    };

    const { resource } = await this.visibilityContainer.item(id, tenantId).replace(updated);
    return resource as IntegrationVisibilityRule;
  }

  /**
   * Get integrations with specific tier requirement
   */
  async getCatalogEntriesByPlan(requiredPlan: string): Promise<IntegrationCatalogEntry[]> {
    const query = `
      SELECT * FROM c 
      WHERE c.requiredPlan = @requiredPlan 
      AND c.status != "deprecated"
    `;
    const { resources } = await this.catalogContainer.items
      .query<IntegrationCatalogEntry>({
        query,
        parameters: [{ name: '@requiredPlan', value: requiredPlan }],
      })
      .fetchAll();
    return resources;
  }
}
