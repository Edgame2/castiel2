# AI Insights Feedback & Continuous Learning System

## Overview

The Feedback & Continuous Learning system enables AI Insights to improve over time by collecting user feedback, analyzing performance patterns, and automatically adjusting configurations to optimize quality, relevance, and user satisfaction.

## Core Concepts

### Feedback Loop Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTINUOUS LEARNING PIPELINE                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐    │
│  │ COLLECT  │──►│ ANALYZE  │──►│  LEARN   │──►│  APPLY   │    │
│  │ Feedback │   │ Patterns │   │ Optimize │   │ Changes  │    │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘    │
│       │              │              │              │            │
│       ▼              ▼              ▼              ▼            │
│   Thumbs up/   Pattern Mining   Model Tuning   Auto-deploy    │
│   Corrections   Quality Metrics  Template Opt   A/B Testing    │
│   Annotations   Error Analysis   Intent Rules   Monitoring     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### 1. Feedback Collection

**Container Name**: `feedback`  
**Partition Key (HPK)**: `[tenantId, insightId, userId]`

#### InsightFeedback Document

```typescript
interface InsightFeedback {
  id: string;
  partitionKey: [string, string, string]; // [tenantId, insightId, userId]
  type: 'user_feedback';
  
  // Reference
  insightId: string;              // Message or insight ID
  conversationId: string;
  
  // User feedback
  userId: string;
  rating: 'thumbs_up' | 'thumbs_down' | 'neutral';
  
  // Specific issues
  issues: Array<
    | 'incorrect_information'
    | 'incomplete_answer'
    | 'outdated_information'
    | 'poor_citations'
    | 'unhelpful'
    | 'hallucination'
    | 'irrelevant_context'
    | 'wrong_intent'
    | 'slow_response'
    | 'formatting_issues'
  >;
  
  // Detailed feedback
  comment?: string;
  suggestedCorrection?: string;
  expectedAnswer?: string;
  
  // What went wrong (system analysis)
  diagnosis?: {
    intentMismatch?: boolean;
    contextGaps?: string[];        // Missing shard IDs
    citationErrors?: string[];
    modelIssue?: string;
  };
  
  // Resolution
  resolved: boolean;
  resolution?: {
    action: 'retrained' | 'template_updated' | 'intent_adjusted' | 'dismissed';
    appliedAt: Date;
    notes: string;
  };
  
  // Metadata
  feedbackAt: Date;
  userAgent: string;
  sessionId: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

**Container Configuration**:
```typescript
{
  id: 'feedback',
  partitionKey: {
    paths: ['/partitionKey/0', '/partitionKey/1', '/partitionKey/2'],
    kind: 'MultiHash',
    version: 2
  },
  indexingPolicy: {
    automatic: true,
    indexingMode: 'consistent',
    includedPaths: [
      { path: '/insightId/*' },
      { path: '/conversationId/*' },
      { path: '/rating/*' },
      { path: '/issues/*' },
      { path: '/resolved/*' },
      { path: '/feedbackAt/*' }
    ]
  }
}
```

### 2. Pattern Detection

**Container Name**: `learning`  
**Partition Key**: `tenantId`

#### LearningPattern Document

```typescript
interface LearningPattern {
  id: string;
  partitionKey: string; // tenantId
  type: 'pattern' | 'quality_metric' | 'improvement_suggestion';
    { path: '/resolved' },
    { path: '/feedbackAt' },
    { path: '/issues/*' }
  ]
}
```

### 2. Learning Patterns

#### Learning Container

**Container Name**: `learning`  
**Partition Key**: `tenantId`

```typescript
interface LearningPattern {
  id: string;
  partitionKey: string; // tenantId
  type: 'pattern' | 'improvement_suggestion';
  
  // Pattern identification
  patternType: 
    | 'intent_confusion'           // Users correct intent classification
    | 'context_gap'                // Missing relevant context
    | 'model_weakness'             // Model consistently fails on topic
    | 'template_issue'             // Template not retrieving right data
    | 'citation_error'             // Poor citation quality
    | 'latency_issue';             // Slow responses
  
  // Pattern details
  description: string;
  frequency: number;               // How often this occurs
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Affected areas
  affectedIntents?: string[];
  affectedTemplates?: string[];
  affectedModels?: string[];
  affectedShardTypes?: string[];
  
  // Evidence
  feedbackIds: string[];           // Supporting feedback
  exampleConversations: string[];
  
  // Recommended actions
  recommendations: Array<{
    action: string;
    priority: number;
    estimatedImpact: 'low' | 'medium' | 'high';
    automatable: boolean;
  }>;
  
  // Resolution
  status: 'identified' | 'analyzing' | 'implementing' | 'resolved' | 'dismissed';
  resolution?: {
    implementedAt: Date;
    changes: string[];
    measuredImprovement: number;  // % improvement
  };
  
