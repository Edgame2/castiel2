# Requirements Gap Analysis - ML Integration Layers

**Date:** January 2025  
**Purpose:** Identify gaps between generated requirements and stated business needs

---

## Executive Summary

### ✅ What's Already Covered (Well-Specified)

The generated requirements **DO cover** most core functionality:
- ✅ ML-based risk scoring with category scores
- ✅ Risk detection using multiple methods (rules, LLM, ML, historical)
- ✅ General recommendation system framework
- ✅ Basic forecasting capabilities
- ✅ Multi-tenant architecture
- ✅ CAIS orchestration patterns

### ❌ Critical Gaps Identified

The generated requirements **DO NOT adequately cover**:
1. ❌ **Risk Catalog Integration** - Tenant-specific risk categories and definitions
2. ❌ **Sales Methodology Integration** - Tenant-configurable sales processes
3. ❌ **Opportunity Reactivation Recommendations** - Dormant/stalled opportunity detection
4. ❌ **Tenant-Specific Risk Categories** - Configurable beyond 6 default categories
5. ❌ **Methodology-Aware Risk Detection** - Risks aligned with sales stages/methodology

---

## Gap 1: Risk Catalog Integration

### Current State (What's Covered)
✅ **Layer 3 (ML Prediction):**
- Risk scoring with 6 fixed categories: commercial, competitive, technical, legal, resource, timeline
- ML model predicts scores per category (0-1)

✅ **Layer 4 (Explanation):**
- SHAP values explain which features drive risk scores
- Factor generation with human-readable descriptions

❌ **What's Missing:**
- No integration with **RiskCatalogService** (mentioned in project knowledge)
- No **tenant-specific risk definitions**
- No **customizable risk categories** beyond the 6 defaults
- No **risk catalog lookup** during risk detection
- No **risk templates** or **predefined risk patterns**
- No **mapping between detected risks and catalog entries**

### Required Additions

#### Layer 2 (Feature Engineering) - New Requirements

**FR-1.7: Risk Catalog Features (15 requirements)**
```typescript
// Extract risk catalog context
interface RiskCatalogFeatures {
  tenantRiskCategories: string[];           // Tenant's configured categories
  categoryDefinitions: Map<string, RiskDefinition>;
  riskTemplates: RiskTemplate[];            // Predefined risk patterns
  industrySpecificRisks: string[];          // Industry-specific risk types
  methodologyRisks: string[];               // Risks per sales stage/methodology
}

// New service method
class FeatureStoreService {
  async extractRiskCatalogFeatures(
    tenantId: string,
    industry: string,
    stage: string
  ): Promise<RiskCatalogFeatures> {
    // 1. Get tenant's risk catalog configuration
    const riskCatalog = await this.riskCatalogService.getTenantCatalog(tenantId);
    
    // 2. Filter relevant risk templates for industry + stage
    const relevantTemplates = riskCatalog.templates.filter(t =>
      t.industry === industry && t.applicableStages.includes(stage)
    );
    
    // 3. Extract category definitions
    const categoryDefs = riskCatalog.categories;
    
    return {
      tenantRiskCategories: categoryDefs.map(c => c.name),
      categoryDefinitions: new Map(categoryDefs.map(c => [c.name, c])),
      riskTemplates: relevantTemplates,
      industrySpecificRisks: riskCatalog.industryRisks[industry] || [],
      methodologyRisks: riskCatalog.methodologyRisks[stage] || []
    };
  }
}
```

#### Layer 3 (ML Prediction) - Enhanced Requirements

**FR-3.1.8: Risk Category Prediction with Tenant Catalog (20 requirements)**
```typescript
// Dynamic category prediction based on tenant configuration
interface TenantAwareRiskPrediction {
  riskScore: number;                        // Overall 0-1
  categoryScores: Record<string, number>;   // Dynamic categories from tenant
  catalogMappings: Array<{
    detectedRisk: string;
    catalogRiskId: string;
    confidence: number;
  }>;
  templateMatches: Array<{
    templateId: string;
    matchScore: number;
    reason: string;
  }>;
}

// New model requirement
// Must support DYNAMIC output dimensions based on tenant config
// E.g., Tenant A has 6 categories, Tenant B has 10 categories
// Model must adapt output layer dynamically
```

**Implementation Approach:**
1. **Global Base Model:** Predicts 6 standard categories
2. **Tenant-Specific Fine-Tuning:** Optional fine-tuning for custom categories
3. **Post-Prediction Mapping:** Map standard categories to tenant categories
4. **Template Matching:** ML model + rule-based matching against risk templates

#### Layer 6 (Decision Engine) - New Requirements

