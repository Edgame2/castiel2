# Migration Remaining Report

**Generated:** 2026-01-23  
**Status:** ⚠️ **208 Services Remaining** (~85% of migration incomplete)

---

## Executive Summary

### Migration Progress
- ✅ **Migrated Services:** 38 services (15%)
- ⚠️ **Remaining Services:** ~208 services (85%)
- 📊 **Overall Progress:** ~15% complete

### Critical Status
- **No active code dependencies** on `old_code/` - safe to keep for reference
- **High-priority services** still need migration for core functionality
- **Large services** (5,292+ lines) require careful planning

---

## Migrated Services (38) ✅

### Foundation Services (Tier 1) - COMPLETE ✅
1. ✅ **auth** - Multi-provider authentication, JWT management
2. ✅ **user-management** - User profiles, organizations, teams, RBAC
3. ✅ **logging** - Comprehensive audit trail, multi-tenancy
4. ✅ **secret-management** - Encryption, key rotation, RBAC
5. ✅ **api-gateway** - Request routing, rate limiting, circuit breakers
6. ✅ **shared** - Common utilities and types

### Data & Core Services (Tier 2) - COMPLETE ✅
7. ✅ **shard-manager** - Shard CRUD, relationships, bulk operations
8. ✅ **document-manager** - Document CRUD, file upload/download
9. ✅ **cache-service** - Cache management and optimization
10. ✅ **embeddings** - Embedding storage and semantic search
11. ✅ **search-service** - Vector search, full-text search

### AI & Intelligence Services (Tier 3) - COMPLETE ✅
12. ✅ **ai-service** - LLM completions, model routing
13. ✅ **ai-insights** - AI insights generation, risk analysis
14. ✅ **adaptive-learning** - CAIS adaptive learning system
15. ✅ **context-service** - Context management, AST analysis
16. ✅ **ml-service** - ⭐ **CRITICAL** - ML enhancement core (Risk Scoring, Revenue Forecasting, Recommendations)
17. ✅ **multi-modal-service** - Image, audio, video understanding
18. ✅ **reasoning-engine** - Chain-of-thought, tree-of-thought reasoning
19. ✅ **prompt-service** - Prompt management, A/B testing

### Integration & Content Services (Tier 5) - COMPLETE ✅
20. ✅ **integration-manager** - Integration CRUD, webhooks, sync tasks
21. ✅ **content-generation** - AI content generation, templates
22. ✅ **template-service** - Template management

### Risk & Analytics Services (Tier 6) - COMPLETE ✅
23. ✅ **analytics-service** - Analytics and metrics
24. ✅ **compliance-service** - Standards and regulatory compliance
25. ✅ **security-service** - Security scanning, vulnerability detection

### Specialized Services (Tier 7) - COMPLETE ✅
26. ✅ **notification-manager** - Event-based notifications
27. ✅ **dashboard** - Dashboard CRUD, widget management
28. ✅ **pattern-recognition** - Pattern learning, style consistency
29. ✅ **performance-optimization** - Code optimization, query optimization
30. ✅ **pipeline-manager** - Pipeline views, opportunity management
31. ✅ **validation-engine** - Syntax, semantic, architecture validation

### New Services (Not in old_code/) - COMPLETE ✅
32. ✅ **configuration-service** - Centralized configuration
33. ✅ **migration-service** - Migration management and tracking

