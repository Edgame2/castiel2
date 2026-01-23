/**
 * Integration Search Service
 * Provides global search across all enabled integrations
 */
import { IntegrationRepository } from '../repositories/integration.repository.js';
import { IntegrationProviderRepository } from '../repositories/integration.repository.js';
import type { IntegrationDocument, IntegrationSearchOptions, IntegrationSearchResult, SearchResult } from '../types/integration.types.js';
import type { IntegrationExternalUserIdService } from './integration-external-user-id.service.js';
export interface AdapterManager {
    getAdapter(providerName: string, integration: IntegrationDocument, userId?: string): Promise<any>;
}
export declare class IntegrationSearchService {
    private integrationRepository;
    private providerRepository;
    private adapterManager;
    private externalUserIdService?;
    private searchTimeout;
    constructor(integrationRepository: IntegrationRepository, providerRepository: IntegrationProviderRepository, adapterManager: AdapterManager, externalUserIdService?: IntegrationExternalUserIdService);
    /**
     * Global search across all enabled integrations
     */
    search(tenantId: string, userId: string, query: string, options?: IntegrationSearchOptions): Promise<IntegrationSearchResult>;
    /**
     * Search single integration
     */
    searchIntegration(integration: IntegrationDocument, query: string, userId: string, options: IntegrationSearchOptions): Promise<SearchResult>;
    /**
     * Get searchable integrations for tenant
     */
    getSearchableIntegrations(tenantId: string): Promise<IntegrationDocument[]>;
    /**
     * Apply search configuration filters
     */
    private applySearchConfiguration;
    /**
     * Aggregate and rank search results
     */
    private aggregateResults;
}
//# sourceMappingURL=integration-search.service.d.ts.map