**FR-6.5: Risk Catalog-Driven Decisions (25 requirements)**
```typescript
// Decision rules based on risk catalog
interface RiskCatalogDecisionRule {
  ruleId: string;
  catalogRiskId: string;                    // Link to risk catalog entry
  condition: {
    riskType: string;
    severity: "low" | "medium" | "high" | "critical";
    stage?: string;                         // Stage-specific
  };
  actions: Action[];
  priority: number;
}

// Enhanced decision engine
class DecisionEngineService {
  async applyRiskCatalogRules(
    detectedRisks: Risk[],
    opportunity: Opportunity,
    tenantId: string
  ): Promise<Decision[]> {
    // 1. Get tenant's risk catalog
    const catalog = await this.riskCatalogService.getTenantCatalog(tenantId);
    
    // 2. Map detected risks to catalog entries
    const mappedRisks = await this.mapRisksToCatalog(detectedRisks, catalog);
    
    // 3. Get decision rules for matched catalog risks
    const rules = await this.getRulesForCatalogRisks(
      mappedRisks.map(r => r.catalogRiskId),
      tenantId
    );
    
    // 4. Evaluate rules
    const decisions = await this.evaluateRules(mappedRisks, opportunity, rules);
    
    return decisions;
  }
  
  private async mapRisksToCatalog(
    detectedRisks: Risk[],
    catalog: RiskCatalog
  ): Promise<MappedRisk[]> {
    // Use embeddings + similarity search to map detected risks
    // to catalog risk definitions
    const mappedRisks: MappedRisk[] = [];
    
    for (const risk of detectedRisks) {
      const catalogMatch = await this.findBestCatalogMatch(risk, catalog);
      if (catalogMatch.similarity > 0.7) {
        mappedRisks.push({
          detectedRisk: risk,
          catalogRiskId: catalogMatch.riskId,
          catalogRiskDefinition: catalogMatch.definition,
          mappingConfidence: catalogMatch.similarity
        });
      }
    }
    
    return mappedRisks;
  }
}
```

#### New Database Schema

**RiskCatalog (Cosmos DB - RiskCatalogs container)**
```typescript
interface RiskCatalog {
  id: string;                               // risk_catalog_{tenantId}
  partitionKey: string;                     // tenantId
  tenantId: string;
  
  // Tenant-specific risk categories
  categories: Array<{
    name: string;                           // e.g., "budget_risk", "technical_risk"
    displayName: string;                    // "Budget & Financial Risk"
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    color: string;                          // UI color code
    icon: string;                           // UI icon
  }>;
  
  // Risk templates (predefined patterns)
  templates: Array<{
    templateId: string;
    name: string;
    category: string;
    description: string;
    applicableStages: string[];             // Which sales stages
    applicableIndustries: string[];         // Which industries
    indicators: string[];                   // Signals that trigger this risk
    mitigationActions: string[];            // Recommended actions
  }>;
  
  // Industry-specific risks
  industryRisks: Record<string, string[]>;  // { "technology": ["data_security", ...] }
  
  // Methodology-specific risks
  methodologyRisks: Record<string, string[]>; // { "discovery": ["scope_unclear", ...] }
  
  // Decision rules per catalog risk
  decisionRules: RiskCatalogDecisionRule[];
  
  createdAt: Date;
  updatedAt: Date;
}
```

#### New Service: RiskCatalogService

**Location:** `apps/api/src/services/risk-catalog.service.ts`

```typescript
export class RiskCatalogService {
  constructor(
    private readonly cosmosDBClient: CosmosDBClient,
    private readonly cachingService: CachingService
  ) {}
  
  // Core CRUD
  async getTenantCatalog(tenantId: string): Promise<RiskCatalog>
  async updateTenantCatalog(tenantId: string, catalog: RiskCatalog): Promise<void>
  async getDefaultCatalog(): Promise<RiskCatalog>  // Global default
  
  // Template operations
  async getRiskTemplates(
    tenantId: string,
    filters: { industry?: string; stage?: string }
  ): Promise<RiskTemplate[]>
  
  async matchTemplates(
    opportunity: Opportunity,
    detectedIndicators: string[]
  ): Promise<Array<{ template: RiskTemplate; matchScore: number }>>
  
  // Category operations
  async getCategories(tenantId: string): Promise<RiskCategory[]>
  async getCategoryDefinition(tenantId: string, categoryName: string): Promise<RiskCategory>
  
  // Decision rules
  async getDecisionRules(
    tenantId: string,
    catalogRiskIds: string[]
  ): Promise<RiskCatalogDecisionRule[]>
  
  // Mapping & similarity
  async findSimilarRisks(
    riskDescription: string,
    tenantId: string,
    threshold: number = 0.7
  ): Promise<Array<{ riskId: string; similarity: number }>>
}
```