### Newly Implemented Services (2026) - COMPLETE ✅
34. ✅ **ai-conversation** - Complete conversation system (11 services, 1,750+ lines)
35. ✅ **data-enrichment** - Enrichment pipeline, vectorization (300+ lines)
36. ✅ **risk-catalog** - Risk catalog management (850+ lines)
37. ✅ **risk-analytics** - Risk evaluation with CAIS (1,100+ lines)
38. ✅ **recommendations** - Recommendation engine with CAIS (950+ lines)
39. ✅ **forecasting** - Forecasting with CAIS (800+ lines)
40. ✅ **workflow-orchestrator** - Workflow coordination (500+ lines)
41. ✅ **integration-sync** - Sync task management (400+ lines)
42. ✅ **cache-management** - Cache metrics and optimization
43. ✅ **security-scanning** - PII detection, security scanning
44. ✅ **dashboard-analytics** - Dashboard analytics and caching
45. ✅ **web-search** - Web search integration
46. ✅ **ai-analytics** - AI usage analytics
47. ✅ **collaboration-intelligence** - Collaborative insights
48. ✅ **signal-intelligence** - Signal analysis
50. ✅ **quality-monitoring** - Quality metrics and anomaly detection
51. ✅ **utility-services** - Import/export utilities
52. ✅ **ui** - Next.js 16 UI container

---

## Services Requiring Migration (208) ⚠️

### Tier 2: Data & Core Services (7 services)

#### HIGH PRIORITY ⚠️

1. **enrichment** ⚠️ **HIGH PRIORITY**
   - **Why:** Core data processing service, used by many AI services
   - **Dependencies:** shard-manager ✅, embeddings ✅
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/enrichment.service.ts`
   - **Estimated Effort:** 2-3 days
   - **Note:** May overlap with data-enrichment container - verify

2. **vectorization** ⚠️ **HIGH PRIORITY**
   - **Why:** Required for embeddings and search
   - **Dependencies:** embeddings ✅, ai-service ✅
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/vectorization.service.ts`
   - **Estimated Effort:** 2 days

3. **shard-embedding** ⚠️ **HIGH PRIORITY**
   - **Why:** Links shards to embeddings
   - **Dependencies:** shard-manager ✅, embeddings ✅
   - **Complexity:** Low
   - **Files:** `old_code/apps/api/src/services/shard-embedding.service.ts`
   - **Estimated Effort:** 1-2 days

#### MEDIUM PRIORITY ⚠️

4. **shard-relationship** ⚠️ **MEDIUM PRIORITY**
   - **Why:** Graph relationships between shards
   - **Dependencies:** shard-manager ✅
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/shard-relationship.service.ts`
   - **Estimated Effort:** 2 days

5. **shard-linking** ⚠️ **MEDIUM PRIORITY**
   - **Why:** Links shards together
   - **Dependencies:** shard-manager ✅
   - **Complexity:** Low
   - **Files:** `old_code/apps/api/src/services/shard-linking.service.ts`
   - **Estimated Effort:** 1 day

6. **acl** ⚠️ **MEDIUM PRIORITY**
   - **Why:** Access control for shards
   - **Dependencies:** shard-manager ✅, user-management ✅
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/acl.service.ts`
   - **Estimated Effort:** 2 days

#### LOW PRIORITY ⚠️

7. **acl-cache** ⚠️ **LOW PRIORITY**
   - **Why:** Caching layer for ACL
   - **Dependencies:** acl ⚠️, cache-service ✅
   - **Complexity:** Low
   - **Files:** `old_code/apps/api/src/services/acl-cache.service.ts`
   - **Estimated Effort:** 1 day

---

### Tier 3: AI & Intelligence Services (10 services)

#### CRITICAL ⚠️

1. **conversation** ⚠️ **CRITICAL**
   - **Why:** Core AI conversation functionality
   - **Dependencies:** ai-service ✅, context-service ✅, ai-insights ✅
   - **Complexity:** High
   - **Files:** `old_code/apps/api/src/services/conversation.service.ts` (5,292 lines)
   - **Estimated Effort:** 5-7 days
   - **Note:** ⚠️ Very large service - consider splitting into sub-services
   - **Status:** May overlap with ai-conversation container - verify

2. **ai-context-assembly** ⚠️ **CRITICAL**
   - **Why:** Assembles context for AI requests
   - **Dependencies:** context-service ✅, shard-manager ✅
   - **Complexity:** High
   - **Files:** `old_code/apps/api/src/services/ai-context-assembly.service.ts` (1,074 lines)
   - **Estimated Effort:** 3-4 days
   - **Note:** May overlap with context-service container - verify

