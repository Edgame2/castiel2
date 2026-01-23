# Route Registration Dependencies

**Last Updated:** 2025-01-07  
**Purpose:** Document which API routes require which dependencies and services

---

## Overview

The Castiel API uses **conditional route registration** - routes are only registered if their required dependencies (controllers, services, databases) are available. This allows the system to gracefully degrade when optional services are not configured.

This document maps each route group to its dependencies, helping developers and operators understand:
- Which routes will be available in a given configuration
- What services need to be initialized for specific features
- Why certain routes may not be registered at startup

---

## Route Registration Pattern

Routes are registered in `apps/api/src/routes/index.ts` using this pattern:

```typescript
if ((server as any).requiredController) {
  await registerRoutes(server);
  server.log.info('✅ Routes registered');
} else {
  server.log.warn('⚠️ Routes not registered - RequiredController missing');
}
```

**Note:** Controllers and services are decorated on the Fastify server instance in `apps/api/src/index.ts` during initialization.

---

## Route Dependency Matrix

### Core Infrastructure Routes

#### Health Check Routes
- **Route Prefix:** `/health`
- **Dependencies:** None (always registered)
- **Status:** ✅ Always available
- **Notes:** Public routes for health monitoring

---

### Authentication Routes

#### Auth Routes (`/api/v1/auth/*`)
- **Controller:** `authController`
- **Dependencies:**
  - `UserService`
  - `TenantService`
  - `CacheManager` (Redis)
  - `JWT_SECRET` (environment variable)
- **Initialization:** In `index.ts` - requires Cosmos DB, Redis, Email Service
- **Status:** ⚠️ Conditional - logs warning if missing
- **Routes Include:**
  - POST `/api/v1/auth/login`
  - POST `/api/v1/auth/register`
  - POST `/api/v1/auth/refresh`
  - POST `/api/v1/auth/logout`

#### MFA Routes (`/api/v1/mfa/*`)
- **Controller:** `mfaController`
- **Dependencies:**
  - `MFAService`
  - `UserService`
  - `CacheManager` (Redis)
- **Initialization:** In `index.ts` - requires Cosmos DB, Redis
- **Status:** ⚠️ Conditional - logs warning if missing

#### MFA Audit Routes (`/api/v1/mfa-audit/*`)
- **Controller:** `mfaAuditController`
- **Dependencies:**
  - `MFAAuditService`
  - Cosmos DB (for audit logs)
- **Initialization:** In `index.ts` - requires Cosmos DB
- **Status:** ⚠️ Conditional - logs debug message if missing
- **Notes:** May fail to import route file if service unavailable

#### Magic Link Routes (`/api/v1/magic-link/*`)
- **Controller:** `magicLinkController`
- **Dependencies:**
  - `MagicLinkService`
  - `UserService`
  - `EmailService`
  - `CacheManager` (Redis)
- **Initialization:** In `index.ts` - requires Cosmos DB, Redis, Email Service
- **Status:** ⚠️ Conditional - logs warning if missing

#### SSO Routes (`/api/v1/sso/*`)
- **Controller:** `ssoController`
- **Dependencies:**
  - `SAMLService`
  - `UserService`
  - `TenantService`
- **Initialization:** In `index.ts` - requires Cosmos DB
- **Status:** ⚠️ Conditional - logs warning if missing

#### SSO Config Routes (`/api/v1/sso-config/*`)
- **Controller:** `ssoConfigController`
- **Dependencies:**
  - `SSOConfigService`
  - Cosmos DB
- **Initialization:** In `index.ts` - requires Cosmos DB
- **Status:** ⚠️ Conditional - logs warning if missing

#### Azure AD B2C Routes (`/api/v1/azure-ad-b2c/*`)
- **Controller:** `azureADB2CController`
- **Dependencies:**
  - `AzureADB2CService`
  - Azure AD B2C configuration (environment variables)
- **Initialization:** In `index.ts` - requires Azure AD B2C config
- **Status:** ⚠️ Conditional - logs warning if missing