---

## Gap 2: Sales Methodology Integration

### Current State (What's Covered)
✅ **Layer 2 (Feature Engineering):**
- Stage extracted as categorical feature
- Stage-based historical features (stageWinRate)

❌ **What's Missing:**
- No **tenant-specific sales methodology** integration
- No **methodology-aware feature engineering**
- No **stage transition validation** per methodology
- No **methodology-specific risk detection**
- No **sales process compliance checking**

### Required Additions

#### New Tenant Configuration Schema

**SalesMethodology (Cosmos DB - TenantConfiguration container)**
```typescript
interface SalesMethodology {
  tenantId: string;
  methodologyType: "MEDDIC" | "MEDDPICC" | "Challenger" | "Sandler" | "SPIN" | "Custom";
  
  // Stage definitions
  stages: Array<{
    stageId: string;
    stageName: string;                      // "Discovery", "Qualification", etc.
    displayName: string;
    order: number;                          // Stage sequence
    
    // Stage requirements per methodology
    requirements: Array<{
      requirementId: string;
      name: string;                         // e.g., "Economic Buyer Identified" (MEDDIC)
      description: string;
      mandatory: boolean;
      validationRule?: string;              // Expression to validate
    }>;
    
    // Exit criteria (to move to next stage)
    exitCriteria: Array<{
      criteriaId: string;
      description: string;
      mandatory: boolean;
    }>;
    
    // Typical duration (for anomaly detection)
    typicalDurationDays: { min: number; avg: number; max: number; };
    
    // Activities expected in this stage
    expectedActivities: string[];           // ["discovery_call", "demo", "proposal"]
  }>;
  
  // Methodology-specific fields to track
  requiredFields: Array<{
    fieldName: string;                      // Opportunity field
    stages: string[];                       // Required in which stages
    dataType: string;
  }>;
  
  // Methodology-specific risks
  risks: Array<{
    riskId: string;
    stage: string;
    description: string;
    severity: string;
  }>;
}
```

#### Layer 2 (Feature Engineering) - New Requirements

**FR-1.8: Methodology-Aware Features (20 requirements)**
```typescript
interface MethodologyFeatures {
  // Stage compliance
  stageRequirementsMet: number;             // % of requirements met
  stageRequirementsMissing: string[];       // Which requirements missing
  stageExitCriteriaReady: boolean;          // Ready to advance?
  
  // Stage duration anomalies
  daysInCurrentStage: number;
  expectedDaysInStage: number;
  stageDurationAnomaly: boolean;            // Longer than expected?
  
  // Methodology field completion
  methodologyFieldsComplete: number;        // % of required fields filled
  methodologyFieldsMissing: string[];
  
  // Activity alignment
  expectedActivitiesCompleted: number;      // % of expected activities done
  unexpectedActivitiesCount: number;        // Activities not typical for stage
  
  // Methodology-specific (MEDDIC example)
  meddic?: {
    metricsIdentified: boolean;             // M - Metrics
    economicBuyerIdentified: boolean;       // E - Economic Buyer
    decisionCriteriaKnown: boolean;         // D - Decision Criteria
    decisionProcessKnown: boolean;          // D - Decision Process
    paperProcessKnown: boolean;             // P - Paper Process (MEDDPICC)
    identifiedPainConfirmed: boolean;       // I - Identify Pain
    championIdentified: boolean;            // C - Champion
    competitionAssessed: boolean;           // C - Competition (MEDDPICC)
    meddicScore: number;                    // Overall MEDDIC completeness 0-1
  };
}

class FeatureStoreService {
  async extractMethodologyFeatures(
    opportunity: Opportunity,
    tenantId: string
  ): Promise<MethodologyFeatures> {
    // 1. Get tenant's sales methodology
    const methodology = await this.getTenantMethodology(tenantId);
    
    // 2. Get current stage definition
    const currentStage = methodology.stages.find(s => s.stageId === opportunity.stage);
    
    // 3. Check stage requirements
    const requirementsMet = await this.checkStageRequirements(
      opportunity,
      currentStage.requirements
    );
    
    // 4. Check stage duration
    const daysInStage = this.calculateDaysInStage(opportunity);
    const durationAnomaly = daysInStage > currentStage.typicalDurationDays.max;
    
    // 5. Check methodology fields
    const fieldsComplete = await this.checkMethodologyFields(
      opportunity,
      methodology.requiredFields,
      opportunity.stage
    );
    
    // 6. Check activity alignment
    const activityAlignment = await this.checkActivityAlignment(
      opportunity,
      currentStage.expectedActivities
    );
    
    // 7. Extract methodology-specific features (if MEDDIC)
    let meddicFeatures;
    if (methodology.methodologyType === "MEDDIC" || methodology.methodologyType === "MEDDPICC") {
      meddicFeatures = await this.extractMEDDICFeatures(opportunity);
    }
    
    return {
      stageRequirementsMet: requirementsMet.percentageMet,
      stageRequirementsMissing: requirementsMet.missing,
      stageExitCriteriaReady: requirementsMet.exitCriteriaReady,
      daysInCurrentStage: daysInStage,
      expectedDaysInStage: currentStage.typicalDurationDays.avg,
      stageDurationAnomaly: durationAnomaly,
      methodologyFieldsComplete: fieldsComplete.percentageComplete,
      methodologyFieldsMissing: fieldsComplete.missing,
      expectedActivitiesCompleted: activityAlignment.percentageCompleted,
      unexpectedActivitiesCount: activityAlignment.unexpectedCount,
      meddic: meddicFeatures
    };
  }
}
```

