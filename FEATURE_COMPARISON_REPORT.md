# Feature Comparison Report: containers/ vs old_code/

**Generated:** 2026-01-23

## Executive Summary

This report compares the features and services implemented in the new `containers/` directory structure versus the legacy `old_code/` implementation.

**Platform Context**: Castiel is an AI-native business intelligence platform. The platform is being enhanced with a **Machine Learning system** focused on three priority use cases: Risk Scoring, Revenue Forecasting, and Recommendations. The `ml-service` in containers/ is the core of this critical ML enhancement.

### Statistics

- **Total Services in containers/:** 38
- **Total Services in old_code/:** 223
- **Migrated Services:** 15
- **New Services in containers/:** 23
- **Services Missing from containers/:** 208
- **Critical ML Service**: `ml-service` ✅ (already migrated) - Core of ML enhancement

---

## 1. Services in containers/ (New Architecture)

### adaptive-learning 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: **Adaptive Weight Learning**: Learns optimal component weights, **Adaptive Model Selection**: Selects best model automatically, **Signal Weighting**: Learns optimal signal weights, **Feature Engineering**: Context-aware feature engineering, **Outcome Collection**: Collects predictions and outcomes...

### agent-registry 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: **Agent Management**: Register and manage specialized AI agents, **Agent Selection**: Select agents based on capabilities and requirements, **Execution Tracking**: Track agent execution and results, **Agent Versioning**: Version management for agents, **Capability Matching**: Match agents to tasks based on capabilities...

### ai-insights 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: **AI Insights**: Generate insights from shard data, **Proactive Insights**: Automated insight generation, **Collaborative Insights**: Shared insights and collaboration, **Risk Analysis**: Comprehensive risk evaluation and analysis, - RiskEvaluationService with adaptive weights...

### ai-service 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: LLM completions (OpenAI, Anthropic, Ollama), Model routing and selection, Agent management, Completion tracking, Event publishing

### analytics-service 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: **Analytics**: General analytics and metrics, **Project Analytics**: Project-specific analytics, **AI Analytics**: AI usage analytics, **API Performance**: API performance metrics

### api-gateway 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: **JWT Authentication**: Validates JWT tokens and extracts user context, **Tenant Validation**: Extracts tenantId from JWT and injects X-Tenant-ID header (defense-in-depth), **Request Routing**: Routes requests to backend microservices based on path patterns, **Rate Limiting**: Per-user and per-tenant rate limiting with configurable limits, **Circuit Breakers**: Automatic circuit breaking for unhealthy services (via ServiceClient)...

### auth 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: **Multi-Provider Authentication**: Email/password, Google OAuth, GitHub OAuth, SAML/SSO, **JWT Token Management**: Secure token generation, validation, and refresh, **Session Management**: Multi-device session tracking and revocation, **Password Security**: Bcrypt hashing, password history, strength validation, **Account Security**: Login attempt tracking, account lockout, email verification...

### bug-detection 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: **Anomaly Detection**: Detect code anomalies and potential bugs, **Bug Prediction**: Predict bugs before they occur, **Root Cause Analysis**: Analyze root causes of bugs, **Auto-Fix Suggestions**: Generate automatic fix suggestions, **Bug Tracking**: Track bugs through their lifecycle...

### cache-service 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: **Cache Management**: Cache administration and optimization, **Cache Warming**: Pre-populate cache

### code-generation 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: **UI Component Generation**: Generate React/Vue/Angular components from specifications, **API Endpoint Generation**: Generate REST API endpoints from requirements, **Database Schema Generation**: Generate database schemas from models, **Test Data Generation**: Generate test data and fixtures, **Configuration Generation**: Generate configuration files...

### collaboration-service 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: **Collaboration**: Real-time collaboration features, **Conversation Management**: Conversation and chat management

### compliance-service 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: **Standards Compliance**: WCAG, OWASP Top 10, ISO27001, **Regulatory Compliance**: GDPR, HIPAA, SOC2, PCI-DSS, **Compliance Checking**: Automated compliance verification, **Policy Management**: Custom compliance policies and rules, **Violation Tracking**: Compliance violations with remediation steps...

