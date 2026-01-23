---
name: Container Architecture and Service Grouping Plan
overview: Complete container architecture mapping all services from old_code/ to containers/, showing current containers with their features, new containers to be created with grouped services, and comprehensive communication patterns including async event-driven workflows with CAIS integration.
todos: []
isProject: false
---

# Container Architecture and Service Grouping Plan

## Overview

This plan defines the complete container architecture, mapping all services from `old_code/` to appropriate containers in `containers/`. Services are grouped logically to minimize inter-container dependencies and follow microservices best practices.

**Platform Context:** Castiel is an AI-native business intelligence platform. The platform is being enhanced with a **Machine Learning system** focused on three priority use cases: **Risk Scoring**, **Revenue Forecasting**, and **Recommendations**. The `ml-service` in containers/ is the core of this critical ML enhancement.

**Key Architecture Principles:**
- **Asynchronous Event-Driven:** Risk analysis, scoring, forecasting, and recommendations operate asynchronously via events
- **CAIS Integration:** All AI/ML services integrate with adaptive-learning using hybrid approach (REST for weights, Events for outcomes)
- **Workflow Orchestration:** Workflow-orchestrator coordinates parallel async workflows triggered by integration events
- **User Feedback Loop:** User actions on recommendations feed back into CAIS for continuous improvement

---

## Current Containers (38 Total)

### Foundation Containers (5)

1. **api-gateway** - Request routing, JWT authentication, tenant validation, rate limiting, circuit breakers
2. **auth** - Multi-provider authentication (email/password, OAuth, SSO), JWT token management, session management, MFA, password security
3. **user-management** - Users, organizations, teams, roles, RBAC, invitations, memberships
4. **logging** - Audit trail, compliance logging, tamper evidence, multi-tenancy, configurable retention
5. **secret-management** - Secret storage, encryption (AES-256-GCM), key rotation, vaults, lifecycle management

### Data & Storage Containers (5)

6. **shard-manager** - Shard CRUD, ShardTypes, relationships, bulk operations, graph traversal
7. **document-manager** - Document CRUD, file upload/download (Azure Blob Storage), collections, templates, chunked upload
8. **cache-service** - Cache management, warming, optimization, multi-layer caching
9. **embeddings** - Embedding storage, batch operations, semantic similarity search, project-scoped
10. **search-service** - Vector search, full-text search, search analytics

### AI & Intelligence Containers (8)

11. **ai-service** - LLM completions (OpenAI, Anthropic, Ollama), model routing and selection, agent management, completion tracking
12. **ai-insights** - AI insight generation, proactive insights, collaborative insights, risk analysis integration
13. **adaptive-learning** - CAIS adaptive learning system with 22 sub-services:
    - Phase 1 (8): AdaptiveWeightLearningService, AdaptiveModelSelectionService, SignalWeightingService, AdaptiveFeatureEngineeringService, OutcomeCollectorService, PerformanceTrackerService, AdaptiveLearningValidationService, AdaptiveLearningRolloutService
    - Phase 2 (8): MetaLearningService, ActiveLearningService, FeedbackQualityService, EpisodicMemoryService, CounterfactualService, CausalInferenceService, MultiModalIntelligenceService, PrescriptiveAnalyticsService
    - Phase 3 (3): ReinforcementLearningService, GraphNeuralNetworkService, NeuroSymbolicService
    - Phase 4-7 (3): ConflictResolutionLearningService, HierarchicalMemoryService, AdversarialTestingService
14. **context-service** - Context management, AST analysis, dependency trees, call graphs, context assembly, token budgeting
15. **ml-service** ⭐ - **CRITICAL ML ENHANCEMENT CORE** - Feature store, model management, training, evaluation, calibration, risk scoring, forecasting, recommendations
16. **multi-modal-service** - Image, diagram, audio, video understanding, OCR, design-to-code
17. **reasoning-engine** - Chain-of-thought, tree-of-thought, analogical reasoning, counterfactual reasoning, causal reasoning
18. **prompt-service** - Prompt management, A/B testing, prompt analytics

### Integration & Content Containers (4)

19. **integration-manager** - Integration CRUD, webhooks, sync tasks, catalog, custom integrations
   - **Change Detection:** Both webhooks (preferred) and polling (fallback) for detecting Salesforce opportunity changes
20. **content-generation** - Content generation, template-based generation
21. **template-service** - Template management, context templates, email/document templates
22. **collaboration-service** - Real-time collaboration, conversations, messages, reactions

### Analytics & Business Containers (5)

23. **analytics-service** - General analytics, project analytics, AI analytics, API performance metrics
24. **dashboard** - Dashboard CRUD, widget management, configuration, organization-scoped
25. **pipeline-manager** ⭐ - Pipeline views, opportunity management, pipeline analytics, ML-enhanced revenue forecasting (integrates with ML Service)
26. **compliance-service** - Standards compliance (WCAG, OWASP, ISO27001), regulatory compliance (GDPR, HIPAA, SOC2, PCI-DSS), policy management
27. **security-service** - Secret scanning, vulnerability scanning, PII detection, SAST/DAST

### Development & Quality Containers (6)

28. **code-generation** - Specialized code generation service providing:
    - UI Component Generation: React/Vue/Angular components from specifications
    - API Endpoint Generation: REST API endpoints from requirements
    - Database Schema Generation: Database schemas from models
    - Test Data Generation: Test data and fixtures
    - Configuration Generation: Configuration files
    - Migration Generation: Database migrations
    - IaC Generation: Infrastructure as Code
    - Template-Based Generation: Customizable generation templates
    - Natural Language Specification: Generate code from natural language
    - Context-Aware Generation: Use codebase context for generation
    - Example-Based Generation: Learn from examples
    - **Dependencies:** ai-service, context-service, validation-engine, pattern-recognition
    - **Database Containers:** `codegen_jobs`, `codegen_templates` (partition: `/tenantId`)
    - **Events Published:** `codegen.job.created`, `codegen.job.completed`, `codegen.job.failed`
29. **bug-detection** - Anomaly detection, bug prediction, root cause analysis, auto-fix suggestions
30. **pattern-recognition** - Pattern learning, style consistency, design pattern detection, anti-pattern detection
31. **performance-optimization** - Code optimization, bundle optimization, query optimization, algorithm selection, memory optimization
32. **validation-engine** - Syntax validation, semantic validation, architecture validation, security validation, performance validation
33. **migration-service** - Migration management, step execution, rollback, version upgrades

### Infrastructure Containers (2)

34. **configuration-service** - Centralized configuration storage and retrieval
35. **shared** - Shared utilities, types, database client (CosmosDBClient), cache (MultiLayerCache, RedisClient), events (EventPublisher, EventConsumer), middleware (auth, tenantEnforcement), services (ServiceClient, ServiceRegistry)

### UI Container (1)

36. **ui** - Next.js 16 frontend application with React 19, TypeScript, Shadcn UI, Tailwind CSS

### Specialized Containers (2)

37. **agent-registry** - Agent management, selection, execution tracking, versioning, capability matching
38. **notification-manager** - Multi-channel notification service providing:
    - Event consumption from RabbitMQ
    - Notification creation and management
    - **Email delivery** (SendGrid, SMTP, SES providers) - **Email services from old_code will be integrated here**
    - Email template rendering and management
    - In-app notifications
    - Push notifications (future)
    - SMS notifications (future)
    - Notification preferences
    - Mark as read/unread tracking
    - **Services to Migrate from old_code:** email, email-rendering, email-template (integrate into notification-manager)
    - **Dependencies:** template-service (for email templates), secret-management (for email provider credentials)
    - **Database Containers:** `notification_notifications`, `notification_templates`, `notification_preferences` (partition: `/tenantId`)

---

## New Containers to Create (16 Total)

**Note:** Email services will be integrated into the existing notification-manager container, not created as a separate container.

### 1. ai-conversation Container

**Purpose:** Complete AI conversation and context management system

**Services to Include:**

- conversation (from old_code) - Main conversation management (5,292 lines)
- ai-context-assembly (from old_code) - Context assembly (1,074 lines)
- grounding (from old_code) - Response grounding and citation
- intent-analyzer (from old_code) - Intent classification
- context-quality (from old_code) - Context quality assessment
- context-cache (from old_code) - Context caching
- citation-validation (from old_code) - Citation validation
- conversation-summarization (from old_code) - Conversation summarization
- conversation-context-retrieval (from old_code) - Context retrieval
- prompt-injection-defense (from old_code) - Prompt injection defense
- context-aware-query-parser (from old_code) - Query parsing

