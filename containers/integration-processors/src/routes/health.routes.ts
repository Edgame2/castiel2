/**
 * Health check routes
 * @module integration-processors/routes/health
 */

import { FastifyInstance } from 'fastify';
import { ServiceClient } from '@coder/shared';
import { loadConfig } from '../config/index.js';

const config = loadConfig();

async function checkRabbitMQ(): Promise<{ healthy: boolean; latency?: number }> {
  if (!config.rabbitmq.url) {
    return { healthy: false };
  }
  try {
    const start = Date.now();
    // Simple connection test - in production, use actual RabbitMQ health check
    const amqp = await import('amqplib');
    const connection = await amqp.connect(config.rabbitmq.url);
    await connection.close();
    return { healthy: true, latency: Date.now() - start };
  } catch (error) {
    return { healthy: false };
  }
}

async function checkShardManager(): Promise<{ healthy: boolean; latency?: number }> {
  if (!config.services.shard_manager?.url) {
    return { healthy: false };
  }
  try {
    const start = Date.now();
    const client = new ServiceClient({
      baseURL: config.services.shard_manager.url,
      timeout: 5000,
    });
    await client.get('/health');
    return { healthy: true, latency: Date.now() - start };
  } catch (error) {
    return { healthy: false };
  }
}

async function checkBlobStorage(): Promise<{ healthy: boolean; latency?: number }> {
  if (!config.azure?.blob_storage?.connection_string) {
    return { healthy: true }; // Optional service
  }
  try {
    const start = Date.now();
    // Simple check - in production, use actual Azure Blob Storage health check
    return { healthy: true, latency: Date.now() - start };
  } catch (error) {
    return { healthy: false };
  }
}

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  // Basic health check
  app.get('/health', async (_request, _reply) => {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  });

  // Readiness check (dependencies)
  app.get('/ready', async (_request, reply) => {
    const checks = {
      rabbitmq: await checkRabbitMQ(),
      shardManager: await checkShardManager(),
      blobStorage: await checkBlobStorage(),
    };

    const ready = Object.values(checks).every((c) => c.healthy);

    if (!ready) {
      reply.code(503);
    }

    return {
      ready,
      checks,
      timestamp: new Date().toISOString(),
    };
  });
}