  // Metadata
  identifiedAt: Date;
  lastOccurrence: Date;
  autoGenerated: boolean;
}
```

### 3. Quality Metrics

#### Quality Metrics (Embedded in Feedback Container)

**Note**: Quality metrics are stored as a `type: 'quality_metric'` in the `feedback` container.

```typescript
interface InsightQuality {
  id: string;
  partitionKey: [string, string, string]; // [tenantId, insightId, 'quality']
  type: 'quality_metric';
  
  // Reference
  insightId: string;
  conversationId: string;
  
  // Automatic quality scores
  scores: {
    relevance: number;             // 0-1, context relevance to query
    completeness: number;          // 0-1, answers full question
    accuracy: number;              // 0-1, grounding/citation quality
    readability: number;           // 0-1, Flesch reading ease
    coherence: number;             // 0-1, logical flow
    overall: number;               // Weighted average
  };
  
  // Grounding analysis
  grounding: {
    citationCount: number;
    citationCoverage: number;      // % of response cited
    supportScore: number;          // Average support score
    hallucinations: number;        // Detected unsupported claims
  };
  
  // Performance metrics
  performance: {
    latency: number;               // Total response time (ms)
    contextAssemblyTime: number;
    modelInferenceTime: number;
    tokensUsed: number;
    cost: number;
  };
  
  // Context analysis
  context: {
    shardsUsed: number;
    relevanceScores: number[];     // Per-shard relevance
    avgRelevance: number;
    missingContext?: string[];     // Identified gaps
  };
  
  // User engagement
  engagement: {
    readTime?: number;             // How long user read response
    followUpQuestions: number;
    copied: boolean;
    shared: boolean;
  };
  
  // Quality flags
  flags: Array<
    | 'excellent'
    | 'acceptable'
    | 'needs_improvement'
    | 'poor'
    | 'potential_hallucination'
    | 'low_confidence'
    | 'high_latency'
  >;
  
  // Metadata
  evaluatedAt: Date;
  evaluationVersion: string;       // Algorithm version
}
```

### 4. Improvement Tracking

#### Improvements (Stored in Learning Container)

**Note**: Improvements are stored as `type: 'improvement_suggestion'` in the `learning` container.

```typescript
interface Improvement {
  id: string;
  partitionKey: string; // tenantId
  type: 'improvement_suggestion';
  
  // Improvement details
  name: string;
  description: string;
  category: 
    | 'intent_classification'
    | 'context_template'
    | 'model_selection'
    | 'prompt_engineering'
    | 'grounding'
    | 'performance';
  
  // Change details
  changes: Array<{
    target: string;                // What was changed (template ID, etc.)
    before: any;                   // Previous configuration
    after: any;                    // New configuration
    reason: string;
  }>;
  
  // A/B Testing
  experiment?: {
    experimentId: string;
    variant: 'control' | 'treatment';
    rolloutPercentage: number;
    startDate: Date;
    endDate?: Date;
  };
  
  // Metrics tracking
  metrics: {
    before: {
      avgQuality: number;
      avgLatency: number;
      userSatisfaction: number;
      errorRate: number;
    };
    after?: {
      avgQuality: number;
      avgLatency: number;
      userSatisfaction: number;
      errorRate: number;
    };
    improvement: {
      quality: number;             // % change
      latency: number;
      satisfaction: number;
      errors: number;
    };
  };
  
  // Status
  status: 'planned' | 'testing' | 'deployed' | 'rolled_back' | 'completed';
  approvedBy?: string;             // Super admin user ID
  
