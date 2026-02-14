# Castiel Containers Reference

Single reference for all containers: list, description, features, and dependencies.

---

## 1. Container List

| Container | Default Port | Path |
|-----------|-------------|------|
| adaptive-learning | 3032 | `containers/adaptive-learning/` |
| ai-analytics | 3057 | `containers/ai-analytics/` |
| ai-conversation | 3045 | `containers/ai-conversation/` |
| ai-insights | 3027 | `containers/ai-insights/` |
| ai-service | 3006 | `containers/ai-service/` |
| analytics-service | 3030 | `containers/analytics-service/` |
| api-gateway | 3002 | `containers/api-gateway/` |
| auth | 3021 | `containers/auth/` |
| cache-service | 3035 | `containers/cache-service/` |
| collaboration-service | 3031 | `containers/collaboration-service/` |
| configuration-service | 3034 | `containers/configuration-service/` |
| content-generation | 3028 | `containers/content-generation/` |
| context-service | 3034 | `containers/context-service/` |
| dashboard | 3011 | `containers/dashboard/` |
| data-enrichment | 3046 | `containers/data-enrichment/` |
| document-manager | 3024 | `containers/document-manager/` |
| embeddings | 3005 | `containers/embeddings/` |
| forecasting | 3050 | `containers/forecasting/` |
| integration-manager | 3026 | `containers/integration-manager/` |
| integration-sync | 3052 | `containers/integration-sync/` |
| logging | 3014 | `containers/logging/` |
| ml-service | 3033 | `containers/ml-service/` |
| multi-modal-service | 3044 | `containers/multi-modal-service/` |
| notification-manager | 3001 | `containers/notification-manager/` |
| pattern-recognition | 3037 | `containers/pattern-recognition/` |
| pipeline-manager | 3025 | `containers/pipeline-manager/` |
| prompt-service | 3036 | `containers/prompt-service/` |
| quality-monitoring | 3060 | `containers/quality-monitoring/` |
| recommendations | 3049 | `containers/recommendations/` |
| reasoning-engine | 3045 | `containers/reasoning-engine/` |
| risk-analytics | 3048 | `containers/risk-analytics/` |
| risk-catalog | 3047 | `containers/risk-catalog/` |
| search-service | 3029 | `containers/search-service/` |
| secret-management | 3003 | `containers/secret-management/` |
| security-scanning | 3055 | `containers/security-scanning/` |
| security-service | 3042 | `containers/security-service/` |
| shard-manager | 3023 | `containers/shard-manager/` |
| signal-intelligence | 3059 | `containers/signal-intelligence/` |
| template-service | 3037 | `containers/template-service/` |
| user-management | 3022 | `containers/user-management/` |
| utility-services | 3061 | `containers/utility-services/` |
| validation-engine | 3036 | `containers/validation-engine/` |
| web-search | 3054 | `containers/web-search/` |
| workflow-orchestrator | 3020 | `containers/workflow-orchestrator/` |

**Supporting / Non-service:**
- **shared** – Shared types and utilities (`@coder/shared`).
- **ui** – Next.js frontend; consumes API Gateway.
- **bug-detection** – Removed from the system.

**Stub / deprecated (excluded from active container list; Plan Phase 3.1):**
- **compliance-service** – Deprecated. Services and types only; no runnable HTTP server. Compliance is covered by **logging** (audit trail), **secret-management** (e.g. compliance report), and **security-service** (compliance_check). See `containers/compliance-service/README.md`.
- **migration-service** – Deprecated. Services and types only; no runnable HTTP server. Migration logic and routes live in **configuration-service** (`/api/v1/migration/*`). See `containers/migration-service/README.md`.
- **security-service** – Stub retained for future completion. Services and types only; no runnable HTTP server yet. Listed in table above (port 3042) for dependency references; not run in default stack until completed. See `containers/security-service/README.md`.

---

## 2. Description, Features, and Dependencies per Container

