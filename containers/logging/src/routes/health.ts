/**
 * Health Check Routes
 * Per ModuleImplementationGuide Section 15.1
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getConfig } from '../config';
import amqp from 'amqplib';
import { getUserManagementClient } from '../services/UserManagementClient';
import { createSIEMProvider } from '../services/providers/siem/SIEMProviderFactory';

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  // Liveness probe - is the process running?
  app.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['Health'],
      summary: 'Liveness probe',
      response: {
        200: {
          description: 'Service is healthy',
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });
  
  // Readiness probe - can it handle requests?
  app.get('/ready', {
    schema: {
      description: 'Readiness check endpoint',
      tags: ['Health'],
      summary: 'Readiness probe',
      response: {
        200: {
          description: 'Service is ready',
          type: 'object',
        },
        503: {
          description: 'Service is not ready',
          type: 'object',
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const checks: Record<string, { status: string; latency_ms?: number; message?: string }> = {};
    
    // Check database
    try {
      const storageProvider = (app as any).storageProvider;
      if (storageProvider) {
        const dbCheck = await storageProvider.healthCheck();
        checks.database = dbCheck;
      } else {
        checks.database = { status: 'ok', latency_ms: 0 };
      }
    } catch (error: any) {
      checks.database = { status: 'error', message: error.message };
    }
    
          // Check RabbitMQ (if configured)
          try {
            const config = getConfig();
            if (config.rabbitmq?.url) {
              const startTime = Date.now();
              try {
                // Try to connect to RabbitMQ
                const connection = await amqp.connect(config.rabbitmq.url);
                const latency = Date.now() - startTime;
                await connection.close();
                checks.rabbitmq = { status: 'ok', latency_ms: latency };
              } catch (error: any) {
                checks.rabbitmq = {
                  status: 'error',
                  latency_ms: Date.now() - startTime,
                  message: error.message || 'Connection failed'
                };
              }
            } else {
              // RabbitMQ not configured - skip check
              checks.rabbitmq = { status: 'skipped', message: 'Not configured' };
            }
          } catch (error: any) {
            checks.rabbitmq = { status: 'error', message: error.message };
          }

          // Check User Management service (if configured)
          try {
            const config = getConfig();
            if (config.services?.user_management?.url) {
              const userManagementClient = getUserManagementClient();
              const healthCheck = await userManagementClient.healthCheck();
              checks.user_management = {
                status: healthCheck.status,
                latency_ms: healthCheck.latency_ms,
                message: healthCheck.message,
              };
            } else {
              checks.user_management = { status: 'skipped', message: 'Not configured' };
            }
    } catch (error: any) {
      checks.user_management = { status: 'error', message: error.message };
    }

    // Check SIEM provider (if configured and enabled)
    try {
      const config = getConfig();
      if (config.siem?.enabled && config.siem?.provider) {
        const siemProvider = createSIEMProvider(config.siem);
        const healthCheck = await siemProvider.healthCheck();
        checks.siem = {
          status: healthCheck.status,
          message: healthCheck.message,
        };
      } else {
        checks.siem = { status: 'skipped', message: 'Not configured or disabled' };
      }
    } catch (error: any) {
      checks.siem = { status: 'error', message: error.message };
    }
    
    const allOk = Object.values(checks).every(c => c.status === 'ok' || c.status === 'skipped');
    
    return reply.status(allOk ? 200 : 503).send({
      status: allOk ? 'ready' : 'not_ready',
      checks,
      timestamp: new Date().toISOString(),
    });
  });
}