**Dependencies:** ai-service, context-service, shard-manager, embeddings

**Database Containers:**

- `conversation_conversations` (partition: `/tenantId`)
- `conversation_messages` (partition: `/tenantId`)
- `conversation_contexts` (partition: `/tenantId`)
- `conversation_citations` (partition: `/tenantId`)

**Events Published:**

- `conversation.created` - Conversation created
- `conversation.message.added` - Message added to conversation
- `conversation.context.assembled` - Context assembled for conversation

**Events Consumed:**

- `shard.updated` - Update conversation context when shards change

---

### 2. risk-catalog Container

**Purpose:** Risk catalog management with global, industry, and tenant-specific risk definitions

**Services to Include:**

- risk-catalog (from old_code) - Risk catalog service with complete feature set:

  **Core Features:**
  - Get applicable risk catalog (global + industry + tenant-specific)
    - Merges global, industry-specific (if applicable), and tenant-specific risks
    - Filters disabled risks per tenant
    - Returns unified catalog for risk evaluation
  - Create custom risks (global, industry, or tenant-specific based on role)
    - Super-admin can create global/industry risks
    - Tenant admin can create tenant-specific risks
    - Validates risk ID uniqueness per catalog type
  - Update risk catalog entries
    - Update risk definitions, conditions, severity, etc.
    - Maintains version history
  - Duplicate risks (global/industry → tenant-specific)
    - Allows tenant admins to create tenant-specific copies
    - Preserves original risk definition
  - Enable/disable risks per tenant
    - Tenant-specific overrides for global/industry risks
    - Controls risk visibility without deletion
  - Delete tenant-specific risks
    - Only tenant-specific risks can be deleted
    - Global/industry risks cannot be deleted (only disabled)
  
  **Advanced Features:**
  - Risk ponderation (weighting) management
    - Get/Set risk weights per tenant/industry
    - Used by risk evaluation for weighted scoring
  - Risk categorization and tagging
    - Organize risks by category (financial, operational, strategic, etc.)
    - Tag-based filtering and search
  - Risk metadata management
    - Risk descriptions, examples, remediation steps
    - Risk severity levels and impact assessment
    - Risk detection methods (rule-based, ML, AI, historical)

**Dependencies:** shard-manager (uses shards for risk catalog storage)

**Database Containers:**

- Uses shard-manager containers: `shards` with `shardTypeId = risk_catalog` (partition: `/tenantId`)
- Global risks stored in `system` tenant (`catalogType: 'global'`)
- Industry risks stored in `system` tenant with `industryId` (`catalogType: 'industry'`)
- Tenant-specific risks stored in tenant's shards (`catalogType: 'tenant'`)
- Tenant overrides stored in tenant's shards (`isOverride: true, enabled: boolean`)

**API Endpoints:**

- `GET /api/v1/risk-catalog/catalog/:tenantId` - Get applicable catalog
- `GET /api/v1/risk-catalog/catalog/:tenantId?industryId=:id` - Get catalog with industry
- `POST /api/v1/risk-catalog/risks` - Create risk
- `PUT /api/v1/risk-catalog/risks/:riskId` - Update risk
- `DELETE /api/v1/risk-catalog/risks/:riskId` - Delete tenant-specific risk
- `POST /api/v1/risk-catalog/risks/:riskId/duplicate` - Duplicate risk
- `PUT /api/v1/risk-catalog/risks/:riskId/enable` - Enable risk for tenant
- `PUT /api/v1/risk-catalog/risks/:riskId/disable` - Disable risk for tenant
- `GET /api/v1/risk-catalog/risks/:riskId/ponderation` - Get risk weights
- `PUT /api/v1/risk-catalog/risks/:riskId/ponderation` - Set risk weights

**Events Published:**

- `risk.catalog.created` - Risk catalog entry created
  - Payload: { riskId, catalogType, tenantId, industryId? }
- `risk.catalog.updated` - Risk catalog entry updated
  - Payload: { riskId, changes, tenantId }
- `risk.catalog.deleted` - Risk catalog entry deleted
  - Payload: { riskId, tenantId }
- `risk.catalog.enabled` - Risk enabled for tenant
  - Payload: { riskId, tenantId, catalogType }
- `risk.catalog.disabled` - Risk disabled for tenant
  - Payload: { riskId, tenantId, catalogType }
- `risk.catalog.duplicated` - Risk duplicated to tenant
  - Payload: { sourceRiskId, targetRiskId, tenantId }

**Events Consumed:**

- None (read-only service, other services query it via REST API)

**Integration with Risk Analytics:**

- Risk-analytics container queries risk-catalog via REST API before performing risk evaluation
- Risk catalog provides the risk definitions that risk evaluation uses for detection
- Risk ponderation (weights) from catalog are used in risk scoring calculations

---

### 3. risk-analytics Container

**Purpose:** Asynchronous risk evaluation and revenue analytics system (event-driven) with CAIS integration

**Services to Include:**

- risk-evaluation (from old_code) - Risk evaluation (2,508 lines) - **ASYNC via events**
- revenue-at-risk (from old_code) - Revenue calculations - **ASYNC via events**
- quota (from old_code) - Quota management
- early-warning (from old_code) - Early warning system - **ASYNC via events**
- benchmarking (from old_code) - Benchmarking functionality
- simulation (from old_code) - Risk simulation
- data-quality (from old_code) - Data quality validation
- trust-level (from old_code) - Trust level calculation
- risk-ai-validation (from old_code) - AI validation
- risk-explainability (from old_code) - Explainability

**Dependencies:** risk-catalog, ai-insights, ml-service, analytics-service, shard-manager, adaptive-learning

**Database Containers:**

- `risk_evaluations` (partition: `/tenantId`)
- `risk_revenue_at_risk` (partition: `/tenantId`)
- `risk_quotas` (partition: `/tenantId`)
- `risk_warnings` (partition: `/tenantId`)
- `risk_simulations` (partition: `/tenantId`)

**Events Published:**

- `risk.evaluation.started` - Risk evaluation job started
  - Payload: { evaluationId, opportunityId, tenantId }
- `risk.evaluation.completed` - Risk evaluation completed with results
  - Payload: { evaluationId, opportunityId, riskScore, detectedRisks, tenantId, timestamp }
- `risk.evaluation.failed` - Risk evaluation failed
  - Payload: { evaluationId, opportunityId, error, tenantId }
- `risk.scoring.started` - Risk scoring (ML-based) started
  - Payload: { scoringId, opportunityId, modelId, tenantId }
- `risk.scoring.completed` - Risk scoring completed
  - Payload: { scoringId, opportunityId, mlRiskScore, modelId, confidence, tenantId }
- `revenue.at_risk.calculated` - Revenue at risk calculated
  - Payload: { opportunityId, revenueAtRisk, riskScore, tenantId }
- `risk.warning.triggered` - Early warning triggered
  - Payload: { warningId, opportunityId, warningType, severity, tenantId }

**Events Consumed:**

- `integration.opportunity.updated` - Trigger risk evaluation when Salesforce opportunity changes
- `shard.updated` (opportunity type) - Trigger risk analysis when opportunity shard updated
- `integration.sync.completed` - Trigger risk evaluation after data sync
- `workflow.risk.analysis.requested` - Triggered by workflow-orchestrator

**CAIS Integration (Hybrid Approach):**

- **REST API calls** to adaptive-learning for:
  - `GET /api/v1/adaptive-learning/weights/:tenantId?component=risk-evaluation`
    - Returns learned weights for: rule-based, ML, AI, historical detection methods
    - Example: { ruleBased: 0.3, ml: 0.4, ai: 0.2, historical: 0.1 }
  - `GET /api/v1/adaptive-learning/model-selection/:tenantId?context=risk-scoring`
    - Returns best ML model for risk scoring based on learned performance
    - Example: { modelId: 'risk-model-v2', confidence: 0.92 }
  - `GET /api/v1/adaptive-learning/signal-weights/:tenantId?component=risk`
    - Returns learned weights for multi-signal risk detection
- **Event publishing** to adaptive-learning for outcome learning:
  - `adaptive.learning.outcome.recorded` - When risk evaluation completes
    - Payload: { component: 'risk-evaluation', prediction: riskScore, context: {...}, tenantId }
  - `adaptive.learning.outcome.recorded` - When risk scoring completes
    - Payload: { component: 'risk-scoring', modelId, prediction: mlRiskScore, tenantId }
  - `risk.evaluation.completed` - Also consumed by adaptive-learning (OutcomeCollectorService) for outcome collection

