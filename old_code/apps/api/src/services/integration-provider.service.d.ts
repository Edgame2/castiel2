/**
 * Integration Provider Service
 * Business logic for managing integration providers (system-level catalog)
 */
import { IntegrationProviderRepository } from '../repositories/integration.repository.js';
import { IntegrationRepository } from '../repositories/integration.repository.js';
import type { NotificationService } from './notification.service.js';
import type { AuditLogService } from './audit/audit-log.service.js';
import type { IntegrationProviderDocument } from '../types/integration.types.js';
import type { AuthUser } from '../types/auth.types.js';
export interface CreateProviderInput {
    category: string;
    name: string;
    displayName: string;
    provider: string;
    description?: string;
    status?: 'active' | 'beta' | 'deprecated' | 'disabled';
    audience?: 'system' | 'tenant';
    capabilities: string[];
    supportedSyncDirections: ('pull' | 'push' | 'bidirectional')[];
    supportsRealtime?: boolean;
    supportsWebhooks?: boolean;
    supportsNotifications?: boolean;
    supportsSearch?: boolean;
    searchableEntities?: string[];
    searchCapabilities?: {
        fullText: boolean;
        fieldSpecific: boolean;
        filtered: boolean;
    };
    requiresUserScoping?: boolean;
    authType: 'oauth2' | 'api_key' | 'basic' | 'custom';
    oauthConfig?: any;
    availableEntities: any[];
    entityMappings?: any[];
    icon: string;
    color: string;
    version?: string;
    isPremium?: boolean;
    requiredPlan?: string;
    documentationUrl?: string;
    supportUrl?: string;
}
export interface UpdateProviderInput {
    displayName?: string;
    description?: string;
    capabilities?: string[];
    supportedSyncDirections?: ('pull' | 'push' | 'bidirectional')[];
    supportsRealtime?: boolean;
    supportsWebhooks?: boolean;
    supportsNotifications?: boolean;
    supportsSearch?: boolean;
    searchableEntities?: string[];
    searchCapabilities?: {
        fullText: boolean;
        fieldSpecific: boolean;
        filtered: boolean;
    };
    requiresUserScoping?: boolean;
    oauthConfig?: any;
    availableEntities?: any[];
    entityMappings?: any[];
    icon?: string;
    color?: string;
    version?: string;
    isPremium?: boolean;
    requiredPlan?: string;
    documentationUrl?: string;
    supportUrl?: string;
}
export declare class IntegrationProviderService {
    private providerRepository;
    private integrationRepository;
    private notificationService?;
    private auditLogService?;
    private monitoring?;
    constructor(providerRepository: IntegrationProviderRepository, integrationRepository: IntegrationRepository, notificationService?: NotificationService, auditLogService?: AuditLogService, monitoring?: any);
    /**
     * Create new provider
     */
    createProvider(input: CreateProviderInput, user: AuthUser): Promise<IntegrationProviderDocument>;
    /**
     * Update provider
     */
    updateProvider(id: string, category: string, input: UpdateProviderInput, user: AuthUser): Promise<IntegrationProviderDocument>;
    /**
     * Delete provider
     */
    deleteProvider(id: string, category: string, user: AuthUser): Promise<boolean>;
    /**
     * Change provider status
     */
    changeStatus(id: string, category: string, status: 'active' | 'beta' | 'deprecated' | 'disabled', user: AuthUser): Promise<IntegrationProviderDocument>;
    /**
     * Change provider audience
     */
    changeAudience(id: string, category: string, audience: 'system' | 'tenant', user: AuthUser): Promise<IntegrationProviderDocument>;
    /**
     * List providers
     * With caching for frequently accessed provider catalog
     */
    listProviders(options?: {
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
    /**
     * Get provider by ID
     */
    getProvider(id: string, category: string): Promise<IntegrationProviderDocument | null>;
    /**
     * Get provider by ID (searches across all categories)
     */
    getProviderById(id: string): Promise<IntegrationProviderDocument | null>;
    /**
     * Get provider by provider name (searches across all categories)
     */
    getProviderByName(providerName: string): Promise<IntegrationProviderDocument | null>;
}
//# sourceMappingURL=integration-provider.service.d.ts.map