#### OAuth Routes (`/api/v1/oauth/*`)
- **Controller:** `oauthController`
- **Dependencies:**
  - `OAuthService`
  - OAuth provider configuration (Google, GitHub, Microsoft)
- **Initialization:** In `index.ts` - requires OAuth config
- **Status:** ⚠️ Conditional - logs warning if missing

#### OAuth2 Routes (`/api/v1/oauth2/*`)
- **Controller:** `oauth2Controller`
- **Dependencies:**
  - `OAuth2AuthService`
  - `OAuth2ClientService`
  - Cosmos DB
- **Initialization:** In `index.ts` - requires Cosmos DB
- **Status:** ⚠️ Conditional - logs warning if missing

---

### User Management Routes

#### User Management Routes (`/api/v1/users/*`)
- **Controller:** `userManagementController`
- **Dependencies:**
  - `UserManagementService`
  - `UserService`
  - Cosmos DB
- **Initialization:** In `index.ts` - requires Cosmos DB
- **Status:** ⚠️ Conditional - logs warning if missing

#### External User IDs Routes (`/api/v1/external-user-ids/*`)
- **Controller:** `externalUserIdsController`
- **Dependencies:**
  - `ExternalUserIdService`
  - Cosmos DB
  - Integration services
- **Initialization:** In `index.ts` - requires Cosmos DB, integration services
- **Status:** ⚠️ Conditional - logs warning if missing

#### User Security Routes (`/api/v1/user-security/*`)
- **Controller:** `userSecurityController`
- **Dependencies:**
  - `DeviceSecurityService`
  - `UserService`
  - Cosmos DB
- **Initialization:** In `index.ts` - requires Cosmos DB
- **Status:** ⚠️ Conditional - logs warning if missing

#### Session Management Routes (`/api/v1/sessions/*`)
- **Controller:** `sessionManagementController`
- **Dependencies:**
  - `SessionManagementService`
  - `CacheManager` (Redis)
- **Initialization:** In `index.ts` - requires Redis
- **Status:** ⚠️ Conditional - logs warning if missing

---

### Tenant Management Routes

#### Tenant Routes (`/api/v1/tenants/*`)
- **Controller:** `tenantController`
- **Dependencies:**
  - `TenantService`
  - Cosmos DB
- **Initialization:** In `index.ts` - requires Cosmos DB
- **Status:** ⚠️ Conditional - logs warning if missing

#### Tenant Membership Routes (`/api/v1/tenant-membership/*`)
- **Controller:** `tenantMembershipController`
- **Dependencies:**
  - `TenantMembershipService`
  - `TenantInvitationService`
  - `EmailService`
  - Cosmos DB
- **Initialization:** In `index.ts` - requires Cosmos DB, Email Service
- **Status:** ⚠️ Conditional - logs warning if missing

---

### Role Management Routes

#### Role Management Routes (`/api/v1/roles/*`)
- **Controller:** `roleManagementController`
- **Dependencies:**
  - `RoleManagementService`
  - Cosmos DB (roles container)
- **Initialization:** In `index.ts` - requires Cosmos DB
- **Status:** ⚠️ Conditional - logs warning if missing
- **Notes:** Falls back to static roles if service unavailable

---

### Audit & Logging Routes

#### Audit Log Routes (`/api/v1/audit-logs/*`)
- **Dependencies:**
  - Cosmos DB client (`cosmos` or `cosmosClient`)
  - Cosmos DB database (`cosmosDatabase`)
- **Initialization:** In `index.ts` - requires Cosmos DB
- **Status:** ⚠️ Conditional - logs debug message if missing
- **Notes:** Checks for `cosmos` or `cosmosClient` property on server

---

### Notification Routes

#### Notification Routes (`/api/v1/notifications/*`)
- **Controller:** `notificationController`
- **Dependencies:**
  - `NotificationService`
  - Cosmos DB (notifications container)
  - Redis (optional, for real-time)