**Workflow:**

1. Consumes opportunity change event
2. Gets learned weights from adaptive-learning (REST)
3. Gets risk catalog from risk-catalog service (REST)
4. Performs risk evaluation using learned weights
5. Gets ML risk score from ml-service (REST) using learned model selection
6. Publishes risk evaluation completion event
7. Publishes outcome to adaptive-learning for learning (Event)

---

### 4. recommendations Container

**Purpose:** Asynchronous recommendation generation service with CAIS integration and user feedback loop

**Services to Include:**

- recommendation (from old_code) - Multi-factor recommendation engine:
  - Vector search-based recommendations (semantic similarity)
  - Collaborative filtering recommendations
  - Temporal/recency-based recommendations
  - Content-based recommendations
  - ML-enhanced recommendations (via ml-service)
  - Recommendation explanation generation
  - Recommendation feedback collection
- ai-recommendation (from old_code) - AI-powered recommendation handlers

**Dependencies:** ml-service, ai-service, embeddings, shard-manager, adaptive-learning, analytics-service

**Database Containers:**

- `recommendation_recommendations` (partition: `/tenantId`)
- `recommendation_feedback` (partition: `/tenantId`)
- `recommendation_metrics` (partition: `/tenantId`)

**Events Published:**

- `recommendation.generation.started` - Recommendation generation started
  - Payload: { recommendationId, opportunityId, tenantId }
- `recommendation.generation.completed` - Recommendations generated
  - Payload: { recommendationId, opportunityId, recommendations: [...], tenantId, timestamp }
- `recommendation.generation.failed` - Recommendation generation failed
  - Payload: { recommendationId, opportunityId, error, tenantId }
- `recommendation.feedback.received` - User feedback on recommendation (accept/ignore/irrelevant)
  - Payload: { recommendationId, action: 'accept' | 'ignore' | 'irrelevant', userId, tenantId, timestamp }
  - **Critical for CAIS:** This event is consumed by adaptive-learning for continuous improvement

**Events Consumed:**

- `opportunity.updated` - Generate recommendations when opportunity changes
- `risk.evaluation.completed` - Generate recommendations based on risk analysis
- `forecast.completed` - Generate recommendations based on forecast results
- `shard.updated` (various types) - Generate contextual recommendations
- `workflow.recommendation.requested` - Triggered by workflow-orchestrator

**CAIS Integration (Hybrid Approach):**

- **REST API calls** to adaptive-learning for:
  - `GET /api/v1/adaptive-learning/weights/:tenantId?component=recommendations`
    - Returns learned weights for: vector search, collaborative, temporal, content algorithms
    - Example: { vectorSearch: 0.4, collaborative: 0.3, temporal: 0.2, content: 0.1 }
  - `GET /api/v1/adaptive-learning/model-selection/:tenantId?context=recommendations`
    - Returns best ML model for recommendation ranking
- **Event publishing** to adaptive-learning for outcome learning:
  - `recommendation.feedback.received` - User feedback (accept/ignore/irrelevant)
    - Consumed by OutcomeCollectorService for learning
    - Adaptive-learning updates recommendation algorithm weights based on feedback
  - `adaptive.learning.outcome.recorded` - Recommendation generation outcomes
    - Payload: { component: 'recommendations', recommendations: [...], userActions: [...] }

**User Feedback Flow:**

1. User reviews recommendations in UI
2. User actions: Accept, Ignore, or Mark as Irrelevant
3. Frontend → Recommendations Service (REST)
   - `POST /api/v1/recommendations/:id/feedback`
   - Body: { action: 'accept' | 'ignore' | 'irrelevant' }
4. Recommendations Service → Event Publisher
   - Publish: `recommendation.feedback.received`
5. Adaptive Learning (OutcomeCollectorService) consumes event
6. Adaptive Learning (AdaptiveWeightLearningService) updates weights:
   - If 'accept' → Increase weight for algorithms that generated this recommendation
   - If 'ignore' → Decrease weight slightly
   - If 'irrelevant' → Decrease weight significantly
7. Future recommendations use updated learned weights
8. Recommendations improve over time based on user feedback

**Workflow:**

1. Consumes opportunity/risk/forecast completion events
2. Gets learned recommendation weights from adaptive-learning (REST)
3. Generates recommendations using learned weights
4. Publishes recommendation completion event
5. User provides feedback → Publishes feedback event
6. Adaptive-learning learns from feedback → Updates weights
7. Next recommendations use improved weights

---

### 5. forecasting Container

**Purpose:** Asynchronous forecasting and prediction services with CAIS integration

**Services to Include:**

- forecast-decomposition (from old_code) - Forecast decomposition - **ASYNC via events**
- consensus-forecasting (from old_code) - Consensus forecasting - **ASYNC via events**
- forecast-commitment (from old_code) - Forecast commitment - **ASYNC via events**
- pipeline-health (from old_code) - Pipeline health analysis

**Dependencies:** risk-analytics, analytics-service, ml-service, adaptive-learning, pipeline-manager

**Database Containers:**

- `forecast_decompositions` (partition: `/tenantId`)
- `forecast_consensus` (partition: `/tenantId`)
- `forecast_commitments` (partition: `/tenantId`)
- `forecast_pipeline_health` (partition: `/tenantId`)

**Events Published:**

- `forecast.decomposition.started` - Forecast decomposition started
  - Payload: { forecastId, opportunityId, tenantId }
- `forecast.decomposition.completed` - Forecast decomposition completed
  - Payload: { forecastId, opportunityId, decomposedForecast, tenantId }
- `forecast.consensus.started` - Consensus forecasting started
  - Payload: { forecastId, opportunityId, tenantId }
- `forecast.consensus.completed` - Consensus forecast completed
  - Payload: { forecastId, opportunityId, consensusForecast, confidence, tenantId }
- `forecast.commitment.started` - Forecast commitment analysis started
  - Payload: { forecastId, opportunityId, tenantId }
- `forecast.commitment.completed` - Forecast commitment completed
  - Payload: { forecastId, opportunityId, commitmentLevel, tenantId }
- `forecast.completed` - Complete forecast workflow completed
  - Payload: { forecastId, opportunityId, revenueForecast, confidence, tenantId, timestamp }

**Events Consumed:**

- `opportunity.updated` - Trigger forecast when opportunity changes
- `risk.evaluation.completed` - Generate forecast considering risk factors
- `integration.sync.completed` - Trigger forecast after data sync
- `workflow.forecast.requested` - Triggered by workflow-orchestrator

**CAIS Integration (Hybrid Approach):**

- **REST API calls** to adaptive-learning for:
  - `GET /api/v1/adaptive-learning/weights/:tenantId?component=forecasting`
    - Returns learned weights for forecast components
  - `GET /api/v1/adaptive-learning/model-selection/:tenantId?context=forecasting`
    - Returns best ML model for forecasting
- **Event publishing** to adaptive-learning for outcome learning:
  - `forecast.completed` - Forecast completion with results
    - Consumed by adaptive-learning for accuracy tracking
  - `adaptive.learning.outcome.recorded` - Forecast accuracy outcomes
    - Payload: { component: 'forecasting', prediction: revenueForecast, actual: actualRevenue, ... }

**Workflow:**

1. Consumes opportunity/risk completion events
2. Gets learned forecast weights from adaptive-learning (REST)
3. Performs forecast decomposition
4. Performs consensus forecasting
5. Performs forecast commitment analysis
6. Publishes forecast completion event
7. Publishes outcome to adaptive-learning for learning (Event)

---

### 6. workflow-orchestrator Container

**Purpose:** Orchestrates asynchronous workflows for opportunity change events

**Services to Include:**

- workflow-orchestrator (NEW) - Coordinates async workflows:
  - Detects opportunity change events from integration-manager
  - Orchestrates parallel execution of: Risk Analysis, Risk Scoring, Forecasting, Recommendations
  - Manages workflow state and dependencies
  - Handles workflow failures and retries
  - Publishes workflow completion events
  - Tracks workflow execution status

**Dependencies:** integration-manager, risk-analytics, ml-service, forecasting, recommendations, adaptive-learning

**Database Containers:**

- `workflow_workflows` (partition: `/tenantId`)
- `workflow_steps` (partition: `/tenantId`)
- `workflow_executions` (partition: `/tenantId`)

**Events Published:**

- `workflow.opportunity.analysis.started` - Opportunity analysis workflow started
  - Payload: { workflowId, opportunityId, tenantId, timestamp }