#### HIGH PRIORITY ⚠️

3. **grounding** ⚠️ **HIGH PRIORITY**
   - **Why:** Verifies AI outputs and generates citations
   - **Dependencies:** ai-service ✅, context-service ✅
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/grounding.service.ts`
   - **Estimated Effort:** 2-3 days
   - **Note:** May overlap with ai-conversation container - verify

4. **intent-analyzer** ⚠️ **HIGH PRIORITY**
   - **Why:** Analyzes user intent for AI requests
   - **Dependencies:** ai-service ✅
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/intent-analyzer.service.ts`
   - **Estimated Effort:** 2 days
   - **Note:** May overlap with ai-conversation container - verify

#### MEDIUM PRIORITY ⚠️

5. **context-template** ⚠️ **MEDIUM PRIORITY**
   - **Why:** Template management for context assembly
   - **Dependencies:** template-service ✅, context-service ✅
   - **Complexity:** Low
   - **Files:** `old_code/apps/api/src/services/context-template.service.ts`
   - **Estimated Effort:** 1-2 days

6. **context-cache** ⚠️ **MEDIUM PRIORITY**
   - **Why:** Caching for context assembly
   - **Dependencies:** context-service ✅, cache-service ✅
   - **Complexity:** Low
   - **Files:** `old_code/apps/api/src/services/context-cache.service.ts`
   - **Estimated Effort:** 1 day

7. **context-quality** ⚠️ **MEDIUM PRIORITY**
   - **Why:** Quality assessment for context
   - **Dependencies:** context-service ✅, ai-service ✅
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/context-quality.service.ts`
   - **Estimated Effort:** 2 days

#### LOW PRIORITY ⚠️

8. **conversation-summarization** ⚠️ **LOW PRIORITY**
   - **Why:** Summarizes conversations
   - **Dependencies:** conversation ⚠️, ai-service ✅
   - **Complexity:** Low
   - **Files:** `old_code/apps/api/src/services/conversation-summarization.service.ts`
   - **Estimated Effort:** 1-2 days
   - **Note:** May overlap with ai-conversation container - verify

9. **conversation-context-retrieval** ⚠️ **LOW PRIORITY**
   - **Why:** Retrieves context for conversations
   - **Dependencies:** conversation ⚠️, context-service ✅
   - **Complexity:** Low
   - **Files:** `old_code/apps/api/src/services/conversation-context-retrieval.service.ts`
   - **Estimated Effort:** 1 day
   - **Note:** May overlap with ai-conversation container - verify

10. **citation-validation** ⚠️ **LOW PRIORITY**
    - **Why:** Validates citations in AI responses
    - **Dependencies:** grounding ⚠️, context-service ✅
    - **Complexity:** Low
    - **Files:** `old_code/apps/api/src/services/citation-validation.service.ts`
    - **Estimated Effort:** 1 day
    - **Note:** May overlap with ai-conversation container - verify

---

### Tier 4: Adaptive Learning Services (22 services)

**Note:** These services are part of the adaptive-learning module. They should be migrated as part of expanding the adaptive-learning container, not as separate services.

1. **adaptive-weight-learning** → Part of adaptive-learning ✅
2. **adaptive-model-selection** → Part of adaptive-learning ✅
3. **signal-weighting** → Part of adaptive-learning ✅
4. **adaptive-feature-engineering** → Part of adaptive-learning ✅
5. **outcome-collector** → Part of adaptive-learning ✅
6. **performance-tracker** → Part of adaptive-learning ✅
7. **adaptive-learning-validation** → Part of adaptive-learning ✅
8. **adaptive-learning-rollout** → Part of adaptive-learning ✅
9. **meta-learning** → Part of adaptive-learning ✅
10. **active-learning** → Part of adaptive-learning ✅
11. **feedback-quality** → Part of adaptive-learning ✅
12. **episodic-memory** → Part of adaptive-learning ✅
13. **counterfactual** → Part of adaptive-learning ✅
14. **causal-inference** → Part of adaptive-learning ✅
15. **multimodal-intelligence** → Part of adaptive-learning ✅
16. **prescriptive-analytics** → Part of adaptive-learning ✅
17. **reinforcement-learning** → Part of adaptive-learning ✅
18. **graph-neural-network** → Part of adaptive-learning ✅
19. **neuro-symbolic** → Part of adaptive-learning ✅
20. **conflict-resolution-learning** → Part of adaptive-learning ✅
21. **hierarchical-memory** → Part of adaptive-learning ✅
22. **adversarial-testing** → Part of adaptive-learning ✅

**Action Required:** Review adaptive-learning container and ensure all these services are included or create sub-modules.

---

### Tier 5: Integration & Content Services (5 services)

#### MEDIUM PRIORITY ⚠️

1. **integration-catalog** ⚠️ **MEDIUM PRIORITY**
   - **Why:** Catalog of available integrations
   - **Dependencies:** integration-manager ✅
   - **Complexity:** Low
   - **Files:** `old_code/apps/api/src/services/integration-catalog.service.ts`
   - **Estimated Effort:** 1-2 days

2. **integration-connection** ⚠️ **MEDIUM PRIORITY**
   - **Why:** Manages integration connections
   - **Dependencies:** integration-manager ✅, secret-management ✅
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/integration-connection.service.ts`
   - **Estimated Effort:** 2 days