### configuration-service 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: **Configuration Management**: Centralized configuration storage and retrieval

### content-generation 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: **Content Generation**: Generate content using AI models, **Template-based Generation**: Generate content from templates

### context-service 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: **Context Management**: Store and retrieve code context, **AST Analysis**: Analyze Abstract Syntax Trees, **Dependency Trees**: Build dependency trees, **Call Graphs**: Construct call graphs, **Context Assembly**: Dynamically assemble context for tasks...

### dashboard 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: Dashboard CRUD operations, Widget management, Dashboard configuration, Organization-scoped dashboards

### document-manager 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: **Document CRUD**: Create, read, update, delete document metadata, **File Upload/Download**: Upload files to Azure Blob Storage, generate SAS URLs for download, **Chunked Upload**: Support for large file uploads (>100MB) with chunked upload, **Document Collections**: Organize documents into collections, **Document Templates**: Template management for document generation...

### embeddings 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: Store and update embeddings, Batch operations, Semantic similarity search, Project-scoped embeddings

### integration-manager 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: **Integration Management**: CRUD operations for integrations, **Webhook Management**: Webhook endpoint configuration and delivery, **Sync Tasks**: Bidirectional sync task management, **Integration Catalog**: System-wide integration provider catalog, **Custom Integrations**: User-defined custom API integrations

### logging 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: **Audit Trail**: Comprehensive logging of user actions, data access, security events, **Multi-tenancy**: Organization-isolated logs with Super Admin cross-org access, **Tamper Evidence**: SHA-256 hash chain for log integrity verification, **Compliance**: SOC2, GDPR, PCI-DSS compliant, **Configurable Retention**: Per-organization, per-category retention policies...

### migration-service 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: **Migration Management**: Create, update, and track code migrations, **Step-Based Execution**: Execute migrations in discrete steps, **Rollback Support**: Rollback migrations to previous states, **Version Upgrades**: Handle version upgrades and breaking changes, **Migration Planning**: Plan migrations with multiple steps...

### ml-service 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: **Feature Store**: Feature extraction and management, **Model Management**: Model versioning and deployment, **Training Service**: Model training and job management, **Evaluation Service**: Model evaluation and metrics, **Calibration Service**: Model calibration...

### multi-modal-service 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: **Image Understanding**: Design-to-code conversion, screenshot analysis, wireframe parsing, **Diagram Understanding**: Architecture diagrams, flowcharts, UML, ER diagrams to code, **Audio Understanding**: Voice command transcription, meeting notes, tutorial audio, **Video Understanding**: Tutorial-to-implementation, demo analysis, screen recording processing, **Whiteboard Parsing**: Hand-drawn diagrams and sketches...

### notification-manager 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: Consumes all events from RabbitMQ, Creates notifications based on event types, User and organization-scoped notifications, Mark as read/unread, Delete notifications

### pattern-recognition 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: **Pattern Learning**: Learn patterns from codebase, **Style Consistency**: Enforce code style patterns, **Design Pattern Detection**: Detect design patterns, **Anti-Pattern Detection**: Detect anti-patterns, **Pattern Scanning**: Scan codebase for patterns...

### performance-optimization 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: **Code Optimization**: Optimize code execution performance, **Bundle Size Optimization**: Reduce bundle sizes, **Database Query Optimization**: Optimize database queries, **Algorithm Selection**: Recommend optimal algorithms, **Memory Optimization**: Optimize memory usage...

### pipeline-manager 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: **Pipeline Views**: Pipeline visualization and management, **Opportunity Management**: Opportunity CRUD operations, **Pipeline Analytics**: Revenue forecasting, pipeline metrics, **Opportunity Auto-linking**: Automatic linking to related shards

### prompt-service 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: **Prompt Management**: Prompt CRUD operations, **A/B Testing**: Prompt A/B testing, **Prompt Analytics**: Prompt performance analytics

