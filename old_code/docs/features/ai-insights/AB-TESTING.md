# A/B Testing & Experimentation System

## Overview

The A/B Testing system enables data-driven optimization of AI Insights by testing changes to context templates, prompts, model selection, and other configurations before full deployment.

## Database Schema

All experiment data is stored in the **`experiments` container** using Hierarchical Partition Keys (HPK): `[tenantId, experimentId, userId]`.

### Experiment Document (type: 'experiment')

```typescript
interface Experiment {
  type: 'experiment';
  partitionKey: [string, string, string];  // [tenantId, experimentId, 'system']
  
  // Experiment details
  name: string;
  description: string;
  hypothesis: string;
  
  // What's being tested
  targetType: 
    | 'context_template'
    | 'prompt'
    | 'model_selection'
    | 'intent_classification'
    | 'grounding_threshold';
  targetId: string;                  // Template ID, prompt ID, etc.
  
  // Variants
  control: {
    name: string;
    configuration: any;              // Original configuration
  };
  
  treatment: {
    name: string;
    configuration: any;              // New configuration
  };
  
  // Traffic allocation
  allocation: {
    control: number;                 // % of traffic (0-100)
    treatment: number;               // % of traffic (0-100)
  };
  
  // Targeting
  targeting?: {
    tenantIds?: string[];            // Specific tenants
    userIds?: string[];              // Specific users
    intents?: string[];              // Specific intent types
    scopes?: any[];                  // Specific scopes
  };
  
  // Success metrics
  primaryMetric: string;             // 'quality', 'latency', 'satisfaction'
  successCriteria: {
    metric: string;
    operator: '>' | '>=' | '<' | '<=';
    threshold: number;
    confidenceLevel: number;         // 0.95 = 95% confidence
  };
  
  secondaryMetrics?: string[];
  
  // Status
  status: 
    | 'draft'
    | 'active'
    | 'paused'
    | 'completed'
    | 'winner_deployed'
    | 'cancelled';
  
  // Timing
  startDate: Date;
  endDate?: Date;
  minDuration: number;               // Minimum days to run
  minSamplesPerVariant: number;
  
  // Results
  results?: {
    control: VariantResults;
    treatment: VariantResults;
    winner?: 'control' | 'treatment';
    statisticalSignificance: number;
    confidenceLevel: number;
    completedAt: Date;
  };
  
  // Metadata
  createdBy: string;
  approvedBy?: string;
  
  // Hierarchical Partition Key
  pk: string;  // tenantId or 'system' for system-wide experiments
}

interface VariantResults {
  samples: number;
  metrics: {
    [metricName: string]: {
      mean: number;
      median: number;
      stdDev: number;
      p95: number;
      p99: number;
    };
  };
  userFeedback: {
    positive: number;
    negative: number;
    neutral: number;
  };
}
```

### Assignment Document (type: 'assignment')

```typescript
interface ExperimentAssignment {
  type: 'assignment';
  partitionKey: [string, string, string];  // [tenantId, experimentId, userId]
  
  experimentId: string;
  userId: string;
  variant: 'control' | 'treatment';
  
  assignedAt: Date;
  firstExposure?: Date;
  lastExposure?: Date;
  exposureCount: number;
  
  // Hierarchical Partition Key
  pk: string;  // experimentId|userId
}
```

### Event Document (type: 'event')

```typescript
interface ExperimentEvent {
  type: 'event';
  partitionKey: [string, string, string];  // [tenantId, experimentId, userId]
  
  experimentId: string;
  assignmentId: string;
  userId: string;
  variant: 'control' | 'treatment';
  
  // Event details
  eventType: 'exposure' | 'conversion' | 'feedback' | 'error';
  
  // Metrics captured
  metrics: {
    quality?: number;
    latency?: number;
    tokensUsed?: number;
    cost?: number;
    userSatisfaction?: 'positive' | 'negative' | 'neutral';
  };
  
  // Context
  context: {
    insightId?: string;
    conversationId?: string;
    intent?: string;
    scope?: any;
  };
  
  timestamp: Date;
  
  // Hierarchical Partition Key
  pk: string;  // experimentId|date (YYYY-MM-DD)
}
```