3. **adapter-manager** ⚠️ **MEDIUM PRIORITY**
   - **Why:** Manages integration adapters
   - **Dependencies:** integration-manager ✅
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/adapter-manager.service.ts`
   - **Estimated Effort:** 2-3 days

#### LOW PRIORITY ⚠️

4. **bidirectional-sync** ⚠️ **LOW PRIORITY**
   - **Why:** Bidirectional sync for integrations
   - **Dependencies:** integration-manager ✅
   - **Complexity:** High
   - **Files:** `old_code/apps/api/src/services/bidirectional-sync.service.ts`
   - **Estimated Effort:** 3-4 days
   - **Note:** May overlap with integration-sync container - verify

5. **sync-task** ⚠️ **LOW PRIORITY**
   - **Why:** Sync task management
   - **Dependencies:** integration-manager ✅
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/sync-task.service.ts`
   - **Estimated Effort:** 2 days
   - **Note:** May overlap with integration-sync container - verify

---

### Tier 6: Risk & Analytics Services (7 services)

#### HIGH PRIORITY ⚠️

1. **risk-evaluation** ⚠️ **HIGH PRIORITY**
   - **Why:** Core risk evaluation functionality (2,508 lines)
   - **Dependencies:** ai-insights ✅, ml-service ✅
   - **Complexity:** High
   - **Files:** `old_code/apps/api/src/services/risk-evaluation.service.ts`
   - **Estimated Effort:** 5-7 days
   - **Note:** ⚠️ Very large service - consider splitting. May overlap with risk-analytics container - verify

#### MEDIUM PRIORITY ⚠️

2. **risk-catalog** ⚠️ **MEDIUM PRIORITY**
   - **Why:** Risk catalog management
   - **Dependencies:** risk-evaluation ⚠️
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/risk-catalog.service.ts`
   - **Estimated Effort:** 2-3 days
   - **Note:** ⚠️ Already migrated to risk-catalog container - verify if complete

3. **revenue-at-risk** ⚠️ **MEDIUM PRIORITY**
   - **Why:** Revenue calculations
   - **Dependencies:** risk-evaluation ⚠️, analytics-service ✅
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/revenue-at-risk.service.ts`
   - **Estimated Effort:** 2-3 days
   - **Note:** May be part of risk-analytics container - verify

