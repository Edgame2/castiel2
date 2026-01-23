# CAIS Integration Examples

**Date:** January 2025  
**Status:** 📋 **INTEGRATION EXAMPLES**  
**Version:** 1.0

---

## Overview

This document provides complete, copy-paste ready integration examples for integrating CAIS adaptive learning into existing services.

---

## Example 1: Complete Risk Evaluation Integration

### Service Integration

```typescript
// apps/api/src/services/risk-evaluation.service.ts

import { AdaptiveWeightLearningService } from './adaptive-weight-learning.service.js';
import { OutcomeCollectorService } from './outcome-collector.service.js';
import { PerformanceTrackerService } from './performance-tracker.service.js';
import { contextKeyGenerator } from '../utils/context-key-generator.js';

export class RiskEvaluationService {
  private adaptiveWeightService?: AdaptiveWeightLearningService;
  private outcomeCollector?: OutcomeCollectorService;
  private performanceTracker?: PerformanceTrackerService;
  
  // Default weights (fallback)
  private readonly DEFAULT_WEIGHTS = {
    ml: 0.9,
    rules: 1.0,
    llm: 0.8,
    historical: 0.9,
  };
  
  constructor(
    private monitoring: IMonitoringProvider,
    // ... other dependencies
    adaptiveWeightService?: AdaptiveWeightLearningService,
    outcomeCollector?: OutcomeCollectorService,
    performanceTracker?: PerformanceTrackerService,
  ) {
    this.adaptiveWeightService = adaptiveWeightService;
    this.outcomeCollector = outcomeCollector;
    this.performanceTracker = performanceTracker;
  }
  
  /**
   * Generate context key for risk evaluation
   */
  private generateContextKey(context: Context): string {
    return contextKeyGenerator.generateForRisk(context);
  }
  
  /**
   * Get learned weights for risk evaluation
   */
  private async getWeightsForOpportunity(
    tenantId: string,
    context: Context
  ): Promise<Record<string, number>> {
    if (!this.adaptiveWeightService) {
      return this.DEFAULT_WEIGHTS;
    }
    
    try {
      const contextKey = this.generateContextKey(context);
      return await this.adaptiveWeightService.getWeights(
        tenantId,
        contextKey,
        'risk'
      );
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'getWeightsForOpportunity',
        tenantId,
      });
      return this.DEFAULT_WEIGHTS;
    }
  }
  
  /**
   * Evaluate opportunity with adaptive learning
   */
  async evaluateOpportunity(
    opportunity: Opportunity,
    context: Context
  ): Promise<RiskEvaluation> {
    // Get learned weights
    const weights = await this.getWeightsForOpportunity(
      opportunity.tenantId,
      context
    );
    
    // Perform risk evaluation
    const evaluation = await this.calculateRiskScore(opportunity, weights);
    
    // Track prediction for learning
    if (this.outcomeCollector) {
      await this.trackPredictionForLearning(
        opportunity.tenantId,
        context,
        evaluation,
        weights
      );
    }
    
    return evaluation;
  }
  
  /**
   * Calculate risk score with learned weights
   */
  private async calculateRiskScore(
    opportunity: Opportunity,
    weights: Record<string, number>
  ): Promise<RiskEvaluation> {
    // Detect risks using different methods
    const mlRisks = await this.detectMLRisks(opportunity);
    const ruleRisks = await this.detectRuleRisks(opportunity);
    const llmRisks = await this.detectLLMRisks(opportunity);
    const historicalRisks = await this.detectHistoricalRisks(opportunity);
    
    // Apply learned weights to confidence scores
    const detectedRisks: DetectedRisk[] = [
      ...mlRisks.map(r => ({
        ...r,
        confidence: r.confidence * weights.ml,
        detectionMethod: 'ml' as const,
      })),
      ...ruleRisks.map(r => ({
        ...r,
        confidence: r.confidence * weights.rules,
        detectionMethod: 'rule' as const,
      })),
      ...llmRisks.map(r => ({
        ...r,
        confidence: r.confidence * weights.llm,
        detectionMethod: 'ai' as const,
      })),
      ...historicalRisks.map(r => ({
        ...r,
        confidence: r.confidence * weights.historical,
        detectionMethod: 'historical' as const,
      })),
    ];
    
    // Calculate overall risk score
    const overallRiskScore = Math.max(
      ...detectedRisks.map(r => r.confidence),
      0
    );
    
    return {
      opportunityId: opportunity.id,
      overallRiskScore,
      detectedRisks,
      evaluatedAt: new Date(),
    };
  }
  
  /**
   * Track prediction for learning
   */
  private async trackPredictionForLearning(
    tenantId: string,
    context: Context,
    evaluation: RiskEvaluation,
    weights: Record<string, number>
  ): Promise<void> {
    if (!this.outcomeCollector) return;
    
    try {
      // Extract component scores
      const componentScores: Record<string, number> = {};
      evaluation.detectedRisks.forEach(risk => {
        const method = risk.detectionMethod;
        if (!componentScores[method]) {
          componentScores[method] = risk.confidence;
        } else {
          componentScores[method] = Math.max(
            componentScores[method],
            risk.confidence
          );
        }
      });
      
      // Record prediction
      const predictionId = await this.outcomeCollector.recordPrediction(
        tenantId,
        'risk',
        context,
        {
          riskScore: evaluation.overallRiskScore,
          detectedRisks: evaluation.detectedRisks,
        },
        componentScores,
        weights
      );
      
      // Store predictionId with opportunity for later outcome recording
      // (Implementation depends on your data model)
      await this.storePredictionId(evaluation.opportunityId, predictionId);
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'trackPredictionForLearning',
        tenantId,
      });
      // Don't throw - learning is non-critical
    }
  }
  
  /**
   * Record outcome when opportunity is won/lost
   */
  async onOpportunityOutcome(
    opportunityId: string,
    tenantId: string,
    outcome: 'won' | 'lost' | 'cancelled'
  ): Promise<void> {
    if (!this.outcomeCollector) return;
    
    try {
      // Retrieve predictionId (stored earlier)
      const predictionId = await this.getPredictionId(opportunityId);
      if (!predictionId) return;
      
      // Record outcome
      await this.outcomeCollector.recordOutcome(
        predictionId,
        tenantId,
        outcome === 'won' ? 1.0 : 0.0,
        outcome === 'won' ? 'success' : 'failure',
        {
          opportunityId,
          outcome,
        }
      );
      
      // Track component performance
      if (this.performanceTracker) {
        // Get evaluation to determine which components were correct
        const evaluation = await this.getEvaluation(opportunityId);
        if (evaluation) {
          const wasCorrect = (outcome === 'won' && evaluation.overallRiskScore < 0.5) ||
                            (outcome === 'lost' && evaluation.overallRiskScore >= 0.5);
          
          // Track each component
          evaluation.detectedRisks.forEach(risk => {
            this.performanceTracker!.trackPerformance(
              tenantId,
              'risk',
              evaluation.context,
              risk.detectionMethod,
              wasCorrect
            );
          });
        }
      }
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'onOpportunityOutcome',
        tenantId,
        opportunityId,
      });
    }
  }
  
  // Helper methods (implement based on your data model)
  private async storePredictionId(opportunityId: string, predictionId: string): Promise<void> {
    // Store predictionId with opportunity
    // Example: await this.repository.update(opportunityId, { predictionId });
  }
  
  private async getPredictionId(opportunityId: string): Promise<string | null> {
    // Retrieve predictionId
    // Example: const opp = await this.repository.findById(opportunityId);
    // return opp?.predictionId || null;
    return null;
  }
  
  private async getEvaluation(opportunityId: string): Promise<RiskEvaluation | null> {
    // Retrieve evaluation
    return null;
  }
}
```