## API Reference

### Create Experiment (Super Admin)

```http
POST /api/v1/admin/insights/experiments
Authorization: Bearer {token}
Content-Type: application/json
```

**Request**:
```typescript
{
  name: string;
  description: string;
  hypothesis: string;
  targetType: string;
  targetId: string;
  control: {
    name: string;
    configuration: any;
  };
  treatment: {
    name: string;
    configuration: any;
  };
  allocation: {
    control: number;
    treatment: number;
  };
  primaryMetric: string;
  successCriteria: {
    metric: string;
    operator: '>' | '>=' | '<' | '<=';
    threshold: number;
    confidenceLevel: number;
  };
  minDuration: number;
  minSamplesPerVariant: number;
  targeting?: {
    tenantIds?: string[];
    userIds?: string[];
    intents?: string[];
  };
}
```

**Response**:
```typescript
{
  experimentId: string;
  status: 'draft';
  message: string;
}
```

### Start Experiment

```http
POST /api/v1/admin/insights/experiments/{experimentId}/start
Authorization: Bearer {token}
```

**Response**:
```typescript
{
  experimentId: string;
  status: 'active';
  startDate: Date;
  estimatedEndDate: Date;
}
```

### Get Experiment Results

```http
GET /api/v1/admin/insights/experiments/{experimentId}/results
Authorization: Bearer {token}
```

**Response**:
```typescript
{
  experimentId: string;
  name: string;
  status: string;
  
  control: {
    samples: number;
    metrics: {
      quality: { mean: number; p95: number };
      latency: { mean: number; p95: number };
      satisfaction: { positive: number; negative: number };
    };
  };
  
  treatment: {
    samples: number;
    metrics: {
      quality: { mean: number; p95: number };
      latency: { mean: number; p95: number };
      satisfaction: { positive: number; negative: number };
    };
  };
  
  comparison: {
    qualityImprovement: number;      // % change
    latencyImprovement: number;
    satisfactionImprovement: number;
    statisticalSignificance: number;
    confidenceLevel: number;
    recommendation: 'deploy_treatment' | 'keep_control' | 'inconclusive';
  };
  
  charts: {
    qualityOverTime: TimeSeriesData;
    latencyDistribution: DistributionData;
    satisfactionBreakdown: CategoryData;
  };
}
```

### Deploy Winner

```http
POST /api/v1/admin/insights/experiments/{experimentId}/deploy-winner
Authorization: Bearer {token}
Content-Type: application/json
```

**Request**:
```typescript
{
  winner: 'control' | 'treatment';
  rolloutPercentage?: number;      // Gradual rollout (default: 100)
  notes?: string;
}
```

## UI Specifications

### Experiment Creation Wizard

