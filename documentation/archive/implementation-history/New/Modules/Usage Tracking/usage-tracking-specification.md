# Usage Tracking Module Specification

**Version:** 1.1.0  
**Last Updated:** 2026-01-20  
**Status:** Draft  
**Module Category:** Platform Services (Cross-Cutting)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Data Models](#3-data-models)
4. [Usage Categories](#4-usage-categories)
5. [Core Features](#5-core-features)
6. [API Endpoints](#6-api-endpoints)
7. [Configuration](#7-configuration)
8. [UI Views](#8-ui-views)
9. [Implementation Guidelines](#9-implementation-guidelines)

---

## 1. Overview

### 1.1 Purpose

The Usage Tracking Module provides **centralized, flexible usage metering, cost tracking, and quota management** for Coder IDE. It tracks resource consumption across all modules and provides analytics, billing data, and budget controls.

### 1.2 Key Design Principles

- **Flexibility**: Track any type of usage, not just AI - storage, compute, API calls, collaboration, etc.
- **Extensibility**: Configurable usage categories (not hardcoded enums)
- **Multi-Dimensional**: Track usage with custom dimensions for rich analytics
- **Multi-Scope**: Track per organization, team, project, and user
- **Real-Time**: Redis counters for instant quota checks

### 1.3 Key Responsibilities

- **Usage Metering**: Track any measurable activity with flexible metrics
- **Cost Calculation**: Calculate costs based on configurable pricing models
- **Quota Management**: Enforce usage limits on any category/metric
- **Budget Alerts**: Notify when approaching or exceeding limits
- **Analytics**: Usage trends, breakdowns, custom reports
- **Billing Integration**: Export data for billing systems

### 1.4 What Gets Tracked

| Category | Subcategories | Unit | Description |
|----------|---------------|------|-------------|
| **AI** | `ai.completion`, `ai.embedding`, `ai.vision` | Tokens | LLM operations |
| **Compute** | `compute.build`, `compute.preview`, `compute.agent` | Minutes | Background jobs, builds |
| **Storage** | `storage.project`, `storage.knowledge`, `storage.artifacts` | Bytes | File storage |
| **API Calls** | `api.github`, `api.azure`, `api.external` | Requests | External API usage |
| **Bandwidth** | `bandwidth.upload`, `bandwidth.download` | Bytes | Data transfer |
| **Collaboration** | `collab.active_users`, `collab.guests` | Users | Active seats |
| **MCP Tools** | `mcp.execution`, `mcp.custom` | Executions | Tool runs |
| **Search** | `search.code`, `search.semantic` | Queries | Search operations |
| **Git** | `git.commits`, `git.pr_analysis` | Operations | Version control |

### 1.5 Consumer Modules

All modules emit usage events to this service:

- **AI Service** → Token usage events
- **Embeddings Module** → Embedding usage events
- **MCP Server** → Tool execution events
- **Knowledge Base** → Storage events
- **Planning** → Plan generation events
- **Build Service** → Compute time events
- **Any future module** → Custom events

---

## 2. Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              ALL MODULES (Event Producers)                               │
│   AI Service │ Embeddings │ MCP Server │ Knowledge Base │ Build Service │ etc.         │
└─────────────────────────────────────────┬───────────────────────────────────────────────┘
                                          │ RabbitMQ Events
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                             USAGE TRACKING MODULE                                        │
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                          Event Consumer                                          │   │
│  │  • Consume events from RabbitMQ   • Validate & normalize   • Update Redis       │   │
│  └─────────────────────────────────────┬───────────────────────────────────────────┘   │
│                                        │                                                │
│  ┌─────────────────┬───────────────────┼───────────────────┬─────────────────────────┐ │
│  │                 │                   │                   │                         │ │
│  ▼                 ▼                   ▼                   ▼                         ▼ │
│ ┌──────────┐  ┌──────────┐    ┌────────────┐    ┌───────────┐    ┌────────────────┐  │
│ │ Usage    │  │  Cost    │    │   Quota    │    │  Budget   │    │   Analytics    │  │
│ │ Recorder │  │Calculator│    │  Enforcer  │    │  Alerter  │    │    Engine      │  │
│ └──────────┘  └──────────┘    └────────────┘    └───────────┘    └────────────────┘  │
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                       Aggregation Engine                                         │   │
│  │  • Real-time (Redis)   • Hourly rollups   • Daily/Monthly rollups               │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
          │               │                                         │
          ▼               ▼                                         ▼
   ┌───────────┐   ┌───────────────┐                      ┌───────────────────┐
   │   Redis   │   │  PostgreSQL   │                      │   Notification    │
   │ (Counters)│   │    (usage)    │                      │     Manager       │
   └───────────┘   └───────────────┘                      └───────────────────┘
```

### 2.2 Module Location

```
containers/
└── usage-tracking/
    ├── src/
    │   ├── index.ts                    # Entry point
    │   ├── server.ts                   # Fastify server
    │   │
    │   ├── routes/
    │   │   ├── usage.ts                # Usage queries
    │   │   ├── categories.ts           # Category management
    │   │   ├── quotas.ts               # Quota management
    │   │   ├── budgets.ts              # Budget management
    │   │   ├── pricing.ts              # Pricing configuration
    │   │   ├── analytics.ts            # Analytics & reports
    │   │   └── export.ts               # Data export
    │   │
    │   ├── services/
    │   │   ├── UsageRecorder.ts        # Record raw usage
    │   │   ├── CostCalculator.ts       # Calculate costs
    │   │   ├── QuotaEnforcer.ts        # Check & enforce quotas
    │   │   ├── BudgetAlerter.ts        # Budget monitoring
    │   │   ├── AggregationEngine.ts    # Time-based rollups
    │   │   ├── RealTimeCounter.ts      # Redis counters
    │   │   ├── QueryBuilder.ts         # Flexible query engine
    │   │   └── AnalyticsService.ts     # Reports & insights
    │   │
    │   ├── consumers/
    │   │   ├── GenericUsageConsumer.ts # Handles all event types
    │   │   └── EventNormalizer.ts      # Normalize events to standard format
    │   │
    │   └── types/
    │       ├── usage.types.ts
    │       ├── category.types.ts
    │       └── quota.types.ts
    │
    ├── prisma/
    │   └── schema.prisma
    │
    ├── Dockerfile
    └── package.json
```

---

## 3. Data Models

### 3.1 Database Architecture

> **Shared Database**: All Usage Tracking tables reside in the shared PostgreSQL database (`coder_ide`). Tables are prefixed with `usage_`.

### 3.2 Table Mapping

| Prisma Model | Database Table | Description |
|--------------|----------------|-------------|
| `UsageCategory` | `usage_categories` | Configurable usage categories |
| `UsageEvent` | `usage_events` | Raw usage events (flexible) |
| `UsageAggregate` | `usage_aggregates` | Time-based aggregations |
| `UsageQuota` | `usage_quotas` | Quota configurations |
| `UsageBudget` | `usage_budgets` | Budget settings |
| `UsageAlert` | `usage_alerts` | Alert history |
| `UsagePricing` | `usage_pricing` | Pricing rules |

### 3.3 Database Schema

```prisma
// ============================================================
// USAGE CATEGORIES (Configurable, not hardcoded)
// ============================================================

model UsageCategory {
  @@map("usage_categories")
  
  id                    String                @id @default(uuid())
  
  // Identification
  code                  String                @unique  // ai.completion, storage.upload, etc.
  name                  String
  description           String?
  icon                  String?               // Icon name for UI
  
  // Hierarchy (for grouping: ai.* -> ai.completion, ai.embedding)
  parentCode            String?               // Parent category code
  
  // Metrics definition (what can be tracked)
  metrics               Json                  // { "tokens": "number", "requests": "number", "bytes": "number" }
  primaryMetric         String                // Main metric for display (e.g., "tokens")
  
  // Pricing model
  pricingModel          PricingModel          @default(NONE)
  defaultUnitType       String?               // tokens, bytes, requests, minutes, etc.
  
  // Display
  displayOrder          Int                   @default(0)
  color                 String?               // Hex color for charts
  
  // Status
  isActive              Boolean               @default(true)
  isSystem              Boolean               @default(false)  // System categories can't be deleted
  
  // Timestamps
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  
  // Relations
  pricing               UsagePricing[]
  quotas                UsageQuota[]
  
  @@index([parentCode])
  @@index([isActive])
}

enum PricingModel {
  NONE                  // Free, no cost tracking
  PER_UNIT              // Cost per unit (token, byte, request)
  PER_THOUSAND          // Cost per 1K units
  PER_MILLION           // Cost per 1M units
  PER_MINUTE            // Time-based (compute minutes)
  TIERED                // Volume-based tiers
  FLAT                  // Flat rate per period
}

// ============================================================
// RAW USAGE EVENTS (Flexible structure)
// ============================================================

model UsageEvent {
  @@map("usage_events")
  
  id                    String                @id @default(uuid())
  
  // Context (who/where)
  organizationId        String
  organization          Organization          @relation(fields: [organizationId], references: [id])
  userId                String
  user                  User                  @relation(fields: [userId], references: [id])
  projectId             String?
  project               Project?              @relation(fields: [projectId], references: [id])
  teamId                String?
  team                  Team?                 @relation(fields: [teamId], references: [id])
  
  // What (flexible category)
  categoryCode          String                // e.g., "ai.completion", "storage.upload"
  
  // Source
  sourceModule          String                // ai-service, embeddings, mcp-server, etc.
  sourceResourceId      String?               // Specific resource ID
  sourceAction          String?               // create, read, update, delete, execute, etc.
  
  // Metrics (flexible JSONB)
  metrics               Json                  // { "inputTokens": 1500, "outputTokens": 500, "durationMs": 234 }
  
  // Dimensions for filtering/grouping (flexible JSONB)
  dimensions            Json?                 // { "model": "gpt-4o", "provider": "openai", "region": "us-east" }
  
  // Calculated cost (in cents)
  costCents             Int                   @default(0)
  
  // Metadata
  metadata              Json?                 // Any additional context
  
  // Timestamp
  occurredAt            DateTime              @default(now())
  
  // Partition-friendly indexes
  @@index([organizationId, occurredAt])
  @@index([userId, occurredAt])
  @@index([categoryCode, occurredAt])
  @@index([projectId, occurredAt])
  @@index([occurredAt])
}

// ============================================================
// USAGE AGGREGATES (Flexible time-based rollups)
// ============================================================

model UsageAggregate {
  @@map("usage_aggregates")
  
  id                    String                @id @default(uuid())
  
  // Time bucket
  periodStart           DateTime
  granularity           AggregateGranularity
  
  // Scope (all nullable for flexibility)
  organizationId        String?
  organization          Organization?         @relation(fields: [organizationId], references: [id])
  userId                String?
  user                  User?                 @relation(fields: [userId], references: [id])
  projectId             String?
  teamId                String?
  
  // Category
  categoryCode          String
  
  // Dimension drill-down (optional)
  dimensionKey          String?               // e.g., "model", "provider", "region"
  dimensionValue        String?               // e.g., "gpt-4o", "openai", "us-east"
  
  // Aggregated metrics (flexible JSONB)
  metrics               Json                  // { "inputTokens": 1500000, "outputTokens": 500000, "requests": 5000 }
  
  // Counts
  eventCount            Int                   @default(0)
  
  // Cost
  totalCostCents        Int                   @default(0)
  
  // Timestamps
  createdAt             DateTime              @default(now())
  
  @@unique([periodStart, granularity, organizationId, userId, projectId, teamId, categoryCode, dimensionKey, dimensionValue])
  @@index([periodStart, granularity])
  @@index([organizationId, periodStart])
  @@index([categoryCode, periodStart])
}

enum AggregateGranularity {
  HOURLY
  DAILY
  WEEKLY
  MONTHLY
}

// ============================================================
// QUOTAS (Flexible limits on any category/metric)
// ============================================================

model UsageQuota {
  @@map("usage_quotas")
  
  id                    String                @id @default(uuid())
  
  // Name & description
  name                  String
  description           String?
  
  // Scope
  scope                 QuotaScope
  organizationId        String?
  organization          Organization?         @relation(fields: [organizationId], references: [id])
  userId                String?
  user                  User?                 @relation(fields: [userId], references: [id])
  teamId                String?
  team                  Team?                 @relation(fields: [teamId], references: [id])
  projectId             String?
  project               Project?              @relation(fields: [projectId], references: [id])
  
  // What to limit (flexible)
  categoryCode          String                // "ai.completion", "storage.*", "ai.*" (wildcards supported)
  category              UsageCategory?        @relation(fields: [categoryCode], references: [code])
  metricKey             String                // "tokens", "inputTokens", "bytes", "requests", "cost"
  
  // Dimension filter (optional)
  dimensionFilters      Json?                 // { "model": "gpt-4o" } - only limit specific dimensions
  
  // Limit
  period                QuotaPeriod
  limitValue            BigInt                // The quota limit
  
  // Thresholds for warnings
  warnThreshold         Int                   @default(80)   // 80% - warning
  criticalThreshold     Int                   @default(95)   // 95% - critical warning
  
  // Enforcement
  action                QuotaAction           @default(WARN)
  
  // Status
  isActive              Boolean               @default(true)
  
  // Timestamps
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  
  @@index([scope, organizationId, isActive])
  @@index([categoryCode])
}

enum QuotaScope {
  GLOBAL                // Platform-wide default
  ORGANIZATION          // Organization limit
  TEAM                  // Team limit
  PROJECT               // Project limit
  USER                  // User limit
}

enum QuotaPeriod {
  HOURLY
  DAILY
  WEEKLY
  MONTHLY
  YEARLY
}

enum QuotaAction {
  WARN                  // Just alert, don't block
  SOFT_LIMIT            // Warn + rate limit (slow down)
  HARD_LIMIT            // Block requests
}

// ============================================================
// BUDGETS (Cost-based limits)
// ============================================================

model UsageBudget {
  @@map("usage_budgets")
  
  id                    String                @id @default(uuid())
  
  // Identification
  name                  String
  description           String?
  
  // Scope
  scope                 BudgetScope
  organizationId        String?
  organization          Organization?         @relation(fields: [organizationId], references: [id])
  teamId                String?
  team                  Team?                 @relation(fields: [teamId], references: [id])
  projectId             String?
  project               Project?              @relation(fields: [projectId], references: [id])
  
  // Category filter (optional - null = all categories)
  categoryCode          String?               // "ai.*", "storage.*", or null for all
  
  // Budget
  period                BudgetPeriod
  amountCents           Int                   // Budget in cents
  
  // Thresholds for alerts (percentage)
  warnThreshold         Int                   @default(80)   // 80%
  criticalThreshold     Int                   @default(100)  // 100%
  
  // Current usage (denormalized for quick access)
  currentUsageCents     Int                   @default(0)
  
  // Enforcement
  action                BudgetAction          @default(WARN)
  
  // Status
  isActive              Boolean               @default(true)
  
  // Period tracking
  periodStartDate       DateTime              @default(now())
  
  // Timestamps
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  
  // Relations
  alerts                UsageAlert[]
  
  @@index([organizationId, isActive])
  @@index([scope, isActive])
}

enum BudgetScope {
  ORGANIZATION
  TEAM
  PROJECT
}

enum BudgetPeriod {
  MONTHLY
  QUARTERLY
  YEARLY
}

enum BudgetAction {
  WARN                  // Alert only
  SOFT_LIMIT            // Alert + slow down
  HARD_LIMIT            // Block when exceeded
}

// ============================================================
// ALERTS
// ============================================================

model UsageAlert {
  @@map("usage_alerts")
  
  id                    String                @id @default(uuid())
  
  // Context
  organizationId        String
  organization          Organization          @relation(fields: [organizationId], references: [id])
  
  // Alert type
  alertType             AlertType
  severity              AlertSeverity
  
  // Related entities
  budgetId              String?
  budget                UsageBudget?          @relation(fields: [budgetId], references: [id])
  quotaId               String?
  quota                 UsageQuota?           @relation(fields: [quotaId], references: [id])
  
  // Category (for context)
  categoryCode          String?
  
  // Details
  title                 String
  message               String
  
  // Metrics at time of alert
  currentValue          BigInt
  thresholdValue        BigInt
  percentage            Int?
  
  // Status
  status                AlertStatus           @default(ACTIVE)
  acknowledgedAt        DateTime?
  acknowledgedBy        String?
  resolvedAt            DateTime?
  
  // Timestamps
  createdAt             DateTime              @default(now())
  
  @@index([organizationId, status, createdAt])
  @@index([alertType, createdAt])
}

enum AlertType {
  BUDGET_WARNING        // Approaching budget
  BUDGET_EXCEEDED       // Exceeded budget
  QUOTA_WARNING         // Approaching quota
  QUOTA_EXCEEDED        // Exceeded quota
  ANOMALY               // Unusual usage pattern
  SPIKE                 // Sudden usage spike
}

enum AlertSeverity {
  INFO
  WARNING
  CRITICAL
}

enum AlertStatus {
  ACTIVE
  ACKNOWLEDGED
  RESOLVED
}

// ============================================================
// PRICING CONFIGURATION (Flexible, per-org overrides)
// ============================================================

model UsagePricing {
  @@map("usage_pricing")
  
  id                    String                @id @default(uuid())
  
  // Scope (null = global default)
  organizationId        String?               // Org-specific pricing override
  organization          Organization?         @relation(fields: [organizationId], references: [id])
  
  // Category
  categoryCode          String
  category              UsageCategory         @relation(fields: [categoryCode], references: [code])
  
  // Dimension filter (e.g., specific model pricing)
  dimensionKey          String?               // "model", "provider", "tier"
  dimensionValue        String?               // "gpt-4o", "anthropic", "premium"
  
  // Pricing model
  pricingModel          PricingModel
  
  // Pricing values
  unitPrice             Int                   // In cents
  unitMultiplier        Int                   @default(1)    // 1 = per unit, 1000 = per 1K, 1000000 = per 1M
  
  // Tiered pricing (for TIERED model)
  tiers                 Json?                 // [{ "upTo": 1000000, "price": 100 }, { "upTo": null, "price": 50 }]
  
  // Flat rate (for FLAT model)
  flatRatePeriod        BudgetPeriod?
  
  // Validity period
  effectiveFrom         DateTime              @default(now())
  effectiveTo           DateTime?
  isActive              Boolean               @default(true)
  
  // Timestamps
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  
  @@unique([organizationId, categoryCode, dimensionKey, dimensionValue, effectiveFrom])
  @@index([categoryCode, isActive])
  @@index([organizationId, isActive])
}
```

---

## 4. Usage Categories

### 4.1 Default System Categories

```typescript
const defaultCategories = [
  // AI Categories
  {
    code: 'ai',
    name: 'AI Services',
    isSystem: true,
    metrics: { requests: 'number', totalTokens: 'number', cost: 'number' },
    primaryMetric: 'totalTokens',
    pricingModel: 'PER_MILLION'
  },
  {
    code: 'ai.completion',
    name: 'AI Completions',
    parentCode: 'ai',
    isSystem: true,
    metrics: { inputTokens: 'number', outputTokens: 'number', requests: 'number', durationMs: 'number' },
    primaryMetric: 'totalTokens',
    pricingModel: 'PER_MILLION'
  },
  {
    code: 'ai.embedding',
    name: 'Embeddings',
    parentCode: 'ai',
    isSystem: true,
    metrics: { tokens: 'number', vectors: 'number', requests: 'number' },
    primaryMetric: 'tokens',
    pricingModel: 'PER_MILLION'
  },
  
  // Storage Categories
  {
    code: 'storage',
    name: 'Storage',
    isSystem: true,
    metrics: { bytes: 'number', files: 'number' },
    primaryMetric: 'bytes',
    pricingModel: 'PER_UNIT',  // Per GB-month
    defaultUnitType: 'bytes'
  },
  {
    code: 'storage.project',
    name: 'Project Storage',
    parentCode: 'storage',
    isSystem: true,
    metrics: { bytes: 'number', files: 'number' },
    primaryMetric: 'bytes'
  },
  {
    code: 'storage.knowledge',
    name: 'Knowledge Base Storage',
    parentCode: 'storage',
    isSystem: true,
    metrics: { bytes: 'number', documents: 'number' },
    primaryMetric: 'bytes'
  },
  
  // Compute Categories
  {
    code: 'compute',
    name: 'Compute',
    isSystem: true,
    metrics: { minutes: 'number', jobs: 'number' },
    primaryMetric: 'minutes',
    pricingModel: 'PER_MINUTE'
  },
  {
    code: 'compute.build',
    name: 'Build Minutes',
    parentCode: 'compute',
    isSystem: true,
    metrics: { minutes: 'number', jobs: 'number' },
    primaryMetric: 'minutes'
  },
  {
    code: 'compute.agent',
    name: 'Agent Compute',
    parentCode: 'compute',
    isSystem: true,
    metrics: { minutes: 'number', executions: 'number' },
    primaryMetric: 'minutes'
  },
  
  // MCP Categories
  {
    code: 'mcp',
    name: 'MCP Tools',
    isSystem: true,
    metrics: { executions: 'number', durationMs: 'number' },
    primaryMetric: 'executions',
    pricingModel: 'PER_UNIT'
  },
  {
    code: 'mcp.execution',
    name: 'Tool Executions',
    parentCode: 'mcp',
    isSystem: true,
    metrics: { executions: 'number', durationMs: 'number', errors: 'number' },
    primaryMetric: 'executions'
  },
  
  // API Categories
  {
    code: 'api',
    name: 'External APIs',
    isSystem: true,
    metrics: { requests: 'number', errors: 'number' },
    primaryMetric: 'requests',
    pricingModel: 'NONE'
  },
  {
    code: 'api.github',
    name: 'GitHub API',
    parentCode: 'api',
    isSystem: true,
    metrics: { requests: 'number' },
    primaryMetric: 'requests'
  },
  {
    code: 'api.azure',
    name: 'Azure API',
    parentCode: 'api',
    isSystem: true,
    metrics: { requests: 'number' },
    primaryMetric: 'requests'
  },
  
  // Collaboration
  {
    code: 'collab',
    name: 'Collaboration',
    isSystem: true,
    metrics: { activeUsers: 'number', guests: 'number' },
    primaryMetric: 'activeUsers',
    pricingModel: 'FLAT'
  },
  
  // Search
  {
    code: 'search',
    name: 'Search',
    isSystem: true,
    metrics: { queries: 'number', results: 'number' },
    primaryMetric: 'queries',
    pricingModel: 'NONE'
  },
  {
    code: 'search.code',
    name: 'Code Search',
    parentCode: 'search',
    isSystem: true,
    metrics: { queries: 'number' },
    primaryMetric: 'queries'
  },
  {
    code: 'search.semantic',
    name: 'Semantic Search',
    parentCode: 'search',
    isSystem: true,
    metrics: { queries: 'number', vectorOps: 'number' },
    primaryMetric: 'queries'
  }
];
```

### 4.2 Category Hierarchy

```
├── ai
│   ├── ai.completion
│   ├── ai.embedding
│   └── ai.vision
├── storage
│   ├── storage.project
│   ├── storage.knowledge
│   └── storage.artifacts
├── compute
│   ├── compute.build
│   ├── compute.preview
│   └── compute.agent
├── mcp
│   ├── mcp.execution
│   └── mcp.custom
├── api
│   ├── api.github
│   ├── api.azure
│   └── api.external
├── collab
│   ├── collab.active_users
│   └── collab.guests
└── search
    ├── search.code
    └── search.semantic
```

---

## 5. Core Features

### 5.1 Generic Event Consumer

```typescript
interface UsageEventPayload {
  // Context (who/where)
  organizationId: string;
  userId: string;
  projectId?: string;
  teamId?: string;
  
  // What (flexible category)
  categoryCode: string;           // "ai.completion", "storage.upload", etc.
  
  // Source
  sourceModule: string;           // ai-service, embeddings, mcp-server
  sourceResourceId?: string;
  sourceAction?: string;          // create, read, execute, etc.
  
  // Metrics (flexible)
  metrics: Record<string, number>;  // { inputTokens: 1500, outputTokens: 500, durationMs: 234 }
  
  // Dimensions for analysis
  dimensions?: Record<string, string>;  // { model: "gpt-4o", provider: "openai" }
  
  // Metadata
  metadata?: Record<string, any>;
  
  // Timing
  occurredAt?: Date;
}

class GenericUsageConsumer {
  constructor(
    private usageRecorder: UsageRecorder,
    private costCalculator: CostCalculator,
    private realTimeCounter: RealTimeCounter,
    private quotaEnforcer: QuotaEnforcer
  ) {}
  
  /**
   * Handle any usage event from any module
   */
  async handleEvent(event: UsageEventPayload): Promise<void> {
    // Validate category exists
    const category = await this.getCategory(event.categoryCode);
    if (!category || !category.isActive) {
      console.warn(`Unknown or inactive category: ${event.categoryCode}`);
      return;
    }
    
    // Calculate cost
    const costCents = await this.costCalculator.calculate(event);
    
    // Record to database
    await this.usageRecorder.record({
      ...event,
      costCents,
      occurredAt: event.occurredAt || new Date()
    });
    
    // Update real-time counters (Redis)
    await this.realTimeCounter.increment(event, costCents);
    
    // Check quotas (async, don't block)
    this.quotaEnforcer.checkQuotas(event).catch(console.error);
  }
}
```

### 5.2 Real-Time Counter (Redis)

```typescript
class RealTimeCounter {
  /**
   * Redis key structure:
   * usage:{scope}:{scopeId}:{categoryCode}:{metricKey}:{period}
   * 
   * Examples:
   * usage:org:org-123:ai.completion:totalTokens:2026-01
   * usage:user:user-456:ai.completion:totalTokens:2026-01-20
   * usage:org:org-123:cost:2026-01
   */
  
  async increment(event: UsageEventPayload, costCents: number): Promise<void> {
    const monthPeriod = this.getMonthKey(event.occurredAt || new Date());
    const dayPeriod = this.getDayKey(event.occurredAt || new Date());
    
    const pipeline = this.redis.pipeline();
    
    // For each metric in the event
    for (const [metricKey, value] of Object.entries(event.metrics)) {
      // Organization level (monthly)
      pipeline.incrby(
        `usage:org:${event.organizationId}:${event.categoryCode}:${metricKey}:${monthPeriod}`,
        value
      );
      pipeline.expire(
        `usage:org:${event.organizationId}:${event.categoryCode}:${metricKey}:${monthPeriod}`,
        60 * 60 * 24 * 35  // 35 days TTL
      );
      
      // User level (daily)
      pipeline.incrby(
        `usage:user:${event.userId}:${event.categoryCode}:${metricKey}:${dayPeriod}`,
        value
      );
      pipeline.expire(
        `usage:user:${event.userId}:${event.categoryCode}:${metricKey}:${dayPeriod}`,
        60 * 60 * 24 * 2  // 2 days TTL
      );
    }
    
    // Cost counters
    if (costCents > 0) {
      pipeline.incrby(`usage:org:${event.organizationId}:cost:${monthPeriod}`, costCents);
      pipeline.incrby(`usage:user:${event.userId}:cost:${monthPeriod}`, costCents);
    }
    
    // Category wildcard counters (for ai.* quotas)
    const parentCategory = event.categoryCode.split('.')[0];
    if (parentCategory !== event.categoryCode) {
      for (const [metricKey, value] of Object.entries(event.metrics)) {
        pipeline.incrby(
          `usage:org:${event.organizationId}:${parentCategory}.*:${metricKey}:${monthPeriod}`,
          value
        );
      }
    }
    
    await pipeline.exec();
  }
  
  async getCurrentUsage(
    scope: 'org' | 'user' | 'project' | 'team',
    scopeId: string,
    categoryCode: string,
    metricKey: string,
    period: string
  ): Promise<number> {
    const key = `usage:${scope}:${scopeId}:${categoryCode}:${metricKey}:${period}`;
    const value = await this.redis.get(key);
    return parseInt(value || '0');
  }
  
  private getMonthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  
  private getDayKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}
```

### 5.3 Cost Calculator

```typescript
class CostCalculator {
  /**
   * Calculate cost for a usage event based on pricing rules
   */
  async calculate(event: UsageEventPayload): Promise<number> {
    // Get pricing rule (most specific first)
    const pricing = await this.getPricing(
      event.categoryCode,
      event.organizationId,
      event.dimensions
    );
    
    if (!pricing) return 0;
    
    // Calculate based on pricing model
    switch (pricing.pricingModel) {
      case 'PER_UNIT':
        return this.calculatePerUnit(event.metrics, pricing);
      
      case 'PER_THOUSAND':
        return this.calculatePerThousand(event.metrics, pricing);
      
      case 'PER_MILLION':
        return this.calculatePerMillion(event.metrics, pricing);
      
      case 'PER_MINUTE':
        return this.calculatePerMinute(event.metrics, pricing);
      
      case 'TIERED':
        return this.calculateTiered(event.metrics, pricing);
      
      default:
        return 0;
    }
  }
  
  private async getPricing(
    categoryCode: string,
    organizationId: string,
    dimensions?: Record<string, string>
  ): Promise<UsagePricing | null> {
    // Try dimension-specific pricing first (e.g., gpt-4o pricing)
    if (dimensions) {
      for (const [key, value] of Object.entries(dimensions)) {
        const pricing = await prisma.usagePricing.findFirst({
          where: {
            categoryCode,
            dimensionKey: key,
            dimensionValue: value,
            isActive: true,
            effectiveFrom: { lte: new Date() },
            OR: [
              { organizationId },        // Org-specific
              { organizationId: null }   // Global default
            ],
            AND: [
              { OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] }
            ]
          },
          orderBy: [
            { organizationId: 'desc' },  // Org-specific takes priority
            { effectiveFrom: 'desc' }
          ]
        });
        
        if (pricing) return pricing;
      }
    }
    
    // Fall back to category-level pricing
    return prisma.usagePricing.findFirst({
      where: {
        categoryCode,
        dimensionKey: null,
        isActive: true,
        effectiveFrom: { lte: new Date() },
        OR: [
          { organizationId },
          { organizationId: null }
        ],
        AND: [
          { OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] }
        ]
      },
      orderBy: [
        { organizationId: 'desc' },
        { effectiveFrom: 'desc' }
      ]
    });
  }
  
  private calculatePerMillion(metrics: Record<string, number>, pricing: UsagePricing): number {
    // For AI tokens: sum inputTokens + outputTokens, or use totalTokens
    const totalUnits = metrics.inputTokens 
      ? (metrics.inputTokens + (metrics.outputTokens || 0))
      : (metrics.tokens || metrics.totalTokens || 0);
    
    return Math.ceil((totalUnits / 1_000_000) * pricing.unitPrice);
  }
  
  private calculateTiered(metrics: Record<string, number>, pricing: UsagePricing): number {
    const tiers = pricing.tiers as Array<{ upTo: number | null; price: number }>;
    const units = Object.values(metrics)[0] || 0;
    
    let remaining = units;
    let cost = 0;
    let prevLimit = 0;
    
    for (const tier of tiers) {
      const tierLimit = tier.upTo ?? Infinity;
      const tierUnits = Math.min(remaining, tierLimit - prevLimit);
      
      if (tierUnits <= 0) break;
      
      cost += tierUnits * tier.price;
      remaining -= tierUnits;
      prevLimit = tierLimit;
    }
    
    return Math.ceil(cost);
  }
}
```

### 5.4 Quota Enforcer

```typescript
class QuotaEnforcer {
  /**
   * Pre-check if a request would exceed quota
   * Called by AI Service before making LLM call
   */
  async preCheck(
    organizationId: string,
    userId: string,
    categoryCode: string,
    estimatedMetrics: Record<string, number>
  ): Promise<QuotaPreCheckResult> {
    // Get applicable quotas
    const quotas = await this.getApplicableQuotas(organizationId, userId, categoryCode);
    
    for (const quota of quotas) {
      const currentUsage = await this.getCurrentUsage(quota, organizationId, userId);
      const estimatedUsage = estimatedMetrics[quota.metricKey] || 0;
      const projectedUsage = currentUsage + estimatedUsage;
      
      if (projectedUsage > Number(quota.limitValue)) {
        if (quota.action === 'HARD_LIMIT') {
          return {
            allowed: false,
            reason: `Would exceed ${quota.name} quota`,
            quota: {
              name: quota.name,
              current: currentUsage,
              limit: Number(quota.limitValue),
              projected: projectedUsage
            }
          };
        }
      }
    }
    
    return { allowed: true };
  }
  
  /**
   * Check quotas after event (for alerts)
   */
  async checkQuotas(event: UsageEventPayload): Promise<void> {
    const quotas = await this.getApplicableQuotas(
      event.organizationId,
      event.userId,
      event.categoryCode
    );
    
    for (const quota of quotas) {
      const currentUsage = await this.getCurrentUsage(quota, event.organizationId, event.userId);
      const percentage = (currentUsage / Number(quota.limitValue)) * 100;
      
      if (percentage >= 100) {
        await this.createAlert(quota, currentUsage, 'QUOTA_EXCEEDED', 'CRITICAL');
      } else if (percentage >= quota.criticalThreshold) {
        await this.createAlert(quota, currentUsage, 'QUOTA_WARNING', 'WARNING');
      } else if (percentage >= quota.warnThreshold) {
        await this.createAlert(quota, currentUsage, 'QUOTA_WARNING', 'INFO');
      }
    }
  }
  
  private async getApplicableQuotas(
    organizationId: string,
    userId: string,
    categoryCode: string
  ): Promise<UsageQuota[]> {
    // Support wildcards: ai.completion matches quotas for "ai.completion", "ai.*", and "*"
    const categoryParts = categoryCode.split('.');
    const categoryPatterns = [
      categoryCode,                              // Exact match
      `${categoryParts[0]}.*`,                   // Parent wildcard
      '*'                                        // Global wildcard
    ];
    
    return prisma.usageQuota.findMany({
      where: {
        isActive: true,
        categoryCode: { in: categoryPatterns },
        OR: [
          { scope: 'GLOBAL' },
          { scope: 'ORGANIZATION', organizationId },
          { scope: 'USER', organizationId, userId }
        ]
      },
      orderBy: [
        { scope: 'asc' },  // More specific scopes first
        { categoryCode: 'asc' }  // More specific categories first
      ]
    });
  }
  
  private async getCurrentUsage(
    quota: UsageQuota,
    organizationId: string,
    userId: string
  ): Promise<number> {
    const period = this.getPeriodKey(quota.period);
    const scope = quota.scope === 'USER' ? 'user' : 'org';
    const scopeId = quota.scope === 'USER' ? userId : organizationId;
    
    return this.realTimeCounter.getCurrentUsage(
      scope,
      scopeId,
      quota.categoryCode,
      quota.metricKey,
      period
    );
  }
}
```

### 5.5 Flexible Query Builder

```typescript
interface UsageQueryRequest {
  // Time range
  startDate: Date;
  endDate: Date;
  granularity: 'hourly' | 'daily' | 'weekly' | 'monthly';
  
  // Scope filters
  organizationId?: string;
  userId?: string;
  projectId?: string;
  teamId?: string;
  
  // Category filters (supports wildcards)
  categoryCode?: string;           // "ai.*", "storage.project", "*"
  
  // Dimension filters
  dimensions?: Record<string, string>;  // { model: "gpt-4o" }
  
  // Aggregation
  groupBy?: string[];              // ["categoryCode", "userId", "dimensions.model"]
  metrics?: string[];              // ["inputTokens", "outputTokens", "cost"]
  
  // Sorting
  orderBy?: { field: string; direction: 'asc' | 'desc' };
  
  // Pagination
  limit?: number;
  offset?: number;
}

class QueryBuilder {
  async query(request: UsageQueryRequest): Promise<UsageQueryResponse> {
    // Build dynamic query based on request
    const granularity = this.mapGranularity(request.granularity);
    
    // Use aggregates for efficiency
    let query = prisma.usageAggregate.findMany({
      where: {
        periodStart: {
          gte: request.startDate,
          lt: request.endDate
        },
        granularity,
        ...(request.organizationId && { organizationId: request.organizationId }),
        ...(request.userId && { userId: request.userId }),
        ...(request.projectId && { projectId: request.projectId }),
        ...(request.teamId && { teamId: request.teamId }),
        ...(request.categoryCode && { 
          categoryCode: request.categoryCode.includes('*')
            ? { startsWith: request.categoryCode.replace('*', '') }
            : request.categoryCode
        })
      },
      orderBy: request.orderBy 
        ? { [request.orderBy.field]: request.orderBy.direction }
        : { periodStart: 'asc' },
      take: request.limit || 1000,
      skip: request.offset || 0
    });
    
    const results = await query;
    
    // Process results based on groupBy
    const grouped = this.groupResults(results, request.groupBy || []);
    
    // Calculate totals
    const totals = this.calculateTotals(results, request.metrics);
    
    return {
      data: grouped,
      totals,
      meta: {
        query: request,
        resultCount: results.length,
        executionTimeMs: 0  // Would be measured
      }
    };
  }
  
  private groupResults(results: any[], groupBy: string[]): any[] {
    if (groupBy.length === 0) {
      return results.map(r => ({
        periodStart: r.periodStart,
        metrics: r.metrics,
        eventCount: r.eventCount,
        totalCostCents: r.totalCostCents
      }));
    }
    
    // Group by specified fields
    const groups = new Map<string, any>();
    
    for (const result of results) {
      const key = groupBy.map(g => {
        if (g.startsWith('dimensions.')) {
          const dimKey = g.replace('dimensions.', '');
          return result.dimensionKey === dimKey ? result.dimensionValue : 'other';
        }
        return result[g];
      }).join('|');
      
      if (!groups.has(key)) {
        groups.set(key, {
          groupValues: Object.fromEntries(groupBy.map((g, i) => [g, key.split('|')[i]])),
          metrics: {},
          eventCount: 0,
          totalCostCents: 0
        });
      }
      
      const group = groups.get(key);
      group.eventCount += result.eventCount;
      group.totalCostCents += result.totalCostCents;
      
      // Merge metrics
      for (const [metricKey, value] of Object.entries(result.metrics as Record<string, number>)) {
        group.metrics[metricKey] = (group.metrics[metricKey] || 0) + value;
      }
    }
    
    return Array.from(groups.values());
  }
}
```

---

## 6. API Endpoints

### 6.1 Usage Query Endpoints

```typescript
// POST /api/usage/query
// Flexible usage query
interface UsageQueryRequest {
  startDate: string;               // ISO date
  endDate: string;                 // ISO date
  granularity: 'hourly' | 'daily' | 'weekly' | 'monthly';
  
  // Filters
  organizationId?: string;
  userId?: string;
  projectId?: string;
  teamId?: string;
  categoryCode?: string;           // Supports wildcards: "ai.*"
  dimensions?: Record<string, string>;
  
  // Grouping & metrics
  groupBy?: string[];
  metrics?: string[];
  
  // Pagination
  orderBy?: { field: string; direction: 'asc' | 'desc' };
  limit?: number;
  offset?: number;
}

// GET /api/usage/summary
// Quick summary for dashboard
interface UsageSummaryResponse {
  period: { start: string; end: string };
  totals: {
    cost: number;
    byCategory: Record<string, { count: number; cost: number }>;
  };
  trends: {
    costChange: number;      // % change from previous period
    topCategory: string;
  };
}

// GET /api/usage/realtime
// Get real-time counters
interface RealtimeUsageResponse {
  counters: Array<{
    categoryCode: string;
    metricKey: string;
    current: number;
    limit?: number;
    percentage?: number;
  }>;
}
```

### 6.2 Category Endpoints

```typescript
// GET /api/usage/categories
// List all categories
interface ListCategoriesResponse {
  categories: Array<{
    code: string;
    name: string;
    parentCode: string | null;
    metrics: Record<string, string>;
    pricingModel: string;
    isActive: boolean;
    isSystem: boolean;
  }>;
}

// POST /api/usage/categories
// Create custom category (Admin)
interface CreateCategoryRequest {
  code: string;                    // Must be unique
  name: string;
  description?: string;
  parentCode?: string;
  metrics: Record<string, string>;
  primaryMetric: string;
  pricingModel?: PricingModel;
}

// PUT /api/usage/categories/:code
// Update category (non-system only)

// DELETE /api/usage/categories/:code
// Delete category (non-system only)
```

### 6.3 Quota Endpoints

```typescript
// GET /api/usage/quotas
// List quotas

// POST /api/usage/quotas
// Create quota
interface CreateQuotaRequest {
  name: string;
  description?: string;
  scope: QuotaScope;
  userId?: string;
  teamId?: string;
  projectId?: string;
  categoryCode: string;            // Supports wildcards
  metricKey: string;
  dimensionFilters?: Record<string, string>;
  period: QuotaPeriod;
  limitValue: number;
  warnThreshold?: number;
  criticalThreshold?: number;
  action: QuotaAction;
}

// GET /api/usage/quotas/check
// Pre-check quota before action
interface QuotaCheckRequest {
  categoryCode: string;
  estimatedMetrics: Record<string, number>;
}

interface QuotaCheckResponse {
  allowed: boolean;
  quotas: Array<{
    name: string;
    current: number;
    limit: number;
    percentage: number;
    remaining: number;
  }>;
}
```

### 6.4 Budget Endpoints

```typescript
// GET /api/usage/budgets
// List budgets

// POST /api/usage/budgets
// Create budget
interface CreateBudgetRequest {
  name: string;
  description?: string;
  scope: BudgetScope;
  teamId?: string;
  projectId?: string;
  categoryCode?: string;           // Optional filter
  period: BudgetPeriod;
  amountCents: number;
  warnThreshold?: number;
  criticalThreshold?: number;
  action?: BudgetAction;
}

// GET /api/usage/budgets/:id/status
// Get budget status
interface BudgetStatusResponse {
  budget: Budget;
  current: number;
  percentage: number;
  projected: number;               // Projected end-of-period usage
  status: 'ok' | 'warning' | 'critical' | 'exceeded';
  breakdown: Array<{
    categoryCode: string;
    amount: number;
    percentage: number;
  }>;
}
```

### 6.5 Pricing Endpoints

```typescript
// GET /api/usage/pricing
// List pricing rules

// POST /api/usage/pricing
// Create pricing rule (Admin)
interface CreatePricingRequest {
  organizationId?: string;         // Null = global default
  categoryCode: string;
  dimensionKey?: string;
  dimensionValue?: string;
  pricingModel: PricingModel;
  unitPrice: number;
  unitMultiplier?: number;
  tiers?: Array<{ upTo: number | null; price: number }>;
  effectiveFrom?: string;
  effectiveTo?: string;
}

// PUT /api/usage/pricing/:id
// Update pricing rule

// DELETE /api/usage/pricing/:id
// Delete pricing rule
```

### 6.6 Export Endpoints

```typescript
// POST /api/usage/export
// Export usage data
interface ExportRequest {
  format: 'csv' | 'json' | 'xlsx';
  startDate: string;
  endDate: string;
  granularity: 'daily' | 'monthly';
  groupBy?: string[];
  categoryCode?: string;
}

// GET /api/usage/billing
// Get billing-ready data
interface BillingDataResponse {
  periodStart: string;
  periodEnd: string;
  organizationId: string;
  lineItems: Array<{
    categoryCode: string;
    categoryName: string;
    description: string;
    quantity: number;
    unit: string;
    unitPriceCents: number;
    totalCents: number;
    dimensions?: Record<string, string>;
  }>;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
}
```

### 6.7 Endpoint Permission Matrix

| Endpoint | Super Admin | Org Admin | User |
|----------|-------------|-----------|------|
| `POST /api/usage/query` | ✅ (all) | ✅ (org) | ✅ (own) |
| `GET /api/usage/realtime` | ✅ | ✅ | ✅ (own) |
| `POST /api/usage/categories` | ✅ | ❌ | ❌ |
| `POST /api/usage/quotas` (global) | ✅ | ❌ | ❌ |
| `POST /api/usage/quotas` (org) | ✅ | ✅ | ❌ |
| `POST /api/usage/budgets` | ✅ | ✅ | ❌ |
| `POST /api/usage/pricing` (global) | ✅ | ❌ | ❌ |
| `POST /api/usage/pricing` (org) | ✅ | ✅ | ❌ |
| `GET /api/usage/billing` | ✅ | ✅ | ❌ |

---

## 7. Configuration

### 7.1 Environment Variables

```bash
# Usage Tracking Service Configuration
USAGE_SERVICE_PORT=3004
USAGE_SERVICE_HOST=0.0.0.0

# Database (shared)
DATABASE_URL=postgresql://coder:password@postgres:5432/coder_ide

# Redis (for real-time counters)
REDIS_URL=redis://redis:6379

# RabbitMQ
RABBITMQ_URL=amqp://rabbitmq:5672
USAGE_QUEUE=usage-events

# Aggregation schedule
AGGREGATION_HOURLY_CRON="0 5 * * * *"    # 5 minutes past each hour
AGGREGATION_DAILY_CRON="0 0 1 * * *"     # 1 AM daily
AGGREGATION_MONTHLY_CRON="0 0 2 1 * *"   # 2 AM on 1st of month

# Event retention
RAW_EVENT_RETENTION_DAYS=7
HOURLY_AGGREGATE_RETENTION_DAYS=90
DAILY_AGGREGATE_RETENTION_YEARS=2

# Budget checks
BUDGET_CHECK_CRON="0 */15 * * * *"       # Every 15 minutes

# Notification Manager
NOTIFICATION_SERVICE_URL=http://notification-manager:3000
```

### 7.2 Default Pricing Configuration

```typescript
const defaultPricing = [
  // AI Completions
  { categoryCode: 'ai.completion', dimensionKey: 'model', dimensionValue: 'gpt-4o', pricingModel: 'PER_MILLION', unitPrice: 500, unitMultiplier: 1000000 },
  { categoryCode: 'ai.completion', dimensionKey: 'model', dimensionValue: 'gpt-4o-mini', pricingModel: 'PER_MILLION', unitPrice: 15, unitMultiplier: 1000000 },
  { categoryCode: 'ai.completion', dimensionKey: 'model', dimensionValue: 'claude-3-5-sonnet', pricingModel: 'PER_MILLION', unitPrice: 300, unitMultiplier: 1000000 },
  { categoryCode: 'ai.completion', dimensionKey: 'model', dimensionValue: 'claude-3-haiku', pricingModel: 'PER_MILLION', unitPrice: 25, unitMultiplier: 1000000 },
  
  // Embeddings
  { categoryCode: 'ai.embedding', dimensionKey: 'model', dimensionValue: 'text-embedding-3-small', pricingModel: 'PER_MILLION', unitPrice: 2, unitMultiplier: 1000000 },
  { categoryCode: 'ai.embedding', dimensionKey: 'model', dimensionValue: 'text-embedding-3-large', pricingModel: 'PER_MILLION', unitPrice: 13, unitMultiplier: 1000000 },
  
  // Storage
  { categoryCode: 'storage', pricingModel: 'PER_UNIT', unitPrice: 2, unitMultiplier: 1073741824 },  // $0.02 per GB-month
  
  // Compute
  { categoryCode: 'compute', pricingModel: 'PER_MINUTE', unitPrice: 1 },  // $0.01 per minute
  
  // MCP
  { categoryCode: 'mcp.execution', pricingModel: 'NONE' },  // Free
];
```

---

## 8. UI Views

### 8.1 View Overview

```
src/renderer/
├── components/usage/
│   ├── UsageChart/              # Flexible chart component
│   ├── CategoryBreakdown/       # Category pie/bar chart
│   ├── QuotaProgress/           # Quota status bars
│   ├── BudgetCard/              # Budget status
│   ├── AlertsList/              # Recent alerts
│   └── UsageTable/              # Detailed usage table
│
├── pages/usage/
│   ├── DashboardPage.tsx        # Main usage dashboard
│   ├── DetailsPage.tsx          # Detailed usage view
│   ├── CategoriesPage.tsx       # Category management (Admin)
│   ├── QuotasPage.tsx           # Quota management
│   ├── BudgetsPage.tsx          # Budget management
│   ├── PricingPage.tsx          # Pricing configuration (Admin)
│   └── ReportsPage.tsx          # Export & reports
```

### 8.2 Usage Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Usage Dashboard                                   Period: [This Month ▼]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────────────┐  │
│ │  Total Cost       │ │  AI Tokens        │ │  Storage                  │  │
│ │  $234.56          │ │  12.4M            │ │  45.2 GB                  │  │
│ │  ↑ 12% vs last    │ │  ↑ 15% vs last    │ │  ↑ 5% vs last             │  │
│ └───────────────────┘ └───────────────────┘ └───────────────────────────┘  │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │                        Cost by Category                                  │ │
│ │                                                                          │ │
│ │  AI Services       ████████████████████████████████████████████ 65%     │ │
│ │  Storage           ████████████                                 18%     │ │
│ │  Compute           ████████                                     12%     │ │
│ │  MCP Tools         ███                                           5%     │ │
│ │                                                                          │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │                        Usage Over Time                                   │ │
│ │                                                                          │ │
│ │  ▁▂▃▄▅▆▇█▇▆▅▆▇█▇▆▅▄▅▆▇█▇▆▅▄▃▄▅▆                                         │ │
│ │  Jan 1        Jan 8        Jan 15        Jan 22                         │ │
│ │                                                                          │ │
│ │  ─── AI  ─── Storage  ─── Compute                                       │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ Quotas                                                                       │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │  AI Tokens (Monthly)                 [████████████████░░░░░░░░] 78%     │ │
│ │  Storage (Total)                     [████████░░░░░░░░░░░░░░░░] 35%     │ │
│ │  Compute Minutes (Daily)             [██████████████████████░░] 92% ⚠️  │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ Budget: Monthly AI                                                           │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │  [████████████████████████████████░░░░░░░░░░] $152 / $500 (30%)  ✓ OK   │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Implementation Guidelines

### 9.1 Implementation Phases

#### Phase 1: Core Infrastructure (Weeks 1-2)
- [ ] Database schema and migrations
- [ ] Category management (CRUD, seeding defaults)
- [ ] Generic event consumer (RabbitMQ)
- [ ] Usage recorder service
- [ ] Real-time counters (Redis)

#### Phase 2: Cost & Pricing (Week 3)
- [ ] Pricing rules CRUD
- [ ] Cost calculator (all pricing models)
- [ ] Per-organization pricing overrides

#### Phase 3: Quotas & Budgets (Week 4)
- [ ] Quota configuration CRUD
- [ ] Quota enforcement (pre-check API)
- [ ] Budget management CRUD
- [ ] Alert system

#### Phase 4: Aggregation & Analytics (Week 5)
- [ ] Hourly/daily/monthly aggregation
- [ ] Flexible query builder
- [ ] Analytics API
- [ ] Export functionality

#### Phase 5: UI (Week 6)
- [ ] Dashboard UI
- [ ] Category management UI
- [ ] Quota/Budget management UI
- [ ] Reports & export UI

### 9.2 Dependencies

| Dependency | Purpose |
|------------|---------|
| `amqplib` | RabbitMQ client |
| `ioredis` | Redis client |
| `node-cron` | Scheduled aggregation |
| `json2csv` | CSV export |
| `exceljs` | XLSX export |

### 9.3 Events Consumed (RabbitMQ)

```typescript
// Generic event format from all modules
interface ModuleUsageEvent {
  type: string;                    // e.g., "ai.completion.completed"
  organizationId: string;
  userId: string;
  projectId?: string;
  // Module-specific fields
  [key: string]: any;
}

// Event type to category mapping
const eventCategoryMap = {
  'ai.completion.completed': 'ai.completion',
  'ai.completion.failed': 'ai.completion',
  'embedding.document.updated': 'ai.embedding',
  'mcp.tool.executed': 'mcp.execution',
  'storage.file.uploaded': 'storage.project',
  'compute.build.completed': 'compute.build',
};
```

### 9.4 Events Published (RabbitMQ)

```typescript
type UsageTrackingEvent =
  | { type: 'usage.quota.warning'; organizationId: string; quotaId: string; categoryCode: string; percentage: number }
  | { type: 'usage.quota.exceeded'; organizationId: string; quotaId: string; categoryCode: string }
  | { type: 'usage.budget.warning'; organizationId: string; budgetId: string; percentage: number }
  | { type: 'usage.budget.exceeded'; organizationId: string; budgetId: string }
  | { type: 'usage.anomaly.detected'; organizationId: string; categoryCode: string; description: string };
```

---

## Summary

The Usage Tracking Module provides comprehensive, flexible metering and cost management:

1. **Flexible Categories**: Configurable, hierarchical usage categories (not hardcoded)
2. **Generic Event Handling**: Any module can emit events with custom metrics
3. **Multi-Dimensional**: Track usage with custom dimensions for rich analytics
4. **Real-Time Counters**: Redis for instant quota checks
5. **Flexible Pricing**: Per-unit, per-million, tiered, flat rate models
6. **Organization Overrides**: Custom pricing per organization
7. **Wildcard Quotas**: Support for `ai.*` style quota patterns
8. **Rich Analytics**: Flexible query API with grouping and filtering

---

**Related Documents:**
- [Architecture](../architecture.md)
- [AI Service](../AI%20Service/ai-service-specification.md)
- [Notification Manager](../Notification%20Manager/todo.md)