4. **quota** ⚠️ **MEDIUM PRIORITY**
   - **Why:** Quota management
   - **Dependencies:** analytics-service ✅
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/quota.service.ts`
   - **Estimated Effort:** 2 days

5. **early-warning** ⚠️ **MEDIUM PRIORITY**
   - **Why:** Early warning system
   - **Dependencies:** risk-evaluation ⚠️, analytics-service ✅
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/early-warning.service.ts`
   - **Estimated Effort:** 2 days

#### LOW PRIORITY ⚠️

6. **benchmarking** ⚠️ **LOW PRIORITY**
   - **Why:** Benchmarking functionality
   - **Dependencies:** analytics-service ✅
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/benchmarking.service.ts`
   - **Estimated Effort:** 2 days

7. **simulation** ⚠️ **LOW PRIORITY**
   - **Why:** Risk simulation
   - **Dependencies:** risk-evaluation ⚠️
   - **Complexity:** High
   - **Files:** `old_code/apps/api/src/services/simulation.service.ts`
   - **Estimated Effort:** 3-4 days

---

### Tier 7: Specialized Services (4 services)

#### MEDIUM PRIORITY ⚠️

1. **admin-dashboard** ⚠️ **MEDIUM PRIORITY**
   - **Why:** Admin dashboard functionality
   - **Dependencies:** dashboard ✅, user-management ✅
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/admin-dashboard.service.ts`
   - **Estimated Effort:** 2-3 days

#### LOW PRIORITY ⚠️

2. **email** ⚠️ **LOW PRIORITY**
   - **Why:** Email service (may be handled by notification-manager)
   - **Dependencies:** notification-manager ✅
   - **Complexity:** Low
   - **Files:** `old_code/apps/api/src/services/email/`
   - **Estimated Effort:** 1-2 days
   - **Note:** ⚠️ Check if functionality is already in notification-manager

3. **webhook-management** ⚠️ **LOW PRIORITY**
   - **Why:** Webhook management
   - **Dependencies:** integration-manager ✅
   - **Complexity:** Low
   - **Files:** `old_code/apps/api/src/services/webhook-management.service.ts`
   - **Estimated Effort:** 1-2 days
   - **Note:** May be part of integration-manager container - verify

4. **import-export** ⚠️ **LOW PRIORITY**
   - **Why:** Import/export functionality
   - **Dependencies:** Various
   - **Complexity:** Medium
   - **Files:** `old_code/apps/api/src/services/import-export.service.ts`
   - **Estimated Effort:** 2-3 days
   - **Note:** May be part of utility-services container - verify

---

### Additional Services (150+ services)

The following services exist in `old_code/` but are not yet prioritized for migration. Many may be deprecated, experimental, or low-priority features:

#### AI & ML Services
- ai-analytics
- ai-chat-catalog
- ai-config
- ai-model-seeder
- anomaly-detection
- api-performance-monitoring
- explainable-ai
- explanation-monitoring
- explanation-quality
- feedback-learning
- federated-learning

#### Data & Storage Services
- azure-blob-storage
- azure-container-init
- azure-openai
- bulk-document
- bulk-job-worker
- cache-monitor
- cache-optimization
- cache-subscriber
- cache-warming
- computed-field
- computed-fields
- cosmos-connection-manager
- cosmos-db
- dashboard-cache
- embedding-content-hash-cache
- embedding-processor
- embedding-template
- entity-resolution
- metrics-shard
- semantic-cache
- shard-cache
- shard-event
- shard-type-cache
- shard-validation
- token-validation-cache
- vector-search-cache

#### Integration Services
- audit-integration
- custom-integration
- customer-success-integration
- integration-deduplication
- integration-external-user-id
- integration-provider
- integration-rate-limiter
- integration-search
- integration-shard
- integration-visibility

#### Context & Conversation Services
- context-aware-query-parser
- conversation-event-subscriber
- conversation-realtime

