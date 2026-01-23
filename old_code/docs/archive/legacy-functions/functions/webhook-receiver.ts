import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import { ServiceBusClient } from '@azure/service-bus';
import { WebhookManagementService } from '../services/webhook-management.service';
import { SecureCredentialService } from '../services/secure-credential.service';
import { IntegrationRateLimiter } from '../services/integration-rate-limiter.service';

/**
 * WebhookReceiver Azure Function
 * 
 * Standalone serverless function for receiving webhook events from external systems.
 * Separates webhook handling from main API to enable independent scaling.
 * Verifies signatures, parses events, and queues for sync processing.
 * 
 * Trigger: HTTP (POST)
 * Input: Webhook event payload from external system
 * Output: Service Bus (sync queue), Cosmos DB (webhook audit)
 */

interface WebhookReceiverConfig {
  cosmosEndpoint: string;
  cosmosKey: string;
  databaseId: string;
  containerId: string;
  keyVaultUrl: string;
  serviceBusConnectionString: string;
  outboundQueueName: string;
  redisUrl: string;
}

interface WebhookAudit {
  id: string;
  timestamp: string;
  registrationId: string;
  integrationId: string;
  tenantId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  verified: boolean;
  queued: boolean;
  error?: string;
  duration: number;
  sourceIp: string;
}

class WebhookReceiverFunction {
  private cosmosClient: CosmosClient;
  private serviceBusClient: ServiceBusClient;
  private webhookService: WebhookManagementService;
  private credentialService: SecureCredentialService;
  private rateLimiter: IntegrationRateLimiter;
  private config: WebhookReceiverConfig;

  constructor(config: WebhookReceiverConfig) {
    this.config = config;

    this.cosmosClient = new CosmosClient({
      endpoint: config.cosmosEndpoint,
      key: config.cosmosKey,
    });

    this.serviceBusClient = new ServiceBusClient(
      config.serviceBusConnectionString
    );

    const credential = new DefaultAzureCredential();

    this.credentialService = new SecureCredentialService(
      config.keyVaultUrl,
      credential
    );

    this.webhookService = new WebhookManagementService(
      this.cosmosClient.database(config.databaseId),
      this.credentialService
    );

    this.rateLimiter = new IntegrationRateLimiter(
      config.redisUrl,
      this.cosmosClient.database(config.databaseId).container('integrations')
    );
  }