### adaptive-learning
- **Description:** CAIS adaptive learning: learns component weights, model selection, signal weights; feature engineering; outcome collection; validation; rollout.
- **Features:** Adaptive weight learning, adaptive model selection, signal weighting, feature engineering, outcome collection, performance tracking, validation, rollout management.
- **Dependencies:** ai-service, ml-service, logging.

---

### ai-analytics
- **Description:** Analytics over AI usage, model performance, and AI-powered insights.
- **Features:** AI usage analytics, model performance, insight analytics, integration with AI Service and AI Insights.
- **Dependencies:** auth, logging, user-management, ai-service, ai-insights, analytics-service.

---

### ai-conversation
- **Description:** AI chat and conversation with context, citations, summarization, grounding, intent.
- **Features:** Conversation CRUD, context retrieval, summarization, citation validation, grounding, intent analysis; consumes `shard.updated`.
- **Dependencies:** auth, logging, user-management, ai-service, context-service, shard-manager, embeddings, search-service.

---

### ai-insights
- **Description:** AI-driven insights, proactive/collaborative insights, risk analysis, ML risk scoring, natural-language explanations.
- **Features:** Insight generation, proactive insights, collaborative insights, risk analysis, risk scoring, revenue-at-risk, early warning.
- **Dependencies:** ai-service, shard-manager, embeddings, logging.

---

### ai-service
- **Description:** Central LLM completion service: multi-provider (OpenAI, Anthropic, Ollama), model routing, agents, completion tracking.
- **Features:** Completions, model list/details, agent list/execute, model routing, streaming, event publishing.
- **Dependencies:** secret-management, logging, shard-manager, embeddings.

---

### analytics-service
- **Description:** General analytics, reporting, AI analytics, API performance metrics.
- **Features:** Analytics, reports, AI analytics, quality monitoring, signal intelligence, report generation.
- **Dependencies:** shard-manager, logging, user-management, ai-service, ml-service, integration-manager.

---

### api-gateway
- **Description:** Single entry point: JWT validation, tenant validation, routing, rate limiting, circuit breakers.
- **Features:** JWT auth, X-Tenant-ID injection, request routing, rate limiting, circuit breakers, CORS.
- **Dependencies:** auth, user-management, secret-management, logging, notification-manager, ai-service, embeddings, dashboard.

---

### auth
- **Description:** Identity and sessions: email/password, OAuth (Google, GitHub), SAML/SSO, JWT, MFA, password reset, email verification.
- **Features:** Register, login, logout, refresh, OAuth/SSO, MFA, password reset/change, email verification, provider linking, session management.
- **Dependencies:** user-management, logging, notification (notification-manager), secret-management.

---

### cache-service
- **Description:** Caching layer (Redis), cache metrics, optimization, and warming (includes former cache-management).
- **Features:** Get/set/delete, TTL, metrics, optimize, strategies; optional embeddings integration; cache_management.* events.
- **Dependencies:** logging, embeddings.

---

### collaboration-service
- **Description:** Real-time collaboration, conversations, messages, and collaboration intelligence (includes former collaboration-intelligence).
- **Features:** Conversations, messages, real-time collaboration; collaboration insights; notifications.
- **Dependencies:** shard-manager, logging, user-management, notification-manager, ai-insights.

---

### configuration-service
- **Description:** Centralized configuration and settings.
- **Features:** Configuration storage/retrieval, context and execution integration.
- **Dependencies:** logging, context-service, execution, quality (quality-monitoring), knowledge-base.

---

### content-generation
- **Description:** AI-powered content generation and templates.
- **Features:** Content generation jobs, templates, AI-based generation.
- **Dependencies:** ai-service, shard-manager, logging.

---

### context-service
- **Description:** Context orchestration: assembly, embeddings, planning, knowledge, search, cache.
- **Features:** Context assembly, AST/graph/dependency analysis, token budgeting, relevance scoring.
- **Dependencies:** embeddings, planning, knowledge-base, ai-service, logging, shard-manager, search-service, cache-service.

