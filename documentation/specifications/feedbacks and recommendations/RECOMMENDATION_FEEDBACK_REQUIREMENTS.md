# Recommendation Feedback System - Detailed Requirements

**Date:** January 2025  
**Version:** 1.0  
**Status:** New Requirements - Clarification Needed

---

## Overview

Users must be able to provide feedback on recommendations with configurable feedback types. This feedback must be stored, analyzed, and used to improve the CAIS system.

---

## Clarification Questions

Before finalizing requirements, I need clarification on the following:

### Q1: Feedback Scope
**Question:** What types of recommendations should receive feedback?
- [ ] All recommendations (risk mitigation, next best actions, reactivation strategies, sales recommendations)
- [ ] Only specific recommendation types (which ones?)
- [ ] Only automated recommendations (not manually created)
- [ ] All AI-generated content (recommendations, insights, predictions)

**Follow-up:** Should feedback apply to:
- Individual recommendation items (e.g., "Schedule follow-up call")?
- Groups of recommendations (e.g., all recommendations for an opportunity)?
- Entire recommendation sets (e.g., all reactivation recommendations)?

### Q2: Feedback Types - Extensibility

**Question:** You mentioned a "flexible, extensive list" with up to 5 active. Please clarify:

**Default Feedback Types (Proposed 20+ options):**
1. **Action-Based:**
   - "I will act on it" / "Acting on this"
   - "Already actioned"
   - "Will act later"
   - "Delegated to someone else"
   - "Not actionable"

2. **Relevance-Based:**
   - "Ignore" / "Not relevant now"
   - "Irrelevant"
   - "Not applicable to this opportunity"
   - "Wrong context"

3. **Quality-Based:**
   - "Very helpful"
   - "Somewhat helpful"
   - "Not helpful"
   - "Too generic"
   - "Too specific"
   - "Missing critical information"

4. **Timing-Based:**
   - "Too early"
   - "Too late"
   - "Perfect timing"

5. **Other:**
   - "Need more information"
   - "Disagree with recommendation"
   - "Already knew this"

**Questions:**
- Are these feedback types comprehensive?
- Should we add more categories?
- Should feedback types have subcategories? (e.g., "Not helpful" → "Why? Too vague / Wrong priority / etc.")
- Should feedback types be customizable per tenant (add custom types)?
- Can tenant managers rename feedback types or only enable/disable?

### Q3: Feedback Type Configuration

**Question:** Tenant manager can activate "up to 5" - clarify:
- Does this mean exactly 5, or maximum 5?
- If a tenant activates only 3, do users only see those 3 options?
- Should there always be a "Other (free text)" option regardless?
- Can tenant managers change which 5 are active over time, or is it set once?

**Question:** Who configures the active feedback types?
- [ ] Tenant administrator
- [ ] Sales manager
- [ ] System administrator
- [ ] Each team can have different active feedback types?

### Q4: Feedback Collection Context

**Question:** What context should be captured with feedback?
- [ ] Recommendation ID (which specific recommendation)
- [ ] Opportunity ID (which opportunity)
- [ ] User ID (who gave feedback)
- [ ] Timestamp
- [ ] Recommendation type (risk mitigation, next action, reactivation, etc.)
- [ ] Recommendation source (ML model, LLM, rule-based, human)
- [ ] Recommendation confidence/score
- [ ] User role (SDR, AE, Manager, etc.)
- [ ] Time to feedback (how long after recommendation was shown)
- [ ] Previous feedback on same recommendation (if changed)
- [ ] Free-text comment (optional explanation)

**Question:** Should feedback be anonymous or always attributed to a user?

### Q5: Data Collection Module Integration

**Question:** You mentioned "data collection module" - please clarify:
- Is this an existing module in the system?
- Should feedback be stored in:
  - [ ] Cosmos DB (same as other data)
  - [ ] Separate analytics database
  - [ ] Data warehouse / data lake
  - [ ] All of the above (with sync)

**Question:** What is the data collection module responsible for?
- [ ] Just storage
- [ ] Storage + basic analytics
- [ ] Storage + analytics + data export
- [ ] Storage + analytics + ML training data preparation

### Q6: CAIS System Leverage

**Question:** How should CAIS leverage feedback? Please prioritize:

**Option A: Model Retraining (Layer 8 - Learning Loop)**
- Use feedback as labels for supervised learning
- E.g., "I will act on it" = positive label, "Irrelevant" = negative label
- Retrain recommendation ranking models based on feedback