- **Initialization:** In `index.ts` - requires Cosmos DB
- **Status:** ⚠️ Conditional - logs warning if missing

---

### Document Management Routes

#### Document Routes (`/api/v1/documents/*`)
- **Controller:** `documentController`
- **Dependencies:**
  - `DocumentService`
  - Azure Blob Storage (`AZURE_STORAGE_CONNECTION_STRING`)
  - Cosmos DB
- **Initialization:** In `index.ts` - requires Cosmos DB, Azure Storage
- **Status:** ⚠️ Conditional - logs warning if missing

#### Bulk Document Routes (`/api/v1/documents/bulk/*`)
- **Controller:** `documentBulkController`
- **Dependencies:**
  - `BulkDocumentService`
  - `BulkJobRepository`
  - Cosmos DB database
  - `documentController` (must be initialized first)
  - `shardRepository`
- **Initialization:** 
  - Primary: In `index.ts` if prerequisites met
  - Fallback: Attempts initialization during route registration
- **Status:** ⚠️ Conditional - logs debug message if missing
- **Notes:** Will attempt lazy initialization if prerequisites available

---

### Collection Management Routes

#### Collection Routes (`/api/v1/collections/*`)
- **Controller:** `collectionController`
- **Dependencies:**
  - `CollectionService`
  - Cosmos DB
- **Initialization:** In `index.ts` - requires Cosmos DB
- **Status:** ⚠️ Conditional - logs warning if missing

---

### Shard Management Routes

#### Shard Types Routes (`/api/v1/shard-types/*`)
- **Dependencies:**
  - `ShardTypeRepository`
  - `ShardRepository` (optional)
  - `EnrichmentService` (optional)
- **Initialization:** Always registered (creates repository if needed)
- **Status:** ✅ Always available
- **Notes:** EnrichmentService can be undefined - controller handles gracefully

#### Shards Routes (`/api/v1/shards/*`)
- **Dependencies:**
  - `CacheService` (Redis)
  - `CacheSubscriberService` (Redis)
- **Initialization:** Requires Redis cache services
- **Status:** ⚠️ Conditional - logs warning if missing
- **Notes:** Core feature - should always be available in production

#### Shard Bulk Routes (`/api/v1/shards/bulk/*`)
- **Dependencies:**
  - `ShardRepository`
  - `ShardEventService` (optional)
  - Requires Shards Routes to be registered first
- **Initialization:** Created during Shards route registration
- **Status:** ⚠️ Conditional - depends on Shards routes

#### Shard Relationship Routes (`/api/v1/relationships/*`, `/api/v1/shards/*/relationships`)
- **Dependencies:**
  - `ShardRepository`
  - Requires Shards Routes to be registered first
- **Initialization:** Registered during Shards route registration
- **Status:** ⚠️ Conditional - depends on Shards routes

#### Collaboration Routes (`/api/v1/collaboration/*`)
- **Dependencies:**
  - `ShardRepository`
  - Requires Shards Routes to be registered first
- **Initialization:** Registered during Shards route registration
- **Status:** ⚠️ Conditional - depends on Shards routes

#### Collaborative Insights Routes (`/api/v1/collaborative-insights/*`)
- **Dependencies:**
  - Cosmos DB client
  - Cosmos DB database ID
  - Redis (optional, for caching)
  - Requires Shards Routes to be registered first
- **Initialization:** Lazy initialization during route registration
- **Status:** ⚠️ Conditional - logs debug message if missing
- **Notes:** Creates `CollaborativeInsightsRepository` and service on-demand

---

### AI & Insights Routes

#### AI Insights Routes (`/api/v1/insights/*`, `/api/v1/chat/*`)
- **Dependencies:**
  - `InsightService`
  - `ConversationService`
  - `authenticate` decorator (required)
  - `ContextTemplateService` (optional)
  - `EntityResolutionService` (optional)
  - `ContextAwareQueryParserService` (optional)
  - `MultimodalAssetService` (optional)
  - `tokenValidationCache` (optional)
