/**
 * Core Services Initialization
 * Initializes monitoring, configuration, and service registry
 */

import type { FastifyInstance } from 'fastify';
import { MonitoringService } from '@castiel/monitoring';
import type { Environment } from '../../types/configuration.types.js';
import { config } from '../../config/env.js';

export interface CoreServicesResult {
  monitoring: ReturnType<typeof MonitoringService.getInstance>;
  configurationService?: any;
  serviceRegistry?: any;
}

/**
 * Initialize core services (monitoring, configuration, service registry)
 */
export async function initializeCoreServices(
  server: FastifyInstance
): Promise<CoreServicesResult> {
  // Initialize monitoring early (needed for health routes)
  const monitoring = MonitoringService.getInstance() || MonitoringService.initialize({
    enabled: false,
    provider: 'mock',
  });

  // Phase 4.2: Initialize Configuration Service for centralized config management
  let configurationService: any = undefined;
  try {
    const { ConfigurationService } = await import('../../services/configuration.service.js');
    configurationService = new ConfigurationService(monitoring, {
      environment: (process.env.NODE_ENV as Environment) || 'development',
      validateOnLoad: true,
      failFastOnError: process.env.NODE_ENV === 'production',
      enableChangeDetection: false,
      secretManagerEnabled: config.keyVault?.enabled || false,
    });
    
    // Load and validate configuration
    await configurationService.loadConfig();
    
    // Store on server for reuse
    server.decorate('configurationService', configurationService);
    
    // Set as global configuration service for helper access
    const { setConfigurationService } = await import('../../config/config-helper.js');
    setConfigurationService(configurationService);
    
    server.log.info('✅ Configuration Service initialized (Phase 4.2)');
  } catch (err) {
    server.log.error({ err }, '❌ Configuration Service initialization failed');
    // In production, fail fast on config errors
    if (process.env.NODE_ENV === 'production') {
      throw err;
    }
    server.log.warn('⚠️ Continuing with basic configuration validation');
  }

  // Phase 4.1: Initialize Service Registry for service lifecycle management
  let serviceRegistry: any = undefined;
  try {
    const { ServiceRegistryService } = await import('../../services/service-registry.service.js');
    const { ServiceCategory } = await import('../../types/service-registry.types.js');
    serviceRegistry = new ServiceRegistryService(monitoring);
    
    // Register monitoring service
    serviceRegistry.register('monitoring', monitoring, {
      name: 'monitoring',
      category: ServiceCategory.MONITORING,
      required: true,
      dependencies: [],
      optionalDependencies: [],
      initializationPhase: 0,
      healthCheck: () => ({
        status: monitoring ? 'healthy' : 'unhealthy',
        healthy: !!monitoring,
        lastChecked: new Date(),
      }),
    });
    serviceRegistry.markInitialized('monitoring');
    
    // Phase 4.2: Register configuration service if available
    if (configurationService) {
      serviceRegistry.register('configurationService', configurationService, {
        name: 'configurationService',
        category: ServiceCategory.CORE,
        required: false,
        dependencies: ['monitoring'],
        optionalDependencies: [],
        initializationPhase: 0,
        description: 'Centralized configuration management service',
      });
      serviceRegistry.markInitialized('configurationService');
    }
    
    // Store on server for reuse
    server.decorate('serviceRegistry', serviceRegistry);
    server.log.info('✅ Service Registry initialized (Phase 4.1)');
    
    // Phase 4.1: Start health check monitoring
    serviceRegistry.startHealthChecks();
  } catch (err) {
    server.log.warn({ err }, '⚠️ Service Registry initialization failed - continuing without registry');
  }

  return {
    monitoring,
    configurationService,
    serviceRegistry,
  };
}
