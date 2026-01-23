/**
 * Integration Service
 * Business logic for managing tenant integration instances
 */
import { IntegrationRepository } from '../repositories/integration.repository.js';
import { IntegrationProviderRepository } from '../repositories/integration.repository.js';
import type { CreateSystemNotificationInput } from '../types/notification.types.js';
import type { AuditLogService } from './audit/audit-log.service.js';
import type { UserService } from './auth/user.service.js';
import type { IntegrationDocument, SyncFrequency, EntityMapping, PullFilter } from '../types/integration.types.js';
import type { AuthUser } from '../types/auth.types.js';
import type { IMonitoringProvider } from '@castiel/monitoring';
interface INotificationService {
    createSystemNotification(input: CreateSystemNotificationInput): Promise<void>;
}
export interface CreateIntegrationInput {
    tenantId: string;
    integrationId: string;
    providerName: string;
    name: string;
    icon?: string;
    description?: string;
    credentialSecretName: string;
    settings?: Record<string, any>;
    syncConfig?: {
        syncEnabled: boolean;
        syncDirection: 'inbound' | 'outbound' | 'bidirectional';
        syncFrequency?: SyncFrequency;
        entityMappings: EntityMapping[];
        pullFilters?: PullFilter[];
        syncUserScoped?: boolean;
    };
    userScoped?: boolean;
    allowedShardTypes?: string[];
    searchEnabled?: boolean;
    searchableEntities?: string[];
    searchFilters?: {
        dateRange?: {
            start?: Date;
            end?: Date;
        };
        entityTypes?: string[];
        customFilters?: Record<string, any>;
    };
    instanceUrl?: string;
}
export interface UpdateIntegrationInput {
    name?: string;
    icon?: string;
    description?: string;
    settings?: Record<string, any>;
    syncConfig?: {
        syncEnabled: boolean;
        syncDirection: 'inbound' | 'outbound' | 'bidirectional';
        syncFrequency?: SyncFrequency;
        entityMappings: EntityMapping[];
        pullFilters?: PullFilter[];
        syncUserScoped?: boolean;
    };
    userScoped?: boolean;
    allowedShardTypes?: string[];
    searchEnabled?: boolean;
    searchableEntities?: string[];
    searchFilters?: {
        dateRange?: {
            start?: Date;
            end?: Date;
        };
        entityTypes?: string[];
        customFilters?: Record<string, any>;
    };
    instanceUrl?: string;
}
export declare class IntegrationService {
    private integrationRepository;
    private providerRepository;
    private notificationService?;
    private auditLogService?;
    private userService?;
    private monitoring?;
    constructor(integrationRepository: IntegrationRepository, providerRepository: IntegrationProviderRepository, notificationService?: INotificationService, auditLogService?: AuditLogService, userService?: UserService, monitoring?: IMonitoringProvider);
    /**
     * Helper: Get tenant admin user IDs
     */
    private getTenantAdminUserIds;
    /**
     * Helper: Send notification to tenant admins
     */
    private notifyTenantAdmins;
    /**
     * Create integration instance
     */
    createIntegration(input: CreateIntegrationInput, user: AuthUser): Promise<IntegrationDocument>;
    /**
     * Update integration
     */
    updateIntegration(id: string, tenantId: string, input: UpdateIntegrationInput, user: AuthUser): Promise<IntegrationDocument>;
    /**
     * Delete integration
     */
    deleteIntegration(id: string, tenantId: string, user: AuthUser): Promise<boolean>;
    /**
     * Activate integration
     */
    activateIntegration(id: string, tenantId: string, user: AuthUser): Promise<IntegrationDocument>;
    /**
     * Deactivate integration
     */
    deactivateIntegration(id: string, tenantId: string, user: AuthUser): Promise<IntegrationDocument>;
    /**
     * Update data access configuration
     */
    updateDataAccess(id: string, tenantId: string, allowedShardTypes: string[], user: AuthUser): Promise<IntegrationDocument>;
    /**
     * Update search configuration
     */
    updateSearchConfig(id: string, tenantId: string, config: {
        searchEnabled?: boolean;
        searchableEntities?: string[];
        searchFilters?: {
            dateRange?: {
                start?: Date;
                end?: Date;
            };
            entityTypes?: string[];
            customFilters?: Record<string, any>;
        };
    }, user: AuthUser): Promise<IntegrationDocument>;
    /**
     * List integrations
     */
    listIntegrations(options: {
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
    /**
     * Get integration by ID
     */
    getIntegration(id: string, tenantId: string): Promise<IntegrationDocument | null>;
}
export {};
//# sourceMappingURL=integration.service.d.ts.map