- `workflow.opportunity.analysis.completed` - Complete analysis workflow finished
  - Payload: { workflowId, opportunityId, results: { risk, scoring, forecast, recommendations }, tenantId, timestamp }
- `workflow.opportunity.analysis.failed` - Workflow failed
  - Payload: { workflowId, opportunityId, error, failedStep, tenantId }
- `workflow.step.completed` - Individual workflow step completed
  - Payload: { workflowId, stepId, stepType, result, tenantId }
- `workflow.risk.analysis.requested` - Request risk analysis (consumed by risk-analytics)
- `workflow.risk.scoring.requested` - Request risk scoring (consumed by risk-analytics)
- `workflow.forecast.requested` - Request forecast (consumed by forecasting)
- `workflow.recommendation.requested` - Request recommendations (consumed by recommendations)

**Events Consumed:**

- `integration.opportunity.updated` - Salesforce opportunity change detected
- `shard.updated` (opportunity type) - Opportunity shard updated
- `risk.evaluation.completed` - Risk evaluation step completed
- `risk.scoring.completed` - Risk scoring step completed
- `forecast.completed` - Forecast step completed
- `recommendation.generation.completed` - Recommendation step completed

**Workflow Pattern:**

When integration-manager detects Salesforce opportunity change:
1. Integration Manager publishes: `integration.opportunity.updated`
   - Payload: { opportunityId, tenantId, changes, timestamp, source: 'salesforce' }
2. Workflow Orchestrator consumes event
3. Orchestrator creates workflow execution record
4. Orchestrator publishes parallel workflow step events:
   - `workflow.risk.analysis.requested` → risk-analytics
   - `workflow.risk.scoring.requested` → risk-analytics
   - `workflow.forecast.requested` → forecasting
   - `workflow.recommendation.requested` → recommendations
5. Services process in parallel (async)
6. Each service publishes completion event:
   - `risk.evaluation.completed`
   - `risk.scoring.completed`
   - `forecast.completed`
   - `recommendation.generation.completed`
7. Orchestrator tracks completion of all steps
8. When all complete → Publish: `workflow.opportunity.analysis.completed`
9. UI/Client can query workflow status or consume completion event

**API Endpoints:**

- `GET /api/v1/workflows/:workflowId` - Get workflow status
- `GET /api/v1/workflows?opportunityId=:id` - Get workflows for opportunity
- `POST /api/v1/workflows/:workflowId/retry` - Retry failed workflow

---

### 7. integration-sync Container

**Purpose:** Integration synchronization and adapter management

**Services to Include:**

- integration-catalog (from old_code) - Integration catalog
- integration-connection (from old_code) - Connection management
- adapter-manager (from old_code) - Adapter orchestration
- sync-task (from old_code) - Sync task management
- bidirectional-sync (from old_code) - Bidirectional synchronization
- webhook-management (from old_code) - Webhook management

**Note:** These complement the existing `integration-manager` container. Consider merging or keeping separate based on complexity.

**Dependencies:** integration-manager, secret-management, shard-manager

**Database Containers:**

- `integration_sync_tasks` (partition: `/tenantId`)
- `integration_executions` (partition: `/tenantId`)
- `integration_conflicts` (partition: `/tenantId`)
- `integration_webhooks` (partition: `/tenantId`)

**Events Published:**

- `integration.sync.started` - Sync task started
- `integration.sync.completed` - Sync task completed
- `integration.sync.failed` - Sync task failed
- `integration.opportunity.updated` - Opportunity change detected (Salesforce webhook/polling)
- `integration.data.synced` - Data synced from external system

**Events Consumed:**

- `shard.updated` - Trigger sync when shard updated (for bidirectional sync)

---

### 8. data-enrichment Container

**Purpose:** Data enrichment and vectorization pipeline

**Services to Include:**

- enrichment (from old_code) - AI enrichment pipeline
- vectorization (from old_code) - Vectorization service
- shard-embedding (from old_code) - Shard embedding management
- shard-linking (from old_code) - Shard linking
- shard-relationship (from old_code) - Graph relationships
- acl (from old_code) - Access control lists
- acl-cache (from old_code) - ACL caching

**Dependencies:** shard-manager, embeddings, ai-service

**Database Containers:**

- `enrichment_jobs` (partition: `/tenantId`)
- `enrichment_results` (partition: `/tenantId`)
- `vectorization_jobs` (partition: `/tenantId`)
- `shard_relationships` (partition: `/tenantId`)
- `shard_acls` (partition: `/tenantId`)

**Events Published:**

- `enrichment.job.started` - Enrichment job started
- `enrichment.job.completed` - Enrichment job completed
- `vectorization.job.completed` - Vectorization completed
- `shard.relationship.created` - Shard relationship created

**Events Consumed:**

- `shard.created` - Trigger enrichment for new shards
- `shard.updated` - Trigger re-enrichment for updated shards

---

### 9. cache-management Container

**Purpose:** Advanced cache management and optimization

**Services to Include:**

- cache-monitor (from old_code) - Cache monitoring
- cache-optimization (from old_code) - Cache optimization
- cache-subscriber (from old_code) - Cache event subscription
- cache-warming (from old_code) - Cache warming
- semantic-cache (from old_code) - Semantic caching
- vector-search-cache (from old_code) - Vector search caching

**Note:** These complement the existing `cache-service` container. Consider merging.

**Dependencies:** cache-service, embeddings

**Database Containers:**

- `cache_metrics` (partition: `/tenantId`)
- `cache_strategies` (partition: `/tenantId`)

---

### 10. security-scanning Container

**Purpose:** Security scanning and PII detection

**Services to Include:**

- pii-detection (from old_code) - PII detection
- pii-redaction (from old_code) - PII redaction
- field-security (from old_code) - Field-level security
- device-security (from old_code) - Device security
- password-history (from old_code) - Password history
- rate-limiter (from old_code) - Rate limiting

**Note:** Some of these may belong in the `auth` container. Review during migration.

**Dependencies:** auth, secret-management

**Database Containers:**

- `security_scans` (partition: `/tenantId`)
- `security_pii_detections` (partition: `/tenantId`)
- `security_device_tracking` (partition: `/tenantId`)

---

### 11. dashboard-analytics Container

**Purpose:** Advanced dashboard and widget analytics

**Services to Include:**

- admin-dashboard (from old_code) - Admin dashboard service
- dashboard-cache (from old_code) - Dashboard caching
- widget-data (from old_code) - Widget data service

**Note:** These complement the existing `dashboard` container. Consider merging.

**Dependencies:** dashboard, analytics-service, cache-service

**Database Containers:**

- `dashboard_admin_data` (partition: `/tenantId`)
- `dashboard_widget_cache` (partition: `/tenantId`)

---

### 12. web-search Container

**Purpose:** Web search integration and context

**Services to Include:**

- web-search-integration (from old_code) - Web search integration
- web-search-cosmos (from old_code) - Web search Cosmos service
- web-search-context-integration (from old_code) - Context integration

**Dependencies:** ai-service, context-service, embeddings

**Database Containers:**

- `web_search_results` (partition: `/tenantId`)
- `web_search_cache` (partition: `/tenantId`)

---

### 13. ai-analytics Container

**Purpose:** AI usage analytics and monitoring

**Services to Include:**

- ai-analytics (from old_code) - AI analytics
- ai-chat-catalog (from old_code) - Chat catalog
- ai-config (from old_code) - AI configuration
- ai-model-seeder (from old_code) - Model seeding
- proactive-insight (from old_code) - Proactive insights
- feedback-learning (from old_code) - Feedback loop

**Dependencies:** ai-service, ai-insights, analytics-service

**Database Containers:**

- `ai_analytics_events` (partition: `/tenantId`)
- `ai_analytics_models` (partition: `/tenantId`)
- `ai_analytics_feedback` (partition: `/tenantId`)

---

### 14. collaboration-intelligence Container

**Purpose:** Collaborative intelligence and insights

**Services to Include:**

- collaborative-insights (from old_code) - Collaborative insights
- collaborative-intelligence (from old_code) - Collaborative intelligence
- memory-context (from old_code) - Memory context service
- sharing (from old_code) - Sharing service

**Note:** Some of these may belong in `collaboration-service`. Review during migration.

**Dependencies:** collaboration-service, ai-insights

**Database Containers:**

- `collaboration_insights` (partition: `/tenantId`)
- `collaboration_memory` (partition: `/tenantId`)

---

### 15. signal-intelligence Container

**Purpose:** Signal analysis and intelligence