```typescript
<AdminLayout>
  <WizardHeader>
    <Title>Create A/B Test</Title>
    <StepIndicator currentStep={step} totalSteps={5} />
  </WizardHeader>
  
  {/* Step 1: Basic Info */}
  {step === 1 && (
    <WizardStep>
      <Input 
        label="Experiment Name"
        placeholder="Improve context template for risk analysis"
        value={name}
        onChange={setName}
      />
      
      <TextArea 
        label="Description"
        placeholder="Testing a new context template that includes more historical data..."
        value={description}
        onChange={setDescription}
      />
      
      <TextArea 
        label="Hypothesis"
        placeholder="Including historical project data will improve risk analysis quality by 15%"
        value={hypothesis}
        onChange={setHypothesis}
      />
      
      <Select 
        label="What are you testing?"
        options={[
          { value: 'context_template', label: 'Context Template' },
          { value: 'prompt', label: 'System Prompt' },
          { value: 'model_selection', label: 'Model Selection' },
          { value: 'grounding_threshold', label: 'Grounding Threshold' }
        ]}
        value={targetType}
        onChange={setTargetType}
      />
      
      <Button onClick={() => setStep(2)}>Next</Button>
    </WizardStep>
  )}
  
  {/* Step 2: Configure Variants */}
  {step === 2 && (
    <WizardStep>
      <VariantsGrid>
        <VariantCard variant="control">
          <VariantHeader>
            <Badge>Control (Current)</Badge>
            <Input 
              label="Variant Name"
              value={control.name}
              onChange={v => setControl({ ...control, name: v })}
            />
          </VariantHeader>
          
          <ConfigEditor 
            type={targetType}
            value={control.configuration}
            onChange={v => setControl({ ...control, configuration: v })}
            readOnly
          />
        </VariantCard>
        
        <VariantCard variant="treatment">
          <VariantHeader>
            <Badge color="blue">Treatment (New)</Badge>
            <Input 
              label="Variant Name"
              value={treatment.name}
              onChange={v => setTreatment({ ...treatment, name: v })}
            />
          </VariantHeader>
          
          <ConfigEditor 
            type={targetType}
            value={treatment.configuration}
            onChange={v => setTreatment({ ...treatment, configuration: v })}
          />
        </VariantCard>
      </VariantsGrid>
      
      <ButtonGroup>
        <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
        <Button onClick={() => setStep(3)}>Next</Button>
      </ButtonGroup>
    </WizardStep>
  )}
  
  {/* Step 3: Traffic Allocation */}
  {step === 3 && (
    <WizardStep>
      <AllocationSlider 
        control={allocation.control}
        treatment={allocation.treatment}
        onChange={setAllocation}
      />
      
      <TargetingOptions>
        <Checkbox 
          label="Target specific tenants"
          checked={hasTargeting.tenants}
          onChange={v => setHasTargeting({ ...hasTargeting, tenants: v })}
        />
        {hasTargeting.tenants && (
          <MultiSelect 
            options={tenants}
            value={targeting.tenantIds}
            onChange={v => setTargeting({ ...targeting, tenantIds: v })}
          />
        )}
        
        <Checkbox 
          label="Target specific intents"
          checked={hasTargeting.intents}
          onChange={v => setHasTargeting({ ...hasTargeting, intents: v })}
        />
        {hasTargeting.intents && (
          <MultiSelect 
            options={intents}
            value={targeting.intents}
            onChange={v => setTargeting({ ...targeting, intents: v })}
          />
        )}
      </TargetingOptions>
      
      <ButtonGroup>
        <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
        <Button onClick={() => setStep(4)}>Next</Button>
      </ButtonGroup>
    </WizardStep>
  )}
  
  {/* Step 4: Success Metrics */}
  {step === 4 && (
    <WizardStep>
      <Select 
        label="Primary Success Metric"
        options={[
          { value: 'quality', label: 'Overall Quality Score' },
          { value: 'latency', label: 'Response Latency' },
          { value: 'satisfaction', label: 'User Satisfaction' },
          { value: 'citation_quality', label: 'Citation Quality' }
        ]}
        value={primaryMetric}
        onChange={setPrimaryMetric}
      />
      
      <SuccessCriteriaBuilder>
        <Label>Success Criteria</Label>
        <CriteriaRow>
          <span>Treatment is successful if</span>
          <Select 
            value={successCriteria.metric}
            options={metricOptions}
            onChange={v => setSuccessCriteria({ ...successCriteria, metric: v })}
          />
          <Select 
            value={successCriteria.operator}
            options={[
              { value: '>', label: 'improves by more than' },
              { value: '>=', label: 'improves by at least' },
              { value: '<', label: 'decreases by more than' },
              { value: '<=', label: 'decreases by at most' }
            ]}
            onChange={v => setSuccessCriteria({ ...successCriteria, operator: v })}
          />
          <Input 
            type="number"
            value={successCriteria.threshold}
            onChange={v => setSuccessCriteria({ ...successCriteria, threshold: v })}
            suffix="%"
          />
        </CriteriaRow>
        <CriteriaRow>
          <span>with</span>
          <Select 
            value={successCriteria.confidenceLevel}
            options={[
              { value: 0.90, label: '90% confidence' },
              { value: 0.95, label: '95% confidence' },
              { value: 0.99, label: '99% confidence' }
            ]}
            onChange={v => setSuccessCriteria({ ...successCriteria, confidenceLevel: v })}
          />
        </CriteriaRow>
      </SuccessCriteriaBuilder>
      
      <MultiSelect 
        label="Secondary Metrics (optional)"
        options={secondaryMetricOptions}
        value={secondaryMetrics}
        onChange={setSecondaryMetrics}
      />
      
      <ButtonGroup>
        <Button variant="secondary" onClick={() => setStep(3)}>Back</Button>
        <Button onClick={() => setStep(5)}>Next</Button>
      </ButtonGroup>
    </WizardStep>
  )}
  
  {/* Step 5: Duration & Review */}
  {step === 5 && (
    <WizardStep>
      <Input 
        type="number"
        label="Minimum Duration (days)"
        value={minDuration}
        onChange={setMinDuration}
        helperText="Experiment must run for at least this many days"
      />
      
      <Input 
        type="number"
        label="Minimum Samples Per Variant"
        value={minSamplesPerVariant}
        onChange={setMinSamplesPerVariant}
        helperText="Each variant must have at least this many samples"
      />
      
      <ExperimentSummary>
        <SummarySection title="Basic Info">
          <SummaryItem label="Name" value={name} />
          <SummaryItem label="Hypothesis" value={hypothesis} />
          <SummaryItem label="Target" value={targetType} />
        </SummarySection>
        
        <SummarySection title="Variants">
          <SummaryItem label="Control" value={control.name} />
          <SummaryItem label="Treatment" value={treatment.name} />
          <SummaryItem label="Traffic Split" value={`${allocation.control}% / ${allocation.treatment}%`} />
        </SummarySection>
        
        <SummarySection title="Success Criteria">
          <SummaryItem label="Primary Metric" value={primaryMetric} />
          <SummaryItem label="Threshold" value={`${successCriteria.threshold}% improvement`} />
          <SummaryItem label="Confidence" value={`${successCriteria.confidenceLevel * 100}%`} />
        </SummarySection>
        
        <SummarySection title="Duration">
          <SummaryItem label="Minimum Duration" value={`${minDuration} days`} />
          <SummaryItem label="Min Samples" value={minSamplesPerVariant} />
          <SummaryItem label="Est. Completion" value={estimatedCompletion} />
        </SummarySection>
      </ExperimentSummary>
      
      <ButtonGroup>
        <Button variant="secondary" onClick={() => setStep(4)}>Back</Button>
        <Button onClick={createExperiment}>Create Experiment</Button>
      </ButtonGroup>
    </WizardStep>
  )}
</AdminLayout>
```