**Option B: Real-Time Filtering (Layer 6 - Decision Engine)**
- Suppress similar recommendations that received negative feedback
- Boost similar recommendations that received positive feedback
- Personalize recommendations per user based on their feedback history

**Option C: Explanation Improvement (Layer 5 - LLM Reasoning)**
- Use feedback to improve recommendation explanations
- E.g., if "Not helpful" → improve clarity of recommendation text

**Option D: Feature Engineering (Layer 2)**
- Create feedback-based features (e.g., "user_action_rate", "user_ignore_rate")
- Use in ML models to personalize predictions

**Option E: All of the Above**
- Comprehensive feedback loop across all CAIS layers

**Question:** What is the priority timeline?
- [ ] Immediate (filter recommendations in real-time based on feedback)
- [ ] Short-term (use feedback for retraining within 1 week)
- [ ] Long-term (use feedback for quarterly model improvements)

### Q7: Feedback Analytics & Reporting

**Question:** What analytics should be available?
- [ ] Recommendation acceptance rate (by type, by user, by opportunity stage)
- [ ] Most ignored recommendation types
- [ ] Most acted-upon recommendation types
- [ ] User engagement with recommendations
- [ ] Recommendation effectiveness (feedback → outcome correlation)
- [ ] A/B test results (different recommendation strategies)

**Question:** Who should see these analytics?
- [ ] Tenant administrators
- [ ] Sales managers
- [ ] Data scientists / ML engineers
- [ ] Individual users (their own feedback history)

### Q8: Feedback UI/UX

**Question:** Where should users provide feedback?
- [ ] In-app notification (when recommendation is shown)
- [ ] Opportunity detail page (next to each recommendation)
- [ ] Dedicated "Recommendations" section/page
- [ ] All of the above

**Question:** Should feedback be:
- [ ] One-click (just select feedback type)
- [ ] Two-step (select type + optional comment)
- [ ] Required (must provide feedback to dismiss recommendation)
- [ ] Optional (can dismiss without feedback)

**Question:** Can users change their feedback after submitting?
- [ ] Yes, at any time
- [ ] Yes, within X days
- [ ] No, feedback is immutable

### Q9: Feedback on Different Recommendation Types

**Question:** Do different recommendation types need different feedback options?

**Example Scenarios:**

**Risk Mitigation Recommendation:**
- Recommendation: "Schedule call with decision maker"
- Feedback options:
  - "Already scheduled"
  - "Will schedule"
  - "Not possible" (no decision maker identified)
  - "Not relevant" (different risk priority)

**Reactivation Recommendation:**
- Recommendation: "Reactivate Opportunity #123"
- Feedback options:
  - "Starting reactivation"
  - "Not worth pursuing"
  - "Customer situation changed"
  - "Will revisit later"

**Next Best Action Recommendation:**
- Recommendation: "Send proposal"
- Feedback options:
  - "Proposal sent"
  - "Not ready yet"
  - "Wrong timing"
  - "Different action taken"

**Question:** Should each recommendation type have its own feedback options, or use a common set?

### Q10: Feedback Aggregation

**Question:** How should feedback be aggregated for CAIS learning?

**Scenario:** Recommendation "Schedule demo" receives feedback from 100 users:
- 60 → "I will act on it"
- 25 → "Ignore"
- 10 → "Too early"
- 5 → "Irrelevant"

**Question:** What is the "label" for retraining?
- [ ] Weighted average (0.6 positive, 0.4 negative)
- [ ] Majority vote (positive)
- [ ] Individual samples (each feedback is a separate training example)
- [ ] Time-weighted (recent feedback more important)
- [ ] User-weighted (feedback from successful users weighted higher)

### Q11: Feedback on ML Predictions vs LLM Recommendations

**Question:** Should feedback differentiate between:
- **ML Predictions** (e.g., "Risk score: 0.72")
- **LLM Recommendations** (e.g., "Schedule call with decision maker")
- **Rule-based Decisions** (e.g., "Mark as hot")

**Question:** Should feedback on ML predictions be used differently than feedback on LLM recommendations?

### Q12: Feedback History & Patterns

**Question:** Should the system detect feedback patterns?

**Examples:**
- User consistently ignores a certain type of recommendation → stop showing it
- User always acts on high-value recommendations → prioritize those
- Recommendation type has low action rate across all users → deprecate it

