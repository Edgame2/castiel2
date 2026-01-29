# Recommendation Feedback System - Complete Requirements

**Date:** January 2025  
**Version:** 1.0  
**Status:** Final Comprehensive Requirements  
**Based On:** Confirmed business requirements

---

## Executive Summary

### Overview
Users can provide feedback on all AI-generated recommendations. Feedback is configurable (up to 5 active types per tenant, configurable by Super Admin), stored in Azure Data Lake, and leveraged across all CAIS layers to improve the recommendation system.

### Key Decisions Made
1. ✅ All recommendation types receive feedback
2. ✅ 20+ predefined feedback types, editable by Super Admin in UI
3. ✅ Configurable limit per tenant (default 5), set by Super Admin
4. ✅ Rich metadata captured (see FR-1.4)
5. ✅ Data sent to Azure Data Lake Storage
6. ✅ CAIS leverages feedback across all layers (see recommendations)
7. ✅ Analytics: recommendations generated, feedback by type/tenant
8. ✅ UI: Opportunity view with recommendation list + feedback inline
9. ✅ Different feedback options per recommendation type
10. ✅ Aggregation: Weighted + temporal (see recommendations)
11. ✅ ML vs LLM: Unified handling with source tracking
12. ✅ Auto-adjust enabled, configurable by Super Admin & Tenant Admin

### Recommendation Catalog Decision
**✅ YES - Implement Unified Catalog**

**Rationale:**
- Risks and Recommendations are tightly coupled (recommendations mitigate risks)
- Unified catalog enables better tracking and analytics
- Reduces duplication and maintenance overhead
- Enables cross-referencing (Recommendation X mitigates Risk Y)

**Proposed Structure:**
```typescript
// Unified Catalog: "ActionCatalog"
// Contains both Risks and Recommendations
interface ActionCatalogEntry {
  id: string;
  type: "risk" | "recommendation";
  category: string;
  // ... details below
}
```

---

## Table of Contents