- **Initialization:** Complex initialization in `index.ts`
- **Status:** ⚠️ Conditional - logs error if critical dependencies missing
- **Notes:** 
  - Requires Azure OpenAI configuration
  - Falls back gracefully for optional services
  - Two registration attempts (primary and fallback)

#### Proactive Insights Routes (`/api/v1/proactive-insights/*`)
- **Dependencies:**
  - `ProactiveInsightService`
  - Cosmos DB client
  - `InsightService`
  - `NotificationService` (optional)
- **Initialization:** Lazy initialization during route registration
- **Status:** ⚠️ Conditional - logs warning if missing

#### Proactive Triggers Routes (`/api/v1/proactive-triggers/*`)
- **Dependencies:**
  - `ProactiveTriggerService`
  - Cosmos DB
- **Initialization:** In `index.ts` - requires Cosmos DB
- **Status:** ⚠️ Conditional - logs warning if missing

#### Context Template Routes (`/api/v1/ai/context-templates/*`)
- **Dependencies:**
  - `ShardRepository`
  - `ShardTypeRepository`
  - `ShardRelationshipService`
  - Redis (optional)
- **Initialization:** Registered during Shards route registration
- **Status:** ⚠️ Conditional - depends on Shards routes

#### AI Connections Routes (`/api/v1/admin/ai/connections/*`)
- **Dependencies:**
  - `AIConnectionService`
  - `UnifiedAIClient`
- **Initialization:** In `index.ts` - requires Redis, Cosmos DB
- **Status:** ⚠️ Conditional - logs warning if missing

#### AI Tools Routes (`/api/v1/admin/ai/tools/*`)
- **Dependencies:**
  - `ToolExecutor`
  - `AIConnectionService`
- **Initialization:** In `index.ts` - requires AI services
- **Status:** ⚠️ Conditional - logs warning if missing

#### Intent Pattern Routes (`/api/v1/admin/intent-patterns/*`)
- **Dependencies:**
  - `UnifiedAIClient`
  - `AIConnectionService`
- **Initialization:** In `index.ts` - requires AI services
- **Status:** ⚠️ Conditional - logs warning if missing

#### Prompt Routes (`/api/v1/prompts/*`)
- **Dependencies:**
  - `PromptService`
  - Cosmos DB
- **Initialization:** In `index.ts` - requires Cosmos DB
- **Status:** ⚠️ Conditional - logs warning if missing

#### Prompt AB Test Routes (`/api/v1/admin/prompt-ab-tests/*`)
- **Dependencies:**
  - `PromptABTestService`
  - Redis
- **Initialization:** In `index.ts` - requires Redis
- **Status:** ⚠️ Conditional - logs warning if missing

---

### Embedding Routes

#### Embedding Routes (`/api/v1/embeddings/*`)
- **Dependencies:**
  - `ShardEmbeddingService`
  - Cosmos DB configuration
  - `EmbeddingTemplateService`
  - `EmbeddingService`
  - `ShardTypeRepository`
  - `ShardRepository`
- **Initialization:** 
  - Primary: In `index.ts` if all dependencies available
  - Fallback: Attempts lazy initialization during route registration
- **Status:** ⚠️ Conditional - logs debug message with missing dependencies
- **Notes:** Will attempt to create service if prerequisites available

#### Embedding Job Routes (`/api/v1/embedding-jobs/*`)
- **Dependencies:**
  - `ShardEmbeddingService` (must be registered first)
- **Initialization:** Registered after Embedding routes
- **Status:** ⚠️ Conditional - depends on Embedding routes

#### Embedding Template Routes (`/api/v1/embedding-templates/*`)
- **Dependencies:**
  - `EmbeddingTemplateService`
  - Cosmos DB
- **Initialization:** In `index.ts` - requires Cosmos DB, Azure OpenAI
- **Status:** ⚠️ Conditional - logs warning if missing