### reasoning-engine 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: **Chain-of-Thought Reasoning**: Sequential reasoning steps with observations, hypotheses, inferences, and conclusions, **Tree-of-Thought Reasoning**: Multi-branch exploration with path evaluation, **Analogical Reasoning**: Finding and adapting solutions from similar problems, **Counterfactual Reasoning**: Exploring "what-if" scenarios and alternative outcomes, **Causal Reasoning**: Analyzing causal relationships and root causes...

### search-service 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: **Vector Search**: Semantic search using embeddings, **Advanced Search**: Full-text search with filters, **Search Analytics**: Search query analytics and insights

### secret-management 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: **Encryption**: AES-256-GCM encryption with key rotation, **Multi-Backend Support**: Local encrypted storage (Azure Key Vault, AWS Secrets Manager, HashiCorp Vault, GCP Secret Manager - planned), **Access Control**: Role-based access control (RBAC) with explicit grants and hierarchical scoping, **Lifecycle Management**: Expiration tracking, automatic/manual rotation, versioning, soft delete, **Audit Logging**: Comprehensive audit trail for compliance...

### security-service 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: **Secret Scanning**: Detect API keys, passwords, tokens in code, **Vulnerability Scanning**: Identify security vulnerabilities, **PII Detection**: Detect personally identifiable information, **SAST**: Static Application Security Testing, **DAST**: Dynamic Application Security Testing...

### shard-manager 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: **Shard CRUD Operations**: Create, read, update, delete shards, **Shard Type Management**: Define and manage shard schemas (ShardTypes), **Relationship Graph**: Manage relationships between shards (graph structure), **Bulk Operations**: Bulk create, update, delete, restore operations, **Shard Linking**: Link shards together with metadata...

### shared 📄 README

### template-service 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: **Template Management**: Template CRUD operations, **Context Templates**: Context-aware templates, **Email Templates**: Email template management, **Document Templates**: Document template management

### ui 📄 README 🐳 Docker ⚙️ Config
   - Features: **Next.js 16**: App Router, Server Components, API Routes, **React 19**: Latest React features, **TypeScript**: Full type safety, **Shadcn UI**: Component library, **Tailwind CSS**: Styling...

### user-management 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: **User Profiles**: User profile management, preferences, and settings, **Organizations**: Multi-tenant organization management, **Teams**: Team creation, membership, and hierarchy, **RBAC**: Role-based access control with custom roles and permissions, **Invitations**: User invitation system with expiration and tracking...

### validation-engine 📄 README 📋 OpenAPI 🐳 Docker ⚙️ Config
   - Features: **Syntax Validation**: Validate code syntax, **Semantic Validation**: Validate code semantics, **Architecture Validation**: Validate architecture compliance, **Security Validation**: Validate security requirements, **Performance Validation**: Validate performance requirements...

---

## 2. Services in old_code/ (Legacy Architecture)

### acl-cache

### acl

### active-learning

### adapter-manager

### adaptive-feature-engineering

### adaptive-learning

### adaptive-learning-rollout

### adaptive-learning-validation

### adaptive-model-selection

### adaptive-weight-learning

### admin-dashboard

### advanced-retrieval

### advanced-search

### adversarial-testing

### ai

### ai-analytics

### ai-chat-catalog

### ai-config

### ai-context-assembly

### ai-insights

### ai-model-seeder

### analytics

### anomaly-detection

### api-performance-monitoring

### audit

### audit-integration

### audit-trail

### audit-webhook-emitter

### auth

### azure-blob-storage

### azure-container-init

### azure-openai

### benchmarking

### bidirectional-sync

### bulk-document

### bulk-job-worker

### cache-monitor

### cache-optimization

### cache-subscriber

### cache-warming

### cache

### calendar-intelligence

### causal-inference

### chain-of-thought

### citation-validation

### collaboration

### collaborative-insights

### collaborative-intelligence

### communication-analysis

### competitive-intelligence


_... and 173 more services_


---

## 3. Migration Status

### ✅ Migrated Services (15)

These services have been migrated from old_code/ to containers/:

- **adaptive-learning** ← adaptive-learning
- **ai-insights** ← ai-insights
- **ai-service** ← ai
- **analytics-service** ← analytics
- **auth** ← auth
- **cache-service** ← cache
- **collaboration-service** ← collaboration
- **configuration-service** ← configuration
- **content-generation** ← content-generation
- **dashboard** ← dashboard
- **integration-manager** ← integration
- **ml-service** ← ml
- **multi-modal-service** ← multimodal
- **notification-manager** ← notification
- **security-service** ← security

### 🆕 New Services in containers/ (23)

These services are new in the containers/ architecture:

- **agent-registry**
- **api-gateway**
- **bug-detection**
- **code-generation**
- **compliance-service**
- **context-service**
- **document-manager**
- **embeddings**
- **logging**
- **migration-service**
- **pattern-recognition**
- **performance-optimization**
- **pipeline-manager**
- **prompt-service**
- **reasoning-engine**
- **search-service**
- **secret-management**
- **shard-manager**
- **shared**
- **template-service**
- **ui**
- **user-management**
- **validation-engine**

### ⚠️ Services Missing from containers/ (208)

These services exist in old_code/ but are not yet migrated to containers/:

- **acl-cache**
- **acl**
- **active-learning**
- **adapter-manager**
- **adaptive-feature-engineering**
- **adaptive-learning-rollout**
- **adaptive-learning-validation**
- **adaptive-model-selection**
- **adaptive-weight-learning**
- **admin-dashboard**
- **advanced-retrieval**
- **advanced-search**
- **adversarial-testing**
- **ai-analytics**
- **ai-chat-catalog**
- **ai-config**
- **ai-context-assembly**
- **ai-model-seeder**
- **anomaly-detection**
- **api-performance-monitoring**
- **audit**
- **audit-integration**
- **audit-trail**
- **audit-webhook-emitter**
- **azure-blob-storage**
- **azure-container-init**
- **azure-openai**
- **benchmarking**
- **bidirectional-sync**
- **bulk-document**
- **bulk-job-worker**
- **cache-monitor**
- **cache-optimization**
- **cache-subscriber**
- **cache-warming**
- **calendar-intelligence**
- **causal-inference**
- **chain-of-thought**
- **citation-validation**
- **collaborative-insights**
- **collaborative-intelligence**
- **communication-analysis**
- **competitive-intelligence**
- **comprehensive-audit-trail**
- **computed-field**
- **computed-fields**
- **conflict-resolution-learning**
- **consensus-forecasting**
- **context-aware-query-parser**
- **context-cache**
- **context-quality**
- **context-template**
- **conversation-context-retrieval**
- **conversation-event-subscriber**
- **conversation-realtime**
- **conversation-summarization**
- **conversation**
- **conversion-schema**
- **core-types-seeder**
- **cosmos-connection-manager**
- **cosmos-db**
- **counterfactual**
- **credential-encryption**
- **custom-integration**
- **customer-success-integration**
- **dashboard-cache**
- **data-quality**
- **document-audit-integration**
- **document-audit**
- **document-settings**
- **document-upload**
- **document-validation**
- **early-warning**
- **email**
- **email-rendering**
- **email-template**
- **embedding-content-hash-cache**
- **embedding-processor**
- **embedding-template**
- **enrichment**
- **entity-resolution**
- **episodic-memory**
- **explainable-ai**
- **explanation-monitoring**
- **explanation-quality**
- **feature-flag**
- **federated-learning**
- **feedback-learning**
- **feedback-quality**
- **field-security**
- **field-validation**
- **forecast-commitment**
- **forecast-decomposition**
- **graph-neural-network**
- **grounding**
- **hierarchical-memory**
- **hybrid-retrieval**
- **import-export**
- **initialization**
- **insight-computation**


_... and 108 more services_


---

## 4. Feature Comparison by Category

### Authentication & Authorization
- **containers/:** auth, user-management
- **old_code/:** auth, integration-external-user-id, user-feedback

### AI & Machine Learning
- **containers/:** 
  - **ml-service** ⭐ - **CRITICAL**: Core of ML enhancement (Risk Scoring, Revenue Forecasting, Recommendations) with Azure ML integration
  - **ai-insights** - ML-enhanced risk analysis (integrates with ml-service)
  - **ai-service** - LLM completions and reasoning
  - **adaptive-learning** - CAIS adaptive learning system