  // Metadata
  createdAt: Date;
  deployedAt?: Date;
  completedAt?: Date;
}
```

## API Reference

### Feedback Collection API

#### Submit Feedback

```http
POST /api/v1/insights/feedback
Authorization: Bearer {token}
Content-Type: application/json
```

**Request**:
```typescript
{
  insightId: string;
  conversationId: string;
  rating: 'thumbs_up' | 'thumbs_down' | 'neutral';
  issues?: string[];
  comment?: string;
  suggestedCorrection?: string;
  expectedAnswer?: string;
}
```

**Response**:
```typescript
{
  feedbackId: string;
  message: string;
  thankYou: string;
}
```

#### Get Feedback Analytics

```http
GET /api/v1/insights/feedback/analytics
Authorization: Bearer {token}
```

**Query Parameters**:
- `startDate`: ISO date
- `endDate`: ISO date
- `groupBy`: 'day' | 'week' | 'month' | 'intent' | 'template'

**Response**:
```typescript
{
  summary: {
    totalFeedback: number;
    positiveRate: number;
    negativeRate: number;
    avgQuality: number;
  };
  byCategory: {
    [category: string]: {
      count: number;
      percentage: number;
    };
  };
  trends: Array<{
    date: string;
    positive: number;
    negative: number;
    neutral: number;
  }>;
  topIssues: Array<{
    issue: string;
    count: number;
    examples: string[];
  }>;
}
```

### Learning Patterns API (Super Admin)

#### List Learning Patterns

```http
GET /api/v1/admin/insights/learning-patterns
Authorization: Bearer {token}
```

**Query Parameters**:
- `status`: 'identified' | 'analyzing' | 'implementing' | 'resolved'
- `severity`: 'low' | 'medium' | 'high' | 'critical'
- `patternType`: Pattern type filter

**Response**:
```typescript
{
  patterns: Array<{
    id: string;
    patternType: string;
    description: string;
    frequency: number;
    severity: string;
    status: string;
    recommendations: Recommendation[];
    identifiedAt: Date;
  }>;
  total: number;
}
```

#### Analyze Pattern

```http
POST /api/v1/admin/insights/learning-patterns/{patternId}/analyze
Authorization: Bearer {token}
```

**Response**:
```typescript
{
  analysis: {
    rootCause: string;
    affectedUsers: number;
    estimatedImpact: string;
    suggestedFixes: Array<{
      action: string;
      effort: 'low' | 'medium' | 'high';
      impact: 'low' | 'medium' | 'high';
      automatable: boolean;
    }>;
  };
}
```

#### Implement Fix

```http
POST /api/v1/admin/insights/learning-patterns/{patternId}/implement
Authorization: Bearer {token}
Content-Type: application/json
```

**Request**:
```typescript
{
  action: string;
  changes: any;
  testFirst: boolean;        // A/B test before full rollout
  rolloutPercentage?: number;
  notes?: string;
}
```

### Quality Monitoring API

#### Get Quality Dashboard

```http
GET /api/v1/insights/quality/dashboard
Authorization: Bearer {token}
```

**Response**:
```typescript
{
  overview: {
    avgQuality: number;
    avgLatency: number;
    satisfactionRate: number;
    totalInsights: number;
  };
  qualityTrends: Array<{
    date: string;
    avgRelevance: number;
    avgAccuracy: number;
    avgCompleteness: number;
  }>;
  lowQualityAlerts: Array<{
    insightId: string;
    issues: string[];
    severity: string;
  }>;
  recommendations: string[];
}
```

#### Get Insight Quality Score

```http
GET /api/v1/insights/{insightId}/quality
Authorization: Bearer {token}
```

**Response**:
```typescript
{
  insightId: string;
  scores: {
    relevance: number;
    completeness: number;
    accuracy: number;
    readability: number;
    overall: number;
  };
  grounding: {
    citationCount: number;
    citationCoverage: number;
    supportScore: number;
  };
  flags: string[];
  recommendations: string[];
}
```

### Improvements API (Super Admin)

#### List Improvements

```http
GET /api/v1/admin/insights/improvements
Authorization: Bearer {token}
```

**Response**:
```typescript
{
  improvements: Array<{
    id: string;
    name: string;
    category: string;
    status: string;
    metrics: {
      qualityImprovement: number;
      latencyImprovement: number;
      satisfactionImprovement: number;
    };
    deployedAt?: Date;
  }>;
}
```

#### Create Improvement

```http
POST /api/v1/admin/insights/improvements
Authorization: Bearer {token}
Content-Type: application/json
```

**Request**:
```typescript
{
  name: string;
  description: string;
  category: string;
  changes: Array<{
    target: string;
    before: any;
    after: any;
    reason: string;
  }>;
  experiment?: {
    rolloutPercentage: number;
    duration: number;  // days
  };
}
```

#### Deploy Improvement

```http
POST /api/v1/admin/insights/improvements/{improvementId}/deploy
Authorization: Bearer {token}
Content-Type: application/json
```

**Request**:
```typescript
{
  rolloutPercentage: number;  // 0-100
  immediate: boolean;
}
```

## UI Specifications

### User Feedback Interface

#### In-Chat Feedback

```typescript
// After each AI response
<MessageCard>
  <MessageContent>{content}</MessageContent>
  
  <FeedbackActions>
    <IconButton 
      icon="thumbs-up"
      onClick={() => submitFeedback('thumbs_up')}
      active={feedback === 'thumbs_up'}
    />
    <IconButton 
      icon="thumbs-down"
      onClick={() => openFeedbackDialog('thumbs_down')}
      active={feedback === 'thumbs_down'}
    />
    <IconButton 
      icon="flag"
      onClick={() => openReportDialog()}
      tooltip="Report issue"
    />
  </FeedbackActions>
</MessageCard>

