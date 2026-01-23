# Coder IDE Architecture

## Container Overview

| Container | Port | Communication | Database | Purpose |
|-----------|------|---------------|----------|---------|
| **Main Application** | 3000 | REST API + WebSocket | Shared PostgreSQL | API Gateway, Authentication, User Management |
| **Secret Management** | 3003 | REST API | Shared PostgreSQL | Centralized secret storage for all modules |
| **Usage Tracking** | 3004 | RabbitMQ (consumer) + REST API | Shared PostgreSQL | Usage metering, cost tracking, quotas, metrics |
| **Embeddings** | 3005 | REST API + RabbitMQ (publisher) | Shared PostgreSQL + pgvector | Vector embeddings, semantic search |
| **AI Service** | 3006 | REST API + RabbitMQ (publisher) | Shared PostgreSQL | LLM completions, model routing, fallbacks, agents |
| **Planning** | 3007 | REST API + RabbitMQ (publisher) | Shared PostgreSQL | Plans, Projects, Tasks, Roadmaps, Issues, Releases, Architecture, Dependencies, Incidents, Environments, Debt, Reviews, Modules |
| **Execution** | 3008 | REST API | Shared PostgreSQL | Plan execution engine, step execution, rollback |
| **MCP Server** | 3009 | REST API + RabbitMQ (publisher) | Shared PostgreSQL | Model Context Protocol server management |
| **Knowledge Base** | 3010 | REST API + RabbitMQ (publisher) | Shared PostgreSQL | Documentation and knowledge management |
| **Dashboard** | 3011 | REST API | Shared PostgreSQL | Dashboard configuration and widgets |
| **Calendar** | 3012 | REST API | Shared PostgreSQL | Event management and calendar views |
| **Messaging** | 3013 | REST API + RabbitMQ | Shared PostgreSQL | Conversations and messaging |
| **Logging** | 3014 | REST API | Shared PostgreSQL | Log ingestion, search, and filtering |
| **Learning & Development** | 3015 | REST API | Shared PostgreSQL | Learning paths and patterns library |
| **Collaboration** | 3016 | REST API | Shared PostgreSQL | Pairing sessions and innovation management |
| **Quality** | 3017 | REST API | Shared PostgreSQL | Experiments and compliance checks |
| **Resource Management** | 3018 | REST API | Shared PostgreSQL | Capacity planning and resource allocation |
| **Workflow** | 3019 | REST API | Shared PostgreSQL | Workflow orchestration and execution |
| **Observability** | 3020 | REST API | Shared PostgreSQL | Telemetry and distributed tracing |

---

## Database Strategy

**Single Shared PostgreSQL Database**

All containers share a single PostgreSQL database with table prefixes for logical separation:

```
PostgreSQL Database (coder_ide)
├── Core Tables (Main Application)
│   ├── users
│   ├── organizations
│   ├── teams
│   ├── projects
│   └── ...
│
├── Secret Management Tables
│   ├── secrets
│   ├── secret_versions
│   ├── secret_access_grants
│   ├── vault_configurations
│   └── secret_audit_logs
│
├── Notification Tables
│   ├── notifications
│   ├── notification_channels
│   ├── notification_preferences
│   └── notification_templates
│
├── MCP Server Tables
│   ├── mcp_servers
│   ├── mcp_server_capabilities
│   ├── mcp_tools
│   ├── mcp_executions
│   └── mcp_health_checks
│
├── Knowledge Base Tables
│   ├── kb_articles
│   ├── kb_categories
│   └── kb_search_index
│
├── Planning Tables
│   ├── plans
│   ├── plan_steps
│   └── plan_executions
│
├── AI Service Tables
│   ├── ai_providers
│   ├── ai_models
│   ├── ai_model_configurations
│   ├── ai_routing_rules
│   ├── ai_fallback_chains
│   ├── ai_rate_limit_configs
│   ├── ai_completion_logs
│   └── ai_cache
│
├── Embeddings Tables (pgvector)
│   ├── emb_collections
│   ├── emb_documents
│   ├── emb_chunks (with vector column)
│   ├── emb_models
│   └── emb_jobs
│
├── Prompt Management Tables
│   ├── prompt_templates
│   ├── prompt_versions
│   ├── prompt_variables
│   ├── prompt_overrides
│   ├── prompt_experiments
│   ├── prompt_variants
│   └── prompt_executions
│
└── Usage Tracking Tables
    ├── usage_events
    ├── usage_aggregates_hourly
    ├── usage_aggregates_daily
    ├── usage_aggregates_monthly
    ├── usage_quotas
    ├── usage_budgets
    ├── usage_alerts
    └── usage_pricing
```

