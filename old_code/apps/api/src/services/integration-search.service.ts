/**
 * Integration Search Service
 * Provides global search across all enabled integrations
 */

import { IntegrationRepository } from '../repositories/integration.repository.js';
import { IntegrationProviderRepository } from '../repositories/integration.repository.js';
import type {
  IntegrationDocument,
  IntegrationProviderDocument,
  IntegrationSearchOptions,
  IntegrationSearchResult,
  SearchResult,
  SearchResultItem,
  SearchOptions,
} from '../types/integration.types.js';
import type { IntegrationExternalUserIdService } from './integration-external-user-id.service.js';

export interface AdapterManager {
  getAdapter(providerName: string, integration: IntegrationDocument, userId?: string): Promise<any>;
}

export class IntegrationSearchService {
  private integrationRepository: IntegrationRepository;
  private providerRepository: IntegrationProviderRepository;
  private adapterManager: AdapterManager;
  private externalUserIdService?: IntegrationExternalUserIdService;
  private searchTimeout: number = 10000; // 10 seconds

  constructor(
    integrationRepository: IntegrationRepository,
    providerRepository: IntegrationProviderRepository,
    adapterManager: AdapterManager,
    externalUserIdService?: IntegrationExternalUserIdService
  ) {
    this.integrationRepository = integrationRepository;
    this.providerRepository = providerRepository;
    this.adapterManager = adapterManager;
    this.externalUserIdService = externalUserIdService;
  }

  /**
   * Global search across all enabled integrations
   */
  async search(
    tenantId: string,
    userId: string,
    query: string,
    options: Omit<Partial<IntegrationSearchOptions>, 'query'> = {}
  ): Promise<IntegrationSearchResult> {
    // Validate query
    if (!query || query.trim().length === 0) {
      return {
        results: [],
        total: 0,
        took: 0,
        hasMore: false,
        integrations: [],
      };
    }

    // Normalize query
    const normalizedQuery = query.trim();
    const startTime = Date.now();

    // 1. Get enabled integrations with search enabled
    const integrationsResult = await this.integrationRepository.list({
      tenantId,
      searchEnabled: true,
      status: 'connected',
      limit: 100,
      offset: 0,
    });

    const integrations = integrationsResult.integrations;

    // 2. Filter by search configuration
    const filteredIntegrations = this.applySearchConfiguration(integrations, options);

    // 3. Query all adapters in parallel
    const searchPromises = filteredIntegrations.map(integration =>
      this.searchIntegration(integration, normalizedQuery, userId, options as Omit<Partial<IntegrationSearchOptions>, 'query'>).catch(error => ({
        integrationId: integration.id,
        integrationName: integration.name,
        providerName: integration.providerName,
        resultCount: 0,
        status: 'error' as const,
        error: error.message,
      }))
    );

    const results = await Promise.allSettled(
      searchPromises.map(promise =>
        Promise.race([
          promise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Search timeout')), this.searchTimeout)
          ),
        ])
      )
    );

    // 4. Aggregate and rank results
    const aggregated = this.aggregateResults(results, normalizedQuery);
    const took = Date.now() - startTime;

