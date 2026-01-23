import type { FastifyInstance } from 'fastify';
import type { Redis } from 'ioredis';
import { config } from '../config/env.js';
import type { Environment } from '../types/configuration.types.js';
import { handleRouteRegistrationError, withRouteErrorHandling } from './route-error-handler.js';
import { registerHealthRoutes } from './health.js';
import { registerProtectedRoutes } from './protected.js';
import { registerSSERoutes } from './sse.routes.js';
import { widgetCatalogRoutes } from './widget-catalog.routes.js';
// Data routes (Shards, ShardTypes, ACL, Revisions, Vector Search, Embedding) are now registered via registerDataRoutes
import { ACLCacheService } from '../services/acl-cache.service.js';
// Embedding routes (template, generation, jobs) are now registered via registerAIRoutes and registerDataRoutes
import { registerIntentPatternRoutes } from './intent-patterns.routes.js';
import { registerAIRecommendationRoutes } from './ai-recommendation.routes.js';
import { registerCacheAdminRoutes } from './cache-admin.routes.js';
import { MonitoringService } from '@castiel/monitoring';
import { adminDashboardRoutes } from './admin-dashboard.routes.js';
import { registerInsightsSearchRoutes } from './ai-insights/search.routes.js';
import { registerAuthRoutes } from './auth.routes.js';
import { registerMFARoutes } from './mfa.routes.js';
import { registerMagicLinkRoutes } from './magic-link.routes.js';
import { registerSSORoutes } from './sso.routes.js';
import { registerSSOConfigRoutes } from './sso-config.routes.js';
import { registerAzureADB2CRoutes } from './azure-ad-b2c.routes.js';
import { registerOAuthRoutes } from './oauth.routes.js';
import { registerOAuth2Routes } from './oauth2.routes.js';
import { registerUserManagementRoutes } from './user-management.routes.js';
import { registerExternalUserIdsRoutes } from './external-user-ids.routes.js';
import { registerUserSecurityRoutes } from './user-security.routes.js';
import { registerSessionManagementRoutes } from './session-management.routes.js';
import { registerRoleManagementRoutes } from './role-management.routes.js';
import { registerTenantRoutes } from './tenant.routes.js';
import { registerTenantMembershipRoutes } from './tenant-membership.routes.js';
import { auditLogRoutes } from './audit-log.routes.js';
import { dashboardRoutes } from './dashboard.routes.js';
import { optionListRoutes } from './option-list.routes.js';
import { registerFeatureFlagRoutes } from './feature-flag.routes.js';
import { registerAdaptiveLearningRoutes } from './adaptive-learning.routes.js';
import { registerCAISServicesRoutes } from './cais-services.routes.js';
import { webhookRoutes } from './webhook.routes.js';
import { registerWebhookRoutes } from './webhooks.routes.js';
import { schemaMigrationRoutes } from './schema-migration.routes.js';
// Shard Bulk, Relationship, and Context Template routes are now registered via registerDataRoutes
import { insightsRoutes } from './insights.routes.js';
import { aiSettingsRoutes } from './ai-settings.routes.js';
import { registerAIConnectionsRoutes } from './ai-connections.routes.js';
import { aiModelsRoutes } from './ai-models.routes.js';
import { customIntegrationRoutes, customIntegrationWebhookRoutes } from './custom-integration.routes.js';
import { aiAnalyticsRoutes } from './ai-analytics.routes.js';
import { registerSuperAdminIntegrationCatalogRoutes } from './super-admin-integration-catalog.routes.js';
import { SuperAdminIntegrationCatalogController } from '../controllers/super-admin-integration-catalog.controller.js';
import { IntegrationCatalogService } from '../services/integration-catalog.service.js';
import { IntegrationCatalogRepository } from '../repositories/integration-catalog.repository.js';
import { IntegrationVisibilityService } from '../services/integration-visibility.service.js';
import { registerIntegrationRoutes } from './integration.routes.js';
import { registerSyncTaskRoutes } from './sync-task.routes.js';
import { registerConversionSchemaRoutes } from './conversion-schema.routes.js';
import { registerEmailTemplateRoutes } from './email-template.routes.js';
import { ContentGenerationController } from '../controllers/content-generation.controller.js';
// Content routes (documents, collections, templates, content generation, memory, onboarding) 
// are now registered via registerContentRoutes in registration/content-routes.registration.ts
import {
  ShardRepository,
  ShardTypeRepository,
  ShardRelationshipService,
  ConversationService,
  IntentAnalyzerService,
  InsightService,
  AzureOpenAIService,
  ContextTemplateService,
} from '@castiel/api-core';
// Collaboration and Collaborative Insights routes are now registered via registerDataRoutes
import { AIInsightsCosmosService } from '../services/ai-insights/cosmos.service.js';
import { PromptRepository } from '../services/ai-insights/prompt.repository.js';
import { PromptResolverService } from '../services/ai-insights/prompt-resolver.service.js';
import { PromptRendererService } from '../services/ai-insights/prompt-renderer.service.js';
import { promptsRoutes } from './prompts.routes.js';
import { authenticate } from '../middleware/authenticate.js';
import { UnauthorizedError } from '../middleware/error-handler.js';
import { registerProjectResolverRoutes } from './project-resolver.routes.js';
// Memory and onboarding routes are now registered via registerContentRoutes
import { registerVectorSearchUIRoutes } from './vector-search-ui.routes.js';
import { VectorSearchUIController } from '../controllers/vector-search-ui.controller.js';
import { VectorSearchUIService } from '../services/vector-search-ui.service.js';
import { registerSearchAnalyticsRoutes } from './search-analytics.routes.js';
import { registerAPIPerformanceRoutes } from './api-performance.routes.js';
import { registerIntegrationMonitoringRoutes } from './integration-monitoring.routes.js';
import { registerCacheOptimizationRoutes } from './cache-optimization.routes.js';
import { SearchAnalyticsController } from '../controllers/search-analytics.controller.js';
import { SearchAnalyticsService } from '../services/search-analytics.service.js';
import { registerProjectAnalyticsRoutes } from './project-analytics.routes.js';
import { ProjectAnalyticsController } from '../controllers/project-analytics.controller.js';
import { ProjectAnalyticsService } from '../services/project-analytics.service.js';
import { registerSCIMRoutes } from './scim.routes.js';
import { registerTenantProvisioningRoutes } from './tenant-provisioning.routes.js';
import { SCIMService } from '../services/auth/scim.service.js';
import { multimodalAssetsRoutes } from './multimodal-assets.routes.js';
import { MultimodalAssetService } from '../services/multimodal-asset.service.js';
import { registerProactiveInsightsRoutes, registerDeliveryPreferencesRoutes } from './proactive-insights.routes.js';
import { TenantService } from '@castiel/api-core';
import { registerRiskAnalysisRoutes } from './risk-analysis.routes.js';
import { registerMLRoutes } from './ml.routes.js';
import { registerQuotaRoutes } from './quotas.routes.js';
import { registerTeamRoutes } from './teams.routes.js';
import { registerSimulationRoutes } from './simulation.routes.js';
import { registerBenchmarksRoutes } from './benchmarks.routes.js';
import { registerOpportunityRoutes } from './opportunity.routes.js';
import { registerPipelineRoutes } from './pipeline.routes.js';
import { RevisionRepository } from '../repositories/revision.repository.js';
import { getRouteRegistrationTracker } from '../utils/route-registration-tracker.js';
import { ServiceHealthTracker, extractErrorCode, extractDependencies } from '../utils/service-health-tracker.js';
import { ApiVersioningService } from '../utils/api-versioning.js';
import { registerApiVersioningMiddleware } from '../middleware/api-versioning.middleware.js';

/**
 * Register all application routes
 */
