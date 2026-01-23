/**
 * Webhook Receiver HTTP Endpoint
 * 
 * Receives webhook events from external systems.
 * Verifies signatures, parses events, and queues for sync processing.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { QueueProducerService, QueueName } from '@castiel/queue';
import type { InitializedServices } from '../shared/initialize-services.js';
import type { SyncInboundWebhookMessage } from '@castiel/queue';

interface WebhookReceiverConfig {
  databaseId: string;
  containerId: string;
}

export function registerWebhookRoutes(
  server: FastifyInstance,
  services: InitializedServices,
  config: WebhookReceiverConfig
): void {
  const queueProducer = new QueueProducerService({
    redis: services.redis,
    monitoring: services.monitoring,
  });

  // Webhook endpoint - matches Azure Functions pattern
  server.post('/api/webhooks/:registrationId?', async (
    request: FastifyRequest<{
      Params: { registrationId?: string };
      Headers: Record<string, string>;
      Body: any;
    }>,
    reply: FastifyReply
  ) => {
    const startTime = Date.now();
    const executionId = `webhook-${Date.now()}`;
    const sourceIp = request.headers['x-forwarded-for'] || 
                    request.ip || 
                    'unknown';

    let audit: any = {
      id: executionId,
      timestamp: new Date().toISOString(),
      sourceIp,
      verified: false,
      queued: false,
      duration: 0,
    };

    try {
      // Extract webhook registration ID
      const registrationId = request.params.registrationId ||
                            request.headers['x-webhook-id'] ||
                            (request.query as any)?.registrationId ||
                            'unknown';

      audit.registrationId = registrationId;

      // Process webhook event
      if (!services.webhookManagementService) {
        throw new Error('WebhookManagementService not initialized');
      }

      // Get webhook registration to extract metadata (before processing)
      const registration = await services.webhookManagementService.getWebhookRegistration(registrationId);
      if (!registration) {
        audit.error = 'Webhook registration not found';
        return reply.code(404).send({ error: 'Webhook registration not found' });
      }

      // Convert body to string/buffer for processing
      const bodyData = typeof request.body === 'string' 
        ? request.body 
        : Buffer.isBuffer(request.body)
        ? request.body
        : JSON.stringify(request.body);

      // Verify and process webhook
      const webhookResult = await services.webhookManagementService.processWebhookEvent(
        registrationId,
        request.headers as Record<string, string>,
        bodyData
      );

      audit.verified = webhookResult.success;
      audit.integrationId = webhookResult.integrationId || registration.integrationId;
      audit.tenantId = webhookResult.tenantId || registration.tenantId;
      audit.eventType = webhookResult.eventType;
      audit.entityType = webhookResult.entityType;
      audit.entityId = webhookResult.entityId;

      if (!webhookResult.success) {
        audit.error = webhookResult.error || 'Webhook processing failed';
        services.monitoring.trackEvent('webhook-receiver.verification-failed', {
          registrationId,
          sourceIp,
        });
        return reply.code(401).send({ error: webhookResult.error || 'Webhook processing failed' });
      }

      if (!webhookResult.integrationId || !webhookResult.tenantId) {
        audit.error = 'Missing integrationId or tenantId from webhook result';
        return reply.code(400).send({ error: 'Invalid webhook result' });
      }

      // Queue for sync processing
      const webhookMessage: SyncInboundWebhookMessage = {
        integrationId: webhookResult.integrationId,
        tenantId: webhookResult.tenantId,
        connectionId: registration.connectionId,
        webhookEvent: {
          eventType: webhookResult.eventType,
          entityType: webhookResult.entityType,
          entityId: webhookResult.entityId,
          payload: request.body,
          headers: request.headers as Record<string, string>,
          receivedAt: new Date().toISOString(),
        },
        receivedAt: new Date().toISOString(),
      };

      await queueProducer.enqueueSyncInboundWebhook(webhookMessage, {
        priority: 8, // High priority for webhooks
      });

      audit.queued = true;

      const duration = Date.now() - startTime;
      audit.duration = duration;

      // Store audit log
      try {
        const container = services.cosmosClient
          .database(config.databaseId)
          .container(config.containerId || 'webhook-audit');

        await container.items.create({
          ...audit,
          partitionKey: webhookResult.tenantId,
        });
      } catch (auditError) {
        // Log but don't fail the request
        services.monitoring.trackException(auditError as Error, {
          context: 'WebhookReceiver.storeAudit',
        });
      }

      services.monitoring.trackEvent('webhook-receiver.processed', {
        registrationId,
        tenantId: webhookResult.tenantId,
        integrationId: webhookResult.integrationId,
        duration,
      });

      return reply.code(200).send({ 
        success: true,
        message: 'Webhook received and queued',
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      audit.duration = duration;
      audit.error = error instanceof Error ? error.message : String(error);
      audit.queued = false;

      services.monitoring.trackException(error as Error, {
        context: 'WebhookReceiver.handle',
        executionId,
        sourceIp,
      });

      return reply.code(500).send({ 
        error: 'Failed to process webhook',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Health check endpoints
  server.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.code(200).send({ 
      status: 'healthy',
      service: 'workers-sync',
      timestamp: new Date().toISOString(),
    });
  });

  // Readiness check - verifies service is ready to accept traffic
  server.get('/readiness', async (request: FastifyRequest, reply: FastifyReply) => {
    const checks: {
      redis: { status: string; message?: string };
      cosmos: { status: string; message?: string };
      overall: 'ready' | 'not_ready';
    } = {
      redis: { status: 'unknown' },
      cosmos: { status: 'unknown' },
      overall: 'ready',
    };

    // Check Redis connection (if available)
    if (services.redis) {
      try {
        const redisPing = await services.redis.ping();
        if (redisPing === 'PONG') {
          checks.redis = { status: 'connected' };
        } else {
          checks.redis = { status: 'error', message: 'Unexpected ping response' };
          checks.overall = 'not_ready';
        }
      } catch (error) {
        checks.redis = {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
        checks.overall = 'not_ready';
      }
    } else {
      checks.redis = { status: 'not_configured' };
    }

    // Check Cosmos DB connection (basic check)
    try {
      // Simple ping to Cosmos DB by querying a container
      const database = services.cosmosClient.database(config.databaseId);
      const container = database.container('shards');
      await container.read();
      checks.cosmos = { status: 'connected' };
    } catch (error) {
      checks.cosmos = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
      checks.overall = 'not_ready';
    }

    const statusCode = checks.overall === 'ready' ? 200 : 503;
    return reply.code(statusCode).send({
      status: checks.overall,
      service: 'workers-sync',
      timestamp: new Date().toISOString(),
      checks,
    });
  });

  // Liveness check - simple check to verify the service process is running
  server.get('/liveness', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.code(200).send({
      status: 'alive',
      service: 'workers-sync',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });
}