**Question:** Should these patterns automatically adjust recommendations, or just inform administrators?

---

## Proposed Requirements (Subject to Your Answers)

### High-Level Requirements

**R1: Flexible Feedback Types**
- System supports 20+ predefined feedback types
- Tenant manager can activate up to 5 feedback types
- Feedback types are configurable per tenant
- Optional free-text comment for any feedback

**R2: Feedback Collection**
- Capture feedback on all recommendations
- Store feedback with full context (user, recommendation, timestamp, etc.)
- Support feedback updates (users can change their mind)
- Track feedback history and changes

**R3: Data Collection Module Integration**
- Store feedback in Cosmos DB (primary)
- Sync to data collection module for analytics
- Export feedback for ML training data preparation
- Support bulk feedback export for data science team

**R4: CAIS System Leverage**
- **Layer 2 (Feature Engineering):** Create feedback-based features
- **Layer 6 (Decision Engine):** Filter/boost recommendations based on feedback
- **Layer 8 (Learning Loop):** Use feedback for model retraining
- **Layer 5 (LLM Reasoning):** Improve recommendation explanations based on feedback

**R5: Analytics & Reporting**
- Dashboard for feedback analytics
- Recommendation effectiveness reports
- User engagement metrics
- A/B testing support

**R6: Privacy & Compliance**
- Feedback can be anonymous (optional)
- Feedback is tenant-isolated
- Audit trail for feedback changes
- GDPR-compliant (feedback can be deleted)

---

## Database Schemas (Proposed)

### FeedbackType (Cosmos DB - FeedbackTypes container)

```typescript
interface FeedbackType {
  id: string;                           // feedback_type_{name}
  partitionKey: string;                 // "global"
  name: string;                         // "i_will_act_on_it"
  displayName: string;                  // "I will act on it"
  category: "action" | "relevance" | "quality" | "timing" | "other";
  description: string;
  sentiment: "positive" | "neutral" | "negative";
  icon?: string;                        // UI icon
  color?: string;                       // UI color
  isDefault: boolean;                   // Is this a default type?
  isActive: boolean;                    // Is this globally active?
  createdAt: Date;
  updatedAt: Date;
}
```

### TenantFeedbackConfiguration (Cosmos DB - TenantConfiguration container)

```typescript
interface TenantFeedbackConfiguration {
  id: string;                           // feedback_config_{tenantId}
  partitionKey: string;                 // tenantId
  tenantId: string;
  
  // Active feedback types (max 5)
  activeFeedbackTypes: string[];        // Array of feedback type IDs
  
  // Configuration
  allowFreeTextComments: boolean;
  requireFeedbackToMiss: boolean;      // Must provide feedback to dismiss
  allowFeedbackUpdate: boolean;        // Can users change feedback
  feedbackUpdateWindowDays: number;    // Days within which feedback can be changed
  
  // Display settings
  feedbackPromptTiming: "immediate" | "after_1h" | "after_1d" | "never";
  feedbackPromptLocation: "notification" | "page" | "both";
  
  updatedAt: Date;
  updatedBy: string;                   // User ID who last updated
}
```

### RecommendationFeedback (Cosmos DB - RecommendationFeedback container)

```typescript
interface RecommendationFeedback {
  id: string;                           // feedback_{recommendationId}_{userId}_{timestamp}
  partitionKey: string;                 // tenantId
  tenantId: string;
  
  // Recommendation context
  recommendationId: string;
  recommendationType: "risk_mitigation" | "next_action" | "reactivation" | "sales_recommendation" | "insight";
  recommendationText: string;           // What was recommended
  recommendationSource: "ml" | "llm" | "rule" | "human";
  recommendationConfidence?: number;    // If from ML/LLM
  
  // Opportunity context
  opportunityId: string;
  opportunityStage: string;
  opportunityAmount: number;
  
  // User context
  userId: string;
  userRole: string;
  isAnonymous: boolean;
  
  // Feedback
  feedbackType: string;                 // ID of FeedbackType
  feedbackDisplayName: string;          // For historical reference
  feedbackSentiment: "positive" | "neutral" | "negative";
  comment?: string;                     // Optional free text
  
  // Timing
  recommendationShownAt: Date;
  feedbackGivenAt: Date;
  timeToFeedbackSeconds: number;
  
  // Outcome tracking (filled later)
  actionTaken?: boolean;                // Did user actually act?
  actionTakenAt?: Date;
  actionOutcome?: string;               // Result of action
  
  // Feedback history (if updated)
  previousFeedback?: {
    feedbackType: string;
    feedbackGivenAt: Date;
    comment?: string;
  }[];
  
  // Metadata
  version: number;                      // For optimistic locking
  createdAt: Date;
  updatedAt: Date;
}
```

