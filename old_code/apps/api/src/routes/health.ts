import type { FastifyInstance } from 'fastify';
import type { Redis } from 'ioredis';
import type { IMonitoringProvider } from '@castiel/monitoring';
import {
  ShardTypeRepository,
  ShardRepository,
} from '@castiel/api-core';
import { CoreTypesSeederService } from '../services/core-types-seeder.service.js';
import { getRouteRegistrationTracker } from '../utils/route-registration-tracker.js';

/**
 * Health check routes
 */
export async function registerHealthRoutes(
  server: FastifyInstance,
  redis: Redis | null,
  monitoring?: IMonitoringProvider
): Promise<void> {
  /**
   * Basic health check
   * GET /health
   */
  server.get('/health', async () => {
    return {
      status: 'ok',
      service: 'main-api',
      timestamp: new Date().toISOString(),
    };
  });

  /**
   * Readiness check
   * GET /readiness
   * Checks if service is ready to accept traffic
   * Enhanced with Cosmos DB, Key Vault, and external service health checks
   */
  server.get('/readiness', async (_request, reply) => {
    const checks: {
      redis: { status: string; message?: string; latency?: number };
      cosmosDb: { status: string; message?: string; latency?: number };
      keyVault: { status: string; message?: string; enabled?: boolean };
      services?: {
        required: { healthy: number; total: number; missing: string[] };
        optional: { healthy: number; total: number };
      };
      overall: 'ready' | 'not_ready';
    } = {
      redis: { status: 'unknown' },
      cosmosDb: { status: 'unknown' },
      keyVault: { status: 'unknown' },
      overall: 'ready',
    };

    // Check Redis connection
    if (redis) {
      try {
        const startTime = Date.now();
        const result = await Promise.race([
          redis.ping(),
          new Promise<string>((_, reject) => 
            setTimeout(() => reject(new Error('Redis ping timeout')), 5000)
          ),
        ]);
        const latency = Date.now() - startTime;
        
        if (result === 'PONG') {
          checks.redis = { status: 'connected', latency };
        } else {
          checks.redis = { status: 'error', message: 'Unexpected ping response', latency };
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
      checks.overall = 'not_ready';
    }

    // Check Cosmos DB connection
    try {
      const cosmosDatabase = (server as any).cosmosDatabase;
      const cosmosClient = (server as any).cosmos;
      const cosmosDbClient = (server as any).cosmosDbClient; // Auth services CosmosDbClient
      
      if (cosmosDatabase) {
        // Use lightweight health check - read database metadata
        const startTime = Date.now();
        await Promise.race([
          cosmosDatabase.read(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Cosmos DB health check timeout')), 10000)
          ),
        ]);
        const latency = Date.now() - startTime;
        checks.cosmosDb = { status: 'connected', latency };
      } else if (cosmosClient) {
        // Use CosmosClient getDatabaseAccount method
        const startTime = Date.now();
        await Promise.race([
          cosmosClient.getDatabaseAccount(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Cosmos DB health check timeout')), 10000)
          ),
        ]);
        const latency = Date.now() - startTime;
        checks.cosmosDb = { status: 'connected', latency };
      } else if (cosmosDbClient && typeof cosmosDbClient.healthCheck === 'function') {
        // Try to use CosmosDbClient from auth services if available
        const startTime = Date.now();
        const isHealthy = await Promise.race([
          cosmosDbClient.healthCheck(),
          new Promise<boolean>((_, reject) => 
            setTimeout(() => reject(new Error('Cosmos DB health check timeout')), 10000)
          ),
        ]);
        const latency = Date.now() - startTime;
        
        if (isHealthy) {
          checks.cosmosDb = { status: 'connected', latency };
        } else {
          checks.cosmosDb = { status: 'error', message: 'Health check returned false', latency };
          checks.overall = 'not_ready';
        }
      } else {
        checks.cosmosDb = { status: 'not_configured' };
        checks.overall = 'not_ready';
      }
    } catch (error) {
      checks.cosmosDb = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
      checks.overall = 'not_ready';
      
      if (monitoring) {
        monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
          operation: 'readiness.cosmos-db-check',
        });
      }
    }

    // Check Azure Key Vault connection (optional - only if configured)
    const keyVaultService = (server as any).keyVaultService;
    const secureCredentialService = (server as any).secureCredentialService;
    
    if (keyVaultService || secureCredentialService) {
      try {
        const startTime = Date.now();
        let isHealthy = false;
        
        if (keyVaultService && typeof keyVaultService.healthCheck === 'function') {
          isHealthy = await Promise.race([
            keyVaultService.healthCheck(),
            new Promise<boolean>((_, reject) => 
              setTimeout(() => reject(new Error('Key Vault health check timeout')), 10000)
            ),
          ]);
        } else if (secureCredentialService && typeof secureCredentialService.healthCheck === 'function') {
          const healthResult = await Promise.race([
            secureCredentialService.healthCheck(),
            new Promise<{ healthy: boolean }>((_, reject) => 
              setTimeout(() => reject(new Error('Key Vault health check timeout')), 10000)
            ),
          ]);
          isHealthy = healthResult.healthy;
        }
        
        const latency = Date.now() - startTime;
        
        if (isHealthy) {
          checks.keyVault = { status: 'connected', latency, enabled: true };
        } else {
          // Key Vault is optional, so don't fail readiness if it's unhealthy
          checks.keyVault = { status: 'error', message: 'Health check returned false', latency, enabled: true };
        }
      } catch (error) {
        // Key Vault is optional, so don't fail readiness if check fails
        checks.keyVault = {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          enabled: true,
        };
        
        if (monitoring) {
          monitoring.trackException(error instanceof Error ? error : new Error(String(error)), {
            operation: 'readiness.key-vault-check',
          });
        }
      }
    } else {
      checks.keyVault = { status: 'not_configured', enabled: false };
    }

    // Phase 4.1: Check service registry if available
    const serviceRegistry = (server as any).serviceRegistry;
    if (serviceRegistry) {
      const systemHealth = serviceRegistry.getSystemHealth();
      const requiredValidation = serviceRegistry.validateRequiredServices();
      
      checks.services = {
        required: {
          healthy: systemHealth.requiredHealthy,
          total: systemHealth.requiredTotal,
          missing: requiredValidation.missing,
        },
        optional: {
          healthy: systemHealth.healthy - systemHealth.requiredHealthy,
          total: systemHealth.total - systemHealth.requiredTotal,
        },
      };

      // Fail readiness if required services are missing
      if (!requiredValidation.valid) {
        checks.overall = 'not_ready';
      }
    }

    // Set response status based on overall readiness
    const statusCode = checks.overall === 'ready' ? 200 : 503;

    return reply.status(statusCode).send({
      status: checks.overall,
      service: 'main-api',
      timestamp: new Date().toISOString(),
      checks,
    });
  });

  /**
   * Liveness check
   * GET /liveness
   * Simple check to verify the service process is running
   */
  server.get('/liveness', async () => {
    return {
      status: 'alive',
      service: 'main-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  /**
   * Shard types verification check
   * GET /health/shard-types
   * Verifies that all core shard types are seeded in the database
   * Useful for deployment verification and monitoring
   */
  server.get('/health/shard-types', async (request, reply) => {
    if (!monitoring) {
      return reply.status(503).send({
        status: 'unavailable',
        message: 'Monitoring service not available',
        timestamp: new Date().toISOString(),
      });
    }

    try {
      // Get repositories from server instance if available, otherwise create new ones
      const shardTypeRepo = (server as any).shardTypeRepository || new ShardTypeRepository(monitoring);
      const shardRepo = (server as any).shardRepository || new ShardRepository(monitoring);

      // Initialize seeder service
      const seeder = new CoreTypesSeederService(monitoring, shardTypeRepo, shardRepo);

      // Check if all shard types are seeded
      const checkResult = await seeder.checkSeeded();

      const statusCode = checkResult.allSeeded ? 200 : 503;

      return reply.status(statusCode).send({
        status: checkResult.allSeeded ? 'healthy' : 'unhealthy',
        service: 'main-api',
        timestamp: new Date().toISOString(),
        shardTypes: {
          allSeeded: checkResult.allSeeded,
          missing: checkResult.missing,
          missingCount: checkResult.missing.length,
        },
        message: checkResult.allSeeded
          ? 'All core shard types are seeded'
          : `${checkResult.missing.length} shard type(s) are missing. Run: pnpm --filter @castiel/api run seed-types`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      monitoring.trackException(error instanceof Error ? error : new Error(errorMessage), {
        operation: 'health.shardTypes',
      });

      return reply.status(503).send({
        status: 'error',
        service: 'main-api',
        timestamp: new Date().toISOString(),
        error: errorMessage,
        message: 'Failed to verify shard types',
      });
    }
  });

  /**
   * Route registration health check
   * GET /health/routes
   * Reports which routes are registered and which are missing
   */
  server.get('/health/routes', async (_request, reply) => {
    const tracker = getRouteRegistrationTracker();
    const summary = tracker.getSummary();
    const allRoutes = tracker.getAll();

    // Determine overall health status
    // Consider it healthy if critical routes are registered
    const criticalRoutes = [
      'Health',
      'Auth',
      'Shards',
      'ShardTypes',
      'Documents',
      'AI Insights',
    ];

    const criticalStatus = criticalRoutes.every(routeName => {
      const route = tracker.get(routeName);
      return route?.registered ?? false;
    });

    const overallStatus = criticalStatus ? 'healthy' : 'degraded';
    const statusCode = criticalStatus ? 200 : 503;

    return reply.status(statusCode).send({
      status: overallStatus,
      service: 'main-api',
      timestamp: new Date().toISOString(),
      summary: {
        total: summary.total,
        registered: summary.registered,
        notRegistered: summary.notRegistered,
        registrationRate: summary.total > 0 
          ? ((summary.registered / summary.total) * 100).toFixed(1) + '%'
          : '0%',
      },
      routes: allRoutes.map(route => ({
        name: route.name,
        prefix: route.prefix,
        registered: route.registered,
        reason: route.reason,
        dependencies: route.dependencies,
      })),
      registeredRoutes: summary.registeredRoutes,
      missingRoutes: summary.missingRoutes,
      criticalRoutes: {
        allRegistered: criticalStatus,
        status: criticalStatus ? 'ok' : 'degraded',
        routes: criticalRoutes.map(name => {
          const route = tracker.get(name);
          return {
            name,
            registered: route?.registered ?? false,
            reason: route?.reason,
          };
        }),
      },
    });
  });

  /**
   * Phase 4.1: Service registry health check
   * GET /health/services
   * Returns health status of all registered services
   */
  server.get('/health/services', async (_request, reply) => {
    const serviceRegistry = (server as any).serviceRegistry;
    
    if (!serviceRegistry) {
      return reply.status(503).send({
        status: 'unavailable',
        message: 'Service registry not available',
        timestamp: new Date().toISOString(),
      });
    }

    const systemHealth = serviceRegistry.getSystemHealth();
    const requiredValidation = serviceRegistry.validateRequiredServices();
    
    const statusCode = requiredValidation.valid ? 200 : 503;

    return reply.status(statusCode).send({
      status: requiredValidation.valid ? 'healthy' : 'unhealthy',
      service: 'main-api',
      timestamp: new Date().toISOString(),
      summary: systemHealth,
      requiredServices: {
        valid: requiredValidation.valid,
        missing: requiredValidation.missing,
      },
      services: systemHealth.services,
    });
  });

  /**
   * Phase 4.1: Per-service health check
   * GET /health/services/:serviceName
   * Returns health status of a specific service
   */
  server.get('/health/services/:serviceName', async (request, reply) => {
    const serviceRegistry = (server as any).serviceRegistry;
    const serviceName = (request.params as { serviceName: string }).serviceName;
    
    if (!serviceRegistry) {
      return reply.status(503).send({
        status: 'unavailable',
        message: 'Service registry not available',
        timestamp: new Date().toISOString(),
      });
    }

    const health = serviceRegistry.getHealth(serviceName);
    
    if (!health) {
      return reply.status(404).send({
        status: 'not_found',
        message: `Service ${serviceName} not found in registry`,
        timestamp: new Date().toISOString(),
      });
    }

    const statusCode = health.healthy ? 200 : 503;

    return reply.status(statusCode).send({
      status: health.healthy ? 'healthy' : 'unhealthy',
      service: serviceName,
      timestamp: new Date().toISOString(),
      health,
    });
  });
}