---

### dashboard
- **Description:** Dashboard configuration, layout, and analytics (includes former dashboard-analytics).
- **Features:** Dashboard CRUD, widgets; manager/executive/board dashboards, prioritized opportunities, portfolio drill-down, view recording, widget cache.
- **Dependencies:** logging, analytics-service, cache-service, risk-analytics, forecasting, shard-manager.

---

### data-enrichment
- **Description:** Enrichment of shards (e.g. embeddings, AI); consumes `shard.created`, `shard.updated`.
- **Features:** Enrichment jobs, embeddings, AI enrichment, re-embedding scheduler.
- **Dependencies:** auth, logging, user-management, shard-manager, embeddings, ai-service.

---

### document-manager
- **Description:** Document and file management (e.g. Azure Blob); collections and templates.
- **Features:** Document CRUD, upload/download, chunks, collections, templates.
- **Dependencies:** logging, user-management, shard-manager.

---

### embeddings
- **Description:** Vector embeddings (Cosmos DB); semantic similarity and search.
- **Features:** Store/update/delete embeddings, batch ops, similarity search, project-scoped.
- **Dependencies:** ai-service, logging.

---

### forecasting
- **Description:** Revenue and demand forecasting; consumes `opportunity.updated`, `risk.evaluation.completed`.
- **Features:** Forecasts, decompositions, ML and risk integration, pipeline-manager integration, seasonality.
- **Dependencies:** auth, logging, user-management, risk-analytics, analytics-service, ml-service, adaptive-learning, pipeline-manager.

---

### integration-manager
- **Description:** Third-party integrations, webhooks, connections, sync triggers.
- **Features:** Integrations, webhooks, connections, sync tasks, catalog; consumes `integration.sync.check-due`, `integration.token.check-expiring`, `integration.*`.
- **Dependencies:** logging, user-management, shard-manager, secret-management, ai-service.

---

### integration-sync
- **Description:** Sync execution for integrations; consumes `shard.updated`, `integration.sync.scheduled`, `integration.webhook.received`.
- **Features:** Sync tasks, token refresh, scheduled sync.
- **Dependencies:** auth, logging, user-management, integration-manager, secret-management, shard-manager.

---

### logging
- **Description:** Audit logging: tamper-evident hash chain, redaction, retention, compliance (SOC2, GDPR, PCI-DSS).
- **Features:** Log ingest, batch, search, aggregate, my-activity; event-driven via RabbitMQ bindings (e.g. `auth.#`, `user.#`, `secret.#`, `notification.#`).
- **Dependencies:** (Event consumer only; no REST service dependencies in config.)

---

### ml-service
- **Description:** ML models, features, training, predictions (risk, forecasting, recommendations); Azure ML.
- **Features:** Feature store, model versioning, training jobs, evaluations, risk scoring, revenue forecasting, recommendations.
- **Dependencies:** ai-service, embeddings, logging, adaptive-learning.

---

### multi-modal-service
- **Description:** Multi-modal inputs: image, diagram, audio, video; design-to-code, etc.
- **Features:** Image/diagram/audio/video processing, modal router, design-to-code.
- **Dependencies:** ai-service, context-service, logging.

---

### notification-manager
- **Description:** Multi-channel notifications: email, push, SMS, WhatsApp, voice, in-app; consumes events from RabbitMQ.
- **Features:** Email (SendGrid, SMTP, SES), push, SMS, WhatsApp, voice, in-app; templates, delivery tracking, quiet hours, webhooks.
- **Dependencies:** user-management, secret-management, logging.

---

### pattern-recognition
- **Description:** Pattern learning, style consistency, design/anti-pattern detection.
- **Features:** Pattern libraries, scans, matches, style analysis, pattern enforcer.
- **Dependencies:** context-service, embeddings, knowledge-base, quality (quality-monitoring), logging.

---