- **old_code/:** adaptive-feature-engineering, adaptive-learning, adaptive-learning-rollout, adaptive-learning-validation, adaptive-model-selection, adaptive-weight-learning, ai, ai-analytics, ai-chat-catalog, ai-config, ai-context-assembly, ai-insights, ai-model-seeder, audit-trail, azure-container-init, azure-openai, chain-of-thought, collaborative-insights, comprehensive-audit-trail, email, email-rendering, email-template, explainable-ai, insight-computation, insight-scheduler, insight-templates, insight, ml, proactive-insight, proactive-insights-analytics, proactive-insights-digest-worker, proactive-insights-event-subscriber, proactive-insights-worker, risk-ai-validation, risk-explainability

**Note**: The `ml-service` in containers/ is the core of Castiel's critical ML enhancement, providing ML-powered predictions for the BI platform. It integrates with Azure ML for managed training and serving, and is integrated into the Compound AI System (CAIS) architecture.

### Data Management
- **containers/:** cache-service, document-manager, shard-manager
- **old_code/:** acl-cache, bulk-document, cache-monitor, cache-optimization, cache-subscriber, cache-warming, cache, context-cache, dashboard-cache, document-audit-integration, document-audit, document-settings, document-upload, document-validation, embedding-content-hash-cache, integration-shard, metrics-shard, semantic-cache, shard-cache, shard-embedding, shard-event, shard-linking, shard-relationship, shard-type-cache, shard-validation, token-validation-cache, vector-search-cache

### Integration & Content
- **containers/:** content-generation, integration-manager, template-service
- **old_code/:** audit-integration, content-generation, context-template, custom-integration, customer-success-integration, document-audit-integration, email-template, embedding-content-hash-cache, embedding-template, insight-templates, integration-catalog, integration-connection, integration-deduplication, integration-external-user-id, integration-provider, integration-rate-limiter, integration-search, integration-shard, integration-visibility, integration, integrations, project-template

### Security & Compliance
- **containers/:** compliance-service, secret-management, security-service
- **old_code/:** field-security, security

---

## 4.1 ML Capabilities Comparison

### Critical ML Enhancement

Castiel is being enhanced with a **Machine Learning system** focused on three priority use cases:

1. **Risk Scoring** ⭐ - ML-powered risk prediction to identify opportunities at risk
2. **Revenue Forecasting** ⭐ - Predictive revenue forecasting across multiple levels
3. **Recommendations** ⭐ - Intelligent next-best-action recommendations

### containers/ml-service vs old_code/ml

#### containers/ml-service (New Architecture)

**Architecture:**
- **Azure ML Workspace** for managed training and model management
- **Azure ML Managed Endpoints** for real-time model serving (auto-scaling, high availability)
- **Azure ML AutoML** for automated model selection and training
- **Feature Store Service** for feature engineering and management
- **Model Service** for model versioning and deployment
- **Training Service** for training job orchestration
- **Evaluation Service** for model evaluation and metrics

**Key Features:**
- ✅ **Feature Store**: Centralized feature engineering and management
- ✅ **Azure ML Integration**: Managed training and serving infrastructure
- ✅ **AutoML**: Automated model selection and hyperparameter tuning
- ✅ **Model Registry**: Versioned model management
- ✅ **Managed Endpoints**: Auto-scaling model serving (0-10 instances)
- ✅ **Three Priority Use Cases**: Risk Scoring, Revenue Forecasting, Recommendations
- ✅ **CAIS Integration**: Part of Compound AI System architecture
- ✅ **Unified Monitoring**: All ML metrics in Application Insights

**Model Types:**
- Risk Scoring: Regression (XGBoost/LightGBM via AutoML)
- Revenue Forecasting: Time series regression (XGBoost/LightGBM via AutoML)
- Recommendations: Ranking models (XGBoost/LightGBM via AutoML)

**Training Approach:**
- Global models with industry fine-tuning when justified by data
- Azure ML AutoML for automated model selection
- Managed compute clusters (auto-scaling, pay-per-use)