export async function registerRoutes(
  server: FastifyInstance,
  redis: Redis | null
): Promise<void> {
  const tracker = getRouteRegistrationTracker();

  // Initialize monitoring early (needed for health routes)
  const monitoring = MonitoringService.getInstance() || MonitoringService.initialize({
    enabled: false,
    provider: 'mock',
  });

  // Initialize service health tracker for tracking initialization failures
  const serviceHealthTracker = new ServiceHealthTracker(monitoring);

  // Initialize API versioning service
  const apiVersioningService = new ApiVersioningService(monitoring, 'v1');
  server.decorate('apiVersioningService', apiVersioningService);

  // Register API versioning middleware
  try {
    registerApiVersioningMiddleware(server, {
      versioningService: apiVersioningService,
      monitoring,
      requireVersion: false, // Allow default version fallback
      addVersionHeaders: true,
      trackUsage: true,
    });
    server.log.info('✅ API Versioning middleware registered');
    serviceHealthTracker.trackSuccess('API Versioning', 'middleware-registration', ['Monitoring']);
  } catch (err) {
    server.log.warn({ err }, '⚠️ API Versioning middleware registration failed');
    serviceHealthTracker.trackFailure({
      serviceName: 'API Versioning',
      operation: 'middleware-registration',
      error: err,
      criticality: 'optional',
      dependencies: extractDependencies(err, { dependencies: ['Monitoring'] }),
      errorCode: extractErrorCode(err),
    });
  }

  // Declare services at function scope for use throughout the function
  let queueService: Awaited<ReturnType<typeof import('../services/queue.service.js').QueueService>> | undefined = undefined;
  let roleManagementService: Awaited<ReturnType<typeof import('../services/role-management.service.js').RoleManagementService>> | undefined = undefined;
  let opportunityService: Awaited<ReturnType<typeof import('../services/opportunity.service.js').OpportunityService>> | undefined = undefined;
  let revenueAtRiskService: Awaited<ReturnType<typeof import('../services/revenue-at-risk.service.js').RevenueAtRiskService>> | undefined = undefined;

  // Phase 4.2: Initialize Configuration Service for centralized config management
  let configurationService: import('../services/configuration.service.js').ConfigurationService | undefined = undefined;
  try {
    const { ConfigurationService } = await import('../services/configuration.service.js');
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
    server.log.info('✅ Configuration Service initialized (Phase 4.2)');
  } catch (err) {
    handleRouteRegistrationError(err, server, monitoring, {
      routeName: 'Configuration Service',
      operation: 'initialization',
      criticality: 'critical', // Configuration is critical
      dependencies: ['monitoring'],
    });
    
    // In production, fail fast on config errors
    if (process.env.NODE_ENV === 'production') {
      throw err;
    }
    
    // In development/staging, log detailed error but continue
    server.log.warn('⚠️ Configuration validation failed - continuing with basic validation');
    server.log.warn('Configuration errors:');
    server.log.warn(errorMessage);
    server.log.warn('⚠️ Some features may not work correctly with invalid configuration');
    
    // Still track the error for monitoring
    if (monitoring) {
      monitoring.trackException(err instanceof Error ? err : new Error(String(err)), {
        operation: 'configuration.initialization',
        environment: process.env.NODE_ENV || 'development',
        fatal: false,
      });
    }
  }

  // Phase 4.1: Initialize Service Registry for service lifecycle management
  let serviceRegistry: import('../services/service-registry.service.js').ServiceRegistryService | undefined = undefined;
  try {
    const { ServiceRegistryService } = await import('../services/service-registry.service.js');
    const { ServiceCategory, ServiceStatus } = await import('../types/service-registry.types.js');
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
        status: monitoring ? ServiceStatus.HEALTHY : ServiceStatus.UNHEALTHY,
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
    serviceHealthTracker.trackSuccess('Service Registry', 'initialization', ['Redis', 'Monitoring']);
  } catch (err) {
    server.log.warn({ err }, '⚠️ Service Registry initialization failed - continuing without registry');
    serviceHealthTracker.trackFailure({
      serviceName: 'Service Registry',
      operation: 'initialization',
      error: err,
      criticality: 'optional',
      dependencies: extractDependencies(err, { dependencies: ['Redis', 'Monitoring'] }),
      errorCode: extractErrorCode(err),
    });
  }

  // Health check routes (public)
  await registerHealthRoutes(server, redis, monitoring);
  tracker.record('Health', true, { prefix: '/health' });

  // Initialize core services
  const { initializeCoreServices } = await import('../services/initialization/core-services.init.js');
  const coreServices = await initializeCoreServices(server);

  // Initialize adaptive learning services (CAIS Phase 1-3)
  try {
    const { initializeAdaptiveLearningServices } = await import('../services/initialization/adaptive-learning-services.init.js');
    const cosmosClient = (server as any).cosmosClient;
    const serviceRegistry = (server as any).serviceRegistry;
    const adaptiveLearningServices = await initializeAdaptiveLearningServices(
      server,
      monitoring,
      cosmosClient,
      redis ?? undefined,
      serviceRegistry
    );
    server.log.info('✅ Adaptive Learning Services initialized (CAIS Phase 1-3)');
    serviceHealthTracker.trackSuccess('Adaptive Learning Services', 'initialization', ['CosmosDB', 'Redis', 'ServiceRegistry']);
  } catch (err) {
    server.log.warn({ err }, '⚠️ Adaptive Learning Services initialization failed - continuing without adaptive learning');
    serviceHealthTracker.trackFailure({
      serviceName: 'Adaptive Learning Services',
      operation: 'initialization',
      error: err,
      criticality: 'enhancement',
      dependencies: extractDependencies(err, { dependencies: ['CosmosDB', 'Redis', 'ServiceRegistry'] }),
      errorCode: extractErrorCode(err),
    });
  }

  // Register authentication routes
  const { registerAuthRoutesGroup } = await import('../services/initialization/auth-services.init.js');
  await registerAuthRoutesGroup(server, coreServices.monitoring);

  // MFA Audit routes (separate from main auth group)
  if (server.mfaAuditController) {
    try {
      const { registerMFAAuditRoutes } = await import('./mfa-audit.routes.js');
      await registerMFAAuditRoutes(server);
      server.log.info('✅ MFA Audit routes registered');
      tracker.record('MFA Audit', true, { 
        prefix: '/api/v1',
        dependencies: ['mfaAuditController', 'CosmosDB']
      });
      serviceHealthTracker.trackSuccess('MFA Audit Routes', 'registration', ['mfaAuditController', 'CosmosDB']);
    } catch (err) {
      handleRouteRegistrationError(err, server, monitoring, {
        routeName: 'MFA Audit',
        operation: 'registration',
        criticality: 'optional',
        dependencies: ['mfaAuditController', 'CosmosDB'],
        prefix: '/api/v1',
      });
      tracker.record('MFA Audit', false, { 
        prefix: '/api/v1',
        reason: err instanceof Error ? err.message : 'Import or registration failed',
        dependencies: ['mfaAuditController']
      });
      serviceHealthTracker.trackFailure({
        serviceName: 'MFA Audit Routes',
        operation: 'registration',
        error: err,
        criticality: 'optional',
        dependencies: extractDependencies(err, { dependencies: ['mfaAuditController', 'CosmosDB'] }),
        errorCode: extractErrorCode(err),
      });
    }
  } else {
    server.log.debug('⚠️ MFA Audit routes not registered - MFAAuditController not available');
    tracker.record('MFA Audit', false, { 
      prefix: '/api/v1',
      reason: 'MFAAuditController not available',
      dependencies: ['mfaAuditController']
    });
  }

  if (server.userManagementController) {
    await registerUserManagementRoutes(server);
    server.log.info('✅ User management routes registered');
    tracker.record('User Management', true, { 
      prefix: '/api/v1',
      dependencies: ['userManagementController', 'UserManagementService', 'CosmosDB']
    });
  } else {
    server.log.warn('⚠️  User management routes not registered - controller missing');
    tracker.record('User Management', false, { 
      prefix: '/api/v1',
      reason: 'userManagementController missing',
      dependencies: ['userManagementController']
    });
  }

  // External user IDs routes (admin)
  if (server.externalUserIdsController) {
    await registerExternalUserIdsRoutes(server);
    server.log.info('✅ External user IDs routes registered');
    tracker.record('External User IDs', true, { 
      prefix: '/api/v1',
      dependencies: ['externalUserIdsController', 'ExternalUserIdService', 'CosmosDB']
    });
  } else {
    server.log.warn('⚠️  External user IDs routes not registered - controller missing');
    tracker.record('External User IDs', false, { 
      prefix: '/api/v1',
      reason: 'externalUserIdsController missing',
      dependencies: ['externalUserIdsController']
    });
  }

  // User security routes (admin)
  if (server.userSecurityController) {
    registerUserSecurityRoutes(server, server.userSecurityController);
    server.log.info('✅ User security routes registered');
    tracker.record('User Security', true, { 
      prefix: '/api/v1',
      dependencies: ['userSecurityController', 'DeviceSecurityService', 'CosmosDB']
    });
  } else {
    server.log.warn('⚠️  User security routes not registered - UserSecurityController missing');
    tracker.record('User Security', false, { 
      prefix: '/api/v1',
      reason: 'userSecurityController missing',
      dependencies: ['userSecurityController']
    });
  }

  if (server.sessionManagementController) {
    await registerSessionManagementRoutes(server);
    server.log.info('✅ Session management routes registered');
    tracker.record('Session Management', true, { 
      prefix: '/api/v1',
      dependencies: ['sessionManagementController', 'SessionManagementService', 'Redis']
    });
  } else {
    server.log.warn('⚠️  Session management routes not registered - controller missing');
    tracker.record('Session Management', false, { 
      prefix: '/api/v1',
      reason: 'sessionManagementController missing',
      dependencies: ['sessionManagementController']
    });
  }

  if ((server as any).roleManagementController) {
    await registerRoleManagementRoutes(server);
    server.log.info('✅ Role management routes registered');
    tracker.record('Role Management', true, { 
      prefix: '/api/v1',
      dependencies: ['roleManagementController', 'RoleManagementService', 'CosmosDB']
    });
  } else {
    server.log.warn('⚠️  Role management routes not registered - controller missing');
    tracker.record('Role Management', false, { 
      prefix: '/api/v1',
      reason: 'roleManagementController missing',
      dependencies: ['roleManagementController']
    });
  }

  if (server.tenantController) {
    await registerTenantRoutes(server);
    server.log.info('✅ Tenant routes registered');
    tracker.record('Tenant', true, { 
      prefix: '/api/v1',
      dependencies: ['tenantController', 'TenantService', 'CosmosDB']
    });
  } else {
    server.log.warn('⚠️  Tenant routes not registered - controller missing');
    tracker.record('Tenant', false, { 
      prefix: '/api/v1',
      reason: 'tenantController missing',
      dependencies: ['tenantController']
    });
  }

  if (server.tenantMembershipController) {
    await registerTenantMembershipRoutes(server);
    server.log.info('✅ Tenant membership routes registered');
    tracker.record('Tenant Membership', true, { 
      prefix: '/api/v1',
      dependencies: ['tenantMembershipController', 'TenantService', 'CosmosDB']
    });
  } else {
    server.log.warn('⚠️  Tenant membership routes not registered - controller missing');
    tracker.record('Tenant Membership', false, { 
      prefix: '/api/v1',
      reason: 'tenantMembershipController missing',
      dependencies: ['tenantMembershipController']
    });
  }

  // Audit log routes (requires Cosmos DB)
  const cosmosClient = server.cosmos || (server as any).cosmosClient;
  const cosmosDatabase = server.cosmosDatabase;
  if (cosmosClient || cosmosDatabase) {
    try {
      await auditLogRoutes(server);
      server.log.info('✅ Audit log routes registered');
      tracker.record('Audit Logs', true, { 
        prefix: '/api/v1',
        dependencies: ['CosmosDB']
      });
      serviceHealthTracker.trackSuccess('Audit Log Routes', 'registration', ['CosmosDB']);
    } catch (err) {
      server.log.warn({ err }, '⚠️ Audit log routes not registered');
      tracker.record('Audit Logs', false, { 
        prefix: '/api/v1',
        reason: err instanceof Error ? err.message : 'Registration failed',
        dependencies: ['CosmosDB']
      });
      serviceHealthTracker.trackFailure({
        serviceName: 'Audit Log Routes',
        operation: 'registration',
        error: err,
        criticality: 'optional',
        dependencies: extractDependencies(err, { dependencies: ['CosmosDB'] }),
        errorCode: extractErrorCode(err),
      });
    }
  } else {
    server.log.debug('ℹ️  Audit log routes not registered - Cosmos DB unavailable');
    tracker.record('Audit Logs', false, { 
      prefix: '/api/v1',
      reason: 'Cosmos DB unavailable',
      dependencies: ['CosmosDB']
    });
  }

  // Notification routes
  server.log.info('🔍 Checking for notification controller...');
  if (server.notificationController) {
    server.log.info('✅ Notification controller found, registering routes...');
    try {
      const { registerNotificationRoutes } = await import('./notification.routes.js');
      await registerNotificationRoutes(server);
      server.log.info('✅ Notification routes registered successfully');
      tracker.record('Notifications', true, { 
        prefix: '/api/v1',
        dependencies: ['notificationController', 'NotificationService', 'CosmosDB', 'Redis']
      });
    } catch (err) {
      server.log.error({ err }, '❌ Notification routes registration failed');
      server.log.error({ error: err }, 'Error details');
      tracker.record('Notifications', false, { 
        prefix: '/api/v1',
        reason: err instanceof Error ? err.message : 'Registration failed',
        dependencies: ['notificationController']
      });
      serviceHealthTracker.trackFailure({
        serviceName: 'Notification Routes',
        operation: 'registration',
        error: err,
        criticality: 'optional',
        dependencies: extractDependencies(err, { dependencies: ['notificationController', 'NotificationService', 'CosmosDB', 'Redis'] }),
        errorCode: extractErrorCode(err),
      });
    }
  } else {
    server.log.warn('⚠️  Notification routes not registered - controller missing');
      server.log.warn({ decorators: Object.keys(server).filter(k => !k.startsWith('_') && k !== 'log').slice(0, 10) }, 'Available server decorators');
    tracker.record('Notifications', false, { 
      prefix: '/api/v1',
      reason: 'notificationController missing',
      dependencies: ['notificationController']
    });
  }

  // Protected routes (require authentication)
  await registerProtectedRoutes(
    server,
    server.tokenValidationCache || null
  );
  server.log.info('✅ Protected routes registered');
  tracker.record('Protected Routes', true, { 
    prefix: '/api/v1',
    dependencies: ['tokenValidationCache']
  });

  // Monitoring is already initialized above

  // Initialize Conversation Event Subscriber Service (if Redis available)
  let conversationEventSubscriber: any = undefined;
  if (redis) {
    const { ConversationEventSubscriberService } = await import('../services/conversation-event-subscriber.service.js');
    conversationEventSubscriber = new ConversationEventSubscriberService(redis, monitoring);
    await conversationEventSubscriber.initialize();
    server.log.info('✅ Conversation Event Subscriber Service initialized');
  }

  // SSE routes (require authentication)
  await registerSSERoutes(
    server,
    server.tokenValidationCache || null,
    conversationEventSubscriber
  );
  server.log.info('✅ SSE routes registered');
  tracker.record('SSE', true, { 
    prefix: '/api/v1',
    dependencies: ['tokenValidationCache', 'Redis']
  });

  // WebSocket routes (require authentication)
  const { registerWebSocketRoutes } = await import('./websocket.routes.js');
  await registerWebSocketRoutes(
    server,
    server.tokenValidationCache || null
  );
  server.log.info('✅ WebSocket routes registered');
  tracker.record('WebSocket', true, { 
    prefix: '/api/v1',
    dependencies: ['tokenValidationCache']
  });

  // Add global authentication hook for /api/v1/* routes
  const apiTokenCache = server.tokenValidationCache || null;
  server.addHook('onRequest', async (request, reply) => {
    // Skip authentication for OPTIONS requests (CORS preflight)
    if (request.method === 'OPTIONS') {
      return;
    }

    // Only apply to /api/v1/* routes (skip auth, health, etc.)
    const url = request.url.split('?')[0]; // Remove query params

    // Exclude public routes from authentication
    const publicRoutes = [
      '/api/v1/auth/login',
      '/api/v1/auth/logout',
      '/api/v1/auth/refresh',
      '/api/v1/auth/google',
      '/api/v1/auth/github',
      '/api/v1/auth/microsoft',
      '/api/v1/oauth/',
      '/api/v1/sso/',
      '/api/v1/magic-link/',
    ];

    const isPublicRoute = publicRoutes.some(route => url.startsWith(route));

    if (url.startsWith('/api/v1/') && !isPublicRoute) {
      try {
        const authStart = Date.now();
        await authenticate(apiTokenCache)(request, reply);
        const authDuration = Date.now() - authStart;

        // Log slow authentication (without sensitive data)
        if (authDuration > 100) {
          server.log.warn({ url, duration: authDuration }, 'Slow authentication detected');
        }
      } catch (error: unknown) {
        // Log auth errors for debugging (without sensitive data)
        const errorMessage = error instanceof Error ? error.message : String(error);
        const statusCode = error && typeof error === 'object' && 'statusCode' in error ? (error as { statusCode?: number }).statusCode : undefined;
        const errorName = error && typeof error === 'object' && 'name' in error ? (error as { name?: string }).name : undefined;
        server.log.error({
          url,
          errorMessage,
          statusCode,
          errorName,
        }, 'Authentication failed');

        // Ensure we have a proper error with message
        if ((error as any)?.statusCode === 401) {
          // Re-throw with proper message
          const authError = error instanceof UnauthorizedError
            ? error
            : new UnauthorizedError(errorMessage);
          throw authError;
        }

        // Log unexpected errors
        if (error && typeof error === 'object' && 'statusCode' in error && (error as { statusCode?: number }).statusCode !== 401) {
          request.log.error({ url, error: errorMessage }, 'Unexpected authentication error');
        }

        // Re-throw to let Fastify error handler respond
        throw error;
      }
    }
  });
  server.log.info('✅ Global authentication hook added for /api/v1/* routes');

  // Document, Collection, and Bulk Document routes are now registered via registerContentRoutes below

  // Data routes (Shards, ShardTypes, ACL, Revisions, Vector Search, Embedding, etc.)
  // are now registered via registerDataRoutes below
  const cacheService = (server as any).cache;
  const cacheSubscriber = (server as any).cacheSubscriber;
    const shardCacheService = (server as any).shardCache;
  
  // Create shard type cache service if cache services are available
  let shardTypeCacheService: any = undefined;
  if (cacheService && cacheSubscriber) {
    const { ShardTypeCacheService } = await import('../services/shard-type-cache.service.js');
    shardTypeCacheService = new ShardTypeCacheService(cacheService, cacheSubscriber, monitoring);
    server.decorate('shardTypeCache', shardTypeCacheService);
  }
  
  // Create services needed for data routes registration
    // Get Phase 2 services from server if available
    const redactionService = (server as any).redactionService;
    const auditTrailService = (server as any).auditTrailService;
  
  // Create shardRepository if not already on server
  let shardRepository = (server as any).shardRepository;
  if (!shardRepository && (cacheService || shardCacheService)) {
    shardRepository = new ShardRepository(
      monitoring,
      shardCacheService,
      undefined, // queueService - not needed here
      redactionService,
      auditTrailService
    );
    // Store shardRepository on server for use by other routes
    (server as FastifyInstance & { shardRepository?: ShardRepository }).shardRepository = shardRepository;
  }
  
  // Create shardTypeRepository if not already on server
  let shardTypeRepository = (server as any).shardTypeRepository;
  if (!shardTypeRepository) {
    shardTypeRepository = new ShardTypeRepository(monitoring, shardTypeCacheService);
    server.decorate('shardTypeRepository', shardTypeRepository);
  }
  
  // Create relationshipService if not already on server
  let relationshipService = (server as any).relationshipService;
  if (!relationshipService && shardRepository) {
    relationshipService = new ShardRelationshipService(
      monitoring,
      shardRepository,
      (server as any).relationshipEvolutionService // Optional: Relationship evolution service
    );
    await relationshipService.initialize();
    server.decorate('relationshipService', relationshipService);
  }

  // Register data routes using the new registration module
  if (shardRepository && shardTypeRepository && relationshipService) {
    try {
      const { registerDataRoutes } = await import('./registration/data-routes.registration.js');
      await registerDataRoutes(server, {
        monitoring,
        shardRepository,
        shardTypeRepository,
        relationshipService,
        cacheService,
        cacheSubscriber,
        shardCacheService,
        vectorSearchService: (server as any).vectorSearchService,
        embeddingTemplateService: (server as any).embeddingTemplateService,
        embeddingService: (server as any).embeddingService,
        shardEmbeddingService: (server as any).shardEmbeddingService,
        aclService: (server as any).aclService,
        redis,
      });
      server.log.info('✅ Data routes registered');
    } catch (err) {
      server.log.warn({ err }, '⚠️ Data routes registration failed');
    }
  } else {
    server.log.warn('⚠️ Data routes not registered - required services not available');
  }

  // AI Insights routes - Refactored to use initialization modules
  if (cacheService && cacheSubscriber && shardRepository && shardTypeRepository && relationshipService) {
    try {
      // Initialize infrastructure services
      const { initializeInfrastructureServices } = await import('../services/initialization/infrastructure-services.init.js');
      const infrastructure = await initializeInfrastructureServices(
          server,
        redis,
          monitoring,
        serviceHealthTracker
      );

      // Initialize AI services using the new initialization module
      const { initializeAIServices } = await import('../services/initialization/ai-services.init.js');
      const aiServices = await initializeAIServices(server, {
        monitoring,
        redis,
        shardRepository,
        shardTypeRepository,
        relationshipService,
        cosmosDatabase: infrastructure.cosmosDatabase || (server as any).cosmosDatabase,
        cosmosClient: infrastructure.cosmosClient || (server as any).cosmosClient,
        configurationService: (server as any).configurationService,
        aiConfigService: (server as any).aiConfigService,
        aiConnectionService: (server as any).aiConnectionService,
        serviceRegistry: (server as any).serviceRegistry,
        serviceHealthTracker,
      });

      // Services are now initialized by initializeAIServices() above
      // Get services from aiServices result for additional initialization and route registration
      const contextTemplateService = aiServices.contextTemplateService;
      const conversationService = aiServices.conversationService;
      const azureOpenAI = aiServices.azureOpenAI;
      const vectorSearchService = aiServices.vectorSearchService || (server as any).vectorSearchService;

      // Initialize WebSearchContextIntegrationService if web search is configured
      // Note: This is not yet in ai-services.init.ts, so we initialize it here
      let webSearchContextIntegration: any = undefined;
      let webSearchService: any = undefined; // Declare outside for tool executor access
      try {
        // Check if web search API keys are configured (at least one provider needed)
        const hasWebSearchConfig = Boolean(
          process.env.SERP_API_KEY || 
          process.env.BING_SEARCH_API_KEY || 
          process.env.GOOGLE_SEARCH_API_KEY ||
          process.env.GOOGLE_SEARCH_ENGINE_ID
        );

      const configurationService = (server as any).configurationService;
      const hasCosmosEmbeddingConfig = configurationService
        ? Boolean(
            configurationService.getValue('cosmosDb.endpoint') &&
            configurationService.getValue('cosmosDb.key')
          )
        : Boolean(process.env.COSMOS_DB_ENDPOINT && process.env.COSMOS_DB_KEY);

        // Get cosmosDbClient from aiServices or server
      let cosmosDbClient: any = undefined;
      if (hasCosmosEmbeddingConfig) {
        try {
          const { CosmosDbClient } = await import('../services/auth/cosmos-db.service.js');
          const { config } = await import('../config/env.js');
          cosmosDbClient = new CosmosDbClient({
            endpoint: config.cosmosDb.endpoint,
            key: config.cosmosDb.key,
            database: config.cosmosDb.databaseId,
              usersContainer: config.cosmosDb.containers.users || 'users',
            rolesContainer: config.cosmosDb.containers.roles,
            tenantsContainer: config.cosmosDb.containers.tenants,
            ssoConfigsContainer: config.cosmosDb.containers.ssoConfigs,
            oauth2ClientsContainer: config.cosmosDb.containers.oauth2Clients,
            joinRequestsContainer: config.cosmosDb.containers.joinRequests,
            tenantInvitationsContainer: config.cosmosDb.containers.tenantInvitations,
          }, monitoring);
        } catch (err) {
            server.log.warn({ err }, '⚠️ Failed to initialize CosmosDbClient for web search');
          }
        }

        if (hasWebSearchConfig && hasCosmosEmbeddingConfig && cosmosDbClient) {
          const { WebSearchContextIntegrationService } = await import('../services/web-search/web-search-context-integration.service.js');
          const { WebSearchService } = await import('../services/web-search/web-search.service.js');
          const { WebSearchCosmosService } = await import('../services/web-search/cosmos.service.js');
          const { EmbeddingService: WebSearchEmbeddingService } = await import('../services/web-search/embedding.service.js');
          const { SearchProviderFactory, SerpAPIProvider, BingSearchProvider, GoogleSearchProvider } = await import('../services/web-search/providers.js');

          // Reuse existing CosmosDbClient instance (created earlier in embedding services section)
          const database = cosmosDbClient.getDatabase();

          // Initialize web search services
          const webSearchCosmosService = new WebSearchCosmosService(database);
          const webpagesContainer = database.container('c_webpages');

          // Determine primary provider and fallbacks
          let primaryProvider = 'serpapi';
          const fallbacks: string[] = [];
          
          if (process.env.SERP_API_KEY) {
            primaryProvider = 'serpapi';
            if (process.env.BING_SEARCH_API_KEY) {fallbacks.push('bing');}
            if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID) {fallbacks.push('google');}
          } else if (process.env.BING_SEARCH_API_KEY) {
            primaryProvider = 'bing';
            if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID) {fallbacks.push('google');}
          } else if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID) {
            primaryProvider = 'google';
          }

          // Initialize search provider factory
          const providerFactory = new SearchProviderFactory(primaryProvider, fallbacks);
          
          // Register providers if API keys are available
          if (process.env.SERP_API_KEY) {
            providerFactory.registerProvider('serpapi', new SerpAPIProvider({ apiKey: process.env.SERP_API_KEY }));
          }
          if (process.env.BING_SEARCH_API_KEY) {
            providerFactory.registerProvider('bing', new BingSearchProvider({ apiKey: process.env.BING_SEARCH_API_KEY }));
          }
          if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID) {
            providerFactory.registerProvider('google', new GoogleSearchProvider({
              apiKey: process.env.GOOGLE_SEARCH_API_KEY,
              searchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID,
            }));
          }

          // Initialize web search service
          webSearchService = new WebSearchService(webSearchCosmosService, providerFactory);

          // Initialize embedding service for web search (needs OpenAI API key)
          const openaiApiKey = process.env.OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY;
          if (openaiApiKey) {
            const webSearchEmbeddingService = new WebSearchEmbeddingService({
              apiKey: openaiApiKey,
              model: 'text-embedding-3-small',
            });

            // Initialize web search context integration service
            webSearchContextIntegration = new WebSearchContextIntegrationService(
              webSearchService,
              webSearchEmbeddingService,
              webpagesContainer,
              redis || undefined
            );
            server.log.info('✅ Web Search Context Integration service initialized');
          } else {
            server.log.warn('⚠️ Web Search Context Integration skipped - OpenAI API key not configured');
          }
        } else {
          server.log.info('ℹ️  Web Search Context Integration skipped - API keys or Cosmos DB not configured');
        }
      } catch (err) {
        server.log.warn({ err }, '⚠️ Web Search Context Integration initialization failed - continuing without web search');
      }

      // Get services from aiServices (already initialized by initializeAIServices())
      // These services are now initialized in ai-services.init.ts
      const groundingService = aiServices.groundingService;
      const promptResolver = aiServices.promptResolver;
      const entityResolutionService = aiServices.entityResolutionService;
      const contextAwareQueryParserService = aiServices.contextAwareQueryParserService;
      const toolExecutor = aiServices.toolExecutor;
      const multimodalAssetService = aiServices.multimodalAssetService || (server as any).multimodalAssetService;
      const tenantProjectConfigService = aiServices.tenantProjectConfigService;
      const contextQualityService = aiServices.contextQualityService;
      const comprehensiveAuditTrailService = aiServices.comprehensiveAuditTrailService;
      const piiDetectionService = aiServices.piiDetectionService;
      const piiRedactionService = aiServices.piiRedactionService;
      const fieldSecurityService = aiServices.fieldSecurityService;
      const citationValidationService = aiServices.citationValidationService;
      const promptInjectionDefenseService = aiServices.promptInjectionDefenseService;
      const contextCacheService = aiServices.contextCacheService;
      const insightService = aiServices.insightService;
      const conversationService = aiServices.conversationService;
      const conversationRealtimeService = aiServices.conversationRealtimeService;
      const userFeedbackService = aiServices.userFeedbackService;

      // Update tool executor with web search service if available (web search is not yet in ai-services.init.ts)
      if (toolExecutor && webSearchService) {
        // Note: AIToolExecutorService might need a setter for webSearchService
        // For now, webSearchService is passed during initialization in ai-services.init.ts
      }
      
      // Set ACLService on InsightService for ProjectContextService permission checks
      const aclServiceForInsight = (server as any).aclService;
      if (aclServiceForInsight && insightService) {
        insightService.setACLService(aclServiceForInsight);
      }

      // Register AI routes using the new registration module
      const { registerAIRoutes } = await import('./registration/ai-routes.registration.js');
        const authenticateDecorator = (server as any).authenticate;
        
        if (!authenticateDecorator) {
        server.log.error('❌ Cannot register AI routes - authenticate decorator missing');
        throw new Error('Authenticate decorator is required for AI routes');
      }

      await registerAIRoutes(server, {
        insightService: aiServices.insightService,
        conversationService: aiServices.conversationService,
        contextTemplateService: aiServices.contextTemplateService,
        entityResolutionService: aiServices.entityResolutionService,
        contextAwareQueryParserService: aiServices.contextAwareQueryParserService,
        conversationRealtimeService: aiServices.conversationRealtimeService,
        multimodalAssetService: aiServices.multimodalAssetService || (server as any).multimodalAssetService,
        embeddingTemplateService: aiServices.embeddingTemplateService,
        embeddingService: aiServices.embeddingService,
        shardEmbeddingService: aiServices.shardEmbeddingService,
        vectorSearchService: aiServices.vectorSearchService,
        azureOpenAI: aiServices.azureOpenAI,
        unifiedAIClient: aiServices.unifiedAIClient,
        aiConnectionService: (server as any).aiConnectionService,
        aiModelSelection: aiServices.aiModelSelection,
        toolExecutor: aiServices.toolExecutor,
        promptResolver: aiServices.promptResolver,
        promptRepository: aiServices.promptRepository,
        promptRenderer: aiServices.promptRenderer,
        promptABTestService: aiServices.promptABTestService,
        promptAnalytics: aiServices.promptAnalytics,
        modelRouter: aiServices.modelRouter,
        redis,
        monitoring,
        authenticate: authenticateDecorator,
        tokenValidationCache: (server as any).tokenValidationCache,
      });

      // Initialize Proactive Insights Service
      let proactiveInsightService: any = undefined;
      let deliveryPreferencesRepository: any = undefined;
      try {
        const { ProactiveInsightService } = await import('../services/proactive-insight.service.js');
        const { ProactiveInsightsRepository } = await import('../repositories/proactive-insights.repository.js');
        
        // Get Cosmos DB client from server
        const cosmosClient = (server as any).cosmos as import('@azure/cosmos').CosmosClient | undefined;
        const databaseId = (server as any).cosmosDatabase?.id as string | undefined;
        const notificationService = (server as any).notificationService;

        if (cosmosClient && databaseId && insightService) {
          // Initialize repository
          const proactiveInsightsRepository = new ProactiveInsightsRepository(
            cosmosClient,
            databaseId,
            config.cosmosDb.containers.proactiveInsights,
            monitoring
          );

          // Get UserService if available (for delivering insights to all users in tenant)
          const userService = (server as any).userService;
          
          // Get EmailService if available (for direct email delivery)
          const emailService = (server as any).emailService;

          // Initialize Analytics Service first (if Redis is available)
          // We need it to pass to ProactiveInsightService
          let proactiveInsightsAnalyticsService: any = undefined;
          if (redis) {
            try {
              const { ProactiveInsightsAnalyticsService } = await import('../services/proactive-insights-analytics.service.js');
              proactiveInsightsAnalyticsService = new ProactiveInsightsAnalyticsService(
                redis,
                monitoring,
                proactiveInsightsRepository
              );
              server.log.info('✅ Proactive Insights Analytics service initialized');
            } catch (err) {
              server.log.warn({ err }, '⚠️ Proactive Insights Analytics service failed to initialize');
            }
          }

          // Initialize service with repository, notification service, analytics service, and email service
          // Note: triggersRepository will be set later after it's initialized
          proactiveInsightService = new ProactiveInsightService(
            monitoring,
            shardRepository,
            insightService,
            redis || undefined,
            proactiveInsightsRepository,
            notificationService, // Pass notification service for delivery integration
            undefined, // triggersRepository - will be set after initialization
            userService, // Pass user service for tenant-wide delivery
            proactiveInsightsAnalyticsService, // Pass analytics service for event tracking
            emailService // Pass email service for direct email delivery
          );

          // Initialize Delivery Preferences Repository
          try {
            const { ProactiveInsightsDeliveryPreferencesRepository } = await import('../repositories/proactive-insights-delivery-preferences.repository.js');
            
            // Use the same container as proactive insights (with _type field to distinguish)
            deliveryPreferencesRepository = new ProactiveInsightsDeliveryPreferencesRepository(
              cosmosClient
                .database(databaseId)
                .container(config.cosmosDb.containers.proactiveInsights)
            );

            // Set repository on service
            proactiveInsightService.setDeliveryPreferencesRepository(deliveryPreferencesRepository);
            server.log.info('✅ Delivery Preferences repository initialized');
          } catch (err) {
            server.log.warn({ err }, '⚠️ Delivery Preferences repository failed to initialize');
          }

          // Register routes (with all dependencies)
          await registerProactiveInsightsRoutes(
            server,
            proactiveInsightService,
            deliveryPreferencesRepository,
            proactiveInsightsAnalyticsService
          );
          server.log.info('✅ Proactive Insights routes registered');

          // Register delivery preferences routes (separate function)
          if (deliveryPreferencesRepository) {
            try {
              await registerDeliveryPreferencesRoutes(server, deliveryPreferencesRepository, proactiveInsightsAnalyticsService);
              server.log.info('✅ Delivery Preferences routes registered');
            } catch (err) {
              server.log.warn({ err }, '⚠️ Delivery Preferences routes failed to register');
            }
          }

          // Initialize Proactive Triggers Repository and Routes
          try {
            const { ProactiveTriggersRepository } = await import('../repositories/proactive-triggers.repository.js');
            const { registerProactiveTriggersRoutes } = await import('./proactive-triggers.routes.js');

            const proactiveTriggersRepository = new ProactiveTriggersRepository(
              cosmosClient,
              databaseId,
              config.cosmosDb.containers.proactiveTriggers
            );

            await registerProactiveTriggersRoutes(server, proactiveTriggersRepository, proactiveInsightService);
            server.log.info('✅ Proactive Triggers routes registered');

            // Store repository on service for use in getActiveTriggers
            proactiveInsightService.setTriggersRepository(proactiveTriggersRepository);
          } catch (err) {
            server.log.warn({ err }, '⚠️ Proactive Triggers routes failed to register');
          }
        } else {
          server.log.warn('⚠️ Proactive Insights routes not registered - Cosmos DB client or InsightService unavailable');
        }
      } catch (err) {
        server.log.warn({ err }, '⚠️ Proactive Insights routes failed to register');
      }

      // Initialize Proactive Insights Worker
      if (proactiveInsightService) {
        try {
          const { ProactiveInsightsWorker } = await import('../services/proactive-insights-worker.service.js');
          
          // Get tenant service and tenants container
          const tenantService = (server as any).tenantService as TenantService | undefined;
          const cosmosDbClient = (server as any).cosmosDbClient;
          const tenantsContainer = cosmosDbClient?.getTenantsContainer?.() || null;

          const proactiveInsightsWorker = new ProactiveInsightsWorker(
            proactiveInsightService,
            tenantService || null,
            monitoring,
            tenantsContainer,
            {
              pollIntervalMs: parseInt(process.env.PROACTIVE_INSIGHTS_WORKER_POLL_INTERVAL_MS || '60000', 10), // 1 minute default
              batchSize: parseInt(process.env.PROACTIVE_INSIGHTS_WORKER_BATCH_SIZE || '10', 10),
              maxConcurrentTenants: parseInt(process.env.PROACTIVE_INSIGHTS_WORKER_MAX_CONCURRENT || '5', 10),
              enabled: process.env.PROACTIVE_INSIGHTS_WORKER_ENABLED !== 'false',
            }
          );

          // Start the worker
          proactiveInsightsWorker.start();
          (server as any).proactiveInsightsWorker = proactiveInsightsWorker;
          server.log.info('✅ Proactive Insights worker started');

          // Initialize Proactive Insights Event Subscriber
          if (redis) {
            try {
              const { ProactiveInsightsEventSubscriberService } = await import('../services/proactive-insights-event-subscriber.service.js');
              
              const eventSubscriber = new ProactiveInsightsEventSubscriberService(
                redis,
                monitoring,
                proactiveInsightService
              );

              await eventSubscriber.initialize();
              (server as any).proactiveInsightsEventSubscriber = eventSubscriber;
              server.log.info('✅ Proactive Insights event subscriber started');
            } catch (err) {
              server.log.warn({ err }, '⚠️ Proactive Insights event subscriber failed to start');
            }
          }

          // Initialize Proactive Insights Digest Worker
          if (redis && deliveryPreferencesRepository) {
            try {
              const { ProactiveInsightsDigestWorker } = await import('../services/proactive-insights-digest-worker.service.js');
              const emailService = (server as any).emailService;
              const userService = (server as any).userService;
              const proactiveInsightsAnalyticsServiceForWorker = (server as any).proactiveInsightsAnalyticsService;

              if (emailService && userService) {
                const digestWorker = new ProactiveInsightsDigestWorker(
                  redis,
                  emailService,
                  deliveryPreferencesRepository,
                  userService,
                  monitoring,
                  proactiveInsightsAnalyticsServiceForWorker, // Pass analytics service for event tracking
                  {
                    pollIntervalMs: parseInt(process.env.PROACTIVE_INSIGHTS_DIGEST_WORKER_POLL_INTERVAL_MS || '60000', 10), // 1 minute default
                    enabled: process.env.PROACTIVE_INSIGHTS_DIGEST_WORKER_ENABLED !== 'false',
                  }
                );

                // Start the worker
                digestWorker.start();
                (server as any).proactiveInsightsDigestWorker = digestWorker;
                server.log.info('✅ Proactive Insights digest worker started');
              } else {
                server.log.warn('⚠️ Proactive Insights digest worker not started - Email service or User service not available');
              }
            } catch (err) {
              server.log.warn({ err }, '⚠️ Proactive Insights digest worker failed to start');
            }
          }
        } catch (err) {
          server.log.warn({ err }, '⚠️ Proactive Insights worker failed to start');
        }
      }

      // Prompt System already initialized above for InsightService
      // Reuse the same instances here for prompt routes, or create if not available
      let promptRepositoryForRoutes: any;
      let promptRendererForRoutes: any;
      let promptABTestServiceForRoutes: any;
      let promptResolverForRoutes: any;

      if (promptResolver) {
        // Reuse existing instances - we need to extract them or recreate for routes
        // For simplicity, create new instances but reuse the resolver if possible
        const { AIInsightsCosmosService } = await import('../services/ai-insights/cosmos.service.js');
        const { PromptRepository } = await import('../services/ai-insights/prompt.repository.js');
        const { PromptRendererService } = await import('../services/ai-insights/prompt-renderer.service.js');
      const { PromptABTestService } = await import('../services/prompt-ab-test.service.js');

        const aiInsightsCosmosService = new AIInsightsCosmosService(monitoring);
        promptRepositoryForRoutes = new PromptRepository(aiInsightsCosmosService);
        promptRendererForRoutes = new PromptRendererService();
        promptABTestServiceForRoutes = new PromptABTestService(aiInsightsCosmosService, monitoring);
        promptResolverForRoutes = promptResolver; // Reuse the resolver created earlier
      } else {
        // Create new instances if not created earlier
        try {
          const { AIInsightsCosmosService } = await import('../services/ai-insights/cosmos.service.js');
          const { PromptRepository } = await import('../services/ai-insights/prompt.repository.js');
          const { PromptRendererService } = await import('../services/ai-insights/prompt-renderer.service.js');
          const { PromptABTestService } = await import('../services/prompt-ab-test.service.js');
          const { PromptResolverService } = await import('../services/ai-insights/prompt-resolver.service.js');

          const aiInsightsCosmosService = new AIInsightsCosmosService(monitoring);
          promptRepositoryForRoutes = new PromptRepository(aiInsightsCosmosService);
          promptRendererForRoutes = new PromptRendererService();
          promptABTestServiceForRoutes = new PromptABTestService(aiInsightsCosmosService, monitoring);
          server.log.info('✅ Prompt A/B Testing service initialized');
          promptResolverForRoutes = new PromptResolverService(promptRepositoryForRoutes, promptRendererForRoutes, promptABTestServiceForRoutes);
        } catch (err) {
          server.log.warn({ err }, '⚠️ Prompt System initialization failed for routes');
          // Set to undefined - routes will handle gracefully
          promptRepositoryForRoutes = undefined;
          promptRendererForRoutes = undefined;
          promptABTestServiceForRoutes = undefined;
          promptResolverForRoutes = undefined;
        }
      }

      if (promptRepositoryForRoutes && promptResolverForRoutes && promptRendererForRoutes) {
      await server.register(promptsRoutes, {
        prefix: '/api/v1/prompts',
          promptRepository: promptRepositoryForRoutes,
          promptResolver: promptResolverForRoutes,
          promptRenderer: promptRendererForRoutes
        });
      } else {
        server.log.warn('⚠️ Prompt routes not registered - prompt system not available');
      }
      server.log.info('✅ Prompt System routes registered');

      // Register Prompt A/B Testing routes
      if (promptABTestServiceForRoutes) {
      const { promptABTestRoutes } = await import('./prompt-ab-test.routes.js');
      await server.register(promptABTestRoutes, {
        prefix: '/api/v1',
          abTestService: promptABTestServiceForRoutes,
      });
      server.log.info('✅ Prompt A/B Testing routes registered');
      }

      // Initialize AI Recommendation Service
      try {
        const { AIRecommendationService } = await import('../services/ai-insights/ai-recommendation.service.js');
        const aiRecommendationService = new AIRecommendationService(
          azureOpenAI,
          promptResolverForRoutes || promptResolver, // Use promptResolverForRoutes if available, otherwise fallback to promptResolver
          promptRendererForRoutes || (promptResolver ? new (await import('../services/ai-insights/prompt-renderer.service.js')).PromptRendererService() : undefined),
          monitoring
        );

        await server.register(async (aiRecServer) => {
          await registerAIRecommendationRoutes(aiRecServer, aiRecommendationService);
        }, { prefix: '/api/v1' });
        
        server.log.info('✅ AI Recommendation routes registered');
      } catch (err) {
        server.log.warn({ err }, '⚠️ AI Recommendation routes failed to register');
      }

      // AI Settings routes (Super Admin & Tenant Admin)
      await server.register(aiSettingsRoutes, {
        prefix: '/api/v1',
        monitoring,
        shardRepository,
        shardTypeRepository,
      });
      server.log.info('✅ AI Settings routes registered');

      // AI Connections routes (Super Admin & Tenant Admin)
      if (aiConnectionService) {
        // Register routes with /api/v1 prefix
        await server.register(async (fastify) => {
          registerAIConnectionsRoutes(fastify, aiConnectionService, unifiedAIClient, monitoring);
        }, { prefix: '/api/v1' });
        server.log.info('✅ AI Connections routes registered');
      } else {
        server.log.warn('⚠️ AI Connections routes not registered - AI Connection service not available');
      }

      // AI Models Catalog, AI Tools, Intent Pattern, and Custom Integration routes
      // are now registered via registerAIRoutes above

      // AI Analytics routes
      if (redis) {
        // Get promptAnalytics and modelRouter from the scope where they were initialized
        const promptAnalytics = (server as any).promptAnalytics;
        const modelRouter = (server as any).modelRouter;
        
        await server.register(aiAnalyticsRoutes, {
          prefix: '/api/v1',
          monitoring,
          redis,
          promptAnalytics,
          modelRouter,
        });
        server.log.info('✅ AI Analytics routes registered');
      }
    } catch (insightErr) {
      server.log.warn({ err: insightErr }, '⚠️ AI Insights routes not registered');
    }
  } else {
    server.log.warn('⚠️  Shards routes not registered - cache services not available');
    
    // Even without cache, try to register AI Insights routes with minimal services
    // This allows the chat interface to work even if Redis cache is not available
    try {
      const { ShardRepository } = await import('../repositories/shard.repository.js');
      const { ShardTypeRepository } = await import('../repositories/shard-type.repository.js');
      const { ShardRelationshipService } = await import('../services/shard-relationship.service.js');
      const { ContextTemplateService } = await import('../services/context-template.service.js');
      const { ConversationService } = await import('../services/conversation.service.js');
      const { IntentAnalyzerService } = await import('../services/intent-analyzer.service.js');
      const { AzureOpenAIService } = await import('../services/azure-openai.service.js');
      const { InsightService } = await import('../services/insight.service.js');
      const { EntityResolutionService } = await import('../services/entity-resolution.service.js');
      const { ContextAwareQueryParserService } = await import('../services/context-aware-query-parser.service.js');
      const { ConversionService } = await import('../services/content-generation/conversion.service.js');
      const { ConversationRealtimeService } = await import('../services/conversation-realtime.service.js');
      const { insightsRoutes } = await import('./insights.routes.js');

      // Create minimal services without cache
      const shardTypeRepo = new ShardTypeRepository(monitoring);
      const shardRepository = new ShardRepository(monitoring); // No cache service
      const relationshipService = new ShardRelationshipService(
        monitoring,
        shardRepository,
        (server as any).relationshipEvolutionService // Optional: Relationship evolution service
      );
      await relationshipService.initialize();
      
      // Get AI services for template selection (optional, for LLM-based query understanding)
      // Note: These may not be available at this point, will be set later if needed
      const unifiedAIClientForTemplates = (server as any).unifiedAIClient;
      const aiConnectionServiceForTemplates = (server as any).aiConnectionService;
      
      // Get vectorSearchService if available (for RAG retrieval)
      const vectorSearchServiceForContext = (server as any).vectorSearchService;
      // Get ACLService if available (for permission checks)
      const aclServiceForContext = (server as any).aclService;
      
      const contextTemplateService = new ContextTemplateService(
        monitoring,
        shardRepository,
        shardTypeRepo,
        relationshipService,
        redis || undefined, // Redis is optional
        unifiedAIClientForTemplates, // Optional: for LLM-based template selection
        aiConnectionServiceForTemplates, // Optional: for LLM-based template selection
        vectorSearchServiceForContext, // Optional: for RAG retrieval
        aclServiceForContext // Optional: for ACL permission checks
      );

      // Reuse conversionService from server if available, otherwise create new instance
      let conversionService = (server as any).conversionService;
      if (!conversionService) {
        const { ConversionService } = await import('../services/content-generation/conversion.service.js');
        conversionService = new ConversionService(monitoring);
        server.decorate('conversionService', conversionService);
      }
      let conversationRealtimeService: any = undefined;
      if (redis) {
        conversationRealtimeService = new ConversationRealtimeService(redis, monitoring);
      }

      const notificationService = (server as any).notificationService;
      const userService = (server as any).userService;

      const conversationService = new ConversationService(
        monitoring,
        shardRepository,
        shardTypeRepo,
        redis || undefined, // Redis is optional
        undefined, // unifiedAIClient
        undefined, // aiConnectionService
        conversionService,
        undefined, // shardRelationshipService
        conversationRealtimeService,
        notificationService,
        userService,
        undefined // Phase 5.1: ConversationSummarizationService - optional
      );

      const intentAnalyzer = new IntentAnalyzerService(
        monitoring,
        shardRepository,
        shardTypeRepo,
        redis || undefined // Redis is optional
      );

      const azureOpenAI = new AzureOpenAIService(
        {
          endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
          apiKey: process.env.AZURE_OPENAI_API_KEY || '',
          deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o',
        },
        monitoring
      );

      const entityResolutionService = new EntityResolutionService(
        shardRepository,
        monitoring,
        redis || undefined // Redis is optional
      );

      const contextAwareQueryParserService = new ContextAwareQueryParserService(
        entityResolutionService,
        shardRepository,
        monitoring
      );

      // Initialize Prompt System for this InsightService instance (if not already created)
      let promptResolverForSecondInstance: any = undefined;
      const promptResolver = (server as any).promptResolver; // Check if already initialized
      if (!promptResolver) {
        try {
          const { AIInsightsCosmosService } = await import('../services/ai-insights/cosmos.service.js');
          const { PromptRepository } = await import('../services/ai-insights/prompt.repository.js');
          const { PromptRendererService } = await import('../services/ai-insights/prompt-renderer.service.js');
          const { PromptABTestService } = await import('../services/prompt-ab-test.service.js');
          const { PromptResolverService } = await import('../services/ai-insights/prompt-resolver.service.js');

          const aiInsightsCosmosService = new AIInsightsCosmosService(monitoring);
          const promptRepository = new PromptRepository(aiInsightsCosmosService);
          const promptRenderer = new PromptRendererService();
          const promptABTestService = new PromptABTestService(aiInsightsCosmosService, monitoring);
          promptResolverForSecondInstance = new PromptResolverService(promptRepository, promptRenderer, promptABTestService);
        } catch (err) {
          server.log.warn({ err }, '⚠️ Prompt Resolver Service initialization failed for second instance - continuing with fallback prompts');
        }
      } else {
        promptResolverForSecondInstance = promptResolver; // Reuse if available
      }

      // Get contextQualityService from server if available
      const contextQualityServiceForSecond = (server as any).contextQualityService;
      // Get comprehensiveAuditTrailService from server if available
      const comprehensiveAuditTrailServiceForSecond = (server as any).comprehensiveAuditTrailService;
      // Get PII services from server if available (Phase 3.1)
      const piiDetectionServiceForSecond = (server as any).piiDetectionService;
      const piiRedactionServiceForSecond = (server as any).piiRedactionService;
      const fieldSecurityServiceForSecond = (server as any).fieldSecurityService;

      const insightService = new InsightService(
        monitoring,
        shardRepository,
        shardTypeRepo,
        intentAnalyzer,
        contextTemplateService,
        conversationService,
        azureOpenAI,
        undefined, // groundingService
        undefined, // vectorSearchService
        undefined, // webSearchContextIntegration
        redis || undefined,
        undefined, // aiModelSelection
        undefined, // unifiedAIClient
        undefined, // aiConnectionService
        relationshipService,
        promptResolverForSecondInstance, // PromptResolverService - optional
        contextAwareQueryParserService, // ContextAwareQueryParserService - for shard-specific Q&A
        undefined, // toolExecutor - not needed for second instance
        undefined, // aiConfigService
        undefined, // tenantProjectConfigService
        undefined, // multimodalAssetService
        contextQualityServiceForSecond, // ContextQualityService - reuse from main instance
        comprehensiveAuditTrailServiceForSecond, // ComprehensiveAuditTrailService - reuse from main instance
        piiDetectionServiceForSecond, // Phase 3.1: PIIDetectionService - reuse from main instance
        piiRedactionServiceForSecond, // Phase 3.1: PIIRedactionService - reuse from main instance
        fieldSecurityServiceForSecond, // Phase 3.1: FieldSecurityService - reuse from main instance
        undefined, // citationValidationService - not needed for second instance
        undefined, // promptInjectionDefenseService - not needed for second instance
        (server as any).conversationSummarizationService, // Phase 5.1: ConversationSummarizationService - reuse from main instance
        (server as any).conversationContextRetrievalService, // Phase 5.1: ConversationContextRetrievalService - reuse from main instance
        (server as any).contextCacheService, // Phase 5.2: ContextCacheService - reuse from main instance
        (server as any).riskEvaluationService // Phase 5.3: RiskEvaluationService - reuse from main instance
      );

      // Set ACLService on InsightService for ProjectContextService permission checks
      const aclServiceForSecondInsight = (server as any).aclService;
      if (aclServiceForSecondInsight && insightService) {
        insightService.setACLService(aclServiceForSecondInsight);
      }

      // Get authenticate decorator from server to pass to insights routes
      const authenticateDecorator = (server as any).authenticate;
      
      if (!authenticateDecorator) {
        server.log.error('❌ Cannot register AI Insights routes (fallback) - authenticate decorator missing');
        throw new Error('Authenticate decorator is required for AI Insights routes');
      }
      
      if (!insightService) {
        server.log.error('❌ Cannot register AI Insights routes (fallback) - insightService missing');
        throw new Error('InsightService is required for AI Insights routes');
      }
      
      if (!conversationService) {
        server.log.error('❌ Cannot register AI Insights routes (fallback) - conversationService missing');
        throw new Error('ConversationService is required for AI Insights routes');
      }
      
      server.log.info({
        hasInsightService: !!insightService,
        hasConversationService: !!conversationService,
        hasContextTemplateService: !!contextTemplateService,
        hasAuthenticateDecorator: !!authenticateDecorator,
      }, 'Registering AI Insights routes (fallback without cache) with services:');
      
      await server.register(insightsRoutes, {
        prefix: '/api/v1',
        insightService,
        conversationService,
        contextTemplateService,
        entityResolutionService,
        contextAwareQueryParserService,
        conversationRealtimeService,
        authenticate: authenticateDecorator, // Pass authenticate decorator explicitly
        tokenValidationCache: (server as any).tokenValidationCache, // Also pass cache
      });
      server.log.info('✅ AI Insights routes registered (without cache)');
      
      // Verify route registration
      const routes = server.printRoutes();
      const hasConversationsRoute = routes.includes('/api/v1/insights/conversations') || 
                                   routes.includes('GET /api/v1/insights/conversations') ||
                                   routes.includes('POST /api/v1/insights/conversations');
      const hasChatRoute = routes.includes('/api/v1/insights/chat') || 
                          routes.includes('POST /api/v1/insights/chat');
      server.log.info(`Route verification (fallback): /api/v1/insights/conversations ${hasConversationsRoute ? '✅ found' : '❌ not found'}`);
      server.log.info(`Route verification (fallback): /api/v1/insights/chat ${hasChatRoute ? '✅ found' : '❌ not found'}`);
      if (!hasConversationsRoute || !hasChatRoute) {
        server.log.warn({ routes: routes.split('\n').filter(line => line.includes('insights')).slice(0, 30) }, 'Available routes containing "insights"');
        server.log.warn({ routes: routes.split('\n').filter(line => line.includes('chat')).slice(0, 10) }, 'Available routes containing "chat"');
      }
    } catch (insightErr) {
      server.log.warn({ err: insightErr }, '⚠️ AI Insights routes failed to register (fallback without cache)');
      tracker.record('AI Insights', false, { 
        prefix: '/api/v1',
        reason: insightErr instanceof Error ? insightErr.message : 'Registration failed',
        dependencies: ['insightService', 'conversationService', 'AzureOpenAI']
      });
    }
  }

  // ACL, Revisions, Vector Search, and Embedding routes are now registered via registerDataRoutes above

  // Cache Admin API routes (monitoring and warming)
  const cosmosContainer = (server as any).cosmosContainer;
  const shardCache = (server as any).shardCache;
  const aclCache = (server as any).aclCache;
  const vectorSearchCache = (server as any).vectorSearchCache;
  const tokenValidationCache = (server as any).tokenValidationCache;

  if (cosmosContainer && redis) {
    await registerCacheAdminRoutes(server, {
      cosmosContainer,
      redisClient: redis,
      monitoring,
      shardCache,
      aclCache,
      vectorSearchCache,
      tokenValidationCache,
    });
    server.log.info('✅ Cache admin routes registered (with monitoring and warming)');
  } else {
    server.log.warn('⚠️  Cache admin routes not registered - Cosmos DB or Redis not available');
  }

  // Dashboard routes (use monitoring from server)
  try {
    await server.register(dashboardRoutes, { prefix: '/api/v1' });
    server.log.info('✅ Dashboard routes registered');
    tracker.record('Dashboards', true, { 
      prefix: '/api/v1',
      dependencies: ['CosmosDB']
    });
  } catch (err) {
    server.log.warn({ err }, '⚠️ Dashboard routes not registered');
    tracker.record('Dashboards', false, { 
      prefix: '/api/v1',
      reason: err instanceof Error ? err.message : 'Registration failed',
      dependencies: ['CosmosDB']
    });
  }

  // Admin web search dashboard routes
  try {
    await server.register(adminDashboardRoutes, { prefix: '/api/v1', monitoring });
    server.log.info('✅ Admin dashboard routes registered');
  } catch (err) {
    server.log.warn({ err }, '⚠️ Admin dashboard routes not registered');
  }

  // AI Insights web/deep search routes
  try {
    await server.register(registerInsightsSearchRoutes, { prefix: '/api/v1', monitoring });
    server.log.info('✅ AI Insights search routes registered');
  } catch (err) {
    server.log.warn({ err }, '⚠️ AI Insights search routes not registered');
  }

  // Option List routes
  try {
    await server.register(optionListRoutes, {
      prefix: '/api/v1/option-lists',
      monitoring,
    });
    server.log.info('✅ Option list routes registered');
  } catch (err) {
    server.log.warn({ err }, '⚠️ Option list routes not registered');
  }

  // Feature Flag routes
  try {
    await server.register(registerFeatureFlagRoutes, {
      prefix: '/api/v1/feature-flags',
      monitoring,
    });
    server.log.info('✅ Feature flag routes registered');
    tracker.record('Feature Flags', true, {
      prefix: '/api/v1',
      dependencies: ['FeatureFlagService', 'CosmosDB']
    });
  } catch (err) {
    server.log.warn({ err }, '⚠️ Feature flag routes not registered');
    tracker.record('Feature Flags', false, {
      prefix: '/api/v1',
      reason: err instanceof Error ? err.message : 'Registration failed',
      dependencies: ['FeatureFlagService', 'CosmosDB']
    });
  }

  // Adaptive Learning routes (transparency dashboard)
  try {
    await server.register(registerAdaptiveLearningRoutes, {
      prefix: '/api/v1',
      monitoring,
    });

    // Register CAIS Services routes (all 22 new services)
    await server.register(registerCAISServicesRoutes, {
      prefix: '/api/v1',
      monitoring,
    });
    server.log.info('✅ CAIS Services routes registered');
    server.log.info('✅ Adaptive Learning routes registered');
    tracker.record('Adaptive Learning', true, {
      prefix: '/api/v1',
      dependencies: ['AdaptiveWeightLearningService', 'AdaptiveLearningValidationService', 'AdaptiveLearningRolloutService']
    });
  } catch (err) {
    server.log.warn({ err }, '⚠️ Adaptive Learning routes not registered');
    tracker.record('Adaptive Learning', false, {
      prefix: '/api/v1',
      reason: err instanceof Error ? err.message : 'Registration failed',
      dependencies: ['AdaptiveWeightLearningService']
    });
  }

  // Webhook routes (outgoing - require event service)
  const webhookDeliveryService = (server as any).webhookDeliveryService;
  if (webhookDeliveryService) {
    try {
      await server.register(webhookRoutes, {
        prefix: '/api/v1/webhooks',
        monitoring,
        deliveryService: webhookDeliveryService,
      });
      server.log.info('✅ Outgoing webhook routes registered');
    } catch (err) {
      server.log.warn({ err }, '⚠️ Outgoing webhook routes not registered');
    }
  } else {
    server.log.warn('⚠️ Outgoing webhook routes not registered - WebhookDeliveryService not available');
  }

  // Incoming webhook receiver routes (require WebhookManagementService)
  const webhookManagementService = (server as any).webhookManagementService;
  if (webhookManagementService) {
    try {
      // Register incoming webhook routes (no prefix, public endpoints)
      registerWebhookRoutes(server, webhookManagementService);
      server.log.info('✅ Incoming webhook receiver routes registered');
    } catch (err) {
      server.log.warn({ err }, '⚠️ Incoming webhook receiver routes not registered');
    }
  } else {
    server.log.warn('⚠️ Incoming webhook receiver routes not registered - WebhookManagementService not available');
  }

  // Schema Migration routes
  if (cacheService && cacheSubscriber) {
    try {
      const shardCacheService = (server as any).shardCache;
      const shardRepository = new ShardRepository(monitoring, shardCacheService);
      const shardTypeRepository = new ShardTypeRepository(monitoring);

      await server.register(schemaMigrationRoutes, {
        prefix: '/api/v1/schema-migrations',
        monitoring,
        shardRepository,
        shardTypeRepository,
      });
      server.log.info('✅ Schema migration routes registered');
    } catch (err) {
      server.log.warn({ err }, '⚠️ Schema migration routes not registered');
    }
  } else {
    server.log.warn('⚠️ Schema migration routes not registered - cache services not available');
  }

  // Widget Catalog routes
  try {
    await server.register(widgetCatalogRoutes, {
      prefix: '/api/v1',
      monitoring,
    });
    server.log.info('✅ Widget catalog routes registered');
  } catch (err) {
    server.log.warn({ err }, '⚠️ Widget catalog routes not registered');
  }

  // Integration Catalog Routes (Super Admin)
  try {
    const catalogCosmosClient = (server as any).cosmos || (server as any).cosmosClient;
    const catalogCosmosDatabase = (server as any).cosmosDatabase;
    if (catalogCosmosClient || catalogCosmosDatabase) {
      // Use cosmosClient if available, otherwise try to get from database
      const cosmosClient = catalogCosmosClient || (catalogCosmosDatabase?.client);
      if (cosmosClient) {
        const catalogRepository = new IntegrationCatalogRepository(
          cosmosClient,
          'castiel',
          'integration_catalog',
          'integration_visibility'
        );
        const visibilityService = new IntegrationVisibilityService(catalogRepository);
        const catalogService = new IntegrationCatalogService(catalogRepository);
        const catalogController = new SuperAdminIntegrationCatalogController(catalogService, catalogRepository);

        await server.register(async (saServer) => {
          await registerSuperAdminIntegrationCatalogRoutes(saServer, catalogController);
        }, { prefix: '/api/v1' });
        server.log.info('✅ Integration catalog routes registered');
      } else {
        server.log.debug('ℹ️ Integration catalog routes not registered - Cosmos DB client not available');
      }
    } else {
      server.log.debug('ℹ️ Integration catalog routes not registered - Cosmos DB unavailable');
    }
  } catch (err) {
    server.log.warn({ err }, '⚠️ Integration catalog routes failed to register');
  }

  // Integration Routes (New Container Architecture)
  const integrationProviderController = (server as any).integrationProviderController;
  const integrationController = (server as any).integrationController;
  const integrationSearchController = (server as any).integrationSearchController;
  if (integrationProviderController && integrationController && integrationSearchController) {
    try {
      await registerIntegrationRoutes(server);
      server.log.info('✅ Integration routes registered');
      
      // Register sync task routes (requires syncTaskService)
      const syncTaskService = (server as any).syncTaskService;
      if (syncTaskService) {
        try {
          await registerSyncTaskRoutes(server);
          server.log.info('✅ Sync task routes registered');
          tracker.record('Sync Tasks', true, {
            prefix: '/api/v1',
            dependencies: ['syncTaskService', 'CosmosDB']
          });
        } catch (err) {
          server.log.warn({ err }, '⚠️ Sync task routes failed to register');
          tracker.record('Sync Tasks', false, {
            prefix: '/api/v1',
            reason: err instanceof Error ? err.message : 'Registration failed',
            dependencies: ['syncTaskService']
          });
        }
      } else {
        server.log.debug('ℹ️ Sync task routes not registered - syncTaskService missing');
        tracker.record('Sync Tasks', false, {
          prefix: '/api/v1',
          reason: 'syncTaskService missing',
          dependencies: ['syncTaskService']
        });
      }
    } catch (err) {
      server.log.warn({ err }, '⚠️ Integration routes failed to register');
    }
  } else {
    const missing = [];
    if (!integrationProviderController) {missing.push('integrationProviderController');}
    if (!integrationController) {missing.push('integrationController');}
    if (!integrationSearchController) {missing.push('integrationSearchController');}
    server.log.debug(`ℹ️ Integration routes not registered - ${missing.join(', ')} missing (requires Cosmos DB for initialization)`);
  }

  // Conversion Schema Routes
  try {
    await registerConversionSchemaRoutes(server);
    tracker.record('Conversion Schemas', true, {
      prefix: '/api/v1',
      dependencies: ['CosmosDB', 'monitoring']
    });
  } catch (err) {
    server.log.warn({ err }, '⚠️ Conversion schema routes failed to register');
    tracker.record('Conversion Schemas', false, {
      prefix: '/api/v1',
      reason: err instanceof Error ? err.message : 'Registration failed',
      dependencies: ['CosmosDB', 'monitoring']
    });
  }

  // Email Template Routes (Super Admin)
  if ((server as any).emailTemplateController) {
    try {
      await registerEmailTemplateRoutes(server);
      server.log.info('✅ Email template routes registered');
    } catch (err) {
      server.log.warn({ err }, '⚠️ Email template routes failed to register');
    }
  } else {
    server.log.warn('⚠️ Email template routes not registered - controller missing');
  }

  // Register content routes using the new registration module
  // This includes: documents, collections, bulk documents, content generation, memory, and onboarding
  try {
    const { registerContentRoutes } = await import('./registration/content-routes.registration.js');
    await registerContentRoutes(server, {
        monitoring,
      redis,
      cosmosClient: (server as any).cosmos || (server as any).cosmosClient,
      cosmosDatabase: (server as any).cosmosDatabase,
      insightService: (server as any).insightService,
      shardRepository: (server as any).shardRepository,
      shardTypeRepository: (server as any).shardTypeRepository,
      contextTemplateService: (server as any).contextTemplateService,
      conversionService: (server as any).conversionService,
      queueService: (server as any).queueService,
      unifiedAIClient: (server as any).unifiedAIClient,
      aiConnectionService: (server as any).aiConnectionService,
      aiConfigService: (server as any).aiConfigService,
      integrationService: (server as any).integrationService,
      integrationConnectionService: (server as any).integrationConnectionService,
      emailService: (server as any).emailService,
      contentGenerationEnabled: config.contentGeneration.enabled,
    });
    server.log.info('✅ Content routes registered');
    } catch (err) {
    server.log.error({ err }, '❌ Content routes registration failed');
    // Don't throw - allow other routes to continue registering
  }

  // Vector Search UI routes (search history, saved searches, autocomplete)
  const vectorSearchUICosmosClient = (server as any).cosmos || (server as any).cosmosClient;
  const vectorSearchUICosmosDatabase = (server as any).cosmosDatabase;
  if (vectorSearchUICosmosClient || vectorSearchUICosmosDatabase) {
    try {
      let database;
      if (vectorSearchUICosmosDatabase) {
        database = vectorSearchUICosmosDatabase;
      } else if (vectorSearchUICosmosClient) {
        const { config } = await import('../config/env.js');
        database = vectorSearchUICosmosClient.database(config.cosmosDb.databaseId);
      }
      const redis = (server as any).redisClient;
      
      if (database) {
        const vectorSearchUIService = new VectorSearchUIService(
          database,
          redis,
          monitoring
        );
        const vectorSearchUIController = new VectorSearchUIController(vectorSearchUIService);
        await registerVectorSearchUIRoutes(server, vectorSearchUIController);
        server.log.info('✅ Vector Search UI routes registered');
      } else {
        server.log.debug('ℹ️ Vector Search UI routes not registered - Database not available');
      }
    } catch (err) {
      server.log.warn({ err }, '⚠️ Vector Search UI routes failed to register');
    }
  } else {
    server.log.debug('ℹ️ Vector Search UI routes not registered - Cosmos DB not available');
  }

  // Search Analytics routes
  const searchAnalyticsCosmosClient = (server as any).cosmos || (server as any).cosmosClient;
  const searchAnalyticsCosmosDatabase = (server as any).cosmosDatabase;
  if (searchAnalyticsCosmosClient || searchAnalyticsCosmosDatabase) {
    try {
      let database;
      if (searchAnalyticsCosmosDatabase) {
        database = searchAnalyticsCosmosDatabase;
      } else if (searchAnalyticsCosmosClient) {
        const { config } = await import('../config/env.js');
        database = searchAnalyticsCosmosClient.database(config.cosmosDb.databaseId);
      }
      const redis = (server as any).redisClient;
      
      if (database) {
        const searchAnalyticsService = new SearchAnalyticsService(
          database,
          redis,
          monitoring
        );
        const searchAnalyticsController = new SearchAnalyticsController(searchAnalyticsService);
        await registerSearchAnalyticsRoutes(server, searchAnalyticsController);
        server.log.info('✅ Search Analytics routes registered');
      } else {
        server.log.debug('ℹ️ Search Analytics routes not registered - Database not available');
      }
    } catch (err) {
      server.log.warn({ err }, '⚠️ Search Analytics routes failed to register');
    }

    // Register API Performance Monitoring routes
    try {
      registerAPIPerformanceRoutes(server);
      server.log.info('✅ API Performance Monitoring routes registered');
    } catch (err) {
      server.log.warn({ err }, '⚠️ API Performance Monitoring routes failed to register');
    }

    // Register Integration Monitoring Admin routes
    try {
      await registerIntegrationMonitoringRoutes(server);
      server.log.info('✅ Integration Monitoring Admin routes registered');
    } catch (err) {
      server.log.warn({ err }, '⚠️ Integration Monitoring Admin routes failed to register');
    }

    // Register Cache Optimization routes
    try {
      registerCacheOptimizationRoutes(server);
      server.log.info('✅ Cache Optimization routes registered');
    } catch (err) {
      server.log.warn({ err }, '⚠️ Cache Optimization routes failed to register');
    }

    // Phase 6.2: Register Feedback Routes
    try {
      const { registerFeedbackRoutes } = await import('./feedback.routes.js');
      await registerFeedbackRoutes(server);
      server.log.info('✅ Feedback routes registered (Phase 6.2)');
    } catch (err) {
      server.log.warn({ err }, '⚠️ Feedback routes registration failed');
    }
  } else {
    server.log.debug('ℹ️ Search Analytics routes not registered - Cosmos DB not available');
  }

  // Project Analytics routes
  try {
    // Try to get ShardRepository from server decoration or create new instance
    const shardRepository = (server as any).shardRepository;
    
    if (!shardRepository) {
      // Try to get from shard routes initialization
      // ShardRepository is created in the shard routes section
      // For now, we'll try to access it from the server or create a minimal one
      server.log.warn('⚠️ Project Analytics routes not registered - ShardRepository not available');
    } else {
      const projectAnalyticsService = new ProjectAnalyticsService(
        shardRepository,
        monitoring
      );
      const projectAnalyticsController = new ProjectAnalyticsController(projectAnalyticsService);
      await registerProjectAnalyticsRoutes(server, projectAnalyticsController);
      server.log.info('✅ Project Analytics routes registered');
    }
  } catch (err) {
    server.log.warn({ err }, '⚠️ Project Analytics routes failed to register');
  }

  // Risk Analysis routes
  try {
    const shardRepository = (server as any).shardRepository;
    const shardTypeRepository = (server as any).shardTypeRepository;
    let relationshipService = (server as any).relationshipService;
    const vectorSearchService = (server as any).vectorSearchService;
    const insightService = (server as any).insightService;

    // Create relationshipService if it doesn't exist
    if (!relationshipService && shardRepository) {
      const { ShardRelationshipService } = await import('../services/shard-relationship.service.js');
      relationshipService = new ShardRelationshipService(
        monitoring,
        shardRepository,
        (server as any).relationshipEvolutionService // Optional: Relationship evolution service
      );
      await relationshipService.initialize();
      server.decorate('relationshipService', relationshipService);
      server.log.info('✅ Created relationshipService for Risk Analysis routes');
    }

    if (!shardRepository || !shardTypeRepository || !relationshipService || !vectorSearchService || !insightService) {
      const missing = [];
      if (!shardRepository) {missing.push('shardRepository');}
      if (!shardTypeRepository) {missing.push('shardTypeRepository');}
      if (!relationshipService) {missing.push('relationshipService');}
      if (!vectorSearchService) {missing.push('vectorSearchService');}
      if (!insightService) {missing.push('insightService');}
      server.log.warn(`⚠️ Risk Analysis routes not registered - missing dependencies: ${missing.join(', ')}`);
    } else {
      // Initialize RevisionRepository
      const revisionRepository = new RevisionRepository(monitoring);

      // Initialize RiskEvaluationService early and store on server for use by ShardsController
      const { RiskCatalogService } = await import('../services/risk-catalog.service.js');
      const { RiskEvaluationService } = await import('../services/risk-evaluation.service.js');
      
      const riskCatalogService = new RiskCatalogService(
        monitoring,
        shardRepository,
        shardTypeRepository
      );

      // Initialize Phase 1 services for risk evaluation
      const { ShardValidationService } = await import('../services/shard-validation.service.js');
      const shardValidationService = new ShardValidationService(monitoring);
      await shardValidationService.initialize();

      const { DataQualityService } = await import('../services/data-quality.service.js');
      const dataQualityService = new DataQualityService(shardValidationService, monitoring);

      const { TrustLevelService } = await import('../services/trust-level.service.js');
      const trustLevelService = new TrustLevelService();

      const { RiskAIValidationService } = await import('../services/risk-ai-validation.service.js');
      const riskAIValidationService = new RiskAIValidationService();

      const { RiskExplainabilityService } = await import('../services/risk-explainability.service.js');
      const riskExplainabilityService = new RiskExplainabilityService();

      // Initialize ComprehensiveAuditTrailService for Phase 2 audit logging
      const { ComprehensiveAuditTrailService } = await import('../services/comprehensive-audit-trail.service.js');
      const { CosmosDBService } = await import('@castiel/api-core');
      const cosmosDB = new CosmosDBService();
      const comprehensiveAuditTrailService = new ComprehensiveAuditTrailService(cosmosDB, monitoring);

      const riskEvaluationService = new RiskEvaluationService(
        monitoring,
        shardRepository,
        shardTypeRepository,
        relationshipService,
        riskCatalogService,
        vectorSearchService,
        insightService,
        queueService || undefined, // Pass Queue Service (BullMQ) if available
        dataQualityService,
        trustLevelService,
        riskAIValidationService,
        riskExplainabilityService,
        comprehensiveAuditTrailService,
        (server as any).adaptiveWeightLearningService, // Phase 1: Adaptive weight learning
        (server as any).outcomeCollectorService, // Phase 1: Outcome collector
        (server as any).performanceTrackerService, // Phase 1: Performance tracker
        (server as any).conflictResolutionLearningService // Phase 1: Conflict resolution learning
      );

      // Store on server for use by ShardsController (for automatic risk evaluation)
      server.decorate('riskEvaluationService', riskEvaluationService);
      server.log.info('✅ RiskEvaluationService initialized and stored on server');
      
      // Phase 5.3: Register Risk Analysis Tools with AIToolExecutorService if available
      try {
        const toolExecutor = (server as any).toolExecutor;
        if (toolExecutor) {
          const { RiskAnalysisToolService } = await import('../services/risk-analysis-tool.service.js');
          
          const riskAnalysisToolService = new RiskAnalysisToolService({
            riskEvaluationService,
            riskCatalogService,
            shardRepository,
            monitoring,
          });
          
          // Register all risk analysis tools
          const tools = riskAnalysisToolService.getTools();
          for (const tool of tools) {
            toolExecutor.registerTool(tool);
          }
          
          server.log.info(`✅ Risk Analysis Tools registered with AI Tool Executor (${tools.length} tools) - Phase 5.3`);
        }
      } catch (err) {
        server.log.debug({ err }, 'Risk Analysis Tools registration skipped - AIToolExecutorService not available');
      }

      await registerRiskAnalysisRoutes(server, {
        monitoring,
        shardRepository,
        shardTypeRepository,
        revisionRepository,
        relationshipService,
        vectorSearchService,
        insightService,
        queueService: queueService || undefined, // Pass Queue Service (BullMQ) if available
        roleManagementService: roleManagementService || undefined, // Pass role management service for permission checking
      });
      server.log.info('✅ Risk Analysis routes registered');

      // Register ML routes if Cosmos DB and required services are available
      const mlCosmosClient = server.cosmos || (server as any).cosmosClient;
      const mlCosmosDatabase = server.cosmosDatabase;
      if (mlCosmosDatabase && mlCosmosClient) {
        try {
          const { initializeMLServices } = await import('../services/initialization/ml-services.init.js');
          const azureMLWorkspaceUrl = process.env.AZURE_ML_WORKSPACE_URL || '';
          const azureMLApiKey = process.env.AZURE_ML_API_KEY;

          if (azureMLWorkspaceUrl) {
            const mlServices = await initializeMLServices({
              monitoring,
              shardRepository,
              redis,
              cosmosClient: mlCosmosClient,
              database: mlCosmosDatabase,
              azureMLWorkspaceUrl,
              azureMLApiKey,
            });

            await registerMLRoutes(server, {
              monitoring,
              featureStoreService: mlServices.featureStoreService,
              modelService: mlServices.modelService,
              trainingService: mlServices.trainingService,
              evaluationService: mlServices.evaluationService,
              cosmosDatabase: mlCosmosDatabase,
            });
            server.log.info('✅ ML routes registered');
            serviceHealthTracker.trackSuccess('ML Routes', 'route-registration', ['Cosmos DB', 'Redis']);

            // Update RiskEvaluationService with ML services if available
            const riskEvaluationService = (server as any).riskEvaluationService;
            if (riskEvaluationService && typeof riskEvaluationService.setMLServices === 'function') {
              riskEvaluationService.setMLServices(
                mlServices.featureStoreService,
                mlServices.modelService
              );
              server.log.info('✅ RiskEvaluationService updated with ML services');
            }

            // Update RevenueForecastService with ML services if available
            const revenueForecastService = (server as any).revenueForecastService;
            if (revenueForecastService && typeof revenueForecastService.setMLServices === 'function') {
              revenueForecastService.setMLServices(
                mlServices.featureStoreService,
                mlServices.modelService
              );
              server.log.info('✅ RevenueForecastService updated with ML services');
            }
          } else {
            server.log.warn('⚠️ ML routes skipped: AZURE_ML_WORKSPACE_URL not configured');
          }
        } catch (err) {
          server.log.warn({ err }, '⚠️ ML routes registration failed');
          serviceHealthTracker.trackFailure({
            serviceName: 'ML Routes',
            operation: 'route-registration',
            error: err,
            criticality: 'optional',
            dependencies: ['Cosmos DB', 'Redis', 'Azure ML'],
            errorCode: extractErrorCode(err),
          });
        }
      }

      await registerQuotaRoutes(server, {
        monitoring,
        shardRepository,
        shardTypeRepository,
        relationshipService,
        vectorSearchService,
        insightService,
        roleManagementService: roleManagementService || undefined, // Pass role management service for permission checking
      });
      server.log.info('✅ Quota routes registered');

      // Register team routes
      const { AuditLogService } = await import('../services/audit/audit-log.service.js');
      const { config } = await import('../config/env.js');
      const auditLogsContainer = cosmosDatabase.container('AuditLogs');
      const auditLogService = new AuditLogService(auditLogsContainer, {
        monitoring,
        environment: config.nodeEnv,
        serviceName: 'teams',
      });
      const { TeamService } = await import('@castiel/api-core');
      const teamService = new TeamService(
        monitoring,
        shardRepository,
        shardTypeRepository,
        relationshipService,
        auditLogService
      );
      await registerTeamRoutes(server, {
        monitoring,
        shardRepository,
        shardTypeRepository,
        relationshipService,
        auditLogService,
      });
      server.log.info('✅ Team routes registered');

      // Create SSOTeamSyncService after IntegrationService is available
      // This will be decorated on server for SSO controllers to use
      const integrationService = (server as any).integrationService;
      const adapterManager = (server as any).adapterManagerService;
      
      if (integrationService && adapterManager && teamService) {
        try {
          const { IntegrationExternalUserIdService } = await import('../services/integration-external-user-id.service.js');
          const cosmosDbModule = await import('../services/auth/cosmos-db.service.js');
          const CosmosDbClient = cosmosDbModule.CosmosDbClient;
          type CosmosDbClientType = InstanceType<typeof CosmosDbClient>;
          const cosmosClient = (server as any).cosmosClient as CosmosDbClientType | undefined;
          const userContainer = cosmosClient?.getUsersContainer();
          
          if (userContainer) {
            const externalUserIdService = new IntegrationExternalUserIdService({
              userContainer,
              monitoring,
              adapterManager,
              integrationRepository: (server as any).integrationRepository,
              auditLogService,
            });

            const { SSOTeamSyncService } = await import('../services/sso-team-sync.service.js');
            const ssoTeamSyncService = new SSOTeamSyncService(
              monitoring,
              teamService,
              integrationService,
              adapterManager,
              externalUserIdService
            );
            server.decorate('ssoTeamSyncService', ssoTeamSyncService);
            server.log.info('✅ SSO Team Sync Service initialized');
          }
        } catch (error: unknown) {
          server.log.warn({ error: error instanceof Error ? error : new Error(String(error)) }, '⚠️ SSO Team Sync Service not initialized');
        }
      }

      // Register manager routes
      const { registerManagerRoutes } = await import('./manager.routes.js');
      await registerManagerRoutes(server, {
        monitoring,
        shardRepository,
        shardTypeRepository,
        relationshipService,
        vectorSearchService,
        insightService,
      });
      server.log.info('✅ Manager routes registered');

      await registerSimulationRoutes(server, {
        monitoring,
        shardRepository,
        shardTypeRepository,
        relationshipService,
        vectorSearchService,
        insightService,
        roleManagementService: roleManagementService || undefined, // Pass role management service for permission checking
      });
      server.log.info('✅ Simulation routes registered');

      await registerBenchmarksRoutes(server, {
        monitoring,
        shardRepository,
        shardTypeRepository,
        relationshipService,
        roleManagementService: roleManagementService || undefined, // Pass role management service for permission checking
      });
      server.log.info('✅ Benchmarks routes registered');

      // Register Opportunity routes
      // Wrap in try-catch to ensure routes are registered even if some dependencies fail
      try {
        // Reuse RiskEvaluationService from server if available (initialized in risk analysis routes)
        let riskEvaluationService = (server as any).riskEvaluationService;
        
        // If not available, initialize it (shouldn't happen if risk analysis routes registered successfully)
        if (!riskEvaluationService) {
          const { RiskCatalogService } = await import('../services/risk-catalog.service.js');
          const { RiskEvaluationService } = await import('../services/risk-evaluation.service.js');
          
          const riskCatalogService = new RiskCatalogService(
            monitoring,
            shardRepository,
            shardTypeRepository
          );

          // Initialize Phase 1 services for risk evaluation
          const { ShardValidationService } = await import('../services/shard-validation.service.js');
          const shardValidationService = new ShardValidationService(monitoring);
          await shardValidationService.initialize();

          const { DataQualityService } = await import('../services/data-quality.service.js');
          const dataQualityService = new DataQualityService(shardValidationService, monitoring);

          const { TrustLevelService } = await import('../services/trust-level.service.js');
          const trustLevelService = new TrustLevelService();

          const { RiskAIValidationService } = await import('../services/risk-ai-validation.service.js');
          const riskAIValidationService = new RiskAIValidationService();

          const { RiskExplainabilityService } = await import('../services/risk-explainability.service.js');
          const riskExplainabilityService = new RiskExplainabilityService();

          // Initialize ComprehensiveAuditTrailService for Phase 2 audit logging
          const { ComprehensiveAuditTrailService } = await import('../services/comprehensive-audit-trail.service.js');
          const { CosmosDBService } = await import('@castiel/api-core');
          const cosmosDB = new CosmosDBService();
          const comprehensiveAuditTrailService = new ComprehensiveAuditTrailService(cosmosDB, monitoring);

          riskEvaluationService = new RiskEvaluationService(
            monitoring,
            shardRepository,
            shardTypeRepository,
            relationshipService,
            riskCatalogService,
            vectorSearchService,
            insightService,
            queueService || undefined,
            dataQualityService,
            trustLevelService,
            riskAIValidationService,
            riskExplainabilityService,
            comprehensiveAuditTrailService,
            (server as any).adaptiveWeightLearningService, // Phase 1: Adaptive weight learning
            (server as any).outcomeCollectorService, // Phase 1: Outcome collector
            (server as any).performanceTrackerService, // Phase 1: Performance tracker
            (server as any).conflictResolutionLearningService // Phase 1: Conflict resolution learning
          );
          
          // Store on server for future use
          server.decorate('riskEvaluationService', riskEvaluationService);
        }

        // Initialize RevenueAtRiskService for pipeline services
        const { RevenueAtRiskService } = await import('../services/revenue-at-risk.service.js');
        revenueAtRiskService = new RevenueAtRiskService(
          monitoring,
          shardRepository,
          shardTypeRepository,
          riskEvaluationService
        );

        const { OpportunityService } = await import('../services/opportunity.service.js');
        opportunityService = new OpportunityService(
          monitoring,
          shardRepository,
          shardTypeRepository,
          relationshipService,
          riskEvaluationService,
          teamService // Add TeamService for team-based queries
        );

        await registerOpportunityRoutes(server, {
          opportunityService,
        });
        server.log.info('✅ Opportunity routes registered');
      } catch (oppErr) {
        server.log.error({ err: oppErr }, '❌ Opportunity routes failed to register');
        // Don't throw - allow other routes to continue registering
      }

      // Register Pipeline routes
      const { PipelineViewService } = await import('../services/pipeline-view.service.js');
      const { PipelineAnalyticsService } = await import('../services/pipeline-analytics.service.js');
      const { PipelineSummaryService } = await import('../services/pipeline-summary.service.js');
      const { RevenueForecastService } = await import('../services/revenue-forecast.service.js');

      const pipelineViewService = new PipelineViewService(
        monitoring,
        opportunityService,
        revenueAtRiskService
      );

      const pipelineAnalyticsService = new PipelineAnalyticsService(
        monitoring,
        opportunityService,
        revenueAtRiskService,
        (server as any).pipelineHealthService // Optional: Pipeline health service
      );

      const pipelineSummaryService = new PipelineSummaryService(
        monitoring,
        pipelineAnalyticsService,
        revenueAtRiskService
      );

      const revenueForecastService = new RevenueForecastService(
        monitoring,
        opportunityService,
        revenueAtRiskService,
        (server as any).forecastDecompositionService, // Optional: Forecast decomposition
        (server as any).consensusForecastingService, // Optional: Consensus forecasting
        (server as any).forecastCommitmentService, // Optional: Forecast commitment
        undefined, // ML FeatureStoreService - will be injected later if available
        undefined // ML ModelService - will be injected later if available
      );

      // Store on server for later ML service injection
      server.decorate('revenueForecastService', revenueForecastService);

      await registerPipelineRoutes(server, {
        pipelineViewService,
        pipelineAnalyticsService,
        pipelineSummaryService,
        revenueForecastService,
      });
      server.log.info('✅ Pipeline routes registered');
    }
  } catch (err) {
    server.log.warn({ err }, '⚠️ Risk Analysis routes failed to register');
  }

  // Register Opportunity routes as fallback if not registered above
  // This ensures routes are available even if some dependencies are missing
  try {
    const shardRepository = (server as any).shardRepository;
    const shardTypeRepository = (server as any).shardTypeRepository;
    const relationshipService = (server as any).relationshipService || (server as any).shardRelationshipService;
    const vectorSearchService = (server as any).vectorSearchService;
    const insightService = (server as any).insightService;
    const teamService = (server as any).teamService;

    // Only attempt fallback registration if we have the minimum required dependencies
    if (shardRepository && shardTypeRepository && relationshipService) {
      server.log.info('Attempting to register Opportunity routes (fallback)...');
      
      // Initialize minimal services for opportunity routes
      const { RiskCatalogService } = await import('../services/risk-catalog.service.js');
      const { RiskEvaluationService } = await import('../services/risk-evaluation.service.js');
      
      const riskCatalogService = new RiskCatalogService(
        monitoring,
        shardRepository,
        shardTypeRepository
      );

      // Create risk evaluation service (requires vectorSearchService and insightService)
      // If they're missing, we'll still try to register but some features may not work
      let riskEvaluationService: any = null;
      if (vectorSearchService && insightService) {
        // Initialize Phase 1 services for risk evaluation
        const { ShardValidationService } = await import('../services/shard-validation.service.js');
        const shardValidationService = new ShardValidationService(monitoring);
        await shardValidationService.initialize();

        const { DataQualityService } = await import('../services/data-quality.service.js');
        const dataQualityService = new DataQualityService(shardValidationService, monitoring);

        const { TrustLevelService } = await import('../services/trust-level.service.js');
        const trustLevelService = new TrustLevelService();

        const { RiskAIValidationService } = await import('../services/risk-ai-validation.service.js');
        const riskAIValidationService = new RiskAIValidationService();

        const { RiskExplainabilityService } = await import('../services/risk-explainability.service.js');
        const riskExplainabilityService = new RiskExplainabilityService();

        // Initialize ComprehensiveAuditTrailService for Phase 2 audit logging
        const { ComprehensiveAuditTrailService } = await import('../services/comprehensive-audit-trail.service.js');
        const { CosmosDBService } = await import('@castiel/api-core');
        const cosmosDB = new CosmosDBService();
        const comprehensiveAuditTrailService = new ComprehensiveAuditTrailService(cosmosDB, monitoring);

        riskEvaluationService = new RiskEvaluationService(
          monitoring,
          shardRepository,
          shardTypeRepository,
          relationshipService,
          riskCatalogService,
          vectorSearchService,
          insightService,
          undefined, // queueService
          dataQualityService,
          trustLevelService,
          riskAIValidationService,
          riskExplainabilityService,
          comprehensiveAuditTrailService,
          (server as any).adaptiveWeightLearningService, // Phase 1: Adaptive weight learning
          (server as any).outcomeCollectorService, // Phase 1: Outcome collector
          (server as any).performanceTrackerService, // Phase 1: Performance tracker
          (server as any).conflictResolutionLearningService // Phase 1: Conflict resolution learning
        );
      } else {
        server.log.warn('⚠️ RiskEvaluationService not available - opportunity routes may have limited functionality');
      }

      // Only register if we have riskEvaluationService (required by OpportunityService)
      if (riskEvaluationService) {
        const { OpportunityService } = await import('../services/opportunity.service.js');
        const opportunityService = new OpportunityService(
          monitoring,
          shardRepository,
          shardTypeRepository,
          relationshipService,
          riskEvaluationService,
          teamService || undefined
        );

        await registerOpportunityRoutes(server, {
          opportunityService,
        });
        server.log.info('✅ Opportunity routes registered (fallback)');
      } else {
        server.log.warn('⚠️ Opportunity routes not registered (fallback) - missing vectorSearchService or insightService');
      }
    }
  } catch (fallbackErr) {
    server.log.warn({ err: fallbackErr }, '⚠️ Opportunity routes fallback registration failed');
  }

  // SCIM Provisioning routes
  try {
    const cosmosClient = (server as any).cosmosClient || (server as any).cosmosDbClient;
    const userService = (server as any).userService;
    const userManagementService = (server as any).userManagementService;

    if (cosmosClient && userService && redis) {
      // Get containers using CosmosDbClient's getClient() and getDatabase() methods
      const rawClient = cosmosClient.getClient();
      const database = cosmosClient.getDatabase();
      const configContainer = database.container('tenant-configs');
      const activityContainer = database.container('scim-activity-logs');
      const userContainer = cosmosClient.getUsersContainer();

      // Initialize SCIM service
      const scimService = new SCIMService(
        configContainer,
        activityContainer,
        userContainer,
        userService,
        userManagementService || undefined,
        redis,
        monitoring
      );

      // Register SCIM 2.0 routes
      await registerSCIMRoutes(server, scimService);
      server.log.info('✅ SCIM routes registered');

      // Register tenant provisioning management routes
      await registerTenantProvisioningRoutes(server, scimService);
      server.log.info('✅ Tenant provisioning routes registered');
    } else {
      const missing = [];
      if (!cosmosClient) {missing.push('cosmosClient');}
      if (!userService) {missing.push('userService');}
      if (!redis) {missing.push('redis');}
      server.log.warn(`⚠️ SCIM routes not registered - missing dependencies: ${missing.join(', ')}`);
    }
  } catch (err) {
    server.log.warn({ err }, '⚠️ SCIM routes failed to register');
  }

  // OAuth2 Client Management routes
  try {
    const { registerOAuth2ClientRoutes } = await import('./oauth2-client.routes.js');
    await registerOAuth2ClientRoutes(server);
  } catch (err) {
    server.log.warn({ err }, '⚠️ OAuth2 client routes failed to register');
  }

  // Multi-Modal Assets routes
  try {
    // Try multiple ways to get the Cosmos DB client
    // First try the CosmosDbClient wrapper (has getClient() method)
    const cosmosClient = (server as any).cosmos || (server as any).cosmosClient || (server as any).cosmosDbClient;
    
    // If we got a CosmosDbClient wrapper, extract the raw client
    // Otherwise, if we got a raw CosmosClient, use it directly
    let rawClient: any = null;
    if (cosmosClient) {
      // Check if it's a CosmosDbClient wrapper (has getClient method)
      if (typeof cosmosClient.getClient === 'function') {
        rawClient = cosmosClient.getClient();
      } else if (cosmosClient.database && cosmosClient.client) {
        // It's a CosmosClient from @azure/cosmos
        rawClient = cosmosClient;
      } else {
        // Try to get from cosmosDatabase
        const cosmosDatabase = (server as any).cosmosDatabase;
        if (cosmosDatabase?.client) {
          rawClient = cosmosDatabase.client;
        } else {
          rawClient = cosmosClient;
        }
      }
    }
    
    const documentController = (server as any).documentController;

    // Get blob storage service from document controller if available
    const blobStorageService = documentController?.blobStorageService;

    // Log what we found for debugging
    server.log.info({
      hasCosmosClient: !!cosmosClient,
      hasRawClient: !!rawClient,
      hasDocumentController: !!documentController,
      hasBlobStorageService: !!blobStorageService,
      cosmosClientType: cosmosClient ? (typeof cosmosClient.getClient === 'function' ? 'CosmosDbClient wrapper' : 'CosmosClient') : 'null',
      serverProperties: {
        hasCosmos: !!(server as any).cosmos,
        hasCosmosClient: !!(server as any).cosmosClient,
        hasCosmosDbClient: !!(server as any).cosmosDbClient,
        hasCosmosDatabase: !!(server as any).cosmosDatabase,
      },
    }, 'Multi-modal assets initialization check:');

    if (rawClient && blobStorageService) {

      // Initialize Image Analysis Service if Azure OpenAI is configured
      let imageAnalysisService: any = undefined;
      try {
        const { ImageAnalysisService } = await import('../services/multimodal/image-analysis.service.js');
        const azureOpenAIConfig = config.ai?.azureOpenAI;
        
        if (azureOpenAIConfig?.endpoint && azureOpenAIConfig?.apiKey) {
          imageAnalysisService = new ImageAnalysisService(
            {
              endpoint: azureOpenAIConfig.endpoint,
              apiKey: azureOpenAIConfig.apiKey,
              deploymentName: process.env.AZURE_OPENAI_VISION_DEPLOYMENT_NAME || 'gpt-4-vision',
              apiVersion: azureOpenAIConfig.apiVersion || '2024-02-15-preview',
            },
            monitoring
          );
          server.log.info('✅ Image Analysis service initialized');
        } else {
          server.log.warn('⚠️ Image Analysis service not initialized - Azure OpenAI Vision not configured');
        }
      } catch (err) {
        server.log.warn({ err }, '⚠️ Image Analysis service initialization failed');
      }

      // Initialize Audio Transcription Service if Azure OpenAI is configured
      let audioTranscriptionService: any = undefined;
      try {
        const { AudioTranscriptionService } = await import('../services/multimodal/audio-transcription.service.js');
        const azureOpenAIConfig = config.ai?.azureOpenAI;
        
        if (azureOpenAIConfig?.endpoint && azureOpenAIConfig?.apiKey) {
          audioTranscriptionService = new AudioTranscriptionService(
            {
              endpoint: azureOpenAIConfig.endpoint,
              apiKey: azureOpenAIConfig.apiKey,
              deploymentName: process.env.AZURE_OPENAI_WHISPER_DEPLOYMENT_NAME || 'whisper-1',
              apiVersion: azureOpenAIConfig.apiVersion || '2024-02-15-preview',
            },
            monitoring
          );
          server.log.info('✅ Audio Transcription service initialized');
        } else {
          server.log.warn('⚠️ Audio Transcription service not initialized - Azure OpenAI Whisper not configured');
        }
      } catch (err) {
        server.log.warn({ err }, '⚠️ Audio Transcription service initialization failed');
      }

      // Initialize Document Processing Service if Azure OpenAI is configured
      let documentProcessingService: any = undefined;
      try {
        const { DocumentProcessingService } = await import('../services/multimodal/document-processing.service.js');
        const azureOpenAIConfig = config.ai?.azureOpenAI;
        
        if (azureOpenAIConfig?.endpoint && azureOpenAIConfig?.apiKey) {
          documentProcessingService = new DocumentProcessingService(
            {
              endpoint: azureOpenAIConfig.endpoint,
              apiKey: azureOpenAIConfig.apiKey,
              deploymentName: process.env.AZURE_OPENAI_VISION_DEPLOYMENT_NAME || 'gpt-4-vision',
              apiVersion: azureOpenAIConfig.apiVersion || '2024-02-15-preview',
            },
            monitoring
          );
          server.log.info('✅ Document Processing service initialized');
        } else {
          server.log.warn('⚠️ Document Processing service not initialized - Azure OpenAI Vision not configured');
        }
      } catch (err) {
        server.log.warn({ err }, '⚠️ Document Processing service initialization failed');
      }

      // Initialize Video Processing Service (requires AudioTranscriptionService)
      let videoProcessingService: any = undefined;
      if (audioTranscriptionService) {
        try {
          const { VideoProcessingService } = await import('../services/multimodal/video-processing.service.js');
          videoProcessingService = new VideoProcessingService(
            {
              audioTranscriptionService,
              imageAnalysisService, // Optional, for frame analysis
              maxFramesToAnalyze: 5,
              frameExtractionInterval: 30, // Extract frame every 30 seconds
            },
            monitoring
          );
          server.log.info('✅ Video Processing service initialized');
        } catch (err) {
          server.log.warn({ err }, '⚠️ Video Processing service initialization failed');
        }
      } else {
        server.log.warn('⚠️ Video Processing service not initialized - Audio Transcription service required');
      }

      // Initialize MultimodalAssetService
      const multimodalAssetService = new MultimodalAssetService(
        rawClient,
        blobStorageService,
        monitoring,
        imageAnalysisService,
        audioTranscriptionService,
        documentProcessingService,
        videoProcessingService
      );
      
      // Store on server for access by InsightService (if it needs to be updated later)
      server.decorate('multimodalAssetService', multimodalAssetService);

      // Initialize background worker for automatic asset processing
      let assetProcessingWorker: any = undefined;
      try {
        const { AssetProcessingWorker } = await import('../services/multimodal/asset-processing-worker.service.js');
        const database = cosmosClient.getDatabase();
        const mediaContainer = database.container(config.cosmosDb.containers.media);
        
        assetProcessingWorker = new AssetProcessingWorker(
          mediaContainer,
          multimodalAssetService,
          monitoring,
          {
            pollIntervalMs: parseInt(process.env.ASSET_PROCESSING_POLL_INTERVAL_MS || '10000'),
            maxConcurrentJobs: parseInt(process.env.ASSET_PROCESSING_MAX_CONCURRENT || '3'),
            maxJobDurationMs: parseInt(process.env.ASSET_PROCESSING_MAX_DURATION_MS || '300000'),
            batchSize: parseInt(process.env.ASSET_PROCESSING_BATCH_SIZE || '10'),
          }
        );
        
        // Start the worker
        assetProcessingWorker.start();
        server.decorate('assetProcessingWorker', assetProcessingWorker);
        server.log.info('✅ Multi-modal asset processing worker started');
      } catch (err) {
        server.log.warn({ err }, '⚠️ Multi-modal asset processing worker initialization failed');
      }

      // Register multi-modal asset routes
      if (!multimodalAssetService) {
        server.log.warn('⚠️ Multi-modal asset routes not registered - multimodalAssetService missing');
      } else {
        try {
          const authenticateDecorator = (server as any).authenticate;
          await server.register(multimodalAssetsRoutes, {
            prefix: '/api/v1',
            multimodalAssetService,
            authenticate: authenticateDecorator, // Pass authenticate decorator explicitly
            tokenValidationCache: (server as any).tokenValidationCache, // Also pass cache
          });
          server.log.info('✅ Multi-modal asset routes registered with prefix /api/v1');
          
          // Verify route registration - check multiple formats
          const routes = server.printRoutes();
          const assetsRoutePatterns = [
            '/api/v1/insights/assets',
            'GET /api/v1/insights/assets',
            'POST /api/v1/insights/assets',
            '/insights/assets',
            'GET /insights/assets',
            'insights/assets',
          ];
          const hasAssetsRoute = assetsRoutePatterns.some(pattern => routes.includes(pattern));
          
          server.log.info(`Route verification: /api/v1/insights/assets ${hasAssetsRoute ? '✅ found' : '❌ not found'}`);
          
          if (!hasAssetsRoute) {
            // Check if routes exist but in a different format
            const assetsRoutes = routes.split('\n').filter(line => 
              line.toLowerCase().includes('assets') && 
              (line.includes('insights') || line.includes('/assets'))
            );
            
            if (assetsRoutes.length > 0) {
              server.log.info(`✅ Assets routes registered (found ${assetsRoutes.length} route(s), format may differ)`);
              server.log.debug({ routes: assetsRoutes.slice(0, 5) }, 'Assets routes found');
            } else {
              server.log.warn({ routes: routes.split('\n').filter(line => line.includes('assets')).slice(0, 15) }, 'Available routes containing "assets"');
              server.log.warn({ routes: routes.split('\n').filter(line => line.includes('insights')).slice(0, 20) }, 'Available routes containing "insights"');
            }
          }
        } catch (assetRouteErr) {
          server.log.error({ err: assetRouteErr, stack: (assetRouteErr as Error).stack }, '❌ Failed to register multi-modal asset routes');
        }
      }

      // Update InsightService with multimodalAssetService if available
      // This handles the initialization order dependency - InsightService is created before MultimodalAssetService
      // but the setter method allows us to inject it after initialization
      const insightService = (server as any).insightService;
      if (insightService && typeof insightService.setMultimodalAssetService === 'function') {
        insightService.setMultimodalAssetService(multimodalAssetService);
        server.log.info('✅ InsightService updated with MultimodalAssetService');
      } else {
        server.log.warn('⚠️ InsightService not found or setMultimodalAssetService method not available - multimodal features may be limited');
      }
    } else {
      const missingDeps: string[] = [];
      if (!cosmosClient) {missingDeps.push('Cosmos DB client');}
      if (!blobStorageService) {missingDeps.push('Blob Storage service');}
      
      server.log.warn(`⚠️ Multi-modal asset routes not registered - missing dependencies: ${missingDeps.join(', ')}`);
      
      // Log which dependencies are available
      if (cosmosClient) {server.log.debug('  ✅ Cosmos DB client available');}
      if (blobStorageService) {server.log.debug('  ✅ Blob Storage service available');}
      
      if (!blobStorageService) {
        server.log.info('  💡 Tip: Configure Azure Blob Storage to enable multi-modal asset upload and processing');
      }
    }
  } catch (err) {
    server.log.warn({ err }, '⚠️ Multi-modal asset routes failed to register');
    serviceHealthTracker.trackFailure({
      serviceName: 'Multi-modal Asset Routes',
      operation: 'registration',
      error: err,
      criticality: 'optional',
      dependencies: extractDependencies(err, { dependencies: ['CosmosDB', 'BlobStorage'] }),
      errorCode: extractErrorCode(err),
    });
  }

  // Log service health summary at the end of route registration
  serviceHealthTracker.logHealthSummary();
  const healthSummary = serviceHealthTracker.getHealthSummary();
  
  if (healthSummary.totalFailures > 0) {
    server.log.warn(`⚠️ Service initialization summary: ${healthSummary.totalFailures} service(s) failed to initialize`);
    if (healthSummary.criticalFailures > 0) {
      server.log.error(`❌ CRITICAL: ${healthSummary.criticalFailures} critical service(s) failed - application may not function correctly`);
    }
    if (healthSummary.optionalFailures > 0) {
      server.log.warn(`⚠️ OPTIONAL: ${healthSummary.optionalFailures} optional service(s) failed - some features may be unavailable`);
    }
    if (healthSummary.enhancementFailures > 0) {
      server.log.info(`ℹ️ ENHANCEMENT: ${healthSummary.enhancementFailures} enhancement service(s) failed - advanced features unavailable`);
    }
  } else {
    server.log.info('✅ All services initialized successfully');
  }
}