// Detailed feedback dialog (on thumbs down)
<Dialog title="Help us improve">
  <RadioGroup label="What went wrong?">
    <Radio value="incorrect">Incorrect information</Radio>
    <Radio value="incomplete">Incomplete answer</Radio>
    <Radio value="outdated">Outdated information</Radio>
    <Radio value="poor_citations">Poor citations</Radio>
    <Radio value="unhelpful">Not helpful</Radio>
    <Radio value="hallucination">AI made things up</Radio>
    <Radio value="wrong_intent">Misunderstood my question</Radio>
  </RadioGroup>
  
  <TextArea 
    label="Additional details (optional)"
    placeholder="What could be better?"
  />
  
  <TextArea 
    label="Expected answer (optional)"
    placeholder="What answer did you expect?"
  />
  
  <Checkbox>
    Send me updates when this is fixed
  </Checkbox>
  
  <Button onClick={submitDetailedFeedback}>Submit</Button>
</Dialog>
```

#### Quality Indicator

```typescript
// Show quality score to users (optional)
<QualityBadge score={qualityScore}>
  <Icon name="check-circle" color={getColor(qualityScore)} />
  <Tooltip>
    <div>
      <div>Relevance: {scores.relevance * 100}%</div>
      <div>Accuracy: {scores.accuracy * 100}%</div>
      <div>Citations: {grounding.citationCount}</div>
    </div>
  </Tooltip>
</QualityBadge>
```

### Super Admin - Learning Dashboard

#### Pattern Discovery View

```typescript
<AdminLayout>
  <PageHeader>
    <Title>Learning Patterns</Title>
    <Subtitle>Identified improvement opportunities</Subtitle>
  </PageHeader>
  
  <FilterBar>
    <Select 
      label="Status"
      options={['identified', 'analyzing', 'implementing', 'resolved']}
    />
    <Select 
      label="Severity"
      options={['critical', 'high', 'medium', 'low']}
    />
    <Select 
      label="Pattern Type"
      options={patternTypes}
    />
  </FilterBar>
  
  <PatternList>
    {patterns.map(pattern => (
      <PatternCard key={pattern.id}>
        <PatternHeader>
          <SeverityBadge severity={pattern.severity} />
          <PatternTitle>{pattern.description}</PatternTitle>
          <StatusBadge status={pattern.status} />
        </PatternHeader>
        
        <PatternMetrics>
          <Metric label="Frequency" value={pattern.frequency} />
          <Metric label="Users Affected" value={pattern.affectedUsers} />
          <Metric label="First Seen" value={pattern.identifiedAt} />
        </PatternMetrics>
        
        <RecommendationList>
          {pattern.recommendations.map(rec => (
            <Recommendation>
              <Icon name={rec.automatable ? 'zap' : 'wrench'} />
              <Text>{rec.action}</Text>
              <Badge>Impact: {rec.estimatedImpact}</Badge>
              {rec.automatable && (
                <Button 
                  size="sm"
                  onClick={() => implementFix(pattern.id, rec)}
                >
                  Auto-Fix
                </Button>
              )}
            </Recommendation>
          ))}
        </RecommendationList>
        
        <PatternActions>
          <Button 
            variant="secondary"
            onClick={() => analyzePattern(pattern.id)}
          >
            Analyze
          </Button>
          <Button 
            onClick={() => implementPattern(pattern.id)}
          >
            Implement Fix
          </Button>
          <Button 
            variant="ghost"
            onClick={() => dismissPattern(pattern.id)}
          >
            Dismiss
          </Button>
        </PatternActions>
      </PatternCard>
    ))}
  </PatternList>
</AdminLayout>
```

#### Quality Analytics Dashboard

```typescript
<DashboardLayout>
  <MetricsGrid>
    <MetricCard
      title="Average Quality Score"
      value={avgQuality}
      trend={qualityTrend}
      sparkline={qualityHistory}
    />
    <MetricCard
      title="User Satisfaction"
      value={satisfactionRate}
      trend={satisfactionTrend}
      sparkline={satisfactionHistory}
    />
    <MetricCard
      title="Average Latency"
      value={avgLatency}
      trend={latencyTrend}
      sparkline={latencyHistory}
    />
    <MetricCard
      title="Citation Quality"
      value={citationQuality}
      trend={citationTrend}
      sparkline={citationHistory}
    />
  </MetricsGrid>
  
  <ChartsGrid>
    <Chart title="Quality Trends Over Time">
      <LineChart
        data={qualityTrends}
        series={['relevance', 'accuracy', 'completeness']}
      />
    </Chart>
    
    <Chart title="Feedback Distribution">
      <PieChart
        data={feedbackDistribution}
        colors={['success', 'warning', 'danger']}
      />
    </Chart>
    
    <Chart title="Top Issues">
      <BarChart
        data={topIssues}
        sortBy="count"
        limit={10}
      />
    </Chart>
    
    <Chart title="Quality by Intent Type">
      <BarChart
        data={qualityByIntent}
        groupBy="intent"
      />
    </Chart>
  </ChartsGrid>
  
  <AlertsSection>
    <SectionHeader>Low Quality Alerts</SectionHeader>
    <AlertList>
      {lowQualityAlerts.map(alert => (
        <Alert severity="warning">
          <AlertTitle>Quality Issue Detected</AlertTitle>
          <AlertDescription>
            Insight {alert.insightId} has quality score below threshold
          </AlertDescription>
          <AlertActions>
            <Button size="sm" onClick={() => viewInsight(alert.insightId)}>
              View
            </Button>
            <Button size="sm" variant="secondary" onClick={() => analyzeIssue(alert)}>
              Analyze
            </Button>
          </AlertActions>
        </Alert>
      ))}
    </AlertList>
  </AlertsSection>