---

### Search Routes

#### Vector Search Routes (`/api/v1/search/vector`)
- **Dependencies:**
  - `VectorSearchService`
  - `ShardRepository`
  - Cosmos DB
- **Initialization:** In `index.ts` - requires Cosmos DB, Azure OpenAI
- **Status:** ⚠️ Conditional - logs warning if missing

#### Vector Search UI Routes (`/api/v1/search/*`)
- **Dependencies:**
  - Cosmos DB client or database
  - Redis (optional)
- **Initialization:** Lazy initialization during route registration
- **Status:** ⚠️ Conditional - logs debug message if missing
- **Notes:** Creates `VectorSearchUIService` on-demand

#### Search Analytics Routes (`/api/v1/search-analytics/*`)
- **Dependencies:**
  - Cosmos DB client or database
  - Redis (optional)
- **Initialization:** Lazy initialization during route registration
- **Status:** ⚠️ Conditional - logs debug message if missing
- **Notes:** Creates `SearchAnalyticsService` on-demand

---

### Integration Routes

#### Integration Routes (`/api/v1/integrations/*`)
- **Controllers:**
  - `integrationProviderController`
  - `integrationController`
  - `integrationSearchController`
- **Dependencies:**
  - `IntegrationProviderService`
  - `IntegrationService`
  - `IntegrationSearchService`
  - Cosmos DB (for initialization)
- **Initialization:** In `index.ts` - requires Cosmos DB, Key Vault (optional)
- **Status:** ⚠️ Conditional - logs debug message with missing controllers
- **Notes:** All three controllers must be available

#### Integration Catalog Routes (`/api/v1/admin/integration-catalog/*`)
- **Dependencies:**
  - Cosmos DB client
  - `IntegrationCatalogRepository`
- **Initialization:** Lazy initialization during route registration
- **Status:** ⚠️ Conditional - logs debug message if missing

#### Integration Monitoring Routes (`/api/v1/admin/integrations/monitoring/*`)
- **Dependencies:**
  - Cosmos DB (for search analytics)
- **Initialization:** Registered after Search Analytics routes
- **Status:** ⚠️ Conditional - depends on Search Analytics routes

---

### Dashboard Routes

#### Dashboard Routes (`/api/v1/dashboards/*`)
- **Dependencies:** None (always registered)
- **Status:** ✅ Always available (wrapped in try-catch)
- **Notes:** May fail silently if internal dependencies missing

#### Admin Dashboard Routes (`/api/v1/admin/dashboard/*`)
- **Dependencies:**
  - `MonitoringService`
- **Status:** ✅ Always available (wrapped in try-catch)

---

### Webhook Routes

#### Outgoing Webhook Routes (`/api/v1/webhooks/*`)
- **Dependencies:**
  - `WebhookDeliveryService`
  - `ShardEventService` (for initialization)
- **Initialization:** In `index.ts` - requires Redis
- **Status:** ⚠️ Conditional - logs warning if missing

#### Incoming Webhook Routes (`/webhooks/*`)
- **Dependencies:**
  - `WebhookManagementService`
  - Cosmos DB
- **Initialization:** In `index.ts` - requires Cosmos DB
- **Status:** ⚠️ Conditional - logs warning if missing
- **Notes:** Public endpoints (no prefix)

---

### Cache Management Routes

#### Cache Admin Routes (`/api/v1/admin/cache/*`)
- **Dependencies:**
  - `cosmosContainer`
  - Redis client
  - Cache services (shardCache, aclCache, vectorSearchCache, tokenValidationCache)
- **Initialization:** Requires Cosmos DB and Redis
- **Status:** ⚠️ Conditional - logs warning if missing

#### Cache Optimization Routes (`/api/v1/admin/cache-optimization/*`)
- **Dependencies:**
  - Cosmos DB (for search analytics)
- **Initialization:** Registered after Search Analytics routes
- **Status:** ⚠️ Conditional - depends on Search Analytics routes