**Benefits:**
- **Simplicity**: Single database to manage, backup, and monitor
- **Data Integrity**: Foreign keys across all tables (e.g., `mcp_executions.user_id` → `users.id`)
- **Transactions**: Cross-module transactions when needed
- **Joins**: Direct queries across modules for reporting/analytics
- **Deployment**: Simpler infrastructure

**Table Naming Convention:**
- Core tables: No prefix (e.g., `users`, `projects`)
- Module tables: Prefixed with module name (e.g., `mcp_servers`, `kb_articles`, `ai_models`)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    CLIENT LAYER                                          │
│                          (Electron App / Web Browser)                                    │
└─────────────────────────────────────────┬───────────────────────────────────────────────┘
                                          │ HTTP / WebSocket
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 MAIN APPLICATION                                         │
│                    (Fastify API + WebSocket Server + React SSR)                         │
│                                                                                          │
│   • API Gateway (routes requests to microservices)                                      │
│   • Authentication & Authorization                                                       │
│   • User Management (Users, Organizations, Teams, RBAC)                                 │
│   • WebSocket connections (real-time updates)                                           │
└───────────┬─────────────────────────────┬───────────────────────────────┬───────────────┘
            │                             │                               │
            │                             │ Pub/Sub                       │ Cache
            │                             ▼                               ▼
            │                   ┌─────────────────┐             ┌─────────────────┐
            │                   │    RabbitMQ     │             │     Redis       │
            │                   │   (Event Bus)   │             │   (Cache/Queue) │
            │                   └────────┬────────┘             └─────────────────┘
            │                            │
            │    ┌───────────────┬───────┴───────┬───────────────┬───────────────┬───────────────┐
            │    │               │               │               │               │               │
            │    ▼               ▼               ▼               ▼               ▼               ▼
            │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
            │ │   SECRET    │ │   USAGE     │ │ EMBEDDINGS  │ │     AI      │ │  PLANNING   │ │ EXECUTION   │
            │ │ MANAGEMENT  │ │  TRACKING   │ │             │ │   SERVICE   │ │             │ │             │
            │ ├─────────────┤ ├─────────────┤ ├─────────────┤ ├─────────────┤ ├─────────────┤ ├─────────────┤
            │ │ REST API    │ │ REST API    │ │ REST API    │ │ REST API    │ │ REST API    │ │ REST API    │
            │ │             │ │ RabbitMQ ◄──│ │ RabbitMQ ──►│ │ RabbitMQ ──►│ │ RabbitMQ ──►│ │             │
            │ │             │ │ (Consumer)  │ │ (Publisher)  │ │ (Publisher) │ │ (Publisher) │ │             │
            │    ▼               ▼               ▼               ▼               ▼               ▼
            │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
            │ │     MCP     │ │  KNOWLEDGE  │ │  DASHBOARD  │ │  CALENDAR   │ │ MESSAGING   │ │  LOGGING    │
            │ │   SERVER    │ │    BASE     │ │             │ │             │ │             │ │             │
            │ ├─────────────┤ ├─────────────┤ ├─────────────┤ ├─────────────┤ ├─────────────┤ ├─────────────┤
            │ │ REST API    │ │ REST API    │ │ REST API    │ │ REST API    │ │ REST API    │ │ REST API    │
            │ │ RabbitMQ ──►│ │ RabbitMQ ──►│ │             │ │             │ │ RabbitMQ    │ │             │
            │ │ (Publisher) │ │ (Publisher) │ │             │ │             │ │             │ │             │
            │    ▼               ▼               ▼               ▼               ▼               ▼
            │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
            │ │  LEARNING   │ │COLLABORATION│ │   QUALITY   │ │  RESOURCE   │ │  WORKFLOW   │ │OBSERVABILITY│
            │ │     &       │ │             │ │             │ │ MANAGEMENT  │ │             │ │             │
            │ │ DEVELOPMENT │ │             │ │             │ │             │ │             │ │             │
            │ ├─────────────┤ ├─────────────┤ ├─────────────┤ ├─────────────┤ ├─────────────┤ ├─────────────┤
            │ │ REST API    │ │ REST API    │ │ REST API    │ │ REST API    │ │ REST API    │ │ REST API    │
            │ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
            │                                                                        │
            │    ┌───────────────┬───────────────┬───────────────┐                  │
            │    │               │               │               │                  │
            │    ▼               ▼               ▼               │                  │
            │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │                  │
            │ │ EMBEDDINGS  │ │   PROMPT    │ │   USAGE     │   │                  │
            │ │  (pgvector) │ │ MANAGEMENT  │ │  TRACKING   │   │                  │
            │ ├─────────────┤ ├─────────────┤ ├─────────────┤   │                  │
            │ │ REST API    │ │ REST API    │ │ REST API    │   │                  │
            │ │ RabbitMQ ──►│ │ RabbitMQ ──►│ │ RabbitMQ ◄──│◄──┘ (consumes all)   │
            │ │ (Publisher) │ │ (Publisher) │ │ (Consumer)  │                      │
            │ └─────────────┘ └─────────────┘ └─────────────┘                      │
            │        │               │               │               │               │
            │        └───────────────┴───────────────┴───────────────┴───────────────┘
            │                                        │
            │  ┌─────────────┐                       │ All containers request
            │  │   SECRET    │◄──────────────────────┘ secrets via REST API
            │  │ MANAGEMENT  │
            │  ├─────────────┤
            │  │ REST API    │
            │  └─────────────┘
            │         │
            ▼         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              SHARED POSTGRESQL DATABASE                                  │