### Service Initialization

```typescript
// In routes/index.ts or initialization file

import { initializeAdaptiveLearningServices } from '../services/initialization/adaptive-learning-services.init.js';

// During application startup
const adaptiveLearningResult = await initializeAdaptiveLearningServices(
  server,
  monitoring,
  cosmosClient,
  redis,
  serviceRegistry
);

// Pass services to RiskEvaluationService
const riskEvaluationService = new RiskEvaluationService(
  monitoring,
  // ... other dependencies
  adaptiveLearningResult.adaptiveWeightLearningService,
  adaptiveLearningResult.outcomeCollectorService,
  adaptiveLearningResult.performanceTrackerService,
);
```

---

## Example 2: Complete Recommendations Integration

### Service Integration

```typescript
// apps/api/src/services/recommendation.service.ts

export class RecommendationsService {
  private adaptiveWeightService?: AdaptiveWeightLearningService;
  private outcomeCollector?: OutcomeCollectorService;
  private performanceTracker?: PerformanceTrackerService;
  
  private readonly DEFAULT_WEIGHTS = {
    vectorSearch: 0.4,
    collaborative: 0.3,
    temporal: 0.2,
    content: 0.1,
  };
  
  constructor(
    // ... existing dependencies
    adaptiveWeightService?: AdaptiveWeightLearningService,
    outcomeCollector?: OutcomeCollectorService,
    performanceTracker?: PerformanceTrackerService,
  ) {
    this.adaptiveWeightService = adaptiveWeightService;
    this.outcomeCollector = outcomeCollector;
    this.performanceTracker = performanceTracker;
  }
  
  /**
   * Generate context key for recommendations
   */
  private generateContextKey(request: RecommendationRequest): string {
    return contextKeyGenerator.generateForRecommendations({
      industry: request.industry,
      dealSize: request.dealSize,
      stage: request.stage,
      dealValue: request.dealValue,
    });
  }
  
  /**
   * Get recommendations with adaptive learning
   */
  async getRecommendations(
    request: RecommendationRequest
  ): Promise<Recommendation[]> {
    // Get learned weights
    const weights = await this.getWeightsForContext(
      request.tenantId,
      request
    );
    
    // Generate recommendations from different sources
    const vectorResults = await this.getVectorSearchResults(request);
    const collaborativeResults = await this.getCollaborativeResults(request);
    const temporalResults = await this.getTemporalResults(request);
    const contentResults = await this.getContentResults(request);
    
    // Merge and score with learned weights
    const recommendations = await this.mergeAndScoreRecommendations(
      vectorResults,
      collaborativeResults,
      temporalResults,
      contentResults,
      weights
    );
    
    // Track prediction for learning
    if (this.outcomeCollector) {
      await this.trackPredictionForLearning(
        request.tenantId,
        request,
        recommendations,
        weights
      );
    }
    
    return recommendations;
  }
  
  /**
   * Get learned weights for context
   */
  private async getWeightsForContext(
    tenantId: string,
    request: RecommendationRequest
  ): Promise<Record<string, number>> {
    if (!this.adaptiveWeightService) {
      return this.DEFAULT_WEIGHTS;
    }
    
    try {
      const contextKey = this.generateContextKey(request);
      return await this.adaptiveWeightService.getWeights(
        tenantId,
        contextKey,
        'recommendations'
      );
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'getWeightsForContext',
        tenantId,
      });
      return this.DEFAULT_WEIGHTS;
    }
  }
  
  /**
   * Merge and score recommendations with learned weights
   */
  private async mergeAndScoreRecommendations(
    vectorResults: Recommendation[],
    collaborativeResults: Recommendation[],
    temporalResults: Recommendation[],
    contentResults: Recommendation[],
    weights: Record<string, number>
  ): Promise<Recommendation[]> {
    // Score each result type
    const scoredVector = vectorResults.map(r => ({
      ...r,
      score: r.score * weights.vectorSearch,
      source: 'vectorSearch' as const,
    }));
    
    const scoredCollaborative = collaborativeResults.map(r => ({
      ...r,
      score: r.score * weights.collaborative,
      source: 'collaborative' as const,
    }));
    
    const scoredTemporal = temporalResults.map(r => ({
      ...r,
      score: r.score * weights.temporal,
      source: 'temporal' as const,
    }));
    
    const scoredContent = contentResults.map(r => ({
      ...r,
      score: r.score * weights.content,
      source: 'content' as const,
    }));
    
    // Merge and deduplicate
    const allRecommendations = [
      ...scoredVector,
      ...scoredCollaborative,
      ...scoredTemporal,
      ...scoredContent,
    ];
    
    // Group by recommendation ID and sum scores
    const merged = new Map<string, Recommendation>();
    allRecommendations.forEach(rec => {
      const existing = merged.get(rec.id);
      if (existing) {
        existing.score += rec.score;
        existing.sources.push(rec.source);
      } else {
        merged.set(rec.id, {
          ...rec,
          sources: [rec.source],
        });
      }
    });
    
    // Sort by score and return top N
    return Array.from(merged.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, this.algorithmConfig.maxRecommendationsPerUser);
  }
  
  /**
   * Track prediction for learning
   */
  private async trackPredictionForLearning(
    tenantId: string,
    request: RecommendationRequest,
    recommendations: Recommendation[],
    weights: Record<string, number>
  ): Promise<void> {
    if (!this.outcomeCollector) return;
    
    try {
      // Extract component scores
      const componentScores: Record<string, number> = {};
      recommendations.forEach(rec => {
        rec.sources.forEach(source => {
          if (!componentScores[source]) {
            componentScores[source] = rec.score;
          } else {
            componentScores[source] = Math.max(
              componentScores[source],
              rec.score
            );
          }
        });
      });
      
      // Record prediction
      const predictionId = await this.outcomeCollector.recordPrediction(
        tenantId,
        'recommendations',
        {
          industry: request.industry,
          dealSize: request.dealSize,
          stage: request.stage,
          dealValue: request.dealValue,
        },
        recommendations,
        componentScores,
        weights
      );
      
      // Store predictionId with request (for later outcome recording)
      await this.storePredictionId(request.id, predictionId);
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'trackPredictionForLearning',
        tenantId,
      });
    }
  }
  
  /**
   * Record outcome when user interacts with recommendation
   */
  async onRecommendationAction(
    recommendationId: string,
    requestId: string,
    tenantId: string,
    action: 'clicked' | 'accepted' | 'dismissed'
  ): Promise<void> {
    if (!this.outcomeCollector) return;
    
    try {
      // Retrieve predictionId
      const predictionId = await this.getPredictionId(requestId);
      if (!predictionId) return;
      
      // Calculate outcome value
      const outcome = action === 'accepted' ? 1.0 :
                     action === 'clicked' ? 0.5 : 0.0;
      
      // Record outcome
      await this.outcomeCollector.recordOutcome(
        predictionId,
        tenantId,
        outcome,
        action === 'accepted' ? 'success' :
        action === 'clicked' ? 'partial' : 'failure',
        {
          recommendationId,
          action,
        }
      );
      
      // Track component performance
      if (this.performanceTracker) {
        const recommendation = await this.getRecommendation(recommendationId);
        if (recommendation) {
          recommendation.sources.forEach(source => {
            this.performanceTracker!.trackPerformance(
              tenantId,
              'recommendations',
              recommendation.context,
              source,
              action === 'accepted' || action === 'clicked'
            );
          });
        }
      }
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'onRecommendationAction',
        tenantId,
        recommendationId,
      });
    }
  }
  
  // Helper methods
  private async storePredictionId(requestId: string, predictionId: string): Promise<void> {
    // Store predictionId
  }
  
  private async getPredictionId(requestId: string): Promise<string | null> {
    // Retrieve predictionId
    return null;
  }
  
  private async getRecommendation(id: string): Promise<Recommendation | null> {
    // Retrieve recommendation
    return null;
  }
}
```