#### Layer 3 (ML Prediction) - Enhanced Requirements

**FR-3.10: Methodology-Aware Risk Prediction (15 requirements)**
```typescript
// ML model must consider methodology context
interface MethodologyAwareRiskPrediction {
  riskScore: number;
  categoryScores: Record<string, number>;
  
  // NEW: Methodology-specific risk scores
  methodologyRisks: Array<{
    riskType: string;                       // From methodology.risks
    score: number;                          // 0-1
    stage: string;                          // Which stage this applies to
    reason: string;                         // Why this risk was flagged
  }>;
  
  // NEW: Stage transition risk
  stageTransitionRisk: {
    readyToAdvance: boolean;
    riskIfAdvanced: number;                 // Risk of advancing now
    recommendedActions: string[];           // What to do before advancing
  };
  
  // NEW: Methodology compliance
  methodologyCompliance: {
    overallScore: number;                   // 0-1
    areasMissing: string[];
    impact: string;                         // Impact on deal success
  };
}
```

#### Layer 6 (Decision Engine) - Enhanced Requirements

**FR-6.6: Methodology-Based Decisions (20 requirements)**
```typescript
class DecisionEngineService {
  async makeMethodologyDecisions(
    opportunity: Opportunity,
    methodologyFeatures: MethodologyFeatures,
    tenantId: string
  ): Promise<Decision[]> {
    const methodology = await this.getTenantMethodology(tenantId);
    const decisions: Decision[] = [];
    
    // Decision: Stage requirements not met
    if (methodologyFeatures.stageRequirementsMet < 0.8) {
      decisions.push({
        type: "stage_requirements_missing",
        priority: "high",
        action: "blockStageAdvancement",
        reason: `Only ${methodologyFeatures.stageRequirementsMet * 100}% of stage requirements met`,
        details: {
          missing: methodologyFeatures.stageRequirementsMissing
        },
        recommendations: [
          `Complete missing requirements: ${methodologyFeatures.stageRequirementsMissing.join(', ')}`,
          "Schedule follow-up call to gather missing information",
          "Update opportunity fields with required data"
        ]
      });
    }
    
    // Decision: Stage duration anomaly
    if (methodologyFeatures.stageDurationAnomaly) {
      decisions.push({
        type: "stage_duration_anomaly",
        priority: "medium",
        action: "alert",
        reason: `Opportunity has been in ${opportunity.stage} for ${methodologyFeatures.daysInCurrentStage} days (expected: ${methodologyFeatures.expectedDaysInStage})`,
        recommendations: [
          "Review opportunity status with owner",
          "Identify blockers preventing stage advancement",
          "Consider if opportunity should be marked as stalled"
        ]
      });
    }
    
    // Decision: Methodology fields incomplete
    if (methodologyFeatures.methodologyFieldsComplete < 0.7) {
      decisions.push({
        type: "methodology_incomplete",
        priority: "medium",
        action: "createTask",
        taskDetails: {
          title: "Complete Required Methodology Fields",
          description: `Missing: ${methodologyFeatures.methodologyFieldsMissing.join(', ')}`,
          dueDate: addDays(new Date(), 3)
        }
      });
    }
    
    // Decision: MEDDIC-specific (if applicable)
    if (methodologyFeatures.meddic && methodologyFeatures.meddic.meddicScore < 0.6) {
      decisions.push({
        type: "meddic_score_low",
        priority: "high",
        action: "escalate",
        reason: `MEDDIC score is ${methodologyFeatures.meddic.meddicScore} (target: >0.8)`,
        recommendations: [
          !methodologyFeatures.meddic.economicBuyerIdentified ? "Identify and engage economic buyer" : null,
          !methodologyFeatures.meddic.championIdentified ? "Identify and develop champion" : null,
          !methodologyFeatures.meddic.metricsIdentified ? "Quantify business value metrics" : null,
          !methodologyFeatures.meddic.decisionCriteriaKnown ? "Understand decision criteria" : null
        ].filter(Boolean)
      });
    }
    
    return decisions;
  }
}
```

