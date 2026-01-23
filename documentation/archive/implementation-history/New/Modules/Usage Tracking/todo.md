# Usage Tracking Module Todo List

## Architecture

- **Type**: Container (Docker)
- **Database**: Shared PostgreSQL (`coder_ide`) with `usage_` table prefix
- **Communication**: RabbitMQ (consumer - listens to all events) + REST API
- **Real-Time**: Redis counters for instant quota checks

## Key Design Principles

- **Flexibility**: Track any type of usage, not just AI (storage, compute, API calls, collaboration)
- **Extensibility**: Configurable usage categories (not hardcoded enums)
- **Multi-Dimensional**: Track with custom dimensions for rich analytics
- **Multi-Scope**: Track per organization, team, project, and user

## Dependencies

- Notification Manager (sends budget/quota alerts)
- All other modules publish events to this module via RabbitMQ

---

## Specification

- [x] Create Usage Tracking Module specification (flexible approach)

## Implementation

### Phase 1: Core Infrastructure (Weeks 1-2)
- [ ] Database schema and migrations (`usage_*` tables)
- [ ] Category management (CRUD, seeding defaults)
- [ ] Generic event consumer (RabbitMQ)
- [ ] Event normalizer (map module events to usage events)
- [ ] Usage recorder service
- [ ] Real-time counters (Redis)

### Phase 2: Cost & Pricing (Week 3)
- [ ] Pricing rules CRUD
- [ ] Cost calculator
  - [ ] PER_UNIT pricing
  - [ ] PER_THOUSAND pricing
  - [ ] PER_MILLION pricing
  - [ ] PER_MINUTE pricing
  - [ ] TIERED pricing
  - [ ] FLAT pricing
- [ ] Per-organization pricing overrides

### Phase 3: Quotas & Budgets (Week 4)
- [ ] Quota configuration CRUD
- [ ] Wildcard category support (`ai.*`, `storage.*`)
- [ ] Quota enforcement (pre-check API)
- [ ] Budget management CRUD
- [ ] Alert system (warnings, exceeded)

### Phase 4: Aggregation & Analytics (Week 5)
- [ ] Hourly aggregation (cron job)
- [ ] Daily/monthly rollups
- [ ] Flexible query builder API
- [ ] Analytics endpoints
- [ ] Export functionality (CSV, JSON, XLSX)

### Phase 5: UI (Week 6)
- [ ] Dashboard UI (charts, breakdowns)
- [ ] Category management UI
- [ ] Quota management UI
- [ ] Budget management UI
- [ ] Pricing configuration UI
- [ ] Reports & export UI

## Default Categories to Implement

- [ ] AI categories (`ai.completion`, `ai.embedding`, `ai.vision`)
- [ ] Storage categories (`storage.project`, `storage.knowledge`)
- [ ] Compute categories (`compute.build`, `compute.agent`)
- [ ] MCP categories (`mcp.execution`)
- [ ] API categories (`api.github`, `api.azure`)
- [ ] Collaboration categories (`collab.active_users`)
- [ ] Search categories (`search.code`, `search.semantic`)

## Default Pricing to Configure

- [ ] OpenAI model pricing
- [ ] Anthropic model pricing
- [ ] Embedding model pricing
- [ ] Storage pricing (per GB-month)
- [ ] Compute pricing (per minute)

## Integration

- [ ] Consume events from all modules via RabbitMQ
- [ ] Integrate with Notification Manager for alerts
- [ ] Provide pre-check API for AI Service (quota enforcement)
- [ ] Provide usage data API for billing integrations

## Testing

- [ ] Unit tests for cost calculator (all pricing models)
- [ ] Unit tests for quota enforcer (wildcard support)
- [ ] Unit tests for aggregation engine
- [ ] Unit tests for query builder
- [ ] Integration tests for event consumers
- [ ] Load tests for high-volume events
- [ ] Performance tests for real-time counters
