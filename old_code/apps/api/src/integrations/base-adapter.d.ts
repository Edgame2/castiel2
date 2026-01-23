/**
 * Base Integration Adapter
 * Abstract class for implementing integration-specific logic
 */
import { IMonitoringProvider } from '@castiel/monitoring';
import { IntegrationConnectionService } from '../services/integration-connection.service.js';
import { IntegrationDefinition, IntegrationEntity, IntegrationEntityField, SearchOptions, SearchResult } from '../types/integration.types.js';
import type { SSOTeam } from '../types/team.types.js';
/**
 * Fetch options for pulling data
 */
export interface FetchOptions {
    entity: string;
    filters?: Record<string, any>;
    fields?: string[];
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    modifiedSince?: Date;
    incrementalSync?: boolean;
    externalUserId?: string;
}
/**
 * Fetch result
 */
export interface FetchResult<T = Record<string, any>> {
    records: T[];
    total?: number;
    hasMore: boolean;
    nextOffset?: number;
    cursor?: string;
}
/**
 * Push options for sending data
 */
export interface PushOptions {
    entity: string;
    operation: 'create' | 'update' | 'upsert' | 'delete';
}
/**
 * Push result
 */
export interface PushResult {
    success: boolean;
    externalId?: string;
    error?: string;
    details?: any;
}
/**
 * Webhook event
 */
export interface WebhookEvent {
    type: string;
    entity: string;
    externalId: string;
    operation: 'create' | 'update' | 'delete';
    data: Record<string, any>;
    timestamp: Date;
}
/**
 * Batch fetch options
 */
export interface BatchFetchOptions extends FetchOptions {
    batchSize?: number;
    maxBatches?: number;
    onBatchComplete?: (batch: FetchResult, batchNumber: number) => Promise<void>;
}
/**
 * Health check result
 */
export interface HealthCheckResult {
    healthy: boolean;
    responseTime?: number;
    error?: string;
    lastCheckedAt: Date;
    details?: Record<string, any>;
}
/**
 * Integration entity (for dynamic discovery)
 */
export interface DiscoveredEntity {
    name: string;
    displayName: string;
    description?: string;
    fields: IntegrationEntityField[];
    supportsPull: boolean;
    supportsPush: boolean;
    supportsWebhook?: boolean;
}
/**
 * Rate limit information from API
 */
export interface RateLimitInfo {
    limit: number;
    remaining: number;
    resetAt: Date;
    resetInSeconds: number;
}
/**
 * Base Integration Adapter
 */
export declare abstract class BaseIntegrationAdapter {
    protected monitoring: IMonitoringProvider;
    protected connectionService: IntegrationConnectionService;
    protected integrationId: string;
    protected tenantId: string;
    protected connectionId: string;
    constructor(monitoring: IMonitoringProvider, connectionService: IntegrationConnectionService, integrationId: string, tenantId: string, connectionId: string);
    /**
     * Get integration definition
     */
    abstract getDefinition(): IntegrationDefinition;
    /**
     * Test connection
     */
    abstract testConnection(): Promise<{
        success: boolean;
        error?: string;
        details?: any;
    }>;
    /**
     * Fetch records from integration
     */
    abstract fetch(options: FetchOptions): Promise<FetchResult>;
    /**
     * Push record to integration
     */
    abstract push(data: Record<string, any>, options: PushOptions): Promise<PushResult>;
    /**
     * Get entity schema (fields and their types)
     */
    abstract getEntitySchema(entityName: string): Promise<IntegrationEntity | null>;
    /**
     * List available entities
     */
    abstract listEntities(): Promise<IntegrationEntity[]>;
    /**
     * Search across integration entities
     * Must be implemented by adapters that support search
     */
    abstract search(options: SearchOptions): Promise<SearchResult>;
    /**
     * Fetch teams/groups from SSO provider
     * Optional method - only required for adapters that support team sync
     * @param config Team sync configuration
     * @returns Array of SSO teams
     */
    fetchTeams?(config: any): Promise<SSOTeam[]>;
    /**
     * Parse webhook payload
     */
    parseWebhook(payload: any, headers: Record<string, string>): WebhookEvent | null;
    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(payload: string, signature: string, secret: string): boolean;
    /**
     * Called when connection is established
     */
    onConnect?(): Promise<void>;
    /**
     * Called when connection is terminated
     */
    onDisconnect?(): Promise<void>;
    /**
     * Called when an error occurs during operations
     */
    onError?(error: Error, context?: Record<string, any>): Promise<void>;
    /**
     * Called when rate limit is hit
     */
    onRateLimitHit?(resetAt: Date): Promise<void>;
    /**
     * Fetch records in batches for large data sets
     */
    fetchBatch?(options: BatchFetchOptions): Promise<FetchResult[]>;
    /**
     * Push records in batches
     */
    pushBatch?(records: Record<string, any>[], options: PushOptions): Promise<PushResult[]>;
    /**
     * Discover available entities dynamically from API
     */
    discoverEntities?(): Promise<DiscoveredEntity[]>;
    /**
     * Discover fields for a specific entity
     */
    discoverFields?(entityName: string): Promise<IntegrationEntityField[]>;
    /**
     * Check adapter health and connectivity
     */
    healthCheck?(): Promise<HealthCheckResult>;
    /**
     * Extract rate limit info from response headers
     */
    protected extractRateLimitInfo?(headers: Headers): RateLimitInfo | null;
    /**
     * Get access token (handles refresh if needed)
     */
    protected getAccessToken(): Promise<string | null>;
    /**
     * Make authenticated API request with rate limit handling
     */
    protected makeRequest<T = any>(url: string, options?: RequestInit, timeoutMs?: number): Promise<{
        data?: T;
        error?: string;
        status: number;
        rateLimitInfo?: RateLimitInfo;
    }>;
}
/**
 * Adapter factory interface
 */
export interface IntegrationAdapterFactory {
    create(monitoring: IMonitoringProvider, connectionService: IntegrationConnectionService, tenantId: string, connectionId: string): BaseIntegrationAdapter;
}
/**
 * Registry for integration adapters
 */
export declare class IntegrationAdapterRegistry {
    private adapters;
    private monitoring?;
    constructor(monitoring?: IMonitoringProvider);
    register(integrationId: string, factory: IntegrationAdapterFactory): void;
    get(integrationId: string): IntegrationAdapterFactory | undefined;
    has(integrationId: string): boolean;
    list(): string[];
    unregister(integrationId: string): boolean;
    /**
     * Auto-discover and register adapters from a directory
     * Scans for adapter files matching pattern: *.adapter.ts or *.adapter.js
     */
    autoDiscoverAdapters(directory: string): Promise<number>;
    /**
     * Get adapter statistics
     */
    getStats(): {
        totalAdapters: number;
        adapterIds: string[];
    };
}
export declare const adapterRegistry: IntegrationAdapterRegistry;
//# sourceMappingURL=base-adapter.d.ts.map