</DashboardLayout>
```

#### Improvement Management

```typescript
<AdminLayout>
  <PageHeader>
    <Title>Improvements</Title>
    <Button onClick={createImprovement}>
      <Icon name="plus" />
      New Improvement
    </Button>
  </PageHeader>
  
  <ImprovementList>
    {improvements.map(improvement => (
      <ImprovementCard key={improvement.id}>
        <Header>
          <Title>{improvement.name}</Title>
          <StatusBadge status={improvement.status} />
        </Header>
        
        <Description>{improvement.description}</Description>
        
        <MetricsComparison>
          <MetricChange
            label="Quality"
            before={improvement.metrics.before.avgQuality}
            after={improvement.metrics.after?.avgQuality}
            improvement={improvement.metrics.improvement.quality}
          />
          <MetricChange
            label="Latency"
            before={improvement.metrics.before.avgLatency}
            after={improvement.metrics.after?.avgLatency}
            improvement={improvement.metrics.improvement.latency}
            inverse={true}  // Lower is better
          />
          <MetricChange
            label="Satisfaction"
            before={improvement.metrics.before.userSatisfaction}
            after={improvement.metrics.after?.userSatisfaction}
            improvement={improvement.metrics.improvement.satisfaction}
          />
        </MetricsComparison>
        
        {improvement.experiment && (
          <ExperimentStatus>
            <ProgressBar 
              value={improvement.experiment.rolloutPercentage}
              label={`Rolled out to ${improvement.experiment.rolloutPercentage}% of users`}
            />
            <ExperimentMetrics>
              <Metric label="Start Date" value={improvement.experiment.startDate} />
              <Metric label="End Date" value={improvement.experiment.endDate} />
              <Metric label="Variant" value={improvement.experiment.variant} />
            </ExperimentMetrics>
          </ExperimentStatus>
        )}
        
        <Actions>
          {improvement.status === 'testing' && (
            <>
              <Button onClick={() => increaseRollout(improvement.id)}>
                Increase Rollout
              </Button>
              <Button onClick={() => deployFully(improvement.id)}>
                Deploy to All
              </Button>
              <Button 
                variant="danger"
                onClick={() => rollback(improvement.id)}
              >
                Rollback
              </Button>
            </>
          )}
          {improvement.status === 'planned' && (
            <Button onClick={() => startTest(improvement.id)}>
              Start A/B Test
            </Button>
          )}
        </Actions>
      </ImprovementCard>
    ))}
  </ImprovementList>
</AdminLayout>
```

## Implementation

### 1. Feedback Collection Service

```typescript
// apps/api/src/services/ai-insights/feedback.service.ts
export class FeedbackService {
  async submitFeedback(
    userId: string,
    tenantId: string,
    feedback: FeedbackInput
  ): Promise<InsightFeedback> {
    // Create feedback document
    const feedbackDoc = await this.feedbackContainer.items.create<InsightFeedback>({
      type: 'user_feedback',
      tenantId,
      partitionKey: [tenantId, feedback.insightId, userId],
      userId,
      insightId: feedback.insightId,
      conversationId: feedback.conversationId,
      rating: feedback.rating,
      issues: feedback.issues || [],
      comment: feedback.comment,
      suggestedCorrection: feedback.suggestedCorrection,
      expectedAnswer: feedback.expectedAnswer,
      resolved: false,
      feedbackAt: new Date(),
      userAgent: feedback.userAgent,
      sessionId: feedback.sessionId
    });
    
    // Trigger async analysis
    await this.queueFeedbackAnalysis(feedbackDoc.resource.id);
    
    // Update quality metrics
    await this.updateQualityMetrics(feedback.insightId, feedback.rating);
    
    // Send thank you notification
    await this.notificationService.send({
      userId,
      tenantId,
      type: 'feedback_received',
      title: 'Thank you for your feedback!',
      message: 'Your feedback helps us improve AI Insights.'
    });
    
    return feedbackDoc.resource;
  }
  
