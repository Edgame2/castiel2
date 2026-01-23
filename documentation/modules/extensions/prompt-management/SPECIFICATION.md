# Prompt Management Module Specification

**Version:** 1.0.0  
**Last Updated:** 2026-01-20  
**Status:** Draft  
**Module Category:** AI & Intelligence

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Data Models](#3-data-models)
4. [Core Features](#4-core-features)
5. [API Endpoints](#5-api-endpoints)
6. [Configuration](#6-configuration)
7. [UI Views](#7-ui-views)
8. [Implementation Guidelines](#8-implementation-guidelines)

---

## 1. Overview

### 1.1 Purpose

The Prompt Management Module provides **centralized management of AI prompt templates** for Coder IDE. It enables versioning, A/B testing, organization-specific overrides, and analytics for all prompts used across the system.

### 1.2 Key Responsibilities

- **Prompt Templates**: Create, version, and manage prompt templates
- **Variable Interpolation**: Dynamic variable substitution in prompts
- **Versioning**: Full version history with rollback capability
- **A/B Testing**: Test prompt variants with analytics
- **Overrides**: Organization-specific prompt customizations
- **Composition**: Combine multiple prompts into workflows
- **Analytics**: Track prompt performance and usage

### 1.3 Consumer Modules

| Module | Usage |
|--------|-------|
| **AI Service** | Fetches prompt templates for completions |
| **Planning** | Plan generation prompts |
| **Agent System** | Agent instruction prompts |
| **Code Generation** | Code completion prompts |
| **Knowledge Base** | Summarization, Q&A prompts |

---

## 2. Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              CONSUMER MODULES                                            │
│   AI Service │ Planning │ Agents │ Code Gen │ Knowledge Base                            │
└─────────────────────────────────────────┬───────────────────────────────────────────────┘
                                          │ REST API
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           PROMPT MANAGEMENT MODULE                                       │
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                          Prompt Service                                          │   │
│  │  • Template Resolution   • Variable Interpolation   • Version Selection         │   │
│  └─────────────────────────────────────────┬───────────────────────────────────────┘   │
│                                            │                                            │
│  ┌──────────────────┬──────────────────┬───┴────────────────┬─────────────────────┐   │
│  │                  │                  │                    │                     │   │
│  ▼                  ▼                  ▼                    ▼                     ▼   │
│ ┌──────────┐  ┌──────────┐    ┌──────────────┐    ┌──────────┐    ┌────────────┐   │
│ │ Template │  │ Version  │    │   A/B Test   │    │ Override │    │ Analytics  │   │
│ │  Store   │  │ Manager  │    │   Engine     │    │ Resolver │    │  Tracker   │   │
│ └──────────┘  └──────────┘    └──────────────┘    └──────────┘    └────────────┘   │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                    │                                           │
                    ▼                                           ▼
           ┌───────────────┐                          ┌───────────────┐
           │   PostgreSQL  │                          │    Usage      │
           │   (prompts)   │                          │   Tracking    │
           └───────────────┘                          └───────────────┘
```

### 2.2 Module Location

```
containers/
└── prompt-management/
    ├── src/
    │   ├── index.ts                    # Entry point
    │   ├── server.ts                   # Fastify server
    │   │
    │   ├── routes/
    │   │   ├── templates.ts            # Template CRUD
    │   │   ├── versions.ts             # Version management
    │   │   ├── experiments.ts          # A/B testing
    │   │   ├── overrides.ts            # Organization overrides
    │   │   └── analytics.ts            # Usage analytics
    │   │
    │   ├── services/
    │   │   ├── PromptService.ts        # Core prompt logic
    │   │   ├── TemplateEngine.ts       # Variable interpolation
    │   │   ├── VersionManager.ts       # Version control
    │   │   ├── ExperimentEngine.ts     # A/B testing
    │   │   ├── OverrideResolver.ts     # Override resolution
    │   │   └── AnalyticsService.ts     # Usage tracking
    │   │
    │   └── types/
    │       ├── prompt.types.ts
    │       └── experiment.types.ts
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

> **Shared Database**: All Prompt Management data resides in the shared Cosmos DB NoSQL database. The `prompt` container stores all prompt management-related documents.

### 3.2 Table Mapping

| Prisma Model | Database Table | Description |
|--------------|----------------|-------------|
| `PromptTemplate` | `prompt_templates` | Base prompt templates |
| `PromptVersion` | `prompt_versions` | Version history |
| `PromptVariable` | `prompt_variables` | Variable definitions |
| `PromptOverride` | `prompt_overrides` | Organization overrides |
| `PromptExperiment` | `prompt_experiments` | A/B test configurations |
| `PromptVariant` | `prompt_variants` | A/B test variants |
| `PromptExecution` | `prompt_executions` | Execution logs for analytics |

### 3.3 Database Schema

```prisma
// ============================================================
// PROMPT TEMPLATES
// ============================================================

model PromptTemplate {
  @@map("prompt_templates")
  
  id                    String                @id @default(uuid())
  
  // Identification
  name                  String                @unique  // system-prompt-planning, code-review, etc.
  displayName           String
  description           String?
  
  // Categorization
  category              PromptCategory
  module                String                // planning, agent, code-gen, knowledge-base
  
  // Model hints
  preferredModels       String[]              // Suggested models for this prompt
  
  // Metadata
  tags                  String[]
  
  // Status
  isActive              Boolean               @default(true)
  isSystem              Boolean               @default(false)  // System prompts can't be deleted
  
  // Timestamps
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  createdBy             String?
  
  // Relations
  versions              PromptVersion[]
  variables             PromptVariable[]
  overrides             PromptOverride[]
  experiments           PromptExperiment[]
  
  @@index([category, module])
  @@index([isActive])
}

enum PromptCategory {
  SYSTEM                // System/instruction prompts
  USER                  // User message templates
  ASSISTANT             // Pre-fill assistant messages
  FUNCTION              // Function/tool descriptions
  CHAIN                 // Multi-step chains
}

// ============================================================
// PROMPT VERSIONS
// ============================================================

model PromptVersion {
  @@map("prompt_versions")
  
  id                    String                @id @default(uuid())
  
  // Template
  templateId            String
  template              PromptTemplate        @relation(fields: [templateId], references: [id], onDelete: Cascade)
  
  // Version info
  version               Int                   // Incrementing version number
  versionLabel          String?               // Optional label (e.g., "improved-clarity")
  
  // Content
  content               String                // The actual prompt text
  
  // Estimated tokens
  estimatedTokens       Int?
  
  // Status
  status                VersionStatus         @default(DRAFT)
  publishedAt           DateTime?
  
  // Metadata
  changeNotes           String?               // What changed in this version
  
  // Timestamps
  createdAt             DateTime              @default(now())
  createdBy             String?
  
  // Relations
  variants              PromptVariant[]
  executions            PromptExecution[]
  
  @@unique([templateId, version])
  @@index([templateId, status])
}

enum VersionStatus {
  DRAFT                 // Work in progress
  PUBLISHED             // Active version
  DEPRECATED            // Marked for removal
  ARCHIVED              // No longer active
}

// ============================================================
// PROMPT VARIABLES
// ============================================================

model PromptVariable {
  @@map("prompt_variables")
  
  id                    String                @id @default(uuid())
  
  // Template
  templateId            String
  template              PromptTemplate        @relation(fields: [templateId], references: [id], onDelete: Cascade)
  
  // Variable definition
  name                  String                // Variable name (e.g., "user_context")
  displayName           String
  description           String?
  
  // Type & validation
  type                  VariableType          @default(STRING)
  isRequired            Boolean               @default(true)
  defaultValue          String?
  
  // Validation rules (JSON)
  validation            Json?                 // { maxLength: 1000, pattern: "..." }
  
  // Timestamps
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  
  @@unique([templateId, name])
}

enum VariableType {
  STRING
  NUMBER
  BOOLEAN
  JSON
  ARRAY
  DATE
}

// ============================================================
// ORGANIZATION OVERRIDES
// ============================================================

model PromptOverride {
  @@map("prompt_overrides")
  
  id                    String                @id @default(uuid())
  
  // Template
  templateId            String
  template              PromptTemplate        @relation(fields: [templateId], references: [id], onDelete: Cascade)
  
  // Scope
  organizationId        String
  organization          Organization          @relation(fields: [organizationId], references: [id])
  
  // Override content
  content               String                // Custom prompt content
  
  // Priority for cascading overrides
  priority              Int                   @default(0)
  
  // Status
  isActive              Boolean               @default(true)
  
  // Approval
  approvedAt            DateTime?
  approvedBy            String?
  
  // Timestamps
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  createdBy             String
  
  @@unique([templateId, organizationId])
  @@index([organizationId, isActive])
}

// ============================================================
// A/B TESTING: EXPERIMENTS
// ============================================================

model PromptExperiment {
  @@map("prompt_experiments")
  
  id                    String                @id @default(uuid())
  
  // Template
  templateId            String
  template              PromptTemplate        @relation(fields: [templateId], references: [id], onDelete: Cascade)
  
  // Scope (null = global)
  organizationId        String?
  organization          Organization?         @relation(fields: [organizationId], references: [id])
  
  // Experiment info
  name                  String
  description           String?
  hypothesis            String?               // What we're testing
  
  // Configuration
  status                ExperimentStatus      @default(DRAFT)
  trafficPercentage     Int                   @default(100)  // % of traffic in experiment
  
  // Goals
  primaryMetric         String                // success_rate, latency, user_rating
  secondaryMetrics      String[]
  
  // Timing
  startDate             DateTime?
  endDate               DateTime?
  
  // Results
  winningVariantId      String?
  conclusionNotes       String?
  
  // Timestamps
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  createdBy             String
  
  // Relations
  variants              PromptVariant[]
  
  @@index([templateId, status])
  @@index([organizationId])
}

enum ExperimentStatus {
  DRAFT                 // Setting up
  RUNNING               // Active experiment
  PAUSED                // Temporarily stopped
  COMPLETED             // Finished with conclusion
  CANCELLED             // Stopped without conclusion
}

// ============================================================
// A/B TESTING: VARIANTS
// ============================================================

model PromptVariant {
  @@map("prompt_variants")
  
  id                    String                @id @default(uuid())
  
  // Experiment
  experimentId          String
  experiment            PromptExperiment      @relation(fields: [experimentId], references: [id], onDelete: Cascade)
  
  // Variant info
  name                  String                // "Control", "Variant A", etc.
  description           String?
  
  // Content (can be same version with different params, or different version)
  versionId             String?               // Optional: use specific version
  version               PromptVersion?        @relation(fields: [versionId], references: [id])
  customContent         String?               // Or: custom content for this variant
  
  // Traffic allocation
  weight                Int                   @default(50)  // Relative weight (e.g., 50 = 50%)
  
  // Status
  isControl             Boolean               @default(false)
  
  // Timestamps
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  
  // Relations
  executions            PromptExecution[]
  
  @@index([experimentId])
}

// ============================================================
// EXECUTION LOGS (for analytics)
// ============================================================

model PromptExecution {
  @@map("prompt_executions")
  
  id                    String                @id @default(uuid())
  
  // Context
  organizationId        String
  organization          Organization          @relation(fields: [organizationId], references: [id])
  userId                String
  user                  User                  @relation(fields: [userId], references: [id])
  
  // Template & version
  templateId            String
  versionId             String
  version               PromptVersion         @relation(fields: [versionId], references: [id])
  
  // Experiment (if part of A/B test)
  variantId             String?
  variant               PromptVariant?        @relation(fields: [variantId], references: [id])
  
  // Execution details
  callerModule          String                // Which module used this prompt
  inputTokens           Int?
  outputTokens          Int?
  
  // Outcome
  wasSuccessful         Boolean?              // Did it achieve desired outcome?
  userRating            Int?                  // Optional user feedback (1-5)
  latencyMs             Int?
  
  // Metadata
  metadata              Json?
  
  // Timestamp
  executedAt            DateTime              @default(now())
  
  @@index([templateId, executedAt])
  @@index([versionId, executedAt])
  @@index([variantId, executedAt])
  @@index([organizationId, executedAt])
}
```

---

## 4. Core Features

### 4.1 Template Engine (Variable Interpolation)

```typescript
class TemplateEngine {
  private readonly VARIABLE_PATTERN = /\{\{(\w+)(?:\|(\w+))?\}\}/g;
  
  /**
   * Render a prompt template with variables
   */
  render(template: string, variables: Record<string, any>): string {
    return template.replace(this.VARIABLE_PATTERN, (match, name, filter) => {
      const value = variables[name];
      
      if (value === undefined) {
        throw new MissingVariableError(name);
      }
      
      // Apply filter if specified
      if (filter) {
        return this.applyFilter(value, filter);
      }
      
      return this.stringify(value);
    });
  }
  
  /**
   * Extract variable names from template
   */
  extractVariables(template: string): string[] {
    const variables: string[] = [];
    let match;
    
    while ((match = this.VARIABLE_PATTERN.exec(template)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    
    return variables;
  }
  
  /**
   * Validate variables against definitions
   */
  validate(
    variables: Record<string, any>,
    definitions: PromptVariable[]
  ): ValidationResult {
    const errors: ValidationError[] = [];
    
    for (const def of definitions) {
      const value = variables[def.name];
      
      // Check required
      if (def.isRequired && (value === undefined || value === null)) {
        errors.push({
          variable: def.name,
          error: 'Required variable is missing'
        });
        continue;
      }
      
      // Type check
      if (value !== undefined && !this.checkType(value, def.type)) {
        errors.push({
          variable: def.name,
          error: `Expected ${def.type}, got ${typeof value}`
        });
      }
      
      // Custom validation
      if (def.validation && value !== undefined) {
        const validationErrors = this.runValidation(value, def.validation);
        errors.push(...validationErrors.map(e => ({ variable: def.name, error: e })));
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  private applyFilter(value: any, filter: string): string {
    switch (filter) {
      case 'upper': return String(value).toUpperCase();
      case 'lower': return String(value).toLowerCase();
      case 'trim': return String(value).trim();
      case 'json': return JSON.stringify(value);
      case 'escape': return this.escapeHtml(value);
      case 'truncate': return String(value).slice(0, 100) + '...';
      default: return String(value);
    }
  }
  
  private stringify(value: any): string {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  }
}

// Template example:
// "You are helping {{user_name}} with {{task|lower}}. Context: {{context|json}}"
```

### 4.2 Version Manager

```typescript
class VersionManager {
  /**
   * Create a new version of a template
   */
  async createVersion(
    templateId: string,
    content: string,
    options: CreateVersionOptions
  ): Promise<PromptVersion> {
    // Get next version number
    const lastVersion = await prisma.promptVersion.findFirst({
      where: { templateId },
      orderBy: { version: 'desc' }
    });
    
    const newVersion = (lastVersion?.version || 0) + 1;
    
    // Estimate tokens
    const estimatedTokens = this.estimateTokens(content);
    
    return prisma.promptVersion.create({
      data: {
        templateId,
        version: newVersion,
        versionLabel: options.label,
        content,
        estimatedTokens,
        status: options.publish ? 'PUBLISHED' : 'DRAFT',
        publishedAt: options.publish ? new Date() : null,
        changeNotes: options.changeNotes,
        createdBy: options.userId
      }
    });
  }
  
  /**
   * Publish a version (deprecate previous published version)
   */
  async publishVersion(versionId: string): Promise<PromptVersion> {
    const version = await prisma.promptVersion.findUnique({
      where: { id: versionId }
    });
    
    // Deprecate current published version
    await prisma.promptVersion.updateMany({
      where: {
        templateId: version.templateId,
        status: 'PUBLISHED'
      },
      data: { status: 'DEPRECATED' }
    });
    
    // Publish new version
    return prisma.promptVersion.update({
      where: { id: versionId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date()
      }
    });
  }
  
  /**
   * Rollback to a previous version
   */
  async rollback(templateId: string, targetVersion: number): Promise<PromptVersion> {
    const version = await prisma.promptVersion.findUnique({
      where: {
        templateId_version: { templateId, version: targetVersion }
      }
    });
    
    if (!version) {
      throw new VersionNotFoundError(templateId, targetVersion);
    }
    
    return this.publishVersion(version.id);
  }
  
  /**
   * Get version history
   */
  async getHistory(templateId: string): Promise<PromptVersion[]> {
    return prisma.promptVersion.findMany({
      where: { templateId },
      orderBy: { version: 'desc' }
    });
  }
  
  /**
   * Compare two versions
   */
  async diff(versionId1: string, versionId2: string): Promise<DiffResult> {
    const [v1, v2] = await Promise.all([
      prisma.promptVersion.findUnique({ where: { id: versionId1 } }),
      prisma.promptVersion.findUnique({ where: { id: versionId2 } })
    ]);
    
    return this.computeDiff(v1.content, v2.content);
  }
  
  private estimateTokens(content: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(content.length / 4);
  }
}
```

### 4.3 Experiment Engine (A/B Testing)

```typescript
class ExperimentEngine {
  /**
   * Select a variant for a user
   */
  async selectVariant(
    experimentId: string,
    userId: string
  ): Promise<PromptVariant> {
    const experiment = await prisma.promptExperiment.findUnique({
      where: { id: experimentId },
      include: { variants: true }
    });
    
    if (experiment.status !== 'RUNNING') {
      // Return control variant
      return experiment.variants.find(v => v.isControl);
    }
    
    // Check traffic percentage
    if (!this.isInTraffic(userId, experiment.trafficPercentage)) {
      return experiment.variants.find(v => v.isControl);
    }
    
    // Deterministic variant selection based on user ID
    return this.selectWeightedVariant(experiment.variants, userId);
  }
  
  /**
   * Deterministic variant selection using consistent hashing
   */
  private selectWeightedVariant(
    variants: PromptVariant[],
    userId: string
  ): PromptVariant {
    const hash = this.hashUserId(userId);
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    const target = hash % totalWeight;
    
    let cumulative = 0;
    for (const variant of variants) {
      cumulative += variant.weight;
      if (target < cumulative) {
        return variant;
      }
    }
    
    return variants[0];
  }
  
  /**
   * Check if user is in experiment traffic
   */
  private isInTraffic(userId: string, percentage: number): boolean {
    const hash = this.hashUserId(userId);
    return (hash % 100) < percentage;
  }
  
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
  
  /**
   * Record experiment outcome
   */
  async recordOutcome(
    executionId: string,
    outcome: ExperimentOutcome
  ): Promise<void> {
    await prisma.promptExecution.update({
      where: { id: executionId },
      data: {
        wasSuccessful: outcome.success,
        userRating: outcome.rating,
        latencyMs: outcome.latencyMs
      }
    });
  }
  
  /**
   * Get experiment results
   */
  async getResults(experimentId: string): Promise<ExperimentResults> {
    const experiment = await prisma.promptExperiment.findUnique({
      where: { id: experimentId },
      include: { variants: true }
    });
    
    const variantResults: VariantResult[] = [];
    
    for (const variant of experiment.variants) {
      const executions = await prisma.promptExecution.findMany({
        where: { variantId: variant.id }
      });
      
      const total = executions.length;
      const successful = executions.filter(e => e.wasSuccessful).length;
      const avgLatency = executions.reduce((sum, e) => sum + (e.latencyMs || 0), 0) / total;
      const avgRating = executions
        .filter(e => e.userRating)
        .reduce((sum, e) => sum + e.userRating, 0) / 
        executions.filter(e => e.userRating).length;
      
      variantResults.push({
        variantId: variant.id,
        variantName: variant.name,
        isControl: variant.isControl,
        sampleSize: total,
        successRate: total > 0 ? successful / total : 0,
        avgLatencyMs: avgLatency,
        avgRating: avgRating || null,
        confidenceInterval: this.calculateCI(successful, total)
      });
    }
    
    return {
      experimentId,
      status: experiment.status,
      startDate: experiment.startDate,
      variantResults,
      winner: this.determineWinner(variantResults, experiment.primaryMetric)
    };
  }
  
  private calculateCI(successes: number, total: number): ConfidenceInterval {
    // Wilson score interval for 95% confidence
    if (total === 0) return { lower: 0, upper: 0 };
    
    const z = 1.96; // 95% CI
    const p = successes / total;
    const n = total;
    
    const denominator = 1 + z * z / n;
    const center = (p + z * z / (2 * n)) / denominator;
    const spread = z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n) / denominator;
    
    return {
      lower: Math.max(0, center - spread),
      upper: Math.min(1, center + spread)
    };
  }
}
```

### 4.4 Override Resolver

```typescript
class OverrideResolver {
  /**
   * Resolve the effective prompt for a given context
   */
  async resolvePrompt(
    templateId: string,
    context: ResolveContext
  ): Promise<ResolvedPrompt> {
    // Get base template with published version
    const template = await prisma.promptTemplate.findUnique({
      where: { id: templateId },
      include: {
        versions: {
          where: { status: 'PUBLISHED' },
          orderBy: { version: 'desc' },
          take: 1
        },
        variables: true
      }
    });
    
    if (!template || template.versions.length === 0) {
      throw new TemplateNotFoundError(templateId);
    }
    
    let content = template.versions[0].content;
    let source: 'base' | 'override' | 'experiment' = 'base';
    let variantId: string | null = null;
    
    // Check for active experiment
    if (context.enableExperiments !== false) {
      const experiment = await this.getActiveExperiment(templateId, context.organizationId);
      if (experiment) {
        const variant = await this.experimentEngine.selectVariant(
          experiment.id,
          context.userId
        );
        content = variant.customContent || 
          (variant.version?.content) || 
          content;
        source = 'experiment';
        variantId = variant.id;
      }
    }
    
    // Check for organization override (if not in experiment)
    if (source === 'base' && context.organizationId) {
      const override = await prisma.promptOverride.findUnique({
        where: {
          templateId_organizationId: {
            templateId,
            organizationId: context.organizationId
          }
        }
      });
      
      if (override?.isActive) {
        content = override.content;
        source = 'override';
      }
    }
    
    return {
      templateId,
      templateName: template.name,
      versionId: template.versions[0].id,
      version: template.versions[0].version,
      content,
      variables: template.variables,
      source,
      variantId
    };
  }
  
  private async getActiveExperiment(
    templateId: string,
    organizationId?: string
  ): Promise<PromptExperiment | null> {
    return prisma.promptExperiment.findFirst({
      where: {
        templateId,
        status: 'RUNNING',
        OR: [
          { organizationId: null },           // Global experiment
          { organizationId: organizationId }  // Org-specific experiment
        ]
      },
      include: {
        variants: {
          include: { version: true }
        }
      }
    });
  }
}
```

### 4.5 Prompt Service (Main Entry Point)

```typescript
class PromptService {
  constructor(
    private templateEngine: TemplateEngine,
    private versionManager: VersionManager,
    private overrideResolver: OverrideResolver,
    private analyticsService: AnalyticsService
  ) {}
  
  /**
   * Get and render a prompt template
   */
  async getPrompt(
    templateName: string,
    variables: Record<string, any>,
    context: PromptContext
  ): Promise<RenderedPrompt> {
    // Find template by name
    const template = await prisma.promptTemplate.findUnique({
      where: { name: templateName }
    });
    
    if (!template) {
      throw new TemplateNotFoundError(templateName);
    }
    
    // Resolve the effective prompt (handles overrides & experiments)
    const resolved = await this.overrideResolver.resolvePrompt(
      template.id,
      {
        organizationId: context.organizationId,
        userId: context.userId,
        enableExperiments: context.enableExperiments
      }
    );
    
    // Validate variables
    const validation = this.templateEngine.validate(variables, resolved.variables);
    if (!validation.isValid) {
      throw new ValidationError(validation.errors);
    }
    
    // Render template
    const renderedContent = this.templateEngine.render(resolved.content, variables);
    
    // Log execution (async)
    this.logExecution(resolved, context).catch(console.error);
    
    return {
      content: renderedContent,
      templateId: resolved.templateId,
      templateName: resolved.templateName,
      versionId: resolved.versionId,
      version: resolved.version,
      source: resolved.source,
      variantId: resolved.variantId,
      estimatedTokens: Math.ceil(renderedContent.length / 4)
    };
  }
  
  private async logExecution(
    resolved: ResolvedPrompt,
    context: PromptContext
  ): Promise<void> {
    await prisma.promptExecution.create({
      data: {
        organizationId: context.organizationId,
        userId: context.userId,
        templateId: resolved.templateId,
        versionId: resolved.versionId,
        variantId: resolved.variantId,
        callerModule: context.module,
        executedAt: new Date()
      }
    });
  }
}

interface PromptContext {
  organizationId: string;
  userId: string;
  module: string;                    // 'planning', 'agent', 'code-gen', etc.
  enableExperiments?: boolean;       // default: true
}

interface RenderedPrompt {
  content: string;
  templateId: string;
  templateName: string;
  versionId: string;
  version: number;
  source: 'base' | 'override' | 'experiment';
  variantId: string | null;
  estimatedTokens: number;
}
```

---

## 5. API Endpoints

### 5.1 Template Endpoints

```typescript
// GET /api/prompts/templates
// List all templates
interface ListTemplatesResponse {
  templates: Array<{
    id: string;
    name: string;
    displayName: string;
    category: string;
    module: string;
    currentVersion: number;
    isActive: boolean;
  }>;
}

// GET /api/prompts/templates/:name
// Get template by name

// POST /api/prompts/templates
// Create new template (Admin)
interface CreateTemplateRequest {
  name: string;
  displayName: string;
  description?: string;
  category: PromptCategory;
  module: string;
  content: string;                    // Initial content
  variables?: VariableDefinition[];
  preferredModels?: string[];
  tags?: string[];
}

// PUT /api/prompts/templates/:id
// Update template metadata

// DELETE /api/prompts/templates/:id
// Delete template (non-system only)
```

### 5.2 Version Endpoints

```typescript
// GET /api/prompts/templates/:id/versions
// List versions

// POST /api/prompts/templates/:id/versions
// Create new version
interface CreateVersionRequest {
  content: string;
  label?: string;
  changeNotes?: string;
  publish?: boolean;
}

// POST /api/prompts/versions/:id/publish
// Publish a version

// POST /api/prompts/templates/:id/rollback
// Rollback to previous version
interface RollbackRequest {
  targetVersion: number;
}

// GET /api/prompts/versions/:id1/diff/:id2
// Compare two versions
```

### 5.3 Override Endpoints

```typescript
// GET /api/prompts/overrides
// List organization overrides

// POST /api/prompts/overrides
// Create override (Org Admin)
interface CreateOverrideRequest {
  templateId: string;
  content: string;
  priority?: number;
}

// PUT /api/prompts/overrides/:id
// Update override

// DELETE /api/prompts/overrides/:id
// Delete override
```

### 5.4 Experiment Endpoints

```typescript
// GET /api/prompts/experiments
// List experiments

// POST /api/prompts/experiments
// Create experiment
interface CreateExperimentRequest {
  templateId: string;
  name: string;
  description?: string;
  hypothesis?: string;
  trafficPercentage?: number;
  primaryMetric: string;
  variants: Array<{
    name: string;
    versionId?: string;
    customContent?: string;
    weight: number;
    isControl?: boolean;
  }>;
}

// POST /api/prompts/experiments/:id/start
// Start experiment

// POST /api/prompts/experiments/:id/stop
// Stop experiment

// GET /api/prompts/experiments/:id/results
// Get experiment results
```

### 5.5 Render Endpoint

```typescript
// POST /api/prompts/render
// Render a prompt template (main endpoint for consumers)
interface RenderPromptRequest {
  templateName: string;
  variables: Record<string, any>;
  enableExperiments?: boolean;
}

interface RenderPromptResponse {
  content: string;
  templateId: string;
  versionId: string;
  source: 'base' | 'override' | 'experiment';
  variantId?: string;
  estimatedTokens: number;
}
```

### 5.6 Endpoint Permission Matrix

| Endpoint | Super Admin | Org Admin | User |
|----------|-------------|-----------|------|
| `POST /api/prompts/render` | ✅ | ✅ | ✅ (via module) |
| `GET /api/prompts/templates` | ✅ | ✅ | ✅ |
| `POST /api/prompts/templates` | ✅ | ❌ | ❌ |
| `POST /api/prompts/templates/:id/versions` | ✅ | ❌ | ❌ |
| `POST /api/prompts/overrides` | ✅ | ✅ | ❌ |
| `POST /api/prompts/experiments` | ✅ | ✅ | ❌ |
| `GET /api/prompts/experiments/:id/results` | ✅ | ✅ | ❌ |

---

## 6. Configuration

### 6.1 Environment Variables

```bash
# Prompt Management Service Configuration
PROMPT_SERVICE_PORT=3003
PROMPT_SERVICE_HOST=0.0.0.0

# Database (shared)
COSMOS_DB_CONNECTION_STRING=AccountEndpoint=https://<account-name>.documents.azure.com:443/;AccountKey=<key>;

# Cache (for frequently accessed prompts)
REDIS_URL=redis://redis:6379
PROMPT_CACHE_TTL=300

# Usage Tracking
USAGE_TRACKING_URL=http://usage-tracking:3000
```

### 6.2 Default System Prompts

```typescript
const systemPrompts = [
  // Planning Module
  {
    name: 'planning-system',
    displayName: 'Planning Agent System Prompt',
    category: 'SYSTEM',
    module: 'planning',
    content: `You are a planning assistant. Your job is to help break down tasks into actionable steps.

Context:
- Project: {{project_name}}
- User: {{user_name}}

Guidelines:
1. Create clear, specific steps
2. Consider dependencies between steps
3. Estimate effort for each step`
  },
  
  // Code Generation
  {
    name: 'code-gen-system',
    displayName: 'Code Generation System Prompt',
    category: 'SYSTEM',
    module: 'code-gen',
    content: `You are a code generation assistant for {{language}}.

Project context:
{{project_context}}

Guidelines:
1. Follow existing code style
2. Add appropriate comments
3. Handle edge cases`
  },
  
  // Agent
  {
    name: 'agent-orchestrator',
    displayName: 'Agent Orchestrator System Prompt',
    category: 'SYSTEM',
    module: 'agent',
    content: `You are an AI agent orchestrator. You coordinate multiple specialized agents to complete tasks.

Available agents: {{available_agents|json}}

User request: {{user_request}}`
  }
];
```

---

## 7. UI Views

### 7.1 View Overview

```
src/renderer/
├── components/prompts/
│   ├── TemplateEditor/          # Prompt editing with preview
│   ├── VersionHistory/          # Version comparison
│   ├── VariableConfig/          # Variable management
│   ├── ExperimentSetup/         # A/B test configuration
│   └── ResultsChart/            # Experiment analytics
│
├── pages/prompts/
│   ├── TemplatesPage.tsx        # Template management
│   ├── ExperimentsPage.tsx      # A/B test management
│   └── OverridesPage.tsx        # Organization overrides
```

### 7.2 Admin: Template Management

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Prompt Templates                                          [+ New Template] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Category: [All ▼]    Module: [All ▼]    Status: [Active ▼]                 │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 📝 planning-system                                           v3 (Live) │ │
│ │    Planning Agent System Prompt                                         │ │
│ │    Module: planning │ Category: SYSTEM │ ~450 tokens                   │ │
│ │    Variables: project_name, user_name                                  │ │
│ │                                          [Edit] [Versions] [Experiment] │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ 📝 code-gen-system                                          v2 (Live)  │ │
│ │    Code Generation System Prompt                                        │ │
│ │    Module: code-gen │ Category: SYSTEM │ ~380 tokens                   │ │
│ │    Variables: language, project_context                                │ │
│ │    🧪 A/B Test Running (2 variants)                                    │ │
│ │                                          [Edit] [Versions] [Experiment] │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.3 Admin: A/B Test Results

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Experiment: Code Gen Clarity Test                            Status: Running│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Hypothesis: Adding explicit language examples improves code quality         │
│ Primary Metric: User Rating │ Traffic: 80% │ Started: Jan 15, 2026         │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │                        Results Summary                                   │ │
│ │                                                                          │ │
│ │  Variant          Samples    Success Rate    Avg Rating    Latency      │ │
│ │  ─────────────────────────────────────────────────────────────────────  │ │
│ │  Control           1,234       78.5%          4.1 ⭐       245ms        │ │
│ │  Variant A         1,198       82.3% ⬆️       4.4 ⭐       252ms        │ │
│ │  Variant B         1,201       79.1%          4.2 ⭐       248ms        │ │
│ │                                                                          │ │
│ │  [==================================] 95% confidence reached             │ │
│ │                                                                          │ │
│ │  📊 Recommendation: Variant A shows statistically significant           │ │
│ │     improvement (+4.8% success rate, p < 0.05)                         │ │
│ │                                                                          │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│                           [End Experiment] [Promote Variant A]             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Implementation Guidelines

### 8.1 Implementation Phases

#### Phase 1: Core Infrastructure (Week 1)
- [ ] Database schema and migrations
- [ ] Template CRUD operations
- [ ] Version management
- [ ] Template rendering engine

#### Phase 2: Variable System (Week 2)
- [ ] Variable interpolation
- [ ] Validation system
- [ ] Filter functions
- [ ] Default values

#### Phase 3: Override System (Week 3)
- [ ] Organization overrides
- [ ] Override resolution
- [ ] Priority handling
- [ ] Approval workflow

#### Phase 4: A/B Testing (Week 4)
- [ ] Experiment CRUD
- [ ] Variant selection
- [ ] Outcome tracking
- [ ] Results analytics

#### Phase 5: UI & Integration (Week 5)
- [ ] Template management UI
- [ ] Experiment dashboard
- [ ] AI Service integration
- [ ] Default prompts seeding

### 8.2 Dependencies

| Dependency | Purpose |
|------------|---------|
| `handlebars` | Alternative template engine (optional) |
| `diff` | Version comparison |
| `tiktoken` | Accurate token counting |

### 8.3 Events Published (RabbitMQ)

```typescript
type PromptEvent =
  | { type: 'prompt.template.created'; templateId: string; name: string }
  | { type: 'prompt.version.published'; templateId: string; version: number }
  | { type: 'prompt.override.created'; templateId: string; organizationId: string }
  | { type: 'prompt.experiment.started'; experimentId: string; templateId: string }
  | { type: 'prompt.experiment.completed'; experimentId: string; winner: string }
  | { type: 'prompt.rendered'; templateId: string; versionId: string; variantId?: string };
```

---

## Summary

The Prompt Management Module provides comprehensive prompt engineering capabilities:

1. **Template Management**: Create, version, and organize prompts
2. **Variable System**: Dynamic interpolation with validation
3. **Version Control**: Full history with rollback capability
4. **A/B Testing**: Test prompt variants with statistical analysis
5. **Organization Overrides**: Customize prompts per organization
6. **Analytics**: Track usage and performance

---

**Related Documents:**
- [Architecture](../architecture.md)
- [AI Service](../AI%20Service/ai-service-specification.md)
- [Usage Tracking](../Usage%20Tracking/todo.md)