---

## Gap 3: Opportunity Reactivation Recommendations

### Current State (What's Covered)
✅ **Layer 5 (LLM Reasoning):**
- General recommendation generation
- Context-aware recommendations

✅ **Layer 6 (Decision Engine):**
- Rule-based decisions on current opportunities

❌ **What's Missing:**
- No **dormant/stalled opportunity detection**
- No **reactivation probability prediction**
- No **reactivation recommendation system**
- No **automated reactivation suggestions**
- No **win-back strategy generation**

### Required Additions

#### Layer 2 (Feature Engineering) - New Requirements

**FR-1.9: Dormant Opportunity Features (20 requirements)**
```typescript
interface DormantOpportunityFeatures {
  // Inactivity metrics
  daysSinceLastActivity: number;
  daysSinceLastStageChange: number;
  daysSinceOwnerContact: number;
  daysSinceCustomerResponse: number;
  
  // Activity trends
  activityVelocityChange: number;           // % change in activity rate
  activityCountLast7Days: number;
  activityCountLast30Days: number;
  activityCountLast90Days: number;
  
  // Engagement signals
  customerEngagementScore: number;          // 0-1 (based on responses, attendance)
  ownerEngagementScore: number;             // 0-1 (based on owner activity)
  stakeholderEngagementScore: number;       // 0-1 (are stakeholders still engaged?)
  
  // Historical context
  previouslyReactivated: boolean;           // Has this opp been reactivated before?
  reactivationSuccessRate: number;          // Success rate of similar reactivations
  timeToClose: number;                      // Original expected time to close
  timeElapsed: number;                      // Time since opportunity created
  
  // Reactivation indicators
  recentAccountActivity: boolean;           // Activity on other opps with same account
  economicIndicators: Array<{               // Economic/industry changes
    indicator: string;
    change: string;                         // "improved" | "declined" | "stable"
  }>;
  competitorActivity: boolean;              // Competitor mentioned recently?
  
  // Classification
  dormancyCategory: "recently_dormant" | "long_dormant" | "likely_lost";
  dormancyReason?: string;                  // Inferred reason (budget, timing, etc.)
}
```

#### New ML Model: Reactivation Probability

**FR-3.11: Reactivation Prediction Model (25 requirements)**
```typescript
interface ReactivationPrediction {
  // Core prediction
  reactivationProbability: number;          // 0-1 (prob of successful reactivation)
  confidence: "low" | "medium" | "high";
  
  // Optimal timing
  optimalReactivationWindow: {
    start: Date;                            // Best time to reach out (start)
    end: Date;                              // Best time to reach out (end)
    reason: string;                         // Why this timing?
  };
  
  // Reactivation strategy
  recommendedApproach: {
    channel: "email" | "phone" | "meeting" | "multi-touch";
    tone: "consultative" | "urgent" | "informational" | "promotional";
    emphasis: string[];                     // What to emphasize (value, timing, new features)
  };
  
  // Success factors
  keySuccessFactors: Array<{
    factor: string;
    importance: number;                     // 0-1
    currentStatus: "met" | "partially_met" | "not_met";
  }>;
  
  // Risk factors
  reactivationRisks: Array<{
    risk: string;
    severity: "low" | "medium" | "high";
    mitigation: string;
  }>;
}

// ML Model Training Data
interface ReactivationTrainingExample {
  // Input features
  features: DormantOpportunityFeatures;
  
  // Label (outcome)
  label: {
    wasReactivated: boolean;                // Did reactivation succeed?
    reactivatedAfterDays?: number;          // How long after dormancy?
    reactivationMethod?: string;            // What method worked?
    newCloseDate?: Date;                    // New expected close date
    reactivationSuccess?: boolean;          // Did it eventually close won?
  };
}
```

#### Layer 5 (LLM Reasoning) - New Requirements