│                                                                                          │
│   All containers connect to the same database instance                                  │
│   Tables are prefixed by module (e.g., mcp_servers, kb_articles, ai_models)            │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Container Communication Matrix

**Key:**
- `REST` = Synchronous REST API calls
- `RabbitMQ` = Asynchronous event publishing/consuming
- `-` = No direct communication

| From \ To | Main App | Secret | Usage | Embed | AI | Plan | Exec | MCP | Know | Dash | Cal | Msg | Log | Learn | Collab | Qual | Res | Work | Obs |
|-----------|----------|--------|-------|-------|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|
| **Main App** | - | REST | REST | REST | REST | REST | REST | REST | REST | REST | REST | REST | REST | REST | REST | REST | REST | REST | REST |
| **Secret** | REST | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **Usage** | REST | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **Embeddings** | REST | REST | RabbitMQ | - | REST | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **AI Service** | REST | REST | RabbitMQ | - | - | REST | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **Planning** | REST | REST | RabbitMQ | REST | REST | - | REST | REST | REST | - | - | - | - | - | - | - | - | - | - |
| **Execution** | REST | - | - | - | - | REST | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **MCP** | REST | REST | RabbitMQ | - | REST | - | - | - | REST | - | - | - | - | - | - | - | - | - | - |
| **Knowledge** | REST | REST | RabbitMQ | REST | REST | - | - | REST | - | - | - | - | - | - | - | - | - | - | - |
| **Dashboard** | REST | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **Calendar** | REST | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **Messaging** | REST | - | - | - | - | - | - | - | - | - | - | RabbitMQ | - | - | - | - | - | - | - |
| **Logging** | REST | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **Learning** | REST | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **Collaboration** | REST | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **Quality** | REST | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **Resource** | REST | - | - | - | - | REST | - | - | - | - | - | - | - | - | - | - | - | - | - |
| **Workflow** | REST | - | - | - | - | REST | REST | - | - | - | - | - | - | - | - | - | - | - | - |
| **Observability** | REST | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |

---

## Event Types (RabbitMQ)

### MCP Server Events
```typescript
// Published to: mcp.events exchange
type MCPEvent =
  | { type: 'mcp.tool.execution.started'; serverId: string; toolName: string; executionId: string }
  | { type: 'mcp.tool.execution.completed'; executionId: string; durationMs: number }
  | { type: 'mcp.tool.execution.failed'; executionId: string; error: string }
  | { type: 'mcp.server.health.changed'; serverId: string; status: 'healthy' | 'degraded' | 'unhealthy' }
  | { type: 'mcp.server.rate_limit.exceeded'; serverId: string; organizationId: string }
  | { type: 'mcp.server.registered'; serverId: string }
  | { type: 'mcp.server.deregistered'; serverId: string };
```

