/**
 * Integration Catalog Repository
 * Manages integration catalog entries and visibility rules
 */

import { getContainer } from '@coder/shared';
import { v4 as uuidv4 } from 'uuid';
import { AuthMethod } from '../types/integration.types';
import {
  IntegrationCatalogEntry,
  CreateIntegrationCatalogInput,
  UpdateIntegrationCatalogInput,
  CatalogListOptions,
  CatalogListResult,
  IntegrationVisibilityRule,
  CreateVisibilityRuleInput,
  UpdateVisibilityRuleInput,
} from '../types/integration-catalog.types';

export class IntegrationCatalogRepository {
  /**
   * Create catalog entry
   */
  async createCatalogEntry(input: CreateIntegrationCatalogInput): Promise<IntegrationCatalogEntry> {
    const now = new Date();
    const id = uuidv4();
    const entry: IntegrationCatalogEntry = {
      id,
      integrationId: input.integrationId || id,
      category: input.category,
      provider: input.provider,
      name: input.name,
      description: input.description,
      icon: input.icon || 'plug',
      color: input.color || '#6b7280',
      authMethods: input.authMethods as AuthMethod[],
      supportedEntities: input.supportedEntities,
      requiresUserScoping: false,
      webhookSupport: input.webhookSupport || false,
      documentationUrl: input.documentationUrl,
      isSystem: input.visibility === 'superadmin_only',
      isActive: input.status !== 'disabled' && input.status !== 'deprecated',
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy,
      // Catalog-specific fields
      displayName: input.displayName,
      visibility: input.visibility,
      requiresApproval: input.requiresApproval || false,
      beta: input.beta || false,
      deprecated: input.deprecated || false,
      requiredPlan: input.requiredPlan,
      allowedTenants: input.allowedTenants,
      blockedTenants: input.blockedTenants,
      rateLimit: input.rateLimit || { requestsPerMinute: 100, requestsPerHour: 5000 },
      shardMappings: input.shardMappings,
      supportUrl: input.supportUrl,
      setupGuideUrl: input.setupGuideUrl,
      version: input.version || '1.0.0',
      status: input.status || 'active',
      updatedBy: input.createdBy,
    };

    const container = getContainer('integration_catalog');
    const { resource } = await container.items.create(entry);
    return resource as IntegrationCatalogEntry;
  }