---

### Schema Migration Routes

#### Schema Migration Routes (`/api/v1/schema-migrations/*`)
- **Dependencies:**
  - `CacheService` (Redis)
  - `CacheSubscriberService` (Redis)
  - `ShardRepository`
  - `ShardTypeRepository`
- **Initialization:** Requires cache services
- **Status:** ⚠️ Conditional - logs warning if missing

---

### Other Routes

#### Widget Catalog Routes (`/api/v1/widgets/*`)
- **Dependencies:** None (always registered)
- **Status:** ✅ Always available (wrapped in try-catch)

#### Option List Routes (`/api/v1/option-lists/*`)
- **Dependencies:**
  - `MonitoringService`
- **Status:** ✅ Always available (wrapped in try-catch)

#### Onboarding Routes (`/api/v1/onboarding/*`)
- **Dependencies:**
  - Cosmos DB client or database
  - `EmailService`
- **Initialization:** Lazy initialization during route registration
- **Status:** ⚠️ Conditional - logs debug message if missing

#### Project Analytics Routes (`/api/v1/project-analytics/*`)
- **Dependencies:**
  - `ShardRepository`
- **Initialization:** Requires Shards routes to be registered first
- **Status:** ⚠️ Conditional - logs warning if missing

#### Risk Analysis Routes (`/api/v1/risk-analysis/*`)
- **Dependencies:**
  - `ShardRepository`
  - `ShardTypeRepository`
  - `ShardRelationshipService`
  - `VectorSearchService`
  - `InsightService`
  - `QueueService` (optional, for async processing)
- **Initialization:** Complex initialization during route registration
- **Status:** ⚠️ Conditional - logs warning with missing dependencies
- **Notes:** Creates `RiskEvaluationService` and stores on server

#### API Performance Routes (`/api/v1/admin/performance/*`)
- **Dependencies:**
  - Cosmos DB (for search analytics)
- **Initialization:** Registered after Search Analytics routes
- **Status:** ⚠️ Conditional - depends on Search Analytics routes

#### SSE Routes (`/api/v1/sse/*`)
- **Dependencies:**
  - `tokenValidationCache` (optional)
  - `ConversationEventSubscriberService` (optional, requires Redis)
- **Status:** ✅ Always registered
- **Notes:** Works without optional dependencies (degraded functionality)

#### WebSocket Routes (`/ws`)
- **Dependencies:**
  - `tokenValidationCache` (optional)
- **Status:** ✅ Always registered
- **Notes:** Works without optional dependencies

#### Protected Routes (`/api/v1/*`)
- **Dependencies:**
  - `tokenValidationCache` (optional)
- **Status:** ✅ Always registered
- **Notes:** Adds authentication hook to `/api/v1/*` routes

---

## Dependency Categories

### Critical Dependencies (Required for Core Functionality)

1. **Cosmos DB**
   - Required for: Most routes
   - Environment Variables: `COSMOS_DB_ENDPOINT`, `COSMOS_DB_KEY`, `COSMOS_DB_DATABASE_ID`
   - Impact: Most features unavailable without it

2. **Redis**
   - Required for: Caching, sessions, real-time features
   - Environment Variables: `REDIS_URL` or `REDIS_HOST` + `REDIS_PORT`
   - Impact: Performance degradation, some features unavailable

3. **JWT Secrets**
   - Required for: Authentication routes
   - Environment Variables: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
   - Impact: Authentication completely broken

### Optional Dependencies (Feature-Specific)

1. **Azure OpenAI**
   - Required for: AI features, embeddings, insights
   - Environment Variables: `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`
   - Impact: AI features unavailable

2. **Azure Blob Storage**
   - Required for: Document management
   - Environment Variables: `AZURE_STORAGE_CONNECTION_STRING`
   - Impact: Document upload/download unavailable

3. **Email Service**
   - Required for: Notifications, invitations, magic links
   - Environment Variables: `RESEND_API_KEY` or `AZURE_ACS_CONNECTION_STRING`
   - Impact: Email-based features unavailable

