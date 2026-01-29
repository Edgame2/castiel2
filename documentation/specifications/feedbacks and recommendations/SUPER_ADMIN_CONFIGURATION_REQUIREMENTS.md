# Super Admin Configuration Requirements - Complete Specification

**Date:** January 2025  
**Version:** 1.0  
**Status:** Comprehensive Configuration UI Requirements  
**Scope:** ALL configuration options manageable via UI

---

## Executive Summary

The Super Admin must have complete control over the system through a comprehensive UI. This document specifies ALL configuration options that must be available in the Super Admin interface.

### Configuration Categories (10 major areas):
1. **Feedback System Configuration** (25+ feedback types, tenant limits)
2. **Action Catalog Management** (Risks + Recommendations)
3. **Sales Methodology Configuration** (MEDDIC, Challenger, etc.)
4. **ML Model Configuration** (Models, endpoints, thresholds)
5. **Feature Engineering Configuration** (Features, versioning, monitoring)
6. **Decision Rules Configuration** (Rules, actions, priorities)
7. **Tenant Management** (Per-tenant settings, limits, overrides)
8. **System Configuration** (Performance, caching, alerts)
9. **Analytics & Reporting Configuration** (Dashboards, metrics, exports)
10. **Security & Access Control** (Permissions, API keys, audit)

---

## Table of Contents