1. [Functional Requirements](#functional-requirements)
2. [Recommendation Examples Structure](#recommendation-examples-structure)
3. [Unified Action Catalog (Risks + Recommendations)](#unified-action-catalog)
4. [Database Schemas](#database-schemas)
5. [Service Implementation](#service-implementation)
6. [API Specifications](#api-specifications)
7. [UI Components & Pages](#ui-components--pages)
8. [CAIS Integration (All Layers)](#cais-integration)
9. [Data Lake Integration](#data-lake-integration)
10. [Analytics & Reporting](#analytics--reporting)
11. [Configuration & Administration](#configuration--administration)
12. [Implementation Plan](#implementation-plan)

---

## Functional Requirements

### FR-1: Feedback Collection

#### FR-1.1: Scope
**Requirement:** All recommendation types must support feedback
- Risk mitigation recommendations
- Next best action recommendations
- Opportunity reactivation recommendations
- Sales methodology recommendations
- Training/learning recommendations
- Content recommendations (templates, playbooks)

**Acceptance Criteria:**
- Every recommendation has feedback UI
- Feedback can be provided inline (opportunity view)
- Feedback captured for all recommendation sources (ML, LLM, rule-based)

#### FR-1.2: Feedback Types

**Requirement:** System supports 25+ predefined feedback types organized by category

**Category 1: Action-Based (7 types)**
```typescript
const ACTION_FEEDBACK_TYPES = [
  { id: "act_on_it", name: "I will act on it", sentiment: "positive" },
  { id: "already_actioned", name: "Already actioned", sentiment: "positive" },
  { id: "will_act_later", name: "Will act later", sentiment: "neutral" },
  { id: "delegated", name: "Delegated to someone else", sentiment: "neutral" },
  { id: "not_actionable", name: "Not actionable", sentiment: "negative" },
  { id: "acting_on_alternative", name: "Acting on alternative", sentiment: "neutral" },
  { id: "requires_approval", name: "Requires manager approval", sentiment: "neutral" }
];
```

**Category 2: Relevance-Based (6 types)**
```typescript
const RELEVANCE_FEEDBACK_TYPES = [
  { id: "ignore", name: "Ignore", sentiment: "negative" },
  { id: "irrelevant", name: "Irrelevant", sentiment: "negative" },
  { id: "not_applicable", name: "Not applicable to this opportunity", sentiment: "negative" },
  { id: "wrong_context", name: "Wrong context", sentiment: "negative" },
  { id: "duplicate", name: "Duplicate recommendation", sentiment: "negative" },
  { id: "already_known", name: "Already knew this", sentiment: "neutral" }
];
```

**Category 3: Quality-Based (7 types)**
```typescript
const QUALITY_FEEDBACK_TYPES = [
  { id: "very_helpful", name: "Very helpful", sentiment: "positive" },
  { id: "somewhat_helpful", name: "Somewhat helpful", sentiment: "positive" },
  { id: "not_helpful", name: "Not helpful", sentiment: "negative" },
  { id: "too_generic", name: "Too generic", sentiment: "negative" },
  { id: "too_specific", name: "Too specific", sentiment: "negative" },
  { id: "missing_info", name: "Missing critical information", sentiment: "negative" },
  { id: "incorrect", name: "Incorrect recommendation", sentiment: "negative" }
];
```

**Category 4: Timing-Based (5 types)**
```typescript
const TIMING_FEEDBACK_TYPES = [
  { id: "too_early", name: "Too early", sentiment: "negative" },
  { id: "too_late", name: "Too late", sentiment: "negative" },
  { id: "perfect_timing", name: "Perfect timing", sentiment: "positive" },
  { id: "not_priority", name: "Not a priority right now", sentiment: "neutral" },
  { id: "seasonal", name: "Wrong season/timing", sentiment: "negative" }
];
```

**Acceptance Criteria:**
- All 25+ types available in system
- Super Admin can add/edit/disable types via UI
- Each type has category, sentiment, icon, color
- Types are localizable (future)

#### FR-1.3: Tenant Configuration

**Requirement:** Configurable feedback limit per tenant

**Configuration Levels:**
1. **Super Admin (Global):**
   - Set default limit (default: 5)
   - Set min/max limits (min: 3, max: 10)
   - Edit feedback type definitions
   - Enable/disable feedback types globally

2. **Tenant Admin (Tenant-Specific):**
   - Select active feedback types (up to configured limit)
   - Reorder feedback type display
   - Customize labels (optional)
   - Set feedback requirements (optional vs required)

**Configuration Schema:**
```typescript
interface GlobalFeedbackConfig {
  defaultLimit: number;        // Default: 5
  minLimit: number;            // Minimum: 3
  maxLimit: number;            // Maximum: 10
  availableTypes: FeedbackType[];
}

interface TenantFeedbackConfig {
  tenantId: string;
  activeLimit: number;         // Configured by Super Admin for this tenant
  activeTypes: string[];       // Selected by Tenant Admin (up to limit)
  customLabels: Record<string, string>;
  requireFeedback: boolean;    // Must provide feedback to dismiss?
  allowComments: boolean;      // Allow text comments?
}
```

**Acceptance Criteria:**
- Super Admin can set per-tenant limit
- Tenant Admin can only select up to limit
- Configuration persists in database
- Changes apply immediately

#### FR-1.4: Metadata Collection

**Requirement:** Capture comprehensive metadata with each feedback

**Recommended Metadata Structure:**
```typescript
interface FeedbackMetadata {
  // Core identifiers
  feedbackId: string;
  recommendationId: string;
  userId: string;
  tenantId: string;
  
  // Recommendation context
  recommendation: {
    type: "risk_mitigation" | "next_action" | "reactivation" | "sales_methodology" | "content";
    source: "ml" | "llm" | "rule" | "hybrid";
    confidence?: number;
    text: string;
    reasoning?: string;
    expectedOutcome?: string;
  };
  
  // Opportunity context
  opportunity: {
    id: string;
    stage: string;
    amount: number;
    probability: number;
    industry: string;
    daysToClose: number;
  };
  
  // User context
  user: {
    id: string;
    role: string;
    teamId: string;
    historicalActionRate: number;  // % of recs user acted on
  };
  
  // Feedback
  feedback: {
    type: string;
    category: string;
    sentiment: "positive" | "neutral" | "negative";
    comment?: string;
    secondaryTypes?: string[];     // If user selected multiple
  };
  
  // Timing
  timing: {
    recommendationGeneratedAt: Date;
    recommendationShownAt: Date;
    feedbackGivenAt: Date;
    timeToFeedbackMs: number;
    timeVisibleMs: number;
  };
  
  // Display context
  display: {
    location: "opportunity_view" | "dashboard" | "notification" | "email";
    position: number;              // Was it #1, #2, #3 recommendation?
    deviceType: "web" | "mobile";
    viewportSize?: string;
  };
  
  // A/B testing (if applicable)
  abTest?: {
    variant: string;
    testId: string;
  };
  
  // Outcome tracking (filled later)
  outcome?: {
    actionTaken: boolean;
    actionTakenAt?: Date;
    actionCompleted: boolean;
    actionCompletedAt?: Date;
    impactMeasured: boolean;
    measuredImpact?: {
      probabilityChange?: number;
      outcomeAchieved?: boolean;
    };
  };
}
```

**Acceptance Criteria:**
- All metadata fields captured
- Metadata stored in Cosmos DB
- Metadata sent to Azure Data Lake
- Metadata queryable for analytics

#### FR-1.5: Different Feedback Per Recommendation Type

**Requirement:** Different recommendation types can have different active feedback options

**Configuration Schema:**
```typescript
interface RecommendationTypeFeedbackConfig {
  recommendationType: string;
  recommendedFeedbackTypes: string[];  // Suggested types for this rec type
  allowedFeedbackTypes: string[];      // All types allowed
  defaultFeedbackTypes: string[];      // Default active types
}

// Example configurations
const CONFIGS = {
  risk_mitigation: {
    recommended: ["act_on_it", "already_actioned", "not_applicable", "too_early"],
    default: ["act_on_it", "will_act_later", "not_applicable"]
  },
  reactivation: {
    recommended: ["act_on_it", "not_worth_pursuing", "will_revisit_later"],
    default: ["act_on_it", "ignore", "not_applicable"]
  },
  next_action: {
    recommended: ["act_on_it", "already_actioned", "alternative_action"],
    default: ["act_on_it", "will_act_later", "delegated"]
  }
};
```

**UI Behavior:**
- Tenant Admin sees recommended types for each rec type
- Can override with any available types
- Each rec type can have unique active feedback types

**Acceptance Criteria:**
- Per-type configuration supported
- UI shows type-specific options
- Fallback to tenant default if not configured

---

## Recommendation Examples Structure

### Recommended Recommendation Schema

Based on your examples, here's the comprehensive recommendation structure:

```typescript
interface Recommendation {
  id: string;
  partitionKey: string;             // tenantId
  tenantId: string;
  
  // Classification
  type: "risk_mitigation" | "next_action" | "reactivation" | "sales_methodology" | "content" | "training";
  category: string;                 // From ActionCatalog
  catalogEntryId?: string;          // Link to ActionCatalog entry
  
  // Content
  content: {
    title: string;                  // "Engage Decision Maker"
    description: string;            // Main recommendation text
    actionItems: string[];          // List of specific actions/questions
    reasoning: string;              // Why this recommendation
    expectedOutcome: {
      description: string;          // "Increase close probability"
      quantifiedImpact?: string;    // "15% increase" or "xx% extra probability"
      impactType: "probability" | "revenue" | "timeline" | "risk_reduction";
    };
    resources?: Array<{
      type: "document" | "link" | "template" | "playbook" | "training";
      title: string;
      url: string;
      description: string;
    }>;
  };
  
  // Context
  context: {
    opportunityId: string;
    opportunityStage: string;
    opportunityAmount: number;
    triggerReason: string;          // What triggered this recommendation
    relevanceScore: number;         // 0-1
  };
  
  // Generation metadata
  generatedBy: {
    source: "ml" | "llm" | "rule" | "hybrid";
    modelVersion?: string;
    confidence: number;             // 0-1
    features?: string[];            // Which features drove this
  };
  
  // Lifecycle
  status: "pending" | "shown" | "acted_on" | "ignored" | "expired";
  generatedAt: Date;
  shownAt?: Date;
  expiresAt: Date;
  
  // Priority & Urgency
  priority: "critical" | "high" | "medium" | "low";
  urgency: "immediate" | "this_week" | "this_month" | "flexible";
  
  // Feedback (after user responds)
  feedback?: {
    feedbackId: string;
    feedbackType: string;
    feedbackSentiment: string;
    comment?: string;
    givenAt: Date;
  };
}
```

### Example 1: Sales Methodology Recommendation

```json
{
  "id": "rec_001",
  "type": "sales_methodology",
  "category": "engagement_questions",
  "content": {
    "title": "Critical Discovery Questions for Proposal Stage",
    "description": "Considering the stage of your deal, you should ask the following questions to the customer during your next engagement:",
    "actionItems": [
      "What specific metrics will you use to measure success with this solution?",
      "Who else needs to be involved in the final decision, and what are their concerns?",
      "What is your timeline for implementation, and what might cause delays?"
    ],
    "reasoning": "Your current discovery information is limited for a deal at the proposal stage. These questions will help uncover hidden risks and stakeholder concerns.",
    "expectedOutcome": {
      "description": "This would give your deal 15% extra probability to close",
      "quantifiedImpact": "15%",
      "impactType": "probability"
    }
  },
  "context": {
    "opportunityId": "opp_123",
    "opportunityStage": "proposal",
    "opportunityAmount": 500000,
    "triggerReason": "Limited discovery notes in Proposal stage",
    "relevanceScore": 0.87
  },
  "generatedBy": {
    "source": "hybrid",
    "confidence": 0.85,
    "features": ["stage_proposal", "discovery_score_low", "methodology_meddic"]
  },
  "priority": "high",
  "urgency": "this_week"
}
```

### Example 2: Content Recommendation

```json
{
  "id": "rec_002",
  "type": "content",
  "category": "customer_content",
  "content": {
    "title": "Share Product X Case Study",
    "description": "I recommend that you share the Enterprise Healthcare Case Study deck with the customer.",
    "actionItems": [
      "Review the case study for relevant details",
      "Send via email with personalized intro",
      "Schedule follow-up call to discuss questions"
    ],
    "reasoning": "The customer expressed interest about product X in their last email. They specifically asked about healthcare implementation examples.",
    "expectedOutcome": {
      "description": "Increase probability to close by 12% by reassuring the customer with relevant social proof",
      "quantifiedImpact": "12%",
      "impactType": "probability"
    },
    "resources": [
      {
        "type": "document",
        "title": "Enterprise Healthcare Case Study",
        "url": "https://drive.google.com/...",
        "description": "Similar customer, 40% ROI in 6 months"
      }
    ]
  },
  "context": {
    "opportunityId": "opp_456",
    "opportunityStage": "discovery",
    "triggerReason": "Customer email mentioned 'product X' and 'healthcare'",
    "relevanceScore": 0.92
  },
  "generatedBy": {
    "source": "llm",
    "confidence": 0.90,
    "features": ["email_analysis", "content_matching", "industry_healthcare"]
  },
  "priority": "high",
  "urgency": "immediate"
}
```

---

## Unified Action Catalog (Risks + Recommendations)

### Decision: Yes - Implement Unified Catalog

**Name:** `ActionCatalog` (or `InsightCatalog`)

**Rationale:**
1. **Tight Coupling:** Recommendations often mitigate risks
2. **Unified Management:** Single place to manage both
3. **Cross-Referencing:** Easy to link "Recommendation X mitigates Risk Y"
4. **Reduced Duplication:** Shared categories, industries, methodologies
5. **Better Analytics:** Unified reporting on risks + recommendations

### ActionCatalog Schema

```typescript
interface ActionCatalogEntry {
  id: string;                       // action_catalog_{type}_{name}
  partitionKey: string;             // "global" or tenantId
  tenantId?: string;                // null for global, set for tenant-specific
  
  // Classification
  type: "risk" | "recommendation";
  category: string;                 // "budget", "technical", "engagement", etc.
  subcategory?: string;
  
  // Naming
  name: string;                     // Internal name: "budget_not_confirmed"
  displayName: string;              // User-facing: "Budget Not Confirmed"
  description: string;
  
  // Applicability
  applicableIndustries: string[];   // [] = all industries
  applicableStages: string[];       // [] = all stages
  applicableMethodologies: string[];// ["MEDDIC", "Challenger"] or [] = all
  
  // For Risks
  riskDetails?: {
    severity: "low" | "medium" | "high" | "critical";
    impactType: "commercial" | "technical" | "legal" | "competitive" | "timeline" | "resource";
    indicators: string[];           // Signals that indicate this risk
    mitigatingRecommendations: string[]; // Recommendation IDs that mitigate this
  };
  
  // For Recommendations
  recommendationDetails?: {
    recommendationType: "next_action" | "risk_mitigation" | "reactivation" | "content" | "methodology";
    actionTemplate: {
      title: string;
      description: string;
      actionItemsTemplate: string[]; // Parameterized action items
      reasoningTemplate: string;
      expectedOutcomeTemplate: string;
    };
    mitigatesRisks: string[];       // Risk IDs this rec mitigates
    requiredData: string[];         // Data needed to generate this rec
    contentResources?: Array<{      // Associated content
      type: string;
      title: string;
      url?: string;
    }>;
  };
  
  // Decision Rules
  decisionRules?: {
    autoGenerate: boolean;          // Auto-generate when conditions met?
    priority: "critical" | "high" | "medium" | "low";
    urgency: "immediate" | "this_week" | "this_month" | "flexible";
    suppressIfSimilarExists: boolean;
  };
  
  // Analytics
  usage: {
    timesGenerated: number;
    avgFeedbackSentiment: number;   // -1 to 1
    avgActionRate: number;          // % of times acted on
    avgImpact?: number;             // Measured impact
  };
  
  // Lifecycle
  status: "active" | "deprecated" | "draft";
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
```

### Example Catalog Entries

**Risk Entry:**
```json
{
  "id": "action_catalog_risk_budget_not_confirmed",
  "type": "risk",
  "category": "commercial",
  "name": "budget_not_confirmed",
  "displayName": "Budget Not Confirmed",
  "description": "Customer has not confirmed budget availability",
  "applicableStages": ["discovery", "qualification", "proposal"],
  "riskDetails": {
    "severity": "high",
    "impactType": "commercial",
    "indicators": [
      "no_budget_discussion_in_notes",
      "budget_question_unanswered",
      "pricing_not_shared"
    ],
    "mitigatingRecommendations": [
      "rec_confirm_budget",
      "rec_share_pricing",
      "rec_engage_finance"
    ]
  }
}
```

**Recommendation Entry:**
```json
{
  "id": "action_catalog_rec_confirm_budget",
  "type": "recommendation",
  "category": "risk_mitigation",
  "name": "confirm_budget",
  "displayName": "Confirm Budget Availability",
  "description": "Engage customer to confirm budget allocation",
  "applicableStages": ["discovery", "qualification"],
  "recommendationDetails": {
    "recommendationType": "risk_mitigation",
    "actionTemplate": {
      "title": "Confirm Budget with Customer",
      "description": "Schedule a call to discuss budget allocation and approval process",
      "actionItemsTemplate": [
        "Ask: 'Have you allocated budget for this initiative?'",
        "Ask: 'What is the budget approval process?'",
        "Ask: 'Who needs to approve the budget?'"
      ],
      "reasoningTemplate": "Budget confirmation is critical at the {stage} stage. Without budget clarity, deals often stall in later stages.",
      "expectedOutcomeTemplate": "Confirming budget increases close probability by approximately 18% and reduces risk of late-stage stalls."
    },
    "mitigatesRisks": ["risk_budget_not_confirmed"],
    "requiredData": ["opportunity.stage", "opportunity.budget_discussed"],
    "contentResources": [
      {
        "type": "playbook",
        "title": "Budget Discussion Playbook",
        "url": "/playbooks/budget-discussion"
      }
    ]
  },
  "decisionRules": {
    "autoGenerate": true,
    "priority": "high",
    "urgency": "this_week",
    "suppressIfSimilarExists": true
  }
}
```

### Catalog Management Service

```typescript
export class ActionCatalogService {
  constructor(
    private readonly cosmosDBClient: CosmosDBClient,
    private readonly cachingService: CachingService
  ) {}
  
  // CRUD operations
  async getCatalogEntry(entryId: string): Promise<ActionCatalogEntry>
  async createCatalogEntry(entry: ActionCatalogEntry): Promise<ActionCatalogEntry>
  async updateCatalogEntry(entryId: string, updates: Partial<ActionCatalogEntry>): Promise<ActionCatalogEntry>
  async deleteCatalogEntry(entryId: string): Promise<void>
  
  // Query operations
  async getCatalogEntriesByType(type: "risk" | "recommendation"): Promise<ActionCatalogEntry[]>
  async getCatalogEntriesByCategory(category: string): Promise<ActionCatalogEntry[]>
  async getApplicableCatalogEntries(
    type: "risk" | "recommendation",
    context: {
      industry: string;
      stage: string;
      methodology: string;
    }
  ): Promise<ActionCatalogEntry[]>
  
  // Relationship operations
  async getRecommendationsForRisk(riskId: string): Promise<ActionCatalogEntry[]>
  async getRisksMitigatedByRecommendation(recId: string): Promise<ActionCatalogEntry[]>
  
  // Template rendering
  async renderRecommendation(
    catalogEntry: ActionCatalogEntry,
    opportunityContext: OpportunityContext
  ): Promise<Recommendation>
  
  // Analytics
  async updateCatalogUsageStats(entryId: string, feedback: RecommendationFeedback): Promise<void>
  async getCatalogAnalytics(entryId: string): Promise<CatalogAnalytics>
}
```

---

## Database Schemas

### 1. ActionCatalog (Cosmos DB - ActionCatalog container)
See section above for complete schema.

### 2. Recommendation (Cosmos DB - Recommendations container)
See "Recommendation Examples Structure" section for complete schema.

### 3. FeedbackType (Cosmos DB - FeedbackTypes container)

```typescript
interface FeedbackType {
  id: string;                       // feedback_type_{name}
  partitionKey: string;             // "global"
  
  // Identity
  name: string;                     // "act_on_it"
  displayName: string;              // "I will act on it"
  category: "action" | "relevance" | "quality" | "timing" | "other";
  
  // Sentiment
  sentiment: "positive" | "neutral" | "negative";
  sentimentScore: number;           // -1 to 1
  
  // UI
  icon: string;                     // "✓" or emoji
  color: string;                    // Hex color code
  order: number;                    // Display order
  
  // Behavior
  behavior: {
    createsTask: boolean;           // Auto-create task when selected?
    hidesRecommendation: boolean;   // Hide recommendation?
    hideDurationDays?: number;      // How long to hide
    suppressSimilar: boolean;       // Suppress similar recs?
    requiresComment: boolean;       // Force user to add comment?
  };
  
  // Applicability
  applicableToRecTypes: string[];   // [] = all types
  
  // Status
  isActive: boolean;
  isDefault: boolean;               // Is this a default type (always available)?
  
  // Localization (future)
  translations?: Record<string, {
    displayName: string;
    description: string;
  }>;
  
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
```

### 4. GlobalFeedbackConfig (Cosmos DB - Configuration container)

```typescript
interface GlobalFeedbackConfig {
  id: string;                       // "global_feedback_config"
  partitionKey: string;             // "global"
  
  // Limits
  defaultLimit: number;             // Default: 5
  minLimit: number;                 // Min: 3
  maxLimit: number;                 // Max: 10
  
  // Available types
  availableTypes: string[];         // All feedback type IDs
  
  // Defaults
  defaultActiveTypes: string[];     // Default active types for new tenants
  
  // Pattern detection config
  patternDetection: {
    enabled: boolean;
    minSampleSize: number;          // Min feedback count to detect patterns
    thresholds: {
      ignoreRate: number;           // If ignore rate > X, suppress
      actionRate: number;           // If action rate < X, review
    };
  };
  
  updatedAt: Date;
  updatedBy: string;
}
```

### 5. TenantFeedbackConfig (Cosmos DB - TenantConfiguration container)

```typescript
interface TenantFeedbackConfig {
  id: string;                       // tenant_feedback_config_{tenantId}
  partitionKey: string;             // tenantId
  tenantId: string;
  
  // Limit (set by Super Admin)
  activeLimit: number;              // How many types can be active (default 5)
  
  // Active types (selected by Tenant Admin, up to limit)
  activeTypes: Array<{
    feedbackTypeId: string;
    customLabel?: string;           // Optional custom label
    order: number;                  // Display order
  }>;
  
  // Per-recommendation-type config
  perTypeConfig: Record<string, {
    recommendationType: string;
    activeTypes: string[];          // Can override tenant default
  }>;
  
  // Behavior
  requireFeedback: boolean;         // Must provide feedback to dismiss?
  allowComments: boolean;           // Allow text comments?
  commentRequired: boolean;         // Require comment with certain feedback types?
  allowMultipleSelection: boolean;  // Can user select multiple feedback types?
  
  // Pattern detection (tenant-level override)
  patternDetection: {
    enabled: boolean;               // Can Tenant Admin disable?
    autoSuppressEnabled: boolean;   // Auto-suppress based on patterns?
    autoBoostEnabled: boolean;      // Auto-boost based on patterns?
  };
  
  updatedAt: Date;
  updatedBy: string;
}
```

### 6. RecommendationFeedback (Cosmos DB - RecommendationFeedback container)

```typescript
interface RecommendationFeedback {
  id: string;                       // feedback_{recId}_{userId}_{timestamp}
  partitionKey: string;             // tenantId
  tenantId: string;
  
  // References
  recommendationId: string;
  catalogEntryId?: string;          // Link to ActionCatalog
  userId: string;
  
  // Recommendation context (denormalized for analytics)
  recommendation: {
    type: string;
    category: string;
    source: "ml" | "llm" | "rule" | "hybrid";
    confidence: number;
    text: string;                   // Full recommendation text
  };
  
  // Opportunity context (denormalized)
  opportunity: {
    id: string;
    stage: string;
    amount: number;
    probability: number;
    industry: string;
    daysToClose: number;
  };
  
  // User context
  user: {
    id: string;
    role: string;
    teamId: string;
    historicalActionRate: number;
  };
  
  // Feedback
  feedback: {
    type: string;                   // Feedback type ID
    displayName: string;            // For historical reference
    category: string;
    sentiment: "positive" | "neutral" | "negative";
    sentimentScore: number;         // -1 to 1
    comment?: string;
    secondaryTypes?: string[];      // If multiple selection enabled
  };
  
  // Timing
  timing: {
    recommendationGeneratedAt: Date;
    recommendationShownAt: Date;
    feedbackGivenAt: Date;
    timeToFeedbackMs: number;
    timeVisibleMs: number;
  };
  
  // Display context
  display: {
    location: string;
    position: number;
    deviceType: string;
  };
  
  // A/B testing
  abTest?: {
    variant: string;
    testId: string;
  };
  
  // Outcome (filled later by outcome tracking service)
  outcome?: {
    actionTaken: boolean;
    actionTakenAt?: Date;
    actionCompleted: boolean;
    actionCompletedAt?: Date;
    impactMeasured: boolean;
    measuredImpact?: {
      probabilityChange?: number;
      revenueChange?: number;
      timelineChange?: number;
      outcomeAchieved?: boolean;
    };
  };
  
  // Versioning
  version: number;
  previousFeedback?: Array<{
    type: string;
    givenAt: Date;
    comment?: string;
  }>;
  
  // Data Lake sync
  syncedToDataLake: boolean;
  syncedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
  _ts: number;
}
```

### 7. FeedbackAggregation (Cosmos DB - for fast analytics)

```typescript
interface FeedbackAggregation {
  id: string;                       // feedback_agg_{type}_{period}_{date}
  partitionKey: string;             // aggregationType
  
  // Aggregation scope
  aggregationType: "global" | "tenant" | "rec_type" | "catalog_entry" | "user";
  aggregationKey: string;           // tenantId, recType, catalogId, userId
  period: "daily" | "weekly" | "monthly";
  startDate: Date;
  endDate: Date;
  
  // Recommendation metrics
  recommendations: {
    total: number;
    shown: number;
    receivedFeedback: number;
    feedbackRate: number;           // %
  };
  
  // Feedback breakdown
  feedbackByType: Record<string, {
    count: number;
    percentage: number;
  }>;
  
  feedbackBySentiment: {
    positive: number;
    neutral: number;
    negative: number;
    avgSentimentScore: number;
  };
  
  // Action metrics
  actionMetrics: {
    actionIntended: number;         // "I will act on it"
    actionTaken: number;            // Actually acted
    actionCompleted: number;        // Completed
    actionRate: number;             // actionTaken / actionIntended
    completionRate: number;         // actionCompleted / actionTaken
  };
  
  // Impact metrics
  impactMetrics?: {
    avgProbabilityChange: number;
    avgRevenueChange: number;
    outcomesAchieved: number;
    outcomeAchievementRate: number;
  };
  
  // Timing
  avgTimeToFeedbackSeconds: number;
  medianTimeToFeedbackSeconds: number;
  
  // By sub-dimensions
  byRecType?: Record<string, FeedbackStats>;
  byStage?: Record<string, FeedbackStats>;
  byRole?: Record<string, FeedbackStats>;
  
  calculatedAt: Date;
  createdAt: Date;
}

interface FeedbackStats {
  count: number;
  actionRate: number;
  avgSentimentScore: number;
}
```

---

[Continue with remaining sections...]

Let me know if you'd like me to continue with the remaining sections:
- Service Implementation (all methods)
- API Specifications (all endpoints)
- UI Components & Pages
- CAIS Integration (detailed recommendations for each layer)
- Data Lake Integration
- Analytics & Reporting
- Implementation Plan

This document is already at 730 lines. Should I continue, or would you like me to split into separate documents per topic?

