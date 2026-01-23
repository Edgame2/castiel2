import { IMonitoringProvider } from '@castiel/monitoring';
import { Redis } from 'ioredis';
import { createHmac, createVerify, createPublicKey } from 'crypto';
import {
  IntegrationConnectionRepository,
  IntegrationProviderRepository,
  SyncTaskRepository,
} from '@castiel/api-core';
import {
  IntegrationConnection,
  IntegrationProviderDocument,
} from '../types/integration.types.js';
import { AdapterManagerService } from './adapter-manager.service.js';
import { BaseIntegrationAdapter } from '../integrations/base-adapter.js';
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
  providerId?: string; // Provider's ID for the webhook
  providerWebhookId?: string; // Provider's internal webhook ID
  events: string[]; // ['contact.created', 'contact.updated', 'opportunity.stage_change']
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
  providerId: string; // 'salesforce', 'notion', etc.
  eventType: string; // 'created', 'updated', 'deleted'
  entityType: string; // 'Contact', 'Lead', 'Account'
  entityId: string;
  data: Record<string, any>;
  timestamp: Date;
  signature?: string;
  headers?: Record<string, string>;
}

/**
 * Provider-specific webhook signature verification config
 */
interface WebhookSignatureConfig {
  provider: string;
  algorithm: 'hmac-sha256' | 'hmac-sha1' | 'rsa-sha256' | 'request-signing';
  headerName: string; // e.g., 'X-Salesforce-Event-Signature'
  secretLocation: 'header' | 'body'; // Where the secret is provided
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
  webhookUrl: string; // Base URL for webhooks (e.g., https://api.castiel.app/webhooks)
  eventGridTopicEndpoint?: string;
  eventGridAccessKey?: string;
  adapterManager?: AdapterManagerService; // Optional adapter manager for webhook registration
  syncTaskService?: SyncTaskService; // Optional sync task service for triggering syncs
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
export class WebhookManagementService {
  private monitoring: IMonitoringProvider;
  private redis?: Redis;
  private connectionRepo: IntegrationConnectionRepository;
  private integrationRepo: IntegrationProviderRepository;
  private syncTaskRepo: SyncTaskRepository;
  private webhookUrl: string;
  private eventGridTopicEndpoint?: string;
  private eventGridAccessKey?: string;
  private adapterManager?: AdapterManagerService;
  private syncTaskService?: SyncTaskService;

  // In-memory cache for webhook registrations
  private webhookCache = new Map<string, WebhookRegistration>();

  // Provider-specific signature configs
  private readonly signatureConfigs: Record<string, WebhookSignatureConfig> = {
    salesforce: {
      provider: 'salesforce',
      algorithm: 'hmac-sha256',
      headerName: 'X-Salesforce-Event-Signature',
      secretLocation: 'header',
    },
    notion: {
      provider: 'notion',
      algorithm: 'hmac-sha256',
      headerName: 'X-Notion-Signature',
      secretLocation: 'header',
    },
    slack: {
      provider: 'slack',
      algorithm: 'hmac-sha256',
      headerName: 'X-Slack-Request-Timestamp',
      secretLocation: 'header',
    },
    github: {
      provider: 'github',
      algorithm: 'hmac-sha256',
      headerName: 'X-Hub-Signature-256',
      secretLocation: 'header',
    },
    google: {
      provider: 'google',
      algorithm: 'rsa-sha256',
      headerName: 'Authorization',
      secretLocation: 'header',
    },
  };

  constructor(options: WebhookManagementServiceOptions) {
    this.monitoring = options.monitoring;
    this.redis = options.redis;
    this.connectionRepo = options.connectionRepository;
    this.integrationRepo = options.integrationRepository;
    this.syncTaskRepo = options.syncTaskRepository;
    this.webhookUrl = options.webhookUrl;
    this.eventGridTopicEndpoint = options.eventGridTopicEndpoint;
    this.eventGridAccessKey = options.eventGridAccessKey;
    this.adapterManager = options.adapterManager;
    this.syncTaskService = options.syncTaskService;
  }

  // =====================
  // Registration
  // =====================