  /**
   * Main HTTP trigger handler
   * Receives webhook events from external systems
   */
  async handle(req: HttpRequest, context: any): Promise<HttpResponseInit> {
    const startTime = Date.now();
    const executionId = context.invocationId;
    const sourceIp = req.headers.get('x-forwarded-for') || 'unknown';

    context.log(
      `[${executionId}] Webhook received from ${sourceIp}`
    );

    let audit: Partial<WebhookAudit> = {
      id: executionId,
      timestamp: new Date().toISOString(),
      sourceIp,
      duration: 0,
      verified: false,
      queued: false,
    };

    try {
      // Extract registration ID from path or headers
      const pathMatch = req.url.match(/webhooks\/([^/]+)\//);
      const registrationId = pathMatch ? pathMatch[1] : req.headers.get('x-webhook-id');

      if (!registrationId) {
        return this.errorResponse(400, 'Missing webhook registration ID', audit, context);
      }

      audit.registrationId = registrationId;

      // Get webhook registration details
      const registration =
        await this.webhookService.getWebhookRegistration(registrationId);

      if (!registration) {
        context.log.warn(`[${executionId}] Unknown webhook registration: ${registrationId}`);
        return this.errorResponse(404, 'Webhook registration not found', audit, context);
      }

      audit.integrationId = registration.integrationId;
      audit.tenantId = registration.tenantId;

      // Check rate limits
      const rateLimitCheck = await this.rateLimiter.checkRateLimit({
        integrationId: registration.integrationId,
        tenantId: registration.tenantId,
        operation: 'webhook',
      });

      if (!rateLimitCheck.allowed) {
        context.log.warn(
          `[${executionId}] Rate limit exceeded for webhook ${registrationId}`
        );
        return this.rateLimitedResponse(
          rateLimitCheck.retryAfterSeconds,
          audit,
          context
        );
      }

      // Verify webhook signature
      const bodyText = await req.text();
      const verified = await this.webhookService.verifyWebhookSignature(
        registration.providerId,
        bodyText,
        req.headers,
        registration.webhookSecret
      );

      audit.verified = verified;

      if (!verified) {
        context.log.warn(
          `[${executionId}] Webhook signature verification failed for ${registrationId}`
        );
        return this.errorResponse(401, 'Webhook signature verification failed', audit, context);
      }

      // Parse webhook event
      let event: any;
      try {
        event = JSON.parse(bodyText);
      } catch {
        return this.errorResponse(400, 'Invalid JSON payload', audit, context);
      }

      // Process webhook event
      const result = await this.webhookService.processWebhookEvent(
        registration,
        event
      );

      audit.eventType = result.eventType;
      audit.entityType = result.entityType;
      audit.entityId = result.entityId;

      // Queue outbound sync if applicable
      if (result.shouldSync) {
        const queued = await this.queueSync(
          registration,
          result,
          executionId,
          context
        );

        audit.queued = queued;

        if (!queued) {
          context.log.warn(
            `[${executionId}] Failed to queue sync for webhook event`
          );
        }
      }

      // Store audit record
      await this.storeAudit({
        ...audit,
        duration: Date.now() - startTime,
      } as WebhookAudit, context);

      context.log(
        `[${executionId}] Webhook processed successfully in ${Date.now() - startTime}ms`
      );

      return {
        status: 200,
        jsonBody: {
          success: true,
          eventType: result.eventType,
          entityId: result.entityId,
          synced: result.shouldSync && audit.queued,
        },
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : String(error);
      context.log.error(`[${executionId}] Webhook processing failed: ${errorMsg}`);

      audit.error = errorMsg;
      audit.duration = Date.now() - startTime;

      await this.storeAudit(audit as WebhookAudit, context);

      return this.errorResponse(500, 'Internal server error', audit, context);
    }
  }

  /**
   * Queue outbound sync for webhook event
   */
  private async queueSync(
    registration: any,
    result: any,
    executionId: string,
    context: any
  ): Promise<boolean> {
    try {
      const sender = this.serviceBusClient.createSender(
        this.config.outboundQueueName
      );

      const message = {
        body: JSON.stringify({
          integrationId: registration.integrationId,
          tenantId: registration.tenantId,
          connectionId: registration.connectionId,
          entityId: result.entityId,
          shardId: result.entityId,
          operation: result.operation,
          changes: result.data,
          correlationId: executionId,
          timestamp: new Date().toISOString(),
        }),
        correlationId: executionId,
        label: `webhook-${registration.integrationId}-${result.operation}`,
        applicationProperties: {
          integrationId: registration.integrationId,
          tenantId: registration.tenantId,
          entityId: result.entityId,
          operation: result.operation,
          eventType: result.eventType,
        },
      };

      await sender.sendMessages(message);
      await sender.close();

      return true;
    } catch (error) {
      context.log.error(
        `Failed to queue sync: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  /**
   * Store webhook audit record
   */
  private async storeAudit(
    audit: WebhookAudit,
    context: any
  ): Promise<void> {
    try {
      const container = this.cosmosClient
        .database(this.config.databaseId)
        .container('webhook-audit');

      await container.items.create({
        ...audit,
        ttl: 2592000, // 30 days
      });
    } catch (error) {
      context.log.warn(
        `Failed to store audit: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Format error response
   */
  private errorResponse(
    status: number,
    message: string,
    audit: Partial<WebhookAudit>,
    context: any
  ): HttpResponseInit {
    return {
      status,
      jsonBody: {
        success: false,
        error: message,
        auditId: audit.id,
      },
    };
  }

  /**
   * Format rate limit response
   */
  private rateLimitedResponse(
    retryAfter: number,
    audit: Partial<WebhookAudit>,
    context: any
  ): HttpResponseInit {
    return {
      status: 429,
      headers: {
        'Retry-After': retryAfter.toString(),
      },
      jsonBody: {
        success: false,
        error: 'Rate limit exceeded',
        retryAfterSeconds: retryAfter,
        auditId: audit.id,
      },
    };
  }
}

// Azure Function binding
app.http('WebhookReceiver', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (req: HttpRequest, context: any) => {
    const config: WebhookReceiverConfig = {
      cosmosEndpoint:
        process.env.COSMOS_ENDPOINT || 'https://localhost:8081',
      cosmosKey: process.env.COSMOS_KEY || 'C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTjd3K6QCHBUI2djStw5ih+ax7IB9binCwZBicT/M=',
      databaseId: process.env.COSMOS_DATABASE || 'castiel',
      containerId: process.env.COSMOS_CONTAINER || 'webhooks',
      keyVaultUrl: process.env.KEY_VAULT_URL || '',
      serviceBusConnectionString:
        process.env.SERVICE_BUS_CONNECTION_STRING || '',
      outboundQueueName: process.env.SERVICE_BUS_QUEUE_OUTBOUND || 'sync-outbound',
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    };

    const receiver = new WebhookReceiverFunction(config);
    return receiver.handle(req, context);
  },
});
