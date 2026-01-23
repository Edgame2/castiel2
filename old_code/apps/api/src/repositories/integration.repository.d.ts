import { CosmosClient } from '@azure/cosmos';
import { IntegrationProviderDocument, IntegrationDocument, IntegrationConnection } from '../types/integration.types.js';
/**
 * Integration Provider Repository
 * Manages system-level integration provider definitions
 */
export declare class IntegrationProviderRepository {
    private container;
    constructor(client: CosmosClient, databaseId: string, containerId?: string);
    /**
     * Create integration provider
     */
    create(input: Omit<IntegrationProviderDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<IntegrationProviderDocument>;
    /**
     * Update integration provider
     */
    update(id: string, category: string, input: Partial<Omit<IntegrationProviderDocument, 'id' | 'category' | 'createdAt' | 'createdBy'>> & {
        updatedBy: string;
    }): Promise<IntegrationProviderDocument | null>;
    /**
     * Delete integration provider
     */
    delete(id: string, category: string): Promise<boolean>;
    /**
     * Find by ID
     */
    findById(id: string, category: string): Promise<IntegrationProviderDocument | null>;
    /**
     * Find by provider name and category
     */
    findByProvider(category: string, provider: string): Promise<IntegrationProviderDocument | null>;
    /**
     * Find by provider ID (searches across all categories)
     */
    findByIdAcrossCategories(id: string): Promise<IntegrationProviderDocument | null>;
    /**
     * Find by provider name (searches across all categories)
     */
    findByProviderName(provider: string): Promise<IntegrationProviderDocument | null>;
    /**
     * List integration providers
     */
    list(options?: {
        category?: string;
        status?: 'active' | 'beta' | 'deprecated' | 'disabled';
        audience?: 'system' | 'tenant';
        supportsSearch?: boolean;
        supportsNotifications?: boolean;
        requiresUserScoping?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<{
        providers: IntegrationProviderDocument[];
        total: number;
        hasMore: boolean;
    }>;
}
/**
 * Integration Repository
 * Manages tenant-specific integration instances
 */
export declare class IntegrationRepository {
    private container;
    constructor(client: CosmosClient, databaseId: string, containerId?: string);
    /**
     * Create integration instance
     */
    create(input: Omit<IntegrationDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<IntegrationDocument>;
    /**
     * Update integration instance
     */
    update(id: string, tenantId: string, input: Partial<Omit<IntegrationDocument, 'id' | 'tenantId' | 'createdAt' | 'enabledAt' | 'enabledBy'>>): Promise<IntegrationDocument | null>;
    /**
     * Delete integration instance
     */
    delete(id: string, tenantId: string): Promise<boolean>;
    /**
     * Find by ID
     */
    findById(id: string, tenantId: string): Promise<IntegrationDocument | null>;
    /**
     * Find by provider name and instance name
     */
    findByProviderAndName(tenantId: string, providerName: string, name: string): Promise<IntegrationDocument | null>;
    /**
     * List integrations for tenant
     */
    list(options: {
        tenantId: string;
        providerName?: string;
        status?: 'pending' | 'connected' | 'error' | 'disabled';
        searchEnabled?: boolean;
        userScoped?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<{
        integrations: IntegrationDocument[];
        total: number;
        hasMore: boolean;
    }>;
}
/**
 * Integration Connection Repository
 * Manages connection credentials (system/tenant/user-scoped)
 */
export declare class IntegrationConnectionRepository {
    private container;
    constructor(client: CosmosClient, databaseId: string, containerId?: string);
    /**
     * Create connection
     */
    create(input: Omit<IntegrationConnection, 'id' | 'createdAt' | 'updatedAt'> & {
        id?: string;
    }): Promise<IntegrationConnection>;
    /**
     * Update connection
     */
    update(id: string, integrationId: string, input: Partial<Omit<IntegrationConnection, 'id' | 'integrationId' | 'scope' | 'tenantId' | 'userId' | 'createdAt' | 'createdBy'>>): Promise<IntegrationConnection | null>;
    /**
     * Delete connection
     */
    delete(id: string, integrationId: string): Promise<boolean>;
    /**
     * Find by ID
     */
    findById(id: string, integrationId: string): Promise<IntegrationConnection | null>;
    /**
     * Find connection for integration by scope
     */
    findByIntegration(integrationId: string, scope: 'system' | 'tenant' | 'user', tenantId?: string, userId?: string): Promise<IntegrationConnection | null>;
    /**
     * Find all user-scoped connections for an integration
     */
    findUserScoped(integrationId: string, tenantId: string, userId?: string): Promise<IntegrationConnection[]>;
    /**
     * Find all user-scoped connections for a tenant/user (across all integrations)
     */
    findAllUserConnections(tenantId: string, userId: string): Promise<IntegrationConnection[]>;
    /**
     * Find system-wide connection
     */
    findSystemConnection(integrationId: string): Promise<IntegrationConnection | null>;
    /**
     * Update OAuth tokens
     */
    updateOAuthTokens(id: string, integrationId: string, oauth: IntegrationConnection['oauth']): Promise<IntegrationConnection | null>;
    /**
     * Mark connection as expired
     */
    markExpired(id: string, integrationId: string): Promise<IntegrationConnection | null>;
}
//# sourceMappingURL=integration.repository.d.ts.map