  async analyzeFeedback(feedbackId: string): Promise<void> {
    const feedback = await this.getFeedback(feedbackId);
    const insight = await this.getInsight(feedback.insightId);
    
    // Diagnose what went wrong
    const diagnosis: FeedbackDiagnosis = {
      intentMismatch: await this.checkIntentMatch(feedback, insight),
      contextGaps: await this.identifyContextGaps(feedback, insight),
      citationErrors: await this.analyzeCitations(feedback, insight),
      modelIssue: await this.checkModelPerformance(insight)
    };
    
    // Update feedback with diagnosis
    await this.updateFeedback(feedbackId, { diagnosis });
    
    // Check for patterns
    await this.patternDetectionService.checkForPatterns(feedback);
  }
  
  async getFeedbackAnalytics(
    tenantId: string,
    filters: AnalyticsFilters
  ): Promise<FeedbackAnalytics> {
    const feedbacks = await this.queryFeedbacks(tenantId, filters);
    
    return {
      summary: this.calculateSummary(feedbacks),
      byCategory: this.groupByCategory(feedbacks),
      trends: this.calculateTrends(feedbacks, filters.groupBy),
      topIssues: this.identifyTopIssues(feedbacks)
    };
  }
}
```

### 2. Pattern Detection Service

```typescript
// apps/api/src/services/ai-insights/pattern-detection.service.ts
export class PatternDetectionService {
  async checkForPatterns(feedback: InsightFeedback): Promise<void> {
    // Check for existing patterns
    const existingPatterns = await this.findRelatedPatterns(feedback);
    
    if (existingPatterns.length > 0) {
      // Update existing patterns
      for (const pattern of existingPatterns) {
        await this.updatePattern(pattern.id, {
          frequency: pattern.frequency + 1,
          feedbackIds: [...pattern.feedbackIds, feedback.id],
          lastOccurrence: new Date()
        });
      }
    } else {
      // Check if this is a new pattern
      const similarFeedbacks = await this.findSimilarFeedbacks(feedback);
      
      if (similarFeedbacks.length >= 3) {  // Threshold for new pattern
        await this.createNewPattern(feedback, similarFeedbacks);
      }
    }
  }
  
  async createNewPattern(
    feedback: InsightFeedback,
    similarFeedbacks: InsightFeedback[]
  ): Promise<LearningPattern> {
    // Analyze the pattern
    const analysis = await this.analyzePattern([feedback, ...similarFeedbacks]);
    
    const pattern = await this.learningContainer.items.create<LearningPattern>({
      type: 'pattern',
      tenantId: feedback.tenantId,
      partitionKey: [feedback.tenantId],
      patternType: analysis.type,
      description: analysis.description,
      frequency: similarFeedbacks.length + 1,
      severity: analysis.severity,
      affectedIntents: analysis.affectedIntents,
      affectedTemplates: analysis.affectedTemplates,
      feedbackIds: [feedback.id, ...similarFeedbacks.map(f => f.id)],
      exampleConversations: analysis.exampleConversations,
      recommendations: analysis.recommendations,
      status: 'identified',
      identifiedAt: new Date(),
      lastOccurrence: new Date(),
      autoGenerated: true
    });
    
    // Notify admins
    await this.notifyAdmins(pattern);
    
    return pattern;
  }
  