### pipeline-manager
- **Description:** Sales pipeline, opportunities, views.
- **Features:** Pipeline views, opportunity CRUD, opportunity-shard linking.
- **Dependencies:** logging, user-management, shard-manager.

---

### prompt-service
- **Description:** Prompt templates, versioning, A/B testing.
- **Features:** Prompt CRUD, A/B tests, prompt analytics.
- **Dependencies:** ai-service, logging.

---

### quality-monitoring
- **Description:** Quality metrics, anomaly detection, AI/ML/analytics integration.
- **Features:** Quality anomalies, AI/ML/analytics-driven monitoring.
- **Dependencies:** auth, logging, user-management, ai-service, ml-service, analytics-service.

---

### recommendations
- **Description:** ML-based and AI-driven recommendations.
- **Features:** Recommendation generation, ranking, ML and embeddings.
- **Dependencies:** auth, logging, user-management, ml-service, ai-service, embeddings, shard-manager, adaptive-learning, analytics-service.

---

### reasoning-engine
- **Description:** Advanced reasoning: chain-of-thought, tree-of-thought, analogical, counterfactual, causal.
- **Features:** Reasoning tasks, CoT, ToT, analogy, counterfactual, causal.
- **Dependencies:** ai-service, prompt-management (prompt-service), knowledge-base, logging.

---

### risk-analytics
- **Description:** Risk evaluation, scoring, AI/ML/analytics; consumes `opportunity.updated`.
- **Features:** Risk evaluations, ML risk scoring, embeddings and search, adaptive learning, auto-evaluation.
- **Dependencies:** auth, logging, user-management, ai-insights, ml-service, analytics-service, shard-manager, adaptive-learning, embeddings, search-service.

---

### risk-catalog
- **Description:** Risk taxonomy and catalog.
- **Features:** Risk catalog CRUD, taxonomy.
- **Dependencies:** auth, logging, user-management, shard-manager.

---

### search-service
- **Description:** Vector and full-text search over embeddings and shards.
- **Features:** Vector search, full-text, hybrid, field weights, search analytics.
- **Dependencies:** embeddings, shard-manager, logging, ai-service.

---

### secret-management
- **Description:** Secure credential storage: encryption, rotation, versioning; multi-backend (Local, Azure Key Vault, AWS, Vault, etc.).
- **Features:** Secret CRUD, resolve, rotate, versions, rollback, access grants, vault config, import/export.
- **Dependencies:** user-management, logging, notification (notification-manager).

---

### security-scanning
- **Description:** Security scans and vulnerability checks.
- **Features:** Scanning, secret management and shard integration.
- **Dependencies:** auth, logging, user-management, secret-management, shard-manager.

---

### security-service
- **Description:** Security analysis: secret scanning, vulnerabilities, PII, obfuscation, SAST/DAST/SCA, compliance.
- **Features:** Scans, secret/vuln/PII detection, obfuscation, compliance checker, audit.
- **Dependencies:** context-service, quality (quality-monitoring), observability, workflow (workflow-orchestrator), logging, shard-manager, secret-management.

---

### shard-manager
- **Description:** Core data model: shards, shard types, relationships, bulk ops, versioning.
- **Features:** Shard CRUD, shard-types, relationships, bulk, versioning; publishes `shard.*`, `shard.type.*`, `shard.relationship.*`; consumes (bindings) same.
- **Dependencies:** logging, user-management.

---

### signal-intelligence
- **Description:** Signal and communication intelligence from integrations.
- **Features:** Communications, signals, integration and analytics.
- **Dependencies:** auth, logging, user-management, ai-service, analytics-service, integration-manager.

---

### template-service
- **Description:** Templates: context, email, document.
- **Features:** Template CRUD, context/email/document templates.
- **Dependencies:** ai-service, logging.

---

### user-management
- **Description:** Users, tenants, teams, RBAC, invitations, memberships.
- **Features:** Users, tenants, teams, roles, invitations, memberships; consumes `auth.login.*`, `user.registered`.
- **Dependencies:** auth, logging, notification (notification-manager), secret-management.