### Experiment Dashboard

```typescript
<AdminLayout>
  <PageHeader>
    <Title>A/B Tests</Title>
    <Button onClick={createExperiment}>
      <Icon name="plus" />
      New Experiment
    </Button>
  </PageHeader>
  
  <TabsContainer>
    <Tab active={activeTab === 'active'} onClick={() => setActiveTab('active')}>
      Active ({activeCount})
    </Tab>
    <Tab active={activeTab === 'completed'} onClick={() => setActiveTab('completed')}>
      Completed ({completedCount})
    </Tab>
    <Tab active={activeTab === 'draft'} onClick={() => setActiveTab('draft')}>
      Drafts ({draftCount})
    </Tab>
  </TabsContainer>
  
  <ExperimentList>
    {experiments.map(experiment => (
      <ExperimentCard key={experiment.id}>
        <CardHeader>
          <Title>{experiment.name}</Title>
          <StatusBadge status={experiment.status} />
        </CardHeader>
        
        <Description>{experiment.description}</Description>
        
        <MetricsPreview>
          <MetricCard>
            <MetricLabel>Samples</MetricLabel>
            <MetricValue>
              {experiment.control.samples + experiment.treatment.samples}
            </MetricValue>
            <MetricProgress 
              current={experiment.control.samples + experiment.treatment.samples}
              target={experiment.minSamplesPerVariant * 2}
            />
          </MetricCard>
          
          <MetricCard>
            <MetricLabel>Duration</MetricLabel>
            <MetricValue>
              {daysSince(experiment.startDate)} / {experiment.minDuration} days
            </MetricValue>
            <MetricProgress 
              current={daysSince(experiment.startDate)}
              target={experiment.minDuration}
            />
          </MetricCard>
          
          {experiment.results && (
            <MetricCard highlight>
              <MetricLabel>Improvement</MetricLabel>
              <MetricValue positive={experiment.results.improvement > 0}>
                {experiment.results.improvement > 0 ? '+' : ''}
                {experiment.results.improvement.toFixed(1)}%
              </MetricValue>
              <MetricLabel small>
                {experiment.results.confidenceLevel * 100}% confidence
              </MetricLabel>
            </MetricCard>
          )}
        </MetricsPreview>
        
        <CardActions>
          <Button 
            variant="secondary"
            onClick={() => viewDetails(experiment.id)}
          >
            View Details
          </Button>
          
          {experiment.status === 'active' && (
            <>
              <Button 
                variant="secondary"
                onClick={() => pauseExperiment(experiment.id)}
              >
                Pause
              </Button>
              {canDeclareWinner(experiment) && (
                <Button onClick={() => declareWinner(experiment.id)}>
                  Declare Winner
                </Button>
              )}
            </>
          )}
          
          {experiment.status === 'completed' && experiment.results?.winner && (
            <Button onClick={() => deployWinner(experiment.id)}>
              Deploy {experiment.results.winner}
            </Button>
          )}
        </CardActions>
      </ExperimentCard>
    ))}
  </ExperimentList>
</AdminLayout>
```