**Serving Approach:**
- Azure ML Managed Endpoints for real-time inference
- Public endpoints with Managed Identity authentication
- Auto-scaling based on traffic (0-10 instances)

#### old_code/ml (Legacy Architecture)

**Architecture:**
- Custom ML training infrastructure
- Custom model serving infrastructure
- Manual model management

**Key Features:**
- Feature engineering (custom implementation)
- Model training (custom orchestration)
- Model serving (custom endpoints)
- Model versioning (custom registry)

**Differences:**
- ❌ No Azure ML integration (custom infrastructure)
- ❌ Manual model management (no managed services)
- ❌ Custom serving infrastructure (not auto-scaling)
- ❌ No AutoML (manual model selection)
- ❌ Separate monitoring (not unified with Application Insights)

### ML Integration Points

**New Architecture (containers/):**
- **AI Insights** integrates with ML Service for ML-powered risk scoring
- **Pipeline Manager** integrates with ML Service for ML-powered revenue forecasting
- **Recommendations Service** (future) will integrate with ML Service for ML-powered recommendations
- All ML predictions flow through CAIS architecture (explanation, reasoning, decision layers)

**Legacy Architecture (old_code/):**
- ML capabilities were more isolated
- Less integration with other AI services
- No unified CAIS architecture

### Summary

The new `containers/ml-service` architecture provides:
- ✅ **Managed Infrastructure**: Azure ML Workspace and Managed Endpoints eliminate custom infrastructure
- ✅ **AutoML**: Automated model selection reduces manual work
- ✅ **Auto-scaling**: Managed endpoints scale automatically (0-10 instances)
- ✅ **Unified Monitoring**: All ML metrics in Application Insights
- ✅ **CAIS Integration**: ML predictions integrated into Compound AI System
- ✅ **Priority Use Cases**: Focused on three high-value use cases (Risk Scoring, Revenue Forecasting, Recommendations)

---

## 5. Architecture Differences

### containers/ Architecture
- ✅ Microservices architecture with independent modules
- ✅ Each service has its own Dockerfile, config, and OpenAPI spec
- ✅ Standardized module structure (config/, src/, routes/, services/)
- ✅ Shared utilities in `containers/shared/`
- ✅ Configuration-driven service URLs (no hardcoded ports/URLs)
- ✅ Tenant isolation enforced at all layers

### old_code/ Architecture
- Monolithic API structure in `apps/api/`
- Services organized in `src/services/` directory
- Shared packages in `packages/`
- Mixed initialization patterns
- Some hardcoded service references

---

## 6. Recommendations

### High Priority Migrations
Based on the analysis, consider prioritizing migration of:

1. **acl-cache**
1. **acl**
1. **active-learning**
1. **adapter-manager**
1. **adaptive-feature-engineering**
1. **adaptive-learning-rollout**
1. **adaptive-learning-validation**
1. **adaptive-model-selection**
1. **adaptive-weight-learning**
1. **admin-dashboard**
1. **advanced-retrieval**
1. **advanced-search**
1. **adversarial-testing**
1. **ai-analytics**
1. **ai-chat-catalog**
1. **ai-config**
1. **ai-context-assembly**
1. **ai-model-seeder**
1. **anomaly-detection**
1. **api-performance-monitoring**

### New Features to Review
The following new services in containers/ should be reviewed for feature parity:

- **agent-registry**
- **api-gateway**
- **bug-detection**
- **code-generation**
- **compliance-service**
- **context-service**
- **document-manager**
- **embeddings**
- **logging**
- **migration-service**
- **pattern-recognition**
- **performance-optimization**
- **pipeline-manager**
- **prompt-service**
- **reasoning-engine**
- **search-service**
- **secret-management**
- **shard-manager**
- **shared**
- **template-service**
- **ui**
- **user-management**
- **validation-engine**

---

## Notes

- This report is generated automatically and may not capture all nuances
- Service name matching uses fuzzy logic and may have false positives/negatives
- Feature extraction is based on README.md files and may be incomplete
- Some services in old_code/ may be deprecated or planned for removal

---

_Report generated by feature-comparison-report.ts_