### RecommendationFeedbackAggregation (Cosmos DB - for analytics)

```typescript
interface RecommendationFeedbackAggregation {
  id: string;                           // feedback_agg_{recommendationType}_{date}
  partitionKey: string;                 // recommendationType
  
  // Aggregation context
  recommendationType: string;
  aggregationPeriod: "daily" | "weekly" | "monthly";
  startDate: Date;
  endDate: Date;
  
  // Aggregated metrics
  totalRecommendations: number;
  totalFeedback: number;
  feedbackRate: number;                 // Percentage of recommendations that got feedback
  
  // Feedback breakdown
  feedbackByType: Record<string, {
    count: number;
    percentage: number;
  }>;
  
  feedbackBySentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  
  // User engagement
  avgTimeToFeedbackSeconds: number;
  medianTimeToFeedbackSeconds: number;
  
  // Action rate
  actionTakenRate: number;              // % of "I will act on it" that actually acted
  
  // By user role
  feedbackByRole: Record<string, {
    count: number;
    sentimentDistribution: Record<string, number>;
  }>;
  
  calculatedAt: Date;
  createdAt: Date;
}
```

---

## Service Requirements (Proposed)

### FeedbackService

**Location:** `apps/api/src/services/feedback/feedback.service.ts`

```typescript
export class FeedbackService {
  constructor(
    private readonly cosmosDBClient: CosmosDBClient,
    private readonly cachingService: CachingService,
    private readonly dataCollectionService: DataCollectionService,
    private readonly logger: Logger
  ) {}
  
  // Core feedback operations
  async recordFeedback(
    feedback: RecordFeedbackInput
  ): Promise<RecommendationFeedback>
  
  async updateFeedback(
    feedbackId: string,
    updates: UpdateFeedbackInput
  ): Promise<RecommendationFeedback>
  
  async getFeedback(
    recommendationId: string,
    userId: string
  ): Promise<RecommendationFeedback | null>
  
  async getUserFeedbackHistory(
    userId: string,
    filters?: FeedbackFilters
  ): Promise<RecommendationFeedback[]>
  
  // Feedback type management
  async getAvailableFeedbackTypes(
    tenantId: string
  ): Promise<FeedbackType[]>
  
  async getTenantFeedbackConfiguration(
    tenantId: string
  ): Promise<TenantFeedbackConfiguration>
  
  async updateTenantFeedbackConfiguration(
    tenantId: string,
    config: Partial<TenantFeedbackConfiguration>
  ): Promise<TenantFeedbackConfiguration>
  
  // Analytics
  async aggregateFeedback(
    filters: AggregationFilters
  ): Promise<RecommendationFeedbackAggregation>
  
  async calculateRecommendationEffectiveness(
    recommendationType: string,
    timeRange: DateRange
  ): Promise<EffectivenessMetrics>
  
  async getUserFeedbackStats(
    userId: string
  ): Promise<UserFeedbackStats>
  
  // Data collection module integration
  async syncToDataCollection(
    feedbackIds: string[]
  ): Promise<void>
  
  async exportFeedbackForTraining(
    filters: ExportFilters
  ): Promise<string>  // Returns file path or URL
  
  // CAIS integration
  async getFeedbackFeaturesForUser(
    userId: string
  ): Promise<FeedbackFeatures>
  
  async getRecommendationFeedbackPattern(
    recommendationType: string
  ): Promise<FeedbackPattern>
  
  async shouldSuppressRecommendation(
    recommendationType: string,
    userId: string,
    context: RecommendationContext
  ): Promise<boolean>
}
```

---

## API Endpoints (Proposed)

### 1. POST /api/v1/feedback/record
**Purpose:** Record user feedback on recommendation

**Request:**
```json
{
  "recommendationId": "rec_123",
  "feedbackType": "i_will_act_on_it",
  "comment": "This is exactly what I needed",
  "isAnonymous": false
}
```

**Response:**
```json
{
  "feedbackId": "feedback_123",
  "success": true,
  "message": "Feedback recorded",
  "recordedAt": "2025-01-28T10:30:00Z"
}
```

