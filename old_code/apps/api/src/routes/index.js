import { config } from '../config/env.js';
import { registerHealthRoutes } from './health.js';
import { registerProtectedRoutes } from './protected.js';
import { registerSSERoutes } from './sse.routes.js';
import { widgetCatalogRoutes } from './widget-catalog.routes.js';
import { registerShardTypesRoutes } from './shard-types.routes.js';
import { registerShardsRoutes } from './shards.routes.js';
import { registerACLRoutes } from './acl.routes.js';
import { ACLCacheService } from '../services/acl-cache.service.js';
import { registerRevisionsRoutes } from './revisions.routes.js';
import { registerVectorSearchRoutes } from './vector-search.routes.js';
import { registerEmbeddingRoutes } from './embedding.routes.js';
import { registerEmbeddingTemplateRoutes } from './embedding-template.routes.js';
import { registerEmbeddingTemplateGenerationRoutes } from './embedding-template-generation.routes.js';
import { registerEmbeddingJobRoutes } from './embedding-jobs.routes.js';
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
import { webhookRoutes } from './webhook.routes.js';
import { registerWebhookRoutes } from './webhooks.routes.js';
import { schemaMigrationRoutes } from './schema-migration.routes.js';
import { registerShardBulkRoutes } from './shard-bulk.routes.js';
import { shardRelationshipRoutes, shardRelationshipSubRoutes } from './shard-relationship.routes.js';
import { contextTemplateRoutes } from './context-template.routes.js';
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
import { registerEmailTemplateRoutes } from './email-template.routes.js';
import { ContentGenerationController } from '../controllers/content-generation.controller.js';
import { registerDocumentRoutes } from './document.routes.js';
import { registerCollectionRoutes } from './collection.routes.js';
import { registerDocumentBulkRoutes } from './document-bulk.routes.js';
import { ContentGenerationService } from '../services/content-generation/content-generation.service.js';
import { registerContentGenerationRoutes } from './content-generation.routes.js';
import { TemplateService } from '../services/content-generation/template.service.js';
import { TemplateController } from '../controllers/template.controller.js';
import { registerTemplateRoutes } from './template.routes.js';
import { DocumentTemplateService } from '../services/content-generation/services/document-template.service.js';
import { DocumentTemplateController } from '../controllers/document-template.controller.js';
import { registerDocumentTemplateRoutes } from './document-template.routes.js';
import { PlaceholderPreviewService } from '../services/content-generation/services/placeholder-preview.service.js';
import { DocumentGenerationService } from '../services/content-generation/services/document-generation.service.js';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { registerCollaborationRoutes } from './collaboration.routes.js';
import { registerCollaborativeInsightsRoutes } from './collaborative-insights.routes.js';
import { ShardBulkController } from '../controllers/shard-bulk.controller.js';
import { ShardRelationshipService } from '../services/shard-relationship.service.js';
import { ConversationService } from '../services/conversation.service.js';
import { IntentAnalyzerService } from '../services/intent-analyzer.service.js';
import { InsightService } from '../services/insight.service.js';
import { AzureOpenAIService } from '../services/azure-openai.service.js';
import { ContextTemplateService } from '../services/context-template.service.js';
import { promptsRoutes } from './prompts.routes.js';
import { authenticate } from '../middleware/authenticate.js';
import { UnauthorizedError } from '../middleware/error-handler.js';
import { registerProjectResolverRoutes } from './project-resolver.routes.js';
import { registerMemoryRoutes } from './memory.routes.js';
import { MemoryController } from '../controllers/memory.controller.js';
import { createMemoryContextService } from '../services/memory-context.service.js';
import { registerOnboardingRoutes } from './onboarding.routes.js';
import { OnboardingController } from '../controllers/onboarding.controller.js';
import { OnboardingService } from '../services/onboarding.service.js';
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
import { registerRiskAnalysisRoutes } from './risk-analysis.routes.js';
import { registerQuotaRoutes } from './quotas.routes.js';
import { registerTeamRoutes } from './teams.routes.js';
import { registerSimulationRoutes } from './simulation.routes.js';
import { registerBenchmarksRoutes } from './benchmarks.routes.js';
import { registerOpportunityRoutes } from './opportunity.routes.js';
import { registerPipelineRoutes } from './pipeline.routes.js';
import { RevisionRepository } from '../repositories/revision.repository.js';
import { getRouteRegistrationTracker } from '../utils/route-registration-tracker.js';
/**
 * Register all application routes
 */