  async analyzePattern(feedbacks: InsightFeedback[]): Promise<PatternAnalysis> {
    // Use LLM to analyze the pattern
    const prompt = `
      Analyze these user feedbacks and identify the underlying pattern:
      
      ${feedbacks.map((f, i) => `
        Feedback ${i + 1}:
        - Issue: ${f.issues.join(', ')}
        - Comment: ${f.comment}
        - Correction: ${f.suggestedCorrection}
      `).join('\n')}
      
      Provide:
      1. Pattern type (intent_confusion, context_gap, model_weakness, etc.)
      2. Clear description of the pattern
      3. Severity (low, medium, high, critical)
      4. Affected areas (intents, templates, models)
      5. Recommended actions with priority
    `;
    
    const analysis = await this.llmService.analyze(prompt);
    
    return this.parsePatternAnalysis(analysis);
  }
}
```

### 3. Quality Monitoring Service

```typescript
// apps/api/src/services/ai-insights/quality-monitoring.service.ts
export class QualityMonitoringService {
  async evaluateInsightQuality(
    insightId: string,
    response: AIResponse
  ): Promise<InsightQuality> {
    // Calculate quality scores
    const scores = {
      relevance: await this.calculateRelevance(response),
      completeness: await this.calculateCompleteness(response),
      accuracy: await this.calculateAccuracy(response),
      readability: this.calculateReadability(response.content),
      coherence: await this.calculateCoherence(response),
      overall: 0  // Will calculate weighted average
    };
    
    scores.overall = this.calculateOverallScore(scores);
    
    // Analyze grounding
    const grounding = {
      citationCount: response.citations.length,
      citationCoverage: this.calculateCitationCoverage(response),
      supportScore: response.groundingMetadata?.supportScore || 0,
      hallucinations: await this.detectHallucinations(response)
    };
    
    // Analyze context
    const contextAnalysis = {
      shardsUsed: response.context.length,
      relevanceScores: response.context.map(s => s.relevanceScore || 0),
      avgRelevance: this.average(response.context.map(s => s.relevanceScore || 0)),
      missingContext: await this.identifyMissingContext(response)
    };
    
    // Determine quality flags
    const flags = this.determineQualityFlags(scores, grounding, contextAnalysis);
    
    // Create quality document in feedback container
    const quality = await this.feedbackContainer.items.create<InsightQuality>({
      type: 'quality_metric',
      tenantId: response.tenantId,
      partitionKey: [response.tenantId, insightId, 'system'],
      insightId,
      conversationId: response.conversationId,
      scores,
      grounding,
      performance: response.performance,
      context: contextAnalysis,
      engagement: {},  // Will be updated as user interacts
      flags,
      evaluatedAt: new Date(),
      evaluationVersion: '1.0.0'
    });
    
    // Alert if quality is below threshold
    if (scores.overall < 0.6 || flags.includes('potential_hallucination')) {
      await this.alertLowQuality(quality);
    }
    
    return quality;
  }
  
  private calculateReadability(text: string): number {
    // Flesch Reading Ease Score
    const sentences = text.split(/[.!?]+/).length;
    const words = text.split(/\s+/).length;
    const syllables = this.countSyllables(text);
    
    const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
    
    // Normalize to 0-1
    return Math.max(0, Math.min(1, score / 100));
  }
  
  private async calculateRelevance(response: AIResponse): Promise<number> {
    // Use LLM to evaluate relevance
    const prompt = `
      Query: ${response.query}
      Response: ${response.content}
      
      Rate the relevance of the response to the query on a scale of 0-1.
      Consider:
      - Does it answer the question?
      - Is it on-topic?
      - Does it address all parts of the query?
    `;
    
    const result = await this.llmService.evaluate(prompt);
    return result.score;
  }
}
```

### 4. Improvement Service

```typescript
// apps/api/src/services/ai-insights/improvement.service.ts
export class ImprovementService {
  async createImprovement(
    adminUserId: string,
    tenantId: string,
    improvement: ImprovementInput
  ): Promise<Improvement> {
    // Measure baseline metrics
    const baseline = await this.measureCurrentMetrics(tenantId, improvement.category);
    
    const improvementDoc = await this.learningContainer.items.create<Improvement>({
      type: 'improvement_suggestion',
      tenantId,
      partitionKey: [tenantId],
      name: improvement.name,
      description: improvement.description,
      category: improvement.category,
      changes: improvement.changes,
      experiment: improvement.experiment,
      metrics: {
        before: baseline,
        improvement: {
          quality: 0,
          latency: 0,
          satisfaction: 0,
          errors: 0
        }
      },
      status: 'planned',
      createdAt: new Date()
    });
    
    return improvementDoc.resource;
  }
  
  async deployImprovement(
    improvementId: string,
    options: DeploymentOptions
  ): Promise<void> {
    const improvement = await this.getImprovement(improvementId);
    
    if (options.immediate) {
      // Deploy immediately to all users
      await this.applyChanges(improvement.changes, 100);
      await this.updateImprovement(improvementId, {
        status: 'deployed',
        deployedAt: new Date()
      });
    } else {
      // Start A/B test
      await this.startABTest(improvement, options.rolloutPercentage);
      await this.updateImprovement(improvementId, {
        status: 'testing',
        experiment: {
          experimentId: generateId(),
          variant: 'treatment',
          rolloutPercentage: options.rolloutPercentage,
          startDate: new Date()
        }
      });
    }
  }
  
  async measureImpact(improvementId: string): Promise<ImpactMetrics> {
    const improvement = await this.getImprovement(improvementId);
    
    // Measure current metrics
    const current = await this.measureCurrentMetrics(
      improvement.tenantId,
      improvement.category
    );
    
    // Calculate improvement
    const impact = {
      quality: ((current.avgQuality - improvement.metrics.before.avgQuality) / 
                improvement.metrics.before.avgQuality) * 100,
      latency: ((improvement.metrics.before.avgLatency - current.avgLatency) / 
                improvement.metrics.before.avgLatency) * 100,
      satisfaction: ((current.userSatisfaction - improvement.metrics.before.userSatisfaction) / 
                     improvement.metrics.before.userSatisfaction) * 100,
      errors: ((improvement.metrics.before.errorRate - current.errorRate) / 
               improvement.metrics.before.errorRate) * 100
    };
    
    // Update improvement with results
    await this.updateImprovement(improvementId, {
      metrics: {
        ...improvement.metrics,
        after: current,
        improvement: impact
      }
    });
    
    return impact;
  }
  
