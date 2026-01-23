import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import compress from '@fastify/compress';
import mercurius from 'mercurius';
import fastifyJwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import websocket from '@fastify/websocket';
import { CosmosClient, Database, ConnectionPolicy, RetryOptions } from '@azure/cosmos';
import { MonitoringService } from '@castiel/monitoring';
import { config } from './config/env.js';
import { RedisConnectionManager } from './cache/redis.js';
import { CacheManager } from './cache/manager.js';
import { TokenValidationCacheService } from './services/token-validation-cache.service.js';
import { CacheService } from './services/cache.service.js';
import { CacheSubscriberService } from './services/cache-subscriber.service.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/logger.js';
import { registerResponseCacheMiddleware } from './middleware/response-cache.middleware.js';
import { APIPerformanceMonitoringService } from './services/api-performance-monitoring.service.js';
import { CacheOptimizationService } from './services/cache-optimization.service.js';
import { authenticate, optionalAuthenticate } from './middleware/authenticate.js';
import { registerCsrfMiddleware } from './middleware/csrf.js';
import { registerRoutes } from './routes/index.js';
import { schema } from './graphql/schema.js';
import { resolvers } from './graphql/resolvers.js';
import { registerSwagger } from './plugins/swagger.js';
import {
  UserService,
  CosmosDbClient,
} from '@castiel/api-core';
import {
  UserCacheService,
  OAuthService,
  OAuth2ClientService,
  OAuth2AuthService,
} from './services/auth/index.js';
import { UnifiedEmailService, TenantService } from '@castiel/api-core';
import { UserManagementService } from './services/auth/user-management.service.js';
import { RoleManagementService } from './services/auth/role-management.service.js';
import { MFAService } from './services/auth/mfa.service.js';
import { MagicLinkService } from './services/auth/magic-link.service.js';
import { SAMLService } from './services/auth/saml.service.js';
import { SSOConfigService } from './services/auth/sso-config.service.js';
import { SessionManagementService } from './services/auth/session-management.service.js';
import { AuthController } from './controllers/auth.controller.js';
import { MFAController } from './controllers/mfa.controller.js';
import { MagicLinkController } from './controllers/magic-link.controller.js';
import { SSOController } from './controllers/sso.controller.js';
import { SSOConfigController } from './controllers/sso-config.controller.js';
import { AzureADB2CController } from './controllers/azure-ad-b2c.controller.js';
import { AzureADB2CService } from './services/auth/azure-ad-b2c.service.js';
import { OAuthController } from './controllers/oauth.controller.js';
import { UserSecurityController } from './controllers/user-security.controller.js';
import { DeviceSecurityService } from './services/security/device-security.service.js';
import { OAuth2Controller } from './controllers/oauth2.controller.js';
import { UserManagementController } from './controllers/user-management.controller.js';
import { RoleManagementController } from './controllers/role-management.controller.js';
import { SessionManagementController } from './controllers/session-management.controller.js';
import { TenantController } from './controllers/tenant.controller.js';
import { TenantMembershipController } from './controllers/tenant-membership.controller.js';
import { TenantJoinRequestService } from './services/auth/tenant-join-request.service.js';
import { TenantInvitationService } from './services/auth/tenant-invitation.service.js';
import { TenantInvitationLifecycleScheduler } from './services/auth/tenant-invitation-lifecycle.scheduler.js';
import { AuditLogService, setAuditLogService } from '@castiel/api-core';
import { RateLimiterService, InMemoryRateLimiterService } from './services/security/rate-limiter.service.js';
import { ShardEventService } from './services/shard-event.service.js';
import { WebhookDeliveryService } from './services/webhook-delivery.service.js';
import { AuditWebhookEmitter } from './services/audit-webhook-emitter.service.js';
import { AuditLogController } from './controllers/audit-log.controller.js';
import { KeyVaultService } from '@castiel/key-vault';
import { AIConfigService } from './services/ai-config.service.js';
import { AIConnectionService } from './services/ai/index.js';

// Initialize monitoring
const monitoring = MonitoringService.initialize({
  enabled: config.monitoring.enabled,
  provider: config.monitoring.provider,
  instrumentationKey: config.monitoring.instrumentationKey,
  samplingRate: config.monitoring.samplingRate,
});

// Create Fastify server
const server = Fastify({
  logger: {
    level: config.logLevel,
  },
});

// Global references for graceful shutdown
let cacheSubscriberInstance: CacheSubscriberService | null = null;
let cacheManagerInstance: CacheManager | null = null;
let invitationLifecycleScheduler: TenantInvitationLifecycleScheduler | null = null;
let shardEventServiceInstance: ShardEventService | null = null;
let webhookDeliveryServiceInstance: WebhookDeliveryService | null = null;
let auditWebhookEmitterInstance: AuditWebhookEmitter | null = null;

/**
 * Start the server
 */