---

### utility-services
- **Description:** Shared utilities: retry, rate limiting, templates, routing, webhooks, notification providers (email, push, SMS, voice, WhatsApp), quiet hours.
- **Features:** Retry, rate limiting, template engine, variable resolution, webhook validation, notification routing, scheduled jobs.
- **Dependencies:** auth, logging, user-management.

---

### validation-engine
- **Description:** Validation pipeline: syntax, semantic, architecture, security, performance.
- **Features:** Validators, consistency, standards, policy, custom rules.
- **Dependencies:** quality (quality-monitoring), context-service, knowledge-base, logging.

---

### web-search
- **Description:** Web search for AI and context (external search APIs).
- **Features:** Web search, context and embeddings for AI.
- **Dependencies:** auth, logging, user-management, ai-service, context-service, embeddings.

---

### workflow-orchestrator
- **Description:** Workflow definition and execution across integration, risk, ML, forecasting, recommendations, adaptive-learning.
- **Features:** Workflow run, task distribution, progress.
- **Dependencies:** auth, logging, user-management, integration-manager, risk-analytics, ml-service, forecasting, recommendations, adaptive-learning.

---

## 3. Dependencies Between Containers

### 3.1 By dependent (who each container calls)

Dependencies are derived from `config/default.yaml` `services:` and from event bindings where relevant.  
`quality` = quality-monitoring; `workflow` = workflow-orchestrator; `notification` = notification-manager; `knowledge_base` = configuration/knowledge service when present.

| Container | Depends on (REST / config-driven) |
|-----------|-----------------------------------|
| adaptive-learning | ai-service, ml-service, logging |
| ai-analytics | auth, logging, user-management, ai-service, ai-insights, analytics-service |
| ai-conversation | auth, logging, user-management, ai-service, context-service, shard-manager, embeddings, search-service |
| ai-insights | ai-service, shard-manager, embeddings, logging |
| ai-service | secret-management, logging, shard-manager, embeddings |
| analytics-service | shard-manager, logging, user-management, ai-service, ml-service, integration-manager |
| api-gateway | auth, user-management, secret-management, logging, notification-manager, ai-service, embeddings, dashboard |
| auth | user-management, logging, notification-manager, secret-management |
| cache-service | logging, embeddings |
| collaboration-service | shard-manager, logging, user-management, notification-manager, ai-insights |
| configuration-service | logging, context-service, execution, quality-monitoring, knowledge-base |
| content-generation | ai-service, shard-manager, logging |
| context-service | embeddings, planning, knowledge-base, ai-service, logging, shard-manager, search-service, cache-service |
| dashboard | logging, analytics-service, cache-service |
| data-enrichment | auth, logging, user-management, shard-manager, embeddings, ai-service |
| document-manager | logging, user-management, shard-manager |
| embeddings | ai-service, logging |
| forecasting | auth, logging, user-management, risk-analytics, analytics-service, ml-service, adaptive-learning, pipeline-manager |
| integration-manager | logging, user-management, shard-manager, secret-management, ai-service |
| integration-sync | auth, logging, user-management, integration-manager, secret-management, shard-manager |
| ml-service | ai-service, embeddings, logging, adaptive-learning |
| multi-modal-service | ai-service, context-service, logging |
| notification-manager | user-management, secret-management, logging |
| pattern-recognition | context-service, embeddings, knowledge-base, quality-monitoring, logging |
| pipeline-manager | logging, user-management, shard-manager |
| prompt-service | ai-service, logging |
| quality-monitoring | auth, logging, user-management, ai-service, ml-service, analytics-service |
| recommendations | auth, logging, user-management, ml-service, ai-service, embeddings, shard-manager, adaptive-learning, analytics-service |
| reasoning-engine | ai-service, prompt-service, knowledge-base, logging |
| risk-analytics | auth, logging, user-management, ai-insights, ml-service, analytics-service, shard-manager, adaptive-learning, embeddings, search-service |
| risk-catalog | auth, logging, user-management, shard-manager |
| search-service | embeddings, shard-manager, logging, ai-service |
| secret-management | user-management, logging, notification-manager |
| security-scanning | auth, logging, user-management, secret-management, shard-manager |
| security-service | context-service, quality-monitoring, observability, workflow-orchestrator, logging, shard-manager, secret-management |
| shard-manager | logging, user-management |
| signal-intelligence | auth, logging, user-management, ai-service, analytics-service, integration-manager |
| template-service | ai-service, logging |
| user-management | auth, logging, notification-manager, secret-management |
| utility-services | auth, logging, user-management |
| validation-engine | quality-monitoring, context-service, knowledge-base, logging |
| web-search | auth, logging, user-management, ai-service, context-service, embeddings |
| workflow-orchestrator | auth, logging, user-management, integration-manager, risk-analytics, ml-service, forecasting, recommendations, adaptive-learning |