#### Audit & Security Services
- audit
- audit-trail
- audit-webhook-emitter
- comprehensive-audit-trail
- credential-encryption
- document-audit
- document-audit-integration
- field-security
- field-validation

#### Content & Template Services
- conversion-schema
- core-types-seeder
- email-rendering
- email-template
- insight-templates
- project-template

#### Analytics & Intelligence Services
- calendar-intelligence
- chain-of-thought
- collaborative-insights
- collaborative-intelligence
- communication-analysis
- competitive-intelligence
- consensus-forecasting
- data-quality
- forecast-commitment
- forecast-decomposition
- insight-computation
- insight-scheduler
- insight
- proactive-insight
- proactive-insights-analytics
- proactive-insights-digest-worker
- proactive-insights-event-subscriber
- proactive-insights-worker
- social-signal

#### Document Services
- document-settings
- document-upload
- document-validation

#### Other Services
- advanced-retrieval
- advanced-search
- feature-flag
- hybrid-retrieval
- initialization
- opportunity-auto-linking
- project-auto-attachment
- risk-ai-validation
- risk-explainability
- sso-team-sync
- team
- trust-level
- user-feedback
- vector-search
- vector-search-ui
- widget-catalog
- widget-data
- widget-migration
- workflow-automation

**Total Additional Services:** ~150+ services

---

## Migration Priority Roadmap

### Immediate Next Steps (Week 1-2) - HIGH PRIORITY

1. **enrichment** (Tier 2) - 2-3 days
   - Verify overlap with data-enrichment container
   - Core data processing service

2. **vectorization** (Tier 2) - 2 days
   - Required for embeddings and search

3. **shard-embedding** (Tier 2) - 1-2 days
   - Links shards to embeddings

### Short Term (Week 3-6) - CRITICAL AI SERVICES

4. **conversation** (Tier 3) - 5-7 days
   - ⚠️ Very large (5,292 lines) - consider splitting
   - Verify overlap with ai-conversation container

5. **ai-context-assembly** (Tier 3) - 3-4 days
   - Verify overlap with context-service container

6. **grounding** (Tier 3) - 2-3 days
   - Verify overlap with ai-conversation container

7. **intent-analyzer** (Tier 3) - 2 days
   - Verify overlap with ai-conversation container

### Medium Term (Week 7-12) - BUSINESS CRITICAL

8. **risk-evaluation** (Tier 6) - 5-7 days
   - ⚠️ Very large (2,508 lines) - consider splitting
   - Verify overlap with risk-analytics container

9. **shard-relationship** (Tier 2) - 2 days

10. **acl** (Tier 2) - 2 days

11. **integration-catalog** (Tier 5) - 1-2 days

12. **integration-connection** (Tier 5) - 2 days

### Long Term (Week 13+) - REMAINING SERVICES

- Remaining Tier 3 services (context-template, context-cache, context-quality, etc.)
- Remaining Tier 5 services (adapter-manager, bidirectional-sync, sync-task)
- Remaining Tier 6 services (revenue-at-risk, quota, early-warning, benchmarking, simulation)
- Tier 7 specialized services (admin-dashboard, email, webhook-management, import-export)
- Additional 150+ services (evaluate for deprecation vs. migration)

---

## Key Findings & Recommendations

### 1. Potential Overlaps ⚠️

Several services in `old_code/` may already be implemented in containers/:

- **conversation** → May be covered by `ai-conversation` container
- **ai-context-assembly** → May be covered by `context-service` container
- **grounding** → May be covered by `ai-conversation` container
- **intent-analyzer** → May be covered by `ai-conversation` container
- **enrichment** → May be covered by `data-enrichment` container
- **risk-evaluation** → May be covered by `risk-analytics` container
- **risk-catalog** → Already migrated to `risk-catalog` container
- **bidirectional-sync** → May be covered by `integration-sync` container
- **sync-task** → May be covered by `integration-sync` container
- **webhook-management** → May be covered by `integration-manager` container
- **import-export** → May be covered by `utility-services` container