1. [Feedback System Configuration](#1-feedback-system-configuration)
2. [Action Catalog Management](#2-action-catalog-management)
3. [Sales Methodology Configuration](#3-sales-methodology-configuration)
4. [ML Model Configuration](#4-ml-model-configuration)
5. [Feature Engineering Configuration](#5-feature-engineering-configuration)
6. [Decision Rules Configuration](#6-decision-rules-configuration)
7. [Tenant Management](#7-tenant-management)
8. [System Configuration](#8-system-configuration)
9. [Analytics & Reporting Configuration](#9-analytics--reporting-configuration)
10. [Security & Access Control](#10-security--access-control)
11. [UI Design Specifications](#11-ui-design-specifications)
12. [Implementation Requirements](#12-implementation-requirements)

---

## 1. Feedback System Configuration

### 1.1 Feedback Types Management

**Location:** `/admin/feedback/types`

**Capabilities:**

#### 1.1.1 View All Feedback Types
**UI Component:** Table with sortable columns
```typescript
interface FeedbackTypeTableRow {
  id: string;
  displayName: string;
  category: 'action' | 'relevance' | 'quality' | 'timing';
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;  // -1 to 1
  isActive: boolean;
  isDefault: boolean;
  usageCount: number;  // Times used across all tenants
  lastUsed: Date;
  actions: ['Edit', 'Disable', 'Delete', 'View Usage'];
}
```

**Columns:**
- Display Name
- Category (badge with color)
- Sentiment (icon + score)
- Status (Active/Inactive toggle)
- Default (badge)
- Usage Count (with trend indicator)
- Last Used
- Actions

**Filters:**
- By Category (dropdown)
- By Sentiment (dropdown)
- By Status (Active/Inactive/All)
- By Usage (High/Medium/Low/Unused)
- Search by name

**Sorting:**
- By name (A-Z)
- By usage count (most/least used)
- By last used (recent/oldest)
- By sentiment score

#### 1.1.2 Create New Feedback Type
**UI Component:** Modal form

**Fields:**
```typescript
interface CreateFeedbackTypeForm {
  // Basic Info
  name: string;                    // Internal ID (auto-generated from displayName)
  displayName: string;             // User-facing name
  category: 'action' | 'relevance' | 'quality' | 'timing';
  description: string;             // Help text
  
  // Sentiment
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;          // -1 to 1, slider with presets
  
  // UI Appearance
  icon: string;                    // Icon picker (emoji or icon library)
  color: string;                   // Color picker
  order: number;                   // Display order
  
  // Behavior
  behavior: {
    createsTask: boolean;          // Auto-create task?
    taskTemplate?: string;         // If yes, task template
    
    hidesRecommendation: boolean;  // Hide recommendation?
    hideDurationDays?: number;     // How long to hide (0 = forever)
    
    suppressSimilar: boolean;      // Suppress similar recommendations?
    suppressDurationDays?: number; // How long to suppress
    
    requiresComment: boolean;      // Force user to add comment?
    requiresConfirmation: boolean; // Show confirmation dialog?
    
    notifyOwner: boolean;          // Notify recommendation owner?
    notifyManager: boolean;        // Notify manager?
    
    customWebhook?: string;        // Call webhook on feedback?
  };
  
  // Applicability
  applicableToRecTypes: string[];  // Which recommendation types?
  
  // Status
  isActive: boolean;               // Active by default?
  isDefault: boolean;              // Include in default tenant config?
  
  // Localization (future)
  translations?: Record<string, {
    displayName: string;
    description: string;
  }>;
}
```

**Validation:**
- Display name: Required, 1-50 chars, unique
- Category: Required
- Sentiment score: -1 to 1
- Icon: Required
- Color: Valid hex color
- Hide duration: 0-365 days
- Task template: Required if createsTask=true

**Preview:**
- Live preview of feedback button with selected icon, color, text
- Example notification if notifyOwner=true

#### 1.1.3 Edit Feedback Type
**UI Component:** Same form as Create, pre-populated

**Additional Options:**
- View usage statistics
- View tenants using this type
- Bulk update behavior for all tenants
- Deprecation workflow (if used)

**Change Impact Analysis:**
- Show number of affected tenants
- Show historical usage count
- Warning if changing behavior (affects existing data)
- Option to notify affected tenants

#### 1.1.4 Delete Feedback Type
**UI Component:** Confirmation dialog with impact warning

**Pre-deletion Checks:**
- Cannot delete if currently in use by any tenant
- Cannot delete if default type
- Must be inactive for 30 days before deletion
- Historical data preserved (soft delete)

**Deletion Process:**
1. Check usage (fail if in use)
2. Show impact summary
3. Require confirmation (type feedback name)
4. Archive (soft delete)
5. Notify admins of deletion

#### 1.1.5 Bulk Operations
**UI Component:** Bulk action toolbar

**Operations:**
- Activate selected types
- Deactivate selected types
- Set category for selected
- Set sentiment for selected
- Export selected to JSON
- Import from JSON

---

### 1.2 Global Feedback Configuration

**Location:** `/admin/feedback/global-settings`

**Capabilities:**

#### 1.2.1 Default Limits
```typescript
interface GlobalFeedbackLimits {
  defaultLimit: number;          // Default: 5
  minLimit: number;              // Minimum: 3
  maxLimit: number;              // Maximum: 10
  
  // Can Super Admin override per tenant?
  allowTenantOverride: boolean;  // Default: true
  
  // Default active types for new tenants
  defaultActiveTypes: string[];  // List of feedback type IDs
}
```

**UI:**
- Number inputs with validation
- Slider for visual representation
- Preview of default tenant config
- List of default active types (drag to reorder)
- Button: "Apply to all existing tenants" (with confirmation)

#### 1.2.2 Pattern Detection Settings
```typescript
interface PatternDetectionConfig {
  enabled: boolean;               // Global toggle
  minSampleSize: number;          // Min feedback count for pattern detection
  
  // Thresholds
  thresholds: {
    ignoreRate: number;           // If ignore rate > X%, suppress recommendation
    actionRate: number;           // If action rate < X%, flag for review
    sentimentThreshold: number;   // Avg sentiment < X, flag recommendation
  };
  
  // Actions
  autoSuppressEnabled: boolean;   // Auto-suppress based on patterns?
  autoBoostEnabled: boolean;      // Auto-boost based on patterns?
  notifyOnPattern: boolean;       // Notify admins of detected patterns?
  patternReportFrequency: 'daily' | 'weekly' | 'monthly';
}
```

**UI:**
- Toggle switches for enabled flags
- Number inputs for thresholds with descriptions
- Slider for min sample size
- Preview of pattern detection logic
- Test with historical data button

#### 1.2.3 Feedback Collection Settings
```typescript
interface FeedbackCollectionSettings {
  // Requirement
  requireFeedback: boolean;       // Default: false
  requireFeedbackAfterDays: number; // Require after X days
  
  // Comment settings
  allowComments: boolean;         // Default: true
  maxCommentLength: number;       // Default: 500
  moderateComments: boolean;      // Review before storing?
  
  // Multi-select
  allowMultipleSelection: boolean; // Default: false
  maxSelectionsPerFeedback: number; // Default: 1
  
  // Editing
  allowFeedbackEdit: boolean;     // Can users change feedback?
  editWindowDays: number;         // Days within which edits allowed
  trackFeedbackHistory: boolean;  // Store edit history?
  
  // Privacy
  allowAnonymousFeedback: boolean; // Default: false
  anonymousForNegative: boolean;  // Only negative feedback anonymous?
}
```

**UI:**
- Toggle switches with descriptions
- Number inputs with validation
- Help tooltips explaining implications
- Preview of feedback UI with current settings

---

### 1.3 Tenant-Specific Configuration

**Location:** `/admin/tenants/:tenantId/feedback`

**Capabilities:**

#### 1.3.1 Set Tenant Feedback Limit
**UI Component:** Number input with override controls

```typescript
interface TenantFeedbackLimitConfig {
  tenantId: string;
  
  // Use global or override?
  useGlobalDefault: boolean;
  
  // Override values (if useGlobalDefault = false)
  customLimit?: number;           // 3-10
  
  // Justification
  overrideReason?: string;        // Required for override
  overrideApprovedBy?: string;    // Auto-populated
  overrideDate?: Date;
}
```

**UI:**
- Toggle: "Use global default (5)" vs "Custom limit"
- If custom: Number input (3-10) with validation
- Reason text field (required for custom)
- Show current usage vs limit
- Warning if reducing limit below current usage

#### 1.3.2 Preview Tenant Configuration
**UI Component:** Read-only preview

**Shows:**
- Current active limit
- Active feedback types (with badges)
- Per-recommendation-type overrides
- Pattern detection settings
- Collection settings
- Usage statistics (feedback count, action rate, etc.)

---

## 2. Action Catalog Management

### 2.1 Catalog Entry Management

**Location:** `/admin/catalog`

**Capabilities:**

#### 2.1.1 View All Catalog Entries
**UI Component:** Advanced table with filters

```typescript
interface CatalogEntryTableRow {
  id: string;
  type: 'risk' | 'recommendation' | 'risk_with_recommendation';
  name: string;
  displayName: string;
  category: string;                   // Badge with icon
  scope: 'global' | 'industry' | 'tenant';
  status: 'active' | 'draft' | 'deprecated';
  
  // Applicability
  industries: string[];               // List of industries
  stages: string[];                   // List of stages
  methodologies: string[];            // List of methodologies
  
  // Statistics
  timesGenerated: number;
  avgFeedbackSentiment: number;       // -1 to 1
  avgActionRate: number;              // 0-1
  effectiveness: number;              // 0-1
  
  // Relationships
  linkedEntriesCount: number;         // # of linked risks/recommendations
  
  // Metadata
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  
  actions: ['View', 'Edit', 'Test', 'Duplicate', 'Deprecate', 'Analytics'];
}
```

**Filters:**
- Type (Risk/Recommendation/Both)
- Category (dropdown with icons)
- Scope (Global/Industry/Tenant)
- Status (Active/Draft/Deprecated)
- Industry (multi-select)
- Stage (multi-select)
- Methodology (multi-select)
- Effectiveness (High >0.7 / Medium 0.4-0.7 / Low <0.4)
- Created by (user search)
- Date range

**Advanced Search:**
- Full-text search across name, description, reasoning
- Regex support
- Search within linked entries

**Bulk Operations:**
- Activate/Deactivate selected
- Change category
- Export to JSON
- Duplicate selected
- Bulk deprecation

**Views:**
- Table view (default)
- Card view (with previews)
- Relationship graph view (visual links)
- Timeline view (by creation date)

#### 2.1.2 Create Risk Entry
**UI Component:** Multi-step form wizard

**Step 1: Basic Information**
```typescript
{
  name: string;                      // Internal ID
  displayName: string;               // User-facing name
  description: string;               // Rich text editor
  category: string;                  // Select from categories
  subcategory?: string;              // Optional subcategory
}
```

**Step 2: Risk Details**
```typescript
{
  severity: 'low' | 'medium' | 'high' | 'critical';
  impactType: 'commercial' | 'technical' | 'legal' | 'competitive' | 'timeline' | 'resource';
  
  // Detection Indicators
  indicators: Array<{
    type: 'missing_field' | 'pattern' | 'anomaly' | 'threshold' | 'ai_detected';
    
    // If type = missing_field
    field?: string;                  // Field selector from opportunity schema
    
    // If type = pattern
    pattern?: string;                // Regex or pattern builder
    
    // If type = threshold
    threshold?: {
      metric: string;                // Metric selector
      operator: '>' | '<' | '=' | '>=' | '<=';
      value: number;
    };
    
    description: string;
  }>;
  
  // Impact Assessment
  impact: {
    probabilityDecrease?: number;    // % decrease in win probability
    revenueAtRisk?: number;          // $ amount at risk
    timelineDelay?: number;          // Days of delay
    description: string;             // Rich text
  };
  
  // ML Features (auto-suggest based on indicators)
  mlFeatures?: string[];             // Select from available features
  mlThreshold?: number;              // Feature value threshold
}
```

**UI Features:**
- Indicator builder with visual UI (no code)
- Field selector with autocomplete from schema
- Pattern tester (test regex against sample data)
- Threshold calculator (show distribution of metric)
- Impact calculator (predict based on historical data)
- ML feature suggestions (based on indicators)

**Step 3: Applicability**
```typescript
{
  industries: string[];              // Multi-select
  stages: string[];                  // Multi-select
  methodologies: string[];           // Multi-select
  opportunityTypes: string[];        // new_business, renewal, expansion
  minAmount?: number;                // Only for opps > $X
  maxAmount?: number;                // Only for opps < $X
}
```

**UI Features:**
- Smart defaults based on category
- Bulk select (all industries, all stages)
- Preview: "This risk will apply to X% of opportunities"

**Step 4: Decision Rules** (Optional)
```typescript
{
  autoDetect: boolean;               // Auto-detect this risk?
  detectionRules: Array<{
    condition: string;               // Visual rule builder
    priority: number;
    cooldownPeriod?: number;         // Days before detecting again
  }>;
  
  notificationRules: {
    notifyOwner: boolean;
    notifyManager: boolean;
    escalateIfCritical: boolean;
    escalationDelayHours: number;
  };
}
```

**UI Features:**
- Visual rule builder (drag-and-drop conditions)
- Rule tester (test against sample opportunities)
- Notification preview

**Step 5: Review & Create**
- Summary of all configurations
- Preview of risk detection
- Test with sample data
- Buttons: "Save as Draft" | "Activate" | "Cancel"

#### 2.1.3 Create Recommendation Entry
**UI Component:** Multi-step form wizard (similar to Risk)

**Step 1: Basic Information** (same as Risk)

**Step 2: Recommendation Details**
```typescript
{
  action: string;                    // Main action (rich text)
  actionType: 'meeting' | 'email' | 'task' | 'document' | 'question' | 'analysis';
  
  // Questions to Ask (if actionType includes 'question')
  questions?: Array<{
    question: string;                // Parameterized: "What is {customer_name}'s budget?"
    purpose: string;
    expectedAnswer?: string;
    
    // MEDDIC Component (if applicable)
    meddic?: {
      component: 'metrics' | 'economic_buyer' | 'decision_criteria' | 'decision_process' | 'identify_pain' | 'champion' | 'competition';
    };
  }>;
  
  // Content Resources
  resources?: Array<{
    type: 'document' | 'template' | 'playbook' | 'presentation' | 'case_study' | 'video' | 'article';
    name: string;
    url?: string;                    // Direct URL or catalog reference
    catalogId?: string;              // Reference to content catalog
    reason: string;                  // Why share this
    timing?: string;                 // When to share (e.g., "After demo")
  }>;
  
  // Reasoning
  reasoning: string;                 // Parameterized rich text
  
  // Expected Outcome
  expectedOutcome: {
    description: string;
    quantifiedImpact?: string;       // "+15% probability", "$50K revenue"
    impactType: 'probability' | 'revenue' | 'timeline' | 'risk_reduction' | 'efficiency';
    confidence: 'low' | 'medium' | 'high';
    evidence?: string;               // Historical data
  };
  
  // Implementation
  implementation: {
    effort: 'low' | 'medium' | 'high';
    complexity: 'simple' | 'moderate' | 'complex';
    estimatedTime?: string;          // "30 minutes", "1 hour"
    prerequisites?: string[];
    skillsRequired?: string[];
  };
  
  // Priority
  priority: 'critical' | 'high' | 'medium' | 'low';
  urgency: 'immediate' | 'this_week' | 'this_month' | 'flexible';
  
  // Template Parameters
  parameters?: Array<{
    name: string;                    // e.g., "customer_name"
    source: string;                  // e.g., "opportunity.account.name"
    defaultValue?: string;
    required: boolean;
  }>;
}
```

**UI Features:**
- **Question Builder:**
  - Add multiple questions
  - Drag to reorder
  - Parameter insertion (autocomplete from opportunity schema)
  - MEDDIC component tagging
  - Purpose field with suggestions
  
- **Resource Manager:**
  - Upload documents
  - Link to existing content catalog
  - Preview resources
  - Set sharing timing
  
- **Template Editor:**
  - Rich text editor with parameter support
  - Parameter autocomplete: Type `{` to see available parameters
  - Live preview with sample data
  - Validation of parameters
  
- **Outcome Calculator:**
  - Historical impact analysis
  - Confidence calculator based on sample size
  - Evidence linker (link to studies, past successes)
  
- **Parameter Manager:**
  - Auto-detect parameters in templates
  - Map to opportunity schema fields
  - Set defaults and requirements
  - Test parameter resolution

**Step 3: Risk Linkage** (Connect to Risks)
```typescript
{
  mitigatesRisks: Array<{
    riskId: string;                  // Select from risk catalog
    relationship: 'mitigates' | 'addresses' | 'prevents' | 'detects';
    effectiveness: number;           // 0-1, how effective
    evidenceCount?: number;          // Times this worked
  }>;
}
```

**UI Features:**
- Risk selector (filterable, searchable)
- Relationship type selector with descriptions
- Effectiveness slider with calculator
- Preview of linked risk details
- Bulk link (link to multiple risks)

**Step 4: Applicability** (same as Risk)

**Step 5: Decision Rules**
```typescript
{
  autoGenerate: boolean;             // Auto-generate this recommendation?
  
  conditions: Array<{
    type: 'risk_detected' | 'threshold' | 'stage' | 'timing' | 'pattern';
    config: Record<string, any>;
  }>;
  
  suppressIfSimilarExists: boolean;
  cooldownPeriod?: number;           // Days
  maxOccurrences?: number;           // Max times to show
}
```

**UI Features:**
- Visual condition builder
- Test conditions against sample data
- Suppression logic tester
- Cooldown calculator

**Step 6: Review & Create** (same as Risk)

#### 2.1.4 Create Unified Entry (Risk + Recommendation)
**UI Component:** Combined wizard (Steps from both above)

**Unique Features:**
- Automatic bi-directional linking
- Consistency checks (risk severity vs recommendation priority)
- Combined testing (risk detection → recommendation generation)

#### 2.1.5 Edit Catalog Entry
**UI Component:** Same form as Create, pre-populated

**Additional Features:**
- Version history viewer
- Change impact analysis
- Rollback to previous version
- Compare versions (diff view)
- Test changes before saving

**Change Impact:**
- Show affected tenants
- Show linked entries
- Show active recommendations using this entry
- Estimate impact on accuracy

**Version Control:**
- Auto-increment version on save
- Store previousVersionId
- Deprecation workflow if breaking changes
- Migration guide for tenants

#### 2.1.6 Test Catalog Entry
**UI Component:** Testing playground

**Features:**
- **Input Sample Data:**
  - Upload sample opportunity JSON
  - Select from real opportunities
  - Generate synthetic data
  
- **Test Risk Detection:**
  - Show which indicators trigger
  - Show ML feature values
  - Show detection confidence
  - Test against multiple opportunities (batch)
  
- **Test Recommendation Generation:**
  - Show rendered template
  - Show parameter resolution
  - Show final recommendation text
  - Test against multiple contexts
  
- **Test Outcomes:**
  - Historical success rate
  - Average feedback sentiment
  - Action rate
  - Effectiveness score

**Test Results:**
- Pass/Fail for each test
- Detailed logs
- Performance metrics (execution time)
- Suggestions for improvement

#### 2.1.7 Analytics Per Entry
**UI Component:** Dedicated analytics page

**Metrics:**
- Usage over time (line chart)
- Feedback sentiment distribution (pie chart)
- Action rate by stage, industry, role (bar charts)
- Effectiveness score trend (line chart)
- Top parameters used (table)
- Linked entries performance (comparison table)
- User engagement (heatmap by tenant)

**Exports:**
- Export analytics to PDF
- Export raw data to CSV
- Schedule automated reports

---

### 2.2 Category Management

**Location:** `/admin/catalog/categories`

**Capabilities:**

#### 2.2.1 View All Categories
**UI Component:** Card grid with icons

```typescript
interface CategoryCard {
  id: string;
  displayName: string;
  type: 'risk' | 'recommendation' | 'both';
  icon: string;                      // Emoji or icon
  color: string;                     // Hex color
  description: string;
  order: number;                     // Display order
  
  // Statistics
  entriesCount: number;              // # of entries in this category
  activeEntriesCount: number;
  avgEffectiveness: number;
  
  actions: ['Edit', 'Reorder', 'Delete'];
}
```

**Operations:**
- Drag-and-drop to reorder
- Create new category
- Edit category (name, icon, color, description)
- Delete category (with reassignment of entries)
- Merge categories

#### 2.2.2 Create/Edit Category
**UI Component:** Modal form

**Fields:**
- Display Name
- Type (Risk/Recommendation/Both)
- Icon (icon picker with search)
- Color (color picker with presets)
- Description (rich text)
- Order (auto-assigned, editable)

---

### 2.3 Relationship Management

**Location:** `/admin/catalog/relationships`

**Capabilities:**

#### 2.3.1 Visual Relationship Graph
**UI Component:** Interactive graph visualization

**Features:**
- Nodes: Catalog entries (risks + recommendations)
- Edges: Relationships (mitigates, addresses, etc.)
- Color-coded by type, category
- Size by effectiveness
- Clickable nodes (open entry details)
- Zoom, pan, filter
- Export as image

#### 2.3.2 Relationship Editor
**UI Component:** Drag-and-drop interface

**Features:**
- Drag risk onto recommendation to create link
- Edit link properties (relationship type, effectiveness)
- Bulk link (link one risk to multiple recommendations)
- Auto-suggest links (ML-based recommendations)
- Validate relationships (detect conflicts)

#### 2.3.3 Relationship Analytics
**Metrics:**
- Most effective risk-recommendation pairs
- Orphaned entries (no links)
- Weak links (low effectiveness)
- Circular relationships (detect and warn)
- Coverage analysis (risks without recommendations)

---

### 2.4 Bulk Operations

**Location:** Bulk action toolbar on `/admin/catalog`

**Operations:**

#### 2.4.1 Import Catalog
**UI Component:** Import wizard

**Features:**
- Upload JSON file (batch of entries)
- Upload CSV (simplified format)
- Import from another tenant
- Validation before import
- Preview imported entries
- Conflict resolution (skip, overwrite, merge)

**JSON Schema:**
```json
{
  "entries": [
    {
      "type": "risk",
      "name": "budget_not_confirmed",
      // ... full entry
    }
  ]
}
```

#### 2.4.2 Export Catalog
**UI Component:** Export dialog

**Options:**
- Export all or selected
- Export format (JSON, CSV, Excel)
- Include relationships (yes/no)
- Include statistics (yes/no)
- Include version history (yes/no)

#### 2.4.3 Duplicate Entries
**UI Component:** Duplication wizard

**Options:**
- Duplicate to same tenant (with suffix)
- Duplicate to another tenant
- Duplicate as template (remove tenant-specific)
- Bulk duplicate with modifications

#### 2.4.4 Mass Deprecation
**UI Component:** Deprecation workflow

**Features:**
- Select multiple entries
- Set deprecation reason
- Set replacement entries
- Notification to affected tenants
- Grace period before full deprecation

---

## 3. Sales Methodology Configuration

### 3.1 Methodology Management

**Location:** `/admin/methodologies`

**Capabilities:**

#### 3.1.1 View All Methodologies
**UI Component:** Card grid

```typescript
interface MethodologyCard {
  id: string;
  name: string;                      // MEDDIC, Challenger, etc.
  type: 'standard' | 'custom';
  description: string;
  
  // Configuration
  stages: number;                    // # of stages
  requiredFields: number;            // # of required fields
  exitCriteria: number;              // # of exit criteria
  
  // Usage
  tenantsUsing: number;              // # of tenants using
  activeOpportunities: number;       // # of active opps
  avgComplianceScore: number;        // 0-1
  
  actions: ['View', 'Edit', 'Duplicate', 'Delete'];
}
```

**Standard Methodologies (Pre-configured):**
- MEDDIC
- MEDDPICC
- Challenger
- Sandler
- SPIN
- Custom (tenant-defined)

#### 3.1.2 View/Edit Methodology
**UI Component:** Tabbed configuration interface

**Tab 1: Basic Info**
```typescript
{
  name: string;
  displayName: string;
  description: string;
  type: 'standard' | 'custom';
  isActive: boolean;
  isDefault: boolean;              // Default for new tenants
}
```

**Tab 2: Stages**
```typescript
{
  stages: Array<{
    stageId: string;
    stageName: string;
    order: number;
    
    // Requirements
    requirements: Array<{
      requirementId: string;
      name: string;
      mandatory: boolean;
      validationRule?: string;     // Custom validation
    }>;
    
    // Exit Criteria
    exitCriteria: Array<{
      criteriaId: string;
      description: string;
      mandatory: boolean;
    }>;
    
    // Timing
    typicalDurationDays: {
      min: number;
      avg: number;
      max: number;
    };
    
    // Expected Activities
    expectedActivities: string[];
  }>;
}
```

**UI Features:**
- Drag-and-drop to reorder stages
- Add/remove stages
- Stage template library
- Duration calculator (based on historical data)

**Tab 3: Required Fields**
```typescript
{
  requiredFields: Array<{
    fieldName: string;               // From opportunity schema
    stages: string[];                // Which stages require this
    dataType: string;
    defaultValue?: any;
    validationRule?: string;
  }>;
}
```

**UI Features:**
- Field selector from opportunity schema
- Stage selector (multi-select)
- Validation rule builder
- Test validation rules

**Tab 4: Risks** (Methodology-specific risks)
```typescript
{
  risks: Array<{
    riskId: string;                  // Link to catalog
    stage: string;                   // Which stage
    description: string;
    severity: string;
  }>;
}
```

**UI Features:**
- Link to risk catalog
- Auto-suggest risks for methodology
- Stage assignment

**Tab 5: Integration** (How to use in CAIS)
```typescript
{
  featureEngineering: {
    enabled: boolean;
    features: string[];              // List of methodology features
  };
  
  riskDetection: {
    enabled: boolean;
    detectNonCompliance: boolean;
  };
  
  recommendations: {
    enabled: boolean;
    suggestMissingSteps: boolean;
  };
}
```

#### 3.1.3 Create Custom Methodology
**UI Component:** Wizard (similar to Create Catalog Entry)

**Steps:**
1. Basic Info
2. Define Stages (drag-and-drop builder)
3. Set Requirements per Stage
4. Define Exit Criteria
5. Map to Opportunity Fields
6. Configure Risks
7. Test & Activate

#### 3.1.4 MEDDIC Component Mapper
**UI Component:** Interactive mapper

**Purpose:** Map opportunity fields to MEDDIC components

```typescript
{
  meddic: {
    metrics: {                       // What metrics matter?
      fields: string[];              // Which opportunity fields
      required: boolean;
      validationRule?: string;
    };
    
    economicBuyer: {                 // Who has budget?
      fields: string[];
      required: boolean;
    };
    
    decisionCriteria: {              // What criteria for decision?
      fields: string[];
      required: boolean;
    };
    
    decisionProcess: {               // What's the process?
      fields: string[];
      required: boolean;
    };
    
    identifyPain: {                  // What pain are we solving?
      fields: string[];
      required: boolean;
    };
    
    champion: {                      // Who's our champion?
      fields: string[];
      required: boolean;
    };
    
    competition: {                   // Who's competing?
      fields: string[];
      required: boolean;
    };
  }
}
```

**UI Features:**
- Visual mapping interface
- Field selector with autocomplete
- Validation tester
- MEDDIC score calculator

---

### 3.2 Tenant Methodology Assignment

**Location:** `/admin/tenants/:tenantId/methodology`

**Capabilities:**

#### 3.2.1 Assign Methodology
**UI Component:** Dropdown selector

**Options:**
- Select methodology (from available)
- Customize stages (optional)
- Override requirements (optional)
- Set compliance thresholds

#### 3.2.2 Compliance Monitoring
**UI Component:** Compliance dashboard

**Metrics:**
- Overall compliance score (0-100%)
- Compliance by stage
- Common non-compliance issues
- Recommendations for improvement

---

## 4. ML Model Configuration

### 4.1 Model Management

**Location:** `/admin/ml/models`

**Capabilities:**

#### 4.1.1 View All Models
**UI Component:** Table with detailed status

```typescript
interface ModelTableRow {
  id: string;
  name: string;                      // risk-scoring-model
  type: 'risk_scoring' | 'win_probability' | 'forecasting' | 'recommendation_ranking';
  variant: 'global' | string;        // 'global' or industry name
  
  // Status
  status: 'active' | 'inactive' | 'training' | 'testing' | 'deprecated';
  version: string;                   // v1.2.3
  deployedAt: Date;
  
  // Azure ML
  azureEndpoint: string;
  azureResourceId: string;
  
  // Performance
  accuracy: number;                  // 0-1
  latencyP95: number;                // ms
  requestsPerDay: number;
  errorRate: number;                 // 0-1
  
  // Training
  lastTrainedAt: Date;
  nextRetrainingAt: Date;
  trainingDataSize: number;          // # of examples
  
  actions: ['View', 'Edit', 'Test', 'Retrain', 'Deploy', 'Rollback', 'Delete'];
}
```

**Filters:**
- Model type
- Variant (global vs industry)
- Status
- Performance (High/Medium/Low)
- Error rate (threshold)

#### 4.1.2 View Model Details
**UI Component:** Detailed model page with tabs

**Tab 1: Overview**
- Model name, type, variant
- Status and version
- Deployment info (Azure ML endpoint, resource ID)
- Quick stats (accuracy, latency, errors)

**Tab 2: Performance**
```typescript
{
  // Accuracy Metrics
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  rocAuc: number;
  
  // Calibration (for probability models)
  brierScore: number;
  calibrationError: number;
  
  // Latency
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
  
  // Throughput
  requestsPerSecond: number;
  maxRequestsPerSecond: number;
  
  // Reliability
  errorRate: number;
  availabilityPercent: number;
  circuitBreakerTrips: number;
}
```

**Charts:**
- Accuracy over time (line chart)
- Latency distribution (histogram)
- Error rate trend (line chart)
- Calibration plot (reliability diagram)
- Confusion matrix (for classification)
- Feature importance (bar chart)

**Tab 3: Training Configuration**
```typescript
{
  // Data
  trainingDataSource: string;        // Azure ML Datastore path
  trainingDataSize: number;
  testDataSize: number;
  
  // Hyperparameters
  hyperparameters: Record<string, any>;
  
  // Training Job
  lastTrainingJob: {
    jobId: string;
    startedAt: Date;
    completedAt: Date;
    duration: number;                // seconds
    status: 'success' | 'failed';
    metrics: Record<string, number>;
  };
  
  // Retraining Schedule
  retrainingSchedule: 'manual' | 'scheduled' | 'trigger-based';
  scheduledFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  triggerConditions?: Array<{
    metric: string;
    operator: string;
    threshold: number;
  }>;
}
```

**Tab 4: Deployment**
```typescript
{
  // Azure ML
  azureEndpoint: string;
  azureDeploymentId: string;
  azureResourceGroup: string;
  azureRegion: string;
  
  // Scaling
  minInstances: number;
  maxInstances: number;
  currentInstances: number;
  autoScalingEnabled: boolean;
  
  // Rollout Strategy
  deploymentStrategy: 'blue-green' | 'canary' | 'rolling';
  trafficPercentage: number;         // For canary
  rolloutSchedule?: Date[];          // For rolling
  
  // Health Checks
  healthCheckInterval: number;       // seconds
  healthCheckTimeout: number;
  failureThreshold: number;
  successThreshold: number;
}
```

**Tab 5: A/B Testing**
```typescript
{
  abTestEnabled: boolean;
  champion: string;                  // Model ID
  challenger: string;                // Model ID
  
  trafficSplit: {
    champion: number;                // % traffic
    challenger: number;
  };
  
  testStartedAt: Date;
  testDuration: number;              // days
  testMetrics: {
    championAccuracy: number;
    challengerAccuracy: number;
    championLatency: number;
    challengerLatency: number;
    statisticalSignificance: number; // p-value
  };
  
  autoPromoteThreshold: number;      // If challenger better by X%, auto-promote
}
```

**Tab 6: Feature Importance**
- List of features with importance scores
- SHAP values (if available)
- Feature drift detection
- Feature correlation matrix

#### 4.1.3 Create/Register Model
**UI Component:** Multi-step wizard

**Step 1: Basic Info**
- Model name
- Model type
- Variant (global or industry)
- Description

**Step 2: Azure ML Configuration**
- Azure ML Workspace
- Model artifact path
- Endpoint configuration
- Authentication

**Step 3: Deployment Settings**
- Min/max instances
- Scaling rules
- Deployment strategy
- Health check configuration

**Step 4: Performance Thresholds**
- Minimum accuracy
- Maximum latency (p95)
- Maximum error rate
- Alerting rules

**Step 5: Retraining Configuration**
- Schedule (manual/scheduled/trigger-based)
- Trigger conditions
- Training data source
- Hyperparameters

**Step 6: Deploy**
- Deploy to staging
- Test in staging
- Deploy to production

#### 4.1.4 Edit Model Configuration
**UI Component:** Same form as Create, pre-populated

**Change Management:**
- Changes require approval (if production model)
- Impact analysis before change
- Rollback plan required
- Validation in staging before production

#### 4.1.5 Test Model
**UI Component:** Model testing playground

**Test Types:**

**1. Single Prediction:**
- Input: Opportunity features (JSON or form)
- Output: Prediction with confidence
- Latency measurement
- Compare with champion model

**2. Batch Testing:**
- Upload CSV of opportunities
- Bulk predictions
- Aggregate metrics
- Export results

**3. Performance Testing:**
- Load testing (concurrent requests)
- Stress testing (find breaking point)
- Latency testing (p50, p95, p99)
- Error rate testing

**4. Comparison Testing:**
- Compare multiple models
- Side-by-side predictions
- Performance comparison
- Recommendation: Which model to use

#### 4.1.6 Retrain Model
**UI Component:** Retraining wizard

**Options:**

**Manual Retraining:**
1. Select training data range
2. Configure hyperparameters
3. Start training job
4. Monitor progress
5. Evaluate results
6. Deploy if better

**Scheduled Retraining:**
- Set schedule (frequency)
- Auto-trigger conditions
- Notification settings
- Auto-deploy rules

**Drift-Triggered Retraining:**
- Drift thresholds
- Auto-retrain on drift
- Alert before retraining

#### 4.1.7 A/B Test Model
**UI Component:** A/B test configuration

**Setup:**
1. Select champion (current model)
2. Select challenger (new model)
3. Configure traffic split (e.g., 90/10, 50/50)
4. Set test duration (days)
5. Define success metrics
6. Set auto-promotion rules
7. Start A/B test

**Monitoring:**
- Real-time metrics comparison
- Statistical significance calculator
- Recommendation: Promote/reject challenger
- Manual override option

#### 4.1.8 Rollback Model
**UI Component:** Rollback dialog

**Options:**
- Rollback to previous version (instant)
- Rollback to specific version (from history)
- Partial rollback (reduce traffic to 0%)
- Schedule rollback (at specific time)

**Safety Checks:**
- Confirm rollback (type model name)
- Show impact (# of affected requests)
- Notification (alert team)

---

### 4.2 Endpoint Management

**Location:** `/admin/ml/endpoints`

**Capabilities:**

#### 4.2.1 View All Endpoints
**UI Component:** Table

```typescript
interface EndpointTableRow {
  id: string;
  name: string;
  url: string;
  status: 'online' | 'offline' | 'degraded';
  
  // Associated Models
  models: string[];                  // Model IDs using this endpoint
  
  // Performance
  latencyP95: number;
  errorRate: number;
  requestsPerDay: number;
  
  // Health
  lastHealthCheck: Date;
  healthCheckStatus: 'pass' | 'fail';
  
  actions: ['Test', 'Edit', 'Disable'];
}
```

#### 4.2.2 Test Endpoint
**UI Component:** Endpoint tester

**Tests:**
- Connectivity test (ping)
- Authentication test
- Sample prediction request
- Load test (concurrent requests)
- Health check endpoint test

---

### 4.3 Feature Store Configuration

**Location:** `/admin/ml/features`

**Capabilities:**

#### 4.3.1 View All Features
**UI Component:** Table

```typescript
interface FeatureTableRow {
  name: string;
  category: string;
  version: string;                   // v1.2
  dataType: string;
  
  // Status
  isActive: boolean;
  isDeprecated: boolean;
  
  // Quality
  missingRate: number;               // %
  outlierRate: number;               // %
  driftScore: number;                // KS statistic
  
  // Usage
  modelsUsing: string[];             // Model IDs
  
  // Performance
  extractionTime: number;            // ms
  cacheHitRate: number;              // %
  
  actions: ['View', 'Edit', 'Test', 'Deprecate'];
}
```

#### 4.3.2 Feature Configuration
**UI Component:** Feature detail page

**Configuration:**
```typescript
{
  name: string;
  category: string;
  version: string;
  dataType: string;
  
  // Extraction
  extractionLogic: string;           // Code or config
  dependencies: string[];            // Required features
  
  // Transformation
  transformation?: {
    type: 'normalize' | 'encode' | 'log' | 'custom';
    config: Record<string, any>;
  };
  
  // Quality
  qualityChecks: {
    checkMissingRate: boolean;
    missingRateThreshold: number;
    
    checkOutliers: boolean;
    outlierMethod: 'iqr' | 'zscore' | 'isolation_forest';
    
    checkDrift: boolean;
    driftMethod: 'ks' | 'chi2' | 'psi';
    driftThreshold: number;
  };
  
  // Caching
  cachingEnabled: boolean;
  cacheTTL: number;                  // seconds
  
  // Versioning
  backwardCompatible: boolean;
  breakingChange: boolean;
  migrationGuide?: string;
}
```

**Actions:**
- Edit configuration
- Test extraction
- View quality metrics
- Deprecate feature

---

### 4.4 Model Monitoring & Alerts

**Location:** `/admin/ml/monitoring`

**Capabilities:**

#### 4.4.1 Model Health Dashboard
**UI Component:** Dashboard with widgets

**Widgets:**
- Model status overview (cards)
- Accuracy trend (line chart)
- Latency distribution (histogram)
- Error rate trend (line chart)
- Request volume (line chart)
- Top errors (table)
- Drift alerts (list)

#### 4.4.2 Alert Configuration
**UI Component:** Alert rules manager

**Alert Rules:**
```typescript
interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  
  // Condition
  metric: string;                    // accuracy, latency, error_rate, etc.
  operator: '>' | '<' | '=' | '>=' | '<=';
  threshold: number;
  duration: number;                  // seconds (alert if condition true for X seconds)
  
  // Scope
  modelIds: string[];                // Which models (empty = all)
  
  // Actions
  actions: Array<{
    type: 'email' | 'slack' | 'pagerduty' | 'webhook';
    config: Record<string, any>;
  }>;
  
  // Severity
  severity: 'critical' | 'high' | 'medium' | 'low';
  
  // Throttling
  throttleMinutes: number;           // Don't alert more than once per X minutes
}
```

**Pre-configured Alerts:**
- Accuracy drop >5%
- Latency p95 >2000ms
- Error rate >5%
- Drift detected (KS >0.1)
- Model offline
- Circuit breaker open

**Custom Alerts:**
- Add custom alert rules
- Complex conditions (AND, OR)
- Multi-metric alerts

---

## 5. Feature Engineering Configuration

### 5.1 Feature Management

**Location:** `/admin/features`

**(Covered in section 4.3 above)**

### 5.2 Feature Versioning

**Location:** `/admin/features/versioning`

**Capabilities:**

#### 5.2.1 Version History
**UI Component:** Timeline view

**Display:**
- All feature versions
- Version changes (diff view)
- Breaking vs non-breaking changes
- Models using each version

#### 5.2.2 Version Policy
**UI Component:** Policy configuration

**Settings:**
```typescript
{
  versioningStrategy: 'semantic' | 'timestamp' | 'hash';
  
  backwardCompatibility: {
    enforceCompatibility: boolean;
    allowBreakingChanges: boolean;
    requireMigrationGuide: boolean;
  };
  
  deprecationPolicy: {
    deprecationNoticeDays: number;   // Days before deprecation
    supportOldVersionsDays: number;  // Days to support old versions
    autoMigrate: boolean;            // Auto-migrate to new version
  };
}
```

---

### 5.3 Feature Quality Monitoring

**Location:** `/admin/features/quality`

**Capabilities:**

#### 5.3.1 Quality Dashboard
**UI Component:** Dashboard

**Metrics per Feature:**
- Missing rate over time
- Outlier rate over time
- Distribution drift (KS statistic)
- Feature importance over time

**Alerts:**
- Missing rate spike
- Outlier rate spike
- Distribution drift detected
- Feature importance drop

#### 5.3.2 Quality Rules
**UI Component:** Rules configuration

**Per Feature:**
- Missing rate threshold
- Outlier detection method
- Drift detection method and threshold
- Alert settings

---

## 6. Decision Rules Configuration

### 6.1 Rule Management

**Location:** `/admin/rules`

**Capabilities:**

#### 6.1.1 View All Rules
**UI Component:** Table with status

```typescript
interface RuleTableRow {
  id: string;
  name: string;
  description: string;
  type: 'ml_based' | 'catalog_based' | 'business' | 'custom';
  
  // Condition
  condition: string;                 // Human-readable condition
  
  // Action
  actions: string[];                 // List of actions
  
  // Status
  isActive: boolean;
  priority: number;                  // Higher = evaluated first
  
  // Performance
  timesTriggered: number;
  avgExecutionTime: number;          // ms
  errorRate: number;
  
  actions: ['View', 'Edit', 'Test', 'Disable', 'Delete'];
}
```

#### 6.1.2 Create/Edit Rule
**UI Component:** Visual rule builder

**Step 1: Condition Builder**
```typescript
{
  condition: {
    type: 'simple' | 'complex';
    
    // Simple condition
    simple?: {
      field: string;                 // opportunity.amount
      operator: '>' | '<' | '=' | 'contains' | 'matches';
      value: any;
    };
    
    // Complex condition (multiple conditions)
    complex?: {
      operator: 'AND' | 'OR';
      conditions: Condition[];       // Recursive
    };
  };
}
```

**UI Features:**
- Drag-and-drop condition builder
- Field selector (autocomplete)
- Operator selector
- Value input (type-aware)
- Nested conditions (AND/OR groups)
- Test condition against sample data

**Step 2: Action Builder**
```typescript
{
  actions: Array<{
    type: 'crm_update' | 'notification' | 'task' | 'email' | 'webhook' | 'custom';
    
    // If crm_update
    crmUpdate?: {
      field: string;
      value: any;
    };
    
    // If notification
    notification?: {
      recipients: string[];          // User IDs or roles
      channel: 'email' | 'slack' | 'in-app';
      template: string;
      priority: 'critical' | 'high' | 'normal';
    };
    
    // If task
    task?: {
      title: string;
      description: string;
      assignedTo: string;            // User ID or role
      dueDate: string;               // Relative: "+3 days"
      priority: string;
    };
    
    // If webhook
    webhook?: {
      url: string;
      method: 'POST' | 'PUT';
      headers: Record<string, string>;
      body: Record<string, any>;
    };
  }>;
}
```

**UI Features:**
- Action type selector
- Action configuration (type-specific forms)
- Drag to reorder actions
- Test action execution

**Step 3: Configuration**
```typescript
{
  priority: number;                  // 1-100
  isActive: boolean;
  
  // Execution
  executeSequentially: boolean;      // Wait for each action to complete
  continueOnError: boolean;          // Continue if action fails
  
  // Throttling
  throttle: {
    enabled: boolean;
    maxExecutionsPerDay: number;
    cooldownMinutes: number;         // Min time between executions
  };
  
  // Conflict Resolution
  conflictResolution: 'first' | 'last' | 'highest_priority' | 'all';
}
```

**Step 4: Review & Test**
- Summary of rule
- Test against sample opportunities
- Estimate impact (# of opportunities affected)
- Save as draft or activate

#### 6.1.3 Rule Testing
**UI Component:** Testing playground

**Tests:**
- Test condition (does it match?)
- Test actions (do they execute?)
- Performance test (execution time)
- Conflict test (check for conflicts with other rules)

---

### 6.2 Rule Templates

**Location:** `/admin/rules/templates`

**Capabilities:**

#### 6.2.1 View Templates
**UI Component:** Card grid

**Pre-configured Templates:**
- "Mark high-value, low-risk opportunities as hot"
- "Escalate stalled opportunities"
- "Notify on competitor detected"
- "Create task when stage changes"
- "Alert on risk spike"

#### 6.2.2 Create Template
**UI Component:** Same as Create Rule

**Additional:**
- Template name
- Template description
- Parameters (configurable values)
- Example use cases

---

### 6.3 Conflict Detection

**Location:** `/admin/rules/conflicts`

**Capabilities:**

#### 6.3.1 View Conflicts
**UI Component:** Conflict list

**Conflict Types:**
- Contradictory actions (two rules set same field to different values)
- Circular dependencies
- Overlapping conditions (redundant rules)
- Priority conflicts

#### 6.3.2 Resolve Conflicts
**UI Component:** Conflict resolution wizard

**Resolution Options:**
- Change priority
- Disable one rule
- Merge rules
- Add conflict resolution strategy

---

## 7. Tenant Management

### 7.1 Tenant Configuration

**Location:** `/admin/tenants`

**Capabilities:**

#### 7.1.1 View All Tenants
**UI Component:** Table

```typescript
interface TenantTableRow {
  id: string;
  name: string;
  industry: string;
  
  // Status
  status: 'active' | 'trial' | 'suspended' | 'inactive';
  createdAt: Date;
  
  // Usage
  activeUsers: number;
  activeOpportunities: number;
  predictionsPerDay: number;
  feedbackPerDay: number;
  
  // Configuration
  methodology: string;
  feedbackLimit: number;
  customCatalogEntries: number;
  
  // Performance
  avgRecommendationAccuracy: number;
  avgActionRate: number;
  
  actions: ['View', 'Edit', 'Configure', 'Suspend', 'Delete'];
}
```

#### 7.1.2 Tenant Detail Page
**UI Component:** Tabbed interface

**Tab 1: Overview**
- Tenant info
- Status
- Quick stats
- Recent activity

**Tab 2: Feedback Configuration** (detailed in Section 1.3)

**Tab 3: Catalog Configuration**
- Assign catalog entries
- Enable/disable entries
- Set overrides

**Tab 4: Methodology Configuration** (detailed in Section 3.2)

**Tab 5: Limits & Quotas**
```typescript
{
  limits: {
    maxUsers: number;
    maxOpportunities: number;
    maxPredictionsPerDay: number;
    maxFeedbackPerDay: number;
  };
  
  quotas: {
    usedUsers: number;
    usedOpportunities: number;
    usedPredictionsToday: number;
    usedFeedbackToday: number;
  };
  
  alerts: {
    alertAt: number;                 // Alert at X% of limit
    throttleAt: number;              // Throttle at X% of limit
    blockAt: number;                 // Block at X% of limit
  };
}
```

**Tab 6: Custom Configuration**
```typescript
{
  riskTolerance: {
    overall: 'conservative' | 'balanced' | 'aggressive';
    perCategory: Record<string, number>;
    autoEscalationThreshold: number;
  };
  
  decisionPreferences: {
    autoMarkHot: boolean;
    autoCreateTasks: boolean;
    requireApprovalForActions: boolean;
  };
  
  modelPreferences: {
    preferIndustryModels: boolean;
    minConfidenceThreshold: number;
  };
  
  customFeatures: Array<{
    featureName: string;
    dataSource: string;
    transformation: string;
    enabled: boolean;
  }>;
}
```

**Tab 7: Analytics**
- Tenant-specific analytics
- Usage trends
- Performance metrics
- Feedback analysis

#### 7.1.3 Bulk Tenant Operations
**UI Component:** Bulk action toolbar

**Operations:**
- Update configuration (batch)
- Suspend tenants
- Update limits
- Export tenant data

---

### 7.2 Tenant Templates

**Location:** `/admin/tenants/templates`

**Capabilities:**

#### 7.2.1 View Templates
**UI Component:** Card grid

**Templates:**
- "Technology Startup" (MEDDIC, aggressive risk tolerance)
- "Enterprise Healthcare" (Custom methodology, conservative)
- "Financial Services" (Challenger, balanced)

#### 7.2.2 Create Template
**UI Component:** Template wizard

**Configuration:**
- Template name
- Default methodology
- Default feedback configuration
- Default catalog entries
- Default limits

**Apply Template:**
- Select tenants
- Apply template (with overrides)

---

## 8. System Configuration

### 8.1 Performance Configuration

**Location:** `/admin/system/performance`

**Capabilities:**

#### 8.1.1 Performance Targets
**UI Component:** Configuration form

```typescript
{
  latencyTargets: {
    featureExtraction: {
      p50: number;                   // ms
      p95: number;                   // ms (default: 500)
      p99: number;                   // ms
    };
    mlPrediction: {
      p50: number;
      p95: number;                   // ms (default: 2000)
      p99: number;
    };
    explanation: {
      p50: number;
      p95: number;                   // ms (default: 1000)
      p99: number;
    };
    llmReasoning: {
      p50: number;
      p95: number;                   // ms (default: 3000)
      p99: number;
    };
    decisionEvaluation: {
      p50: number;
      p95: number;                   // ms (default: 100)
      p99: number;
    };
    endToEnd: {
      p50: number;
      p95: number;                   // ms (default: 5000)
      p99: number;
    };
  };
  
  throughputTargets: {
    predictionsPerSecond: number;    // Default: 50
    batchSize: number;               // Default: 100
    concurrentRequests: number;      // Default: 100
  };
  
  alerts: {
    alertIfExceeded: boolean;
    alertThreshold: number;          // Alert if >X% over target
  };
}
```

**UI:**
- Number inputs for each target
- Visual indicators (green/yellow/red based on current vs target)
- Historical performance chart
- Alert configuration

#### 8.1.2 Caching Configuration
**UI Component:** Caching settings form

```typescript
{
  redis: {
    enabled: boolean;
    host: string;
    port: number;
    password: string;
    maxMemory: string;               // e.g., "4gb"
    evictionPolicy: 'allkeys-lru' | 'volatile-lru' | 'allkeys-lfu' | 'volatile-lfu';
  };
  
  cacheStrategy: {
    features: {
      enabled: boolean;
      ttl: number;                   // seconds (0 = event-based only)
      invalidationEvents: string[];  // List of events that invalidate
    };
    
    predictions: {
      enabled: boolean;
      ttl: number;
      invalidationEvents: string[];
    };
    
    explanations: {
      enabled: boolean;
      ttl: number;
    };
    
    llmResponses: {
      enabled: boolean;
      ttl: number;
    };
    
    modelMetadata: {
      enabled: boolean;
      ttl: number;
    };
  };
  
  monitoring: {
    trackHitRate: boolean;
    alertOnLowHitRate: boolean;
    lowHitRateThreshold: number;     // %
  };
}
```

---

### 8.2 Data Lake Configuration

**Location:** `/admin/system/datalake`

**Capabilities:**

#### 8.2.1 Connection Settings
```typescript
{
  connectionString: string;
  accountName: string;
  accountKey: string;
  containerName: string;
}
```

#### 8.2.2 Sync Configuration
```typescript
{
  syncStrategy: 'real-time' | 'batch' | 'hybrid';
  
  realTimeEvents: string[];          // Events to sync in real-time
  
  batchSync: {
    frequency: 'hourly' | 'daily' | 'weekly';
    timeOfDay?: string;              // HH:MM for daily
  };
  
  retryPolicy: {
    maxRetries: number;
    retryDelay: number;              // seconds
    exponentialBackoff: boolean;
  };
  
  compression: {
    enabled: boolean;
    format: 'gzip' | 'snappy' | 'lz4';
  };
}
```

#### 8.2.3 Schema Management
- View current schemas
- Schema versioning
- Schema evolution rules
- Migration scripts

---

### 8.3 Logging & Monitoring

**Location:** `/admin/system/monitoring`

**Capabilities:**

#### 8.3.1 Log Configuration
```typescript
{
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  
  logSinks: Array<{
    type: 'console' | 'file' | 'azure_log_analytics' | 'elasticsearch';
    enabled: boolean;
    config: Record<string, any>;
  }>;
  
  retention: {
    days: number;
    archiveAfterDays: number;
  };
  
  sampling: {
    enabled: boolean;
    sampleRate: number;              // % of logs to capture
  };
}
```

#### 8.3.2 Metrics Configuration
- Enable/disable metrics
- Metric collection frequency
- Metric retention
- Custom metrics

#### 8.3.3 Distributed Tracing
```typescript
{
  enabled: boolean;
  provider: 'application_insights' | 'jaeger' | 'zipkin';
  samplingRate: number;              // % of requests to trace
}
```

---

### 8.4 Security Configuration

**Location:** `/admin/system/security`

**Capabilities:**

#### 8.4.1 Authentication
```typescript
{
  providers: Array<{
    type: 'azure_ad' | 'okta' | 'auth0';
    enabled: boolean;
    config: Record<string, any>;
  }>;
  
  mfa: {
    required: boolean;
    methods: Array<'totp' | 'sms' | 'email'>;
  };
  
  sessionManagement: {
    timeout: number;                 // minutes
    renewOnActivity: boolean;
  };
}
```

#### 8.4.2 API Security
```typescript
{
  rateLimit: {
    enabled: boolean;
    requestsPerMinute: number;
    perTenant: boolean;
    perUser: boolean;
  };
  
  cors: {
    enabled: boolean;
    allowedOrigins: string[];
    allowedMethods: string[];
  };
  
  encryption: {
    dataAtRest: boolean;
    dataInTransit: boolean;
    algorithm: string;
  };
}
```

#### 8.4.3 Audit Logging
```typescript
{
  enabled: boolean;
  events: string[];                  // List of events to audit
  retention: {
    days: number;
    archiveAfterDays: number;
  };
}
```

---

## 9. Analytics & Reporting Configuration

### 9.1 Dashboard Configuration

**Location:** `/admin/analytics/dashboards`

**Capabilities:**

#### 9.1.1 Create Custom Dashboard
**UI Component:** Dashboard builder

**Features:**
- Drag-and-drop widget placement
- Widget library (charts, metrics, tables)
- Data source selector
- Filter configuration
- Refresh interval
- Export options

**Widget Types:**
- Line chart
- Bar chart
- Pie chart
- Metric card
- Table
- Heatmap
- Gauge
- Timeline

#### 9.1.2 Share Dashboard
- Share with specific users
- Share with roles
- Public link (with auth)
- Schedule email reports

---

### 9.2 Report Configuration

**Location:** `/admin/analytics/reports`

**Capabilities:**

#### 9.2.1 Create Report
**UI Component:** Report builder

**Configuration:**
- Report name
- Data sources
- Metrics to include
- Filters
- Grouping
- Sorting
- Output format (PDF, Excel, CSV)

#### 9.2.2 Schedule Reports
- Frequency (daily, weekly, monthly)
- Recipients
- Delivery method (email, Slack, shared drive)
- Expiration date

---

### 9.3 Data Export Configuration

**Location:** `/admin/analytics/export`

**Capabilities:**

#### 9.3.1 Export Configuration
```typescript
{
  exports: Array<{
    name: string;
    dataSource: string;
    format: 'csv' | 'json' | 'parquet';
    schedule: 'daily' | 'weekly' | 'monthly';
    destination: 'azure_blob' | 'sftp' | 'email';
    retention: number;               // days
  }>;
}
```

---

## 10. Security & Access Control

### 10.1 Role Management

**Location:** `/admin/security/roles`

**Capabilities:**

#### 10.1.1 View All Roles
**UI Component:** Table

**Pre-defined Roles:**
- Super Admin (all permissions)
- Tenant Admin (tenant-specific admin)
- Data Scientist (ML models, features)
- Sales Manager (analytics, reports)
- Sales User (opportunity view only)

#### 10.1.2 Create Custom Role
**UI Component:** Role builder

**Permissions:**
```typescript
{
  roleName: string;
  description: string;
  
  permissions: {
    feedbackTypes: ['view', 'create', 'edit', 'delete'];
    catalog: ['view', 'create', 'edit', 'delete'];
    methodologies: ['view', 'create', 'edit', 'delete'];
    models: ['view', 'create', 'edit', 'retrain', 'deploy', 'delete'];
    features: ['view', 'create', 'edit', 'delete'];
    rules: ['view', 'create', 'edit', 'delete'];
    tenants: ['view', 'create', 'edit', 'configure', 'suspend', 'delete'];
    system: ['view', 'configure'];
    analytics: ['view', 'create', 'export'];
    security: ['view', 'configure'];
  };
  
  scope: 'global' | 'tenant';
}
```

---

### 10.2 User Management

**Location:** `/admin/security/users`

**Capabilities:**

#### 10.2.1 View All Users
**UI Component:** Table

#### 10.2.2 Create/Edit User
- Basic info
- Role assignment
- Tenant assignment
- Permissions override

---

### 10.3 API Keys

**Location:** `/admin/security/api-keys`

**Capabilities:**

#### 10.3.1 Create API Key
- Key name
- Scope (which APIs)
- Expiration date
- Rate limits
- Permissions

#### 10.3.2 Manage API Keys
- View all keys
- Revoke keys
- Rotate keys
- Monitor usage

---

### 10.4 Audit Log

**Location:** `/admin/security/audit`

**Capabilities:**

#### 10.4.1 View Audit Log
**UI Component:** Searchable log table

**Columns:**
- Timestamp
- User
- Action (created, updated, deleted, etc.)
- Resource (feedback type, catalog entry, etc.)
- Details
- IP Address

**Filters:**
- Date range
- User
- Action type
- Resource type

**Export:**
- Export to CSV
- Export for compliance

---

## 11. UI Design Specifications

### 11.1 Layout & Navigation

#### 11.1.1 Main Navigation
**Location:** Left sidebar (collapsible)

**Menu Structure:**
```
🏠 Dashboard
📊 Analytics
  ├─ Feedback Analytics
  ├─ Model Performance
  ├─ Recommendation Effectiveness
  └─ User Engagement

⚙️ Configuration
  ├─ 💬 Feedback System
  │   ├─ Feedback Types
  │   ├─ Global Settings
  │   └─ Tenant Configuration
  │
  ├─ 📚 Action Catalog
  │   ├─ View Catalog
  │   ├─ Categories
  │   ├─ Relationships
  │   └─ Import/Export
  │
  ├─ 📈 Sales Methodologies
  │   ├─ View Methodologies
  │   ├─ MEDDIC Mapper
  │   └─ Compliance Monitoring
  │
  ├─ 🤖 ML Models
  │   ├─ View Models
  │   ├─ Endpoints
  │   ├─ Features
  │   └─ Monitoring
  │
  ├─ ⚡ Decision Rules
  │   ├─ View Rules
  │   ├─ Templates
  │   └─ Conflicts
  │
  └─ 🏢 Tenants
      ├─ View Tenants
      ├─ Templates
      └─ Bulk Operations

🔧 System
  ├─ Performance
  ├─ Data Lake
  ├─ Logging & Monitoring
  └─ Security

🔒 Security
  ├─ Roles
  ├─ Users
  ├─ API Keys
  └─ Audit Log

❓ Help
  ├─ Documentation
  ├─ API Reference
  └─ Support
```

#### 11.1.2 Top Bar
- Tenant selector (if multi-tenant view)
- Search (global search across all entities)
- Notifications (alerts, updates)
- User menu (profile, settings, logout)

---

### 11.2 Common UI Patterns

#### 11.2.1 Data Tables
**Features:**
- Sortable columns
- Filterable (dropdown, search, date range)
- Paginated (25, 50, 100, All)
- Bulk selection (checkbox)
- Bulk actions (toolbar)
- Export (CSV, Excel)
- Column customization (show/hide, reorder)
- Saved views (save filter + column config)

#### 11.2.2 Forms
**Features:**
- Validation (inline, on submit)
- Required fields (asterisk, color)
- Help text (tooltips, descriptions)
- Conditional fields (show/hide based on values)
- Multi-step wizards (progress indicator)
- Auto-save drafts
- Cancel confirmation
- Preview (before submit)

#### 11.2.3 Modals
**Features:**
- Centered, backdrop
- Close on backdrop click (optional)
- Close on ESC key
- Confirmation for destructive actions
- Loading states

#### 11.2.4 Charts
**Library:** Recharts or Chart.js

**Features:**
- Interactive (hover tooltips)
- Zoomable (for time series)
- Downloadable (PNG, SVG)
- Configurable (colors, labels)
- Responsive

---

### 11.3 Accessibility

**Requirements:**
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- Color contrast ratios
- Focus indicators
- ARIA labels

---

### 11.4 Responsive Design

**Breakpoints:**
- Desktop: >1200px (primary)
- Tablet: 768px - 1199px
- Mobile: <768px (limited support)

**Super Admin UI:** Primarily desktop-focused (complex configurations)

---

## 12. Implementation Requirements

### 12.1 Technology Stack

**Frontend:**
- Framework: Next.js 14
- UI Library: Tailwind CSS + shadcn/ui
- State Management: React Context + React Query
- Charts: Recharts
- Forms: React Hook Form + Zod
- Icons: Lucide React

**Backend:**
- Language: TypeScript (Node.js)
- Framework: NestJS or Express
- Database: Cosmos DB
- Cache: Redis
- Queue: RabbitMQ
- Cloud: Azure

---

### 12.2 API Structure

**REST API Endpoints (Sample):**

```
# Feedback Types
GET    /api/admin/feedback/types
POST   /api/admin/feedback/types
PUT    /api/admin/feedback/types/:id
DELETE /api/admin/feedback/types/:id

# Global Settings
GET    /api/admin/feedback/global-settings
PUT    /api/admin/feedback/global-settings

# Tenant Configuration
GET    /api/admin/tenants/:tenantId/feedback
PUT    /api/admin/tenants/:tenantId/feedback

# Catalog
GET    /api/admin/catalog
POST   /api/admin/catalog
PUT    /api/admin/catalog/:id
DELETE /api/admin/catalog/:id
GET    /api/admin/catalog/:id/test
POST   /api/admin/catalog/import
GET    /api/admin/catalog/export

# Methodologies
GET    /api/admin/methodologies
POST   /api/admin/methodologies
PUT    /api/admin/methodologies/:id
DELETE /api/admin/methodologies/:id

# ML Models
GET    /api/admin/ml/models
POST   /api/admin/ml/models
PUT    /api/admin/ml/models/:id
POST   /api/admin/ml/models/:id/test
POST   /api/admin/ml/models/:id/retrain
POST   /api/admin/ml/models/:id/rollback

# Features
GET    /api/admin/ml/features
PUT    /api/admin/ml/features/:name

# Rules
GET    /api/admin/rules
POST   /api/admin/rules
PUT    /api/admin/rules/:id
POST   /api/admin/rules/:id/test

# Tenants
GET    /api/admin/tenants
POST   /api/admin/tenants
PUT    /api/admin/tenants/:id
GET    /api/admin/tenants/:id/configure

# System
GET    /api/admin/system/performance
PUT    /api/admin/system/performance
GET    /api/admin/system/datalake
PUT    /api/admin/system/datalake

# Security
GET    /api/admin/security/roles
POST   /api/admin/security/roles
GET    /api/admin/security/users
POST   /api/admin/security/users
GET    /api/admin/security/audit
```

---

### 12.3 Database Schema (Additional)

**SuperAdminConfiguration (Cosmos DB)**
```typescript
interface SuperAdminConfiguration {
  id: string;                        // "super_admin_config"
  partitionKey: string;              // "global"
  
  // All configurations from this document
  feedbackSystem: GlobalFeedbackConfig;
  catalogCategories: ActionCategory[];
  systemPerformance: PerformanceConfig;
  dataLake: DataLakeConfig;
  security: SecurityConfig;
  
  updatedAt: Date;
  updatedBy: string;
}
```

---

### 12.4 Implementation Timeline

**Phase 1: Core UI Framework (Week 1-2)**
- Set up Next.js project
- Implement navigation
- Implement authentication
- Implement base layouts

**Phase 2: Feedback Configuration (Week 3)**
- Feedback types management
- Global settings
- Tenant configuration

**Phase 3: Catalog Management (Week 4-5)**
- Catalog viewer
- Create/edit entry forms
- Relationship management
- Import/export

**Phase 4: Methodology Configuration (Week 6)**
- Methodology viewer
- Create/edit methodology
- MEDDIC mapper
- Tenant assignment

**Phase 5: ML Configuration (Week 7-8)**
- Model management
- Endpoint management
- Feature management
- Monitoring dashboard

**Phase 6: Rules & Decisions (Week 9)**
- Rule management
- Rule builder
- Rule testing

**Phase 7: Tenant Management (Week 10)**
- Tenant viewer
- Tenant configuration
- Bulk operations

**Phase 8: System Configuration (Week 11)**
- Performance settings
- Data Lake settings
- Logging & monitoring
- Security settings

**Phase 9: Analytics & Reports (Week 12)**
- Dashboard builder
- Report builder
- Data export

**Phase 10: Testing & Polish (Week 13-14)**
- End-to-end testing
- Performance optimization
- Accessibility audit
- Documentation

**Total: 14 weeks** (parallel to backend work)

---

### 12.5 Testing Requirements

**Unit Tests:**
- Component tests (>80% coverage)
- Form validation tests
- API call tests (mocked)

**Integration Tests:**
- API integration tests
- Database integration tests
- Auth flow tests

**E2E Tests:**
- Critical user flows
- Configuration workflows
- Import/export workflows

**Manual Testing:**
- Usability testing
- Accessibility testing
- Browser compatibility
- Performance testing

---

## Summary

This document specifies **ALL configuration options** that Super Admin must be able to manage through the UI, organized into **10 major categories** with **100+ detailed configuration screens**.

### Key Statistics:
- **10 major configuration areas**
- **100+ configuration screens**
- **1000+ configurable settings**
- **50+ API endpoints** for admin operations
- **14 weeks implementation timeline** (parallel to backend)

### Next Steps:
1. Review and approve this specification
2. Create UI mockups/wireframes for key screens
3. Prioritize configuration screens (MVP vs full)
4. Begin frontend implementation (Week 1)

**All configuration must be accessible via intuitive, user-friendly UI with proper validation, help text, and safety checks.**

---

**Document Complete** ✅