### Experiment Results View

```typescript
<AdminLayout>
  <PageHeader>
    <BackButton onClick={goBack} />
    <Title>{experiment.name}</Title>
    <StatusBadge status={experiment.status} />
  </PageHeader>
  
  <ExperimentInfo>
    <InfoSection>
      <Label>Hypothesis</Label>
      <Text>{experiment.hypothesis}</Text>
    </InfoSection>
    
    <InfoSection>
      <Label>Duration</Label>
      <Text>
        {formatDate(experiment.startDate)} - {experiment.endDate ? formatDate(experiment.endDate) : 'Ongoing'}
      </Text>
    </InfoSection>
    
    <InfoSection>
      <Label>Traffic Allocation</Label>
      <AllocationBar 
        control={experiment.allocation.control}
        treatment={experiment.allocation.treatment}
      />
    </InfoSection>
  </ExperimentInfo>
  
  <ResultsComparison>
    <ComparisonHeader>
      <h3>Results Comparison</h3>
      {experiment.results?.winner && (
        <WinnerBadge variant={experiment.results.winner}>
          🏆 {experiment.results.winner} wins
        </WinnerBadge>
      )}
    </ComparisonHeader>
    
    <ComparisonGrid>
      {/* Control Column */}
      <VariantColumn variant="control">
        <VariantHeader>
          <Badge>Control</Badge>
          <Title>{experiment.control.name}</Title>
        </VariantHeader>
        
        <MetricsList>
          <MetricRow>
            <MetricLabel>Samples</MetricLabel>
            <MetricValue>{experiment.results.control.samples}</MetricValue>
          </MetricRow>
          <MetricRow>
            <MetricLabel>Quality (avg)</MetricLabel>
            <MetricValue>
              {(experiment.results.control.metrics.quality.mean * 100).toFixed(1)}%
            </MetricValue>
          </MetricRow>
          <MetricRow>
            <MetricLabel>Latency (P95)</MetricLabel>
            <MetricValue>
              {experiment.results.control.metrics.latency.p95}ms
            </MetricValue>
          </MetricRow>
          <MetricRow>
            <MetricLabel>Satisfaction</MetricLabel>
            <MetricValue>
              {calculateSatisfactionRate(experiment.results.control.userFeedback)}%
            </MetricValue>
          </MetricRow>
        </MetricsList>
      </VariantColumn>
      
      {/* Comparison Column */}
      <ComparisonColumn>
        <ComparisonIcon>⚖️</ComparisonIcon>
        
        <ImprovementsList>
          <ImprovementRow positive={qualityImprovement > 0}>
            <Icon name={qualityImprovement > 0 ? 'arrow-up' : 'arrow-down'} />
            <Value>{Math.abs(qualityImprovement).toFixed(1)}%</Value>
            <Label>quality</Label>
          </ImprovementRow>
          
          <ImprovementRow positive={latencyImprovement < 0}>
            <Icon name={latencyImprovement < 0 ? 'arrow-down' : 'arrow-up'} />
            <Value>{Math.abs(latencyImprovement).toFixed(1)}%</Value>
            <Label>latency</Label>
          </ImprovementRow>
          
          <ImprovementRow positive={satisfactionImprovement > 0}>
            <Icon name={satisfactionImprovement > 0 ? 'arrow-up' : 'arrow-down'} />
            <Value>{Math.abs(satisfactionImprovement).toFixed(1)}%</Value>
            <Label>satisfaction</Label>
          </ImprovementRow>
        </ImprovementsList>
        
        <StatisticalSignificance>
          <Label>Statistical Significance</Label>
          <ProgressBar 
            value={experiment.results.statisticalSignificance * 100}
            color={experiment.results.statisticalSignificance > 0.95 ? 'success' : 'warning'}
          />
          <Text>
            {(experiment.results.statisticalSignificance * 100).toFixed(1)}%
            {experiment.results.statisticalSignificance > 0.95 && ' ✓ Significant'}
          </Text>
        </StatisticalSignificance>
      </ComparisonColumn>
      
      {/* Treatment Column */}
      <VariantColumn variant="treatment">
        <VariantHeader>
          <Badge color="blue">Treatment</Badge>
          <Title>{experiment.treatment.name}</Title>
        </VariantHeader>
        
        <MetricsList>
          <MetricRow>
            <MetricLabel>Samples</MetricLabel>
            <MetricValue>{experiment.results.treatment.samples}</MetricValue>
          </MetricRow>
          <MetricRow>
            <MetricLabel>Quality (avg)</MetricLabel>
            <MetricValue>
              {(experiment.results.treatment.metrics.quality.mean * 100).toFixed(1)}%
            </MetricValue>
          </MetricRow>
          <MetricRow>
            <MetricLabel>Latency (P95)</MetricLabel>
            <MetricValue>
              {experiment.results.treatment.metrics.latency.p95}ms
            </MetricValue>
          </MetricRow>
          <MetricRow>
            <MetricLabel>Satisfaction</MetricLabel>
            <MetricValue>
              {calculateSatisfactionRate(experiment.results.treatment.userFeedback)}%
            </MetricValue>
          </MetricRow>
        </MetricsList>
      </VariantColumn>
    </ComparisonGrid>
  </ResultsComparison>
  
  <ChartsSection>
    <Chart title="Quality Over Time">
      <LineChart 
        data={qualityOverTime}
        series={[
          { name: 'Control', data: controlQuality, color: 'gray' },
          { name: 'Treatment', data: treatmentQuality, color: 'blue' }
        ]}
      />
    </Chart>
    
    <Chart title="Latency Distribution">
      <HistogramChart 
        data={latencyDistribution}
        series={['control', 'treatment']}
      />
    </Chart>
    
    <Chart title="User Satisfaction">
      <StackedBarChart 
        data={satisfactionBreakdown}
        categories={['Positive', 'Neutral', 'Negative']}
      />
    </Chart>
  </ChartsSection>
  
  <ActionsSection>
    {experiment.status === 'completed' && experiment.results?.winner && (
      <ActionCard highlight>
        <Title>Recommendation</Title>
        <Text>
          {experiment.results.recommendation === 'deploy_treatment' 
            ? `Deploy treatment variant - it shows a ${qualityImprovement.toFixed(1)}% improvement with ${(experiment.results.confidenceLevel * 100).toFixed(0)}% confidence.`
            : experiment.results.recommendation === 'keep_control'
            ? 'Keep control variant - treatment did not show significant improvement.'
            : 'Results are inconclusive - consider running the experiment longer.'}
        </Text>
        
        {experiment.results.recommendation === 'deploy_treatment' && (
          <Button onClick={() => deployWinner(experiment.id, 'treatment')}>
            Deploy Treatment
          </Button>
        )}
      </ActionCard>
    )}
    
    {experiment.status === 'active' && (
      <ButtonGroup>
        <Button 
          variant="secondary"
          onClick={() => pauseExperiment(experiment.id)}
        >
          Pause Experiment
        </Button>
        
        {canDeclareWinner(experiment) && (
          <Button onClick={() => openDeclareWinnerDialog()}>
            Declare Winner
          </Button>
        )}
        
        <Button 
          variant="danger"
          onClick={() => stopExperiment(experiment.id)}
        >
          Stop Experiment
        </Button>
      </ButtonGroup>
    )}
  </ActionsSection>
</AdminLayout>
```