**Services to Include:**

- communication-analysis (from old_code) - Email and meeting analysis
- calendar-intelligence (from old_code) - Calendar pattern analysis
- social-signal (from old_code) - Social media monitoring
- product-usage (from old_code) - Product usage integration
- competitive-intelligence (from old_code) - Competitive intelligence
- customer-success-integration (from old_code) - Customer success integration

**Dependencies:** ai-service, analytics-service, integration-manager

**Database Containers:**

- `signal_communications` (partition: `/tenantId`)
- `signal_calendar` (partition: `/tenantId`)
- `signal_social` (partition: `/tenantId`)

---

### 16. quality-monitoring Container

**Purpose:** Quality monitoring and anomaly detection

**Services to Include:**

- anomaly-detection (from old_code) - Anomaly detection
- explanation-quality (from old_code) - Explanation quality
- explanation-monitoring (from old_code) - Explanation monitoring
- explainable-ai (from old_code) - Explainable AI
- data-quality (from old_code) - Data quality (if not in risk-analytics)

**Dependencies:** ai-service, ml-service, analytics-service

**Database Containers:**

- `quality_anomalies` (partition: `/tenantId`)
- `quality_explanations` (partition: `/tenantId`)
- `quality_metrics` (partition: `/tenantId`)

---

### 17. utility-services Container

**Purpose:** Utility and helper services

**Services to Include:**

- import-export (from old_code) - Import/export functionality
- schema-migration (from old_code) - Schema migrations
- computed-field (from old_code) - Computed fields
- field-validation (from old_code) - Field validation
- onboarding (from old_code) - User onboarding
- project-activity (from old_code) - Project activity tracking
- service-registry (from old_code) - Service registry

**Dependencies:** Various (low coupling)

**Database Containers:**

- `utility_imports` (partition: `/tenantId`)
- `utility_exports` (partition: `/tenantId`)
- `utility_migrations` (partition: `/tenantId`)

---

## Container Summary

### Total Containers: 54

- **Current:** 38 containers
- **New to Create:** 16 containers
- **Note:** Email services will be integrated into notification-manager (existing container), not created as separate container

### Service Distribution

- **Foundation:** 5 containers
- **Data & Storage:** 5 containers
- **AI & Intelligence:** 9 containers (8 current + 1 new: ai-conversation)
- **Integration & Content:** 4 containers
- **Analytics & Business:** 9 containers (5 current + 4 new: risk-catalog, risk-analytics, recommendations, forecasting, workflow-orchestrator)
- **Development & Quality:** 6 containers
- **Infrastructure:** 2 containers
- **UI:** 1 container
- **Specialized:** 13 containers (2 current + 11 new)

---

## Migration Priority by Container

### Phase 1: Critical AI Services (Week 1-4)

1. **ai-conversation** - Core conversation functionality
2. **data-enrichment** - Data processing pipeline

### Phase 2: Business Critical - Risk & Recommendations (Week 5-10)

3. **risk-catalog** - Risk catalog management (foundation for risk analysis)
4. **risk-analytics** - Asynchronous risk evaluation and scoring with CAIS
5. **recommendations** - Asynchronous recommendation generation with CAIS
6. **forecasting** - Asynchronous forecasting services with CAIS
7. **workflow-orchestrator** - Orchestrates async workflows for opportunity changes

### Phase 3: Integration & Sync (Week 11-12)

8. **integration-sync** - Integration synchronization

### Phase 4: Enhanced Features (Week 13-16)

9. **ai-analytics** - AI monitoring
10. **web-search** - Web search integration
11. **cache-management** - Advanced caching

### Phase 5: Specialized Services (Week 17+)

12. **security-scanning** - Security features
13. **dashboard-analytics** - Dashboard enhancements
14. **collaboration-intelligence** - Collaboration features
15. **signal-intelligence** - Signal analysis
16. **quality-monitoring** - Quality assurance
17. **utility-services** - Utility functions

**Note:** Email services migration should be done as part of notification-manager enhancement, not as a separate container.

---

## Container Communication Patterns

### Overview

Containers communicate using two primary patterns:

1. **Synchronous REST API** - For request/response operations
2. **Asynchronous Events (RabbitMQ)** - For decoupled, event-driven operations

All communication MUST be configuration-driven (no hardcoded URLs/ports) and include proper authentication and tenant isolation.

### Communication Architecture

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────────────────────────────────────────┐
│              API Gateway                        │
│  - JWT Validation                               │
│  - Tenant Extraction (X-Tenant-ID)              │
│  - Rate Limiting                                │
│  - Request Routing                              │
└──────┬──────────────────────────────────────────┘
       │
       ├─────────────────┬─────────────────┐
       │                 │                 │
       ▼                 ▼                 ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Service   │  │   Service   │  │   Service   │
│      A      │  │      B      │  │      C      │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                 │                 │
       │ REST API        │ Events          │ REST API
       │ (ServiceClient) │ (EventPublisher)│ (ServiceClient)
       │                 │                 │
       └─────────┬───────┴─────────┬───────┘
                 │                 │
                 ▼                 ▼
         ┌──────────────┐  ┌──────────────┐
         │   RabbitMQ   │  │   Cosmos DB  │
         │   Exchange   │  │  (Shared)    │
         │ coder_events │  │              │
         └──────────────┘  └──────────────┘
```

### Pattern 1: Synchronous REST API Communication

**When to Use:**

- Request/response operations requiring immediate results
- Operations that need to return data to the caller
- Operations that depend on the result of another service

**Implementation:**

```typescript
// In container A calling container B
import { ServiceClient } from '@coder/shared';
import { loadConfig } from './config';

const config = loadConfig();
const serviceB = new ServiceClient({
  baseURL: config.services.serviceB.url, // From config, not hardcoded
  timeout: 5000,
  retries: 3,
  circuitBreaker: {
    enabled: true,
    threshold: 5,
    timeout: 30000,
  },
});

// Make authenticated request with tenant context
const result = await serviceB.get('/api/v1/resource/:id', {
  headers: {
    'Authorization': `Bearer ${serviceToken}`, // Service-to-service auth
    'X-Tenant-ID': tenantId, // Tenant isolation
    'X-Request-ID': requestId, // Correlation
  },
});
```

**Features:**

- Circuit breaker pattern (automatic failure handling)
- Retry logic with exponential backoff
- Service-to-service authentication (JWT tokens)
- Tenant isolation (X-Tenant-ID header)
- Request correlation (X-Request-ID)
- Config-driven URLs (no hardcoded addresses)

**Service Discovery:**

```typescript
import { ServiceRegistry } from '@coder/shared';

const registry = ServiceRegistry.getInstance();
const service = registry.getServiceByName('user-management');
if (service) {
  const client = new ServiceClient({ baseURL: service.url });
}
```

### Pattern 2: Asynchronous Event-Driven Communication

**When to Use:**

- Decoupled operations that don't need immediate response
- Operations that trigger side effects in multiple services
- Audit logging and notifications
- Long-running operations
- Event sourcing patterns

**Event Naming Convention:**

```
{domain}.{entity}.{action}
```

Examples:

- `user.created`
- `shard.updated`
- `notification.email.sent`
- `risk.evaluation.completed`
- `integration.opportunity.updated`

**Publishing Events:**

```typescript
// In container A
import { EventPublisher } from '@coder/shared';
import { loadConfig } from './config';

const config = loadConfig();
const publisher = new EventPublisher(
  {
    url: config.rabbitmq.url,
    exchange: config.rabbitmq.exchange || 'coder_events',
    exchangeType: 'topic',
  },
  'service-a' // Service name
);

// Publish event
await publisher.publish(
  'user.created', // Event type
  tenantId, // Required for tenant isolation
  {
    userId: user.id,
    email: user.email,
    name: user.name,
  },
  {
    correlationId: requestId,
    userId: actorId,
  }
);
```

**Consuming Events:**

```typescript
// In container B
import { EventConsumer } from '@coder/shared';
import { loadConfig } from './config';

const config = loadConfig();
const consumer = new EventConsumer({
  url: config.rabbitmq.url,
  exchange: config.rabbitmq.exchange || 'coder_events',
  queue: 'service_b_queue',
  bindings: ['user.created', 'user.updated'], // Events to consume
});

// Register handlers
consumer.on('user.created', async (event) => {
  const { userId, email, name } = event.data;
  // Process event
  await sendWelcomeEmail(userId, email);
});

consumer.on('user.updated', async (event) => {
  // Handle update
});

