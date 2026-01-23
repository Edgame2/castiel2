/**
 * Widget Catalog Repository
 * Persists widget catalog entries and tenant configurations to Cosmos DB
 */

import { Container, CosmosClient } from '@azure/cosmos';
import { config } from '../config/env.js';
import {
  WidgetCatalogEntry,
  TenantWidgetCatalogOverride,
  TenantWidgetCatalogConfig,
  WidgetCatalogListOptions,
  WidgetCatalogListResult,
  TenantWidgetOverrideListResult,
} from '../types/widget-catalog.types.js';

export class WidgetCatalogRepository {
  private client: CosmosClient;
  private catalogContainer: Container;
  private overrideContainer: Container;
  private configContainer: Container;

  constructor() {
    this.client = new CosmosClient({
      endpoint: config.cosmosDb.endpoint,
      key: config.cosmosDb.key,
    });

    const database = this.client.database(config.cosmosDb.databaseId);
    this.catalogContainer = database.container('widgetCatalog');
    this.overrideContainer = database.container('tenantWidgetOverrides');
    this.configContainer = database.container('tenantWidgetConfigs');
  }

  // ============================================================================
  // Widget Catalog Entry Methods
  // ============================================================================

  /**
   * Create widget catalog entry
   */
  async createCatalogEntry(entry: WidgetCatalogEntry): Promise<WidgetCatalogEntry> {
    try {
      const { resource } = await this.catalogContainer.items.create(entry);
      return resource as WidgetCatalogEntry;
    } catch (error) {
      throw new Error(`Failed to create widget catalog entry: ${error}`);
    }
  }

  /**
   * Get widget catalog entry by ID
   */
  async getCatalogEntry(entryId: string): Promise<WidgetCatalogEntry | null> {
    try {
      const { resource } = await this.catalogContainer.item(entryId, entryId).read();
      return (resource as WidgetCatalogEntry) || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw new Error(`Failed to get widget catalog entry: ${error}`);
    }
  }

  /**
   * List widget catalog entries with filtering
   */
  async listCatalogEntries(
    options: WidgetCatalogListOptions
  ): Promise<WidgetCatalogListResult> {
    try {
      const { page = 1, limit = 50, status, category, visibilityLevel, search } = options;
      const offset = (page - 1) * limit;

      let query = 'SELECT * FROM c WHERE c.catalogType = "system"';
      const parameters: any[] = [];

      if (status) {
        query += ' AND c.status = @status';
        parameters.push({ name: '@status', value: status });
      }

      if (category) {
        query += ' AND c.category = @category';
        parameters.push({ name: '@category', value: category });
      }

      if (visibilityLevel) {
        query += ' AND c.visibilityLevel = @visibilityLevel';
        parameters.push({ name: '@visibilityLevel', value: visibilityLevel });
      }

      if (search) {
        query += ' AND (CONTAINS(LOWER(c.displayName), @search) OR CONTAINS(LOWER(c.description), @search))';
        parameters.push({ name: '@search', value: search.toLowerCase() });
      }

      const sortMap: Record<string, string> = {
        name: 'c.displayName ASC',
        category: 'c.category ASC, c.displayName ASC',
        recent: 'c.updatedAt DESC',
        featured: 'c.isFeatured DESC, c.sortOrder ASC',
      };

      // Get total count
      const countQuery = query.replace('SELECT *', 'SELECT VALUE COUNT(1)');
      const { resources: countResult } = await this.catalogContainer.items
        .query<number>({ query: countQuery, parameters }, { partitionKey: 'system' })
        .fetchAll();
      const total = countResult[0] || 0;

      const sortOrder = sortMap[options.sort || 'name'];
      query += ` ORDER BY ${sortOrder}`;

      // Get paginated results
      query += ` OFFSET ${offset} LIMIT ${limit}`;
      const { resources } = await this.catalogContainer.items
        .query<WidgetCatalogEntry>({ query, parameters }, { partitionKey: 'system' })
        .fetchAll();

      return {
        items: resources,
        total,
        page,
        limit,
      };
    } catch (error) {
      throw new Error(`Failed to list widget catalog entries: ${error}`);
    }
  }

  /**
   * Update widget catalog entry
   */
  async updateCatalogEntry(entry: WidgetCatalogEntry): Promise<WidgetCatalogEntry> {
    try {
      const { resource } = await this.catalogContainer.item(entry.id, entry.id).replace(entry);
      return resource as WidgetCatalogEntry;
    } catch (error) {
      throw new Error(`Failed to update widget catalog entry: ${error}`);
    }
  }

  /**
   * Delete widget catalog entry
   */
  async deleteCatalogEntry(entryId: string): Promise<void> {
    try {
      await this.catalogContainer.item(entryId, entryId).delete();
    } catch (error) {
      throw new Error(`Failed to delete widget catalog entry: ${error}`);
    }
  }