## Implementation

### Experiment Service

```typescript
// apps/api/src/services/ai-insights/experiment.service.ts
export class ExperimentService {
  async createExperiment(
    adminUserId: string,
    experiment: ExperimentInput
  ): Promise<Experiment> {
    // Validate configuration
    await this.validateExperimentConfig(experiment);
    
    // Create experiment document
    const experimentDoc = await this.experimentsContainer.items.create<Experiment>({
      type: 'experiment',
      tenantId: experiment.tenantId || 'system',
      partitionKey: [experiment.tenantId || 'system', experiment.id, 'system'],
      ...experiment,
      status: 'draft',
      createdBy: adminUserId
    });
    
    return experimentDoc.resource;
  }
  
  async startExperiment(experimentId: string): Promise<void> {
    const experiment = await this.getExperiment(experimentId);
    
    // Validate before starting
    if (experiment.status !== 'draft') {
      throw new Error('Experiment already started');
    }
    
    // Update status
    await this.updateExperiment(experimentId, {
      status: 'active',
      startDate: new Date()
    });
    
    // Initialize metrics collection
    await this.initializeMetricsCollection(experimentId);
  }
  
  async assignVariant(
    experimentId: string,
    userId: string
  ): Promise<'control' | 'treatment'> {
    // Check for existing assignment
    const existing = await this.getAssignment(experimentId, userId);
    if (existing) {
      return existing.variant;
    }
    
    const experiment = await this.getExperiment(experimentId);
    
    // Check targeting
    if (!this.matchesTargeting(experiment, userId)) {
      return 'control';  // Default to control if not targeted
    }
    
    // Assign variant based on allocation
    const random = Math.random() * 100;
    const variant = random < experiment.allocation.control ? 'control' : 'treatment';
    
    // Create assignment
    await this.experimentsContainer.items.create<ExperimentAssignment>({
      type: 'assignment',
      tenantId: experiment.tenantId,
      partitionKey: [experiment.tenantId, experimentId, userId],
      experimentId,
      userId,
      variant,
      assignedAt: new Date(),
      exposureCount: 0
    });
    
    return variant;
  }
  
  async trackEvent(
    experimentId: string,
    userId: string,
    event: ExperimentEventInput
  ): Promise<void> {
    const assignment = await this.getAssignment(experimentId, userId);
    if (!assignment) return;
    
    // Create event
    await this.experimentsContainer.items.create<ExperimentEvent>({
      type: 'event',
      tenantId: event.tenantId,
      partitionKey: [event.tenantId, experimentId, userId],
      experimentId,
      assignmentId: assignment.id,
      userId,
      variant: assignment.variant,
      eventType: event.type,
      metrics: event.metrics,
      context: event.context,
      timestamp: new Date()
    });
    
    // Update assignment
    await this.updateAssignment(assignment.id, {
      exposureCount: assignment.exposureCount + 1,
      lastExposure: new Date(),
      firstExposure: assignment.firstExposure || new Date()
    });
  }
  
  async calculateResults(experimentId: string): Promise<ExperimentResults> {
    const experiment = await this.getExperiment(experimentId);
    const events = await this.getExperimentEvents(experimentId);
    
    // Group events by variant
    const controlEvents = events.filter(e => e.variant === 'control');
    const treatmentEvents = events.filter(e => e.variant === 'treatment');
    
    // Calculate metrics for each variant
    const controlResults = this.calculateVariantMetrics(controlEvents);
    const treatmentResults = this.calculateVariantMetrics(treatmentEvents);
    
    // Perform statistical analysis
    const statisticalSignificance = this.calculateSignificance(
      controlResults,
      treatmentResults,
      experiment.primaryMetric
    );
    
    // Determine winner
    const winner = this.determineWinner(
      controlResults,
      treatmentResults,
      experiment.successCriteria,
      statisticalSignificance
    );
    
    return {
      control: controlResults,
      treatment: treatmentResults,
      winner,
      statisticalSignificance,
      confidenceLevel: experiment.successCriteria.confidenceLevel,
      completedAt: new Date()
    };
  }
  
  private calculateSignificance(
    control: VariantResults,
    treatment: VariantResults,
    metric: string
  ): number {
    // Perform t-test
    const controlMean = control.metrics[metric].mean;
    const controlStdDev = control.metrics[metric].stdDev;
    const controlN = control.samples;
    
    const treatmentMean = treatment.metrics[metric].mean;
    const treatmentStdDev = treatment.metrics[metric].stdDev;
    const treatmentN = treatment.samples;
    
    // Calculate t-statistic
    const pooledStdDev = Math.sqrt(
      (controlStdDev ** 2 / controlN) + 
      (treatmentStdDev ** 2 / treatmentN)
    );
    
    const tStat = (treatmentMean - controlMean) / pooledStdDev;
    
    // Calculate p-value (using t-distribution)
    const pValue = this.tTest(tStat, controlN + treatmentN - 2);
    
    // Convert to confidence level
    return 1 - pValue;
  }
  
  async deployWinner(
    experimentId: string,
    winner: 'control' | 'treatment',
    options: DeploymentOptions = {}
  ): Promise<void> {
    const experiment = await this.getExperiment(experimentId);
    
    if (winner === 'treatment') {
      // Deploy treatment configuration
      await this.applyConfiguration(
        experiment.targetType,
        experiment.targetId,
        experiment.treatment.configuration,
        options.rolloutPercentage || 100
      );
    }
    
    // Update experiment status
    await this.updateExperiment(experimentId, {
      status: 'winner_deployed',
      'results.winner': winner
    });
    
    // Create improvement record
    await this.improvementService.recordDeployment(experimentId, winner);
  }
}
```

### Variant Configuration Hook

```typescript
// apps/api/src/middleware/ab-testing.middleware.ts
export async function applyABTestVariant(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.user.id;
  
  // Get active experiments
  const experiments = await experimentService.getActiveExperiments();
  
  // Apply variants
  const variants: Record<string, any> = {};
  
  for (const experiment of experiments) {
    const variant = await experimentService.assignVariant(experiment.id, userId);
    
    // Store variant configuration
    if (variant === 'treatment') {
      variants[experiment.targetType] = experiment.treatment.configuration;
    }
  }
  
  // Attach to request
  req.abTestVariants = variants;
  
  next();
}

// Usage in services
export class ContextAssemblyService {
  async assemble(request: ContextRequest): Promise<Context> {
    // Check for A/B test variant
    const variantConfig = request.abTestVariants?.context_template;
    const templateId = variantConfig?.templateId || request.templateId;
    
    // Use variant configuration if available
    const template = await this.getTemplate(templateId);
    
    // ... rest of assembly logic
  }
}
```

## Related Documentation

- [Feedback & Learning](./FEEDBACK-LEARNING.md)
- [Improvements](./IMPROVEMENTS.md)
- [Monitoring](./MONITORING.md)
- [Cost Management](./COST-MANAGEMENT.md)