const start = async () => {
  try {
    // Validate configuration early (before any service initialization)
    // This ensures we fail fast on configuration errors
    try {
      const { validateEnvironment } = await import('./scripts/validate-env.js');
      const validation = validateEnvironment();
      if (!validation.valid) {
        server.log.error('❌ Configuration validation failed:');
        validation.errors.forEach(error => server.log.error(`   ${error}`));
        if (validation.warnings.length > 0) {
          server.log.warn('⚠️  Configuration warnings:');
          validation.warnings.forEach(warning => server.log.warn(`   ${warning}`));
        }
        process.exit(1);
      }
      if (validation.warnings.length > 0 && config.nodeEnv === 'production') {
        server.log.warn('⚠️  Configuration warnings (production):');
        validation.warnings.forEach(warning => server.log.warn(`   ${warning}`));
      }
    } catch (validationError) {
      // If validation script fails, log but continue (config might be loaded differently)
      server.log.warn({ err: validationError }, '⚠️  Could not run standalone validation script');
      // loadConfig() will still validate, so we continue
    }

    // Initialize email service with flexible provider support
    const emailService = new UnifiedEmailService({
      provider: config.email.provider,
      fromEmail: config.email.fromEmail,
      fromName: config.email.fromName,
      resend: config.email.resend,
      azureAcs: config.email.azureAcs,
    }, undefined, monitoring);
    server.log.info(`✅ Email service initialized (provider: ${emailService.getProviderName()})`);

    let cosmosClient: CosmosDbClient | null = null;
    let userCacheService: UserCacheService | null = null;
    let userService: UserService | null = null;
    let cacheManager: CacheManager | null = null;
    let mfaController: MFAController | null = null;
    let magicLinkController: MagicLinkController | null = null;
    let ssoController: SSOController | null = null;
    let userManagementController: UserManagementController | null = null;
    let roleManagementController: RoleManagementController | null = null;
    let roleManagementServiceInstance: RoleManagementService | null = null;
    let sessionManagementController: SessionManagementController | null = null;
    let tenantController: TenantController | null = null;
    let tenantMembershipController: TenantMembershipController | null = null;
    let tenantServiceInstance: TenantService | null = null;
    let auditLogService: AuditLogService | undefined;
    let tenantJoinRequestService: TenantJoinRequestService | null = null;
    let tenantInvitationService: TenantInvitationService | null = null;

    // Initialize Redis connection
    let redisClient = null;
    let tokenValidationCache = null;
    let cacheService = null;
    let cacheSubscriber = null;

    try {
      const redisManager = new RedisConnectionManager(config.redis, monitoring);
      redisClient = await redisManager.getClient();
      server.log.info('✅ Redis connected successfully');

      // Initialize cache service
      cacheService = new CacheService(redisClient, monitoring);
      server.log.info('✅ Cache service initialized');

      // Initialize auth cache manager
      cacheManager = new CacheManager(redisClient, {
        sessionTTL: 9 * 60 * 60,
        refreshTokenTTL: 7 * 24 * 60 * 60,
        jwtCacheTTL: 5 * 60,
        cleanupInterval: 60 * 60 * 1000,
      });
      cacheManagerInstance = cacheManager;
      server.decorate('cacheManager', cacheManager);
      server.log.info('✅ Auth cache manager initialized');

      // Initialize user cache service
      userCacheService = new UserCacheService(redisClient);
      server.log.info('✅ User cache service initialized');

      // Initialize rate limiter
      const rateLimiter = new RateLimiterService(redisClient, 'castiel_rate_limit');
      server.decorate('rateLimiter', rateLimiter);
      server.log.info('✅ Rate limiter service initialized');

      // Initialize cache subscriber for cross-instance invalidation
      cacheSubscriber = new CacheSubscriberService(redisClient, cacheService, monitoring);
      await cacheSubscriber.initialize();
      server.log.info('✅ Cache subscriber initialized');

      // Store for graceful shutdown
      cacheSubscriberInstance = cacheSubscriber;

      // Initialize token validation cache if enabled
      if (config.jwt.validationCacheEnabled) {
        tokenValidationCache = new TokenValidationCacheService(redisClient);
        server.log.info('✅ Token validation cache enabled');
      }

      // Initialize Shard Event Service for real-time events and SSE
      try {
        const shardEventService = new ShardEventService(redisClient, monitoring);
        await shardEventService.initialize();
        shardEventServiceInstance = shardEventService;
        server.decorate('shardEventService', shardEventService);
        server.log.info('✅ Shard event service initialized');

        // Initialize Webhook Delivery Service
        const webhookDeliveryService = new WebhookDeliveryService(
          redisClient,
          monitoring,
          shardEventService
        );
        await webhookDeliveryService.initialize();
        webhookDeliveryServiceInstance = webhookDeliveryService;
        server.decorate('webhookDeliveryService', webhookDeliveryService);
        server.log.info('✅ Webhook delivery service initialized');

        // Initialize Audit Webhook Emitter
        const auditWebhookEmitter = new AuditWebhookEmitter(redisClient, monitoring);
        auditWebhookEmitterInstance = auditWebhookEmitter;
        server.decorate('auditWebhookEmitter', auditWebhookEmitter);
        server.log.info('✅ Audit webhook emitter initialized');
      } catch (eventErr) {
        server.log.warn({ err: eventErr }, '⚠️ Event services not initialized');
      }
    } catch (err) {
      server.log.warn({ err }, 'Redis connection failed - running without cache');

      // Use in-memory rate limiter as fallback (only if not already decorated)
      if (!(server as any).rateLimiter) {
        const inMemoryRateLimiter = new InMemoryRateLimiterService();
        server.decorate('rateLimiter', inMemoryRateLimiter);
        server.log.info('✅ In-memory rate limiter initialized (fallback)');
      } else {
        server.log.info('✅ Rate limiter already initialized');
      }
    }

    // Initialize Cosmos DB client for auth data
    try {
      cosmosClient = new CosmosDbClient({
        endpoint: config.cosmosDb.endpoint,
        key: config.cosmosDb.key,
        database: config.cosmosDb.databaseId,
        rolesContainer: config.cosmosDb.containers.roles,
        usersContainer: config.cosmosDb.containers.users,
        tenantsContainer: config.cosmosDb.containers.tenants,
        ssoConfigsContainer: config.cosmosDb.containers.ssoConfigs,
        oauth2ClientsContainer: config.cosmosDb.containers.oauth2Clients,
        joinRequestsContainer: config.cosmosDb.containers.joinRequests,
        tenantInvitationsContainer: config.cosmosDb.containers.tenantInvitations,
      });

      const cosmosHealthy = await cosmosClient.healthCheck();
      if (cosmosHealthy) {
        server.log.info('✅ Cosmos DB connection established for auth services');
      } else {
        server.log.warn('⚠️ Cosmos DB health check failed for auth services');
      }
    } catch (err) {
      server.log.error({ err }, 'Failed to initialize Cosmos DB client for auth features');
    }

    // Initialize Cosmos DB client for shards data (cache admin routes)
    try {
      // Use optimized connection policy for production
      const connectionPolicy: ConnectionPolicy = {
        connectionMode: 'Direct' as any, // Best performance (ConnectionMode enum not available in this version)
        requestTimeout: 30000, // 30 seconds
        enableEndpointDiscovery: true, // For multi-region
        retryOptions: {
          maxRetryAttemptCount: 9,
          fixedRetryIntervalInMilliseconds: 0, // Exponential backoff
          maxWaitTimeInSeconds: 30,
        } as RetryOptions,
      };

      const shardsCosmosClient = new CosmosClient({
        endpoint: config.cosmosDb.endpoint,
        key: config.cosmosDb.key,
        connectionPolicy,
      });
      const shardsDatabase = shardsCosmosClient.database(config.cosmosDb.databaseId);
      const shardsContainer = shardsDatabase.container(config.cosmosDb.containers.shards);

      // Decorate server with cosmos references for cache admin routes
      server.decorate('cosmos', shardsCosmosClient);
      server.decorate('cosmosDatabase', shardsDatabase);
      server.decorate('cosmosContainer', shardsContainer);

      server.log.info('✅ Cosmos DB client initialized for shards data');

      // Initialize Phase 2 Integration Services
      try {
        const { ShardRepository } = await import('@castiel/api-core');
        const { ShardCacheService } = await import('./services/shard-cache.service.js');
        const { InsightComputationService } = await import('./services/insight-computation.service.js');
        const { MetricsShardService } = await import('./services/metrics-shard.service.js');
        const { RedactionService } = await import('./services/redaction.service.js');
        const { AuditTrailService } = await import('./services/audit-trail.service.js');

        // Create a minimal ShardCacheService for Phase 2 services
        // (Full cache service will be created later in routes, but we need a repository now)
        const tempCacheService = cacheService && cacheSubscriber
          ? new ShardCacheService(cacheService, cacheSubscriber, monitoring)
          : undefined;

        // Create initial ShardRepository for Phase 2 services (without redaction/audit services yet)
        const phase2ShardRepository = new ShardRepository(
          monitoring,
          tempCacheService,
          undefined // serviceBusService - will be set up in routes
        );

        // Initialize RedactionService (needs ShardRepository)
        const redactionService = new RedactionService(
          monitoring,
          phase2ShardRepository
        );
        server.decorate('redactionService', redactionService);
        server.log.info('✅ Redaction Service initialized');

        // Initialize AuditTrailService (needs ShardRepository)
        const auditTrailService = new AuditTrailService(
          monitoring,
          phase2ShardRepository
        );
        server.decorate('auditTrailService', auditTrailService);
        server.log.info('✅ Audit Trail Service initialized');

        // Note: RedactionService and AuditTrailService are available on the server
        // They will be passed to ShardRepository instances created in routes where available
        // The phase2ShardRepository created here doesn't have them, but that's fine -
        // it's used for services that don't need them (InsightComputation, MetricsShard)

        // Initialize InsightComputationService
        const insightComputationService = new InsightComputationService(
          monitoring,
          phase2ShardRepository,
          shardsContainer,
          {
            enableChangeFeed: process.env.ENABLE_INSIGHT_CHANGE_FEED !== 'false',
            enableNightlyBatch: process.env.ENABLE_INSIGHT_NIGHTLY_BATCH !== 'false',
            batchSize: parseInt(process.env.INSIGHT_BATCH_SIZE || '100', 10),
            pollIntervalMs: parseInt(process.env.INSIGHT_POLL_INTERVAL_MS || '5000', 10),
          }
        );

        // Start Change Feed listener (non-blocking)
        insightComputationService.startChangeFeedListener().catch((error) => {
          server.log.error({ err: error }, '⚠️ Failed to start insight computation Change Feed listener');
        });

        server.decorate('insightComputationService', insightComputationService);
        server.log.info('✅ Insight Computation Service initialized');

        // Initialize MetricsShardService
        const metricsShardService = new MetricsShardService(
          monitoring,
          phase2ShardRepository,
          process.env.ENABLE_METRICS_SHARDS !== 'false'
        );
        server.decorate('metricsShardService', metricsShardService);
        server.log.info('✅ Metrics Shard Service initialized');

      } catch (err) {
        server.log.warn({ err }, '⚠️ Phase 2 Integration Services not initialized - some features may be unavailable');
      }
    } catch (err) {
      server.log.error({ err }, 'Failed to initialize Cosmos DB client for shards data');
    }

    // Initialize Azure Key Vault service
    let keyVaultService: KeyVaultService | null = null;
    let aiConfigService: AIConfigService | null = null;

    if (config.keyVault.url && config.keyVault.enabled) {
      try {
        keyVaultService = new KeyVaultService({
          vaultUrl: config.keyVault.url,
          useManagedIdentity: config.keyVault.useManagedIdentity,
          servicePrincipal: config.keyVault.servicePrincipal,
          cacheTTL: config.keyVault.cacheTTL,
          enableFallback: config.keyVault.enableFallback,
        });
        server.decorate('keyVaultService', keyVaultService);
        server.log.info('✅ Azure Key Vault service initialized');
      } catch (err) {
        server.log.warn({ err }, '⚠️ Key Vault service not initialized - will use legacy encryption');
      }
    } else {
      server.log.info('ℹ️ Azure Key Vault not configured - AI credentials will use legacy encryption');
    }

    // Initialize AI Config Service (for AI provider credentials)
    if (cosmosClient && redisClient && keyVaultService) {
      try {
        aiConfigService = new AIConfigService(
          cosmosClient.getClient(),
          redisClient,
          keyVaultService
        );
        await aiConfigService.ensureContainers();
        server.decorate('aiConfigService', aiConfigService);
        server.log.info('✅ AI Config service initialized with Key Vault integration');
      } catch (err) {
        server.log.warn({ err }, '⚠️ AI Config service not initialized');
      }
    } else {
      server.log.warn('⚠️ AI Config service not initialized - missing Cosmos DB, Redis, or Key Vault');
    }

    // Initialize AI Connection Service (for AI model connections)
    let aiConnectionService: AIConnectionService | null = null;
    if (redisClient) {
      try {
        aiConnectionService = new AIConnectionService(
          monitoring,
          redisClient,
          keyVaultService || undefined
        );
        server.decorate('aiConnectionService', aiConnectionService);
        server.log.info('✅ AI Connection service initialized');
      } catch (err) {
        server.log.warn({ err }, '⚠️ AI Connection service not initialized');
      }
    } else {
      server.log.warn('⚠️ AI Connection service not initialized - missing Redis');
    }

    // Initialize core auth domain services
    if (cosmosClient) {
      try {
        userService = new UserService(
          cosmosClient.getUsersContainer(),
          userCacheService || undefined,
          monitoring
        );
        server.log.info('✅ User service initialized');
      } catch (err) {
        server.log.error({ err }, 'Failed to initialize user service');
      }
    } else {
      server.log.warn('⚠️ User service not initialized - Cosmos DB unavailable');
    }

    if (redisClient && cosmosClient) {
      try {
        const mfaService = new MFAService(
          server,
          redisClient,
          cosmosClient.getUsersContainer(),
          cosmosClient.getTenantsContainer(),
          emailService as any
        );
        mfaController = new MFAController(mfaService, {
          userService: userService || undefined,
          cacheManager: cacheManager || undefined,
          accessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY || '9h',
        });
        server.decorate('mfaController', mfaController);
        server.log.info('✅ MFA controller initialized');
      } catch (err) {
        server.log.warn({ err }, '⚠️ MFA service not initialized');
      }
    } else {
      server.log.warn('⚠️ MFA service not initialized - Redis or Cosmos DB unavailable');
    }

    // Initialize Magic Link controller
    if (redisClient && userService && cacheManager) {
      try {
        const magicLinkService = new MagicLinkService(
          server,
          redisClient,
          userService,
          emailService as any,
          process.env.FRONTEND_URL || 
            (process.env.NODE_ENV === 'production' 
              ? (() => { throw new Error('FRONTEND_URL is required in production'); })()
              : 'http://localhost:3000')
        );
        magicLinkController = new MagicLinkController(
          magicLinkService,
          cacheManager,
          process.env.JWT_ACCESS_TOKEN_EXPIRY || '9h'
        );
        server.decorate('magicLinkController', magicLinkController);
        server.log.info('✅ Magic link controller initialized');
      } catch (err) {
        server.log.warn({ err }, '⚠️ Magic link service not initialized');
      }
    } else {
      server.log.warn('⚠️ Magic link service not initialized - missing dependencies');
    }

    // Initialize SSO/SAML controller
    let ssoConfigService: SSOConfigService | null = null;
    if (redisClient && cosmosClient && userService && cacheManager) {
      try {
        const samlService = new SAMLService(redisClient);
        const ssoConfigsContainer = cosmosClient.getSSOConfigsContainer();
        ssoConfigService = new SSOConfigService(ssoConfigsContainer, redisClient);

        ssoController = new SSOController(
          samlService,
          ssoConfigService,
          userService,
          cacheManager,
          process.env.JWT_ACCESS_TOKEN_EXPIRY || '9h',
          process.env.FRONTEND_URL || 
            (process.env.NODE_ENV === 'production' 
              ? (() => { throw new Error('FRONTEND_URL is required in production'); })()
              : 'http://localhost:3000')
        );
        server.decorate('ssoController', ssoController);
        server.log.info('✅ SSO controller initialized');

        // Initialize SSO config controller for admin management
        const ssoConfigController = new SSOConfigController(ssoConfigService);
        server.decorate('ssoConfigController', ssoConfigController);
        server.log.info('✅ SSO config controller initialized');
      } catch (err) {
        server.log.warn({ err }, '⚠️ SSO controller not initialized');
      }
    } else {
      server.log.warn('⚠️ SSO controller not initialized - missing dependencies');
    }

    // Initialize Azure AD B2C controller
    if (redisClient && userService && cacheManager) {
      try {
        // Only initialize if Azure AD B2C is configured
        const azureB2CConfig = {
          tenantName: process.env.AZURE_B2C_TENANT_NAME || '',
          tenantId: process.env.AZURE_B2C_TENANT_ID || '',
          clientId: process.env.AZURE_B2C_CLIENT_ID || '',
          clientSecret: process.env.AZURE_B2C_CLIENT_SECRET || '',
          policyName: process.env.AZURE_B2C_POLICY_NAME || 'B2C_1_signupsignin',
          redirectUri: process.env.AZURE_B2C_REDIRECT_URI || 
            (process.env.NODE_ENV === 'production'
              ? (() => { throw new Error('AZURE_B2C_REDIRECT_URI or API_BASE_URL is required in production'); })()
              : `${process.env.API_BASE_URL || 'http://localhost:3001'}/auth/azure-b2c/callback`),
          scopes: ['openid', 'profile', 'email', 'offline_access'],
        };

        if (azureB2CConfig.tenantName && azureB2CConfig.clientId) {
          const azureB2CService = new AzureADB2CService(redisClient, azureB2CConfig);
          const azureB2CController = new AzureADB2CController(
            azureB2CService,
            userService,
            cacheManager,
            process.env.JWT_ACCESS_TOKEN_EXPIRY || '9h',
            process.env.FRONTEND_URL || 
            (process.env.NODE_ENV === 'production' 
              ? (() => { throw new Error('FRONTEND_URL is required in production'); })()
              : 'http://localhost:3000')
          );
          server.decorate('azureADB2CController', azureB2CController);
          server.log.info('✅ Azure AD B2C controller initialized');
        } else {
          server.log.info('ℹ️ Azure AD B2C not configured - skipping initialization');
        }
      } catch (err) {
        server.log.warn({ err }, '⚠️ Azure AD B2C controller not initialized');
      }
    }

    if (cosmosClient && cacheManager && userService) {
      const userManagementService = new UserManagementService(
        cosmosClient.getUsersContainer(),
        userCacheService || undefined,
        emailService as any
      );
      userManagementController = new UserManagementController(
        userManagementService,
        cacheManager,
        userService!
      );
      server.decorate('userManagementController', userManagementController);
      server.log.info('✅ User management controller initialized');
    } else {
      server.log.warn('⚠️ User management controller not initialized - missing dependencies');
    }

    // Initialize user security controller
    if (userService && mfaController && cacheManager) {
      try {
        const mfaService = new MFAService(
          server,
          redisClient!,
          cosmosClient!.getUsersContainer(),
          cosmosClient!.getTenantsContainer(),
          emailService as any
        );
        const userSecurityController = new UserSecurityController(
          userService,
          mfaService,
          cacheManager,
          emailService,
          process.env.FRONTEND_URL || 
            (process.env.NODE_ENV === 'production' 
              ? (() => { throw new Error('FRONTEND_URL is required in production'); })()
              : 'http://localhost:3000')
        );
        server.decorate('userSecurityController', userSecurityController);
        server.log.info('✅ User security controller initialized');
      } catch (err) {
        server.log.warn({ err }, '⚠️ User security controller not initialized');
      }
    } else {
      server.log.warn('⚠️ User security controller not initialized - missing dependencies');
    }

    if (cosmosClient) {
      try {
        const roleService = new RoleManagementService(
          cosmosClient.getDatabase(),
          cosmosClient.getRolesContainer(),
          cosmosClient.getUsersContainer()
        );
        roleManagementServiceInstance = roleService;
        roleManagementController = new RoleManagementController(roleService);
        server.decorate('roleManagementService', roleService);
        server.decorate('roleManagementController', roleManagementController);
        server.log.info('✅ Role management controller initialized');
      } catch (err) {
        server.log.warn({ err }, '⚠️ Role management controller not initialized');
      }
    } else {
      server.log.warn('⚠️ Role management controller not initialized - Cosmos DB unavailable');
    }

    if (cosmosClient) {
      try {
        tenantServiceInstance = new TenantService(cosmosClient.getTenantsContainer());
        tenantController = new TenantController(tenantServiceInstance);
        server.decorate('tenantController', tenantController);
        server.log.info('✅ Tenant controller initialized');
      } catch (err) {
        server.log.warn({ err }, '⚠️ Tenant controller not initialized');
      }

      // Initialize Audit Log Service (needed by other controllers)
      try {
        const auditLogsContainer = cosmosClient.getDatabase().container('AuditLogs');
        auditLogService = new AuditLogService(auditLogsContainer, {
          environment: config.nodeEnv,
          serviceName: 'main-api',
        });
        setAuditLogService(auditLogService);
        const auditLogController = new AuditLogController(auditLogService);
        server.decorate('auditLogService', auditLogService);
        server.decorate('auditLogController', auditLogController);
        server.log.info('✅ Audit log service initialized');
      } catch (err) {
        server.log.warn({ err }, '⚠️ Audit log service not initialized');
      }
    } else {
      server.log.warn('⚠️ Tenant controller not initialized - Cosmos DB unavailable');
    }

    // Initialize Document Management Controller
    if (cosmosClient && auditLogService) {
      try {
        const { DocumentController } = await import('./controllers/document.controller.js');

        const documentController = new DocumentController(
          monitoring,
          auditLogService,
          config.azureStorage, // Pass Azure Storage config if available
          auditWebhookEmitterInstance || undefined, // Pass webhook emitter if available
          redisClient || undefined // Pass Redis for chunked upload session storage
        );
        await documentController.initialize();
        server.decorate('documentController', documentController);
        server.log.info(
          config.azureStorage
            ? '✅ Document management controller initialized with Azure Storage'
            : '⚠️ Document management controller initialized (upload/download disabled - no Azure Storage config)'
        );
      } catch (err) {
        server.log.warn({ err }, '⚠️ Document management controller not initialized');
      }
    } else {
      server.log.warn('⚠️ Document management controller not initialized - Cosmos DB or Audit Log unavailable');
    }

    // Initialize Bulk Document Operations
    if ((server as any).cosmosDatabase && (server as any).documentController && monitoring) {
      try {
        const { BulkJobRepository } = await import('./repositories/bulk-job.repository.js');
        const { BulkDocumentService } = await import('./services/bulk-document.service.js');
        const { DocumentBulkController } = await import('./controllers/document-bulk.controller.js');

        const shardsDatabase = (server as any).cosmosDatabase;
        const bulkJobsContainer = shardsDatabase.container(config.cosmosDb.containers.bulkJobs);

        const bulkJobRepository = new BulkJobRepository(bulkJobsContainer, monitoring);
        const bulkDocumentService = new BulkDocumentService(
          bulkJobRepository,
          (server as any).shardRepository,
          null as any,
          auditWebhookEmitterInstance || undefined,
          monitoring
        );
        const documentBulkController = new DocumentBulkController(
          bulkDocumentService,
          monitoring
        );

        server.decorate('bulkDocumentService', bulkDocumentService);
        server.decorate('documentBulkController', documentBulkController);

        // Initialize background job worker
        const { BulkJobWorker } = await import('./services/bulk-job-worker.service.js');
        const bulkJobWorker = new BulkJobWorker(
          bulkJobRepository,
          monitoring,
          {
            pollIntervalMs: parseInt(process.env.BULK_JOB_WORKER_POLL_INTERVAL || '5000'),
            maxConcurrentJobs: parseInt(process.env.BULK_JOB_WORKER_MAX_CONCURRENT || '2'),
            maxJobDurationMs: parseInt(process.env.BULK_JOB_WORKER_MAX_DURATION || '3600000'),
          }
        );
        bulkJobWorker.start();
        server.decorate('bulkJobWorker', bulkJobWorker);

        server.log.info('✅ Bulk document operations initialized');
      } catch (err) {
        server.log.warn({ err }, '⚠️ Bulk document operations not initialized');
      }
    }

    // Initialize Collection Management Controller
    if (cosmosClient) {
      try {
        const { CollectionController } = await import('./controllers/collection.controller.js');
        const collectionController = new CollectionController(monitoring);
        await collectionController.initialize();
        server.decorate('collectionController', collectionController);
        server.log.info('✅ Collection management controller initialized');
      } catch (err) {
        server.log.warn({ err }, '⚠️ Collection management controller not initialized');
      }
    } else {
      server.log.warn('⚠️ Collection management controller not initialized - Cosmos DB unavailable');
    }

    if (cosmosClient) {
      try {
        tenantJoinRequestService = new TenantJoinRequestService(
          cosmosClient.getTenantJoinRequestsContainer()
        );
        server.log.info('✅ Tenant join request service initialized');
      } catch (err) {
        server.log.warn({ err }, '⚠️ Tenant join request service not initialized');
      }

      try {
        tenantInvitationService = new TenantInvitationService(
          cosmosClient.getTenantInvitationsContainer(),
          config.membership.invitations,
          redisClient
        );
        server.log.info('✅ Tenant invitation service initialized');
      } catch (err) {
        server.log.warn({ err }, '⚠️ Tenant invitation service not initialized');
      }
    }

    if (
      tenantServiceInstance &&
      tenantJoinRequestService &&
      tenantInvitationService &&
      userService
    ) {
      tenantMembershipController = new TenantMembershipController(
        tenantJoinRequestService,
        tenantInvitationService,
        tenantServiceInstance,
        userService,
        emailService as any,
        config.frontend.baseUrl,
        config.membership.invitations
      );
      server.decorate('tenantMembershipController', tenantMembershipController);
      server.log.info('✅ Tenant membership controller initialized');
    } else {
      server.log.warn('⚠️ Tenant membership controller not initialized - missing dependencies');
    }

    if (
      tenantInvitationService &&
      tenantServiceInstance &&
      userService &&
      !invitationLifecycleScheduler
    ) {
      invitationLifecycleScheduler = new TenantInvitationLifecycleScheduler(
        tenantInvitationService,
        tenantServiceInstance,
        userService,
        emailService as any,
        config.frontend.baseUrl,
        config.membership.invitations,
        server.log
      );
      invitationLifecycleScheduler.start();
    }

    // Initialize device security service for new device detection
    let deviceSecurityService: DeviceSecurityService | undefined;
    if (emailService) {
      deviceSecurityService = new DeviceSecurityService(
        redisClient,
        emailService,
        config.api.publicUrl,
        monitoring
      );
      server.log.info('✅ Device security service initialized');
    }

    if (cacheManager && userService && tenantServiceInstance && tenantJoinRequestService) {
      const authController = new AuthController(
        userService!,
        emailService as any,
        cacheManager,
        config.api.publicUrl,
        config.jwt.accessTokenExpiry,
        tenantServiceInstance!,
        tenantJoinRequestService!,
        mfaController ?? undefined,
        auditLogService,
        deviceSecurityService,
        roleManagementServiceInstance ?? undefined
      );
      server.decorate('authController', authController);
      server.log.info('✅ Auth controller initialized');
    } else {
      server.log.warn('⚠️ Auth controller not initialized - missing dependencies');
    }

    if (cacheManager) {
      try {
        const sessionManagementService = new SessionManagementService(cacheManager.sessions);
        sessionManagementController = new SessionManagementController(sessionManagementService);
        server.decorate('sessionManagementController', sessionManagementController);
        server.log.info('✅ Session management controller initialized');
      } catch (err) {
        server.log.warn({ err }, '⚠️ Session management controller not initialized');
      }
    } else {
      server.log.warn('⚠️ Session management controller not initialized - cache manager unavailable');
    }

    if (redisClient && cacheManager && userService) {
      try {
        const oauthService = new OAuthService(
          redisClient,
          {
            clientId: config.oauth.google.clientId,
            clientSecret: config.oauth.google.clientSecret,
            redirectUri: config.oauth.google.redirectUri,
            authorizationUrl: config.oauth.google.authorizationUrl,
            tokenUrl: config.oauth.google.tokenUrl,
            userInfoUrl: config.oauth.google.userInfoUrl,
            scope: config.oauth.google.scope,
          },
          {
            clientId: config.oauth.github.clientId,
            clientSecret: config.oauth.github.clientSecret,
            redirectUri: config.oauth.github.redirectUri,
            authorizationUrl: config.oauth.github.authorizationUrl,
            tokenUrl: config.oauth.github.tokenUrl,
            userInfoUrl: config.oauth.github.userInfoUrl,
            scope: config.oauth.github.scope,
          },
          // Microsoft OAuth config (optional)
          config.oauth.microsoft.clientId ? {
            clientId: config.oauth.microsoft.clientId,
            clientSecret: config.oauth.microsoft.clientSecret,
            redirectUri: config.oauth.microsoft.redirectUri,
            authorizationUrl: config.oauth.microsoft.authorizationUrl,
            tokenUrl: config.oauth.microsoft.tokenUrl,
            userInfoUrl: config.oauth.microsoft.userInfoUrl,
            scope: config.oauth.microsoft.scope,
          } : undefined
        );

        const oauthControllerInstance = new OAuthController(
          oauthService,
          userService,
          cacheManager,
          config.jwt.accessTokenExpiry
        );
        server.decorate('oauthController', oauthControllerInstance);
        server.log.info('✅ OAuth controller initialized');
      } catch (err) {
        server.log.warn({ err }, '⚠️ OAuth controller not initialized');
      }
    } else {
      server.log.warn('⚠️ OAuth controller not initialized - missing dependencies');
    }

    if (redisClient && cosmosClient) {
      try {
        const oauth2ClientService = new OAuth2ClientService(
          cosmosClient.getOAuth2ClientsContainer()
        );
        const oauth2AuthService = new OAuth2AuthService(redisClient);
        const oauth2Controller = new OAuth2Controller(
          oauth2ClientService,
          oauth2AuthService
        );
        server.decorate('oauth2Controller', oauth2Controller);
        server.decorate('oauth2ClientService', oauth2ClientService);
        server.log.info('✅ OAuth2 controller initialized');
      } catch (err) {
        server.log.warn({ err }, '⚠️ OAuth2 controller not initialized');
      }
    } else {
      server.log.warn('⚠️ OAuth2 controller not initialized - Redis or Cosmos DB unavailable');
    }

    // Initialize Notification Service
    if (cosmosClient && userService && tenantServiceInstance) {
      try {
        const { NotificationRepository } = await import('./repositories/notification.repository.js');
        const { NotificationService } = await import('./services/notification.service.js');
        const { NotificationRealtimeService } = await import('./services/notification-realtime.service.js');
        const { NotificationController } = await import('./controllers/notification.controller.js');

        // Use cosmosClient.getClient() to get raw CosmosClient, or fallback to shards client
        let rawCosmosClient: CosmosClient | undefined;
        let database: Database | undefined;

        try {
          // Try to get from CosmosDbClient wrapper
          rawCosmosClient = cosmosClient.getClient();
          database = cosmosClient.getDatabase();
          server.log.info('✅ Using CosmosDbClient wrapper for notifications');
        } catch (err) {
          // Fallback to shards client (raw CosmosClient)
          rawCosmosClient = (server as any).cosmos as CosmosClient | undefined;
          database = (server as any).cosmosDatabase as Database | undefined;
          if (rawCosmosClient && database) {
            server.log.info('✅ Using shards Cosmos client for notifications (fallback)');
          }
        }

        if (!rawCosmosClient || !database) {
          server.log.error('❌ Notification service not initialized - Cosmos client not available');
          server.log.error(`   rawCosmosClient: ${!!rawCosmosClient}, database: ${!!database}`);
          server.log.error(`   cosmosClient.getClient exists: ${typeof cosmosClient.getClient === 'function'}`);
          server.log.error(`   cosmosClient.getDatabase exists: ${typeof cosmosClient.getDatabase === 'function'}`);
          server.log.error(`   server.cosmos exists: ${!!(server as any).cosmos}`);
          server.log.error(`   server.cosmosDatabase exists: ${!!(server as any).cosmosDatabase}`);
        } else {
          // Ensure notifications container exists
          try {
            await NotificationRepository.ensureContainer(
              rawCosmosClient,
              database.id,
              'notifications'
            );
            server.log.info('✅ Notifications container verified');
          } catch (containerErr) {
            server.log.warn({ err: containerErr }, '⚠️ Failed to ensure notifications container exists - will try to create on first use');
          }

          const notificationRepository = new NotificationRepository(
            rawCosmosClient,
            database.id,
            'notifications'
          );

          // Initialize notification preferences repository
          let notificationPreferenceRepository: InstanceType<typeof import('./repositories/notification-preference.repository.js').NotificationPreferenceRepository> | undefined;
          try {
            const { NotificationPreferenceRepository } = await import('./repositories/notification-preference.repository.js');
            await NotificationPreferenceRepository.ensureContainer(
              rawCosmosClient,
              database.id,
              'notification-preferences'
            );
            notificationPreferenceRepository = new NotificationPreferenceRepository(
              rawCosmosClient,
              database.id,
              'notification-preferences'
            );
            server.log.info('✅ Notification preferences repository initialized');
          } catch (prefErr) {
            server.log.warn({ err: prefErr }, '⚠️ Notification preferences repository initialization failed - preferences will use defaults');
          }

          // Initialize notification digest repository
          let notificationDigestRepository: InstanceType<typeof import('./repositories/notification-digest.repository.js').NotificationDigestRepository> | undefined;
          try {
            const { NotificationDigestRepository } = await import('./repositories/notification-digest.repository.js');
            await NotificationDigestRepository.ensureContainer(rawCosmosClient, database.id, 'notification-digests');
            notificationDigestRepository = new NotificationDigestRepository(rawCosmosClient, database.id, 'notification-digests');
            server.log.info('✅ Notification digest repository initialized');
          } catch (digestErr) {
            server.log.warn({ err: digestErr }, '⚠️ Notification digest repository initialization failed - Digest mode will be disabled');
          }

          // Initialize delivery tracking service
          let deliveryTrackingService: InstanceType<typeof import('./services/notifications/delivery-tracking.service.js').DeliveryTrackingService> | undefined;
          try {
            const { DeliveryTrackingService } = await import('@castiel/api-core');
            deliveryTrackingService = new DeliveryTrackingService(
              notificationRepository,
              monitoring,
              {
                maxAttempts: 3,
                initialDelayMs: 1000, // 1 second
                maxDelayMs: 300000, // 5 minutes
                backoffMultiplier: 2,
              }
            );
            server.log.info('✅ Delivery tracking service initialized');
          } catch (trackingErr) {
            server.log.warn({ err: trackingErr }, '⚠️ Delivery tracking service initialization failed - delivery tracking will be disabled');
          }

          // Initialize email notification service if email service is available
          let emailNotificationService: InstanceType<typeof import('./services/notifications/email-notification.service.js').EmailNotificationService> | undefined;
          if (emailService && emailService.isReady()) {
            try {
              const { EmailNotificationService } = await import('@castiel/api-core');
              emailNotificationService = new EmailNotificationService(
                emailService,
                {
                  enabled: true, // Enable email notifications by default
                  sendForTypes: ['success', 'error', 'warning', 'information', 'alert'], // Send for all types
                  skipForLowPriority: false, // Send even for low priority
                  baseUrl: config.frontend.baseUrl || config.api.publicUrl || 'https://app.castiel.ai',
                },
                monitoring,
                deliveryTrackingService // Pass delivery tracking service
              );
              server.log.info('✅ Email notification service initialized');
            } catch (emailErr) {
              server.log.warn({ err: emailErr }, '⚠️ Email notification service initialization failed - notifications will work without email');
            }
          } else {
            server.log.warn('⚠️ Email notification service not initialized - email service not available or not ready');
          }

          // Initialize webhook notification service
          let webhookNotificationService: InstanceType<typeof import('./services/notifications/webhook-notification.service.js').WebhookNotificationService> | undefined;
          try {
            const { WebhookNotificationService } = await import('@castiel/api-core');
            webhookNotificationService = new WebhookNotificationService(
              {
                enabled: true, // Enable webhook notifications by default
                sendForTypes: ['success', 'error', 'warning', 'information', 'alert'], // Send for all types
                skipForLowPriority: false, // Send even for low priority
                defaultTimeout: 5000, // 5 second timeout
                maxRetries: 3,
              },
              monitoring,
              deliveryTrackingService
            );
            server.log.info('✅ Webhook notification service initialized');
          } catch (webhookErr) {
            server.log.warn({ err: webhookErr }, '⚠️ Webhook notification service initialization failed - webhook notifications will be disabled');
          }

          // Initialize Slack notification service
          let slackNotificationService: InstanceType<typeof import('./services/notifications/slack-notification.service.js').SlackNotificationService> | undefined;
          try {
            const { SlackNotificationService } = await import('@castiel/api-core');
            slackNotificationService = new SlackNotificationService(
              {
                enabled: true, // Enable Slack notifications by default
                sendForTypes: ['success', 'error', 'warning', 'information', 'alert'], // Send for all types
                skipForLowPriority: false, // Send even for low priority
                defaultTimeout: 10000, // 10 second timeout
                maxRetries: 3,
              },
              monitoring,
              deliveryTrackingService
            );
            server.log.info('✅ Slack notification service initialized');
          } catch (slackErr) {
            server.log.warn({ err: slackErr }, '⚠️ Slack notification service initialization failed - Slack notifications will be disabled');
          }

          // Initialize Teams notification service
          let teamsNotificationService: InstanceType<typeof import('./services/notifications/teams-notification.service.js').TeamsNotificationService> | undefined;
          try {
            const { TeamsNotificationService } = await import('@castiel/api-core');
            teamsNotificationService = new TeamsNotificationService(
              {
                enabled: true, // Enable Teams notifications by default
                sendForTypes: ['success', 'error', 'warning', 'information', 'alert'], // Send for all types
                skipForLowPriority: false, // Send even for low priority
                defaultTimeout: 10000, // 10 second timeout
                maxRetries: 3,
              },
              monitoring,
              deliveryTrackingService
            );
            server.log.info('✅ Teams notification service initialized');
          } catch (teamsErr) {
            server.log.warn({ err: teamsErr }, '⚠️ Teams notification service initialization failed - Teams notifications will be disabled');
          }

          // Initialize push notification service
          let pushNotificationService: InstanceType<typeof import('./services/notifications/push-notification.service.js').PushNotificationService> | undefined;
          try {
            const { PushNotificationService } = await import('@castiel/api-core');
            pushNotificationService = new PushNotificationService(
              {
                enabled: true, // Enable push notifications by default
                sendForTypes: ['success', 'error', 'warning', 'information', 'alert'], // Send for all types
                skipForLowPriority: false, // Send even for low priority
                vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
                vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
                vapidSubject: process.env.VAPID_SUBJECT || 'mailto:notifications@castiel.ai',
              },
              monitoring,
              deliveryTrackingService
            );
            server.log.info('✅ Push notification service initialized');
          } catch (pushErr) {
            server.log.warn({ err: pushErr }, '⚠️ Push notification service initialization failed - Push notifications will be disabled');
          }

          const notificationService = new NotificationService(
            notificationRepository,
            userService,
            tenantServiceInstance,
            emailNotificationService,
            notificationPreferenceRepository,
            deliveryTrackingService,
            webhookNotificationService,
            slackNotificationService,
            teamsNotificationService,
            notificationDigestRepository,
            pushNotificationService,
            monitoring
          );

          let notificationRealtimeService: InstanceType<typeof NotificationRealtimeService> | undefined;
          if (redisClient) {
            notificationRealtimeService = new NotificationRealtimeService(redisClient, monitoring);
          }

          const notificationController = new NotificationController(
            notificationService,
            notificationRealtimeService,
            pushNotificationService
          );

          server.decorate('notificationController', notificationController);
          server.decorate('notificationService', notificationService);
          server.log.info('✅ Notification service initialized');

          // Update AIConfigService with notification services if available
          if (aiConfigService && userService) {
            aiConfigService.setNotificationServices(notificationService, userService);
            server.log.info('✅ AI Config service updated with notification services');
          }
        }
      } catch (err) {
        server.log.error({ err }, '❌ Notification service initialization failed');
        server.log.error(`Error stack: ${(err as Error)?.stack}`);
        server.log.warn('⚠️ Notification routes will not be available');
      }
    } else {
      server.log.warn('⚠️ Notification service not initialized - missing dependencies');
      if (!cosmosClient) {
        server.log.warn('  - Cosmos DB client missing');
      } else {
        server.log.info('  ✅ Cosmos DB client available');
      }
      if (!userService) {
        server.log.warn('  - User service missing');
      } else {
        server.log.info('  ✅ User service available');
      }
      if (!tenantServiceInstance) {
        server.log.warn('  - Tenant service missing');
      } else {
        server.log.info('  ✅ Tenant service available');
      }
    }

    // Initialize Integration Services (New Container Architecture)
    // Use the shards Cosmos client that's already initialized
    const rawCosmosClient = (server as any).cosmos as CosmosClient | undefined;
    const database = (server as any).cosmosDatabase as Database | undefined;

    if (rawCosmosClient && database && userService && tenantServiceInstance && keyVaultService) {
      try {
        const { IntegrationProviderRepository, IntegrationRepository, IntegrationConnectionRepository } = await import('./repositories/integration.repository.js');
        const { IntegrationProviderService } = await import('./services/integration-provider.service.js');
        const { IntegrationService, AdapterManagerService } = await import('@castiel/api-core');
        const { IntegrationSearchService } = await import('./services/integration-search.service.js');
        const { IntegrationProviderController } = await import('./controllers/integration-provider.controller.js');
        const { IntegrationController } = await import('./controllers/integration.controller.js');
        const { IntegrationSearchController } = await import('./controllers/integration-search.controller.js');

        const databaseId = database.id || config.cosmosDb.databaseId || 'castiel';

        // Initialize repositories
        const providerRepository = new IntegrationProviderRepository(rawCosmosClient, databaseId, 'integration_providers');
        const integrationRepository = new IntegrationRepository(rawCosmosClient, databaseId, 'integrations');
        const connectionRepository = new IntegrationConnectionRepository(rawCosmosClient, databaseId, 'integration-connections');
        
        // Store connectionRepository on server for use by SyncTaskService
        server.decorate('connectionRepository', connectionRepository);

        // Initialize services
        const notificationService = (server as any).notificationService;
        const auditLogService = (server as any).auditLogService;

        const providerService = new IntegrationProviderService(
          providerRepository,
          integrationRepository,
          notificationService,
          auditLogService,
          monitoring
        );

        const integrationService = new IntegrationService(
          integrationRepository,
          providerRepository,
          notificationService,
          auditLogService,
          userService,
          monitoring
        );

        // Initialize IntegrationConnectionService
        const { IntegrationConnectionService } = await import('@castiel/api-core');
        const redisClient = (server as any).redisClient;
        // Encryption key removed - using Key Vault

        // Initialize External User ID Service first (needed by connection service)
        if (!cosmosClient) {
          server.log.warn('⚠️ Integration External User ID Service not initialized - Cosmos DB unavailable');
        } else {
          const { IntegrationExternalUserIdService } = await import('./services/integration-external-user-id.service.js');
          const externalUserIdService = new IntegrationExternalUserIdService({
            userContainer: cosmosClient.getUsersContainer(),
            monitoring,
            adapterManager: undefined, // Will be set after adapterManager is created
            integrationRepository,
            auditLogService,
          });
          server.decorate('externalUserIdService', externalUserIdService);
          server.log.info('✅ IntegrationExternalUserIdService initialized');

          const connectionService = new IntegrationConnectionService({
            monitoring,
            redis: redisClient,
            connectionRepository,
            providerRepository,
            integrationRepository,
            keyVault: keyVaultService,
            notificationService,
            userService,
            externalUserIdService,
            adapterManager: undefined, // Will be set after adapterManager is created
          });

          server.decorate('integrationConnectionService', connectionService);
          server.log.info('✅ IntegrationConnectionService initialized with Key Vault');

          const adapterManager = new AdapterManagerService(
            connectionService,
            monitoring,
            connectionRepository
          );

          // Update externalUserIdService and connectionService with adapterManager
          (externalUserIdService as any).adapterManager = adapterManager;
          (connectionService as any).adapterManager = adapterManager;
          const searchService = new IntegrationSearchService(
            integrationRepository,
            providerRepository,
            adapterManager,
            externalUserIdService
          );

          // Initialize controllers
          const providerController = new IntegrationProviderController(providerService);
          const integrationController = new IntegrationController(integrationService);
          const searchController = new IntegrationSearchController(searchService, integrationService);
          
          // Initialize External User IDs Controller
          const { ExternalUserIdsController } = await import('./controllers/external-user-ids.controller.js');
          const externalUserIdsController = new ExternalUserIdsController(externalUserIdService);
          server.decorate('externalUserIdsController', externalUserIdsController);
          server.log.info('✅ ExternalUserIdsController initialized');

          // Decorate server
          server.decorate('integrationProviderController', providerController);
          server.decorate('integrationController', integrationController);
          server.decorate('integrationSearchController', searchController);
          server.decorate('integrationProviderService', providerService);
          server.decorate('integrationService', integrationService);
          server.decorate('integrationSearchService', searchService);
          server.decorate('adapterManagerService', adapterManager);
          server.decorate('integrationRepository', integrationRepository);

          server.log.info('✅ Integration services initialized');

          // Initialize Sync Task Service (required for webhook-triggered syncs)
          let syncTaskService: InstanceType<typeof import('@castiel/api-core').SyncTaskService> | undefined;
          try {
            const {
              SyncTaskService,
              SyncTaskRepository,
              SyncExecutionRepository,
              SyncConflictRepository,
              ConversionSchemaRepository,
              ConversionSchemaService,
              IntegrationShardService,
              IntegrationDeduplicationService,
              BidirectionalSyncEngine,
            } = await import('@castiel/api-core');
            
            // Get shard repository (should already be initialized)
            const shardRepository = (server as any).shardRepository as import('./repositories/shard.repository.js').ShardRepository | undefined;
            
            if (!shardRepository) {
              server.log.warn('⚠️ SyncTaskService not initialized - ShardRepository not available');
            } else {
              // Initialize repositories
              const syncTaskRepository = new SyncTaskRepository(rawCosmosClient, databaseId, 'sync-tasks');
              const syncExecutionRepository = new SyncExecutionRepository(rawCosmosClient, databaseId, 'sync-executions');
              const syncConflictRepository = new SyncConflictRepository(rawCosmosClient, databaseId, 'sync-conflicts');
              const conversionSchemaRepository = new ConversionSchemaRepository(rawCosmosClient, databaseId, 'conversion-schemas');
              
              // Initialize services
              const conversionSchemaService = new ConversionSchemaService(conversionSchemaRepository, monitoring);
              
              // IntegrationShardService requires SecureCredentialService
              const secureCredentialService = (server as any).secureCredentialService;
              if (!secureCredentialService) {
                server.log.warn('⚠️ SyncTaskService not initialized - SecureCredentialService not available');
              } else {
                // Get ShardRelationshipService (required by IntegrationShardService)
                const relationshipService = (server as any).shardRelationshipService;
                if (!relationshipService) {
                  server.log.warn('⚠️ SyncTaskService not initialized - ShardRelationshipService not available');
                } else {
                  const shardService = new IntegrationShardService(monitoring, shardRepository, relationshipService);
                  const deduplicationService = new IntegrationDeduplicationService(monitoring, shardRepository);
                  const bidirectionalSyncEngine = new BidirectionalSyncEngine(monitoring);
                
                // Get adapter registry (global instance)
                const { adapterRegistry } = await import('./integrations/base-adapter.js');
                
                // Get integrationRepository, connectionRepository, and adapterManagerService (already initialized above)
                const integrationRepository = (server as any).integrationRepository as import('./repositories/integration.repository.js').IntegrationRepository | undefined;
                const connectionRepository = (server as any).connectionRepository as import('./repositories/integration.repository.js').IntegrationConnectionRepository | undefined;
                const adapterManagerService = (server as any).adapterManagerService as import('./services/adapter-manager.service.js').AdapterManagerService | undefined;
                
                // Create SyncTaskService with all dependencies including connectionRepository, integrationRepository, and adapterManagerService
                syncTaskService = new SyncTaskService({
                  monitoring,
                  redis: redisClient || undefined,
                  syncTaskRepository,
                  syncExecutionRepository,
                  syncConflictRepository,
                  conversionSchemaRepository,
                  conversionSchemaService,
                  shardRepository,
                  adapterRegistry,
                  shardService,
                  deduplicationService,
                  bidirectionalSyncEngine,
                  connectionRepository,
                  integrationRepository,
                  adapterManagerService,
                });
                
                server.decorate('syncTaskService', syncTaskService);
                server.log.info('✅ SyncTaskService initialized with connectionRepository');
                }
              }
            }
          } catch (err) {
            server.log.warn({ err }, '⚠️ SyncTaskService not initialized - some features may be unavailable');
          }

          // Initialize Webhook Management Service for incoming webhooks
          try {
            const { WebhookManagementService } = await import('@castiel/api-core');
            const { SyncTaskRepository } = await import('./repositories/sync-task.repository.js');
            const { IntegrationProviderRepository } = await import('./repositories/integration.repository.js');
            const syncTaskRepository = new SyncTaskRepository(rawCosmosClient, databaseId, 'sync-tasks');
            const providerRepository = new IntegrationProviderRepository(rawCosmosClient, databaseId, 'integration_providers');
            
            const webhookBaseUrl = config.api?.publicUrl || process.env.PUBLIC_API_BASE_URL || 'http://localhost:3001';
            const adapterManager = (server as any).adapterManagerService;
            // Use the syncTaskService we just initialized above
            const webhookManagementService = new WebhookManagementService({
              monitoring,
              redis: redisClient || undefined,
              connectionRepository,
              integrationRepository: providerRepository, // Use providerRepository (IntegrationProviderRepository) instead of integrationRepository
              syncTaskRepository,
              webhookUrl: `${webhookBaseUrl}/api/v1/webhooks`,
              eventGridTopicEndpoint: process.env.AZURE_EVENT_GRID_TOPIC_ENDPOINT,
              eventGridAccessKey: process.env.AZURE_EVENT_GRID_ACCESS_KEY,
              adapterManager, // Pass adapter manager for webhook registration
              syncTaskService, // Pass sync task service for triggering syncs from webhooks
            });
            
            server.decorate('webhookManagementService', webhookManagementService);
            server.log.info('✅ Webhook Management Service initialized');
          } catch (err) {
            server.log.warn({ err }, '⚠️ Webhook Management Service not initialized');
          }
        }
      } catch (err) {
        server.log.warn({ err }, '⚠️ Integration services not initialized');
      } finally {
        // No cleanup required here; ensure parser-friendly structure
      }
    } else {
      const missingDeps: string[] = [];
      if (!rawCosmosClient) missingDeps.push('Cosmos DB client');
      if (!database) missingDeps.push('Database');
      if (!userService) missingDeps.push('User service');
      if (!tenantServiceInstance) missingDeps.push('Tenant service');
      if (!keyVaultService) missingDeps.push('Key Vault service');
      
      server.log.warn(`⚠️ Integration services not initialized - missing dependencies: ${missingDeps.join(', ')}`);
      
      // Log which dependencies are available
      if (rawCosmosClient) server.log.debug('  ✅ Cosmos DB client available');
      if (database) server.log.debug('  ✅ Database available');
      if (userService) server.log.debug('  ✅ User service available');
      if (tenantServiceInstance) server.log.debug('  ✅ Tenant service available');
      if (keyVaultService) server.log.debug('  ✅ Key Vault service available');
    }

    // Initialize Email Template Service (after Integration Services)
    try {
      const { EmailTemplateService } = await import('./services/email-template.service.js');
      const { EmailTemplateController } = await import('./controllers/email-template.controller.js');

      // Get raw CosmosClient
      let rawCosmosClient: CosmosClient | undefined;
      let databaseId: string | undefined;

      try {
        rawCosmosClient = cosmosClient?.getClient();
        databaseId = config.cosmosDb.databaseId;
      } catch (err) {
        // Fallback: use shards client if available
        rawCosmosClient = (server as any).cosmos as CosmosClient | undefined;
        databaseId = config.cosmosDb.databaseId;
      }

      if (rawCosmosClient && databaseId) {
        // Get integration services (initialized above)
        const integrationService = (server as any).integrationService;
        const connectionService = (server as any).integrationConnectionService;
        
        const emailTemplateService = new EmailTemplateService(
          rawCosmosClient,
          databaseId,
          integrationService,
          connectionService,
          monitoring
        );
        const emailTemplateController = new EmailTemplateController(emailTemplateService);
        server.decorate('emailTemplateController', emailTemplateController);
        server.log.info('✅ Email template controller initialized');
      } else {
        server.log.warn('⚠️ Email template controller not initialized - Cosmos DB unavailable');
      }
    } catch (err) {
      server.log.warn({ err }, '⚠️ Email template controller not initialized');
    }

    // Register security plugins
    // Security headers configuration for production-ready deployment
    await server.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          frameDest: ["'none'"], // Prevents embedding in frames (clickjacking protection)
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      frameguard: {
        action: 'deny', // Explicitly deny framing (X-Frame-Options: DENY)
      },
      noSniff: true, // X-Content-Type-Options: nosniff
      xssFilter: true, // X-XSS-Protection: 1; mode=block
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      crossOriginEmbedderPolicy: false, // Disabled for compatibility
    });

    // Register compression (early in chain for maximum benefit)
    await server.register(compress, {
      global: true,
      encodings: ['gzip', 'deflate'],
      threshold: 1024, // Only compress responses > 1KB
      requestEncodings: ['gzip', 'deflate', 'identity'],
    });
    server.log.info('✅ Compression middleware registered');

    // Register CORS
    await server.register(cors, {
      origin: config.cors.origin,
      credentials: config.cors.credentials,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'Cache-Control', 'Pragma', 'X-CSRF-Token'],
      exposedHeaders: ['Content-Length', 'X-Request-Id', 'X-CSRF-Token'],
      maxAge: 86400, // 24 hours for preflight cache
    });

    // Register CSRF protection middleware
    registerCsrfMiddleware(server, redisClient);

    // Register multipart/form-data plugin for file uploads
    await server.register(multipart, {
      limits: {
        fileSize: 1024 * 1024 * 500, // 500 MB max file size (overridable per tenant)
        files: 10, // Max 10 files per request for bulk uploads
      },
    });

    // Register WebSocket plugin
    await server.register(websocket);

    // Register Swagger/OpenAPI documentation
    await registerSwagger(server);

    // Register JWT plugin for first-party auth tokens
    const jwtSignOptions: any = {
      issuer: config.jwt.issuer,
      expiresIn: config.jwt.accessTokenExpiry,
    };
    const jwtVerifyOptions: any = {
      issuer: config.jwt.issuer,
    };

    if (config.jwt.audience) {
      jwtSignOptions.audience = config.jwt.audience;
      jwtVerifyOptions.audience = config.jwt.audience;
    }

    await server.register(fastifyJwt, {
      secret: config.jwt.accessTokenSecret,
      sign: jwtSignOptions,
      verify: jwtVerifyOptions,
    });

    // Register GraphQL
    if (config.graphql.enabled) {
      await server.register(mercurius, {
        schema,
        resolvers,
        graphiql: config.graphql.playground,
        path: config.graphql.path,
      });
      server.log.info(`GraphQL endpoint: ${config.graphql.path}`);
      if (config.graphql.playground) {
        server.log.info(`GraphQL playground: ${config.graphql.path}`);
      }
    }

    // Initialize API performance monitoring service
    const apiPerformanceMonitoring = new APIPerformanceMonitoringService(monitoring);
    server.decorate('apiPerformanceMonitoring', apiPerformanceMonitoring);
    server.log.info('✅ API Performance Monitoring service initialized');

    // Register request logger middleware with performance monitoring
    server.addHook('onRequest', requestLogger(monitoring, apiPerformanceMonitoring));

    // Register HTTP response caching middleware (after logger, before routes)
    if (cacheService) {
      registerResponseCacheMiddleware(server, {
        cacheService,
        monitoring,
        defaultTTL: 5 * 60, // 5 minutes
        excludePaths: ['/health', '/ready', '/metrics', '/graphql', '/docs'],
        enableETag: true,
        includeUserContext: true, // Cache per user/tenant for security
      });
    }

    // Decorate server with cache services (for route access)
    if (cacheService) {
      server.decorate('cache', cacheService);
      server.decorate('cacheSubscriber', cacheSubscriber);
    }

    // Decorate server with auth services (for route access)
    server.decorate('tokenValidationCache', tokenValidationCache);
    server.decorate('authenticate', authenticate(tokenValidationCache));
    server.decorate('optionalAuthenticate', optionalAuthenticate(tokenValidationCache));

    // Register routes
    await registerRoutes(server, redisClient);

    // Register error handlers
    server.setErrorHandler(errorHandler(monitoring));
    server.setNotFoundHandler(notFoundHandler);

    // Start listening
    await server.listen({ port: config.port, host: config.host });

    monitoring.trackEvent('service.started', {
      service: 'main-api',
      port: config.port,
      environment: config.nodeEnv,
    });

    server.log.info(`🚀 Main API service running on http://${config.host}:${config.port}`);
    server.log.info(`📊 Environment: ${config.nodeEnv}`);
    server.log.info(`🔍 Log level: ${config.logLevel}`);

  } catch (err) {
    server.log.error(err);
    monitoring.trackException(err as Error, {
      phase: 'startup',
      service: 'main-api',
    });
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (
  signal: string,
  cacheSubscriberInstance: CacheSubscriberService | null,
  lifecycleScheduler: TenantInvitationLifecycleScheduler | null
) => {
  server.log.info(`${signal} received, shutting down gracefully...`);

  try {
    // Shutdown proactive insights event subscriber
    if ((server as any).proactiveInsightsEventSubscriber) {
      await (server as any).proactiveInsightsEventSubscriber.shutdown();
      server.log.info('Proactive insights event subscriber stopped');
    }

    // Shutdown proactive insights worker
    if ((server as any).proactiveInsightsWorker) {
      (server as any).proactiveInsightsWorker.stop();
      server.log.info('Proactive insights worker stopped');
    }

    // Shutdown proactive insights digest worker
    if ((server as any).proactiveInsightsDigestWorker) {
      (server as any).proactiveInsightsDigestWorker.stop();
      server.log.info('Proactive insights digest worker stopped');
    }

    // Shutdown bulk job worker
    if ((server as any).bulkJobWorker) {
      await (server as any).bulkJobWorker.stop();
      server.log.info('Bulk job worker stopped');
    }

    // Shutdown shard embedding change feed processor
    if ((server as any).shardEmbeddingChangeFeedService) {
      await (server as any).shardEmbeddingChangeFeedService.stop();
      server.log.info('Shard embedding change feed processor stopped');
    }

    // Shutdown embedding worker
    if ((server as any).embeddingWorker) {
      await (server as any).embeddingWorker.stop();
      server.log.info('Embedding worker stopped');
    }

    // Shutdown webhook delivery service first (stop processing)
    if (webhookDeliveryServiceInstance) {
      webhookDeliveryServiceInstance.shutdown();
      server.log.info('Webhook delivery service stopped');
    }

    // Shutdown shard event service (closes SSE connections)
    if (shardEventServiceInstance) {
      await shardEventServiceInstance.shutdown();
      server.log.info('Shard event service stopped');
    }

    // Disconnect cache subscriber
    if (cacheSubscriberInstance) {
      await cacheSubscriberInstance.disconnect();
      server.log.info('Cache subscriber disconnected');
    }

    if (cacheManagerInstance) {
      cacheManagerInstance.stopCleanup();
      server.log.info('Cache manager cleanup stopped');
    }

    if (lifecycleScheduler) {
      lifecycleScheduler.stop();
    }

    await server.close();
    server.log.info('Server closed');
    process.exit(0);
  } catch (err) {
    server.log.error({ err }, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT', cacheSubscriberInstance, invitationLifecycleScheduler));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM', cacheSubscriberInstance, invitationLifecycleScheduler));

// Start the server
start();