### 3.2 Most used as dependencies

Containers that are frequently used as dependencies (from the table above):

| Container | Used by (count, non-exhaustive) |
|-----------|--------------------------------|
| **logging** | Most containers |
| **auth** | Many user-facing and workflow containers |
| **user-management** | Many user/org-scoped containers |
| **ai-service** | ai-*, embeddings, search, content-generation, template, prompt, reasoning, ml, etc. |
| **shard-manager** | context, integration-*, pipeline, document, collaboration, analytics, ai-insights, search, data-enrichment, risk-*, etc. |
| **embeddings** | context, search, ai-insights, ml, cache-service, data-enrichment, risk-analytics, recommendations, web-search |
| **secret-management** | ai-service, auth, user-management, integration-manager, integration-sync, notification-manager, security-*, api-gateway |
| **context-service** | ai-conversation, configuration, security, migration, multi-modal, pattern, performance, validation, web-search |
| **quality-monitoring** | configuration, migration, pattern, performance, security, validation |
| **analytics-service** | dashboard, forecasting, quality-monitoring, recommendations, risk-analytics, signal-intelligence, workflow-orchestrator |
| **ml-service** | adaptive-learning, analytics-service, forecasting, quality-monitoring, recommendations, risk-analytics, workflow-orchestrator |
| **notification-manager** | auth, user-management, secret-management, collaboration-service; api-gateway routes |
| **adaptive-learning** | forecasting, ml-service, risk-analytics, recommendations, workflow-orchestrator |

### 3.3 Infrastructure and cross-cutting

- **RabbitMQ:** Most containers use it for events (publish and/or consume). `logging` and `notification-manager` are large consumers.
- **Redis:** Used by auth, cache-service, dashboard, ai-service, shard-manager, notification-manager, utility-services, embeddings, etc.
- **Cosmos DB:** Most services use a shared DB and prefixed containers.
- **api-gateway:** Depends on auth, user-management, secret-management, logging, notification-manager, ai-service, embeddings, dashboard; all client traffic goes through it.

### 3.4 Optional / stubs

- **observability**, **execution**, **planning**, **knowledge_base:** Referenced in some `config/default.yaml`; these may be external or not yet implemented. If not deployed, those integrations are disabled or stubbed.
- **bug-detection:** Removed from the system.
- **Ports:** Default ports come from each container’s config; `api-gateway` uses 3002, `notification-manager` uses 3001 in their config—in Docker they run as separate services on different hostnames.

---

## 4. Related documentation

- [ModuleOverview](global/ModuleOverview.md) – Module architecture and responsibilities
- [ModuleImplementationGuide](global/ModuleImplementationGuide.md) – Implementation standards
- [Architecture](global/Architecture.md) – System architecture
- [DataFlow](global/DataFlow.md) – Communication patterns
- Per-container: `containers/<name>/README.md`, `containers/<name>/config/default.yaml`, `containers/<name>/openapi.yaml`