  /**
   * Get catalog entry by ID
   */
  async getCatalogEntry(id: string, category: string): Promise<IntegrationCatalogEntry | null> {
    try {
      const container = getContainer('integration_catalog');
      const { resource } = await container.item(id, category).read();
      return (resource as IntegrationCatalogEntry) || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get catalog entry by integration ID
   */
  async getCatalogEntryByIntegrationId(integrationId: string): Promise<IntegrationCatalogEntry | null> {
    const container = getContainer('integration_catalog');
    const { resources } = await container.items
      .query<IntegrationCatalogEntry>({
        query: 'SELECT * FROM c WHERE c.id = @integrationId OR c.integrationId = @integrationId OR c.provider = @integrationId LIMIT 1',
        parameters: [{ name: '@integrationId', value: integrationId }],
      })
      .fetchNext();

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
      query +=
        ' AND (CONTAINS(LOWER(c.name), @searchTerm) OR CONTAINS(LOWER(c.displayName), @searchTerm))';
      parameters.push({ name: '@searchTerm', value: searchLower });
    }

    // Get total count
    const countQuery = `SELECT VALUE COUNT(1) FROM (${query.replace('SELECT *', 'SELECT 1')})`;
    const container = getContainer('integration_catalog');
    const countResult = await container.items
      .query<number>({
        query: countQuery,
        parameters,
      })
      .fetchNext();
    const total = countResult.resources[0] || 0;

    // Get paginated results
    query += ' ORDER BY c.displayName ASC OFFSET @offset LIMIT @limit';
    parameters.push({ name: '@offset', value: offset }, { name: '@limit', value: limit });

    const { resources } = await container.items
      .query<IntegrationCatalogEntry>({
        query,
        parameters,
      })
      .fetchNext();

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
    if (!existing) {
      return null;
    }

    const updated: IntegrationCatalogEntry = {
      ...existing,
      ...input,
      authMethods: (input.authMethods ?? existing.authMethods) as AuthMethod[],
      updatedAt: new Date(),
      updatedBy: input.updatedBy,
    };

    const container = getContainer('integration_catalog');
    const { resource } = await container.item(id, category).replace(updated);
    return resource as IntegrationCatalogEntry;
  }

  /**
   * Delete catalog entry
   */
  async deleteCatalogEntry(id: string, category: string): Promise<boolean> {
    try {
      const container = getContainer('integration_catalog');
      await container.item(id, category).delete();
      return true;
    } catch (error: any) {
      if (error.code === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Deprecate catalog entry
   */
  async deprecateCatalogEntry(
    id: string,
    category: string,
    updatedBy: string
  ): Promise<IntegrationCatalogEntry | null> {
    return this.updateCatalogEntry(id, category, {
      status: 'deprecated',
      deprecated: true,
      updatedBy,
    });
  }

  /**
   * Get catalog entries by category
   */
  async getCatalogEntriesByCategory(category: string): Promise<IntegrationCatalogEntry[]> {
    const container = getContainer('integration_catalog');
    const { resources } = await container.items
      .query<IntegrationCatalogEntry>({
        query: 'SELECT * FROM c WHERE c.category = @category AND c.status != "deprecated"',
        parameters: [{ name: '@category', value: category }],
      })
      .fetchNext();
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

    const container = getContainer('integration_visibility');
    const { resource } = await container.items.create(rule);
    return resource as IntegrationVisibilityRule;
  }

  /**
   * Get visibility rule
   */
  async getVisibilityRule(id: string, tenantId: string): Promise<IntegrationVisibilityRule | null> {
    try {
      const container = getContainer('integration_visibility');
      const { resource } = await container.item(id, tenantId).read();
      return (resource as IntegrationVisibilityRule) || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
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
    const container = getContainer('integration_visibility');
    const { resources } = await container.items
      .query<IntegrationVisibilityRule>({
        query:
          'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.integrationId = @integrationId LIMIT 1',
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@integrationId', value: integrationId },
        ],
      })
      .fetchNext();

    return resources.length > 0 ? resources[0] : null;
  }

  /**
   * List visibility rules for tenant
   */
  async listVisibilityRulesForTenant(tenantId: string): Promise<IntegrationVisibilityRule[]> {
    const container = getContainer('integration_visibility');
    const { resources } = await container.items
      .query<IntegrationVisibilityRule>({
        query: 'SELECT * FROM c WHERE c.tenantId = @tenantId ORDER BY c.createdAt DESC',
        parameters: [{ name: '@tenantId', value: tenantId }],
      })
      .fetchNext();
    return resources;
  }

  /**
   * List visibility rules for integration
   */
  async listVisibilityRulesForIntegration(integrationId: string): Promise<IntegrationVisibilityRule[]> {
    const container = getContainer('integration_visibility');
    const { resources } = await container.items
      .query<IntegrationVisibilityRule>({
        query: 'SELECT * FROM c WHERE c.integrationId = @integrationId ORDER BY c.createdAt DESC',
        parameters: [{ name: '@integrationId', value: integrationId }],
      })
      .fetchNext();
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
    if (!existing) {
      return null;
    }

    const updated: IntegrationVisibilityRule = {
      ...existing,
      ...input,
      updatedAt: new Date(),
    };

    const container = getContainer('integration_visibility');
    const { resource } = await container.item(id, tenantId).replace(updated);
    return resource as IntegrationVisibilityRule;
  }

  /**
   * Delete visibility rule
   */
  async deleteVisibilityRule(id: string, tenantId: string): Promise<boolean> {
    try {
      const container = getContainer('integration_visibility');
      await container.item(id, tenantId).delete();
      return true;
    } catch (error: any) {
      if (error.code === 404) {
        return false;
      }
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
    if (!existing) {
      return null;
    }

    const updated: IntegrationVisibilityRule = {
      ...existing,
      isApproved: true,
      approvedAt: new Date(),
      approvedBy,
      updatedAt: new Date(),
    };

    const container = getContainer('integration_visibility');
    const { resource } = await container.item(id, tenantId).replace(updated);
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
    if (!existing) {
      return null;
    }

    const updated: IntegrationVisibilityRule = {
      ...existing,
      isApproved: false,
      deniedAt: new Date(),
      denialReason,
      approvedBy,
      updatedAt: new Date(),
    };

    const container = getContainer('integration_visibility');
    const { resource } = await container.item(id, tenantId).replace(updated);
    return resource as IntegrationVisibilityRule;
  }
}