  // ============================================================================
  // Tenant Widget Override Methods
  // ============================================================================

  /**
   * Get tenant widget override
   */
  async getTenantWidgetOverride(
    tenantId: string,
    widgetCatalogEntryId: string
  ): Promise<TenantWidgetCatalogOverride | null> {
    try {
      const partitionKey = `${tenantId}#${widgetCatalogEntryId}`;
      const { resource } = await this.overrideContainer.item(partitionKey, tenantId).read();
      return (resource as TenantWidgetCatalogOverride) || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw new Error(`Failed to get tenant widget override: ${error}`);
    }
  }

  /**
   * Update tenant widget override
   */
  async updateTenantWidgetOverride(
    override: TenantWidgetCatalogOverride
  ): Promise<TenantWidgetCatalogOverride> {
    try {
      const partitionKey = `${override.tenantId}#${override.widgetCatalogEntryId}`;
      const document = {
        ...override,
        id: partitionKey,
        tenantId: override.tenantId,
      };

      const { resource } = await this.overrideContainer.items.upsert(document);
      return resource as unknown as TenantWidgetCatalogOverride;
    } catch (error) {
      throw new Error(`Failed to update tenant widget override: ${error}`);
    }
  }

  /**
   * List tenant widget overrides
   */
  async listTenantWidgetOverrides(
    tenantId: string,
    page: number = 1,
    limit: number = 100
  ): Promise<TenantWidgetOverrideListResult> {
    try {
      const offset = (page - 1) * limit;

      const countQuery = 'SELECT VALUE COUNT(1) FROM c WHERE c.tenantId = @tenantId';
      const { resources: countResult } = await this.overrideContainer.items
        .query<number>(
          {
            query: countQuery,
            parameters: [{ name: '@tenantId', value: tenantId }],
          },
          { partitionKey: tenantId }
        )
        .fetchAll();
      const total = countResult[0] || 0;

      const query = `
        SELECT * FROM c 
        WHERE c.tenantId = @tenantId 
        ORDER BY c.updatedAt DESC 
        OFFSET ${offset} LIMIT ${limit}
      `;

      const { resources } = await this.overrideContainer.items
        .query<TenantWidgetCatalogOverride>(
          {
            query,
            parameters: [{ name: '@tenantId', value: tenantId }],
          },
          { partitionKey: tenantId }
        )
        .fetchAll();

      return {
        items: resources,
        total,
        page,
        limit,
      };
    } catch (error) {
      throw new Error(`Failed to list tenant widget overrides: ${error}`);
    }
  }

  /**
   * Delete tenant widget override
   */
  async deleteTenantWidgetOverride(tenantId: string, widgetCatalogEntryId: string): Promise<void> {
    try {
      const partitionKey = `${tenantId}#${widgetCatalogEntryId}`;
      await this.overrideContainer.item(partitionKey, tenantId).delete();
    } catch (error) {
      throw new Error(`Failed to delete tenant widget override: ${error}`);
    }
  }

  // ============================================================================
  // Tenant Widget Config Methods
  // ============================================================================

  /**
   * Get tenant widget catalog configuration
   */
  async getTenantWidgetConfig(tenantId: string): Promise<TenantWidgetCatalogConfig> {
    try {
      const { resource } = await this.configContainer.item(tenantId, tenantId).read();
      if (resource) {
        return resource as TenantWidgetCatalogConfig;
      }

      // Return default config if not found
      return this.getDefaultTenantConfig(tenantId);
    } catch (error: any) {
      if (error.code === 404) {
        return this.getDefaultTenantConfig(tenantId);
      }
      throw new Error(`Failed to get tenant widget config: ${error}`);
    }
  }

  /**
   * Update tenant widget catalog configuration
   */
  async updateTenantWidgetConfig(
    config: TenantWidgetCatalogConfig
  ): Promise<TenantWidgetCatalogConfig> {
    try {
      const document = {
        ...config,
        id: config.tenantId,
      };

      const { resource } = await this.configContainer.items.upsert(document);
      return resource as unknown as TenantWidgetCatalogConfig;
    } catch (error) {
      throw new Error(`Failed to update tenant widget config: ${error}`);
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Get default tenant widget configuration
   */
  private getDefaultTenantConfig(tenantId: string): TenantWidgetCatalogConfig {
    const now = new Date();
    return {
      tenantId,
      enableCustomWidgets: true,
      enableWidgetSharing: true,
      enableWidgetExport: false,
      visibleWidgetIds: [], // All widgets by default
      hiddenWidgetIds: [],
      featuredWidgetIds: [],
      roleBasedWidgetAccess: {},
      customCategoryLabels: {},
      defaultWidgetCatalogEntryIds: [],
      maxWidgetsPerDashboard: 20,
      maxCustomQueryWidgets: 5,
      version: 1,
      createdAt: now,
      updatedAt: now,
      updatedBy: 'system',
    };
  }
}