### Knowledge Base Events
```typescript
// Published to: knowledge.events exchange
type KnowledgeEvent =
  | { type: 'knowledge.article.created'; articleId: string; projectId: string }
  | { type: 'knowledge.article.updated'; articleId: string }
  | { type: 'knowledge.article.deleted'; articleId: string }
  | { type: 'knowledge.search.indexed'; documentCount: number };
```

### Planning Events
```typescript
// Published to: planning.events exchange
type PlanningEvent =
  | { type: 'planning.plan.created'; planId: string; projectId: string }
  | { type: 'planning.plan.approved'; planId: string }
  | { type: 'planning.plan.executed'; planId: string; status: 'success' | 'failed' }
  | { type: 'planning.task.generated'; planId: string; taskCount: number };
```

### AI Service Events
```typescript
// Published to: ai.events exchange
type AIEvent =
  | { type: 'ai.completion.started'; requestId: string; model: string; organizationId: string }
  | { type: 'ai.completion.completed'; requestId: string; model: string; tokensUsed: number; durationMs: number }
  | { type: 'ai.completion.failed'; requestId: string; model: string; error: string }
  | { type: 'ai.completion.fallback'; requestId: string; fromModel: string; toModel: string; reason: string }
  | { type: 'ai.ratelimit.exceeded'; organizationId: string; userId: string; scope: string }
  | { type: 'ai.provider.health.changed'; providerId: string; status: string };
```

### Embeddings Events
```typescript
// Published to: embedding.events exchange
type EmbeddingEvent =
  | { type: 'embedding.document.created'; documentId: string; collectionId: string }
  | { type: 'embedding.document.updated'; documentId: string; chunkCount: number }
  | { type: 'embedding.document.deleted'; documentId: string; sourceId: string }
  | { type: 'embedding.job.started'; jobId: string; collectionId: string }
  | { type: 'embedding.job.progress'; jobId: string; processed: number; total: number }
  | { type: 'embedding.job.completed'; jobId: string; documentsProcessed: number }
  | { type: 'embedding.job.failed'; jobId: string; error: string };
```

### Prompt Management Events
```typescript
// Published to: prompt.events exchange
type PromptEvent =
  | { type: 'prompt.template.created'; templateId: string; name: string }
  | { type: 'prompt.version.published'; templateId: string; version: number }
  | { type: 'prompt.override.created'; templateId: string; organizationId: string }
  | { type: 'prompt.experiment.started'; experimentId: string; templateId: string }
  | { type: 'prompt.experiment.completed'; experimentId: string; winner: string }
  | { type: 'prompt.rendered'; templateId: string; versionId: string; variantId?: string };
```

### Usage Tracking Events (Published)
```typescript
// Published to: usage.events exchange
type UsageTrackingEvent =
  | { type: 'usage.quota.warning'; organizationId: string; quotaId: string; percentage: number }
  | { type: 'usage.quota.exceeded'; organizationId: string; quotaId: string }
  | { type: 'usage.budget.warning'; organizationId: string; budgetId: string; percentage: number }
  | { type: 'usage.budget.exceeded'; organizationId: string; budgetId: string };
```

### Notification Manager (Consumer)
```typescript
// Subscribes to: *.events.* (all events)
// Routes to appropriate notification channels based on event type and user preferences
```

### Usage Tracking (Consumer)
```typescript
// Subscribes to: ai.events.*, embedding.events.*, mcp.events.*
// Records usage metrics from all modules for metering, cost tracking, and quotas
```

---

## Container Dependencies

