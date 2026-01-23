# AI Insights: Recurring Search - Alert Detection & Learning

## Overview

The Alert Detection system is the intelligence layer of Recurring Search. It uses LLM-based delta analysis to identify significant changes between search executions, learns from user feedback to improve accuracy, and continuously refines detection logic to minimize false positives.

**Key Features**:
- **LLM Delta Analysis**: Compares previous vs. current results using language models
- **Confidence Scoring**: Quantifies alert certainty (0-1 scale)
- **User Feedback Loop**: Learns from relevant/irrelevant markings
- **Automatic Prompt Refinement**: Adjusts detection logic based on patterns
- **Sensitivity Adjustment**: Low/medium/high sensitivity levels
- **False Positive Tracking**: Monitors and reduces incorrect alerts
- **Search Type Optimization**: Specialized detection for different search types

## Table of Contents

1. [Alert Detection Flow](#alert-detection-flow)
2. [Delta Analysis Methodology](#delta-analysis-methodology)
3. [Confidence Scoring](#confidence-scoring)
4. [Detection Prompts](#detection-prompts)
5. [Learning System](#learning-system)
6. [False Positive Handling](#false-positive-handling)
7. [Search Type Detection](#search-type-detection)
8. [Thresholds & Sensitivity](#thresholds--sensitivity)
9. [Alert Content](#alert-content)
10. [User Feedback](#user-feedback)
11. [Statistics & Analytics](#statistics--analytics)

## Alert Detection Flow

### Complete Detection Sequence

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. SEARCH EXECUTION COMPLETE                                     │
│    - New results stored in c_search shard                        │
│    - Execution record created                                    │
│    - Alert detection triggered                                   │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. LOAD PREVIOUS RESULTS                                         │
│    - Query c_search for previous execution                       │
│    - Compare executedAt timestamps                               │
│    - Load search configuration                                   │
│    - Retrieve user-defined detection prompts                     │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. PREPARE DELTA ANALYSIS CONTEXT                                │
│    - Extract key fields from results                             │
│    - Build comparison structure                                  │
│    - Load search type-specific prompt                            │
│    - Include user customizations                                 │
│    - Add historical alert patterns                               │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. LLM DELTA ANALYSIS                                            │
│    - Call LLM with comparison prompt                             │
│    - Analyze semantic differences                                │
│    - Identify significant changes                                │
│    - Calculate raw confidence score                              │
│    - Generate change summary                                     │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 5. THRESHOLD CHECKS                                              │
│    - Check confidence >= tenant threshold                        │
│    - Check volume change >= volume threshold                     │
│    - Apply sensitivity multiplier                                │
│    - Consider historical false positive rate                     │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
         Threshold NOT Met      Threshold Met
                    │                 │
                    ▼                 ▼
          ┌──────────────┐   ┌──────────────────┐
          │ No Alert     │   │ 6. CREATE ALERT  │
          │ Created      │   │    - Build alert │
          │              │   │    - Add summary │
          │ Log decision │   │    - Add cites   │
          └──────────────┘   │    - Store DB    │
                             └────────┬─────────┘
                                      │
                                      ▼
                             ┌──────────────────┐
                             │ 7. NOTIFY USER   │
                             │    - Dispatch    │
                             │    - Track sent  │
                             └──────────────────┘
```

## Delta Analysis Methodology

### Core Concept

The system doesn't just look for **new results**—it performs **semantic analysis** of changes to understand **significance**:

- **New Results**: Entirely new items not in previous execution
- **Changed Results**: Items with modified content or metadata
- **Removed Results**: Items no longer appearing
- **Ranking Changes**: Significant position shifts
- **Sentiment Changes**: Tone or sentiment shifts
- **Magnitude Changes**: Volume or scale differences

### LLM Prompt Structure

```typescript
const deltaAnalysisPrompt = `
You are analyzing search results to detect significant changes.

SEARCH TYPE: ${searchType}
USER GOAL: ${userDefinedGoal}
DETECTION FOCUS: ${detectionFocus}

PREVIOUS RESULTS (${previousResults.length} items):
${formatResults(previousResults)}

NEW RESULTS (${newResults.length} items):
${formatResults(newResults)}

TASK: Analyze the changes and determine if they are significant enough to alert the user.

Consider:
1. New information that matches the user's goal
2. Sentiment or tone changes
3. Volume or magnitude changes
4. Ranking shifts of important items
5. Removal of previously important items

Respond with:
{
  "isSignificant": boolean,
  "confidence": number (0-1),
  "summary": "Brief explanation of changes",
  "keyChanges": ["change 1", "change 2", ...],
  "reasoning": "Why this is/isn't significant"
}
`;
```

### Result Formatting

Results are formatted for LLM analysis with key information:

```typescript
function formatResults(results: SearchResult[]): string {
  return results.map((r, idx) => `
[${idx + 1}] ${r.title}
   URL: ${r.url}
   Snippet: ${r.snippet}
   Source: ${r.source}
   Date: ${r.publishedAt || 'N/A'}
   Relevance: ${r.relevanceScore}
  `).join('\n');
}
```

### Analysis Response

The LLM returns structured analysis:

```typescript
interface DeltaAnalysisResponse {
  isSignificant: boolean;      // Should alert be triggered?
  confidence: number;           // 0-1 confidence score
  summary: string;              // Human-readable summary
  keyChanges: string[];         // List of specific changes
  reasoning: string;            // Explanation of decision
  citations: {                  // Supporting evidence
    resultId: string;
    relevance: number;
  }[];
}
```

## Confidence Scoring

### Base Confidence Calculation

The LLM provides a raw confidence score (0-1), which is then adjusted:

```typescript
function calculateFinalConfidence(
  llmConfidence: number,
  search: RecurringSearch,
  historicalData: AlertHistory
): number {
  let confidence = llmConfidence;
  
  // 1. Apply sensitivity multiplier
  const sensitivityMultiplier = {
    low: 0.8,     // Reduce false positives
    medium: 1.0,  // Balanced
    high: 1.2     // More sensitive, accept some FPs
  }[search.sensitivity];
  
  confidence *= sensitivityMultiplier;
  
  // 2. Adjust based on false positive rate
  const fpRate = historicalData.falsePositiveRate;
  if (fpRate > 0.3) {
    // High FP rate, be more conservative
    confidence *= 0.9;
  }
  
  // 3. Boost for consistent patterns
  if (historicalData.lastAlertWasRelevant) {
    confidence *= 1.05;
  }
  
  // 4. Cap at 1.0
  return Math.min(confidence, 1.0);
}
```

### Confidence Display

Confidence is shown to users with context:

| Score Range | Label | Icon | Color |
|-------------|-------|------|-------|
| 0.90 - 1.00 | Very High | ⚡ | Green |
| 0.75 - 0.89 | High | 📊 | Blue |
| 0.60 - 0.74 | Medium | ℹ️ | Yellow |
| 0.50 - 0.59 | Low | ⚠️ | Orange |
| 0.00 - 0.49 | Very Low | ❓ | Gray |

### Threshold Configuration

Tenant Admins configure minimum confidence:

```typescript
interface AlertThresholdConfig {
  minimumConfidence: number;      // Default: 0.70
  minimumVolumeChange: number;    // Default: 3 (results)
  minimumVolumeChangePercent: number; // Default: 20%
  requireBothThresholds: boolean; // Default: false (OR logic)
}
```

## Detection Prompts

### System Prompts (by Search Type)

#### Sales Opportunity Detection

```typescript
const salesOpportunityPrompt = `
Analyze search results for NEW SALES OPPORTUNITIES.

Focus on:
- NEW company mentions not in previous results
- Budget announcements or funding news
- Technology adoption signals (e.g., "evaluating", "seeking", "implementing")
- Hiring patterns indicating growth
- Partnership or expansion announcements
- RFP/RFQ releases
- Contract wins by others (potential competition)

Ignore:
- Minor news updates about existing items
- Reworded content with same information
- Routine company activities
- General industry news without specific opportunities

Be conservative. Only alert on ACTIONABLE opportunities.
`;
```

#### Risk Detection

```typescript
const riskDetectionPrompt = `
Analyze search results for RISKS, THREATS, or NEGATIVE DEVELOPMENTS.

Focus on:
- NEW negative news (security breaches, outages, lawsuits)
- Significant sentiment shifts (positive → negative)
- Regulatory investigations or enforcement actions
- Customer complaints or public backlash
- Service disruptions or quality issues
- Financial troubles (layoffs, revenue declines)
- Competitive threats (market share loss)

Ignore:
- Minor negative mentions
- Historical issues already known
- Opinion pieces without new facts
- Competitors' normal activities

Be sensitive but not alarmist. Focus on ACTIONABLE risks.
`;
```

#### Competitor Threat

```typescript
const competitorThreatPrompt = `
Analyze search results for COMPETITIVE THREATS or SIGNIFICANT MOVES.

Focus on:
- Product launches or major feature releases
- Pricing changes or promotional campaigns
- Strategic partnerships or acquisitions
- Market expansion (new regions, verticals)
- Customer wins (especially from your accounts)
- Technology breakthroughs or patents
- Executive hires (especially from your company)
- Funding rounds or financial strength signals

Ignore:
- Routine marketing activities
- Minor product updates
- General industry participation
- Unchanged competitive positioning

Be strategic. Alert on changes that IMPACT competitive positioning.
`;
```

#### Regulatory

```typescript
const regulatoryPrompt = `
Analyze search results for REGULATORY CHANGES or COMPLIANCE REQUIREMENTS.

Focus on:
- NEW legislation or proposed laws
- Regulatory announcements from official bodies
- Compliance deadlines or enforcement actions
- Industry standards updates (ISO, NIST, etc.)
- Policy changes affecting operations
- Court decisions setting precedent
- International regulatory developments

Ignore:
- General regulatory commentary
- Historical regulations
- Proposed but unlikely legislation
- Regulations for unrelated industries

Be thorough. Alert on ALL relevant regulatory changes.
`;
```

### User-Defined Prompts

Users can customize detection logic:

```typescript
interface UserDetectionPrompt {
  searchId: string;
  customPrompt?: string;  // Optional override
  focusAreas: string[];   // e.g., ["pricing", "partnerships"]
  ignorePatterns: string[]; // e.g., ["routine updates", "minor news"]
  keywords: {             // Boost/suppress specific terms
    boost: string[];      // Alert more on these
    suppress: string[];   // Alert less on these
  };
}
```

**Example User Prompt**:
```
Alert me when competitors announce partnerships with Fortune 500 companies
OR when they launch products in the healthcare vertical. Ignore general 
marketing announcements and routine blog posts.
```

## Learning System

### Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      Learning System                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  User Feedback ──▶ Pattern Analysis ──▶ Prompt Refinement       │
│       │                    │                     │                │
│       │                    │                     │                │
│       ▼                    ▼                     ▼                │
│  ┌─────────┐        ┌─────────────┐      ┌──────────────┐       │
│  │ Feedback│        │  Learning   │      │   Updated    │       │
│  │ Records │        │  Service    │      │   Prompts    │       │
│  └─────────┘        └─────────────┘      └──────────────┘       │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

### Feedback Collection

Users provide feedback on each alert:

```typescript
interface AlertFeedback {
  alertId: string;
  searchId: string;
  userId: string;
  tenantId: string;
  feedback: 'relevant' | 'irrelevant' | 'snooze';
  providedAt: string;
  comment?: string;  // Optional user explanation
}
```

**UI Feedback Interface**:
- ✅ **Relevant** - Alert was useful and actionable
- ❌ **Irrelevant** - Alert was not useful (false positive)
- 💤 **Snooze** - Not relevant right now, ask me later

### Pattern Analysis

The learning service analyzes feedback patterns:

```typescript
class LearningService {
  async analyzeFeedbackPatterns(searchId: string): Promise<LearningInsights> {
    const feedbacks = await this.getFeedbackHistory(searchId);
    
    // 1. Calculate false positive rate
    const fpRate = feedbacks.filter(f => f.feedback === 'irrelevant').length 
                   / feedbacks.length;
    
    // 2. Identify common characteristics of false positives
    const falsePositives = feedbacks.filter(f => f.feedback === 'irrelevant');
    const fpPatterns = await this.extractCommonPatterns(falsePositives);
    
    // 3. Identify characteristics of true positives
    const truePositives = feedbacks.filter(f => f.feedback === 'relevant');
    const tpPatterns = await this.extractCommonPatterns(truePositives);
    
    // 4. Generate recommendations
    return {
      fpRate,
      recommendedSensitivity: this.calculateOptimalSensitivity(fpRate),
      suppressionRules: fpPatterns.map(p => p.suppressionRule),
      boostRules: tpPatterns.map(p => p.boostRule),
      promptModifications: await this.generatePromptUpdates(fpPatterns, tpPatterns)
    };
  }
}
```

### Automatic Prompt Refinement

Based on learning insights, prompts are refined:

```typescript
async function refineDetectionPrompt(
  searchId: string,
  insights: LearningInsights
): Promise<string> {
  const basePrompt = await getDetectionPrompt(searchId);
  
  let refinedPrompt = basePrompt;
  
  // 1. Add suppression rules
  if (insights.suppressionRules.length > 0) {
    refinedPrompt += `\n\nADDITIONAL IGNORE PATTERNS (learned from feedback):`;
    insights.suppressionRules.forEach(rule => {
      refinedPrompt += `\n- ${rule}`;
    });
  }
  
  // 2. Add boost rules
  if (insights.boostRules.length > 0) {
    refinedPrompt += `\n\nPRIORITY SIGNALS (learned from feedback):`;
    insights.boostRules.forEach(rule => {
      refinedPrompt += `\n- ${rule}`;
    });
  }
  
  // 3. Adjust sensitivity guidance
  if (insights.fpRate > 0.3) {
    refinedPrompt += `\n\nIMPORTANT: Be more conservative. Recent alerts had ` +
                     `${(insights.fpRate * 100).toFixed(0)}% false positive rate.`;
  }
  
  return refinedPrompt;
}
```

### Sensitivity Auto-Adjustment

The system automatically adjusts sensitivity:

```typescript
function calculateOptimalSensitivity(fpRate: number): 'low' | 'medium' | 'high' {
  if (fpRate > 0.4) {
    // Too many false positives
    return 'low';
  } else if (fpRate < 0.1) {
    // Very accurate, can be more sensitive
    return 'high';
  } else {
    // Balanced
    return 'medium';
  }
}
```

**User Override**: Users can manually set sensitivity regardless of learning recommendations.

### Learning Metrics

Track learning system effectiveness:

```typescript
interface LearningMetrics {
  searchId: string;
  tenantId: string;
  totalAlerts: number;
  feedbackCount: number;
  feedbackRate: number;          // % of alerts with feedback
  falsePositiveRate: number;
  truePositiveRate: number;
  avgConfidenceForTruePositives: number;
  avgConfidenceForFalsePositives: number;
  promptRefinementCount: number;
  sensitivityAdjustments: {
    date: string;
    oldValue: string;
    newValue: string;
    reason: string;
  }[];
}
```

## False Positive Handling

### Detection

False positives are identified through:

1. **User Feedback**: Explicit "irrelevant" marking
2. **Snooze Patterns**: Multiple snoozes may indicate poor fit
3. **Low Engagement**: Alerts not opened within 7 days
4. **Confidence vs. Outcome**: Low confidence alerts marked irrelevant

### Response Strategy

When false positives are detected:

```typescript
async function handleFalsePositive(alert: Alert, feedback: AlertFeedback) {
  // 1. Record the false positive
  await recordFalsePositive(alert, feedback);
  
  // 2. Analyze the characteristics
  const characteristics = await analyzeAlertCharacteristics(alert);
  
  // 3. Check if this is a pattern
  const similarFPs = await findSimilarFalsePositives(
    alert.searchId, 
    characteristics
  );
  
  // 4. If pattern detected, create suppression rule
  if (similarFPs.length >= 3) {
    await createSuppressionRule(alert.searchId, characteristics);
    
    // 5. Notify user of improvement
    await notifyUser({
      type: 'learning_update',
      message: `I've learned from your feedback. I'll avoid alerting on ` +
               `similar items in the future.`,
      searchId: alert.searchId
    });
  }
  
  // 6. Refine prompt
  await refineDetectionPrompt(alert.searchId);
}
```

### Suppression Rules

Generated suppression rules are stored and applied:

```typescript
interface SuppressionRule {
  id: string;
  searchId: string;
  tenantId: string;
  ruleType: 'keyword' | 'source' | 'pattern' | 'semantic';
  condition: {
    // Depends on ruleType
    keywords?: string[];
    sources?: string[];
    pattern?: string;
    semanticDescription?: string;
  };
  createdAt: string;
  createdBy: 'user' | 'learning-system';
  appliedCount: number;  // How many times rule was applied
  effectiveness: number;  // 0-1 score based on feedback
}
```

**Example Rules**:
```typescript
// Suppress alerts about routine blog posts
{
  ruleType: 'pattern',
  condition: {
    pattern: 'blog post|routine update|weekly newsletter'
  }
}

// Suppress alerts from unreliable sources
{
  ruleType: 'source',
  condition: {
    sources: ['low-quality-site.com', 'spam-blog.net']
  }
}
```

### User Control

Users can:
- View active suppression rules
- Enable/disable individual rules
- Delete rules they disagree with
- Add manual suppression rules

## Search Type Detection

### Automatic Classification

When user creates a recurring search, the system classifies it:

```typescript
async function classifySearchType(
  query: string,
  description: string
): Promise<SearchType> {
  const prompt = `
Classify this search into one of: sales_opportunity, risk_detection,
competitor_threat, regulatory, or custom.

QUERY: ${query}
DESCRIPTION: ${description}

Respond with just the classification name.
  `;
  
  const classification = await llm.complete(prompt);
  return classification as SearchType;
}
```

### Type-Specific Detection

Each type uses optimized detection logic:

```typescript
const detectionConfig = {
  sales_opportunity: {
    basePrompt: salesOpportunityPrompt,
    defaultSensitivity: 'medium',
    defaultConfidenceThreshold: 0.70,
    focusSignals: ['new', 'seeking', 'evaluating', 'budget', 'funding']
  },
  risk_detection: {
    basePrompt: riskDetectionPrompt,
    defaultSensitivity: 'high',  // More sensitive to risks
    defaultConfidenceThreshold: 0.65,
    focusSignals: ['breach', 'outage', 'lawsuit', 'investigation', 'complaint']
  },
  competitor_threat: {
    basePrompt: competitorThreatPrompt,
    defaultSensitivity: 'medium',
    defaultConfidenceThreshold: 0.70,
    focusSignals: ['launch', 'partnership', 'acquisition', 'expansion', 'pricing']
  },
  regulatory: {
    basePrompt: regulatoryPrompt,
    defaultSensitivity: 'high',  // Don't miss regulations
    defaultConfidenceThreshold: 0.60,
    focusSignals: ['legislation', 'regulation', 'compliance', 'enforcement', 'deadline']
  },
  custom: {
    basePrompt: genericPrompt,
    defaultSensitivity: 'medium',
    defaultConfidenceThreshold: 0.70,
    focusSignals: []  // User-defined
  }
};
```

## Thresholds & Sensitivity

### Tenant-Level Configuration

Tenant Admins set default thresholds:

```typescript
interface TenantAlertConfig {
  tenantId: string;
  defaultConfidenceThreshold: number;  // 0-1, default 0.70
  defaultSensitivity: 'low' | 'medium' | 'high';
  defaultVolumeThreshold: number;      // Min result count change
  defaultVolumeThresholdPercent: number; // Min % change
  alertCooldownMinutes: number;        // Min time between alerts for same search
  maxAlertsPerDay: number;             // Global limit
  digestMode: {
    enabled: boolean;
    schedule: 'daily' | 'weekly';
    time: string;  // HH:mm in tenant timezone
  };
}
```

### Search-Level Overrides

Users can override for individual searches:

```typescript
interface SearchAlertConfig {
  searchId: string;
  confidenceThreshold?: number;  // Override tenant default
  sensitivity?: 'low' | 'medium' | 'high';
  volumeThreshold?: number;
  volumeThresholdPercent?: number;
  notificationChannels: string[];  // Which channels to use
  digestMode: boolean;  // Join digest or immediate
}
```

### Sensitivity Impact

| Sensitivity | Confidence Multiplier | Volume Threshold | Effect |
|-------------|----------------------|------------------|--------|
| Low | 0.8 | +50% | Fewer alerts, higher precision |
| Medium | 1.0 | Default | Balanced |
| High | 1.2 | -50% | More alerts, higher recall |

## Alert Content

### Alert Structure

```typescript
interface Alert {
  id: string;
  searchId: string;
  tenantId: string;
  userId: string;
  executionId: string;
  
  // Alert metadata
  triggeredAt: string;
  confidence: number;
  searchType: SearchType;
  
  // Alert content
  summary: string;              // AI-generated summary
  keyChanges: string[];         // Bullet points of changes
  reasoning: string;            // Why alert was triggered
  
  // Supporting data
  citations: Citation[];        // Links to results
  newResultsCount: number;
  changedResultsCount: number;
  removedResultsCount: number;
  
  // User interaction
  status: 'unread' | 'read' | 'acknowledged' | 'snoozed';
  feedback?: 'relevant' | 'irrelevant';
  feedbackComment?: string;
  feedbackAt?: string;
  snoozeUntil?: string;
  
  // Notification tracking
  notificationsSent: {
    channel: string;
    sentAt: string;
    status: 'sent' | 'failed' | 'pending';
  }[];
}
```

### Citation Format

```typescript
interface Citation {
  resultId: string;
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedAt?: string;
  relevanceScore: number;
  changeType: 'new' | 'modified' | 'removed' | 'ranking_change';
}
```

### AI Summary Generation

The summary is generated by LLM:

```typescript
const summaryPrompt = `
Generate a concise, actionable summary of the changes detected.

SEARCH TYPE: ${searchType}
CONFIDENCE: ${confidence}
KEY CHANGES: ${keyChanges.join(', ')}

Write a 2-3 sentence summary that:
1. States what changed
2. Explains why it matters
3. Suggests potential action (if applicable)

Be specific and use active voice.
`;

const summary = await llm.complete(summaryPrompt);
```

**Example Summaries**:

- **Sales Opportunity**: "Microsoft announced a $50M budget for AI infrastructure upgrades. This represents a potential opportunity for your cloud services. Consider reaching out to their procurement team."

- **Risk Detection**: "Your competitor experienced a data breach affecting 100K customers. Security concerns may create an opening to win their dissatisfied customers. Prepare messaging around your security practices."

- **Competitor Threat**: "Competitor X launched a new product with pricing 30% lower than yours in the healthcare vertical. This could impact your market share. Review your pricing strategy."

## User Feedback

### Feedback Interface

Users provide feedback directly in the alert:

```typescript
interface FeedbackUI {
  alertId: string;
  buttons: [
    {
      label: 'Relevant ✅',
      action: 'mark-relevant',
      style: 'success'
    },
    {
      label: 'Not Relevant ❌',
      action: 'mark-irrelevant',
      style: 'danger'
    },
    {
      label: 'Snooze 💤',
      action: 'snooze',
      options: ['1 hour', '1 day', '1 week', 'Custom']
    }
  ];
  commentField: {
    placeholder: 'Optional: Help us improve by explaining why',
    maxLength: 500
  };
}
```

### Feedback Processing

When feedback is submitted:

```typescript
async function processFeedback(
  alertId: string,
  feedback: 'relevant' | 'irrelevant',
  comment?: string
) {
  // 1. Update alert record
  await updateAlert(alertId, { feedback, feedbackComment: comment });
  
  // 2. Update statistics
  await updateAlertStats(alertId, feedback);
  
  // 3. Trigger learning if irrelevant
  if (feedback === 'irrelevant') {
    await learningService.analyzeFalsePositive(alertId, comment);
  }
  
  // 4. If multiple feedback points, refine prompt
  const search = await getSearchForAlert(alertId);
  const feedbackCount = await getFeedbackCount(search.id);
  
  if (feedbackCount >= 5 && feedbackCount % 5 === 0) {
    // Every 5 feedback points, refine
    await refineDetectionPrompt(search.id);
    
    // Notify user of improvement
    await notifyUser({
      type: 'learning_update',
      message: `Your feedback is helping me improve. I've updated the ` +
               `alert detection for "${search.name}".`,
      searchId: search.id
    });
  }
}
```

## Statistics & Analytics

### Per-Search Statistics

```typescript
interface SearchAlertStats {
  searchId: string;
  tenantId: string;
  
  // Execution stats
  totalExecutions: number;
  alertsTriggered: number;
  alertRate: number;  // alerts / executions
  
  // Feedback stats
  alertsWithFeedback: number;
  relevantCount: number;
  irrelevantCount: number;
  snoozedCount: number;
  
  // Accuracy metrics
  precision: number;  // relevant / (relevant + irrelevant)
  falsePositiveRate: number;  // irrelevant / total feedback
  
  // Confidence stats
  avgConfidence: number;
  avgConfidenceForRelevant: number;
  avgConfidenceForIrrelevant: number;
  
  // Learning stats
  promptRefinements: number;
  suppressionRules: number;
  currentSensitivity: string;
  
  // Time stats
  lastAlertAt?: string;
  lastFeedbackAt?: string;
}
```

### Tenant-Level Analytics

```typescript
interface TenantAlertAnalytics {
  tenantId: string;
  period: string;  // e.g., "2025-12"
  
  // Aggregate stats
  totalSearches: number;
  activeSearches: number;
  totalAlerts: number;
  avgAlertsPerSearch: number;
  
  // Accuracy by search type
  accuracyByType: {
    searchType: SearchType;
    precision: number;
    falsePositiveRate: number;
    alertCount: number;
  }[];
  
  // Top performing searches (by precision)
  topSearches: {
    searchId: string;
    searchName: string;
    precision: number;
    alertCount: number;
  }[];
  
  // Searches needing attention (high FP rate)
  searchesNeedingAttention: {
    searchId: string;
    searchName: string;
    falsePositiveRate: number;
    recommendedAction: string;
  }[];
  
  // Learning system health
  learningMetrics: {
    totalFeedback: number;
    feedbackRate: number;
    avgPromptRefinementsPerSearch: number;
    avgFPRateImprovement: number;  // Before vs. after learning
  };
}
```

### Dashboard Visualizations

**Tenant Admin Dashboard**:
- Alert accuracy over time (line chart)
- False positive rate by search type (bar chart)
- Top searches by alert volume (table)
- Feedback rate trends (line chart)
- Learning system improvements (metrics)

**Super Admin Dashboard**:
- Global alert metrics across all tenants
- Learning system effectiveness
- Model performance by search type
- Tenant-level comparisons

## Related Documentation

- [RECURRING-SEARCH-OVERVIEW.md](./RECURRING-SEARCH-OVERVIEW.md) - System architecture
- [RECURRING-SEARCH-DATABASE.md](./RECURRING-SEARCH-DATABASE.md) - Database schema
- [RECURRING-SEARCH-SERVICES.md](./RECURRING-SEARCH-SERVICES.md) - Service implementations
- [NOTIFICATIONS.md](./NOTIFICATIONS.md) - Notification system
- [INTENT-CLASSIFICATION.md](./INTENT-CLASSIFICATION.md) - Search type classification
- [CONTEXT-ASSEMBLY.md](./CONTEXT-ASSEMBLY.md) - Context building for LLM
- [PROMPT-ENGINEERING.md](./PROMPT-ENGINEERING.md) - Prompt management
