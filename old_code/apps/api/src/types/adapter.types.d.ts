/**
 * Adapter Interface Types
 * Base interface for all integration adapters
 */
import type { SearchOptions, SearchResult } from './integration.types.js';
/**
 * Base integration adapter interface
 */
export interface IntegrationAdapter {
    readonly providerId: string;
    readonly providerName: string;
    connect(credentials: any): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    testConnection(): Promise<ConnectionTestResult>;
    fetchRecords?(entity: string, options: FetchOptions): Promise<FetchResult>;
    createRecord?(entity: string, data: Record<string, any>): Promise<CreateResult>;
    updateRecord?(entity: string, id: string, data: Record<string, any>): Promise<UpdateResult>;
    deleteRecord?(entity: string, id: string): Promise<DeleteResult>;
    search(options: SearchOptions): Promise<SearchResult>;
    registerWebhook?(events: string[], callbackUrl: string): Promise<WebhookRegistration>;
    validateWebhookSignature?(payload: any, signature: string): boolean;
    /**
     * Get the current authenticated user's profile from the external system
     * Returns the external user ID and optional profile information
     */
    getUserProfile?(): Promise<{
        id: string;
        email?: string;
        name?: string;
        [key: string]: any;
    }>;
}
/**
 * Connection test result
 */
export interface ConnectionTestResult {
    success: boolean;
    error?: string;
    details?: Record<string, any>;
}
/**
 * Fetch options
 */
export interface FetchOptions {
    limit?: number;
    offset?: number;
    filters?: Record<string, any>;
    userId?: string;
    externalUserId?: string;
    tenantId: string;
}
/**
 * Fetch result
 */
export interface FetchResult {
    records: Record<string, any>[];
    total: number;
    hasMore: boolean;
}
/**
 * Create result
 */
export interface CreateResult {
    id: string;
    success: boolean;
    error?: string;
}
/**
 * Update result
 */
export interface UpdateResult {
    success: boolean;
    error?: string;
}
/**
 * Delete result
 */
export interface DeleteResult {
    success: boolean;
    error?: string;
}
/**
 * Webhook registration
 */
export interface WebhookRegistration {
    webhookId: string;
    url: string;
    events: string[];
    secret?: string;
}
/**
 * Adapter context (passed to adapters)
 */
export interface AdapterContext {
    integration: any;
    userId?: string;
    tenantId: string;
    credentials?: any;
}
//# sourceMappingURL=adapter.types.d.ts.map