**Action Required:** Verify feature parity before migrating these services.

### 2. Large Services Requiring Splitting ⚠️

- **conversation** (5,292 lines) - Consider splitting into:
  - ConversationService
  - ConversationContextService
  - ConversationSummarizationService
  - ConversationEventService

- **risk-evaluation** (2,508 lines) - Consider splitting into:
  - RiskEvaluationService
  - RiskScoringService
  - RiskDetectionService

### 3. Adaptive Learning Services

22 adaptive learning services should be reviewed and integrated into the `adaptive-learning` container rather than migrated separately.

### 4. Deprecated Services

Many of the 150+ additional services may be:
- Experimental features
- Deprecated functionality
- Duplicate implementations
- Low-priority features

**Action Required:** Audit these services to determine if they should be:
- Migrated
- Deprecated
- Consolidated into existing containers

---

## Migration Checklist Template

For each service migration:

### Pre-Migration
- [ ] Analyze dependencies
- [ ] Map database containers
- [ ] Identify events (published/consumed)
- [ ] List API endpoints
- [ ] Document configuration needs
- [ ] **Verify if already implemented in containers/**

### Code Migration
- [ ] Create module directory structure
- [ ] Copy service files
- [ ] Transform imports (use @coder/shared)
- [ ] Add tenantId to all database queries
- [ ] Replace hardcoded URLs with config
- [ ] Transform routes (add auth, tenant enforcement)
- [ ] Update error handling (use AppError)
- [ ] Add event publishing/consuming

### Configuration
- [ ] Create config/default.yaml
- [ ] Create config/schema.json
- [ ] Create config/index.ts loader
- [ ] Add environment variable documentation

### Infrastructure
- [ ] Create Dockerfile
- [ ] Update package.json
- [ ] Create tsconfig.json
- [ ] Add health check endpoints

### Documentation
- [ ] Create README.md
- [ ] Create CHANGELOG.md
- [ ] Create openapi.yaml
- [ ] Document events (if applicable)
- [ ] Create architecture.md (if complex)

### Testing
- [ ] Write unit tests (80%+ coverage)
- [ ] Write integration tests
- [ ] Test tenant isolation
- [ ] Test error handling
- [ ] Test event publishing/consuming

### Validation
- [ ] Linter passes
- [ ] TypeScript compiles
- [ ] Tests pass
- [ ] Follows ModuleImplementationGuide.md
- [ ] No hardcoded ports/URLs
- [ ] All queries include tenantId
- [ ] Service-to-service auth implemented

---

## Summary Statistics

### By Priority
- **CRITICAL:** 2 services (conversation, ai-context-assembly)
- **HIGH PRIORITY:** 6 services
- **MEDIUM PRIORITY:** 12 services
- **LOW PRIORITY:** 8 services
- **ADAPTIVE LEARNING:** 22 services (integrate into existing container)
- **ADDITIONAL:** ~150+ services (evaluate for deprecation)

### By Estimated Effort
- **1-2 days:** 15 services
- **2-3 days:** 12 services
- **3-4 days:** 3 services
- **5-7 days:** 2 services (conversation, risk-evaluation)
- **TBD:** ~150+ additional services

### By Complexity
- **Low:** 8 services
- **Medium:** 15 services
- **High:** 4 services (conversation, ai-context-assembly, risk-evaluation, bidirectional-sync)

---

## Next Actions

1. **Immediate:** Verify overlaps between old_code/ services and existing containers/
2. **Week 1-2:** Migrate high-priority Tier 2 services (enrichment, vectorization, shard-embedding)
3. **Week 3-6:** Migrate critical AI services (conversation, ai-context-assembly, grounding, intent-analyzer)
4. **Week 7-12:** Migrate business-critical services (risk-evaluation, integration services)
5. **Ongoing:** Audit and evaluate 150+ additional services for migration vs. deprecation

---

_Report generated: 2026-01-23_  
_Last updated: 2026-01-23_