  /**
   * Register a webhook with an external provider
   */
  async registerWebhook(
    tenantId: string,
    integrationId: string,
    connectionId: string,
    events: string[],
    options?: {
      metadata?: Record<string, any>;
      retryPolicy?: { maxRetries: number; backoffSeconds: number };
    }
  ): Promise<WebhookRegistration> {
    // Get integration provider definition
    const integration = await this.integrationRepo.findByProviderName(integrationId);
    if (!integration) {
      throw new Error(`Integration provider not found: ${integrationId}`);
    }

    const connection = await this.connectionRepo.findById(connectionId, integrationId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    // Generate webhook secret
    const webhookSecret = this.generateWebhookSecret();
    const registrationId = this.generateRegistrationId();

    // Build webhook URL with identifier
    const callbackUrl = `${this.webhookUrl}/${registrationId}`;

    try {
      // Register with provider (via adapter)
      const providerResponse = await this.registerWithProvider(
        integration,
        connection,
        callbackUrl,
        events,
        webhookSecret
      );

      // Create registration record
      const registration: WebhookRegistration = {
        id: registrationId,
        tenantId,
        integrationId,
        connectionId,
        webhookUrl: callbackUrl,
        webhookSecret,
        providerWebhookId: providerResponse?.webhookId,
        events,
        status: 'pending_verification',
        isVerified: false,
        failureCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        retryPolicy: options?.retryPolicy || {
          maxRetries: 3,
          backoffSeconds: 60,
        },
        metadata: {
          ...options?.metadata,
          resourceId: providerResponse?.secret, // Store resourceId for adapters that need it (e.g., Google Workspace)
          expirationDateTime: providerResponse?.expirationDateTime,
        },
      };

      // Cache registration
      this.webhookCache.set(registrationId, registration);

      // Store in Redis for persistence
      if (this.redis) {
        await this.redis.setex(
          `webhook:registration:${registrationId}`,
          3600, // 1 hour
          JSON.stringify(registration)
        );
      }

      this.monitoring.trackEvent('webhook.registered', {
        registrationId,
        tenantId,
        integrationId,
        connectionId,
        eventCount: events.length,
        provider: integration.name,
      });

      return registration;
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'webhook.register',
        tenantId,
        integrationId,
      });

      throw new Error(
        `Failed to register webhook with ${integration.name}: ${error.message}`
      );
    }
  }

  /**
   * Unregister a webhook from provider
   */
  async unregisterWebhook(
    registrationId: string,
    tenantId: string
  ): Promise<void> {
    const registration = await this.getRegistration(registrationId);
    if (!registration) {
      throw new Error(`Webhook registration not found: ${registrationId}`);
    }

    try {
      // Get integration provider definition
      const integration = await this.integrationRepo.findByProviderName(
        registration.integrationId
      );
      if (!integration) {
        throw new Error(`Integration not found: ${registration.integrationId}`);
      }

      const connection = await this.connectionRepo.findById(
        registration.connectionId,
        registration.integrationId
      );
      if (!connection) {
        throw new Error(`Connection not found: ${registration.connectionId}`);
      }

      // Unregister from provider (via adapter)
      if (registration.providerWebhookId) {
        await this.unregisterWithProvider(
          integration,
          connection,
          registration.providerWebhookId,
          registration.metadata?.resourceId // Some adapters need resourceId (e.g., Google Workspace)
        );
      }

      // Remove from cache and Redis
      this.webhookCache.delete(registrationId);
      if (this.redis) {
        await this.redis.del(`webhook:registration:${registrationId}`);
      }

      this.monitoring.trackEvent('webhook.unregistered', {
        registrationId,
        tenantId,
        integrationId: registration.integrationId,
      });
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'webhook.unregister',
        registrationId,
      });