---

## Example 3: Route Handler Integration

### Route Handler with Adaptive Learning

```typescript
// apps/api/src/routes/risk.routes.ts

import { FastifyRequest, FastifyReply } from 'fastify';

export async function registerRiskRoutes(server: FastifyInstance) {
  /**
   * POST /api/v1/risk/evaluate
   * Evaluate opportunity risk with adaptive learning
   */
  server.post('/risk/evaluate', async (request: FastifyRequest, reply: FastifyReply) => {
    const { opportunityId, context } = request.body as {
      opportunityId: string;
      context: Context;
    };
    
    const tenantId = (request as any).authContext?.tenantId;
    if (!tenantId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    
    // Get risk evaluation service (with adaptive learning)
    const riskService = (server as any).riskEvaluationService;
    
    // Evaluate opportunity
    const evaluation = await riskService.evaluateOpportunity(
      { id: opportunityId, tenantId },
      context
    );
    
    return reply.send(evaluation);
  });
  
  /**
   * POST /api/v1/risk/outcome
   * Record opportunity outcome for learning
   */
  server.post('/risk/outcome', async (request: FastifyRequest, reply: FastifyReply) => {
    const { opportunityId, outcome } = request.body as {
      opportunityId: string;
      outcome: 'won' | 'lost' | 'cancelled';
    };
    
    const tenantId = (request as any).authContext?.tenantId;
    if (!tenantId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    
    // Get risk evaluation service
    const riskService = (server as any).riskEvaluationService;
    
    // Record outcome
    await riskService.onOpportunityOutcome(
      opportunityId,
      tenantId,
      outcome
    );
    
    return reply.send({ success: true });
  });
}
```