```
                         ┌─────────────────┐
                         │ Secret Management│
                         │   (Foundation)   │
                         └────────┬────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
    ┌───────────────┐      ┌───────────────┐      ┌───────────────┐
    │  AI Service   │      │ Notification  │      │ Usage Tracking│
    │               │      │   Manager     │      │  (Consumer)   │
    └───────┬───────┘      └───────────────┘      └───────────────┘
            │                      ▲                      ▲
            │                      │ (events)             │ (consumes all)
     ┌──────┴──────┐               │                      │
     │             │               │                      │
     ▼             ▼               │                      │
┌─────────┐  ┌───────────┐        │                      │
│Embeddings│  │  Prompt   │        │                      │
│(pgvector)│  │Management │        │                      │
└────┬────┘  └─────┬─────┘        │                      │
     │             │               │                      │
     └──────┬──────┘               │                      │
            │                      │                      │
            ▼                      │                      │
     ┌───────────────┐             │                      │
     │  MCP Server   │─────────────┴──────────────────────┘
     └───────┬───────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌───────────┐  ┌───────────────┐
│ Knowledge │  │   Planning    │
│   Base    │  │               │
└───────────┘  └───────────────┘
```

**Startup Order:**
1. PostgreSQL, RabbitMQ, Redis
2. Secret Management (no dependencies)
3. Notification Manager (depends on Secret Management)
4. Usage Tracking (depends on RabbitMQ - consumes events from all)
5. AI Service (depends on Secret Management)
6. Embeddings (depends on AI Service)
7. Prompt Management (depends on Secret Management)
8. MCP Server (depends on Secret Management, AI Service)
9. Knowledge Base (depends on Secret Management, AI Service, Embeddings, MCP Server)
10. Planning (depends on Secret Management, AI Service, Embeddings, Prompt Management, MCP Server, Knowledge Base)
11. Main Application (depends on all)

---

## Editor UI

UI pages and Module Specific components must be separated by Module Folders

```
src/renderer/
├── components/
│   ├── notifications/     # Notification Manager UI
│   ├── secrets/           # Secret Management UI
│   ├── mcp/               # MCP Server UI
│   ├── knowledge/         # Knowledge Base UI
│   ├── planning/          # Planning UI
│   ├── ai/                # AI Service UI
│   ├── embeddings/        # Embeddings UI (collections, jobs)
│   ├── prompts/           # Prompt Management UI (templates, experiments)
│   └── usage/             # Usage Tracking UI (dashboards, quotas, budgets)
├── pages/
│   ├── notifications/
│   ├── secrets/
│   ├── mcp/
│   ├── knowledge/
│   ├── planning/
│   ├── ai/
│   ├── embeddings/
│   ├── prompts/
│   └── usage/
└── contexts/
    ├── NotificationContext.tsx
    ├── SecretContext.tsx
    ├── MCPContext.tsx
    ├── KnowledgeContext.tsx
    ├── PlanningContext.tsx
    ├── AIContext.tsx
    ├── EmbeddingsContext.tsx
    ├── PromptsContext.tsx
    └── UsageContext.tsx
```

---

## Docker Compose Structure