4. **Azure Key Vault**
   - Required for: Secure credential storage
   - Environment Variables: `AZURE_KEY_VAULT_URL`
   - Impact: Credentials stored in environment variables (less secure)

5. **OAuth Providers**
   - Required for: Social login
   - Environment Variables: `GOOGLE_CLIENT_ID`, `GITHUB_CLIENT_ID`, etc.
   - Impact: Social login unavailable

---

## Route Registration Order

Routes are registered in this order (important for dependencies):

1. Health routes (always first)
2. Authentication routes (auth, MFA, SSO, OAuth)
3. User management routes
4. Tenant management routes
5. Audit log routes
6. Notification routes
7. Protected routes hook (adds authentication)
8. SSE/WebSocket routes
9. Shard Types routes
10. Document routes
11. Collection routes
12. Shards routes (creates ShardRepository)
13. Shard-related routes (bulk, relationships, collaboration)
14. AI/Insights routes (depends on ShardRepository)
15. Embedding routes
16. Search routes
17. Integration routes
18. Dashboard routes
19. Webhook routes
20. Cache management routes
21. Schema migration routes
22. Other routes (widgets, options, onboarding, etc.)

**Note:** Some routes depend on services created during earlier route registration (e.g., ShardRepository created during Shards route registration).

---

## Troubleshooting Route Registration

### Check Startup Logs

Look for these log messages:
- ✅ `Routes registered` - Route group successfully registered
- ⚠️ `Routes not registered - [dependency] missing` - Route group skipped
- ❌ `Routes failed to register` - Route registration error

### Common Issues

1. **Routes not registering:**
   - Check if required controller/service is decorated on server
   - Verify dependencies are initialized in `index.ts`
   - Check environment variables for required services

2. **Routes registering but failing:**
   - Check route file imports
   - Verify service initialization completed successfully
   - Check for circular dependencies

3. **Routes missing in production:**
   - Verify all environment variables are set
   - Check Cosmos DB and Redis connectivity
   - Review startup logs for warnings

### Health Check Endpoint

Use `/health` endpoint to verify:
- Server is running
- Redis connectivity (if configured)
- Basic system health

---

## Recommendations

1. **Always check startup logs** for route registration warnings
2. **Document environment requirements** for each feature
3. **Use health checks** to verify service availability
4. **Monitor route registration** in production logs
5. **Test with minimal configuration** to verify graceful degradation

---

## Related Documentation

- [Environment Variables Reference](./development/ENVIRONMENT_VARIABLES.md)
- [Architecture Documentation](./ARCHITECTURE.md)
- [Development Guide](./DEVELOPMENT.md)

---

**Last Updated:** January 2025  
**Maintained By:** Development Team

---

## 🔍 Gap Analysis

### Current Implementation Status

**Status:** ✅ **Complete** - Route registration dependencies fully documented

#### Implemented Features (✅)

- ✅ Route dependency matrix
- ✅ Conditional route registration pattern
- ✅ Dependency documentation
- ✅ Status indicators

#### Known Limitations

- ⚠️ **Service Initialization Complexity** - Route registration logic is complex (4,102 lines)
  - **Code Reference:**
    - `apps/api/src/routes/index.ts` - 4,102 lines
  - **Recommendation:**
    1. Refactor route registration
    2. Simplify initialization logic
    3. Extract to dedicated modules

- ⚠️ **Silent Failures** - Some routes may fail to register silently
  - **Code Reference:**
    - Try-catch blocks may silently fail
  - **Recommendation:**
    1. Improve error handling
    2. Log all registration failures
    3. Document failure scenarios

### Related Documentation

- [Gap Analysis](./GAP_ANALYSIS.md) - Comprehensive gap analysis
- [Backend Documentation](./backend/README.md) - Backend implementation
- [Architecture](./ARCHITECTURE.md) - System architecture


