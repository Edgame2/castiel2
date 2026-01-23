import 'fastify';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { CacheService } from '../services/cache.service.js';
import type { CacheSubscriberService } from '../services/cache-subscriber.service.js';
import type { TokenValidationCacheService } from '../services/token-validation-cache.service.js';
import type { CacheManager } from '../cache/manager.js';
import type { AuthController } from '../controllers/auth.controller.js';
import type { MFAController } from '../controllers/mfa.controller.js';
import type { OAuthController } from '../controllers/oauth.controller.js';
import type { OAuth2Controller } from '../controllers/oauth2.controller.js';
import type { TenantController } from '../controllers/tenant.controller.js';
import type { KeyVaultService } from '@castiel/key-vault';
import type { AIConfigService } from '../services/ai-config.service.js';
import type { ServiceRegistryService } from '../services/service-registry.service.js';
import type { ConfigurationService } from '../services/configuration.service.js';

type FastifyRouteMiddleware = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

// Extended FastifyInstance with all decorated services
declare module 'fastify' {
  interface FastifyInstance {
    // Core services
    cache?: CacheService;
    cacheSubscriber?: CacheSubscriberService | null;
    tokenValidationCache?: TokenValidationCacheService | null;
    cacheManager?: CacheManager | null;
    rateLimiter?: any; // RateLimiterService | InMemoryRateLimiterService
    
    // Authentication & Authorization
    authenticate?: FastifyRouteMiddleware;
    optionalAuthenticate?: FastifyRouteMiddleware;
    authController?: AuthController;
    mfaController?: MFAController;
    oauthController?: OAuthController;
    oauth2Controller?: OAuth2Controller;
    tenantController?: TenantController;
    
    // Configuration & Infrastructure
    keyVaultService?: KeyVaultService | null;
    aiConfigService?: AIConfigService | null;
    configurationService?: ConfigurationService;
    serviceRegistry?: ServiceRegistryService;
    diContainer?: any; // Dependency injection container (if used)
    
    // Data & Repositories
    shardTypeRepository?: any;
    relationshipService?: any;
    
    // AI & ML Services
    insightService?: any;
    vectorSearchService?: any;
    embeddingService?: any;
    embeddingTemplateService?: any;
    shardEmbeddingService?: any;
    shardEmbeddingChangeFeedService?: any;
    azureOpenAI?: any;
    enrichmentService?: any;
    conversationSummarizationService?: any;
    conversationContextRetrievalService?: any;
    memoryContextService?: any;
    contextQualityService?: any;
    contextCacheService?: any;
    multimodalAssetService?: any;
    assetProcessingWorker?: any;
    
    // Risk & Analysis
    riskEvaluationService?: any;
    
    // Security & Quality
    piiDetectionService?: any;
    piiRedactionService?: any;
    fieldSecurityService?: any;
    citationValidationService?: any;
    promptInjectionDefenseService?: any;
    comprehensiveAuditTrailService?: any;
    
    // Integration Services
    integrationProviderController?: any;
    integrationController?: any;
    integrationSearchController?: any;
    integrationProviderService?: any;
    integrationService?: any;
    integrationSearchService?: any;
    adapterManagerService?: any;
    integrationRepository?: any;
    externalUserIdsController?: any;
    ssoTeamSyncService?: any;
    
    // Document Services
    bulkDocumentService?: any;
    documentBulkController?: any;
    
    // Feedback & Learning
    userFeedbackService?: any;
    
    // Cosmos DB (for cache admin routes)
    cosmos?: any;
    cosmosDatabase?: any;
    cosmosContainer?: any;
    
    // Other optional services
    [key: string]: any; // Allow additional dynamic decorations
  }

  interface FastifyRequest {
    auth?: import('../types/auth.types.js').AuthContext;
    user?: import('../types/auth.types.js').AuthUser;
  }
}