### 2. PUT /api/v1/feedback/:feedbackId
**Purpose:** Update existing feedback

### 3. GET /api/v1/feedback/types
**Purpose:** Get available feedback types for tenant

**Response:**
```json
{
  "feedbackTypes": [
    {
      "id": "i_will_act_on_it",
      "displayName": "I will act on it",
      "category": "action",
      "sentiment": "positive",
      "icon": "✓"
    },
    {
      "id": "ignore",
      "displayName": "Ignore",
      "category": "relevance",
      "sentiment": "negative",
      "icon": "✗"
    }
  ]
}
```

### 4. GET /api/v1/feedback/analytics
**Purpose:** Get feedback analytics

### 5. POST /api/v1/feedback/config
**Purpose:** Update tenant feedback configuration (admin only)

---

## UI Components (Proposed)

### FeedbackButton Component

```typescript
interface FeedbackButtonProps {
  recommendationId: string;
  recommendationType: string;
  onFeedbackSubmitted?: (feedback: RecommendationFeedback) => void;
  compact?: boolean;  // Show as icon-only buttons
}
```

**Features:**
- Show available feedback types as buttons
- Optional comment field
- One-click feedback
- Visual confirmation on submit
- Update feedback if already given

---

## Integration with CAIS Layers

### Layer 2 (Feature Engineering) - Feedback Features

```typescript
interface FeedbackFeatures {
  // User feedback history
  userActionRate: number;               // % of "will act" feedback
  userIgnoreRate: number;               // % of "ignore" feedback
  userAvgTimeToFeedback: number;        // Seconds
  
  // Recommendation type feedback
  recommendationTypeActionRate: number; // Action rate for this rec type
  recommendationTypeIgnoreRate: number; // Ignore rate for this rec type
  
  // Personalization
  userPreferredRecTypes: string[];      // Rec types user acts on most
  userIgnoredRecTypes: string[];        // Rec types user ignores most
}
```

### Layer 6 (Decision Engine) - Feedback-Based Filtering

```typescript
class DecisionEngineService {
  async filterRecommendations(
    recommendations: Recommendation[],
    userId: string,
    tenantId: string
  ): Promise<Recommendation[]> {
    // Get user's feedback patterns
    const userFeedback = await this.feedbackService.getUserFeedbackHistory(userId);
    
    // Filter out recommendation types user consistently ignores
    const ignoredTypes = this.identifyIgnoredTypes(userFeedback);
    
    const filtered = recommendations.filter(rec => 
      !ignoredTypes.includes(rec.type)
    );
    
    // Boost recommendation types user acts on
    const boosted = this.boostPreferredTypes(filtered, userFeedback);
    
    return boosted;
  }
}
```

### Layer 8 (Learning Loop) - Feedback-Based Retraining

```typescript
class TrainingService {
  async prepareRecommendationTrainingData(
    startDate: Date,
    endDate: Date
  ): Promise<TrainingDataset> {
    // Get all feedback in date range
    const feedback = await this.feedbackService.getFeedbackInRange(startDate, endDate);
    
    // Convert feedback to training labels
    const trainingExamples = feedback.map(f => ({
      // Features: recommendation context
      features: {
        recommendationType: f.recommendationType,
        opportunityStage: f.opportunityStage,
        opportunityAmount: f.opportunityAmount,
        userRole: f.userRole,
        // ... more features
      },
      
      // Label: feedback sentiment
      label: f.feedbackSentiment === "positive" ? 1 : 0,
      
      // Weight: more recent feedback weighted higher
      weight: this.calculateFeedbackWeight(f.feedbackGivenAt)
    }));
    
    return trainingExamples;
  }
}
```

---

## Please Answer the Questions Above

To finalize these requirements, I need your answers to the 12 questions (Q1-Q12) above. This will allow me to:

1. ✅ Complete the database schemas
2. ✅ Finalize the service methods
3. ✅ Design the exact API endpoints
4. ✅ Specify the UI components
5. ✅ Define the CAIS integration patterns
6. ✅ Create the implementation plan

**Key Decisions Needed:**
- Q1: Which recommendations get feedback?
- Q2: Are the 20+ feedback types complete?
- Q3: Exactly 5 or max 5?
- Q6: How should CAIS leverage feedback (priorities)?
- Q8: Where/how should users provide feedback?
- Q10: How to aggregate feedback for ML training?

Once you answer these, I can generate the complete, detailed requirements document with implementation specifications.