```yaml
services:
  # Infrastructure
  postgres:
    image: postgres:16
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=coder_ide
      - POSTGRES_USER=coder
      - POSTGRES_PASSWORD=${DB_PASSWORD}
  
  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"
  
  redis:
    image: redis:7-alpine
  
  # Containers (all share same database)
  secret-management:
    build: ./containers/secret-management
    depends_on: [postgres]
    environment:
      - DATABASE_URL=postgresql://coder:${DB_PASSWORD}@postgres:5432/coder_ide
  
  notification-manager:
    build: ./containers/notification-manager
    depends_on: [postgres, rabbitmq, secret-management]
    environment:
      - DATABASE_URL=postgresql://coder:${DB_PASSWORD}@postgres:5432/coder_ide
      - RABBITMQ_URL=amqp://rabbitmq:5672
      - SECRET_SERVICE_URL=http://secret-management:3000
  
  ai-service:
    build: ./containers/ai-service
    depends_on: [postgres, rabbitmq, secret-management]
    environment:
      - DATABASE_URL=postgresql://coder:${DB_PASSWORD}@postgres:5432/coder_ide
      - RABBITMQ_URL=amqp://rabbitmq:5672
      - SECRET_SERVICE_URL=http://secret-management:3000
  
  mcp-server:
    build: ./containers/mcp-server
    depends_on: [postgres, rabbitmq, secret-management, ai-service]
    environment:
      - DATABASE_URL=postgresql://coder:${DB_PASSWORD}@postgres:5432/coder_ide
      - RABBITMQ_URL=amqp://rabbitmq:5672
      - SECRET_SERVICE_URL=http://secret-management:3000
      - AI_SERVICE_URL=http://ai-service:3000
  
  knowledge-base:
    build: ./containers/knowledge-base
    depends_on: [postgres, rabbitmq, secret-management, ai-service, mcp-server]
    environment:
      - DATABASE_URL=postgresql://coder:${DB_PASSWORD}@postgres:5432/coder_ide
      - RABBITMQ_URL=amqp://rabbitmq:5672
      - SECRET_SERVICE_URL=http://secret-management:3000
      - AI_SERVICE_URL=http://ai-service:3000
      - MCP_SERVICE_URL=http://mcp-server:3000
  
  planning:
    build: ./containers/planning
    depends_on: [postgres, rabbitmq, secret-management, ai-service, embeddings, prompt-management, mcp-server, knowledge-base]
    environment:
      - DATABASE_URL=postgresql://coder:${DB_PASSWORD}@postgres:5432/coder_ide
      - RABBITMQ_URL=amqp://rabbitmq:5672
      - SECRET_SERVICE_URL=http://secret-management:3000
      - AI_SERVICE_URL=http://ai-service:3000
      - EMBEDDINGS_SERVICE_URL=http://embeddings:3000
      - PROMPT_SERVICE_URL=http://prompt-management:3000
      - MCP_SERVICE_URL=http://mcp-server:3000
      - KNOWLEDGE_SERVICE_URL=http://knowledge-base:3000
  
  embeddings:
    build: ./containers/embeddings
    depends_on: [postgres, rabbitmq, secret-management, ai-service]
    environment:
      - DATABASE_URL=postgresql://coder:${DB_PASSWORD}@postgres:5432/coder_ide
      - RABBITMQ_URL=amqp://rabbitmq:5672
      - SECRET_SERVICE_URL=http://secret-management:3000
      - AI_SERVICE_URL=http://ai-service:3000
  
  prompt-management:
    build: ./containers/prompt-management
    depends_on: [postgres, rabbitmq, secret-management]
    environment:
      - DATABASE_URL=postgresql://coder:${DB_PASSWORD}@postgres:5432/coder_ide
      - RABBITMQ_URL=amqp://rabbitmq:5672
      - SECRET_SERVICE_URL=http://secret-management:3000
      - USAGE_SERVICE_URL=http://usage-tracking:3000
  
  usage-tracking:
    build: ./containers/usage-tracking
    depends_on: [postgres, rabbitmq, notification-manager]
    environment:
      - DATABASE_URL=postgresql://coder:${DB_PASSWORD}@postgres:5432/coder_ide
      - RABBITMQ_URL=amqp://rabbitmq:5672
      - NOTIFICATION_SERVICE_URL=http://notification-manager:3000
  
  main-app:
    build: ./main-app
    depends_on: [postgres, rabbitmq, redis, secret-management, notification-manager, ai-service, embeddings, prompt-management, usage-tracking, mcp-server, knowledge-base, planning]
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://coder:${DB_PASSWORD}@postgres:5432/coder_ide
      - RABBITMQ_URL=amqp://rabbitmq:5672
      - REDIS_URL=redis://redis:6379
      - SECRET_SERVICE_URL=http://secret-management:3000
      - NOTIFICATION_SERVICE_URL=http://notification-manager:3000
      - AI_SERVICE_URL=http://ai-service:3000
      - EMBEDDINGS_SERVICE_URL=http://embeddings:3000
      - PROMPT_SERVICE_URL=http://prompt-management:3000
      - USAGE_SERVICE_URL=http://usage-tracking:3000
      - MCP_SERVICE_URL=http://mcp-server:3000
      - KNOWLEDGE_SERVICE_URL=http://knowledge-base:3000
      - PLANNING_SERVICE_URL=http://planning:3000

volumes:
  postgres_data:
```

---

## Key Principles

1. **Shared Database**: Single PostgreSQL database with prefixed tables per module
2. **Event-Driven**: Use RabbitMQ for async communication (notifications, status updates)
3. **REST API**: Synchronous requests for CRUD operations and queries
4. **Secret Management**: All containers retrieve credentials from Secret Management module
5. **Main App as Gateway**: Client communicates only with Main Application
6. **Single Responsibility**: Each container handles one domain
7. **Loose Coupling**: Containers communicate via well-defined APIs and events
8. **Data Integrity**: Foreign keys across modules for referential integrity