**FR-5.4: Reactivation Strategy Generation (30 requirements)**
```typescript
interface ReactivationRecommendation {
  // Reactivation priority
  priority: "high" | "medium" | "low";
  priorityReason: string;
  
  // Recommended actions
  immediateActions: Array<{
    action: string;
    priority: number;
    expectedOutcome: string;
    effort: "low" | "medium" | "high";
  }>;
  
  // Outreach strategy
  outreachPlan: {
    // Initial contact
    initialContact: {
      channel: string;
      subject: string;                      // For email
      keyTalkingPoints: string[];
      callToAction: string;
      timing: Date;
    };
    
    // Follow-up sequence
    followUps: Array<{
      delay: number;                        // Days after previous contact
      channel: string;
      purpose: string;
      message: string;
    }>;
    
    // Value proposition
    valueProposition: {
      primary: string;                      // Main value to emphasize
      secondary: string[];                  // Supporting points
      newDevelopments: string[];            // New features, case studies, etc.
    };
    
    // Objection handling
    anticipatedObjections: Array<{
      objection: string;
      response: string;
    }>;
  };
  
  // Resources needed
  resources: {
    contentAssets: string[];                // Case studies, whitepapers, etc.
    stakeholders: string[];                 // Who should be involved
    tools: string[];                        // Tools to use (e.g., proposal template)
  };
  
  // Success metrics
  successCriteria: {
    shortTerm: string[];                    // Re-engagement, meeting scheduled
    mediumTerm: string[];                   // Proposal submitted, demo completed
    longTerm: string[];                     // Deal closed won
  };
  
  // Alternative strategies
  alternativeStrategies: Array<{
    scenario: string;                       // "If customer doesn't respond..."
    alternativeAction: string;
    contingencyPlan: string;
  }>;
}

class ChainOfThoughtService {
  async generateReactivationStrategy(
    opportunity: Opportunity,
    dormantFeatures: DormantOpportunityFeatures,
    reactivationPrediction: ReactivationPrediction,
    context: OpportunityContext
  ): Promise<ReactivationRecommendation> {
    // Use LLM to generate comprehensive reactivation strategy
    const llmPrompt = this.buildReactivationPrompt({
      opportunity,
      dormantFeatures,
      reactivationPrediction,
      context
    });
    
    const llmResponse = await this.llm.generate(llmPrompt);
    
    // Parse and structure LLM output
    const recommendation = this.parseReactivationStrategy(llmResponse);
    
    return recommendation;
  }
  
  private buildReactivationPrompt(data: any): string {
    return `
      You are a sales strategy expert. Analyze this dormant opportunity and create a comprehensive reactivation plan.
      
      Opportunity Details:
      - Deal: ${data.opportunity.name} (${formatCurrency(data.opportunity.amount)})
      - Stage: ${data.opportunity.stage}
      - Days Dormant: ${data.dormantFeatures.daysSinceLastActivity}
      - Last Contact: ${data.dormantFeatures.daysSinceOwnerContact} days ago
      - Reactivation Probability: ${data.reactivationPrediction.reactivationProbability * 100}%
      
      Context:
      - Account has ${data.context.otherOpportunities.length} other opportunities
      - Recent account activity: ${data.dormantFeatures.recentAccountActivity ? 'Yes' : 'No'}
      - Industry trends: ${data.context.industryTrends}
      
      Generate a reactivation strategy that includes:
      1. Priority assessment (high/medium/low) with reasoning
      2. Immediate actions to take (specific, actionable)
      3. Multi-touch outreach plan (initial + 2-3 follow-ups)
      4. Key value propositions to emphasize
      5. Anticipated objections and responses
      6. Success criteria and metrics
      7. Alternative strategies if initial approach doesn't work
      
      Make the strategy concrete, actionable, and personalized to this specific situation.
    `;
  }
}
```

#### Layer 6 (Decision Engine) - New Requirements