// Start consuming
await consumer.start();
```

**Event Structure:**

```typescript
interface DomainEvent<T = unknown> {
  id: string; // UUID
  type: string; // domain.entity.action
  version: string; // Schema version (e.g., '1.0')
  timestamp: string; // ISO 8601
  tenantId: string; // REQUIRED for tenant isolation
  source: {
    service: string; // Service that emitted event
    instance: string; // Instance ID
  };
  data: T; // Event payload
  metadata?: {
    correlationId?: string;
    causationId?: string;
    userId?: string;
  };
}
```

### Communication Flow Examples

#### Example 1: User Registration Flow

```
1. Client → API Gateway
   POST /api/v1/auth/register
   { email, password }

2. API Gateway → Auth Service (REST)
   POST /api/v1/auth/register
   Headers: X-Tenant-ID, Authorization

3. Auth Service → User Management Service (REST)
   POST /api/v1/users
   Create user profile

4. Auth Service → Event Publisher
   Publish: user.registered
   { userId, email, tenantId }

5. Event Consumer (Notification Manager)
   Consume: user.registered
   Action: Send welcome email

6. Event Consumer (Logging Service)
   Consume: user.registered
   Action: Log audit event

7. Auth Service → Client
   Response: { token, user }
```

#### Example 2: AI Insight Generation Flow

```
1. Client → API Gateway
   POST /api/v1/ai-insights/generate
   { query, context }

2. API Gateway → AI Insights Service (REST)
   POST /api/v1/insights/generate

3. AI Insights Service → Context Service (REST)
   GET /api/v1/context/assemble
   Assemble context from shards

4. AI Insights Service → AI Service (REST)
   POST /api/v1/completions
   Generate insight using LLM

5. AI Insights Service → Event Publisher
   Publish: ai.insight.generated
   { insightId, tenantId, userId }

6. Event Consumer (Analytics Service)
   Consume: ai.insight.generated
   Action: Track AI usage metrics

7. Event Consumer (ML Service)
   Consume: ai.insight.generated
   Action: Update model performance metrics

8. AI Insights Service → Client
   Response: { insight, citations }
```

#### Example 3: Asynchronous Opportunity Analysis Workflow (Salesforce Change)

**Complete Event-Driven Flow with CAIS Integration:**

```
1. Integration Manager detects Salesforce opportunity change
   (via webhook or polling)
   └─> Publish: integration.opportunity.updated
       {
         opportunityId: "opp_123",
         tenantId: "tenant_abc",
         changes: { stage: "negotiation", value: 500000 },
         timestamp: "2026-01-23T10:00:00Z",
         source: "salesforce"
       }

2. Workflow Orchestrator consumes event
   └─> Create workflow execution record
   └─> Publish parallel workflow step events:
       - workflow.risk.analysis.requested
         { workflowId, opportunityId, tenantId }
       - workflow.risk.scoring.requested
         { workflowId, opportunityId, tenantId }
       - workflow.forecast.requested
         { workflowId, opportunityId, tenantId }
       - workflow.recommendation.requested
         { workflowId, opportunityId, tenantId }

3. Risk Analytics Service (consumes workflow.risk.analysis.requested)
   ├─> Get learned weights from Adaptive Learning (REST)
   │   GET /api/v1/adaptive-learning/weights/:tenantId?component=risk-evaluation
   │   Returns: { ruleBased: 0.3, ml: 0.4, ai: 0.2, historical: 0.1 }
   │
   ├─> Get risk catalog from Risk Catalog Service (REST)
   │   GET /api/v1/risk-catalog/catalog/:tenantId
   │
   ├─> Perform risk evaluation using learned weights
   │   - Rule-based detection (weight: 0.3)
   │   - ML-based detection (weight: 0.4) → ML Service (REST)
   │   - AI-powered detection (weight: 0.2) → AI Insights (REST)
   │   - Historical pattern matching (weight: 0.1)
   │
   ├─> Publish: risk.evaluation.completed
   │   {
   │     evaluationId: "eval_456",
   │     opportunityId: "opp_123",
   │     riskScore: 0.72,
   │     detectedRisks: [...],
   │     tenantId: "tenant_abc",
   │     timestamp: "2026-01-23T10:00:05Z"
   │   }
   │
   └─> Publish outcome to Adaptive Learning (Event)
       adaptive.learning.outcome.recorded
       {
         component: 'risk-evaluation',
         prediction: 0.72,
         context: { opportunityId, detectedRisks },
         tenantId: "tenant_abc"
       }

4. Risk Analytics Service (consumes workflow.risk.scoring.requested)
   ├─> Get ML model from ML Service (REST)
   │   POST /api/v1/ml/risk-scoring/predict
   │   { opportunityId, features }
   │
   ├─> Get model selection from Adaptive Learning (REST)
   │   GET /api/v1/adaptive-learning/model-selection/:tenantId?context=risk-scoring
   │   Returns: { modelId: 'risk-model-v2', confidence: 0.92 }
   │
   ├─> Perform ML risk scoring
   │
   ├─> Publish: risk.scoring.completed
   │   {
   │     scoringId: "score_789",
   │     opportunityId: "opp_123",
   │     mlRiskScore: 0.68,
   │     modelId: "risk-model-v2",
   │     confidence: 0.92,
   │     tenantId: "tenant_abc"
   │   }
   │
   └─> Publish outcome to Adaptive Learning (Event)
       adaptive.learning.outcome.recorded
       {
         component: 'risk-scoring',
         modelId: 'risk-model-v2',
         prediction: 0.68,
         tenantId: "tenant_abc"
       }

5. Forecasting Service (consumes workflow.forecast.requested)
   ├─> Get learned forecast weights from Adaptive Learning (REST)
   │   GET /api/v1/adaptive-learning/weights/:tenantId?component=forecasting
   │
   ├─> Perform forecast decomposition
   ├─> Perform consensus forecasting
   ├─> Perform forecast commitment analysis
   │
   ├─> Publish: forecast.completed
   │   {
   │     forecastId: "forecast_101",
   │     opportunityId: "opp_123",
   │     revenueForecast: 450000,
   │     confidence: 0.85,
   │     tenantId: "tenant_abc",
   │     timestamp: "2026-01-23T10:00:08Z"
   │   }
   │
   └─> Publish outcome to Adaptive Learning (Event)
       adaptive.learning.outcome.recorded
       {
         component: 'forecasting',
         prediction: 450000,
         tenantId: "tenant_abc"
       }

6. Recommendations Service (consumes workflow.recommendation.requested)
   ├─> Get learned recommendation weights from Adaptive Learning (REST)
   │   GET /api/v1/adaptive-learning/weights/:tenantId?component=recommendations
   │   Returns: { vectorSearch: 0.4, collaborative: 0.3, temporal: 0.2, content: 0.1 }
   │
   ├─> Generate recommendations using learned weights
   │   - Vector search (weight: 0.4)
   │   - Collaborative filtering (weight: 0.3)
   │   - Temporal/recency (weight: 0.2)
   │   - Content-based (weight: 0.1)
   │
   ├─> Publish: recommendation.generation.completed
   │   {
   │     recommendationId: "rec_202",
   │     opportunityId: "opp_123",
   │     recommendations: [
   │       { id: "rec_1", type: "action", priority: "high", ... },
   │       { id: "rec_2", type: "warning", priority: "medium", ... }
   │     ],
   │     tenantId: "tenant_abc",
   │     timestamp: "2026-01-23T10:00:10Z"
   │   }
   │
   └─> Publish outcome to Adaptive Learning (Event)
       adaptive.learning.outcome.recorded
       {
         component: 'recommendations',
         recommendations: [...],
         tenantId: "tenant_abc"
       }

7. Workflow Orchestrator tracks completion
   ├─> Consumes: risk.evaluation.completed
   ├─> Consumes: risk.scoring.completed
   ├─> Consumes: forecast.completed
   ├─> Consumes: recommendation.generation.completed
   │
   └─> When all complete → Publish: workflow.opportunity.analysis.completed
       {
         workflowId: "workflow_303",
         opportunityId: "opp_123",
         results: {
           risk: { evaluationId: "eval_456", riskScore: 0.72 },
           scoring: { scoringId: "score_789", mlRiskScore: 0.68 },
           forecast: { forecastId: "forecast_101", revenueForecast: 450000 },
           recommendations: { recommendationId: "rec_202", count: 2 }
         },
         tenantId: "tenant_abc",
         timestamp: "2026-01-23T10:00:12Z"
       }

