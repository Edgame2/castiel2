import { IMonitoringProvider } from '@castiel/monitoring';
import { Redis } from 'ioredis';
import { IntegrationConnectionRepository, IntegrationProviderRepository } from '../repositories/integration.repository.js';
import { SyncTaskRepository } from '../repositories/sync-task.repository.js';
import { AdapterManagerService } from './adapter-manager.service.js';
import type { SyncTaskService } from './sync-task.service.js';
/**
 * Webhook registration containing provider-specific configuration
 */
export interface WebhookRegistration {
    id: string;
    tenantId: string;
    integrationId: string;
    connectionId: string;
    webhookUrl: string;
    webhookSecret: string;
    providerId?: string;
    providerWebhookId?: string;
    events: string[];
    status: 'active' | 'inactive' | 'failed' | 'pending_verification';
    isVerified: boolean;
    verifiedAt?: Date;
    lastEventAt?: Date;
    failureCount: number;
    failureReasons?: string[];
    retryPolicy?: {
        maxRetries: number;
        backoffSeconds: number;
    };
    createdAt: Date;
    updatedAt: Date;
    metadata?: Record<string, any>;
}
/**
 * Webhook event from provider
 */
export interface WebhookEvent {
    providerId: string;
    eventType: string;
    entityType: string;
    entityId: string;
    data: Record<string, any>;
    timestamp: Date;
    signature?: string;
    headers?: Record<string, string>;
}
/**
 * Webhook health check result
 */
export interface WebhookHealth {
    registrationId: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastEventAt?: Date;
    failureRate: number;
    failureReasons?: string[];
    recommendedAction?: string;
}
/**
 * Webhook processing result
 */
export interface WebhookProcessResult {
    success: boolean;
    registrationId: string;
    eventType: string;
    entityId: string;
    entityType?: string;
    integrationId?: string;
    tenantId?: string;
    syncTriggered?: boolean;
    error?: string;
    processingTimeMs: number;
}
interface WebhookManagementServiceOptions {
    monitoring: IMonitoringProvider;
    redis?: Redis;
    connectionRepository: IntegrationConnectionRepository;
    integrationRepository: IntegrationProviderRepository;
    syncTaskRepository: SyncTaskRepository;
    webhookUrl: string;
    eventGridTopicEndpoint?: string;
    eventGridAccessKey?: string;
    adapterManager?: AdapterManagerService;
    syncTaskService?: SyncTaskService;
}
/**
 * Webhook Management Service
 *
 * Handles:
 * - Webhook registration with external providers
 * - Event processing and validation
 * - Provider-specific signature verification (HMAC, RSA, request signing)
 * - Health monitoring and failure recovery
 * - Event Grid integration for routing
 * - Retry policies and exponential backoff
 *
 * Supported Providers:
 * - Salesforce: Event stream API with HMAC-SHA256
 * - Notion: Event webhooks with request signing
 * - Slack: Event API with HMAC-SHA256
 * - Google: Push notifications with JWT verification
 * - GitHub: Webhooks with HMAC-SHA256
 */
export declare class WebhookManagementService {
    private monitoring;
    private redis?;
    private connectionRepo;
    private integrationRepo;
    private syncTaskRepo;
    private webhookUrl;
    private eventGridTopicEndpoint?;
    private eventGridAccessKey?;
    private adapterManager?;
    private syncTaskService?;
    private webhookCache;
    private readonly signatureConfigs;
    constructor(options: WebhookManagementServiceOptions);
    /**
     * Register a webhook with an external provider
     */
    registerWebhook(tenantId: string, integrationId: string, connectionId: string, events: string[], options?: {
        metadata?: Record<string, any>;
        retryPolicy?: {
            maxRetries: number;
            backoffSeconds: number;
        };
    }): Promise<WebhookRegistration>;
    /**
     * Unregister a webhook from provider
     */
    unregisterWebhook(registrationId: string, tenantId: string): Promise<void>;
    /**
     * Process incoming webhook event
     */
    processWebhookEvent(registrationId: string, headers: Record<string, string>, body: string | Buffer): Promise<WebhookProcessResult>;
    /**
     * Verify webhook signature based on provider
     */
    private verifyWebhookSignature;
    /**
     * Verify HMAC signature
     */
    private verifyHmacSignature;
    /**
     * Verify RSA signature (for Google, etc.)
     */
    private verifyRsaSignature;
    /**
     * Verify request signing (for Notion, etc.)
     */
    private verifyRequestSigning;
    /**
     * Check health of a webhook registration
     */
    checkWebhookHealth(registrationId: string): Promise<WebhookHealth>;
    /**
     * Get all unhealthy webhooks for monitoring
     */
    getUnhealthyWebhooks(): Promise<WebhookHealth[]>;
    /**
     * Record webhook failure
     */
    private recordWebhookFailure;
    /**
     * Parse webhook event according to provider format
     */
    private parseProviderEvent;
    private parseSalesforceEvent;
    private parseNotionEvent;
    private parseSlackEvent;
    private parseGithubEvent;
    private parseGoogleEvent;
    /**
     * Determine if webhook event should trigger sync
     */
    private shouldTriggerSync;
    /**
     * Trigger sync when webhook event is received
     */
    private triggerSyncForEvent;
    /**
     * Publish webhook event to Azure Event Grid
     */
    private publishToEventGrid;
    /**
     * Register webhook with provider via adapter
     */
    private registerWithProvider;
    /**
     * Unregister webhook from provider via adapter
     */
    private unregisterWithProvider;
    /**
     * Get webhook registration from cache or store
     */
    private getRegistration;
    /**
     * Update webhook registration in cache and store
     */
    private updateRegistration;
    /**
     * Generate webhook secret (32 bytes hex)
     */
    private generateWebhookSecret;
    /**
     * Generate registration ID
     */
    private generateRegistrationId;
    /**
     * List all webhook registrations for a connection
     */
    listRegistrations(tenantId: string, integrationId: string, connectionId?: string): Promise<WebhookRegistration[]>;
    /**
     * Get webhook registration by ID
     */
    getWebhookRegistration(registrationId: string): Promise<WebhookRegistration | null>;
    /**
     * Health check for webhook service
     */
    healthCheck(): Promise<{
        healthy: boolean;
        totalRegistrations: number;
        activeRegistrations: number;
        unhealthyCount: number;
    }>;
}
export {};
//# sourceMappingURL=webhook-management.service.d.ts.map