**FR-6.7: Automated Reactivation Triggers (25 requirements)**
```typescript
class DecisionEngineService {
  async evaluateReactivationOpportunities(
    tenantId: string,
    options?: {
      minDaysDormant?: number;              // Default: 14
      minReactivationProbability?: number;  // Default: 0.3
      maxOpportunitiesPerBatch?: number;    // Default: 20
    }
  ): Promise<ReactivationDecision[]> {
    // 1. Query dormant opportunities
    const dormantOpps = await this.findDormantOpportunities(tenantId, {
      minDaysDormant: options?.minDaysDormant || 14,
      status: "open",                       // Not closed
      excludeStages: ["closed_won", "closed_lost"]
    });
    
    // 2. Extract features for each
    const oppFeatures = await Promise.all(
      dormantOpps.map(opp => 
        this.featureStoreService.extractDormantOpportunityFeatures(opp.id, tenantId)
      )
    );
    
    // 3. Predict reactivation probability
    const predictions = await this.mlService.predictReactivation(
      dormantOpps.map((opp, i) => ({ opp, features: oppFeatures[i] }))
    );
    
    // 4. Filter by probability threshold
    const viableReactivations = predictions.filter(
      p => p.reactivationProbability >= (options?.minReactivationProbability || 0.3)
    );
    
    // 5. Rank by priority
    const ranked = viableReactivations.sort((a, b) => {
      // Priority = reactivationProbability * dealValue * urgency
      const priorityA = a.reactivationProbability * a.opportunity.amount * a.urgencyFactor;
      const priorityB = b.reactivationProbability * b.opportunity.amount * b.urgencyFactor;
      return priorityB - priorityA;
    });
    
    // 6. Take top N
    const topReactivations = ranked.slice(0, options?.maxOpportunitiesPerBatch || 20);
    
    // 7. Generate reactivation strategies
    const strategies = await Promise.all(
      topReactivations.map(r => 
        this.chainOfThoughtService.generateReactivationStrategy(
          r.opportunity,
          r.features,
          r.prediction,
          r.context
        )
      )
    );
    
    // 8. Create decisions
    const decisions: ReactivationDecision[] = topReactivations.map((r, i) => ({
      type: "reactivate_opportunity",
      opportunityId: r.opportunity.id,
      priority: strategies[i].priority,
      reactivationProbability: r.reactivationProbability,
      strategy: strategies[i],
      actions: [
        {
          type: "create_task",
          taskDetails: {
            title: `Reactivate: ${r.opportunity.name}`,
            description: strategies[i].outreachPlan.initialContact.keyTalkingPoints.join('\n'),
            priority: strategies[i].priority,
            dueDate: strategies[i].outreachPlan.initialContact.timing
          }
        },
        {
          type: "generate_email_draft",
          emailDetails: {
            to: r.opportunity.primaryContact.email,
            subject: strategies[i].outreachPlan.initialContact.subject,
            body: this.generateEmailBody(strategies[i])
          }
        },
        {
          type: "schedule_follow_ups",
          followUps: strategies[i].outreachPlan.followUps
        }
      ]
    }));
    
    return decisions;
  }
  
  // Scheduled job: Run daily to identify reactivation opportunities
  @Scheduled('0 9 * * *')  // 9 AM daily
  async dailyReactivationCheck() {
    const tenants = await this.getTenantList();
    
    for (const tenant of tenants) {
      const reactivations = await this.evaluateReactivationOpportunities(tenant.id);
      
      if (reactivations.length > 0) {
        // Send notification to sales managers
        await this.notificationService.send({
          to: tenant.salesManagers,
          subject: `${reactivations.length} Reactivation Opportunities Identified`,
          body: this.formatReactivationSummary(reactivations),
          priority: "medium"
        });
        
        // Create tasks for opportunity owners
        for (const reactivation of reactivations) {
          await this.executeActions(reactivation.actions, reactivation.opportunityId, tenant.id);
        }
      }
    }
  }
}
```

#### New UI Components

**ReactivationDashboard Component**
```typescript
interface ReactivationDashboardProps {
  tenantId: string;
}

// Location: apps/web/src/components/reactivation/ReactivationDashboard.tsx
// Features:
// - List of dormant opportunities sorted by reactivation priority
// - Reactivation probability scores with confidence
// - One-click "Start Reactivation" button
// - Automated strategy preview
// - Batch reactivation (select multiple, initiate all)
```

**ReactivationStrategyCard Component**
```typescript
interface ReactivationStrategyCardProps {
  opportunity: Opportunity;
  strategy: ReactivationRecommendation;
  onInitiate: (opportunityId: string) => void;
  onDismiss: (opportunityId: string) => void;
}

// Location: apps/web/src/components/reactivation/ReactivationStrategyCard.tsx
// Features:
// - Show reactivation probability and priority
// - Display immediate actions
// - Show outreach plan summary
// - "Initiate Reactivation" button (creates tasks, email drafts)
// - "Dismiss" button (mark as not worth reactivating)
// - "View Full Strategy" (expands to show all details)
```

#### New UI Page

**Reactivation Opportunities Page**
**Location:** `apps/web/src/app/(authenticated)/reactivation/page.tsx`

**Sections:**
1. **Reactivation Summary**
   - Total dormant opportunities
   - High-priority reactivations (probability >0.7)
   - Medium-priority reactivations (probability 0.4-0.7)
   - Low-priority reactivations (probability <0.4)
   - Total potential revenue from reactivations

2. **Top Reactivation Opportunities** (list)
   - Opportunity name, amount, days dormant
   - Reactivation probability badge
   - Priority indicator
   - Quick action buttons

3. **Reactivation History**
   - Past reactivation attempts
   - Success rate
   - Lessons learned