8. UI/Client receives completion event or queries workflow status
   └─> GET /api/v1/workflows/:workflowId
       Returns: { status: 'completed', results: {...} }

9. User reviews recommendations in UI
   └─> User actions: Accept, Ignore, or Mark as Irrelevant
       POST /api/v1/recommendations/:id/feedback
       { action: 'accept' | 'ignore' | 'irrelevant' }

10. Recommendations Service processes feedback
    └─> Publish: recommendation.feedback.received
        {
          recommendationId: "rec_1",
          action: "accept",
          userId: "user_xyz",
          tenantId: "tenant_abc",
          timestamp: "2026-01-23T10:05:00Z"
        }

11. Adaptive Learning (OutcomeCollectorService) consumes feedback
    └─> Records outcome for learning
    └─> Updates recommendation weights based on feedback patterns
        - If 'accept' → Increase weight for algorithms that generated this recommendation
        - If 'ignore' → Decrease weight slightly
        - If 'irrelevant' → Decrease weight significantly
    └─> Future recommendations use updated learned weights
    └─> Recommendations improve over time based on user feedback

12. Analytics Service consumes all completion events
    └─> Updates metrics and dashboards
    └─> Tracks performance across all services
```

**Key Features of This Flow:**

- **Fully Asynchronous:** All analysis happens in parallel via events
- **CAIS Integration:** Services get learned weights/parameters from adaptive-learning (REST) and publish outcomes for learning (Events)
- **Orchestration:** Workflow-orchestrator coordinates the parallel execution
- **User Feedback Loop:** User actions feed back into CAIS for continuous improvement
- **Resilient:** Each service can fail independently without blocking others
- **Scalable:** Services can scale independently based on load

### Communication Rules

#### Mandatory Rules

1. **No Hardcoded URLs/Ports**

   - All service URLs MUST come from `config/default.yaml`
   - Use environment variables for deployment-specific URLs
   - Use ServiceClient with config-driven baseURL

2. **Tenant Isolation**

   - All requests MUST include `X-Tenant-ID` header
   - All events MUST include `tenantId` in event structure
   - All database queries MUST include `tenantId` in partition key

3. **Authentication**

   - Service-to-service calls MUST use JWT tokens
   - Tokens MUST be obtained from auth service
   - Include `Authorization: Bearer <token>` header

4. **Error Handling**

   - Use circuit breakers for resilience
   - Implement retry logic with exponential backoff
   - Never expose internal errors to clients
   - Log errors with correlation IDs

5. **Event Naming**

   - Follow convention: `{domain}.{entity}.{action}`
   - Use past tense for actions
   - All lowercase, dot-separated

#### Best Practices

1. **Prefer Events for Decoupling**

   - Use events for operations that don't need immediate response
   - Use REST API for operations requiring synchronous response

2. **Circuit Breakers**

   - Enable circuit breakers for all external service calls
   - Default threshold: 5 failures
   - Default timeout: 30 seconds

3. **Request Correlation**

   - Include `X-Request-ID` in all requests
   - Include `correlationId` in all events
   - Use correlation ID for distributed tracing

4. **Event Versioning**

   - Include `version` field in all events
   - Version schema changes
   - Support multiple versions during migration

5. **Service Discovery**

   - Use ServiceRegistry for dynamic service discovery
   - Fallback to config if registry unavailable
   - Health check services before use

### Configuration Pattern

All service URLs are configured in `config/default.yaml`:

```yaml
services:
  auth:
    url: ${AUTH_URL:-http://localhost:3021}
  user_management:
    url: ${USER_MANAGEMENT_URL:-http://localhost:3022}
  ai_service:
    url: ${AI_SERVICE_URL:-http://localhost:3006}
  ml_service:
    url: ${ML_SERVICE_URL:-http://localhost:3033}
  risk_catalog:
    url: ${RISK_CATALOG_URL:-http://localhost:3XXX}
  risk_analytics:
    url: ${RISK_ANALYTICS_URL:-http://localhost:3XXX}
  recommendations:
    url: ${RECOMMENDATIONS_URL:-http://localhost:3XXX}
  forecasting:
    url: ${FORECASTING_URL:-http://localhost:3XXX}
  workflow_orchestrator:
    url: ${WORKFLOW_ORCHESTRATOR_URL:-http://localhost:3XXX}
  adaptive_learning:
    url: ${ADAPTIVE_LEARNING_URL:-http://localhost:3032}
  logging:
    url: ${LOGGING_URL:-http://localhost:3014}
```

Environment variables override defaults:

```bash
AUTH_URL=http://auth-service:3021
USER_MANAGEMENT_URL=http://user-service:3022
ML_SERVICE_URL=http://ml-service:3033
ADAPTIVE_LEARNING_URL=http://adaptive-learning:3032
```

### Service-to-Service Authentication

```typescript
import { createServiceToken } from '@coder/shared';

// Get service token from auth service
const serviceToken = await createServiceToken({
  serviceName: 'my-service',
  targetService: 'user-management',
  authServiceUrl: config.services.auth.url,
});

// Use token in requests
const client = new ServiceClient({
  baseURL: config.services.userManagement.url,
  headers: {
    'Authorization': `Bearer ${serviceToken}`,
  },
});
```

### Event Documentation Requirements

Each container that publishes events MUST document:

- **logs-events.md** - Events that get logged (audit trail)
- **notifications-events.md** - Events that trigger notifications

Example structure:

````markdown
## Published Events

### user.created
- **When:** User account is created
- **Payload:**
  ```json
  {
    "userId": "string",
    "email": "string",
    "name": "string"
  }
  ```
- **Consumers:** notification-manager, logging
````

### Communication Dependencies Matrix

| Container | Communicates With | Pattern | Purpose |
|-----------|-------------------|---------|---------|
| api-gateway | All services | REST | Request routing |
| auth | user-management | REST | User validation |
| auth | notification-manager | Events | Email notifications |
| user-management | auth | Events | User events |
| user-management | logging | Events | Audit logging |
| ai-insights | ai-service | REST | LLM completions |
| ai-insights | context-service | REST | Context assembly |
| ai-insights | ml-service | REST | ML predictions |
| ai-insights | analytics-service | Events | Usage tracking |
| risk-catalog | shard-manager | REST | Risk catalog storage (uses shards) |
| risk-analytics | risk-catalog | REST | Get risk catalog for evaluation |
| risk-analytics | ml-service | REST | ML-based risk scoring |
| risk-analytics | ai-insights | REST | Risk explanations |
| risk-analytics | adaptive-learning | REST | Get learned weights/parameters (CAIS) |
| risk-analytics | adaptive-learning | Events | Publish outcomes for learning (CAIS) |
| risk-analytics | analytics-service | Events | Metrics tracking |
| recommendations | ml-service | REST | ML-enhanced recommendations |
| recommendations | adaptive-learning | REST | Get learned recommendation weights (CAIS) |
| recommendations | adaptive-learning | Events | Publish feedback for learning (CAIS) |
| forecasting | ml-service | REST | ML-based forecasting |
| forecasting | adaptive-learning | REST | Get learned forecast weights (CAIS) |
| forecasting | adaptive-learning | Events | Publish forecast outcomes (CAIS) |
| workflow-orchestrator | integration-manager | Events | Consume opportunity change events |
| workflow-orchestrator | risk-analytics | Events | Trigger risk analysis |
| workflow-orchestrator | recommendations | Events | Trigger recommendation generation |
| workflow-orchestrator | forecasting | Events | Trigger forecasting |
| code-generation | ai-service | REST | Code generation (existing container #28) |
| code-generation | context-service | REST | Codebase context (existing container #28) |
| code-generation | validation-engine | REST | Code validation (existing container #28) |
| notification-manager | All services | Events | Event consumption |
| logging | All services | Events | Event consumption |

**Note on code-generation:** Code-generation appears in this matrix because it's an **existing container (#28)** that communicates with other services. It's not a new container to create - it already exists and needs to be included in the communication architecture.

**CAIS Integration Pattern (Hybrid):**

All services that integrate with CAIS use a hybrid approach:

- **REST API calls** to adaptive-learning for:
  - Getting learned weights/parameters
  - Getting model selection recommendations
  - Getting signal weights
- **Event publishing** to adaptive-learning for:
  - Outcome collection (OutcomeCollectorService)
  - Performance tracking (PerformanceTrackerService)
  - Feedback learning (FeedbackQualityService)

**Event-Driven Services:**

The following services operate **asynchronously via events**:

- **risk-analytics** - Consumes opportunity change events, publishes risk evaluation results
- **forecasting** - Consumes opportunity/risk events, publishes forecast results
- **recommendations** - Consumes opportunity/risk/forecast events, publishes recommendations
- **workflow-orchestrator** - Orchestrates parallel async workflows

This matrix shows the primary communication patterns. Most containers also publish events for audit logging and notifications.

---

## CAIS (Adaptive Learning) Integration Architecture

### Overview

The CAIS (Compound AI System) adaptive learning system is integrated with risk-analytics, recommendations, and forecasting containers using a **hybrid approach**:

1. **REST API calls** for getting learned parameters (weights, model selection, signal weights)
2. **Event publishing** for outcome collection and continuous learning

### Integration Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    Adaptive Learning Container               │
│  (22 CAIS sub-services including OutcomeCollectorService)   │
└───────────────┬─────────────────────────────────────────────┘
                │
                │ REST API (Get Learned Parameters)
                │
    ┌───────────┼───────────┬──────────────┐
    │           │           │              │
    ▼           ▼           ▼              ▼
┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
│  Risk   │ │Recommend-│ │Forecast-│ │  Other AI    │
│Analytics│ │  ations  │ │   ing   │ │  Services    │
└────┬────┘ └────┬─────┘ └────┬────┘ └──────┬───────┘
     │           │             │              │
     │ Events (Publish Outcomes for Learning)
     │
     └───────────┴─────────────┴──────────────┘
                 │
                 ▼
         ┌───────────────┐
         │   RabbitMQ    │
         │  coder_events │
         └───────────────┘
                 │
                 ▼
     ┌───────────────────────┐
     │ Adaptive Learning     │
     │ Event Consumers:      │
     │ - OutcomeCollector    │
     │ - PerformanceTracker  │
     │ - FeedbackQuality     │
     └───────────────────────┘
```

### CAIS Integration Details

#### For Risk Analytics Container

**REST API Calls (Synchronous):**
- `GET /api/v1/adaptive-learning/weights/:tenantId?component=risk-evaluation`
  - Returns learned weights for: rule-based, ML, AI, historical detection methods
  - Example response: `{ ruleBased: 0.3, ml: 0.4, ai: 0.2, historical: 0.1 }`
- `GET /api/v1/adaptive-learning/model-selection/:tenantId?context=risk-scoring`
  - Returns best ML model for risk scoring based on learned performance
  - Example response: `{ modelId: 'risk-model-v2', confidence: 0.92 }`
- `GET /api/v1/adaptive-learning/signal-weights/:tenantId?component=risk`
  - Returns learned weights for multi-signal risk detection

**Event Publishing (Asynchronous):**
- `adaptive.learning.outcome.recorded` - When risk evaluation completes
  - Payload: { component: 'risk-evaluation', prediction: riskScore, context: {...}, tenantId }
- `adaptive.learning.outcome.recorded` - When risk scoring completes
  - Payload: { component: 'risk-scoring', modelId, prediction: mlRiskScore, tenantId }
- `risk.evaluation.completed` - Also consumed by adaptive-learning (OutcomeCollectorService) for outcome collection

#### For Recommendations Container

**REST API Calls (Synchronous):**
- `GET /api/v1/adaptive-learning/weights/:tenantId?component=recommendations`
  - Returns learned weights for: vector search, collaborative, temporal, content algorithms
  - Example response: `{ vectorSearch: 0.4, collaborative: 0.3, temporal: 0.2, content: 0.1 }`
- `GET /api/v1/adaptive-learning/model-selection/:tenantId?context=recommendations`
  - Returns best ML model for recommendation ranking

**Event Publishing (Asynchronous):**
- `recommendation.feedback.received` - User feedback (accept/ignore/irrelevant)
  - Consumed by OutcomeCollectorService for learning
  - **Critical:** This is the primary feedback mechanism for CAIS learning
- `adaptive.learning.outcome.recorded` - Recommendation generation outcomes
  - Payload: { component: 'recommendations', recommendations: [...], userActions: [...] }

#### For Forecasting Container

**REST API Calls (Synchronous):**
- `GET /api/v1/adaptive-learning/weights/:tenantId?component=forecasting`
  - Returns learned weights for forecast components
- `GET /api/v1/adaptive-learning/model-selection/:tenantId?context=forecasting`
  - Returns best ML model for forecasting

**Event Publishing (Asynchronous):**
- `forecast.completed` - Forecast completion with results
  - Consumed by adaptive-learning for accuracy tracking
- `adaptive.learning.outcome.recorded` - Forecast accuracy outcomes
  - Payload: { component: 'forecasting', prediction: revenueForecast, actual: actualRevenue, ... }

### User Feedback Loop

**Recommendation Feedback Flow:**

```
User Action (Accept/Ignore/Irrelevant)
    ↓
Frontend → Recommendations Service (REST)
    POST /api/v1/recommendations/:id/feedback
    Body: { action: 'accept' | 'ignore' | 'irrelevant' }
    ↓
Recommendations Service → Event Publisher
    Publish: recommendation.feedback.received
    {
      recommendationId,
      action: 'accept' | 'ignore' | 'irrelevant',
      userId,
      tenantId,
      timestamp
    }
    ↓
Adaptive Learning (OutcomeCollectorService)
    Consumes: recommendation.feedback.received
    Records outcome for learning
    ↓
Adaptive Learning (AdaptiveWeightLearningService)
    Updates recommendation algorithm weights
    - If 'accept' → Increase weight for algorithms that generated this recommendation
    - If 'ignore' → Decrease weight slightly
    - If 'irrelevant' → Decrease weight significantly
    ↓
Future Recommendations
    Use updated learned weights
    Recommendations improve over time
```

### CAIS Learning Progression

1. **New Tenant (0-100 outcomes):**
   - Uses default weights from adaptive-learning
   - Collects outcomes but doesn't adjust weights yet

2. **Emerging (100-500 outcomes):**
   - Blends default weights with learned weights (50/50)
   - Starts adapting to tenant-specific patterns

3. **Established (500-2000 outcomes):**
   - Primarily uses learned weights (80% learned, 20% default)
   - Strong tenant-specific adaptation

4. **Mature (2000+ outcomes):**
   - Fully learned weights (95% learned, 5% default fallback)
   - Optimal performance for tenant context

---

## Notes

1. **Service Consolidation:** Some services may be merged into existing containers if they're small or tightly coupled. Review during migration.

2. **Adaptive Learning:** The `adaptive-learning` container already contains 22 CAIS sub-services. No additional containers needed for these.

3. **Email Services Integration:** Email services (email, email-rendering, email-template) from old_code should be migrated INTO the existing `notification-manager` container. The notification-manager already has:
   - EmailService for email delivery
   - EmailProvider implementations (SendGrid, SMTP, SES)
   - TemplateEngine for email template rendering
   - Multi-channel notification support
   Do NOT create a separate email-service container.

4. **Code Generation Container:** The `code-generation` container (#28) is an **existing container**, not a new one to create. It appears in the communication matrix because it communicates with other services (ai-service, context-service, validation-engine). This is correct and expected.

5. **Risk Catalog Container:** Risk catalog is a **separate container** (not part of risk-analytics) because:
   - It's a read-only service used by multiple containers
   - It manages global, industry, and tenant-specific risk definitions
   - Risk-analytics queries it via REST API before performing evaluations

6. **Asynchronous Architecture:** Risk analysis, risk scoring, forecasting, and recommendations all operate **asynchronously via events** to enable:
   - Parallel processing
   - Better scalability
   - Resilience (services can fail independently)
   - Decoupling

7. **Workflow Orchestrator:** A separate container that coordinates async workflows. When integration-manager detects a Salesforce opportunity change, the orchestrator triggers parallel analysis workflows.

8. **Dependency Management:** Each container should use `@coder/shared` for common functionality and communicate via REST API or events.

9. **Database Naming:** All containers use prefixed container names (e.g., `conversation_conversations`) with `/tenantId` as partition key.

10. **Configuration:** Each container must have `config/default.yaml` and `config/schema.json` following ModuleImplementationGuide.md.

11. **Documentation:** Each container must have README.md, CHANGELOG.md, and openapi.yaml.

12. **CAIS Integration:** All AI/ML services (risk-analytics, recommendations, forecasting) integrate with adaptive-learning using hybrid approach:
    - REST API for getting learned weights/parameters
    - Events for publishing outcomes for continuous learning
    - User feedback events feed back into CAIS for improvement

---

_Plan created: 2026-01-23_
_Last updated: 2026-01-23_
