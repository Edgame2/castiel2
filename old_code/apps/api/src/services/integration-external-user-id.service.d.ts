/**
 * Integration External User ID Service
 * Manages external user IDs from integrated applications
 */
import { Container } from '@azure/cosmos';
import type { IMonitoringProvider } from '@castiel/monitoring';
import type { ExternalUserId } from '../types/user.types.js';
import { ExternalUserIdStatus } from '../types/user.types.js';
import type { AdapterManagerService } from './adapter-manager.service.js';
import type { IntegrationRepository } from '../repositories/integration.repository.js';
import type { AuditLogService } from './audit/audit-log.service.js';
interface ExternalUserIdServiceOptions {
    userContainer: Container;
    monitoring: IMonitoringProvider;
    adapterManager?: AdapterManagerService;
    integrationRepository?: IntegrationRepository;
    auditLogService?: AuditLogService;
}
interface StoreExternalUserIdInput {
    integrationId: string;
    externalUserId: string;
    integrationName?: string;
    connectionId?: string;
    metadata?: Record<string, any>;
    status?: ExternalUserIdStatus;
}
interface UpdateExternalUserIdInput {
    externalUserId?: string;
    integrationName?: string;
    connectionId?: string;
    metadata?: Record<string, any>;
    status?: ExternalUserIdStatus;
    lastSyncedAt?: Date;
}
/**
 * Integration External User ID Service
 */
export declare class IntegrationExternalUserIdService {
    private userContainer;
    private monitoring;
    private adapterManager?;
    private integrationRepository?;
    private auditLogService?;
    constructor(options: ExternalUserIdServiceOptions);
    /**
     * Store or update external user ID for a user
     */
    storeExternalUserId(userId: string, tenantId: string, data: StoreExternalUserIdInput): Promise<void>;
    /**
     * Get external user ID for a specific integration
     */
    getExternalUserId(userId: string, tenantId: string, integrationId: string): Promise<ExternalUserId | null>;
    /**
     * Get all external user IDs for a user
     */
    getAllExternalUserIds(userId: string, tenantId: string): Promise<ExternalUserId[]>;
    /**
     * Find user by external ID (reverse lookup)
     * Given an external user ID from an integration, find the internal user
     */
    getUserByExternalId(externalUserId: string, tenantId: string, integrationId: string): Promise<{
        userId: string;
        email?: string;
        firstname?: string;
        lastname?: string;
    } | null>;
    /**
     * Update external user ID
     */
    updateExternalUserId(userId: string, tenantId: string, integrationId: string, updates: UpdateExternalUserIdInput): Promise<void>;
    /**
     * Remove external user ID
     */
    removeExternalUserId(userId: string, tenantId: string, integrationId: string): Promise<void>;
    /**
     * Sync external user ID from integration connection
     */
    syncExternalUserIdFromConnection(userId: string, tenantId: string, integrationId: string, connectionId: string): Promise<void>;
    /**
     * Check if external user ID already exists for another user (conflict detection)
     */
    checkConflict(tenantId: string, integrationId: string, externalUserId: string, excludeUserId?: string): Promise<{
        exists: boolean;
        userId?: string;
        email?: string;
    }>;
}
export {};
//# sourceMappingURL=integration-external-user-id.service.d.ts.map