    // 5. Build integration status list
    const integrationStatuses = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        const value = result.value as any;
        if (value.status === 'error') {
          return value;
        }
        return {
          integrationId: filteredIntegrations[index].id,
          integrationName: filteredIntegrations[index].name,
          providerName: filteredIntegrations[index].providerName,
          resultCount: value.results?.length || 0,
          status: 'success' as const,
        };
      } else {
        return {
          integrationId: filteredIntegrations[index].id,
          integrationName: filteredIntegrations[index].name,
          providerName: filteredIntegrations[index].providerName,
          resultCount: 0,
          status: 'error' as const,
          error: result.reason?.message || 'Unknown error',
        };
      }
    });

    // Apply pagination
    const pageSize = options.limit || 20;
    const pageOffset = options.offset || 0;
    const paginatedResults = aggregated.slice(pageOffset, pageOffset + pageSize);
    const hasMore = pageOffset + pageSize < aggregated.length;

    return {
      results: paginatedResults,
      total: aggregated.length,
      took,
      hasMore,
      integrations: integrationStatuses,
    };
  }

  /**
   * Search single integration
   */
  async searchIntegration(
    integration: IntegrationDocument,
    query: string,
    userId: string,
    options: Omit<Partial<IntegrationSearchOptions>, 'query'> = {}
  ): Promise<SearchResult> {
    const startTime = Date.now();

    // Get adapter
    const adapter = await this.adapterManager.getAdapter(
      integration.providerName,
      integration,
      integration.userScoped ? userId : undefined
    );

    if (!adapter || typeof adapter.search !== 'function') {
      throw new Error(`Adapter for ${integration.providerName} does not support search`);
    }

    // Retrieve external user ID if this is a user-scoped integration
    let externalUserId: string | undefined;
    if (integration.userScoped && this.externalUserIdService) {
      try {
        const externalUserIdData = await this.externalUserIdService.getExternalUserId(
          userId,
          integration.tenantId,
          integration.id
        );
        externalUserId = externalUserIdData?.externalUserId;
      } catch (error) {
        // Log but don't fail - external user ID retrieval is optional
        // The adapter can still work without it, though results may not be user-filtered
      }
    }

    // Apply user scoping if required
    const searchOptions: SearchOptions = {
      query,
      entities: options.entities || integration.searchableEntities,
      filters: {
        ...options.filters,
        ...integration.searchFilters,
        // Add external user ID to filters if available
        ...(externalUserId && { externalUserId }),
      },
      limit: options.limit || 10,
      offset: options.offset || 0,
      userId: integration.userScoped ? userId : undefined,
      externalUserId, // Pass external user ID for adapter to use in API calls
      tenantId: integration.tenantId,
    };

    const result = await adapter.search(searchOptions);

    // Enrich results with integration metadata
    // SearchResult interface uses 'results' property
    const items = result.results || [];
    const enrichedResults: SearchResultItem[] = items.map((item: SearchResultItem) => ({
      ...item,
      integrationId: integration.id,
      integrationName: integration.name,
      providerName: integration.providerName,
    }));

    const took = Date.now() - startTime;

    return {
      results: enrichedResults,
      total: result.total || enrichedResults.length,
      took,
      hasMore: result.hasMore || false,
    };
  }

  /**
   * Get searchable integrations for tenant
   */
  async getSearchableIntegrations(tenantId: string): Promise<IntegrationDocument[]> {
    const result = await this.integrationRepository.list({
      tenantId,
      searchEnabled: true,
      status: 'connected',
      limit: 100,
      offset: 0,
    });

    return result.integrations;
  }

  /**
   * Apply search configuration filters
   */
  private applySearchConfiguration(
    integrations: IntegrationDocument[],
    options: Omit<Partial<IntegrationSearchOptions>, 'query'>
  ): IntegrationDocument[] {
    let filtered = integrations;

    // Filter by integration IDs if specified
    if (options.integrationIds && options.integrationIds.length > 0) {
      filtered = filtered.filter(i => options.integrationIds!.includes(i.id));
    }

    // Apply entity type filters
    if (options.filters?.entityTypes && options.filters.entityTypes.length > 0) {
      filtered = filtered.filter(integration => {
        const searchableEntities = integration.searchableEntities || [];
        return options.filters!.entityTypes!.some(entity =>
          searchableEntities.includes(entity)
        );
      });
    }

    return filtered;
  }

  /**
   * Aggregate and rank search results
   */
  private aggregateResults(
    results: PromiseSettledResult<any>[],
    query: string
  ): SearchResultItem[] {
    const allResults: SearchResultItem[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        const value = result.value as { results?: SearchResultItem[]; items?: SearchResultItem[] } | SearchResult;
        // Handle both SearchResult format (items) and IntegrationSearchResult format (results)
        const items = ('items' in value ? value.items : undefined) || ('results' in value ? value.results : undefined) || [];
        allResults.push(...items);
      }
    }

    // Sort by relevance score (highest first)
    allResults.sort((a, b) => (b.score || 0) - (a.score || 0));

    return allResults;
  }
}







