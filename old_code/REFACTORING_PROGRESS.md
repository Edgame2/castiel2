# Refactoring Progress: Large Routes and Services

## Overview
This document tracks progress on refactoring the large `routes/index.ts` file (4574 lines) and splitting large service files according to the plan.

## Completed Work

### 1. Infrastructure Services Initialization Module ✅
**File:** `apps/api/src/services/initialization/infrastructure-services.init.ts`
- Created module to verify/access infrastructure services (Redis, Cosmos DB, Blob Storage, Key Vault)
- Provides structured interface for infrastructure service availability
- Includes health tracking integration

### 2. AI Services Initialization Module ✅
**File:** `apps/api/src/services/initialization/ai-services.init.ts`
- Comprehensive AI services initialization extracted from routes/index.ts
- Initializes:
  - ConversionService
  - ConversationRealtimeService
  - AzureOpenAIService
  - EnrichmentService
  - Embedding services (Template, Service, ShardEmbedding, VectorSearch)
  - ACLService
  - QueueService
  - ModelRouterService
  - AIModelSelectionService
  - UnifiedAIClient
  - ConversationSummarizationService
  - ConversationContextRetrievalService
  - ContextTemplateService
  - IntentAnalyzerService
  - ConversationService
  - Prompt System (Repository, Renderer, Resolver, Analytics)
  - EntityResolutionService
  - ContextAwareQueryParserService
  - GroundingService
  - AIToolExecutorService
  - ContextQualityService
  - ComprehensiveAuditTrailService
  - PII Detection/Redaction Services
  - FieldSecurityService
  - CitationValidationService
  - PromptInjectionDefenseService
  - ContextCacheService
  - TenantProjectConfigService
  - InsightService (main orchestrator)
  - UserFeedbackService
- Includes proper error handling and health tracking
- ~600+ lines of well-organized initialization logic

### 3. Route Registration Modules ✅
**Files Created:**
- `apps/api/src/routes/registration/ai-routes.registration.ts` - Registers all AI-related routes
- `apps/api/src/routes/registration/data-routes.registration.ts` - Registers all data-related routes

**Pattern Established:**
- Route registration modules take initialized services as dependencies
- Clean separation between service initialization and route registration
- Proper error handling and logging
- Route tracking integration

## Remaining Work

### 1. Complete Route Registration Modules
Need to create:
- `content-routes.registration.ts` - Content generation, templates, documents
- `integration-routes.registration.ts` - Integration routes
- `analytics-routes.registration.ts` - Analytics, monitoring routes
- `auth-routes.registration.ts` - (May already be handled by auth-services.init.ts)

### 2. Refactor Main index.ts
**Current State:** 4574 lines
**Target:** 200-300 lines (thin orchestrator)

**Steps:**
1. Replace inline AI services initialization (lines ~1180-2400) with call to `initializeAIServices()`
2. Replace inline data services initialization with calls to data initialization modules
3. Replace route registration calls with calls to route registration modules
4. Maintain all existing functionality
5. Ensure proper dependency ordering

**Example Refactored Pattern:**
```typescript
// Initialize infrastructure
const infrastructure = await initializeInfrastructureServices(server, redis, monitoring, serviceHealthTracker);

// Initialize data services
const dataServices = await initializeDataServices(server, monitoring, infrastructure);

// Initialize AI services
const aiServices = await initializeAIServices(server, {
  monitoring,
  redis,
  shardRepository: dataServices.shardRepository,
  shardTypeRepository: dataServices.shardTypeRepository,
  relationshipService: dataServices.relationshipService,
  cosmosDatabase: infrastructure.cosmosDatabase,
  cosmosClient: infrastructure.cosmosClient,
  configurationService: coreServices.configurationService,
  aiConfigService: (server as any).aiConfigService,
  aiConnectionService: (server as any).aiConnectionService,
  serviceRegistry: coreServices.serviceRegistry,
  serviceHealthTracker,
});

// Register routes
await registerDataRoutes(server, {
  monitoring,
  shardRepository: dataServices.shardRepository,
  shardTypeRepository: dataServices.shardTypeRepository,
  relationshipService: dataServices.relationshipService,
  cacheService: infrastructure.cacheService,
  cacheSubscriber: infrastructure.cacheSubscriber,
  vectorSearchService: aiServices.vectorSearchService,
  // ... other dependencies
});

await registerAIRoutes(server, {
  insightService: aiServices.insightService,
  conversationService: aiServices.conversationService,
  contextTemplateService: aiServices.contextTemplateService,
  // ... other dependencies
});
```

### 3. Split Large Service Files

#### InsightService (~5000 lines)
**Target:** Split into 6-7 focused services
- `insight-orchestrator.service.ts` (~500-800 lines) - Main orchestration
- `insight-context-assembly.service.ts` - Context assembly logic
- `insight-llm-execution.service.ts` - LLM execution logic
- `insight-grounding.service.ts` - Grounding logic
- `insight-suggestions.service.ts` - Suggestions generation
- `insight-content-formatting.service.ts` - Content formatting utilities
- `insight-cost-tracking.service.ts` - Cost estimation

#### RiskEvaluationService (~3000 lines)
**Target:** Split into 5-6 focused services
- `risk-evaluation-orchestrator.service.ts` (~400-600 lines) - Main orchestration
- `risk-detection.service.ts` - Risk detection logic
- `risk-pattern-matching.service.ts` - Historical pattern matching
- `risk-ai-validation.service.ts` - AI-powered risk validation
- `risk-scoring.service.ts` - Risk scoring calculations
- `risk-explainability.service.ts` - Explainability logic
- `risk-catalog-integration.service.ts` - Risk catalog integration

## Implementation Strategy

### Phase 1: Complete Route Registration (Current)
1. ✅ Create infrastructure-services.init.ts
2. ✅ Create comprehensive ai-services.init.ts
3. ✅ Create ai-routes.registration.ts
4. ✅ Create data-routes.registration.ts
5. ⏳ Create remaining route registration modules
6. ⏳ Refactor main index.ts to use all modules

### Phase 2: Service File Splitting
1. ⏳ Split InsightService
2. ⏳ Split RiskEvaluationService
3. ⏳ Update all references
4. ⏳ Maintain backward compatibility during transition

## Notes

- The refactoring maintains backward compatibility - services are still decorated on the server
- Error handling and health tracking are preserved
- Route tracking continues to work
- All existing functionality should remain intact

## Testing Strategy

After refactoring:
1. Verify all routes still register correctly
2. Test service initialization order
3. Verify error handling works
4. Check health tracking
5. Run integration tests
6. Verify no functionality regression