export async function registerRoutes(server, redis) {
    const tracker = getRouteRegistrationTracker();
    // Health check routes (public)
    await registerHealthRoutes(server, redis, monitoring);
    tracker.record('Health', true, { prefix: '/health' });
    // Core authentication routes
    if (server.authController) {
        await server.register(async (authServer) => {
            await registerAuthRoutes(authServer);
        }, { prefix: '/api/v1' });
        server.log.info('✅ Auth routes registered');
        tracker.record('Auth', true, {
            prefix: '/api/v1',
            dependencies: ['authController', 'UserService', 'TenantService', 'Redis']
        });
    }
    else {
        server.log.warn('⚠️  Auth routes not registered - AuthController missing');
        tracker.record('Auth', false, {
            prefix: '/api/v1',
            reason: 'AuthController missing',
            dependencies: ['authController']
        });
    }
    // MFA routes rely on decorated controller
    if (server.mfaController) {
        await server.register(async (mfaServer) => {
            await registerMFARoutes(mfaServer);
        }, { prefix: '/api/v1' });
        server.log.info('✅ MFA routes registered');
        tracker.record('MFA', true, {
            prefix: '/api/v1',
            dependencies: ['mfaController', 'MFAService', 'Redis']
        });
    }
    else {
        server.log.warn('⚠️  MFA routes not registered - MFAController missing');
        tracker.record('MFA', false, {
            prefix: '/api/v1',
            reason: 'MFAController missing',
            dependencies: ['mfaController']
        });
    }
    // MFA Audit routes
    if (server.mfaAuditController) {
        try {
            const { registerMFAAuditRoutes } = await import('./mfa-audit.routes.js');
            await registerMFAAuditRoutes(server);
            server.log.info('✅ MFA Audit routes registered');
            tracker.record('MFA Audit', true, {
                prefix: '/api/v1',
                dependencies: ['mfaAuditController', 'CosmosDB']
            });
        }
        catch (err) {
            server.log.warn({ err }, '⚠️ MFA Audit routes not registered');
            tracker.record('MFA Audit', false, {
                prefix: '/api/v1',
                reason: err instanceof Error ? err.message : 'Import or registration failed',
                dependencies: ['mfaAuditController']
            });
        }
    }
    else {
        server.log.debug('⚠️ MFA Audit routes not registered - MFAAuditController not available');
        tracker.record('MFA Audit', false, {
            prefix: '/api/v1',
            reason: 'MFAAuditController not available',
            dependencies: ['mfaAuditController']
        });
    }
    // Magic link routes (passwordless authentication)
    if (server.magicLinkController) {
        await server.register(async (mlServer) => {
            await registerMagicLinkRoutes(mlServer);
        }, { prefix: '/api/v1' });
        server.log.info('✅ Magic link routes registered');
        tracker.record('Magic Link', true, {
            prefix: '/api/v1',
            dependencies: ['magicLinkController', 'MagicLinkService', 'EmailService', 'Redis']
        });
    }
    else {
        server.log.warn('⚠️  Magic link routes not registered - MagicLinkController missing');
        tracker.record('Magic Link', false, {
            prefix: '/api/v1',
            reason: 'MagicLinkController missing',
            dependencies: ['magicLinkController']
        });
    }
    // SSO/SAML routes
    if (server.ssoController) {
        await server.register(async (ssoServer) => {
            await registerSSORoutes(ssoServer);
        }, { prefix: '/api/v1' });
        server.log.info('✅ SSO routes registered');
        tracker.record('SSO', true, {
            prefix: '/api/v1',
            dependencies: ['ssoController', 'SAMLService', 'CosmosDB']
        });
    }
    else {
        server.log.warn('⚠️  SSO routes not registered - SSOController missing');
        tracker.record('SSO', false, {
            prefix: '/api/v1',
            reason: 'SSOController missing',
            dependencies: ['ssoController']
        });
    }
    // SSO Configuration routes (admin)
    if (server.ssoConfigController) {
        await server.register(async (ssoConfigServer) => {
            registerSSOConfigRoutes(ssoConfigServer, server.ssoConfigController);
        }, { prefix: '/api/v1' });
        server.log.info('✅ SSO config routes registered');
        tracker.record('SSO Config', true, {
            prefix: '/api/v1',
            dependencies: ['ssoConfigController', 'SSOConfigService', 'CosmosDB']
        });
    }
    else {
        server.log.warn('⚠️  SSO config routes not registered - SSOConfigController missing');
        tracker.record('SSO Config', false, {
            prefix: '/api/v1',
            reason: 'SSOConfigController missing',
            dependencies: ['ssoConfigController']
        });
    }
    // Azure AD B2C routes
    if (server.azureADB2CController) {
        await server.register(async (b2cServer) => {
            registerAzureADB2CRoutes(b2cServer, server.azureADB2CController);
        }, { prefix: '/api/v1' });
        server.log.info('✅ Azure AD B2C routes registered');
        tracker.record('Azure AD B2C', true, {
            prefix: '/api/v1',
            dependencies: ['azureADB2CController', 'AzureADB2CService']
        });
    }
    else {
        server.log.warn('⚠️  Azure AD B2C routes not registered - AzureADB2CController missing');
        tracker.record('Azure AD B2C', false, {
            prefix: '/api/v1',
            reason: 'AzureADB2CController missing',
            dependencies: ['azureADB2CController']
        });
    }
    if (server.oauthController) {
        await server.register(async (oauthServer) => {
            await registerOAuthRoutes(oauthServer);
        }, { prefix: '/api/v1' });
        server.log.info('✅ OAuth routes registered');
        tracker.record('OAuth', true, {
            prefix: '/api/v1',
            dependencies: ['oauthController', 'OAuthService']
        });
    }
    else {
        server.log.warn('⚠️  OAuth routes not registered - OAuthController missing');
        tracker.record('OAuth', false, {
            prefix: '/api/v1',
            reason: 'OAuthController missing',
            dependencies: ['oauthController']
        });
    }
    if (server.oauth2Controller) {
        await server.register(async (oauth2Server) => {
            await registerOAuth2Routes(oauth2Server);
        }, { prefix: '/api/v1' });
        server.log.info('✅ OAuth2 routes registered');
        tracker.record('OAuth2', true, {
            prefix: '/api/v1',
            dependencies: ['oauth2Controller', 'OAuth2AuthService', 'CosmosDB']
        });
    }
    else {
        server.log.warn('⚠️  OAuth2 routes not registered - OAuth2Controller missing');
        tracker.record('OAuth2', false, {
            prefix: '/api/v1',
            reason: 'OAuth2Controller missing',
            dependencies: ['oauth2Controller']
        });
    }
    if (server.userManagementController) {
        await registerUserManagementRoutes(server);
        server.log.info('✅ User management routes registered');
        tracker.record('User Management', true, {
            prefix: '/api/v1',
            dependencies: ['userManagementController', 'UserManagementService', 'CosmosDB']
        });
    }
    else {
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
    }
    else {
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
    }
    else {
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
    }
    else {
        server.log.warn('⚠️  Session management routes not registered - controller missing');
        tracker.record('Session Management', false, {
            prefix: '/api/v1',
            reason: 'sessionManagementController missing',
            dependencies: ['sessionManagementController']
        });
    }
    if (server.roleManagementController) {
        await registerRoleManagementRoutes(server);
        server.log.info('✅ Role management routes registered');
        tracker.record('Role Management', true, {
            prefix: '/api/v1',
            dependencies: ['roleManagementController', 'RoleManagementService', 'CosmosDB']
        });
    }
    else {
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
    }
    else {
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
    }
    else {
        server.log.warn('⚠️  Tenant membership routes not registered - controller missing');
        tracker.record('Tenant Membership', false, {
            prefix: '/api/v1',
            reason: 'tenantMembershipController missing',
            dependencies: ['tenantMembershipController']
        });
    }
    // Audit log routes (requires Cosmos DB)
    const cosmosClient = server.cosmos || server.cosmosClient;
    const cosmosDatabase = server.cosmosDatabase;
    if (cosmosClient || cosmosDatabase) {
        try {
            await auditLogRoutes(server);
            server.log.info('✅ Audit log routes registered');
            tracker.record('Audit Logs', true, {
                prefix: '/api/v1',
                dependencies: ['CosmosDB']
            });
        }
        catch (err) {
            server.log.warn({ err }, '⚠️ Audit log routes not registered');
            tracker.record('Audit Logs', false, {
                prefix: '/api/v1',
                reason: err instanceof Error ? err.message : 'Registration failed',
                dependencies: ['CosmosDB']
            });
        }
    }
    else {
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
        }
        catch (err) {
            server.log.error({ err }, '❌ Notification routes registration failed');
            server.log.error({ error: err }, 'Error details');
            tracker.record('Notifications', false, {
                prefix: '/api/v1',
                reason: err instanceof Error ? err.message : 'Registration failed',
                dependencies: ['notificationController']
            });
        }
    }
    else {
        server.log.warn('⚠️  Notification routes not registered - controller missing');
        server.log.warn({ decorators: Object.keys(server).filter(k => !k.startsWith('_') && k !== 'log').slice(0, 10) }, 'Available server decorators');
        tracker.record('Notifications', false, {
            prefix: '/api/v1',
            reason: 'notificationController missing',
            dependencies: ['notificationController']
        });
    }
    // Protected routes (require authentication)
    await registerProtectedRoutes(server, server.tokenValidationCache || null);
    server.log.info('✅ Protected routes registered');
    tracker.record('Protected Routes', true, {
        prefix: '/api/v1',
        dependencies: ['tokenValidationCache']
    });
    // Get monitoring service from server or create new instance
    const monitoring = MonitoringService.getInstance() || MonitoringService.initialize({
        enabled: false,
        provider: 'mock',
    });
    // Initialize Conversation Event Subscriber Service (if Redis available)
    let conversationEventSubscriber = undefined;
    if (redis) {
        const { ConversationEventSubscriberService } = await import('../services/conversation-event-subscriber.service.js');
        conversationEventSubscriber = new ConversationEventSubscriberService(redis, monitoring);
        await conversationEventSubscriber.initialize();
        server.log.info('✅ Conversation Event Subscriber Service initialized');
    }
    // SSE routes (require authentication)
    await registerSSERoutes(server, server.tokenValidationCache || null, conversationEventSubscriber);
    server.log.info('✅ SSE routes registered');
    tracker.record('SSE', true, {
        prefix: '/api/v1',
        dependencies: ['tokenValidationCache', 'Redis']
    });
    // WebSocket routes (require authentication)
    const { registerWebSocketRoutes } = await import('./websocket.routes.js');
    await registerWebSocketRoutes(server, server.tokenValidationCache || null);
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
            }
            catch (error) {
                // Log auth errors for debugging (without sensitive data)
                const errorMessage = error instanceof Error ? error.message : String(error);
                const statusCode = error && typeof error === 'object' && 'statusCode' in error ? error.statusCode : undefined;
                const errorName = error && typeof error === 'object' && 'name' in error ? error.name : undefined;
                server.log.error({
                    url,
                    errorMessage,
                    statusCode,
                    errorName,
                }, 'Authentication failed');
                // Ensure we have a proper error with message
                if (error?.statusCode === 401) {
                    // Re-throw with proper message
                    const authError = error instanceof UnauthorizedError
                        ? error
                        : new UnauthorizedError(errorMessage);
                    throw authError;
                }
                // Log unexpected errors
                if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode !== 401) {
                    request.log.error({ url, error: errorMessage }, 'Unexpected authentication error');
                }
                // Re-throw to let Fastify error handler respond
                throw error;
            }
        }
    });
    server.log.info('✅ Global authentication hook added for /api/v1/* routes');
    // ShardTypes API routes
    // EnrichmentService will be initialized later after AzureOpenAIService is available
    // For now, pass undefined - the controller will handle it gracefully
    // EnrichmentService can be initialized later and retrieved from server if needed
    const shardRepositoryForShardTypes = server.shardRepository;
    await registerShardTypesRoutes(server, monitoring, undefined, shardRepositoryForShardTypes);
    server.log.info('✅ ShardTypes routes registered');
    tracker.record('ShardTypes', true, {
        prefix: '/api/v1',
        dependencies: ['ShardTypeRepository', 'CosmosDB']
    });
    // Document Management routes
    if (server.documentController) {
        await registerDocumentRoutes(server);
        server.log.info('✅ Document management routes registered');
        tracker.record('Documents', true, {
            prefix: '/api/v1',
            dependencies: ['documentController', 'AzureBlobStorage', 'CosmosDB']
        });
    }
    else {
        server.log.warn('⚠️  Document management routes not registered - controller missing');
        tracker.record('Documents', false, {
            prefix: '/api/v1',
            reason: 'documentController missing',
            dependencies: ['documentController']
        });
    }
    // Bulk Document Operations routes
    // Note: documentBulkController is initialized in index.ts if cosmosDatabase and documentController are available
    const documentBulkController = server.documentBulkController;
    if (documentBulkController) {
        try {
            await registerDocumentBulkRoutes(server, documentBulkController);
            server.log.info('✅ Bulk document operations routes registered');
            tracker.record('Bulk Documents', true, {
                prefix: '/api/v1',
                dependencies: ['documentBulkController', 'CosmosDB', 'ShardRepository']
            });
        }
        catch (err) {
            server.log.warn({ err }, '⚠️  Bulk document operations routes failed to register');
            tracker.record('Bulk Documents', false, {
                prefix: '/api/v1',
                reason: err instanceof Error ? err.message : 'Registration failed',
                dependencies: ['documentBulkController']
            });
        }
    }
    else {
        // Check why controller wasn't initialized
        const cosmosDatabase = server.cosmosDatabase;
        const documentController = server.documentController;
        const missing = [];
        if (!cosmosDatabase) {
            missing.push('Cosmos DB database');
        }
        if (!documentController) {
            missing.push('Document controller');
        }
        if (missing.length > 0) {
            server.log.debug(`ℹ️  Bulk document operations routes not registered - ${missing.join(' and ')} not available`);
            tracker.record('Bulk Documents', false, {
                prefix: '/api/v1',
                reason: `${missing.join(' and ')} not available`,
                dependencies: ['documentBulkController', 'CosmosDB', 'documentController']
            });
            // Try to initialize if we have the prerequisites
            if (cosmosDatabase && documentController && server.shardRepository) {
                try {
                    const { BulkJobRepository } = await import('../repositories/bulk-job.repository.js');
                    const { BulkDocumentService } = await import('../services/bulk-document.service.js');
                    const { DocumentBulkController } = await import('../controllers/document-bulk.controller.js');
                    const { config } = await import('../config/env.js');
                    const bulkJobsContainer = cosmosDatabase.container(config.cosmosDb.containers.bulkJobs);
                    const monitoring = MonitoringService.getInstance() || MonitoringService.initialize({ enabled: false, provider: 'mock' });
                    const bulkJobRepository = new BulkJobRepository(bulkJobsContainer, monitoring);
                    const bulkDocumentService = new BulkDocumentService(bulkJobRepository, server.shardRepository, null, server.auditWebhookEmitter || undefined, monitoring);
                    const newDocumentBulkController = new DocumentBulkController(bulkDocumentService, monitoring);
                    server.decorate('bulkDocumentService', bulkDocumentService);
                    server.decorate('documentBulkController', newDocumentBulkController);
                    await registerDocumentBulkRoutes(server, newDocumentBulkController);
                    server.log.info('✅ Bulk document operations routes registered (initialized during route registration)');
                    tracker.record('Bulk Documents', true, {
                        prefix: '/api/v1',
                        dependencies: ['documentBulkController', 'CosmosDB', 'ShardRepository']
                    });
                }
                catch (initErr) {
                    server.log.warn({ err: initErr }, '⚠️  Failed to initialize bulk document operations during route registration');
                    tracker.record('Bulk Documents', false, {
                        prefix: '/api/v1',
                        reason: initErr instanceof Error ? initErr.message : 'Initialization failed',
                        dependencies: ['documentBulkController', 'CosmosDB', 'ShardRepository']
                    });
                }
            }
        }
        else {
            server.log.debug('ℹ️  Bulk document operations routes not registered - controller not initialized');
            tracker.record('Bulk Documents', false, {
                prefix: '/api/v1',
                reason: 'Controller not initialized',
                dependencies: ['documentBulkController']
            });
        }
    }
    // Collection Management routes
    if (server.collectionController) {
        await registerCollectionRoutes(server);
        server.log.info('✅ Collection management routes registered');
        tracker.record('Collections', true, {
            prefix: '/api/v1',
            dependencies: ['collectionController', 'CosmosDB']
        });
    }
    else {
        server.log.warn('⚠️  Collection management routes not registered - controller missing');
        tracker.record('Collections', false, {
            prefix: '/api/v1',
            reason: 'collectionController missing',
            dependencies: ['collectionController']
        });
    }
    // Shards API routes (with caching)
    const cacheService = server.cache;
    const cacheSubscriber = server.cacheSubscriber;
    if (cacheService && cacheSubscriber) {
        await registerShardsRoutes(server, monitoring, cacheService, cacheSubscriber);
        server.log.info('✅ Shards routes registered (with caching)');
        tracker.record('Shards', true, {
            prefix: '/api/v1',
            dependencies: ['ShardRepository', 'CacheService', 'CosmosDB']
        });
        // Shard Bulk Operations routes
        const shardCacheService = server.shardCache;
        // Get Phase 2 services from server if available
        const redactionService = server.redactionService;
        const auditTrailService = server.auditTrailService;
        const shardRepository = new ShardRepository(monitoring, shardCacheService, undefined, // queueService - not needed here
        redactionService, auditTrailService);
        // Store shardRepository on server for use by other routes
        server.shardRepository = shardRepository;
        const eventService = server.shardEventService;
        const bulkController = new ShardBulkController(shardRepository, eventService);
        registerShardBulkRoutes(server, bulkController);
        server.log.info('✅ Shard bulk routes registered');
        tracker.record('Shard Bulk', true, {
            prefix: '/api/v1',
            dependencies: ['ShardRepository', 'CacheService', 'EventService']
        });
        // Collaboration/Y.js routes
        await registerCollaborationRoutes(server, monitoring, shardRepository);
        server.log.info('✅ Collaboration routes registered');
        tracker.record('Collaboration', true, {
            prefix: '/api/v1',
            dependencies: ['ShardRepository', 'CacheService', 'CosmosDB']
        });
        // Collaborative Insights routes
        try {
            const { createCollaborativeInsightsService } = await import('../services/collaborative-insights.service.js');
            const { CollaborativeInsightsController } = await import('../controllers/collaborative-insights.controller.js');
            const { CollaborativeInsightsRepository } = await import('../repositories/collaborative-insights.repository.js');
            // Get Cosmos DB client from server
            // Check multiple possible property names for Cosmos DB client
            let cosmosClient = server.cosmos;
            let databaseId;
            // Try to get database ID from cosmosDatabase object
            const cosmosDatabase = server.cosmosDatabase;
            if (cosmosDatabase) {
                // Database object has an 'id' property
                databaseId = cosmosDatabase.id;
                // If cosmosDatabase is a Database object, we can also get the client from it
                if (!cosmosClient && cosmosDatabase.client) {
                    cosmosClient = cosmosDatabase.client;
                }
            }
            // Fallback: try other property names
            if (!cosmosClient) {
                cosmosClient = server.cosmosClient || server.shardsCosmosClient;
            }
            if (!databaseId) {
                databaseId = server.cosmosDatabaseId;
                // Try to get from config as last resort
                if (!databaseId) {
                    try {
                        const { config } = await import('../config/env.js');
                        databaseId = config.cosmosDb?.databaseId;
                    }
                    catch (configErr) {
                        // Ignore config import errors
                    }
                }
            }
            if (cosmosClient && databaseId) {
                try {
                    // Initialize repository
                    const containerId = process.env.COSMOS_DB_COLLABORATION_CONTAINER || 'collaborative-insights';
                    await CollaborativeInsightsRepository.ensureContainer(cosmosClient, databaseId, containerId);
                    const collaborativeInsightsRepository = new CollaborativeInsightsRepository(cosmosClient, databaseId, containerId);
                    // Initialize service with repository and Redis cache
                    // Use the redis parameter from function signature (passed as argument to registerRoutes)
                    const collaborativeInsightsService = createCollaborativeInsightsService(collaborativeInsightsRepository, redis || null, // Use function parameter 'redis', not local variable
                    monitoring);
                    const collaborativeInsightsController = new CollaborativeInsightsController(collaborativeInsightsService);
                    await registerCollaborativeInsightsRoutes(server, collaborativeInsightsController);
                    server.log.info('✅ Collaborative Insights routes registered (with Cosmos DB + Redis cache)');
                }
                catch (initErr) {
                    server.log.warn({ err: initErr }, '⚠️ Collaborative Insights routes failed to initialize - repository or service error');
                }
            }
            else {
                // This is expected if Cosmos DB is not configured
                const missing = [];
                if (!cosmosClient) {
                    missing.push('Cosmos DB client');
                }
                if (!databaseId) {
                    missing.push('database ID');
                }
                server.log.debug(`ℹ️  Collaborative Insights routes not registered - ${missing.join(' and ')} not available (requires Cosmos DB configuration)`);
            }
        }
        catch (err) {
            server.log.warn({ err }, '⚠️ Collaborative Insights routes failed to register');
        }
        // Shard Relationship routes
        await server.register(shardRelationshipRoutes, {
            prefix: '/api/v1/relationships',
            monitoring,
            shardRepository,
        });
        await server.register(shardRelationshipSubRoutes, {
            prefix: '/api/v1/shards',
            monitoring,
            shardRepository,
        });
        server.log.info('✅ Shard relationship routes registered');
        // Context Template / AI routes
        const shardTypeRepo = new ShardTypeRepository(monitoring);
        // Expose ShardTypeRepository for downstream route modules
        server.decorate('shardTypeRepository', shardTypeRepo);
        const relationshipService = new ShardRelationshipService(monitoring, shardRepository);
        await relationshipService.initialize();
        // Expose relationshipService for downstream route modules (e.g., Risk Analysis)
        server.decorate('relationshipService', relationshipService);
        // Get Redis from server cache (may be different from function parameter)
        const serverRedis = server.cache;
        await server.register(contextTemplateRoutes, {
            prefix: '/api/v1/ai',
            monitoring,
            shardRepository,
            shardTypeRepository: shardTypeRepo,
            relationshipService,
            redis: serverRedis || redis || undefined,
        });
        server.log.info('✅ Context template routes registered');
        // Also register templates route at root level for backward compatibility
        // Add authentication hook for root-level routes
        await server.register(async (rootServer) => {
            // Add authentication hook for root-level template routes
            const authDecorator = server.authenticate;
            const tokenValidationCache = server.tokenValidationCache;
            if (authDecorator) {
                rootServer.addHook('onRequest', async (request, reply) => {
                    if (request.url.startsWith('/templates') || request.url.startsWith('/context')) {
                        await authDecorator(request, reply);
                    }
                });
            }
            await rootServer.register(contextTemplateRoutes, {
                monitoring,
                shardRepository,
                shardTypeRepository: shardTypeRepo,
                relationshipService,
                redis: serverRedis || redis || undefined,
            });
        });
        server.log.info('✅ Root-level template routes registered');
        // Phase 2: Project Resolver routes
        try {
            const { ContextAssemblyService } = await import('../services/ai-context-assembly.service.js');
            const { CosmosDBService } = await import('../services/cosmos-db.service.js');
            const { CacheService } = await import('../services/cache.service.js');
            const { VectorSearchService } = await import('../services/vector-search.service.js');
            const { ShardLinkingService } = await import('../services/shard-linking.service.js');
            const { ProjectActivityService } = await import('../services/project-activity.service.js');
            const { PerformanceMonitoringService } = await import('../services/performance-monitoring.service.js');
            // Initialize ContextAssemblyService dependencies
            const cosmosDB = new CosmosDBService();
            // CacheService needs Redis and monitoring, but Redis might be null
            // Use the redis from function parameter (not the local variable)
            const localRedis = redis || undefined;
            const cacheService = localRedis ? new CacheService(localRedis, monitoring) : null;
            // Initialize TenantProjectConfigService for tenant-specific token limits
            const { TenantProjectConfigService } = await import('../services/tenant-project-config.service.js');
            const tenantProjectConfigService = new TenantProjectConfigService(cosmosDB, cacheService);
            const vectorSearchService = server.vectorSearchService;
            const shardLinkingService = new ShardLinkingService(shardRepository, monitoring);
            const projectActivityService = new ProjectActivityService(monitoring, shardRepository);
            const performanceMonitoring = new PerformanceMonitoringService(monitoring);
            // Create ContextAssemblyService instance
            // ContextAssemblyService requires 7 arguments including monitoring
            let contextAssemblyService;
            if (cacheService && vectorSearchService) {
                contextAssemblyService = new ContextAssemblyService(cosmosDB, cacheService, vectorSearchService, shardLinkingService, projectActivityService, performanceMonitoring, monitoring);
                // Store for later use if needed
                server.contextAssemblyService = contextAssemblyService;
            }
            // Register project resolver routes only if contextAssemblyService was created
            if (contextAssemblyService) {
                await registerProjectResolverRoutes(server, monitoring, cacheService, server.cacheSubscriber || null, contextAssemblyService);
                server.log.info('✅ Project resolver routes registered (Phase 2)');
            }
            else {
                server.log.warn('⚠️ Project resolver routes skipped - ContextAssemblyService not available (cacheService or vectorSearchService missing)');
            }
        }
        catch (err) {
            server.log.warn({ err }, '⚠️ Project resolver routes failed to register');
        }
        // Phase 2: Redaction Configuration routes
        try {
            const { registerRedactionRoutes } = await import('./redaction.routes.js');
            await registerRedactionRoutes(server, monitoring);
            server.log.info('✅ Redaction configuration routes registered (Phase 2)');
        }
        catch (err) {
            server.log.warn({ err }, '⚠️ Redaction routes failed to register');
        }
        // Phase 2: Audit Trail routes
        try {
            const { registerPhase2AuditTrailRoutes } = await import('./phase2-audit-trail.routes.js');
            await registerPhase2AuditTrailRoutes(server, monitoring);
            server.log.info('✅ Phase 2 Audit Trail routes registered');
        }
        catch (err) {
            server.log.warn({ err }, '⚠️ Phase 2 Audit Trail routes failed to register');
        }
        // Phase 2: Metrics routes
        try {
            const { registerPhase2MetricsRoutes } = await import('./phase2-metrics.routes.js');
            await registerPhase2MetricsRoutes(server, monitoring);
            server.log.info('✅ Phase 2 Metrics routes registered');
        }
        catch (err) {
            server.log.warn({ err }, '⚠️ Phase 2 Metrics routes failed to register');
        }
        // AI Insights routes
        try {
            // Get vectorSearchService if available (for RAG retrieval)
            const vectorSearchServiceForContext = server.vectorSearchService;
            const contextTemplateService = new ContextTemplateService(monitoring, shardRepository, shardTypeRepo, relationshipService, redis || undefined, undefined, // unifiedAIClient - will be set later
            undefined, // aiConnectionService - will be set later
            vectorSearchServiceForContext // Optional: for RAG retrieval
            );
            // Note: unifiedAIClient and aiConnectionService are initialized later
            // They will be passed to ConversationService after initialization
            let conversationService;
            // Initialize ConversionService for PDF export (available early)
            const { ConversionService } = await import('../services/content-generation/conversion.service.js');
            const conversionService = new ConversionService(monitoring);
            server.log.info('✅ Conversion Service initialized');
            // Initialize Conversation Realtime Service (if Redis available) - early initialization
            let conversationRealtimeService = undefined;
            if (redis) {
                const { ConversationRealtimeService } = await import('../services/conversation-realtime.service.js');
                conversationRealtimeService = new ConversationRealtimeService(redis, monitoring);
                server.log.info('✅ Conversation Realtime Service initialized (early)');
            }
            // Get NotificationService and UserService if available (for conversation notifications)
            const notificationService = server.notificationService;
            const userService = server.userService;
            // Initialize ConversationService first (with conversion service, without AI services yet)
            conversationService = new ConversationService(monitoring, shardRepository, shardTypeRepo, redis || undefined, undefined, // unifiedAIClient - will be set later
            undefined, // aiConnectionService - will be set later
            conversionService, undefined, // shardRelationshipService - will be set later
            conversationRealtimeService, notificationService, // NotificationService - optional for notifications
            userService // UserService - optional for user lookups
            );
            // Note: intentAnalyzer will be re-initialized later with AI services if available
            let intentAnalyzer = new IntentAnalyzerService(monitoring, shardRepository, shardTypeRepo, redis || undefined);
            // Initialize Azure OpenAI service (requires config)
            const azureOpenAI = new AzureOpenAIService({
                endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
                apiKey: process.env.AZURE_OPENAI_API_KEY || '',
                deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o',
            }, monitoring);
            // Store azureOpenAI on server for use by other services
            server.decorate('azureOpenAI', azureOpenAI);
            // Initialize EnrichmentService now that AzureOpenAIService is available
            const cosmosDatabase = server.cosmosDatabase;
            if (cosmosDatabase && redis) {
                try {
                    const { EnrichmentService } = await import('../services/enrichment.service.js');
                    const { config } = await import('../config/env.js');
                    const shardsContainer = cosmosDatabase.container(config.cosmosDb.containers.shards || 'shards');
                    const enrichmentService = new EnrichmentService(shardsContainer, redis, azureOpenAI, monitoring);
                    server.decorate('enrichmentService', enrichmentService);
                    server.log.info('✅ EnrichmentService initialized');
                }
                catch (err) {
                    server.log.warn({ err }, '⚠️ EnrichmentService not initialized - enrichment features will be unavailable');
                }
            }
            // Initialize Embedding Services Infrastructure
            let embeddingTemplateService = undefined;
            let embeddingService = undefined;
            let shardEmbeddingService = undefined;
            let vectorSearchService = undefined;
            let shardEmbeddingChangeFeedService = undefined;
            // Declare queueService at function scope for later use in document generation
            let queueService = undefined;
            const hasCosmosEmbeddingConfig = Boolean(process.env.COSMOS_DB_ENDPOINT && process.env.COSMOS_DB_KEY);
            // Initialize CosmosDbClient if needed (used by both embedding and web search services)
            let cosmosDbClient = undefined;
            if (hasCosmosEmbeddingConfig) {
                try {
                    const { CosmosDbClient } = await import('../services/auth/cosmos-db.service.js');
                    const { config } = await import('../config/env.js');
                    const monitoring = MonitoringService.getInstance() || MonitoringService.initialize({
                        connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING || '',
                    });
                    cosmosDbClient = new CosmosDbClient({
                        endpoint: config.cosmosDb.endpoint,
                        key: config.cosmosDb.key,
                        database: config.cosmosDb.databaseId,
                        usersContainer: config.cosmosDb.containers.users || 'users', // Required field
                        rolesContainer: config.cosmosDb.containers.roles,
                        tenantsContainer: config.cosmosDb.containers.tenants,
                        ssoConfigsContainer: config.cosmosDb.containers.ssoConfigs,
                        oauth2ClientsContainer: config.cosmosDb.containers.oauth2Clients,
                        joinRequestsContainer: config.cosmosDb.containers.joinRequests,
                        tenantInvitationsContainer: config.cosmosDb.containers.tenantInvitations,
                    }, monitoring);
                }
                catch (err) {
                    server.log.warn({ err }, '⚠️ Failed to initialize CosmosDbClient for embedding services');
                }
            }
            if (hasCosmosEmbeddingConfig) {
                try {
                    // Import embedding services
                    const { EmbeddingTemplateService } = await import('../services/embedding-template.service.js');
                    const { EmbeddingService } = await import('../services/ai-insights/embedding.service.js');
                    const { ShardEmbeddingService } = await import('../services/shard-embedding.service.js');
                    const { VectorSearchService } = await import('../services/vector-search.service.js');
                    const { VectorSearchCacheService } = await import('../services/vector-search-cache.service.js');
                    const { ACLService } = await import('../services/acl.service.js');
                    const { ShardEmbeddingChangeFeedService } = await import('../services/embedding-processor/change-feed.service.js');
                    // Get Cosmos containers
                    // Use the database from cosmosDbClient to get the shards container
                    const database = cosmosDbClient.getDatabase();
                    // config is already imported at the top of the file
                    const shardsContainer = database.container(config.cosmosDb.containers.shards);
                    // Initialize EmbeddingTemplateService (takes only monitoring)
                    embeddingTemplateService = new EmbeddingTemplateService(monitoring);
                    server.log.info('✅ Embedding Template service initialized');
                    // Initialize EmbeddingService (uses Azure OpenAI)
                    embeddingService = new EmbeddingService(monitoring, process.env.AZURE_OPENAI_ENDPOINT || undefined, process.env.AZURE_OPENAI_API_KEY || undefined, process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'text-embedding-ada-002');
                    server.log.info('✅ Embedding service initialized');
                    // Initialize ACLService for vector search filtering
                    // ACLService needs ACLCacheService, not ShardRepository directly
                    let aclCacheService = null;
                    if (redis && server.cache && server.cacheSubscriber) {
                        aclCacheService = new ACLCacheService(server.cache, server.cacheSubscriber, monitoring);
                    }
                    const aclService = new ACLService(shardRepository, aclCacheService, monitoring);
                    // Initialize VectorSearchCacheService if Redis available
                    let vectorSearchCacheService = undefined;
                    if (redis) {
                        vectorSearchCacheService = new VectorSearchCacheService(redis, monitoring);
                        server.log.info('✅ Vector Search Cache service initialized');
                    }
                    // Get Phase 2 MetricsShardService from server if available
                    const metricsShardService = server.metricsShardService;
                    // Initialize VectorSearchService with template support
                    vectorSearchService = new VectorSearchService(shardsContainer, aclService, monitoring, azureOpenAI, vectorSearchCacheService, embeddingTemplateService, shardTypeRepo, shardRepository, metricsShardService // Phase 2: MetricsShardService for hit ratio tracking
                    );
                    server.log.info('✅ Vector Search service initialized with embedding template support');
                    // Initialize Embedding Content Hash Cache Service
                    const { EmbeddingContentHashCacheService } = await import('../services/embedding-content-hash-cache.service.js');
                    const embeddingCache = redis ? new EmbeddingContentHashCacheService(redis, monitoring) : undefined;
                    if (embeddingCache) {
                        server.embeddingCache = embeddingCache; // Decorate server for route access
                        server.log.info('✅ Embedding Content Hash Cache service initialized');
                    }
                    // Initialize ShardEmbeddingService
                    shardEmbeddingService = new ShardEmbeddingService(embeddingTemplateService, embeddingService, shardTypeRepo, shardRepository, monitoring, embeddingCache);
                    server.log.info('✅ Shard Embedding service initialized');
                    // Initialize Queue Service (BullMQ) for embedding jobs
                    // Note: queueService is declared at function scope for later use
                    let embeddingWorker = undefined;
                    try {
                        const { config } = await import('../config/env.js');
                        const hasRedis = config.redis?.host || process.env.REDIS_URL || process.env.REDIS_HOST;
                        if (hasRedis) {
                            queueService = new QueueService(monitoring);
                            server.log.info('✅ Queue Service (BullMQ) initialized for embedding jobs');
                            // Embedding worker is now handled by workers-processing Container App
                            // Jobs are enqueued to BullMQ and processed by the worker app
                            // No need to initialize EmbeddingWorker here
                            embeddingWorker = null;
                            server.log.info('ℹ️  Embedding jobs will be processed by workers-processing Container App');
                        }
                        else {
                            server.log.info('ℹ️  Redis not configured - embedding jobs will not be enqueued');
                        }
                    }
                    catch (error) {
                        server.log.warn({ err: error }, '⚠️  Queue service initialization failed - embedding jobs will not be enqueued');
                    }
                    // Initialize Change Feed Service for automatic embedding generation
                    // If Queue Service is available, it will enqueue jobs; otherwise, it will generate directly
                    shardEmbeddingChangeFeedService = new ShardEmbeddingChangeFeedService(shardsContainer, shardEmbeddingService, monitoring, queueService, // Pass Queue Service (BullMQ) if available
                    {
                        maxItemCount: 100,
                        pollInterval: 5000,
                        maxConcurrency: 5,
                        mode: queueService ? 'enqueue' : 'generate', // Use enqueue mode if Queue Service available
                    });
                    // Start change feed processor in background
                    shardEmbeddingChangeFeedService.start().then(() => {
                        server.log.info('✅ Shard Embedding Change Feed processor started');
                    }).catch((err) => {
                        server.log.error({ err }, '❌ Failed to start Shard Embedding Change Feed processor');
                    });
                    // Decorate server with embedding services for route access
                    server.decorate('embeddingTemplateService', embeddingTemplateService);
                    server.decorate('embeddingService', embeddingService);
                    server.decorate('shardEmbeddingService', shardEmbeddingService);
                    server.decorate('vectorSearchService', vectorSearchService);
                    server.decorate('shardEmbeddingChangeFeedService', shardEmbeddingChangeFeedService);
                }
                catch (err) {
                    server.log.warn({ err }, '⚠️ Embedding services not fully initialized - some features may be unavailable');
                }
            }
            else {
                server.log.warn('⚠️ Embedding services skipped - COSMOS_DB_ENDPOINT or COSMOS_DB_KEY not set');
            }
            // Embedding Template management routes
            try {
                await server.register(async (tmplServer) => {
                    await registerEmbeddingTemplateRoutes(tmplServer, monitoring);
                }, { prefix: '/api/v1' });
                server.log.info('✅ Embedding template routes registered');
            }
            catch (err) {
                server.log.warn({ err }, '⚠️ Embedding template routes failed to register');
            }
            // Embedding Template generation routes (with prompt integration)
            try {
                await server.register(async (genServer) => {
                    await registerEmbeddingTemplateGenerationRoutes(genServer, monitoring);
                }, { prefix: '/api/v1' });
                server.log.info('✅ Embedding template generation routes registered');
            }
            catch (err) {
                server.log.warn({ err }, '⚠️ Embedding template generation routes failed to register');
            }
            // Initialize Model Router Service (for intelligent model selection)
            const { ModelRouterService } = await import('../services/model-router.service.js');
            const aiConfigService = server.aiConfigService;
            const modelRouter = new ModelRouterService(shardRepository, shardTypeRepo, redis || null, monitoring, aiConfigService // Pass AIConfigService for complexity thresholds
            );
            // Store modelRouter on server for access in routes
            server.modelRouter = modelRouter;
            // Initialize AI Model Selection Service (integrates connections with routing)
            const aiConnectionService = server.aiConnectionService;
            let aiModelSelection = undefined;
            let unifiedAIClient = undefined;
            if (aiConnectionService) {
                const { AIModelSelectionService } = await import('../services/ai/ai-model-selection.service.js');
                const aiConfigService = server.aiConfigService;
                aiModelSelection = new AIModelSelectionService(aiConnectionService, modelRouter, monitoring, aiConfigService // Pass AIConfigService for model selection configuration
                );
                server.log.info('✅ AI Model Selection service initialized');
                // Initialize Unified AI Client (provider-agnostic LLM client)
                const { UnifiedAIClient } = await import('../services/ai/unified-ai-client.service.js');
                unifiedAIClient = new UnifiedAIClient(monitoring);
                server.log.info('✅ Unified AI Client initialized');
                // Re-initialize ConversationService with AI services (conversionService already set)
                // Note: conversationRealtimeService was initialized earlier, reuse it
                // Get NotificationService and UserService if available (for conversation notifications)
                const notificationService = server.notificationService;
                const userService = server.userService;
                conversationService = new ConversationService(monitoring, shardRepository, shardTypeRepo, redis || undefined, unifiedAIClient, aiConnectionService, conversionService, // Already initialized above
                undefined, // shardRelationshipService - will be set later if needed
                conversationRealtimeService, // Already initialized above
                notificationService, // NotificationService - optional for notifications
                userService // UserService - optional for user lookups
                );
                server.log.info('✅ Conversation Service re-initialized with AI summarization support');
                // Re-initialize IntentAnalyzerService with AI services for LLM-based classification
                const { IntentAnalyzerService } = await import('../services/intent-analyzer.service.js');
                intentAnalyzer = new IntentAnalyzerService(monitoring, shardRepository, shardTypeRepo, redis || undefined, aiModelSelection, // Pass AI Model Selection service for LLM-based intent classification
                unifiedAIClient // Pass Unified AI Client for LLM-based intent classification
                );
                server.log.info('✅ Intent Analyzer Service re-initialized with LLM-based classification support');
            }
            else {
                const redisClient = server.redisClient;
                const missingDeps = [];
                if (!redisClient) {
                    missingDeps.push('Redis');
                }
                if (!server.aiConnectionService) {
                    missingDeps.push('AI Connection service');
                }
                server.log.warn(`⚠️ AI Model Selection service not initialized - missing dependencies: ${missingDeps.join(', ')}`);
                server.log.info('ℹ️ Intent Analyzer will use pattern-based classification only (LLM classification unavailable)');
                if (!redisClient) {
                    server.log.info('  💡 Tip: Configure Redis to enable AI Model Selection and LLM-based intent classification');
                }
            }
            // Get vectorSearchService if available (initialized earlier in embedding services section)
            vectorSearchService = server.vectorSearchService || vectorSearchService;
            // Initialize WebSearchContextIntegrationService if web search is configured
            let webSearchContextIntegration = undefined;
            let webSearchService = undefined; // Declare outside for tool executor access
            try {
                // Check if web search API keys are configured (at least one provider needed)
                const hasWebSearchConfig = Boolean(process.env.SERP_API_KEY ||
                    process.env.BING_SEARCH_API_KEY ||
                    process.env.GOOGLE_SEARCH_API_KEY ||
                    process.env.GOOGLE_SEARCH_ENGINE_ID);
                if (hasWebSearchConfig && hasCosmosEmbeddingConfig) {
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
                    const fallbacks = [];
                    if (process.env.SERP_API_KEY) {
                        primaryProvider = 'serpapi';
                        if (process.env.BING_SEARCH_API_KEY) {
                            fallbacks.push('bing');
                        }
                        if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID) {
                            fallbacks.push('google');
                        }
                    }
                    else if (process.env.BING_SEARCH_API_KEY) {
                        primaryProvider = 'bing';
                        if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID) {
                            fallbacks.push('google');
                        }
                    }
                    else if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID) {
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
                        webSearchContextIntegration = new WebSearchContextIntegrationService(webSearchService, webSearchEmbeddingService, webpagesContainer, redis || undefined);
                        server.log.info('✅ Web Search Context Integration service initialized');
                    }
                    else {
                        server.log.warn('⚠️ Web Search Context Integration skipped - OpenAI API key not configured');
                    }
                }
                else {
                    server.log.info('ℹ️  Web Search Context Integration skipped - API keys or Cosmos DB not configured');
                }
            }
            catch (err) {
                server.log.warn({ err }, '⚠️ Web Search Context Integration initialization failed - continuing without web search');
            }
            // Initialize GroundingService if LLM services are available
            let groundingService = undefined;
            try {
                // Use AzureOpenAI for grounding (simpler interface, always available if configured)
                if (azureOpenAI) {
                    const { GroundingService } = await import('../services/grounding.service.js');
                    const { AzureOpenAILLMAdapter } = await import('../services/llm.service.js');
                    const llmAdapter = new AzureOpenAILLMAdapter(azureOpenAI);
                    groundingService = new GroundingService(llmAdapter);
                    server.log.info('✅ Grounding Service initialized with AzureOpenAI');
                }
                else {
                    server.log.info('ℹ️  Grounding Service skipped - AzureOpenAI not configured');
                }
            }
            catch (err) {
                server.log.warn({ err }, '⚠️ Grounding Service initialization failed - continuing without grounding');
            }
            // Initialize Prompt System (needed for InsightService)
            let promptResolver = undefined;
            try {
                const { AIInsightsCosmosService } = await import('../services/ai-insights/cosmos.service.js');
                const { PromptRepository } = await import('../services/ai-insights/prompt.repository.js');
                const { PromptRendererService } = await import('../services/ai-insights/prompt-renderer.service.js');
                const { PromptABTestService } = await import('../services/prompt-ab-test.service.js');
                const { PromptResolverService } = await import('../services/ai-insights/prompt-resolver.service.js');
                const { PromptAnalyticsService } = await import('../services/prompt-analytics.service.js');
                const aiInsightsCosmosService = new AIInsightsCosmosService(monitoring);
                const promptRepository = new PromptRepository(aiInsightsCosmosService);
                const promptRenderer = new PromptRendererService();
                const promptABTestService = new PromptABTestService(aiInsightsCosmosService, monitoring);
                // Initialize Prompt Analytics Service (optional, requires Redis)
                let promptAnalytics = undefined;
                if (redis) {
                    promptAnalytics = new PromptAnalyticsService(redis, monitoring);
                    // Store promptAnalytics on server for access in routes
                    server.promptAnalytics = promptAnalytics;
                    server.log.info('✅ Prompt Analytics Service initialized');
                }
                else {
                    server.log.warn('⚠️ Prompt Analytics Service not initialized - Redis not available');
                }
                promptResolver = new PromptResolverService(promptRepository, promptRenderer, promptABTestService, promptAnalytics // Pass analytics service
                );
                server.log.info('✅ Prompt Resolver Service initialized');
            }
            catch (err) {
                server.log.warn({ err }, '⚠️ Prompt Resolver Service initialization failed - continuing with fallback prompts');
            }
            // Initialize Entity Resolution and Context-Aware Query Parser (needed for InsightService)
            const { EntityResolutionService } = await import('../services/entity-resolution.service.js');
            const { ContextAwareQueryParserService } = await import('../services/context-aware-query-parser.service.js');
            const entityResolutionService = new EntityResolutionService(shardRepository, monitoring, redis || undefined);
            server.log.info('✅ Entity Resolution service initialized');
            const contextAwareQueryParserService = new ContextAwareQueryParserService(entityResolutionService, shardRepository, monitoring);
            server.log.info('✅ Context-Aware Query Parser service initialized');
            // Initialize AI Tool Executor Service (for function calling)
            let toolExecutor = undefined;
            try {
                const { AIToolExecutorService } = await import('../services/ai/ai-tool-executor.service.js');
                // Get email service if available
                const emailService = server.emailService;
                // Get role management service if available (for permission checking)
                let roleManagementService = undefined;
                try {
                    const { RoleManagementService } = await import('../services/auth/role-management.service.js');
                    const cosmosService = server.cosmos;
                    if (cosmosService && cosmosService.database && cosmosService.rolesContainer && cosmosService.usersContainer) {
                        roleManagementService = new RoleManagementService(cosmosService.database, cosmosService.rolesContainer, cosmosService.usersContainer, monitoring);
                    }
                }
                catch (err) {
                    server.log.debug({ err }, 'RoleManagementService not available - permission checking will use static roles only');
                }
                toolExecutor = new AIToolExecutorService(monitoring, shardRepository, webSearchService, // Use WebSearchService initialized above
                emailService, // Pass email service for draft_email tool
                roleManagementService // Pass role management service for permission checking
                );
                server.log.info('✅ AI Tool Executor service initialized');
            }
            catch (err) {
                server.log.warn({ err }, '⚠️ AI Tool Executor Service initialization failed - continuing without function calling');
            }
            // Initialize MultimodalAssetService early if dependencies are available
            // This ensures it's available when routes are registered
            let multimodalAssetService = undefined;
            try {
                // Get rawClient and blobStorageService if available
                const cosmosClient = server.cosmos || server.cosmosClient || server.cosmosDbClient;
                let rawClient = null;
                if (cosmosClient) {
                    if (typeof cosmosClient.getClient === 'function') {
                        rawClient = cosmosClient.getClient();
                    }
                    else if (cosmosClient.database && cosmosClient.client) {
                        rawClient = cosmosClient;
                    }
                    else {
                        const cosmosDatabase = server.cosmosDatabase;
                        if (cosmosDatabase?.client) {
                            rawClient = cosmosDatabase.client;
                        }
                        else {
                            rawClient = cosmosClient;
                        }
                    }
                }
                const documentController = server.documentController;
                const blobStorageService = documentController?.blobStorageService;
                if (rawClient && blobStorageService) {
                    // Initialize multimodal services if Azure OpenAI is configured
                    const azureOpenAIConfig = config.ai?.azureOpenAI;
                    let imageAnalysisService = undefined;
                    let audioTranscriptionService = undefined;
                    let documentProcessingService = undefined;
                    let videoProcessingService = undefined;
                    if (azureOpenAIConfig?.endpoint && azureOpenAIConfig?.apiKey) {
                        try {
                            const { ImageAnalysisService } = await import('../services/multimodal/image-analysis.service.js');
                            imageAnalysisService = new ImageAnalysisService({
                                endpoint: azureOpenAIConfig.endpoint,
                                apiKey: azureOpenAIConfig.apiKey,
                                deploymentName: process.env.AZURE_OPENAI_VISION_DEPLOYMENT_NAME || 'gpt-4-vision',
                                apiVersion: azureOpenAIConfig.apiVersion || '2024-02-15-preview',
                            }, monitoring);
                        }
                        catch (err) {
                            server.log.warn({ err }, '⚠️ Image Analysis service initialization failed');
                        }
                        try {
                            const { AudioTranscriptionService } = await import('../services/multimodal/audio-transcription.service.js');
                            audioTranscriptionService = new AudioTranscriptionService({
                                endpoint: azureOpenAIConfig.endpoint,
                                apiKey: azureOpenAIConfig.apiKey,
                                deploymentName: process.env.AZURE_OPENAI_WHISPER_DEPLOYMENT_NAME || 'whisper-1',
                                apiVersion: azureOpenAIConfig.apiVersion || '2024-02-15-preview',
                            }, monitoring);
                        }
                        catch (err) {
                            server.log.warn({ err }, '⚠️ Audio Transcription service initialization failed');
                        }
                        try {
                            const { DocumentProcessingService } = await import('../services/multimodal/document-processing.service.js');
                            documentProcessingService = new DocumentProcessingService({
                                endpoint: azureOpenAIConfig.endpoint,
                                apiKey: azureOpenAIConfig.apiKey,
                                deploymentName: process.env.AZURE_OPENAI_VISION_DEPLOYMENT_NAME || 'gpt-4-vision',
                                apiVersion: azureOpenAIConfig.apiVersion || '2024-02-15-preview',
                            }, monitoring);
                        }
                        catch (err) {
                            server.log.warn({ err }, '⚠️ Document Processing service initialization failed');
                        }
                        if (audioTranscriptionService) {
                            try {
                                const { VideoProcessingService } = await import('../services/multimodal/video-processing.service.js');
                                videoProcessingService = new VideoProcessingService({
                                    audioTranscriptionService,
                                    imageAnalysisService,
                                    maxFramesToAnalyze: 5,
                                    frameExtractionInterval: 30,
                                }, monitoring);
                            }
                            catch (err) {
                                server.log.warn({ err }, '⚠️ Video Processing service initialization failed');
                            }
                        }
                    }
                    // Initialize MultimodalAssetService
                    multimodalAssetService = new MultimodalAssetService(rawClient, blobStorageService, monitoring, imageAnalysisService, audioTranscriptionService, documentProcessingService, videoProcessingService);
                    // Store on server for later access
                    server.decorate('multimodalAssetService', multimodalAssetService);
                    server.log.info('✅ MultimodalAssetService initialized early');
                }
            }
            catch (err) {
                server.log.warn({ err }, '⚠️ Early MultimodalAssetService initialization failed - will retry later');
            }
            // Initialize TenantProjectConfigService for tenant-specific token limits
            let tenantProjectConfigService = undefined;
            try {
                const { TenantProjectConfigService } = await import('../services/tenant-project-config.service.js');
                const { CosmosDBService } = await import('../services/cosmos-db.service.js');
                const { CacheService } = await import('../services/cache.service.js');
                const cosmosDB = new CosmosDBService();
                const cacheService = redis ? new CacheService(redis, monitoring) : null;
                tenantProjectConfigService = new TenantProjectConfigService(cosmosDB, cacheService);
                server.log.info('✅ Tenant Project Config Service initialized');
            }
            catch (err) {
                server.log.warn({ err }, '⚠️ Tenant Project Config Service initialization failed - using default token limits');
            }
            const insightService = new InsightService(monitoring, shardRepository, shardTypeRepo, intentAnalyzer, contextTemplateService, conversationService, azureOpenAI, groundingService, // groundingService - pass if available for advanced fact verification
            vectorSearchService, // vectorSearch - pass if available for RAG retrieval
            webSearchContextIntegration, // webSearchContextIntegration - pass if available
            redis || undefined, aiModelSelection, // AI Model Selection service - optional but recommended
            unifiedAIClient, // Unified AI Client - optional but recommended
            aiConnectionService, // AI Connection Service - optional but recommended
            relationshipService, // ShardRelationshipService - for project context optimization
            promptResolver, // PromptResolverService - optional, falls back to hardcoded prompts if not available
            contextAwareQueryParserService, // ContextAwareQueryParserService - for shard-specific Q&A
            toolExecutor, // AIToolExecutorService - optional, for function calling
            aiConfigService, // AIConfigService - optional, for cost tracking
            tenantProjectConfigService, // TenantProjectConfigService - optional, for tenant-specific token limits
            multimodalAssetService // MultimodalAssetService - optional, for including assets in context
            );
            // Store insightService on server for potential later updates
            server.decorate('insightService', insightService);
            // Entity Resolution and Context-Aware Query Parser services already initialized above for InsightService
            // Reuse the same instances here for routes
            // Conversation Realtime Service already initialized above, reuse it
            try {
                // Get authenticate decorator from server to pass to insights routes
                const authenticateDecorator = server.authenticate;
                if (!authenticateDecorator) {
                    server.log.error('❌ Cannot register AI Insights routes - authenticate decorator missing');
                    throw new Error('Authenticate decorator is required for AI Insights routes');
                }
                if (!insightService) {
                    server.log.error('❌ Cannot register AI Insights routes - insightService missing');
                    throw new Error('InsightService is required for AI Insights routes');
                }
                if (!conversationService) {
                    server.log.error('❌ Cannot register AI Insights routes - conversationService missing');
                    throw new Error('ConversationService is required for AI Insights routes');
                }
                server.log.info('Registering AI Insights routes with services:', {
                    hasInsightService: !!insightService,
                    hasConversationService: !!conversationService,
                    hasContextTemplateService: !!contextTemplateService,
                    hasAuthenticateDecorator: !!authenticateDecorator,
                });
                await server.register(insightsRoutes, {
                    prefix: '/api/v1',
                    insightService,
                    conversationService,
                    contextTemplateService,
                    entityResolutionService,
                    contextAwareQueryParserService,
                    conversationRealtimeService,
                    multimodalAssetService, // Pass multimodal asset service for linking assets to messages
                    authenticate: authenticateDecorator, // Pass authenticate decorator explicitly
                    tokenValidationCache: server.tokenValidationCache, // Also pass cache
                });
                server.log.info('✅ AI Insights routes registered with prefix /api/v1');
                tracker.record('AI Insights', true, {
                    prefix: '/api/v1',
                    dependencies: ['insightService', 'conversationService', 'AzureOpenAI', 'CosmosDB', 'Redis']
                });
                // Verify route registration by checking if the routes exist
                // Note: printRoutes() may show routes in different formats, so check multiple patterns
                const routes = server.printRoutes();
                const conversationsPatterns = [
                    '/api/v1/insights/conversations',
                    'GET /api/v1/insights/conversations',
                    'POST /api/v1/insights/conversations',
                    '/insights/conversations',
                    'GET /insights/conversations',
                    'insights/conversations',
                ];
                const chatPatterns = [
                    '/api/v1/insights/chat',
                    'POST /api/v1/insights/chat',
                    '/insights/chat',
                    'POST /insights/chat',
                    'insights/chat',
                    'POST insights/chat',
                ];
                const hasConversationsRoute = conversationsPatterns.some(pattern => routes.includes(pattern));
                const hasChatRoute = chatPatterns.some(pattern => routes.includes(pattern));
                server.log.info(`Route verification: /api/v1/insights/conversations ${hasConversationsRoute ? '✅ found' : '❌ not found'}`);
                server.log.info(`Route verification: /api/v1/insights/chat ${hasChatRoute ? '✅ found' : '❌ not found'}`);
                if (!hasConversationsRoute || !hasChatRoute) {
                    // Check if routes exist but in a different format
                    const insightsRoutes = routes.split('\n').filter(line => line.toLowerCase().includes('insights') &&
                        (line.includes('chat') || line.includes('conversations')));
                    const chatRoutes = routes.split('\n').filter(line => line.toLowerCase().includes('chat') &&
                        line.includes('insights'));
                    if (insightsRoutes.length > 0 || chatRoutes.length > 0) {
                        server.log.info(`✅ Routes registered (found ${insightsRoutes.length + chatRoutes.length} route(s), format may differ)`);
                        server.log.debug({ routes: [...insightsRoutes, ...chatRoutes].slice(0, 10) }, 'Routes found');
                    }
                    else {
                        server.log.warn('Available routes containing "insights":', routes.split('\n').filter(line => line.includes('insights')).slice(0, 30));
                        server.log.warn('Available routes containing "chat":', routes.split('\n').filter(line => line.includes('chat')).slice(0, 10));
                    }
                }
            }
            catch (registerErr) {
                server.log.error({ err: registerErr, stack: registerErr.stack }, '❌ Failed to register AI Insights routes');
                // Don't throw - allow server to continue with other routes
                // The routes are critical, but we don't want to crash the entire server
                server.log.warn('⚠️ AI Insights routes will not be available - some features may be limited');
            }
            // Initialize Proactive Insights Service
            let proactiveInsightService = undefined;
            let deliveryPreferencesRepository = undefined;
            try {
                const { ProactiveInsightService } = await import('../services/proactive-insight.service.js');
                const { ProactiveInsightsRepository } = await import('../repositories/proactive-insights.repository.js');
                // Get Cosmos DB client from server
                const cosmosClient = server.cosmos;
                const databaseId = server.cosmosDatabase?.id;
                const notificationService = server.notificationService;
                if (cosmosClient && databaseId && insightService) {
                    // Initialize repository
                    const proactiveInsightsRepository = new ProactiveInsightsRepository(cosmosClient, databaseId, config.cosmosDb.containers.proactiveInsights);
                    // Get UserService if available (for delivering insights to all users in tenant)
                    const userService = server.userService;
                    // Get EmailService if available (for direct email delivery)
                    const emailService = server.emailService;
                    // Initialize Analytics Service first (if Redis is available)
                    // We need it to pass to ProactiveInsightService
                    let proactiveInsightsAnalyticsService = undefined;
                    if (redis) {
                        try {
                            const { ProactiveInsightsAnalyticsService } = await import('../services/proactive-insights-analytics.service.js');
                            proactiveInsightsAnalyticsService = new ProactiveInsightsAnalyticsService(redis, monitoring, proactiveInsightsRepository);
                            server.log.info('✅ Proactive Insights Analytics service initialized');
                        }
                        catch (err) {
                            server.log.warn({ err }, '⚠️ Proactive Insights Analytics service failed to initialize');
                        }
                    }
                    // Initialize service with repository, notification service, analytics service, and email service
                    // Note: triggersRepository will be set later after it's initialized
                    proactiveInsightService = new ProactiveInsightService(monitoring, shardRepository, insightService, redis || undefined, proactiveInsightsRepository, notificationService, // Pass notification service for delivery integration
                    undefined, // triggersRepository - will be set after initialization
                    userService, // Pass user service for tenant-wide delivery
                    proactiveInsightsAnalyticsService, // Pass analytics service for event tracking
                    emailService // Pass email service for direct email delivery
                    );
                    // Initialize Delivery Preferences Repository
                    try {
                        const { ProactiveInsightsDeliveryPreferencesRepository } = await import('../repositories/proactive-insights-delivery-preferences.repository.js');
                        // Use the same container as proactive insights (with _type field to distinguish)
                        deliveryPreferencesRepository = new ProactiveInsightsDeliveryPreferencesRepository(cosmosClient
                            .database(databaseId)
                            .container(config.cosmosDb.containers.proactiveInsights));
                        // Set repository on service
                        proactiveInsightService.setDeliveryPreferencesRepository(deliveryPreferencesRepository);
                        server.log.info('✅ Delivery Preferences repository initialized');
                    }
                    catch (err) {
                        server.log.warn({ err }, '⚠️ Delivery Preferences repository failed to initialize');
                    }
                    // Register routes (with all dependencies)
                    await registerProactiveInsightsRoutes(server, proactiveInsightService, deliveryPreferencesRepository, proactiveInsightsAnalyticsService);
                    server.log.info('✅ Proactive Insights routes registered');
                    // Register delivery preferences routes (separate function)
                    if (deliveryPreferencesRepository) {
                        try {
                            await registerDeliveryPreferencesRoutes(server, deliveryPreferencesRepository, proactiveInsightsAnalyticsService);
                            server.log.info('✅ Delivery Preferences routes registered');
                        }
                        catch (err) {
                            server.log.warn({ err }, '⚠️ Delivery Preferences routes failed to register');
                        }
                    }
                    // Initialize Proactive Triggers Repository and Routes
                    try {
                        const { ProactiveTriggersRepository } = await import('../repositories/proactive-triggers.repository.js');
                        const { registerProactiveTriggersRoutes } = await import('./proactive-triggers.routes.js');
                        const proactiveTriggersRepository = new ProactiveTriggersRepository(cosmosClient, databaseId, config.cosmosDb.containers.proactiveTriggers);
                        await registerProactiveTriggersRoutes(server, proactiveTriggersRepository, proactiveInsightService);
                        server.log.info('✅ Proactive Triggers routes registered');
                        // Store repository on service for use in getActiveTriggers
                        proactiveInsightService.setTriggersRepository(proactiveTriggersRepository);
                    }
                    catch (err) {
                        server.log.warn({ err }, '⚠️ Proactive Triggers routes failed to register');
                    }
                }
                else {
                    server.log.warn('⚠️ Proactive Insights routes not registered - Cosmos DB client or InsightService unavailable');
                }
            }
            catch (err) {
                server.log.warn({ err }, '⚠️ Proactive Insights routes failed to register');
            }
            // Initialize Proactive Insights Worker
            if (proactiveInsightService) {
                try {
                    const { ProactiveInsightsWorker } = await import('../services/proactive-insights-worker.service.js');
                    // Get tenant service and tenants container
                    const tenantService = server.tenantService;
                    const cosmosDbClient = server.cosmosDbClient;
                    const tenantsContainer = cosmosDbClient?.getTenantsContainer?.() || null;
                    const proactiveInsightsWorker = new ProactiveInsightsWorker(proactiveInsightService, tenantService || null, monitoring, tenantsContainer, {
                        pollIntervalMs: parseInt(process.env.PROACTIVE_INSIGHTS_WORKER_POLL_INTERVAL_MS || '60000', 10), // 1 minute default
                        batchSize: parseInt(process.env.PROACTIVE_INSIGHTS_WORKER_BATCH_SIZE || '10', 10),
                        maxConcurrentTenants: parseInt(process.env.PROACTIVE_INSIGHTS_WORKER_MAX_CONCURRENT || '5', 10),
                        enabled: process.env.PROACTIVE_INSIGHTS_WORKER_ENABLED !== 'false',
                    });
                    // Start the worker
                    proactiveInsightsWorker.start();
                    server.proactiveInsightsWorker = proactiveInsightsWorker;
                    server.log.info('✅ Proactive Insights worker started');
                    // Initialize Proactive Insights Event Subscriber
                    if (redis) {
                        try {
                            const { ProactiveInsightsEventSubscriberService } = await import('../services/proactive-insights-event-subscriber.service.js');
                            const eventSubscriber = new ProactiveInsightsEventSubscriberService(redis, monitoring, proactiveInsightService);
                            await eventSubscriber.initialize();
                            server.proactiveInsightsEventSubscriber = eventSubscriber;
                            server.log.info('✅ Proactive Insights event subscriber started');
                        }
                        catch (err) {
                            server.log.warn({ err }, '⚠️ Proactive Insights event subscriber failed to start');
                        }
                    }
                    // Initialize Proactive Insights Digest Worker
                    if (redis && deliveryPreferencesRepository) {
                        try {
                            const { ProactiveInsightsDigestWorker } = await import('../services/proactive-insights-digest-worker.service.js');
                            const emailService = server.emailService;
                            const userService = server.userService;
                            if (emailService && userService) {
                                const digestWorker = new ProactiveInsightsDigestWorker(redis, emailService, deliveryPreferencesRepository, userService, monitoring, proactiveInsightsAnalyticsService, // Pass analytics service for event tracking
                                {
                                    pollIntervalMs: parseInt(process.env.PROACTIVE_INSIGHTS_DIGEST_WORKER_POLL_INTERVAL_MS || '60000', 10), // 1 minute default
                                    enabled: process.env.PROACTIVE_INSIGHTS_DIGEST_WORKER_ENABLED !== 'false',
                                });
                                // Start the worker
                                digestWorker.start();
                                server.proactiveInsightsDigestWorker = digestWorker;
                                server.log.info('✅ Proactive Insights digest worker started');
                            }
                            else {
                                server.log.warn('⚠️ Proactive Insights digest worker not started - Email service or User service not available');
                            }
                        }
                        catch (err) {
                            server.log.warn({ err }, '⚠️ Proactive Insights digest worker failed to start');
                        }
                    }
                }
                catch (err) {
                    server.log.warn({ err }, '⚠️ Proactive Insights worker failed to start');
                }
            }
            // Prompt System already initialized above for InsightService
            // Reuse the same instances here for prompt routes, or create if not available
            let promptRepositoryForRoutes;
            let promptRendererForRoutes;
            let promptABTestServiceForRoutes;
            let promptResolverForRoutes;
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
            }
            else {
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
                }
                catch (err) {
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
            }
            else {
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
                const aiRecommendationService = new AIRecommendationService(azureOpenAI, promptResolverForRoutes || promptResolver, // Use promptResolverForRoutes if available, otherwise fallback to promptResolver
                promptRendererForRoutes || (promptResolver ? new (await import('../services/ai-insights/prompt-renderer.service.js')).PromptRendererService() : undefined), monitoring);
                await server.register(async (aiRecServer) => {
                    await registerAIRecommendationRoutes(aiRecServer, aiRecommendationService);
                }, { prefix: '/api/v1' });
                server.log.info('✅ AI Recommendation routes registered');
            }
            catch (err) {
                server.log.warn({ err }, '⚠️ AI Recommendation routes failed to register');
            }
            // AI Settings routes (Super Admin & Tenant Admin)
            await server.register(aiSettingsRoutes, {
                prefix: '/api/v1',
                monitoring,
                shardRepository,
                shardTypeRepository: shardTypeRepo,
            });
            server.log.info('✅ AI Settings routes registered');
            // AI Connections routes (Super Admin & Tenant Admin)
            if (aiConnectionService) {
                // Register routes with /api/v1 prefix
                await server.register(async (fastify) => {
                    registerAIConnectionsRoutes(fastify, aiConnectionService, unifiedAIClient, monitoring);
                }, { prefix: '/api/v1' });
                server.log.info('✅ AI Connections routes registered');
            }
            else {
                server.log.warn('⚠️ AI Connections routes not registered - AI Connection service not available');
            }
            // AI Models Catalog routes (Super Admin)
            await server.register(aiModelsRoutes, {
                prefix: '/api/v1',
                monitoring,
            });
            server.log.info('✅ AI Models Catalog routes registered');
            // AI Tools Management routes (Super Admin)
            if (toolExecutor) {
                try {
                    const { registerAIToolsRoutes } = await import('./ai-tools.routes.js');
                    await registerAIToolsRoutes(server, toolExecutor, monitoring);
                    server.log.info('✅ AI Tools Management routes registered');
                }
                catch (err) {
                    server.log.warn({ err }, '⚠️ AI Tools Management routes failed to register');
                }
            }
            else {
                server.log.warn('⚠️ AI Tools Management routes not registered - Tool Executor not available');
            }
            // Intent Pattern Management routes (Super Admin)
            if (unifiedAIClient && aiConnectionService) {
                const { IntentPatternService } = await import('../services/intent-pattern.service.js');
                const intentPatternService = new IntentPatternService(monitoring, unifiedAIClient, aiConnectionService);
                await intentPatternService.initialize();
                await registerIntentPatternRoutes(server, intentPatternService, monitoring);
                server.log.info('✅ Intent Pattern routes registered');
            }
            else {
                server.log.warn('⚠️ Intent Pattern routes not registered - UnifiedAIClient or AIConnectionService not available');
            }
            // Custom Integration routes
            await server.register(customIntegrationRoutes, {
                prefix: '/api/v1',
                monitoring,
                shardRepository,
                shardTypeRepository: shardTypeRepo,
            });
            server.log.info('✅ Custom Integration routes registered');
            // Custom Integration Webhook receiver (public)
            await server.register(customIntegrationWebhookRoutes, {
                prefix: '/api/v1',
                monitoring,
                shardRepository,
                shardTypeRepository: shardTypeRepo,
            });
            server.log.info('✅ Custom Integration Webhook routes registered');
            // AI Analytics routes
            if (redis) {
                // Get promptAnalytics and modelRouter from the scope where they were initialized
                const promptAnalytics = server.promptAnalytics;
                const modelRouter = server.modelRouter;
                await server.register(aiAnalyticsRoutes, {
                    prefix: '/api/v1',
                    monitoring,
                    redis,
                    promptAnalytics,
                    modelRouter,
                });
                server.log.info('✅ AI Analytics routes registered');
            }
        }
        catch (insightErr) {
            server.log.warn({ err: insightErr }, '⚠️ AI Insights routes not registered');
        }
    }
    else {
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
            const relationshipService = new ShardRelationshipService(monitoring, shardRepository);
            await relationshipService.initialize();
            // Get AI services for template selection (optional, for LLM-based query understanding)
            // Note: These may not be available at this point, will be set later if needed
            const unifiedAIClientForTemplates = server.unifiedAIClient;
            const aiConnectionServiceForTemplates = server.aiConnectionService;
            // Get vectorSearchService if available (for RAG retrieval)
            const vectorSearchServiceForContext = server.vectorSearchService;
            const contextTemplateService = new ContextTemplateService(monitoring, shardRepository, shardTypeRepo, relationshipService, redis || undefined, // Redis is optional
            unifiedAIClientForTemplates, // Optional: for LLM-based template selection
            aiConnectionServiceForTemplates, // Optional: for LLM-based template selection
            vectorSearchServiceForContext // Optional: for RAG retrieval
            );
            const conversionService = new ConversionService(monitoring);
            let conversationRealtimeService = undefined;
            if (redis) {
                conversationRealtimeService = new ConversationRealtimeService(redis, monitoring);
            }
            const notificationService = server.notificationService;
            const userService = server.userService;
            const conversationService = new ConversationService(monitoring, shardRepository, shardTypeRepo, redis || undefined, // Redis is optional
            undefined, // unifiedAIClient
            undefined, // aiConnectionService
            conversionService, undefined, // shardRelationshipService
            conversationRealtimeService, notificationService, userService);
            const intentAnalyzer = new IntentAnalyzerService(monitoring, shardRepository, shardTypeRepo, redis || undefined // Redis is optional
            );
            const azureOpenAI = new AzureOpenAIService({
                endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
                apiKey: process.env.AZURE_OPENAI_API_KEY || '',
                deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o',
            }, monitoring);
            const entityResolutionService = new EntityResolutionService(shardRepository, monitoring, redis || undefined // Redis is optional
            );
            const contextAwareQueryParserService = new ContextAwareQueryParserService(entityResolutionService, shardRepository, monitoring);
            // Initialize Prompt System for this InsightService instance (if not already created)
            let promptResolverForSecondInstance = undefined;
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
                }
                catch (err) {
                    server.log.warn({ err }, '⚠️ Prompt Resolver Service initialization failed for second instance - continuing with fallback prompts');
                }
            }
            else {
                promptResolverForSecondInstance = promptResolver; // Reuse if available
            }
            const insightService = new InsightService(monitoring, shardRepository, shardTypeRepo, intentAnalyzer, contextTemplateService, conversationService, azureOpenAI, undefined, // groundingService
            undefined, // vectorSearchService
            undefined, // webSearchContextIntegration
            redis || undefined, undefined, // aiModelSelection
            undefined, // unifiedAIClient
            undefined, // aiConnectionService
            relationshipService, promptResolverForSecondInstance, // PromptResolverService - optional
            contextAwareQueryParserService, // ContextAwareQueryParserService - for shard-specific Q&A
            undefined // toolExecutor - not needed for second instance
            );
            // Get authenticate decorator from server to pass to insights routes
            const authenticateDecorator = server.authenticate;
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
            server.log.info('Registering AI Insights routes (fallback without cache) with services:', {
                hasInsightService: !!insightService,
                hasConversationService: !!conversationService,
                hasContextTemplateService: !!contextTemplateService,
                hasAuthenticateDecorator: !!authenticateDecorator,
            });
            await server.register(insightsRoutes, {
                prefix: '/api/v1',
                insightService,
                conversationService,
                contextTemplateService,
                entityResolutionService,
                contextAwareQueryParserService,
                conversationRealtimeService,
                authenticate: authenticateDecorator, // Pass authenticate decorator explicitly
                tokenValidationCache: server.tokenValidationCache, // Also pass cache
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
                server.log.warn('Available routes containing "insights":', routes.split('\n').filter(line => line.includes('insights')).slice(0, 30));
                server.log.warn('Available routes containing "chat":', routes.split('\n').filter(line => line.includes('chat')).slice(0, 10));
            }
        }
        catch (insightErr) {
            server.log.warn({ err: insightErr }, '⚠️ AI Insights routes failed to register (fallback without cache)');
            tracker.record('AI Insights', false, {
                prefix: '/api/v1',
                reason: insightErr instanceof Error ? insightErr.message : 'Registration failed',
                dependencies: ['insightService', 'conversationService', 'AzureOpenAI']
            });
        }
    }
    // ACL API routes (with caching)
    if (cacheService && cacheSubscriber) {
        await registerACLRoutes(server, monitoring, cacheService, cacheSubscriber);
        server.log.info('✅ ACL routes registered (with caching)');
    }
    else {
        await registerACLRoutes(server, monitoring);
        server.log.info('✅ ACL routes registered (without caching)');
    }
    // Revisions API routes (no caching - always fetch fresh)
    if (cacheService && cacheSubscriber) {
        await registerRevisionsRoutes(server, monitoring, cacheService, cacheSubscriber);
        server.log.info('✅ Revisions routes registered (with ACL and cache for shards)');
    }
    else {
        await registerRevisionsRoutes(server, monitoring);
        server.log.info('✅ Revisions routes registered (without caching)');
    }
    // Vector Search API routes (with caching)
    if (cacheService && cacheSubscriber) {
        await registerVectorSearchRoutes(server, monitoring, cacheService, cacheSubscriber);
        server.log.info('✅ Vector search routes registered (with caching)');
    }
    else {
        await registerVectorSearchRoutes(server, monitoring);
        server.log.info('✅ Vector search routes registered (without caching)');
    }
    // Embedding Management API routes
    let shardEmbeddingService = server.shardEmbeddingService;
    // Try to initialize if not available but prerequisites exist
    if (!shardEmbeddingService) {
        const hasCosmosEmbeddingConfig = Boolean(process.env.COSMOS_DB_ENDPOINT && process.env.COSMOS_DB_KEY);
        const embeddingTemplateService = server.embeddingTemplateService;
        const embeddingService = server.embeddingService;
        const shardTypeRepo = server.shardTypeRepository;
        const shardRepo = server.shardRepository;
        const embeddingCache = server.embeddingCache;
        if (hasCosmosEmbeddingConfig && embeddingTemplateService && embeddingService && shardTypeRepo && shardRepo) {
            try {
                const { ShardEmbeddingService } = await import('../services/shard-embedding.service.js');
                shardEmbeddingService = new ShardEmbeddingService(embeddingTemplateService, embeddingService, shardTypeRepo, shardRepo, monitoring, embeddingCache);
                server.decorate('shardEmbeddingService', shardEmbeddingService);
                server.log.info('✅ Shard Embedding service initialized during route registration');
            }
            catch (err) {
                server.log.warn({ err }, '⚠️ Failed to initialize ShardEmbeddingService during route registration');
            }
        }
    }
    if (shardEmbeddingService) {
        await server.register(async (embeddingServer) => {
            await registerEmbeddingRoutes(embeddingServer, monitoring);
        }, { prefix: '/api/v1' });
        server.log.info('✅ Embedding management routes registered');
        // Register embedding job routes
        await server.register(async (jobServer) => {
            await registerEmbeddingJobRoutes(jobServer, monitoring);
        }, { prefix: '/api/v1' });
        server.log.info('✅ Embedding job routes registered');
    }
    else {
        const missing = [];
        const hasCosmosEmbeddingConfig = Boolean(process.env.COSMOS_DB_ENDPOINT && process.env.COSMOS_DB_KEY);
        if (!hasCosmosEmbeddingConfig) {
            missing.push('Cosmos DB config');
        }
        if (!server.embeddingTemplateService) {
            missing.push('EmbeddingTemplateService');
        }
        if (!server.embeddingService) {
            missing.push('EmbeddingService');
        }
        if (!server.shardTypeRepository) {
            missing.push('ShardTypeRepository');
        }
        if (!server.shardRepository) {
            missing.push('ShardRepository');
        }
        server.log.debug(`ℹ️ Embedding routes not registered - ShardEmbeddingService not available (missing: ${missing.join(', ') || 'unknown'})`);
    }
    // Cache Admin API routes (monitoring and warming)
    const cosmosContainer = server.cosmosContainer;
    const shardCache = server.shardCache;
    const aclCache = server.aclCache;
    const vectorSearchCache = server.vectorSearchCache;
    const tokenValidationCache = server.tokenValidationCache;
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
    }
    else {
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
    }
    catch (err) {
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
    }
    catch (err) {
        server.log.warn({ err }, '⚠️ Admin dashboard routes not registered');
    }
    // AI Insights web/deep search routes
    try {
        await server.register(registerInsightsSearchRoutes, { prefix: '/api/v1', monitoring });
        server.log.info('✅ AI Insights search routes registered');
    }
    catch (err) {
        server.log.warn({ err }, '⚠️ AI Insights search routes not registered');
    }
    // Option List routes
    try {
        await server.register(optionListRoutes, {
            prefix: '/api/v1/option-lists',
            monitoring,
        });
        server.log.info('✅ Option list routes registered');
    }
    catch (err) {
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
    }
    catch (err) {
        server.log.warn({ err }, '⚠️ Feature flag routes not registered');
        tracker.record('Feature Flags', false, {
            prefix: '/api/v1',
            reason: err instanceof Error ? err.message : 'Registration failed',
            dependencies: ['FeatureFlagService', 'CosmosDB']
        });
    }
    // Webhook routes (outgoing - require event service)
    const webhookDeliveryService = server.webhookDeliveryService;
    if (webhookDeliveryService) {
        try {
            await server.register(webhookRoutes, {
                prefix: '/api/v1/webhooks',
                monitoring,
                deliveryService: webhookDeliveryService,
            });
            server.log.info('✅ Outgoing webhook routes registered');
        }
        catch (err) {
            server.log.warn({ err }, '⚠️ Outgoing webhook routes not registered');
        }
    }
    else {
        server.log.warn('⚠️ Outgoing webhook routes not registered - WebhookDeliveryService not available');
    }
    // Incoming webhook receiver routes (require WebhookManagementService)
    const webhookManagementService = server.webhookManagementService;
    if (webhookManagementService) {
        try {
            // Register incoming webhook routes (no prefix, public endpoints)
            registerWebhookRoutes(server, webhookManagementService);
            server.log.info('✅ Incoming webhook receiver routes registered');
        }
        catch (err) {
            server.log.warn({ err }, '⚠️ Incoming webhook receiver routes not registered');
        }
    }
    else {
        server.log.warn('⚠️ Incoming webhook receiver routes not registered - WebhookManagementService not available');
    }
    // Schema Migration routes
    if (cacheService && cacheSubscriber) {
        try {
            const shardCacheService = server.shardCache;
            const shardRepository = new ShardRepository(monitoring, shardCacheService);
            const shardTypeRepository = new ShardTypeRepository(monitoring);
            await server.register(schemaMigrationRoutes, {
                prefix: '/api/v1/schema-migrations',
                monitoring,
                shardRepository,
                shardTypeRepository,
            });
            server.log.info('✅ Schema migration routes registered');
        }
        catch (err) {
            server.log.warn({ err }, '⚠️ Schema migration routes not registered');
        }
    }
    else {
        server.log.warn('⚠️ Schema migration routes not registered - cache services not available');
    }
    // Widget Catalog routes
    try {
        await server.register(widgetCatalogRoutes, {
            prefix: '/api/v1',
            monitoring,
        });
        server.log.info('✅ Widget catalog routes registered');
    }
    catch (err) {
        server.log.warn({ err }, '⚠️ Widget catalog routes not registered');
    }
    // Integration Catalog Routes (Super Admin)
    try {
        const catalogCosmosClient = server.cosmos || server.cosmosClient;
        const catalogCosmosDatabase = server.cosmosDatabase;
        if (catalogCosmosClient || catalogCosmosDatabase) {
            // Use cosmosClient if available, otherwise try to get from database
            const cosmosClient = catalogCosmosClient || (catalogCosmosDatabase?.client);
            if (cosmosClient) {
                const catalogRepository = new IntegrationCatalogRepository(cosmosClient, 'castiel', 'integration_catalog', 'integration_visibility');
                const visibilityService = new IntegrationVisibilityService(catalogRepository);
                const catalogService = new IntegrationCatalogService(catalogRepository);
                const catalogController = new SuperAdminIntegrationCatalogController(catalogService, catalogRepository);
                await server.register(async (saServer) => {
                    await registerSuperAdminIntegrationCatalogRoutes(saServer, catalogController);
                }, { prefix: '/api/v1' });
                server.log.info('✅ Integration catalog routes registered');
            }
            else {
                server.log.debug('ℹ️ Integration catalog routes not registered - Cosmos DB client not available');
            }
        }
        else {
            server.log.debug('ℹ️ Integration catalog routes not registered - Cosmos DB unavailable');
        }
    }
    catch (err) {
        server.log.warn({ err }, '⚠️ Integration catalog routes failed to register');
    }
    // Integration Routes (New Container Architecture)
    const integrationProviderController = server.integrationProviderController;
    const integrationController = server.integrationController;
    const integrationSearchController = server.integrationSearchController;
    if (integrationProviderController && integrationController && integrationSearchController) {
        try {
            await registerIntegrationRoutes(server);
            server.log.info('✅ Integration routes registered');
        }
        catch (err) {
            server.log.warn({ err }, '⚠️ Integration routes failed to register');
        }
    }
    else {
        const missing = [];
        if (!integrationProviderController) {
            missing.push('integrationProviderController');
        }
        if (!integrationController) {
            missing.push('integrationController');
        }
        if (!integrationSearchController) {
            missing.push('integrationSearchController');
        }
        server.log.debug(`ℹ️ Integration routes not registered - ${missing.join(', ')} missing (requires Cosmos DB for initialization)`);
    }
    // Email Template Routes (Super Admin)
    if (server.emailTemplateController) {
        try {
            await registerEmailTemplateRoutes(server);
            server.log.info('✅ Email template routes registered');
        }
        catch (err) {
            server.log.warn({ err }, '⚠️ Email template routes failed to register');
        }
    }
    else {
        server.log.warn('⚠️ Email template routes not registered - controller missing');
    }
    // Content Generation Routes (Feature Flagged)
    if (config.contentGeneration.enabled) {
        try {
            const unifiedAIClient = server.unifiedAIClient;
            const aiConnectionService = server.aiConnectionService;
            const aiConfigService = server.aiConfigService;
            // Get other required services that should be available from previous registrations
            // We need to cast server to any to access decorated properties or we need to ensure they are available in scope
            // In this file, shardRepository is created locally in registerRoutes scope (line 316)
            // insightsService is created locally (line 419)
            // We need to ensure we have access to these instances. 
            // Since they are local variables in registerRoutes, we can use them directly if they are in scope.
            // shardRepository is defined at line 316.
            // insightService is defined at line 419.
            // We need to instantiate TemplateService first (for simple content templates)
            const templateService = new TemplateService(monitoring, server.cosmos);
            const templateController = new TemplateController(templateService);
            await server.register(async (tplServer) => {
                await registerTemplateRoutes(tplServer, templateController);
            }, { prefix: '/api/v1' });
            server.log.info('✅ Template routes registered');
            // Initialize Document Template Service (for placeholder-based document templates)
            // Get integration services if available (for OAuth token retrieval)
            const integrationService = server.integrationService;
            const integrationConnectionService = server.integrationConnectionService;
            const documentTemplateService = new DocumentTemplateService(monitoring, server.cosmos, integrationService, integrationConnectionService);
            // Initialize Placeholder Preview Service (if dependencies are available)
            // This service requires InsightService, ContextTemplateService, and related services
            let placeholderPreviewService;
            try {
                // Try to reuse services that may have been created earlier
                // If not available, create minimal instances for preview functionality
                const shardRepository = shardRepository || new ShardRepository(monitoring);
                const shardTypeRepo = shardTypeRepository || new ShardTypeRepository(monitoring);
                const contextTemplateService = server.contextTemplateService;
                if (contextTemplateService) {
                    // Create minimal services needed for InsightService
                    const intentAnalyzer = new IntentAnalyzerService(monitoring, previewShardRepository, previewShardTypeRepo, redis || undefined);
                    const conversationService = new ConversationService(monitoring, previewShardRepository, previewShardTypeRepo, redis || undefined);
                    const azureOpenAI = new AzureOpenAIService({
                        endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
                        apiKey: process.env.AZURE_OPENAI_API_KEY || '',
                        deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o',
                    }, monitoring);
                    const relationshipService = new ShardRelationshipService(monitoring, previewShardRepository);
                    await relationshipService.initialize();
                    // Create InsightService instance for preview service
                    const previewInsightService = new InsightService(monitoring, previewShardRepository, previewShardTypeRepo, intentAnalyzer, contextTemplateService, conversationService, azureOpenAI, undefined, // groundingService
                    undefined, // vectorSearch
                    undefined, // webSearchContextIntegration
                    redis || undefined, undefined, // aiModelSelection
                    undefined, // unifiedAIClient
                    undefined, // aiConnectionService
                    relationshipService, undefined, // promptResolver
                    undefined, // contextAwareQueryParser
                    undefined // toolExecutor
                    );
                    placeholderPreviewService = new PlaceholderPreviewService(monitoring, previewInsightService, contextTemplateService, documentTemplateService);
                    server.log.info('✅ Placeholder Preview Service initialized');
                }
                else {
                    server.log.warn('⚠️ Placeholder Preview Service not initialized - ContextTemplateService missing');
                }
            }
            catch (error) {
                server.log.warn({ err: error }, '⚠️ Placeholder Preview Service initialization failed - preview/test endpoints will be unavailable');
            }
            // Initialize Document Generation Service
            let documentGenerationService;
            try {
                if (queueService) {
                    documentGenerationService = new DocumentGenerationService(monitoring, documentTemplateService, queueService, redis // Pass Redis for quota tracking
                    );
                    server.log.info('✅ Document Generation Service initialized');
                }
                else {
                    server.log.warn('⚠️ Document Generation Service not initialized - Queue Service not available');
                }
            }
            catch (error) {
                server.log.warn({ err: error }, '⚠️ Document Generation Service initialization failed - generation endpoints will be unavailable');
            }
            // Create GenerationJobRepository for health checks
            const { GenerationJobRepository } = await import('../repositories/generation-job.repository.js');
            const generationJobRepository = new GenerationJobRepository();
            const documentTemplateController = new DocumentTemplateController(documentTemplateService, documentGenerationService, queueService || undefined, // For health checks (optional)
            generationJobRepository, // For health checks
            placeholderPreviewService // For placeholder preview/test endpoints
            );
            await server.register(async (dtServer) => {
                await registerDocumentTemplateRoutes(dtServer, documentTemplateController);
            }, { prefix: '/api/v1' });
            server.log.info('✅ Document Template routes registered');
            if (unifiedAIClient && aiConnectionService && aiConfigService && insightService) {
                // Now instantiate ContentGenerationService with correct dependencies
                // Note: ContentGenerationService expects ShardRepository, not ShardRepository | undefined
                // We assume shardRepository is available (it's created at line 316)
                // conversionService is initialized earlier (line 718)
                const contentGenerationService = new ContentGenerationService(monitoring, templateService, insightService, shardRepository, conversionService // Optional - for format conversion
                );
                const contentGenerationController = new ContentGenerationController(contentGenerationService, aiConnectionService);
                await server.register(async (cgServer) => {
                    await registerContentGenerationRoutes(cgServer, contentGenerationController);
                }, { prefix: '/api/v1' });
                server.log.info('✅ Content Generation routes registered');
            }
            else {
                server.log.warn('⚠️ Content Generation routes not registered - missing dependencies');
            }
        }
        catch (err) {
            server.log.warn({ err }, '⚠️ Content Generation routes failed to register');
        }
    }
    else {
        server.log.info('ℹ️ Content Generation feature disabled');
    }
    // Memory routes (AI chat memory management)
    if (redis) {
        try {
            const memoryService = createMemoryContextService(redis, monitoring);
            const memoryController = new MemoryController(memoryService);
            await registerMemoryRoutes(server, memoryController);
            server.log.info('✅ Memory routes registered');
        }
        catch (err) {
            server.log.warn({ err }, '⚠️ Memory routes failed to register');
        }
    }
    else {
        server.log.warn('⚠️ Memory routes not registered - Redis not available');
    }
    // Onboarding routes
    const onboardingCosmosClient = server.cosmos || server.cosmosClient;
    const onboardingCosmosDatabase = server.cosmosDatabase;
    if (onboardingCosmosClient || onboardingCosmosDatabase) {
        try {
            let database;
            if (onboardingCosmosDatabase) {
                database = onboardingCosmosDatabase;
            }
            else if (onboardingCosmosClient) {
                const { config } = await import('../config/env.js');
                database = onboardingCosmosClient.database(config.cosmosDb.databaseId);
            }
            // Try to get email service from server decoration
            const emailService = server.emailService;
            if (emailService && database) {
                const onboardingService = new OnboardingService(database, emailService, monitoring);
                const onboardingController = new OnboardingController(onboardingService);
                await registerOnboardingRoutes(server, onboardingController);
                server.log.info('✅ Onboarding routes registered');
            }
            else {
                const missing = [];
                if (!emailService) {
                    missing.push('Email service');
                }
                if (!database) {
                    missing.push('Database');
                }
                server.log.debug(`ℹ️ Onboarding routes not registered - ${missing.join(' and ')} not available`);
            }
        }
        catch (err) {
            server.log.warn({ err }, '⚠️ Onboarding routes failed to register');
        }
    }
    else {
        server.log.debug('ℹ️ Onboarding routes not registered - Cosmos DB not available');
    }
    // Vector Search UI routes (search history, saved searches, autocomplete)
    const vectorSearchUICosmosClient = server.cosmos || server.cosmosClient;
    const vectorSearchUICosmosDatabase = server.cosmosDatabase;
    if (vectorSearchUICosmosClient || vectorSearchUICosmosDatabase) {
        try {
            let database;
            if (vectorSearchUICosmosDatabase) {
                database = vectorSearchUICosmosDatabase;
            }
            else if (vectorSearchUICosmosClient) {
                const { config } = await import('../config/env.js');
                database = vectorSearchUICosmosClient.database(config.cosmosDb.databaseId);
            }
            const redis = server.redisClient;
            if (database) {
                const vectorSearchUIService = new VectorSearchUIService(database, redis, monitoring);
                const vectorSearchUIController = new VectorSearchUIController(vectorSearchUIService);
                await registerVectorSearchUIRoutes(server, vectorSearchUIController);
                server.log.info('✅ Vector Search UI routes registered');
            }
            else {
                server.log.debug('ℹ️ Vector Search UI routes not registered - Database not available');
            }
        }
        catch (err) {
            server.log.warn({ err }, '⚠️ Vector Search UI routes failed to register');
        }
    }
    else {
        server.log.debug('ℹ️ Vector Search UI routes not registered - Cosmos DB not available');
    }
    // Search Analytics routes
    const searchAnalyticsCosmosClient = server.cosmos || server.cosmosClient;
    const searchAnalyticsCosmosDatabase = server.cosmosDatabase;
    if (searchAnalyticsCosmosClient || searchAnalyticsCosmosDatabase) {
        try {
            let database;
            if (searchAnalyticsCosmosDatabase) {
                database = searchAnalyticsCosmosDatabase;
            }
            else if (searchAnalyticsCosmosClient) {
                const { config } = await import('../config/env.js');
                database = searchAnalyticsCosmosClient.database(config.cosmosDb.databaseId);
            }
            const redis = server.redisClient;
            if (database) {
                const searchAnalyticsService = new SearchAnalyticsService(database, redis, monitoring);
                const searchAnalyticsController = new SearchAnalyticsController(searchAnalyticsService);
                await registerSearchAnalyticsRoutes(server, searchAnalyticsController);
                server.log.info('✅ Search Analytics routes registered');
            }
            else {
                server.log.debug('ℹ️ Search Analytics routes not registered - Database not available');
            }
        }
        catch (err) {
            server.log.warn({ err }, '⚠️ Search Analytics routes failed to register');
        }
        // Register API Performance Monitoring routes
        try {
            registerAPIPerformanceRoutes(server);
            server.log.info('✅ API Performance Monitoring routes registered');
        }
        catch (err) {
            server.log.warn({ err }, '⚠️ API Performance Monitoring routes failed to register');
        }
        // Register Integration Monitoring Admin routes
        try {
            await registerIntegrationMonitoringRoutes(server);
            server.log.info('✅ Integration Monitoring Admin routes registered');
        }
        catch (err) {
            server.log.warn({ err }, '⚠️ Integration Monitoring Admin routes failed to register');
        }
        // Register Cache Optimization routes
        try {
            registerCacheOptimizationRoutes(server);
            server.log.info('✅ Cache Optimization routes registered');
        }
        catch (err) {
            server.log.warn({ err }, '⚠️ Cache Optimization routes failed to register');
        }
    }
    else {
        server.log.debug('ℹ️ Search Analytics routes not registered - Cosmos DB not available');
    }
    // Project Analytics routes
    try {
        // Try to get ShardRepository from server decoration or create new instance
        const shardRepository = server.shardRepository;
        if (!shardRepository) {
            // Try to get from shard routes initialization
            // ShardRepository is created in the shard routes section
            // For now, we'll try to access it from the server or create a minimal one
            server.log.warn('⚠️ Project Analytics routes not registered - ShardRepository not available');
        }
        else {
            const projectAnalyticsService = new ProjectAnalyticsService(shardRepository, monitoring);
            const projectAnalyticsController = new ProjectAnalyticsController(projectAnalyticsService);
            await registerProjectAnalyticsRoutes(server, projectAnalyticsController);
            server.log.info('✅ Project Analytics routes registered');
        }
    }
    catch (err) {
        server.log.warn({ err }, '⚠️ Project Analytics routes failed to register');
    }
    // Risk Analysis routes
    try {
        const shardRepository = server.shardRepository;
        const shardTypeRepository = server.shardTypeRepository;
        let relationshipService = server.relationshipService;
        const vectorSearchService = server.vectorSearchService;
        const insightService = server.insightService;
        // Create relationshipService if it doesn't exist
        if (!relationshipService && shardRepository) {
            const { ShardRelationshipService } = await import('../services/shard-relationship.service.js');
            relationshipService = new ShardRelationshipService(monitoring, shardRepository);
            await relationshipService.initialize();
            server.decorate('relationshipService', relationshipService);
            server.log.info('✅ Created relationshipService for Risk Analysis routes');
        }
        if (!shardRepository || !shardTypeRepository || !relationshipService || !vectorSearchService || !insightService) {
            const missing = [];
            if (!shardRepository) {
                missing.push('shardRepository');
            }
            if (!shardTypeRepository) {
                missing.push('shardTypeRepository');
            }
            if (!relationshipService) {
                missing.push('relationshipService');
            }
            if (!vectorSearchService) {
                missing.push('vectorSearchService');
            }
            if (!insightService) {
                missing.push('insightService');
            }
            server.log.warn(`⚠️ Risk Analysis routes not registered - missing dependencies: ${missing.join(', ')}`);
        }
        else {
            // Initialize RevisionRepository
            const revisionRepository = new RevisionRepository(monitoring);
            // Initialize RiskEvaluationService early and store on server for use by ShardsController
            const { RiskCatalogService } = await import('../services/risk-catalog.service.js');
            const { RiskEvaluationService } = await import('../services/risk-evaluation.service.js');
            const riskCatalogService = new RiskCatalogService(monitoring, shardRepository, shardTypeRepository);
            const riskEvaluationService = new RiskEvaluationService(monitoring, shardRepository, shardTypeRepository, relationshipService, riskCatalogService, vectorSearchService, insightService, queueService || undefined // Pass Queue Service (BullMQ) if available
            );
            // Store on server for use by ShardsController (for automatic risk evaluation)
            server.decorate('riskEvaluationService', riskEvaluationService);
            server.log.info('✅ RiskEvaluationService initialized and stored on server');
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
            const auditLogService = new AuditLogService(monitoring, shardRepository);
            const { TeamService } = await import('../services/team.service.js');
            const teamService = new TeamService(monitoring, shardRepository, shardTypeRepository, relationshipService, auditLogService);
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
            const integrationService = server.integrationService;
            const adapterManager = server.adapterManagerService;
            if (integrationService && adapterManager && teamService) {
                try {
                    const { IntegrationExternalUserIdService } = await import('../services/integration-external-user-id.service.js');
                    const { CosmosDbClient } = await import('../services/cosmos-db.service.js');
                    const cosmosClient = server.cosmosClient;
                    const userContainer = cosmosClient?.getUsersContainer();
                    if (userContainer) {
                        const externalUserIdService = new IntegrationExternalUserIdService({
                            userContainer,
                            monitoring,
                            adapterManager,
                            integrationRepository: server.integrationRepository,
                            auditLogService,
                        });
                        const { SSOTeamSyncService } = await import('../services/sso-team-sync.service.js');
                        const ssoTeamSyncService = new SSOTeamSyncService(monitoring, teamService, integrationService, adapterManager, externalUserIdService);
                        server.decorate('ssoTeamSyncService', ssoTeamSyncService);
                        server.log.info('✅ SSO Team Sync Service initialized');
                    }
                }
                catch (error) {
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
                let riskEvaluationService = server.riskEvaluationService;
                // If not available, initialize it (shouldn't happen if risk analysis routes registered successfully)
                if (!riskEvaluationService) {
                    const { RiskCatalogService } = await import('../services/risk-catalog.service.js');
                    const { RiskEvaluationService } = await import('../services/risk-evaluation.service.js');
                    const riskCatalogService = new RiskCatalogService(monitoring, shardRepository, shardTypeRepository);
                    riskEvaluationService = new RiskEvaluationService(monitoring, shardRepository, shardTypeRepository, relationshipService, riskCatalogService, vectorSearchService, insightService, queueService || undefined);
                    // Store on server for future use
                    server.decorate('riskEvaluationService', riskEvaluationService);
                }
                // Initialize RevenueAtRiskService for pipeline services
                const { RevenueAtRiskService } = await import('../services/revenue-at-risk.service.js');
                const revenueAtRiskService = new RevenueAtRiskService(monitoring, shardRepository, shardTypeRepository, riskEvaluationService);
                const { OpportunityService } = await import('../services/opportunity.service.js');
                const opportunityService = new OpportunityService(monitoring, shardRepository, shardTypeRepository, relationshipService, riskEvaluationService, teamService // Add TeamService for team-based queries
                );
                await registerOpportunityRoutes(server, {
                    opportunityService,
                });
                server.log.info('✅ Opportunity routes registered');
            }
            catch (oppErr) {
                server.log.error({ err: oppErr }, '❌ Opportunity routes failed to register');
                // Don't throw - allow other routes to continue registering
            }
            // Register Pipeline routes
            const { PipelineViewService } = await import('../services/pipeline-view.service.js');
            const { PipelineAnalyticsService } = await import('../services/pipeline-analytics.service.js');
            const { PipelineSummaryService } = await import('../services/pipeline-summary.service.js');
            const { RevenueForecastService } = await import('../services/revenue-forecast.service.js');
            const pipelineViewService = new PipelineViewService(monitoring, opportunityService, revenueAtRiskService);
            const pipelineAnalyticsService = new PipelineAnalyticsService(monitoring, opportunityService, revenueAtRiskService);
            const pipelineSummaryService = new PipelineSummaryService(monitoring, pipelineAnalyticsService, revenueAtRiskService);
            const revenueForecastService = new RevenueForecastService(monitoring, opportunityService, revenueAtRiskService);
            await registerPipelineRoutes(server, {
                pipelineViewService,
                pipelineAnalyticsService,
                pipelineSummaryService,
                revenueForecastService,
            });
            server.log.info('✅ Pipeline routes registered');
        }
    }
    catch (err) {
        server.log.warn({ err }, '⚠️ Risk Analysis routes failed to register');
    }
    // Register Opportunity routes as fallback if not registered above
    // This ensures routes are available even if some dependencies are missing
    try {
        const shardRepository = server.shardRepository;
        const shardTypeRepository = server.shardTypeRepository;
        const relationshipService = server.relationshipService || server.shardRelationshipService;
        const vectorSearchService = server.vectorSearchService;
        const insightService = server.insightService;
        const teamService = server.teamService;
        // Only attempt fallback registration if we have the minimum required dependencies
        if (shardRepository && shardTypeRepository && relationshipService) {
            server.log.info('Attempting to register Opportunity routes (fallback)...');
            // Initialize minimal services for opportunity routes
            const { RiskCatalogService } = await import('../services/risk-catalog.service.js');
            const { RiskEvaluationService } = await import('../services/risk-evaluation.service.js');
            const riskCatalogService = new RiskCatalogService(monitoring, shardRepository, shardTypeRepository);
            // Create risk evaluation service (requires vectorSearchService and insightService)
            // If they're missing, we'll still try to register but some features may not work
            let riskEvaluationService = null;
            if (vectorSearchService && insightService) {
                riskEvaluationService = new RiskEvaluationService(monitoring, shardRepository, shardTypeRepository, relationshipService, riskCatalogService, vectorSearchService, insightService);
            }
            else {
                server.log.warn('⚠️ RiskEvaluationService not available - opportunity routes may have limited functionality');
            }
            // Only register if we have riskEvaluationService (required by OpportunityService)
            if (riskEvaluationService) {
                const { OpportunityService } = await import('../services/opportunity.service.js');
                const opportunityService = new OpportunityService(monitoring, shardRepository, shardTypeRepository, relationshipService, riskEvaluationService, teamService || undefined);
                await registerOpportunityRoutes(server, {
                    opportunityService,
                });
                server.log.info('✅ Opportunity routes registered (fallback)');
            }
            else {
                server.log.warn('⚠️ Opportunity routes not registered (fallback) - missing vectorSearchService or insightService');
            }
        }
    }
    catch (fallbackErr) {
        server.log.warn({ err: fallbackErr }, '⚠️ Opportunity routes fallback registration failed');
    }
    // SCIM Provisioning routes
    try {
        const cosmosClient = server.cosmosClient || server.cosmosDbClient;
        const userService = server.userService;
        const userManagementService = server.userManagementService;
        if (cosmosClient && userService && redis) {
            // Get containers using CosmosDbClient's getClient() and getDatabase() methods
            const rawClient = cosmosClient.getClient();
            const database = cosmosClient.getDatabase();
            const configContainer = database.container('tenant-configs');
            const activityContainer = database.container('scim-activity-logs');
            const userContainer = cosmosClient.getUsersContainer();
            // Initialize SCIM service
            const scimService = new SCIMService(configContainer, activityContainer, userContainer, userService, userManagementService || undefined, redis, monitoring);
            // Register SCIM 2.0 routes
            await registerSCIMRoutes(server, scimService);
            server.log.info('✅ SCIM routes registered');
            // Register tenant provisioning management routes
            await registerTenantProvisioningRoutes(server, scimService);
            server.log.info('✅ Tenant provisioning routes registered');
        }
        else {
            const missing = [];
            if (!cosmosClient) {
                missing.push('cosmosClient');
            }
            if (!userService) {
                missing.push('userService');
            }
            if (!redis) {
                missing.push('redis');
            }
            server.log.warn(`⚠️ SCIM routes not registered - missing dependencies: ${missing.join(', ')}`);
        }
    }
    catch (err) {
        server.log.warn({ err }, '⚠️ SCIM routes failed to register');
    }
    // OAuth2 Client Management routes
    try {
        const { registerOAuth2ClientRoutes } = await import('./oauth2-client.routes.js');
        await registerOAuth2ClientRoutes(server);
    }
    catch (err) {
        server.log.warn({ err }, '⚠️ OAuth2 client routes failed to register');
    }
    // Multi-Modal Assets routes
    try {
        // Try multiple ways to get the Cosmos DB client
        // First try the CosmosDbClient wrapper (has getClient() method)
        const cosmosClient = server.cosmos || server.cosmosClient || server.cosmosDbClient;
        // If we got a CosmosDbClient wrapper, extract the raw client
        // Otherwise, if we got a raw CosmosClient, use it directly
        let rawClient = null;
        if (cosmosClient) {
            // Check if it's a CosmosDbClient wrapper (has getClient method)
            if (typeof cosmosClient.getClient === 'function') {
                rawClient = cosmosClient.getClient();
            }
            else if (cosmosClient.database && cosmosClient.client) {
                // It's a CosmosClient from @azure/cosmos
                rawClient = cosmosClient;
            }
            else {
                // Try to get from cosmosDatabase
                const cosmosDatabase = server.cosmosDatabase;
                if (cosmosDatabase?.client) {
                    rawClient = cosmosDatabase.client;
                }
                else {
                    rawClient = cosmosClient;
                }
            }
        }
        const documentController = server.documentController;
        // Get blob storage service from document controller if available
        const blobStorageService = documentController?.blobStorageService;
        // Log what we found for debugging
        server.log.info('Multi-modal assets initialization check:', {
            hasCosmosClient: !!cosmosClient,
            hasRawClient: !!rawClient,
            hasDocumentController: !!documentController,
            hasBlobStorageService: !!blobStorageService,
            cosmosClientType: cosmosClient ? (typeof cosmosClient.getClient === 'function' ? 'CosmosDbClient wrapper' : 'CosmosClient') : 'null',
            serverProperties: {
                hasCosmos: !!server.cosmos,
                hasCosmosClient: !!server.cosmosClient,
                hasCosmosDbClient: !!server.cosmosDbClient,
                hasCosmosDatabase: !!server.cosmosDatabase,
            },
        });
        if (rawClient && blobStorageService) {
            // Initialize Image Analysis Service if Azure OpenAI is configured
            let imageAnalysisService = undefined;
            try {
                const { ImageAnalysisService } = await import('../services/multimodal/image-analysis.service.js');
                const azureOpenAIConfig = config.ai?.azureOpenAI;
                if (azureOpenAIConfig?.endpoint && azureOpenAIConfig?.apiKey) {
                    imageAnalysisService = new ImageAnalysisService({
                        endpoint: azureOpenAIConfig.endpoint,
                        apiKey: azureOpenAIConfig.apiKey,
                        deploymentName: process.env.AZURE_OPENAI_VISION_DEPLOYMENT_NAME || 'gpt-4-vision',
                        apiVersion: azureOpenAIConfig.apiVersion || '2024-02-15-preview',
                    }, monitoring);
                    server.log.info('✅ Image Analysis service initialized');
                }
                else {
                    server.log.warn('⚠️ Image Analysis service not initialized - Azure OpenAI Vision not configured');
                }
            }
            catch (err) {
                server.log.warn({ err }, '⚠️ Image Analysis service initialization failed');
            }
            // Initialize Audio Transcription Service if Azure OpenAI is configured
            let audioTranscriptionService = undefined;
            try {
                const { AudioTranscriptionService } = await import('../services/multimodal/audio-transcription.service.js');
                const azureOpenAIConfig = config.ai?.azureOpenAI;
                if (azureOpenAIConfig?.endpoint && azureOpenAIConfig?.apiKey) {
                    audioTranscriptionService = new AudioTranscriptionService({
                        endpoint: azureOpenAIConfig.endpoint,
                        apiKey: azureOpenAIConfig.apiKey,
                        deploymentName: process.env.AZURE_OPENAI_WHISPER_DEPLOYMENT_NAME || 'whisper-1',
                        apiVersion: azureOpenAIConfig.apiVersion || '2024-02-15-preview',
                    }, monitoring);
                    server.log.info('✅ Audio Transcription service initialized');
                }
                else {
                    server.log.warn('⚠️ Audio Transcription service not initialized - Azure OpenAI Whisper not configured');
                }
            }
            catch (err) {
                server.log.warn({ err }, '⚠️ Audio Transcription service initialization failed');
            }
            // Initialize Document Processing Service if Azure OpenAI is configured
            let documentProcessingService = undefined;
            try {
                const { DocumentProcessingService } = await import('../services/multimodal/document-processing.service.js');
                const azureOpenAIConfig = config.ai?.azureOpenAI;
                if (azureOpenAIConfig?.endpoint && azureOpenAIConfig?.apiKey) {
                    documentProcessingService = new DocumentProcessingService({
                        endpoint: azureOpenAIConfig.endpoint,
                        apiKey: azureOpenAIConfig.apiKey,
                        deploymentName: process.env.AZURE_OPENAI_VISION_DEPLOYMENT_NAME || 'gpt-4-vision',
                        apiVersion: azureOpenAIConfig.apiVersion || '2024-02-15-preview',
                    }, monitoring);
                    server.log.info('✅ Document Processing service initialized');
                }
                else {
                    server.log.warn('⚠️ Document Processing service not initialized - Azure OpenAI Vision not configured');
                }
            }
            catch (err) {
                server.log.warn({ err }, '⚠️ Document Processing service initialization failed');
            }
            // Initialize Video Processing Service (requires AudioTranscriptionService)
            let videoProcessingService = undefined;
            if (audioTranscriptionService) {
                try {
                    const { VideoProcessingService } = await import('../services/multimodal/video-processing.service.js');
                    videoProcessingService = new VideoProcessingService({
                        audioTranscriptionService,
                        imageAnalysisService, // Optional, for frame analysis
                        maxFramesToAnalyze: 5,
                        frameExtractionInterval: 30, // Extract frame every 30 seconds
                    }, monitoring);
                    server.log.info('✅ Video Processing service initialized');
                }
                catch (err) {
                    server.log.warn({ err }, '⚠️ Video Processing service initialization failed');
                }
            }
            else {
                server.log.warn('⚠️ Video Processing service not initialized - Audio Transcription service required');
            }
            // Initialize MultimodalAssetService
            const multimodalAssetService = new MultimodalAssetService(rawClient, blobStorageService, monitoring, imageAnalysisService, audioTranscriptionService, documentProcessingService, videoProcessingService);
            // Store on server for access by InsightService (if it needs to be updated later)
            server.decorate('multimodalAssetService', multimodalAssetService);
            // Initialize background worker for automatic asset processing
            let assetProcessingWorker = undefined;
            try {
                const { AssetProcessingWorker } = await import('../services/multimodal/asset-processing-worker.service.js');
                const database = cosmosClient.getDatabase();
                const mediaContainer = database.container(config.cosmosDb.containers.media);
                assetProcessingWorker = new AssetProcessingWorker(mediaContainer, multimodalAssetService, monitoring, {
                    pollIntervalMs: parseInt(process.env.ASSET_PROCESSING_POLL_INTERVAL_MS || '10000'),
                    maxConcurrentJobs: parseInt(process.env.ASSET_PROCESSING_MAX_CONCURRENT || '3'),
                    maxJobDurationMs: parseInt(process.env.ASSET_PROCESSING_MAX_DURATION_MS || '300000'),
                    batchSize: parseInt(process.env.ASSET_PROCESSING_BATCH_SIZE || '10'),
                });
                // Start the worker
                assetProcessingWorker.start();
                server.decorate('assetProcessingWorker', assetProcessingWorker);
                server.log.info('✅ Multi-modal asset processing worker started');
            }
            catch (err) {
                server.log.warn({ err }, '⚠️ Multi-modal asset processing worker initialization failed');
            }
            // Register multi-modal asset routes
            if (!multimodalAssetService) {
                server.log.warn('⚠️ Multi-modal asset routes not registered - multimodalAssetService missing');
            }
            else {
                try {
                    const authenticateDecorator = server.authenticate;
                    await server.register(multimodalAssetsRoutes, {
                        prefix: '/api/v1',
                        multimodalAssetService,
                        authenticate: authenticateDecorator, // Pass authenticate decorator explicitly
                        tokenValidationCache: server.tokenValidationCache, // Also pass cache
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
                        const assetsRoutes = routes.split('\n').filter(line => line.toLowerCase().includes('assets') &&
                            (line.includes('insights') || line.includes('/assets')));
                        if (assetsRoutes.length > 0) {
                            server.log.info(`✅ Assets routes registered (found ${assetsRoutes.length} route(s), format may differ)`);
                            server.log.debug({ routes: assetsRoutes.slice(0, 5) }, 'Assets routes found');
                        }
                        else {
                            server.log.warn('Available routes containing "assets":', routes.split('\n').filter(line => line.includes('assets')).slice(0, 15));
                            server.log.warn('Available routes containing "insights":', routes.split('\n').filter(line => line.includes('insights')).slice(0, 20));
                        }
                    }
                }
                catch (assetRouteErr) {
                    server.log.error({ err: assetRouteErr, stack: assetRouteErr.stack }, '❌ Failed to register multi-modal asset routes');
                }
            }
            // Update InsightService with multimodalAssetService if available
            // This handles the initialization order dependency - InsightService is created before MultimodalAssetService
            // but the setter method allows us to inject it after initialization
            const insightService = server.insightService;
            if (insightService && typeof insightService.setMultimodalAssetService === 'function') {
                insightService.setMultimodalAssetService(multimodalAssetService);
                server.log.info('✅ InsightService updated with MultimodalAssetService');
            }
            else {
                server.log.warn('⚠️ InsightService not found or setMultimodalAssetService method not available - multimodal features may be limited');
            }
        }
        else {
            const missingDeps = [];
            if (!cosmosClient) {
                missingDeps.push('Cosmos DB client');
            }
            if (!blobStorageService) {
                missingDeps.push('Blob Storage service');
            }
            server.log.warn(`⚠️ Multi-modal asset routes not registered - missing dependencies: ${missingDeps.join(', ')}`);
            // Log which dependencies are available
            if (cosmosClient) {
                server.log.debug('  ✅ Cosmos DB client available');
            }
            if (blobStorageService) {
                server.log.debug('  ✅ Blob Storage service available');
            }
            if (!blobStorageService) {
                server.log.info('  💡 Tip: Configure Azure Blob Storage to enable multi-modal asset upload and processing');
            }
        }
    }
    catch (err) {
        server.log.warn({ err }, '⚠️ Multi-modal asset routes failed to register');
    }
}
//# sourceMappingURL=index.js.map