---

## Example 4: Testing Integration

### Unit Test Example

```typescript
// apps/api/tests/services/risk-evaluation-integration.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RiskEvaluationService } from '../../src/services/risk-evaluation.service.js';
import { AdaptiveWeightLearningService } from '../../src/services/adaptive-weight-learning.service.js';
import { OutcomeCollectorService } from '../../src/services/outcome-collector.service.js';

describe('RiskEvaluationService with Adaptive Learning', () => {
  let riskService: RiskEvaluationService;
  let adaptiveWeightService: AdaptiveWeightLearningService;
  let outcomeCollector: OutcomeCollectorService;
  
  beforeEach(() => {
    // Mock services
    adaptiveWeightService = {
      getWeights: vi.fn().mockResolvedValue({
        ml: 0.9,
        rules: 1.0,
        llm: 0.8,
        historical: 0.9,
      }),
    } as any;
    
    outcomeCollector = {
      recordPrediction: vi.fn().mockResolvedValue('prediction-id'),
      recordOutcome: vi.fn().mockResolvedValue(undefined),
    } as any;
    
    riskService = new RiskEvaluationService(
      mockMonitoring,
      // ... other dependencies
      adaptiveWeightService,
      outcomeCollector,
      undefined, // performanceTracker
    );
  });
  
  it('should use learned weights for risk evaluation', async () => {
    const opportunity = { id: 'opp-1', tenantId: 'tenant-1' };
    const context = { industry: 'tech', dealSize: 'large' };
    
    const evaluation = await riskService.evaluateOpportunity(opportunity, context);
    
    expect(adaptiveWeightService.getWeights).toHaveBeenCalledWith(
      'tenant-1',
      expect.any(String),
      'risk'
    );
    expect(evaluation).toBeDefined();
    expect(evaluation.overallRiskScore).toBeGreaterThanOrEqual(0);
    expect(evaluation.overallRiskScore).toBeLessThanOrEqual(1);
  });
  
  it('should track prediction for learning', async () => {
    const opportunity = { id: 'opp-1', tenantId: 'tenant-1' };
    const context = { industry: 'tech', dealSize: 'large' };
    
    await riskService.evaluateOpportunity(opportunity, context);
    
    expect(outcomeCollector.recordPrediction).toHaveBeenCalled();
  });
  
  it('should record outcome when opportunity is won', async () => {
    // Mock getPredictionId
    vi.spyOn(riskService as any, 'getPredictionId')
      .mockResolvedValue('prediction-id');
    
    await riskService.onOpportunityOutcome('opp-1', 'tenant-1', 'won');
    
    expect(outcomeCollector.recordOutcome).toHaveBeenCalledWith(
      'prediction-id',
      'tenant-1',
      1.0,
      'success',
      expect.any(Object)
    );
  });
});
```

---

## Conclusion

These integration examples provide complete, production-ready code for integrating CAIS adaptive learning into existing services. Adapt the patterns to your specific use case.

**Status:** ✅ **INTEGRATION EXAMPLES COMPLETE**