4. **Filters**
   - By owner
   - By industry
   - By deal size
   - By days dormant
   - By reactivation probability

#### New API Endpoints

1. **GET /api/v1/reactivation/opportunities** - List dormant opportunities
2. **GET /api/v1/reactivation/opportunities/:id/strategy** - Get reactivation strategy
3. **POST /api/v1/reactivation/opportunities/:id/initiate** - Initiate reactivation
4. **POST /api/v1/reactivation/opportunities/:id/dismiss** - Dismiss opportunity
5. **GET /api/v1/reactivation/analytics** - Reactivation analytics

#### New RabbitMQ Events

1. **reactivation.opportunity.identified** - Dormant opp identified
2. **reactivation.strategy.generated** - Strategy created
3. **reactivation.initiated** - Reactivation started
4. **reactivation.outcome.recorded** - Track success/failure

---

## Gap 4: Tenant-Specific Customization

### Current State (What's Covered)
✅ Multi-tenant data isolation (partition by tenantId)
✅ Tenant-specific model selection (industry-specific models)

❌ **What's Missing:**
- No **tenant-configurable ML features**
- No **tenant-specific decision rules**
- No **tenant-level model customization**
- No **tenant preferences for risk tolerance**

### Required Additions

**TenantMLConfiguration (New Schema)**
```typescript
interface TenantMLConfiguration {
  tenantId: string;
  
  // Risk tolerance
  riskTolerance: {
    overallTolerance: "conservative" | "balanced" | "aggressive";
    categoryTolerances: Record<string, number>;  // Per category threshold
    autoEscalationThreshold: number;             // Auto-escalate if risk > X
  };
  
  // Decision preferences
  decisionPreferences: {
    autoMarkHot: boolean;                        // Auto-mark high-probability opps as hot
    autoCreateTasks: boolean;                    // Auto-create tasks for risks
    requireApprovalForActions: boolean;          // Require human approval
  };
  
  // Model preferences
  modelPreferences: {
    preferIndustryModels: boolean;               // Prefer industry-specific over global
    abTestingEnabled: boolean;                   // Allow A/B testing
    minConfidenceThreshold: number;              // Min confidence to use ML
  };
  
  // Custom features
  customFeatures: Array<{
    featureName: string;
    dataSource: string;                          // Opportunity field name
    transformation: string;                      // How to compute
    enabled: boolean;
  }>;
}
```

---

## Implementation Priority for Gaps

### Phase 1: Critical Gaps (Weeks 1-3)
1. **Risk Catalog Integration** (Layer 2, 3, 6)
   - RiskCatalogService implementation
   - Risk catalog database schema
   - Risk catalog feature extraction
   - Catalog-driven decisions

2. **Sales Methodology Integration** (Layer 2, 6)
   - Methodology schema and configuration
   - Methodology-aware feature engineering
   - Methodology-based decision rules

### Phase 2: High-Priority Gaps (Weeks 4-6)
3. **Opportunity Reactivation** (Layers 2, 3, 5, 6)
   - Dormant opportunity feature engineering
   - Reactivation probability model
   - Reactivation strategy generation (LLM)
   - Automated reactivation triggers
   - Reactivation UI components

### Phase 3: Enhanced Customization (Weeks 7-8)
4. **Tenant-Specific Customization**
   - Tenant ML configuration schema
   - Configurable risk tolerances
   - Custom feature support
   - Tenant preference UI

---

## Summary

### Gaps by Layer

| Layer | Gaps Identified | Severity | Effort (weeks) |
|-------|----------------|----------|----------------|
| Layer 2 | Risk Catalog Features, Methodology Features, Dormant Features | Critical | 2-3 |
| Layer 3 | Tenant-Aware Categories, Methodology Prediction, Reactivation Model | High | 2-3 |
| Layer 4 | No major gaps | Low | 0 |
| Layer 5 | Reactivation Strategy Generation | High | 1-2 |
| Layer 6 | Catalog-Driven Decisions, Methodology Decisions, Reactivation Triggers | Critical | 2-3 |
| Layer 7 | No major gaps | Low | 0 |
| Layer 8 | No major gaps | Low | 0 |

### Total Additional Effort
- **Critical Gaps:** 4-6 weeks
- **High-Priority Gaps:** 3-5 weeks
- **Enhanced Customization:** 1-2 weeks
- **Total:** 8-13 additional weeks

### Recommendation
Add **10 weeks** to original 12-week plan → **22-week total implementation**

OR

Implement in phases:
- **MVP (16 weeks):** Original requirements + Risk Catalog + Basic Methodology
- **Phase 2 (6 weeks):** Reactivation + Advanced Methodology
- **Phase 3 (4 weeks):** Full Customization