  async rollback(improvementId: string): Promise<void> {
    const improvement = await this.getImprovement(improvementId);
    
    // Revert changes
    const revertChanges = improvement.changes.map(change => ({
      target: change.target,
      before: change.after,  // Swap
      after: change.before,
      reason: `Rollback of improvement ${improvementId}`
    }));
    
    await this.applyChanges(revertChanges, 100);
    
    await this.updateImprovement(improvementId, {
      status: 'rolled_back'
    });
    
    // Notify admins
    await this.notificationService.notifyAdmins({
      type: 'improvement_rollback',
      title: `Improvement Rolled Back: ${improvement.name}`,
      message: `Improvement ${improvementId} has been rolled back.`
    });
  }
}
```

## Background Jobs

### 1. Feedback Analysis Job

```typescript
// Azure Function or background worker
export async function processFeedbackQueue() {
  const pendingFeedback = await feedbackService.getPendingFeedback();
  
  for (const feedback of pendingFeedback) {
    try {
      await feedbackService.analyzeFeedback(feedback.id);
    } catch (error) {
      logger.error('Failed to analyze feedback', { feedbackId: feedback.id, error });
    }
  }
}

// Schedule: Every 5 minutes
```

### 2. Pattern Detection Job

```typescript
export async function detectPatterns() {
  const recentFeedback = await feedbackService.getRecentFeedback(24); // Last 24h
  
  // Group by similarity
  const clusters = await clusteringService.clusterFeedback(recentFeedback);
  
  for (const cluster of clusters) {
    if (cluster.size >= 3) {  // Minimum threshold
      await patternDetectionService.createNewPattern(
        cluster.representative,
        cluster.members
      );
    }
  }
}

// Schedule: Daily at 2 AM
```

### 3. Quality Monitoring Job

```typescript
export async function monitorQuality() {
  const recentInsights = await insightService.getRecentInsights(24);
  
  for (const insight of recentInsights) {
    const quality = await qualityService.evaluateInsightQuality(
      insight.id,
      insight
    );
    
    // Alert if below threshold
    if (quality.scores.overall < 0.6) {
      await alertService.sendQualityAlert(quality);
    }
  }
}

// Schedule: Every hour
```

### 4. Improvement Measurement Job

```typescript
export async function measureImprovements() {
  const activeImprovements = await improvementService.getActiveImprovements();
  
  for (const improvement of activeImprovements) {
    const impact = await improvementService.measureImpact(improvement.id);
    
    // If A/B test is successful, increase rollout
    if (improvement.status === 'testing' && impact.quality > 10) {
      const newRollout = Math.min(
        improvement.experiment.rolloutPercentage + 20,
        100
      );
      
      await improvementService.increaseRollout(improvement.id, newRollout);
    }
    
    // If negative impact, rollback
    if (impact.quality < -5 || impact.satisfaction < -10) {
      await improvementService.rollback(improvement.id);
    }
  }
}

// Schedule: Every 6 hours
```

## Configuration

### Environment Variables

```env
# Feedback & Learning
FEEDBACK_AUTO_ANALYZE=true
FEEDBACK_PATTERN_THRESHOLD=3
FEEDBACK_QUALITY_ALERT_THRESHOLD=0.6

# Quality Monitoring
QUALITY_EVALUATION_ENABLED=true
QUALITY_EVALUATION_VERSION=1.0.0
QUALITY_SAMPLE_RATE=1.0  # Evaluate 100% of insights

# Improvements
IMPROVEMENT_AB_TEST_MIN_DURATION=7  # days
IMPROVEMENT_AB_TEST_MIN_SAMPLES=100
IMPROVEMENT_AUTO_ROLLOUT_THRESHOLD=10  # % improvement

# Background Jobs
FEEDBACK_ANALYSIS_INTERVAL=*/5 * * * *
PATTERN_DETECTION_INTERVAL=0 2 * * *
QUALITY_MONITORING_INTERVAL=0 * * * *
IMPROVEMENT_MEASUREMENT_INTERVAL=0 */6 * * *
```

## Related Documentation

- [AI Insights Overview](./README.md)
- [Context Assembly](./CONTEXT-ASSEMBLY.md)
- [Monitoring](./MONITORING.md)
- [Cost Management](./COST-MANAGEMENT.md)
- [A/B Testing & Experiments](./AB-TESTING.md)