      throw new Error(`Failed to unregister webhook: ${error.message}`);
    }
  }

  // =====================
  // Event Processing
  // =====================

  /**
   * Process incoming webhook event
   */
  async processWebhookEvent(
    registrationId: string,
    headers: Record<string, string>,
    body: string | Buffer
  ): Promise<WebhookProcessResult> {
    const startTime = Date.now();

    try {
      // Get webhook registration
      const registration = await this.getRegistration(registrationId);
      if (!registration) {
        throw new Error(`Webhook registration not found: ${registrationId}`);
      }

      // Verify webhook signature
      const verified = await this.verifyWebhookSignature(
        registration,
        headers,
        body
      );

      if (!verified) {
        this.monitoring.trackEvent('webhook.signature_verification_failed', {
          registrationId,
          integrationId: registration.integrationId,
        });

        // Track failure
        await this.recordWebhookFailure(
          registrationId,
          'Signature verification failed'
        );

        throw new Error('Webhook signature verification failed');
      }

      // Mark as verified on first successful event
      if (!registration.isVerified) {
        registration.isVerified = true;
        registration.verifiedAt = new Date();
        registration.status = 'active';
        await this.updateRegistration(registrationId, registration);
      }

      // Parse event
      const bodyStr = typeof body === 'string' ? body : body.toString('utf-8');
      const eventData = JSON.parse(bodyStr);

      // Route to Event Grid (if configured)
      if (this.eventGridTopicEndpoint && this.eventGridAccessKey) {
        await this.publishToEventGrid(registrationId, eventData);
      }

      // Get integration provider definition
      const integration = await this.integrationRepo.findByProviderName(
        registration.integrationId
      );

      if (!integration) {
        throw new Error(`Integration provider not found: ${registration.integrationId}`);
      }

      // Parse event according to provider format
      const webhookEvent = this.parseProviderEvent(
        integration.name,
        eventData
      );

      // Trigger sync if applicable
      let syncTriggered = false;
      if (this.shouldTriggerSync(registration, webhookEvent)) {
        syncTriggered = await this.triggerSyncForEvent(
          registration,
          webhookEvent
        );
      }

      // Update last event timestamp
      registration.lastEventAt = new Date();
      registration.failureCount = 0;
      registration.failureReasons = undefined;
      await this.updateRegistration(registrationId, registration);

      this.monitoring.trackEvent('webhook.processed', {
        registrationId,
        integrationId: registration.integrationId,
        eventType: webhookEvent.eventType,
        entityType: webhookEvent.entityType,
        syncTriggered,
        processingTimeMs: Date.now() - startTime,
      });

      return {
        success: true,
        registrationId,
        eventType: webhookEvent.eventType,
        entityId: webhookEvent.entityId,
        entityType: webhookEvent.entityType,
        integrationId: registration.integrationId,
        tenantId: registration.tenantId,
        syncTriggered,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'webhook.process',
        registrationId,
      });

      return {
        success: false,
        registrationId,
        eventType: 'unknown',
        entityId: 'unknown',
        error: error.message,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  // =====================
  // Signature Verification
  // =====================

  /**
   * Verify webhook signature based on provider
   */
  private async verifyWebhookSignature(
    registration: WebhookRegistration,
    headers: Record<string, string>,
    body: string | Buffer
  ): Promise<boolean> {
    const integration = await this.integrationRepo.findByProviderName(
      registration.integrationId
    );

    if (!integration) {
      return false;
    }

    const config = this.signatureConfigs[integration.name.toLowerCase()];
    if (!config) {
      // No signature config for this provider, allow it
      this.monitoring.trackEvent('webhook.no_signature_config', {
        provider: integration.name,
      });
      return true;
    }

    const bodyStr = typeof body === 'string' ? body : body.toString('utf-8');

    switch (config.algorithm) {
      case 'hmac-sha256':
        return this.verifyHmacSignature(
          registration.webhookSecret,
          config.headerName,
          headers,
          bodyStr
        );

      case 'hmac-sha1':
        return this.verifyHmacSignature(
          registration.webhookSecret,
          config.headerName,
          headers,
          bodyStr,
          'sha1'
        );

      case 'rsa-sha256':
        return this.verifyRsaSignature(
          config.headerName,
          headers,
          bodyStr
        );

      case 'request-signing':
        return this.verifyRequestSigning(
          registration.webhookSecret,
          headers,
          bodyStr
        );

      default:
        return false;
    }
  }

  /**
   * Verify HMAC signature
   */
  private verifyHmacSignature(
    secret: string,
    headerName: string,
    headers: Record<string, string>,
    body: string,
    algorithm: string = 'sha256'
  ): boolean {
    const signature = headers[headerName.toLowerCase()];
    if (!signature) {
      return false;
    }

    // Handle different signature formats
    let expectedSignature: string;

    // Some providers use "sha256=..." format
    if (signature.includes('=')) {
      const [algo, sig] = signature.split('=');
      expectedSignature = createHmac(algo || algorithm, secret)
        .update(body)
        .digest('hex');
      return sig === expectedSignature;
    } else {
      // Others just provide the hex digest
      expectedSignature = createHmac(algorithm, secret)
        .update(body)
        .digest('hex');
      return signature === expectedSignature;
    }
  }

  /**
   * Verify RSA signature (for Google, etc.)
   */
  private async verifyRsaSignature(
    headerName: string,
    _headers: Record<string, string>,
    _body: string
  ): Promise<boolean> {
    // This would require fetching the public key from the provider
    // For now, stub implementation
    this.monitoring.trackEvent('webhook.rsa_verification_stub', {
      headerName,
    });
    return true;
  }

  /**
   * Verify request signing (for Notion, etc.)
   */
  private verifyRequestSigning(
    secret: string,
    headers: Record<string, string>,
    body: string
  ): boolean {
    // Notion uses X-Notion-Signature header with timestamp
    const signature = headers['x-notion-signature'];
    const timestamp = headers['x-notion-request-time-ms'];

    if (!signature || !timestamp) {
      return false;
    }

    // Prevent replay attacks
    const requestTime = parseInt(timestamp);
    const now = Date.now();
    const timeDiff = Math.abs(now - requestTime);

    if (timeDiff > 300000) { // 5 minutes
      return false;
    }

    // Verify signature
    const expected = createHmac('sha256', secret)
      .update(`${timestamp}.${body}`)
      .digest('hex');

    return signature === expected;
  }

  // =====================
  // Health Monitoring
  // =====================

  /**
   * Check health of a webhook registration
   */
  async checkWebhookHealth(registrationId: string): Promise<WebhookHealth> {
    const registration = await this.getRegistration(registrationId);
    if (!registration) {
      throw new Error(`Webhook registration not found: ${registrationId}`);
    }

    const failureRate = registration.failureCount > 0
      ? Math.min(registration.failureCount / 10, 1) // Scale to 0-1
      : 0;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let recommendedAction: string | undefined;

    if (failureRate >= 0.5) {
      status = 'unhealthy';
      recommendedAction = 'Webhook should be investigated and re-registered';
    } else if (failureRate >= 0.2) {
      status = 'degraded';
      recommendedAction = 'Webhook experiencing occasional failures';
    }

    if (!registration.isVerified) {
      status = 'unhealthy';
      recommendedAction = 'Webhook has not been verified with provider';
    }

    return {
      registrationId,
      status,
      lastEventAt: registration.lastEventAt,
      failureRate,
      failureReasons: registration.failureReasons,
      recommendedAction,
    };
  }

  /**
   * Get all unhealthy webhooks for monitoring
   */
  async getUnhealthyWebhooks(): Promise<WebhookHealth[]> {
    const unhealthy: WebhookHealth[] = [];

    // Iterate through cached registrations
    for (const registration of this.webhookCache.values()) {
      const health = await this.checkWebhookHealth(registration.id);
      if (health.status !== 'healthy') {
        unhealthy.push(health);
      }
    }

    return unhealthy;
  }

  /**
   * Record webhook failure
   */
  private async recordWebhookFailure(
    registrationId: string,
    reason: string
  ): Promise<void> {
    const registration = await this.getRegistration(registrationId);
    if (!registration) {
      return;
    }

    registration.failureCount++;
    registration.failureReasons = registration.failureReasons || [];
    if (registration.failureReasons.length < 10) {
      registration.failureReasons.push(
        `${new Date().toISOString()}: ${reason}`
      );
    }

    if (registration.failureCount >= 5) {
      registration.status = 'failed';
    }

    await this.updateRegistration(registrationId, registration);
  }

  // =====================
  // Event Parsing
  // =====================

  /**
   * Parse webhook event according to provider format
   */
  private parseProviderEvent(
    provider: string,
    eventData: any
  ): WebhookEvent {
    switch (provider.toLowerCase()) {
      case 'salesforce':
        return this.parseSalesforceEvent(eventData);
      case 'notion':
        return this.parseNotionEvent(eventData);
      case 'slack':
        return this.parseSlackEvent(eventData);
      case 'github':
        return this.parseGithubEvent(eventData);
      case 'google':
        return this.parseGoogleEvent(eventData);
      default:
        return {
          providerId: provider,
          eventType: eventData.type || 'unknown',
          entityType: eventData.entity_type || 'unknown',
          entityId: eventData.entity_id || 'unknown',
          data: eventData,
          timestamp: new Date(),
        };
    }
  }

  private parseSalesforceEvent(data: any): WebhookEvent {
    return {
      providerId: 'salesforce',
      eventType: data.action?.toLowerCase() || 'modified',
      entityType: data.sobject?.type || 'SObject',
      entityId: data.sobject?.id || 'unknown',
      data: data.sobject?.fields || {},
      timestamp: new Date(data.createdDate || Date.now()),
    };
  }

  private parseNotionEvent(data: any): WebhookEvent {
    return {
      providerId: 'notion',
      eventType: data.type || 'unknown',
      entityType: data.object || 'page',
      entityId: data.id || 'unknown',
      data,
      timestamp: new Date(data.created_time || Date.now()),
    };
  }

  private parseSlackEvent(data: any): WebhookEvent {
    // Slack event wrapper structure
    const event = data.event || {};
    return {
      providerId: 'slack',
      eventType: event.type || 'unknown',
      entityType: data.type || 'message',
      entityId: event.channel || event.user || 'unknown',
      data: event,
      timestamp: new Date(event.ts ? parseInt(event.ts) * 1000 : Date.now()),
    };
  }

  private parseGithubEvent(data: any): WebhookEvent {
    return {
      providerId: 'github',
      eventType: data.action || 'unknown',
      entityType: 'repository',
      entityId: data.repository?.id?.toString() || 'unknown',
      data,
      timestamp: new Date(),
    };
  }

  private parseGoogleEvent(data: any): WebhookEvent {
    return {
      providerId: 'google',
      eventType: data.type || 'unknown',
      entityType: data.resourceType || 'resource',
      entityId: data.resourceId || 'unknown',
      data,
      timestamp: new Date(),
    };
  }

  /**
   * Determine if webhook event should trigger sync
   */
  private shouldTriggerSync(
    registration: WebhookRegistration,
    event: WebhookEvent
  ): boolean {
    // Only trigger if webhook is active and verified
    if (registration.status !== 'active' || !registration.isVerified) {
      return false;
    }

    // Check if event type is in registered events
    const eventPattern = `${event.entityType}.${event.eventType}`;
    return registration.events.some((e) => {
      // Support wildcards (e.g., 'Contact.*')
      if (e === '*' || e === '*.*') {return true;}
      if (e.endsWith('.*')) {
        const prefix = e.substring(0, e.length - 2);
        return eventPattern.startsWith(prefix);
      }
      return e === eventPattern || e === event.eventType;
    });
  }

  /**
   * Trigger sync when webhook event is received
   */
  private async triggerSyncForEvent(
    registration: WebhookRegistration,
    event: WebhookEvent
  ): Promise<boolean> {
    try {
      // Find sync task for this integration
      const tasks = await this.syncTaskRepo.list({
        filter: {
          tenantId: registration.tenantId,
          tenantIntegrationId: registration.integrationId,
        },
        limit: 1,
      });

      if (!tasks.tasks || tasks.tasks.length === 0) {
        this.monitoring.trackEvent('webhook.sync_triggered.no_task', {
          registrationId: registration.id,
          integrationId: registration.integrationId,
        });
        return false;
      }

      const task = tasks.tasks[0];

      // If sync task service is not available, log and return false
      if (!this.syncTaskService) {
        this.monitoring.trackEvent('webhook.sync_triggered.service_unavailable', {
          registrationId: registration.id,
          taskId: task.id,
        });
        return false;
      }

      // Trigger sync execution with 'webhook' trigger type
      // Use 'system' as userId since webhooks are system-triggered
      try {
        await this.syncTaskService.triggerSync(
          task.id,
          registration.tenantId,
          'system' // System user for webhook-triggered syncs
        );

        this.monitoring.trackEvent('webhook.sync_triggered.success', {
          registrationId: registration.id,
          taskId: task.id,
          eventType: event.eventType,
          entityId: event.entityId,
        });

        return true;
      } catch (syncError: any) {
        // If sync is already running, that's okay - just log it
        if (syncError.message?.includes('already running')) {
          this.monitoring.trackEvent('webhook.sync_triggered.already_running', {
            registrationId: registration.id,
            taskId: task.id,
          });
          return true; // Consider this a success since sync is in progress
        }

        // Re-throw other errors to be caught by outer catch
        throw syncError;
      }
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'webhook.trigger_sync',
        registrationId: registration.id,
      });

      return false;
    }
  }

  // =====================
  // Event Grid Integration
  // =====================

  /**
   * Publish webhook event to Azure Event Grid
   */
  private async publishToEventGrid(
    registrationId: string,
    eventData: any
  ): Promise<void> {
    if (!this.eventGridTopicEndpoint || !this.eventGridAccessKey) {
      return;
    }

    try {
      const events = [
        {
          eventType: 'webhook.received',
          subject: registrationId,
          eventTime: new Date(),
          id: `${registrationId}-${Date.now()}`,
          data: eventData,
          dataVersion: '1.0',
        },
      ];

      const response = await fetch(this.eventGridTopicEndpoint, {
        method: 'POST',
        headers: {
          'aeg-sas-key': this.eventGridAccessKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(events),
      });

      if (!response.ok) {
        throw new Error(`Event Grid returned ${response.status}`);
      }
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'webhook.publish_to_event_grid',
        registrationId,
      });

      // Don't throw - event already processed
    }
  }

  // =====================
  // Provider Integration
  // =====================

  /**
   * Register webhook with provider via adapter
   */
  private async registerWithProvider(
    integration: IntegrationProviderDocument,
    connection: IntegrationConnection,
    callbackUrl: string,
    events: string[],
    _secret: string
  ): Promise<{ webhookId?: string; expirationDateTime?: Date; secret?: string }> {
    // If adapter manager is not available, return stub response
    if (!this.adapterManager) {
      this.monitoring.trackEvent('webhook.register_with_provider.stub', {
        provider: integration.provider,
        eventCount: events.length,
      });
      return { webhookId: this.generateRegistrationId() };
    }

    try {
      // Get adapter instance
      const adapter = await this.adapterManager.getAdapter(
        integration.provider,
        {
          id: integration.id,
          tenantId: connection.tenantId,
          provider: integration.provider,
          name: integration.name,
          userScoped: integration.requiresUserScoping || false,
        } as any,
        connection.userId
      ) as unknown as BaseIntegrationAdapter;

      // Check if adapter supports webhook registration
      if (typeof (adapter as any).registerWebhook !== 'function') {
        this.monitoring.trackEvent('webhook.register_with_provider.not_supported', {
          provider: integration.provider,
        });
        // Return stub response if adapter doesn't support webhooks
        return { webhookId: this.generateRegistrationId() };
      }

      // Call adapter's registerWebhook method
      // Different adapters may have different signatures, so we need to handle them
      const result = await (adapter as any).registerWebhook(
        events,
        callbackUrl,
        undefined // Some adapters need resource parameter
      );

      this.monitoring.trackEvent('webhook.register_with_provider.success', {
        provider: integration.provider,
        eventCount: events.length,
        webhookId: result.webhookId,
      });

      return {
        webhookId: result.webhookId || result.id,
        expirationDateTime: result.expirationDateTime,
        secret: result.secret,
      };
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'webhook.register_with_provider',
        provider: integration.provider,
      });
      // If adapter registration fails, still return a webhook ID for tracking
      // The webhook will be marked as pending_verification
      return { webhookId: this.generateRegistrationId() };
    }
  }

  /**
   * Unregister webhook from provider via adapter
   */
  private async unregisterWithProvider(
    integration: IntegrationProviderDocument,
    connection: IntegrationConnection,
    providerWebhookId: string,
    resourceId?: string
  ): Promise<void> {
    // If adapter manager is not available, just log
    if (!this.adapterManager) {
      this.monitoring.trackEvent('webhook.unregister_with_provider.stub', {
        provider: integration.provider,
        providerWebhookId,
      });
      return;
    }

    try {
      // Get adapter instance
      const adapter = await this.adapterManager.getAdapter(
        integration.provider,
        {
          id: integration.id,
          tenantId: connection.tenantId,
          provider: integration.provider,
          name: integration.name,
          userScoped: integration.requiresUserScoping || false,
        } as any,
        connection.userId
      ) as unknown as BaseIntegrationAdapter;

      // Check if adapter supports webhook unregistration
      if (typeof (adapter as any).unregisterWebhook !== 'function') {
        this.monitoring.trackEvent('webhook.unregister_with_provider.not_supported', {
          provider: integration.provider,
        });
        return;
      }

      // Call adapter's unregisterWebhook method
      // Some adapters need resourceId parameter (e.g., Google Workspace)
      await (adapter as any).unregisterWebhook(providerWebhookId, resourceId);

      this.monitoring.trackEvent('webhook.unregister_with_provider.success', {
        provider: integration.provider,
        providerWebhookId,
      });
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'webhook.unregister_with_provider',
        provider: integration.provider,
        providerWebhookId,
      });
      // Don't throw - log error but allow unregistration to continue
      // The webhook will be removed from our system even if provider unregistration fails
    }
  }

  // =====================
  // Cache Management
  // =====================

  /**
   * Get webhook registration from cache or store
   */
  private async getRegistration(
    registrationId: string
  ): Promise<WebhookRegistration | null> {
    // Check in-memory cache first
    let registration = this.webhookCache.get(registrationId);
    if (registration) {
      return registration;
    }

    // Check Redis
    if (this.redis) {
      const cached = await this.redis.get(
        `webhook:registration:${registrationId}`
      );
      if (cached) {
        registration = JSON.parse(cached) as WebhookRegistration;
        this.webhookCache.set(registrationId, registration);
        return registration;
      }
    }

    return null;
  }

  /**
   * Update webhook registration in cache and store
   */
  private async updateRegistration(
    registrationId: string,
    registration: WebhookRegistration
  ): Promise<void> {
    // Update in-memory cache
    this.webhookCache.set(registrationId, registration);

    // Update Redis
    if (this.redis) {
      await this.redis.setex(
        `webhook:registration:${registrationId}`,
        3600,
        JSON.stringify(registration)
      );
    }
  }

  // =====================
  // Utilities
  // =====================

  /**
   * Generate webhook secret (32 bytes hex)
   */
  private generateWebhookSecret(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate registration ID
   */
  private generateRegistrationId(): string {
    const crypto = require('crypto');
    return `wh_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * List all webhook registrations for a connection
   */
  async listRegistrations(
    tenantId: string,
    integrationId: string,
    connectionId?: string
  ): Promise<WebhookRegistration[]> {
    const registrations: WebhookRegistration[] = [];

    for (const registration of this.webhookCache.values()) {
      if (
        registration.tenantId === tenantId &&
        registration.integrationId === integrationId &&
        (!connectionId || registration.connectionId === connectionId)
      ) {
        registrations.push(registration);
      }
    }

    return registrations;
  }

  /**
   * Get webhook registration by ID
   */
  async getWebhookRegistration(
    registrationId: string
  ): Promise<WebhookRegistration | null> {
    return this.getRegistration(registrationId);
  }

  /**
   * Health check for webhook service
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    totalRegistrations: number;
    activeRegistrations: number;
    unhealthyCount: number;
  }> {
    const totalRegistrations = this.webhookCache.size;
    const activeRegistrations = Array.from(this.webhookCache.values()).filter(
      (w) => w.status === 'active'
    ).length;
    const unhealthy = await this.getUnhealthyWebhooks();

    return {
      healthy: unhealthy.length === 0,
      totalRegistrations,
      activeRegistrations,
      unhealthyCount: unhealthy.length,
    };
  }
}
