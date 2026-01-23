/**
 * Risk Evaluation Service
 * Core service for evaluating opportunities and detecting risks
 * Combines rule-based, AI-powered, and historical pattern matching
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import { ShardRepository } from '../repositories/shard.repository.js';
import { ShardTypeRepository } from '../repositories/shard-type.repository.js';
import { ShardRelationshipService } from './shard-relationship.service.js';
import { RiskCatalogService } from './risk-catalog.service.js';
import { VectorSearchService } from './vector-search.service.js';
import { InsightService } from './insight.service.js';
import { QueueService } from './queue.service.js';
import type {
  RiskEvaluation,
  DetectedRisk,
  HistoricalPattern,
  RiskCatalog,
  RiskCategory,
  RiskEvaluationAssumptions,
  RiskExplainability,
  DetectionMethod,
} from '../types/risk-analysis.types.js';
import type { Shard } from '../types/shard.types.js';
import { CORE_SHARD_TYPE_NAMES } from '../types/core-shard-types.js';
import { SimilarityMetric } from '../types/vector-search.types.js';
import type { InsightResponse } from '../types/ai-insights.types.js';
import { DataQualityService, type DataQualityReport, type QualityGateConfig } from './data-quality.service.js';
import { TrustLevelService } from './trust-level.service.js';
import { RiskAIValidationService } from './risk-ai-validation.service.js';
import { RiskExplainabilityService } from './risk-explainability.service.js';
import { ComprehensiveAuditTrailService } from './comprehensive-audit-trail.service.js';
import type { DecisionTrail, DataLineage } from '../types/comprehensive-audit.types.js';
import { v4 as uuidv4 } from 'uuid';

export class RiskEvaluationService {
  // Cache TTL for risk evaluations (15 minutes)
  private readonly CACHE_TTL = 15 * 60 * 1000;
  private evaluationCache = new Map<string, { evaluation: RiskEvaluation; expiresAt: number }>();

  // Default weights for fallback
  private readonly DEFAULT_WEIGHTS = {
    ml: 0.9,
    rules: 1.0,
    llm: 0.8,
    historical: 0.9,
  };

  constructor(
    private monitoring: IMonitoringProvider,
    private shardRepository: ShardRepository,
    private shardTypeRepository: ShardTypeRepository,
    private relationshipService: ShardRelationshipService,
    private riskCatalogService: RiskCatalogService,
    private vectorSearchService?: VectorSearchService,
    private insightService?: InsightService,
    private serviceBusService?: QueueService,
    private dataQualityService?: DataQualityService,
    private trustLevelService?: TrustLevelService,
    private riskAIValidationService?: RiskAIValidationService,
    private riskExplainabilityService?: RiskExplainabilityService,
    private comprehensiveAuditTrailService?: ComprehensiveAuditTrailService,
    // Optional: Adaptive weight learning service
    private adaptiveWeightService?: import('./adaptive-weight-learning.service.js').AdaptiveWeightLearningService, // AdaptiveWeightLearningService - optional for gradual rollout
    private outcomeCollector?: import('./outcome-collector.service.js').OutcomeCollectorService, // OutcomeCollectorService - optional
    private performanceTracker?: import('./performance-tracker.service.js').PerformanceTrackerService, // PerformanceTrackerService - optional
    private conflictResolutionLearning?: import('./conflict-resolution-learning.service.js').ConflictResolutionLearningService // ConflictResolutionLearningService - optional
  ) {}

  /**
   * Queue risk evaluation for async processing
   */
  async queueRiskEvaluation(
    opportunityId: string,
    tenantId: string,
    userId: string,
    trigger: 'scheduled' | 'opportunity_updated' | 'shard_created' | 'manual' | 'risk_catalog_created' | 'risk_catalog_updated',
    priority: 'high' | 'normal' | 'low' = 'normal',
    options?: {
      includeHistorical?: boolean;
      includeAI?: boolean;
      includeSemanticDiscovery?: boolean;
    }
  ): Promise<void> {
    if (!this.serviceBusService) {
      throw new Error('ServiceBusService is required for queueing risk evaluations');
    }

    try {
      await this.serviceBusService.sendRiskEvaluationJob(
        {
          opportunityId,
          tenantId,
          userId,
          trigger,
          priority,
          options: {
            includeHistorical: options?.includeHistorical !== false,
            includeAI: options?.includeAI !== false,
            includeSemanticDiscovery: options?.includeSemanticDiscovery !== false,
          },
          timestamp: new Date(),
        }
      );

      this.monitoring.trackEvent('risk-evaluation.queued', {
        tenantId,
        opportunityId,
        trigger,
        priority,
      });
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'risk-evaluation.queueRiskEvaluation',
          tenantId,
          opportunityId,
        }
      );
      throw error;
    }
  }

  /**
   * Main evaluation method - evaluates an opportunity for risks
   */
  async evaluateOpportunity(
    opportunityId: string,
    tenantId: string,
    userId: string,
    options?: {
      forceRefresh?: boolean;
      includeHistorical?: boolean;
      includeAI?: boolean;
      includeSemanticDiscovery?: boolean;
      parentTraceId?: string; // For distributed tracing
    }
  ): Promise<RiskEvaluation> {
    const startTime = Date.now();
    const traceId = this.comprehensiveAuditTrailService?.generateTraceId() || uuidv4();
    const detectionMethods: DetectionMethod[] = [];
    const matchedRules: Array<{ riskId: string; ruleId: string; ruleType: string; matchedConditions: string[]; confidence: number }> = [];
    const historicalPatterns: Array<{ similarOpportunityId: string; similarityScore: number; outcome: 'won' | 'lost'; riskFactors: string[] }> = [];
    const semanticMatches: Array<{ shardId: string; shardType: string; similarityScore: number }> = [];
    let aiReasoning: string | undefined;
    let aiConfidence: number | undefined;
    const conflicts: Array<{ method1: DetectionMethod; method2: DetectionMethod; conflict: string; resolution: string; resolutionMethod: 'manual' | 'highest_confidence' | 'rule_priority' | 'merged' }> = [];

    try {
      // Check cache first (unless force refresh)
      if (!options?.forceRefresh) {
        const cached = this.evaluationCache.get(`${tenantId}:${opportunityId}`);
        if (cached && cached.expiresAt > Date.now()) {
          this.monitoring.trackEvent('risk-evaluation.cache-hit', {
            tenantId,
            opportunityId,
          });
          return cached.evaluation;
        }
      }

      // Get opportunity shard
      const opportunity = await this.shardRepository.findById(opportunityId, tenantId);
      if (!opportunity) {
        throw new Error(`Opportunity not found: ${opportunityId}`);
      }

      // Verify it's an opportunity shard
      const shardType = await this.shardTypeRepository.findById(opportunity.shardTypeId, tenantId);
      if (shardType?.name !== CORE_SHARD_TYPE_NAMES.OPPORTUNITY) {
        throw new Error(`Shard is not an opportunity: ${opportunityId}`);
      }

      // Get related shards (account, contacts, etc.)
      const relatedShardsResult = await this.relationshipService.getRelatedShards(
        tenantId,
        opportunityId,
        'both',
        { limit: 50 }
      );
      const relatedShards = relatedShardsResult.map(r => r.shard);

      // Data quality pre-flight validation
      let dataQuality: DataQualityReport | undefined;
      let qualityGatePassed = true;
      if (this.dataQualityService) {
        try {
          dataQuality = await this.dataQualityService.validateOpportunityDataQuality(
            opportunity,
            relatedShards,
            ['c_account', 'c_contact']
          );
          
          const qualityGate = this.dataQualityService.checkQualityGate(dataQuality);
          qualityGatePassed = qualityGate.shouldProceed;
          
          if (qualityGate.action === 'block') {
            throw new Error(`Data quality too low: ${qualityGate.message}`);
          }
          
          if (qualityGate.action === 'warn') {
            this.monitoring.trackEvent('risk-evaluation.quality-warning', {
              tenantId,
              opportunityId,
              qualityScore: dataQuality.qualityScore,
              message: qualityGate.message,
            });
          }
        } catch (error: unknown) {
          this.monitoring.trackException(error, {
            operation: 'risk-evaluation.data-quality-check',
            tenantId,
            opportunityId,
          });
          // Continue with evaluation but log the issue
        }
      }

      // Track assumptions throughout the process
      const assumptions: RiskEvaluationAssumptions = {
        dataCompleteness: dataQuality?.completeness ?? 0.5,
        dataStaleness: dataQuality?.staleness ?? 0,
        missingRelatedShards: dataQuality?.missingRelationships ?? [],
        missingRequiredFields: dataQuality?.issues
          .filter(i => i.type === 'missing_field')
          .map(i => i.field || '')
          .filter(Boolean) ?? [],
        dataQualityScore: dataQuality?.qualityScore ?? 0.5,
        serviceAvailability: {
          groundingService: false, // Will be updated during AI detection
          vectorSearch: !!this.vectorSearchService,
          historicalPatterns: options?.includeHistorical !== false && !!this.vectorSearchService,
        },
        contextTokenCount: 0, // Will be updated during AI detection
        contextTruncated: false, // Will be updated during AI detection
        aiModelAvailable: !!this.insightService,
        aiModelVersion: undefined, // Will be updated during AI detection if available
      };

      // Get risk catalog for audit trail
      const opportunityData = opportunity.structuredData as any;
      const industryId = relatedShards.find(s => {
        const data = s.structuredData as any;
        return s.shardTypeId === (opportunity.shardTypeId) && data?.industry;
      })?.structuredData as any;
      const catalog = await this.riskCatalogService.getCatalog(
        tenantId,
        industryId?.industry
      );

      // Detect risks using multiple methods
      const detectRisksResult = await this.detectRisks(
        opportunity,
        relatedShards,
        tenantId,
        userId,
        {
          includeHistorical: options?.includeHistorical !== false,
          includeAI: options?.includeAI !== false,
          dataQuality, // Pass data quality for validation
        },
        assumptions // Pass assumptions to track
      );
      const detectedRisks = detectRisksResult.risks;
      
      // Track detection methods for audit trail
      if (detectRisksResult.detectionMethods) {
        detectionMethods.push(...detectRisksResult.detectionMethods);
      }
      if (detectRisksResult.matchedRules) {
        matchedRules.push(...detectRisksResult.matchedRules);
      }
      if (detectRisksResult.historicalPatterns) {
        historicalPatterns.push(...detectRisksResult.historicalPatterns);
      }
      if (detectRisksResult.semanticMatches) {
        semanticMatches.push(...detectRisksResult.semanticMatches);
      }
      if (detectRisksResult.aiReasoning) {
        aiReasoning = detectRisksResult.aiReasoning;
      }
      if (detectRisksResult.aiConfidence !== undefined) {
        aiConfidence = detectRisksResult.aiConfidence;
      }
      if (detectRisksResult.conflicts) {
        conflicts.push(...(detectRisksResult.conflicts as Array<{ method1: DetectionMethod; method2: DetectionMethod; conflict: string; resolution: string; resolutionMethod: 'manual' | 'highest_confidence' | 'rule_priority' | 'merged' }>));
      }

      // Calculate aggregate risk score (global + category scores)
      const { globalScore, categoryScores } = await this.calculateRiskScore(
        detectedRisks,
        tenantId,
        opportunity
      );

      // Calculate revenue at risk (basic calculation - will be enhanced by RevenueAtRiskService)
      const revenueAtRisk = this.calculateRevenueAtRisk(opportunity, globalScore);

      // Calculate trust level
      let trustLevel: 'high' | 'medium' | 'low' | 'unreliable' | undefined;
      let qualityScore: number | undefined;
      if (this.trustLevelService && dataQuality) {
        const trustCalculation = this.trustLevelService.calculateTrustLevel(
          assumptions as RiskEvaluationAssumptions,
          dataQuality
        );
        trustLevel = trustCalculation.trustLevel;
        qualityScore = trustCalculation.score;
      }

      // Ensure assumptions are always included (even if empty/partial)
      // This is critical for users to assess reliability
      const finalAssumptions: RiskEvaluationAssumptions = {
        ...assumptions,
        // Ensure all required fields are present with defaults if missing
        dataCompleteness: assumptions?.dataCompleteness ?? 0.5,
        dataStaleness: assumptions?.dataStaleness ?? 0,
        missingRelatedShards: assumptions?.missingRelatedShards ?? [],
        missingRequiredFields: assumptions?.missingRequiredFields ?? [],
        dataQualityScore: assumptions?.dataQualityScore ?? 0.5,
        aiModelAvailable: assumptions?.aiModelAvailable ?? false,
        contextTokenCount: assumptions?.contextTokenCount ?? 0,
        contextTruncated: assumptions?.contextTruncated ?? false,
        serviceAvailability: assumptions?.serviceAvailability ?? {
          groundingService: false,
          vectorSearch: false,
          historicalPatterns: false,
        },
        aiModelVersion: assumptions?.aiModelVersion,
      };

      // Build risk evaluation with category scores, assumptions, and trust level
      const evaluation: RiskEvaluation = {
        evaluationDate: new Date(),
        riskScore: globalScore,
        categoryScores,
        revenueAtRisk,
        risks: detectedRisks,
        calculatedAt: new Date(),
        calculatedBy: userId,
        assumptions: finalAssumptions, // Always include assumptions
        trustLevel,
        qualityScore,
      };

      // Update opportunity shard with embedded risk evaluation
      await this.shardRepository.update(opportunityId, tenantId, {
        structuredData: {
          ...opportunity.structuredData,
          riskEvaluation: evaluation,
        },
      });

      // Create risk snapshot (on EVERY evaluation for evolution tracking)
      await this.createRiskSnapshot(opportunity, evaluation, tenantId, userId);

      // Cache the evaluation
      this.evaluationCache.set(`${tenantId}:${opportunityId}`, {
        evaluation,
        expiresAt: Date.now() + this.CACHE_TTL,
      });

      // Track prediction for adaptive learning (non-blocking)
      this.trackPredictionForLearning(tenantId, opportunity, evaluation, detectedRisks).catch((error) => {
        this.monitoring.trackException(error as Error, {
          operation: 'risk-evaluation.trackPrediction',
          tenantId,
          opportunityId,
        });
      });

      this.monitoring.trackEvent('risk-evaluation.completed', {
        tenantId,
        opportunityId,
        riskScore: globalScore,
        categoryScores: JSON.stringify(categoryScores),
        riskCount: detectedRisks.length,
        durationMs: Date.now() - startTime,
      });

      // Log comprehensive audit trail (non-blocking)
      if (this.comprehensiveAuditTrailService) {
        // Build decision trail with score calculation steps
        const scoreCalculationSteps: Array<{
          step: string;
          description: string;
          inputValues: Record<string, number>;
          formula: string;
          result: number;
          category?: string;
        }> = [];

        // Step 1: Normalize contributions
        const totalContribution = detectedRisks.reduce((sum, risk) => sum + risk.contribution, 0);
        scoreCalculationSteps.push({
          step: 'normalize_contributions',
          description: 'Normalize risk contributions to sum to 1.0',
          inputValues: { totalContribution },
          formula: 'contribution / totalContribution',
          result: totalContribution > 0 ? 1.0 : 0,
        });

        // Step 2: Calculate global score
        const normalizedRisks = detectedRisks.map(risk => ({
          ...risk,
          contribution: risk.contribution / Math.max(totalContribution, 1),
        }));
        const calculatedGlobalScore = normalizedRisks.reduce((sum, risk) => {
          return sum + (risk.ponderation * risk.confidence * risk.contribution);
        }, 0);
        scoreCalculationSteps.push({
          step: 'calculate_global_score',
          description: 'Calculate global risk score using weighted sum',
          inputValues: {
            riskCount: detectedRisks.length,
            averagePonderation: detectedRisks.reduce((sum, r) => sum + r.ponderation, 0) / Math.max(detectedRisks.length, 1),
            averageConfidence: detectedRisks.reduce((sum, r) => sum + r.confidence, 0) / Math.max(detectedRisks.length, 1),
          },
          formula: 'Σ(ponderation * confidence * normalizedContribution)',
          result: calculatedGlobalScore,
        });

        // Step 3: Calculate category scores
        const categoryScoreDetails: Record<string, {
          score: number;
          contribution: number;
          risks: Array<{
            riskId: string;
            contribution: number;
            confidence: number;
            ponderation: number;
          }>;
        }> = {};
        for (const [category, score] of Object.entries(categoryScores)) {
          const categoryRisks = detectedRisks.filter(r => r.category === category);
          categoryScoreDetails[category] = {
            score,
            contribution: categoryRisks.reduce((sum, r) => sum + r.contribution, 0),
            risks: categoryRisks.map(r => ({
              riskId: r.riskId,
              contribution: r.contribution / Math.max(totalContribution, 1),
              confidence: r.confidence,
              ponderation: r.ponderation,
            })),
          };
          scoreCalculationSteps.push({
            step: `calculate_category_score_${category.toLowerCase()}`,
            description: `Calculate ${category} category risk score`,
            inputValues: {
              riskCount: categoryRisks.length,
              totalContribution: categoryRisks.reduce((sum, r) => sum + r.contribution, 0),
            },
            formula: 'Σ(ponderation * confidence * normalizedContribution) for category',
            result: score,
            category,
          });
        }

        // Build confidence adjustments
        const confidenceAdjustments: Array<{
          factor: string;
          adjustment: number;
          reason: string;
          source: string;
        }> = [];
        if (dataQuality) {
          confidenceAdjustments.push({
            factor: 'data_quality',
            adjustment: dataQuality.qualityScore - 1.0, // Negative adjustment for lower quality
            reason: `Data quality score: ${dataQuality.qualityScore.toFixed(2)}`,
            source: 'data_quality_service',
          });
        }
        if (assumptions.dataStaleness > 30) {
          confidenceAdjustments.push({
            factor: 'data_staleness',
            adjustment: -0.1,
            reason: `Data is ${assumptions.dataStaleness} days old`,
            source: 'data_quality_service',
          });
        }

        const decisionTrail: DecisionTrail = {
          detectionMethods: Array.from(new Set(detectionMethods)),
          matchedRules: matchedRules.length > 0 ? matchedRules : undefined,
          aiReasoning,
          aiConfidence,
          historicalPatterns: historicalPatterns.length > 0 ? historicalPatterns : undefined,
          semanticMatches: semanticMatches.length > 0 ? semanticMatches : undefined,
          conflicts: conflicts.length > 0 ? conflicts : undefined,
          scoreCalculation: {
            steps: scoreCalculationSteps,
            categoryScores: categoryScoreDetails,
            confidenceAdjustments,
            finalScore: globalScore,
            formula: 'Global Score = Σ(ponderation * confidence * normalizedContribution), clamped to [0, 1]',
          },
          dataQualityImpact: dataQuality ? {
            qualityScore: dataQuality.qualityScore,
            completeness: dataQuality.completeness,
            staleness: dataQuality.staleness,
            missingFields: assumptions.missingRequiredFields,
            missingRelationships: assumptions.missingRelatedShards,
            impactOnScore: (dataQuality.qualityScore - 1.0) * 0.1, // Estimate impact
          } : undefined,
          trustLevelFactors: trustLevel ? [{
            factor: 'trust_level',
            value: trustLevel,
            impact: trustLevel === 'high' ? 'positive' : trustLevel === 'unreliable' ? 'negative' : 'neutral',
            weight: 0.2,
          }] : undefined,
        };

        // Build data lineage
        const dataLineage: DataLineage = {
          sourceSystems: [
            {
              system: 'shard_repository',
              syncTimestamp: new Date(),
              syncMethod: 'direct_query',
            },
          ],
          transformations: [
            {
              step: 'data_quality_validation',
              description: 'Validated opportunity data quality',
              timestamp: new Date(),
              inputFields: ['opportunity', 'relatedShards'],
              outputFields: ['qualityScore', 'completeness', 'staleness'],
            },
            {
              step: 'risk_detection',
              description: 'Detected risks using multiple methods',
              timestamp: new Date(),
              inputFields: ['opportunity', 'relatedShards', 'catalog'],
              outputFields: ['detectedRisks'],
            },
            {
              step: 'score_calculation',
              description: 'Calculated risk scores',
              timestamp: new Date(),
              inputFields: ['detectedRisks'],
              outputFields: ['globalScore', 'categoryScores'],
            },
          ],
          fieldProvenance: {
            riskScore: {
              source: 'calculated',
              transformation: 'weighted_sum',
              confidence: 0.9,
            },
            categoryScores: {
              source: 'calculated',
              transformation: 'category_aggregation',
              confidence: 0.9,
            },
          },
          qualityScores: dataQuality ? {
            overall: {
              score: dataQuality.qualityScore,
              timestamp: new Date(),
              method: 'data_quality_service',
            },
            completeness: {
              score: dataQuality.completeness,
              timestamp: new Date(),
              method: 'field_validation',
            },
          } : {},
        };

        // Log audit entry (non-blocking)
        this.comprehensiveAuditTrailService.logRiskEvaluation({
          traceId,
          parentTraceId: options?.parentTraceId,
          operation: 'risk_evaluation',
          tenantId,
          userId,
          inputData: {
            opportunityId,
            options: {
              includeHistorical: options?.includeHistorical,
              includeAI: options?.includeAI,
              includeSemanticDiscovery: options?.includeSemanticDiscovery,
            },
          },
          outputData: {
            riskScore: globalScore,
            categoryScores,
            riskCount: detectedRisks.length,
            revenueAtRisk,
            trustLevel,
            qualityScore,
          },
          assumptions,
          dataLineage,
          decisionTrail,
          durationMs: Date.now() - startTime,
          success: true,
          metadata: {
            opportunityId,
            relatedShardCount: relatedShards.length,
            catalogSize: catalog.length,
          },
        }).catch((auditError) => {
          // Log audit error but don't break main flow
          this.monitoring.trackException(auditError as Error, {
            operation: 'risk-evaluation.audit-logging',
            tenantId,
            opportunityId,
          });
        });
      }

      return evaluation;
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log audit entry for error case (non-blocking)
      if (this.comprehensiveAuditTrailService) {
        this.comprehensiveAuditTrailService.logRiskEvaluation({
          traceId,
          parentTraceId: options?.parentTraceId,
          operation: 'risk_evaluation',
          tenantId,
          userId,
          inputData: {
            opportunityId,
            options: {
              includeHistorical: options?.includeHistorical,
              includeAI: options?.includeAI,
              includeSemanticDiscovery: options?.includeSemanticDiscovery,
            },
          },
          durationMs,
          success: false,
          error: errorMessage,
          errorCode: error.code || 'EVALUATION_ERROR',
          metadata: {
            opportunityId,
          },
        }).catch((auditError) => {
          // Log audit error but don't break main flow
          this.monitoring.trackException(auditError as Error, {
            operation: 'risk-evaluation.audit-logging-error',
            tenantId,
            opportunityId,
          });
        });
      }

      this.monitoring.trackException(error, {
        operation: 'risk-evaluation.evaluateOpportunity',
        tenantId,
        opportunityId,
      });
      throw error;
    }
  }

  /**
   * Detect risks using rule-based, AI-powered, and historical pattern matching
   */
  /**
   * Resolve conflict using learned strategy
   */
  private async resolveConflict(
    tenantId: string,
    opportunity: Shard,
    method1: DetectionMethod,
    method2: DetectionMethod,
    existingConfidence: number,
    newConfidence: number,
    existingExplainability: Record<string, unknown>,
    newExplainability: Record<string, unknown>
  ): Promise<{
    resolutionMethod: 'manual' | 'highest_confidence' | 'rule_priority' | 'merged';
    resolution: string;
    finalConfidence: number;
    finalExplainability: Record<string, unknown>;
  }> {
    // Extract context from opportunity
    const opportunityData = opportunity.structuredData as any;
    const context = {
      industry: opportunityData?.industry,
      dealSize: opportunityData?.amount ? (opportunityData.amount < 50000 ? 'small' : opportunityData.amount < 500000 ? 'medium' : 'large') : undefined,
      stage: opportunityData?.stage,
      dealValue: opportunityData?.amount,
    };

    // Get learned resolution strategy if available
    let resolutionMethod: 'manual' | 'highest_confidence' | 'rule_priority' | 'merged' = 'highest_confidence';
    if (this.conflictResolutionLearning) {
      try {
        const learnedStrategy = await this.conflictResolutionLearning.getResolutionStrategy(
          tenantId,
          context,
          method1,
          method2
        );
        resolutionMethod = learnedStrategy as any;
      } catch (error) {
        this.monitoring.trackException(error as Error, {
          operation: 'resolveConflict.getStrategy',
          tenantId,
        });
        // Fallback to default
      }
    }

    // Apply resolution strategy
    let finalConfidence: number;
    let finalExplainability: any;
    let resolution: string;

    switch (resolutionMethod) {
      case 'highest_confidence':
        finalConfidence = Math.max(existingConfidence, newConfidence);
        finalExplainability = finalConfidence === existingConfidence ? existingExplainability : newExplainability;
        resolution = `Using higher confidence: ${finalConfidence.toFixed(2)}`;
        break;

      case 'rule_priority':
        // Rule-based methods have priority
        if (method1 === 'rule' || method2 === 'rule') {
          const ruleMethod = method1 === 'rule' ? method1 : method2;
          const otherMethod = method1 === 'rule' ? method2 : method1;
          finalConfidence = ruleMethod === method1 ? existingConfidence : newConfidence;
          finalExplainability = ruleMethod === method1 ? existingExplainability : newExplainability;
          resolution = `Rule-based method (${ruleMethod}) has priority over ${otherMethod}`;
        } else {
          // Neither is rule-based, fall back to highest confidence
          finalConfidence = Math.max(existingConfidence, newConfidence);
          finalExplainability = finalConfidence === existingConfidence ? existingExplainability : newExplainability;
          resolution = `Using higher confidence: ${finalConfidence.toFixed(2)}`;
        }
        break;

      case 'merged':
        // Merge explanations if both are structured
        if (this.riskExplainabilityService &&
            typeof existingExplainability !== 'string' &&
            typeof newExplainability !== 'string') {
          const merged = this.riskExplainabilityService.mergeExplanations([
            existingExplainability as RiskExplainability,
            newExplainability as RiskExplainability,
          ]);
          finalExplainability = merged;
          finalConfidence = Math.max(existingConfidence, newConfidence);
          resolution = `Merged explanations from ${method1} and ${method2}`;
        } else {
          // Fallback to highest confidence if can't merge
          finalConfidence = Math.max(existingConfidence, newConfidence);
          finalExplainability = finalConfidence === existingConfidence ? existingExplainability : newExplainability;
          resolution = `Using higher confidence: ${finalConfidence.toFixed(2)} (merge not available)`;
        }
        break;

      default:
        // Fallback to highest confidence
        finalConfidence = Math.max(existingConfidence, newConfidence);
        finalExplainability = finalConfidence === existingConfidence ? existingExplainability : newExplainability;
        resolution = `Using higher confidence: ${finalConfidence.toFixed(2)}`;
    }

    return {
      resolutionMethod,
      resolution,
      finalConfidence,
      finalExplainability,
    };
  }

  private async detectRisks(
    opportunity: Shard,
    relatedShards: Shard[],
    tenantId: string,
    userId: string,
    options: {
      includeHistorical?: boolean;
      includeAI?: boolean;
      includeSemanticDiscovery?: boolean;
      dataQuality?: DataQualityReport;
    },
    assumptions?: Partial<RiskEvaluationAssumptions>
  ): Promise<{
    risks: DetectedRisk[];
    detectionMethods: DetectionMethod[];
    matchedRules?: Array<{ riskId: string; ruleId: string; ruleType: string; matchedConditions: string[]; confidence: number }>;
    historicalPatterns?: Array<{ similarOpportunityId: string; similarityScore: number; outcome: 'won' | 'lost'; riskFactors: string[] }>;
    semanticMatches?: Array<{ shardId: string; shardType: string; similarityScore: number }>;
    aiReasoning?: string;
    aiConfidence?: number;
    conflicts?: Array<{ method1: DetectionMethod; method2: DetectionMethod; conflict: string; resolution: string; resolutionMethod: string }>;
  }> {
    const startTime = Date.now();
    const detectedRisks: DetectedRisk[] = [];
    const detectionMethods: DetectionMethod[] = [];
    const matchedRules: Array<{ riskId: string; ruleId: string; ruleType: string; matchedConditions: string[]; confidence: number }> = [];
    const historicalPatterns: Array<{ similarOpportunityId: string; similarityScore: number; outcome: 'won' | 'lost'; riskFactors: string[] }> = [];
    const semanticMatches: Array<{ shardId: string; shardType: string; similarityScore: number }> = [];
    let aiReasoning: string | undefined;
    let aiConfidence: number | undefined;
    const conflicts: Array<{ method1: DetectionMethod; method2: DetectionMethod; conflict: string; resolution: string; resolutionMethod: 'manual' | 'highest_confidence' | 'rule_priority' | 'merged' }> = [];

    try {
      // Get risk catalog (needed for detection)
      const opportunityData = opportunity.structuredData as any;
      const industryId = relatedShards.find(s => {
        const data = s.structuredData as any;
        return s.shardTypeId === (opportunity.shardTypeId) && data?.industry;
      })?.structuredData as any;
      
      const catalog = await this.riskCatalogService.getCatalog(
        tenantId,
        industryId?.industry
      );

      // 1. Rule-based detection (fast, deterministic)
      const ruleBasedRisks = await this.detectRisksByRules(
        opportunity,
        relatedShards,
        catalog,
        tenantId
      );
      detectedRisks.push(...ruleBasedRisks);
      if (ruleBasedRisks.length > 0) {
        detectionMethods.push('rule');
        // Extract matched rules from rule-based risks
        for (const risk of ruleBasedRisks) {
          if (typeof risk.explainability !== 'string' && risk.explainability.evidence.matchedRules) {
            matchedRules.push({
              riskId: risk.riskId,
              ruleId: risk.riskId, // Use riskId as ruleId for now
              ruleType: risk.explainability.detectionMethod,
              matchedConditions: risk.explainability.evidence.matchedRules,
              confidence: risk.confidence,
            });
          }
        }
        
        // Update assumptions: track that rule-based detection was used
        if (assumptions) {
          assumptions.serviceAvailability = assumptions.serviceAvailability || {
            groundingService: false,
            vectorSearch: false,
            historicalPatterns: false,
          };
          // Rule-based detection doesn't require external services, but mark that it was successful
          // This helps track which detection methods contributed to the evaluation
        }
      }

      // 2. Historical pattern matching (if enabled)
      if (options.includeHistorical && this.vectorSearchService) {
        const historicalRisks = await this.detectRisksByHistoricalPatterns(
          opportunity,
          catalog,
          tenantId,
          userId
        );
        if (historicalRisks.length > 0) {
          detectionMethods.push('historical');
          // Extract historical patterns from explainability
          for (const risk of historicalRisks) {
            if (typeof risk.explainability !== 'string' && risk.explainability.evidence.historicalPatterns) {
              historicalPatterns.push(...risk.explainability.evidence.historicalPatterns.map(p => ({
                similarOpportunityId: p.similarOpportunityId,
                similarityScore: p.similarityScore,
                outcome: p.outcome,
                riskFactors: [risk.riskId], // Use riskId as risk factor
              })));
            }
          }
          
          // Update assumptions: track historical pattern detection
          if (assumptions) {
            assumptions.serviceAvailability = assumptions.serviceAvailability || {
              groundingService: false,
              vectorSearch: false,
              historicalPatterns: false,
            };
            assumptions.serviceAvailability.historicalPatterns = true;
            assumptions.serviceAvailability.vectorSearch = true; // Historical patterns require vector search
          }
        } else if (options.includeHistorical && this.vectorSearchService) {
          // Historical detection was attempted but found no patterns
          if (assumptions) {
            assumptions.serviceAvailability = assumptions.serviceAvailability || {
              groundingService: false,
              vectorSearch: false,
              historicalPatterns: false,
            };
            assumptions.serviceAvailability.vectorSearch = true; // Service available but no patterns found
            assumptions.serviceAvailability.historicalPatterns = false; // No patterns found
          }
        }
        // Merge with existing risks (avoid duplicates)
        for (const historicalRisk of historicalRisks) {
          const existing = detectedRisks.find(r => r.riskId === historicalRisk.riskId);
          if (!existing) {
            detectedRisks.push(historicalRisk);
          } else {
            // Track conflict if confidence differs significantly
            if (Math.abs(existing.confidence - historicalRisk.confidence) > 0.2) {
              // Resolve conflict using learned strategy
              const resolution = await this.resolveConflict(
                tenantId,
                opportunity,
                'rule',
                'historical',
                existing.confidence,
                historicalRisk.confidence,
                existing.explainability,
                historicalRisk.explainability
              );

              conflicts.push({
                method1: 'rule',
                method2: 'historical',
                conflict: `Confidence mismatch: rule=${existing.confidence.toFixed(2)}, historical=${historicalRisk.confidence.toFixed(2)}`,
                resolution: resolution.resolution,
                resolutionMethod: resolution.resolutionMethod,
              });

              // Apply resolution
              existing.confidence = resolution.finalConfidence;
              existing.explainability = resolution.finalExplainability;
            } else {
              // No significant conflict, but still merge if possible
              if (this.riskExplainabilityService && 
                  typeof existing.explainability !== 'string' && 
                  typeof historicalRisk.explainability !== 'string') {
                const merged = this.riskExplainabilityService.mergeExplanations([
                  existing.explainability as RiskExplainability,
                  historicalRisk.explainability as RiskExplainability,
                ]);
                existing.explainability = merged;
                existing.confidence = Math.max(existing.confidence, historicalRisk.confidence);
              } else {
                // Fallback to string concatenation for backward compatibility
                if (historicalRisk.confidence > existing.confidence) {
                  existing.confidence = historicalRisk.confidence;
                  const histExplainability = typeof historicalRisk.explainability === 'string' 
                    ? historicalRisk.explainability 
                    : historicalRisk.explainability.reasoning.summary;
                  existing.explainability = `${existing.explainability}\n\nHistorical pattern: ${histExplainability}`;
                }
              }
            }
          }
        }
      }

      // 3. Semantic discovery and risk detection (if enabled and vector search available)
      let allRelatedShards = [...relatedShards];
      if (options.includeSemanticDiscovery !== false && this.vectorSearchService) {
        const semanticShards = await this.discoverRiskRelevantShards(
          opportunity,
          catalog,
          tenantId,
          userId
        );
        
        // Merge and deduplicate (prefer auto-linked if duplicate)
        const linkedIds = new Set(relatedShards.map(s => s.id));
        const uniqueSemantic = semanticShards.filter(s => !linkedIds.has(s.id));
        allRelatedShards = [...relatedShards, ...uniqueSemantic];

        // Detect risks from semantic shards using sophisticated NLP
        const semanticRisks = await this.detectRisksBySemantic(
          opportunity,
          semanticShards,
          catalog,
          tenantId
        );
        
        if (semanticRisks.length > 0) {
          detectionMethods.push('semantic');
          // Extract semantic matches from explainability
          for (const risk of semanticRisks) {
            if (typeof risk.explainability !== 'string' && risk.explainability.evidence.semanticMatches) {
              semanticMatches.push(...risk.explainability.evidence.semanticMatches);
            }
          }
          
          // Update assumptions: track semantic discovery
          if (assumptions) {
            assumptions.serviceAvailability = assumptions.serviceAvailability || {
              groundingService: false,
              vectorSearch: false,
              historicalPatterns: false,
            };
            assumptions.serviceAvailability.vectorSearch = true; // Semantic discovery requires vector search
            // Track that additional shards were discovered via semantic search
            if (uniqueSemantic.length > 0) {
              // Note: We could add a field to track semantic shards discovered, but for now
              // we track it via the service availability flag
            }
          }
        } else if (options.includeSemanticDiscovery !== false && this.vectorSearchService) {
          // Semantic discovery was attempted but found no matches
          if (assumptions) {
            assumptions.serviceAvailability = assumptions.serviceAvailability || {
              groundingService: false,
              vectorSearch: false,
              historicalPatterns: false,
            };
            assumptions.serviceAvailability.vectorSearch = true; // Service available but no semantic matches
          }
        }
        
        // Merge semantic risks using structured explainability
        for (const semanticRisk of semanticRisks) {
          const existing = detectedRisks.find(r => r.riskId === semanticRisk.riskId);
          if (!existing) {
            detectedRisks.push(semanticRisk);
          } else {
            // Track conflict if confidence differs significantly
            if (Math.abs(existing.confidence - semanticRisk.confidence) > 0.2) {
              conflicts.push({
                method1: detectionMethods[0] || 'rule',
                method2: 'semantic',
                conflict: `Confidence mismatch: existing=${existing.confidence.toFixed(2)}, semantic=${semanticRisk.confidence.toFixed(2)}`,
                resolution: `Using higher confidence: ${Math.max(existing.confidence, semanticRisk.confidence).toFixed(2)}`,
                resolutionMethod: 'highest_confidence' as const,
              });
            }
            // Merge explanations if both are structured
            if (this.riskExplainabilityService && 
                typeof existing.explainability !== 'string' && 
                typeof semanticRisk.explainability !== 'string') {
              const merged = this.riskExplainabilityService.mergeExplanations([
                existing.explainability as RiskExplainability,
                semanticRisk.explainability as RiskExplainability,
              ]);
              existing.explainability = merged;
              existing.confidence = Math.max(existing.confidence, semanticRisk.confidence);
            } else {
              // Fallback to string concatenation for backward compatibility
              if (semanticRisk.confidence > existing.confidence) {
                existing.confidence = semanticRisk.confidence;
                const semExplainability = typeof semanticRisk.explainability === 'string' 
                  ? semanticRisk.explainability 
                  : semanticRisk.explainability.reasoning.summary;
                existing.explainability = `${existing.explainability}\n\nSemantic match: ${semExplainability}`;
              }
            }
            // Merge source shards
            existing.sourceShards = Array.from(new Set([...existing.sourceShards, ...semanticRisk.sourceShards]));
          }
        }
      }

      // 4. AI-powered detection (if enabled) - now uses all shards (auto-linked + semantic)
      if (options.includeAI && this.insightService) {
        const aiResult = await this.detectRisksByAI(
          opportunity,
          allRelatedShards, // Use combined shards
          catalog,
          tenantId,
          userId,
          options.dataQuality,
          assumptions
        );
        const aiRisks = aiResult.risks;
        
        if (aiRisks.length > 0) {
          detectionMethods.push('ai');
          // Extract AI reasoning from explainability
          for (const risk of aiRisks) {
            if (typeof risk.explainability !== 'string') {
              if (risk.explainability.evidence.aiReasoning) {
                aiReasoning = risk.explainability.evidence.aiReasoning;
              }
              if (risk.explainability.confidence) {
                aiConfidence = risk.explainability.confidence;
              }
            }
          }
        }
        
        // Update assumptions with AI context info and service availability
        if (assumptions) {
          // Mark grounding service as available since AI detection ran successfully
          if (assumptions.serviceAvailability) {
            assumptions.serviceAvailability.groundingService = true;
          }
          
          if (aiResult.contextInfo) {
            assumptions.contextTokenCount = aiResult.contextInfo.tokenCount;
            assumptions.contextTruncated = aiResult.contextInfo.truncated;
            assumptions.aiModelVersion = aiResult.contextInfo.modelVersion;
          }
        }
        
        // Merge with existing risks using structured explainability
        for (const aiRisk of aiRisks) {
          const existing = detectedRisks.find(r => r.riskId === aiRisk.riskId);
          if (!existing) {
            detectedRisks.push(aiRisk);
          } else {
            // Track conflict if confidence differs significantly
            if (Math.abs(existing.confidence - aiRisk.confidence) > 0.2) {
              const existingMethod = detectionMethods.find(m => m !== 'ai') || 'rule';
              // Resolve conflict using learned strategy
              const resolution = await this.resolveConflict(
                tenantId,
                opportunity,
                existingMethod as DetectionMethod,
                'ai',
                existing.confidence,
                aiRisk.confidence,
                existing.explainability,
                aiRisk.explainability
              );

              conflicts.push({
                method1: existingMethod,
                method2: 'ai',
                conflict: `Confidence mismatch: existing=${existing.confidence.toFixed(2)}, ai=${aiRisk.confidence.toFixed(2)}`,
                resolution: resolution.resolution,
                resolutionMethod: resolution.resolutionMethod,
              });

              // Apply resolution
              existing.confidence = resolution.finalConfidence;
              existing.explainability = resolution.finalExplainability;
            } else {
              // No significant conflict, but still merge if possible
              if (this.riskExplainabilityService && 
                  typeof existing.explainability !== 'string' && 
                  typeof aiRisk.explainability !== 'string') {
                const merged = this.riskExplainabilityService.mergeExplanations([
                  existing.explainability as RiskExplainability,
                  aiRisk.explainability as RiskExplainability,
                ]);
                existing.explainability = merged;
                existing.confidence = Math.max(existing.confidence, aiRisk.confidence);
              } else {
                // Fallback to string concatenation for backward compatibility
                if (aiRisk.confidence > existing.confidence) {
                  existing.confidence = aiRisk.confidence;
                  const aiExplainability = typeof aiRisk.explainability === 'string' 
                    ? aiRisk.explainability 
                    : aiRisk.explainability.reasoning.summary;
                  existing.explainability = `${existing.explainability}\n\nAI analysis: ${aiExplainability}`;
                }
              }
            }
            // Merge source shards
            existing.sourceShards = Array.from(new Set([...existing.sourceShards, ...aiRisk.sourceShards]));
          }
        }
      }

      // Update assumptions with final detection method status before tracking
      if (assumptions) {
        // Track which detection methods were actually used
        const methodsUsed = Array.from(new Set(detectionMethods));
        assumptions.serviceAvailability = assumptions.serviceAvailability || {
          groundingService: false,
          vectorSearch: false,
          historicalPatterns: false,
        };
        
        // Ensure vector search availability is correctly reflected
        if (methodsUsed.includes('historical') || methodsUsed.includes('semantic')) {
          assumptions.serviceAvailability.vectorSearch = true;
        }
        
        // Log assumption completeness for monitoring
        const assumptionsComplete = 
          assumptions.dataCompleteness !== undefined &&
          assumptions.dataStaleness !== undefined &&
          assumptions.dataQualityScore !== undefined &&
          assumptions.serviceAvailability !== undefined;
        
        if (!assumptionsComplete) {
          this.monitoring.trackEvent('risk-evaluation.assumptions-incomplete', {
            tenantId,
            opportunityId: opportunity.id,
            missingFields: [
              assumptions.dataCompleteness === undefined ? 'dataCompleteness' : null,
              assumptions.dataStaleness === undefined ? 'dataStaleness' : null,
              assumptions.dataQualityScore === undefined ? 'dataQualityScore' : null,
              assumptions.serviceAvailability === undefined ? 'serviceAvailability' : null,
            ].filter(Boolean).join(','),
          });
        }
      }

      this.monitoring.trackEvent('risk-evaluation.risks-detected', {
        tenantId,
        opportunityId: opportunity.id,
        ruleBasedCount: ruleBasedRisks.length,
        historicalCount: options.includeHistorical ? detectedRisks.filter(r => !ruleBasedRisks.find(rb => rb.riskId === r.riskId)).length : 0,
        semanticCount: options.includeSemanticDiscovery !== false ? detectedRisks.filter(r => !ruleBasedRisks.find(rb => rb.riskId === r.riskId) && !detectedRisks.find(hr => hr.riskId === r.riskId && options.includeHistorical)).length : 0,
        aiCount: options.includeAI ? detectedRisks.filter(r => !ruleBasedRisks.find(rb => rb.riskId === r.riskId)).length : 0,
        autoLinkedShards: relatedShards.length,
        semanticShards: allRelatedShards.length - relatedShards.length,
        totalShards: allRelatedShards.length,
        totalCount: detectedRisks.length,
        durationMs: Date.now() - startTime,
        detectionMethods: Array.from(new Set(detectionMethods)).join(','),
        assumptionsTracked: !!assumptions,
        assumptionsComplete: assumptions ? (
          assumptions.dataCompleteness !== undefined &&
          assumptions.dataStaleness !== undefined &&
          assumptions.dataQualityScore !== undefined &&
          assumptions.serviceAvailability !== undefined
        ) : false,
      });

      return {
        risks: detectedRisks,
        detectionMethods: Array.from(new Set(detectionMethods)), // Remove duplicates
        matchedRules: matchedRules.length > 0 ? matchedRules : undefined,
        historicalPatterns: historicalPatterns.length > 0 ? historicalPatterns : undefined,
        semanticMatches: semanticMatches.length > 0 ? semanticMatches : undefined,
        aiReasoning,
        aiConfidence,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
      };
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'risk-evaluation.detectRisks',
        tenantId,
        opportunityId: opportunity.id,
      });
      // Return rule-based risks even if other methods fail
      return {
        risks: detectedRisks,
        detectionMethods: Array.from(new Set(detectionMethods)),
        matchedRules: matchedRules.length > 0 ? matchedRules : undefined,
        historicalPatterns: historicalPatterns.length > 0 ? historicalPatterns : undefined,
        semanticMatches: semanticMatches.length > 0 ? semanticMatches : undefined,
        aiReasoning,
        aiConfidence,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
      };
    }
  }

  /**
   * Rule-based risk detection (fast, deterministic)
   */
  private async detectRisksByRules(
    opportunity: Shard,
    relatedShards: Shard[],
    catalog: RiskCatalog[],
    tenantId: string
  ): Promise<DetectedRisk[]> {
    const risks: DetectedRisk[] = [];
    const opportunityData = opportunity.structuredData as any;

    for (const riskDef of catalog) {
      // Check if this risk applies to any of the related shard types
      const applicableShards = relatedShards.filter(s =>
        riskDef.sourceShardTypes.includes(s.shardTypeId)
      );

      if (applicableShards.length === 0) {
        continue;
      }

      // Evaluate detection rules
      const rule = riskDef.detectionRules;
      let matches = false;
      let confidence = 0.5; // Default confidence
      let explainability = '';
      const sourceShardIds: string[] = [];

      // Simple rule evaluation (can be enhanced)
      if (rule.type === 'attribute') {
        // Check opportunity attributes
        for (const condition of rule.conditions) {
          // Basic attribute matching (simplified)
          if (this.evaluateCondition(opportunityData, condition)) {
            matches = true;
            confidence = Math.max(confidence, 0.7);
            explainability = `Opportunity attribute matches risk condition: ${JSON.stringify(condition)}`;
          }
        }
      } else if (rule.type === 'relationship') {
        // Check related shards
        for (const shard of applicableShards) {
          const shardData = shard.structuredData as any;
          for (const condition of rule.conditions) {
            if (this.evaluateCondition(shardData, condition)) {
              matches = true;
              confidence = Math.max(confidence, 0.8);
              sourceShardIds.push(shard.id);
              explainability = `Related shard (${shard.id}) matches risk condition`;
            }
          }
        }
      }

      if (matches && confidence >= rule.confidenceThreshold) {
        // Get effective ponderation
        const ponderation = await this.riskCatalogService.getPonderation(
          riskDef.riskId,
          tenantId,
          undefined, // industryId - can be enhanced
          undefined // opportunityType - can be enhanced
        );

        // Generate structured explainability for rule-based detection
        let finalExplainability: RiskExplainability | string;
        if (this.riskExplainabilityService && matches) {
          const matchedRuleDescriptions = rule.conditions.map((c, i) => `Condition ${i + 1}`).join(', ');
          finalExplainability = this.riskExplainabilityService.generateRuleBasedExplanation(
            riskDef,
            [matchedRuleDescriptions],
            opportunityData,
            sourceShardIds.length > 0 ? sourceShardIds : applicableShards.map(s => s.id)
          );
        } else {
          // Fallback to string for backward compatibility
          finalExplainability = explainability || riskDef.explainabilityTemplate;
        }

        risks.push({
          riskId: riskDef.riskId,
          riskName: riskDef.name,
          category: riskDef.category,
          ponderation,
          confidence,
          contribution: ponderation * confidence, // Will be normalized in calculateRiskScore
          explainability: finalExplainability,
          sourceShards: sourceShardIds.length > 0 ? sourceShardIds : applicableShards.map(s => s.id),
          lifecycleState: 'identified',
        });
      }
    }

    return risks;
  }

  /**
   * Historical pattern-based risk detection
   */
  private async detectRisksByHistoricalPatterns(
    opportunity: Shard,
    catalog: RiskCatalog[],
    tenantId: string,
    userId: string
  ): Promise<DetectedRisk[]> {
    if (!this.vectorSearchService) {
      return [];
    }

    try {
      // Get historical patterns
      const patterns = await this.getHistoricalPatterns(opportunity, tenantId, userId);

      const risks: DetectedRisk[] = [];

      // Analyze patterns to detect risks
      for (const pattern of patterns) {
        if (pattern.outcome === 'lost') {
          // Find matching risk in catalog
          for (const riskFactor of pattern.riskFactors) {
            const riskDef = catalog.find(c => c.riskId === riskFactor);
            if (riskDef) {
              const ponderation = await this.riskCatalogService.getPonderation(
                riskDef.riskId,
                tenantId
              );

              const confidence = pattern.similarityScore * 0.8; // Scale by similarity
              
              // Generate structured explainability
              let explainability: RiskExplainability | string;
              if (this.riskExplainabilityService) {
                explainability = this.riskExplainabilityService.generateHistoricalExplanation(
                  [pattern],
                  riskDef
                );
              } else {
                // Fallback to string for backward compatibility
                explainability = `Similar opportunity (${pattern.similarOpportunityId}) was lost. Similarity: ${(pattern.similarityScore * 100).toFixed(1)}%`;
              }

              risks.push({
                riskId: riskDef.riskId,
                riskName: riskDef.name,
                category: riskDef.category,
                ponderation,
                confidence,
                contribution: ponderation * confidence,
                explainability,
                sourceShards: [pattern.similarOpportunityId],
                lifecycleState: 'identified',
              });
            }
          }
        }
      }

      return risks;
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'risk-evaluation.detectRisksByHistoricalPatterns',
        tenantId,
        opportunityId: opportunity.id,
      });
      return [];
    }
  }

  /**
   * AI-powered risk detection
   */
  private async detectRisksByAI(
    opportunity: Shard,
    relatedShards: Shard[],
    catalog: RiskCatalog[],
    tenantId: string,
    userId: string,
    dataQuality?: DataQualityReport,
    assumptions?: Partial<RiskEvaluationAssumptions>
  ): Promise<{ 
    risks: DetectedRisk[];
    contextInfo?: { tokenCount: number; truncated: boolean; modelVersion?: string };
  }> {
    if (!this.insightService) {
      return { risks: [] };
    }

    try {
      // Build context for AI analysis with all numerical data
      const opportunityData = opportunity.structuredData as any;
      
      // Calculate time-based metrics
      const now = new Date();
      const closeDate = opportunityData.closeDate || opportunityData.expectedCloseDate;
      const daysToClose = closeDate ? Math.ceil((new Date(closeDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
      const lastActivityAt = opportunityData.lastActivityAt;
      const daysSinceActivity = lastActivityAt ? Math.ceil((now.getTime() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24)) : null;
      
      // Get quota context if available (for owner-based quotas)
      let quotaContext: any = null;
      if (opportunityData.ownerId) {
        try {
          // Try to get active quota for this user (simplified - would need QuotaService injection)
          // For now, we'll include owner info so AI can consider quota pressure
          quotaContext = {
            ownerId: opportunityData.ownerId,
            note: 'Quota information would be included if QuotaService is available',
          };
        } catch (error) {
          // Quota service not available - continue without it
        }
      }
      
      const context = {
        opportunity: {
          name: opportunityData.name,
          stage: opportunityData.stage,
          value: opportunityData.value,
          currency: opportunityData.currency || 'USD',
          probability: opportunityData.probability,
          expectedRevenue: opportunityData.expectedRevenue,
          closeDate,
          expectedCloseDate: opportunityData.expectedCloseDate,
          daysToClose,
          daysSinceActivity,
          lastActivityAt,
          description: opportunityData.description,
          ownerId: opportunityData.ownerId,
          accountId: opportunityData.accountId,
        },
        quota: quotaContext,
        relatedShards: relatedShards.map(s => ({
          type: s.shardTypeId,
          data: s.structuredData,
        })),
        numericalMetrics: {
          dealValue: opportunityData.value || 0,
          expectedRevenue: opportunityData.expectedRevenue || opportunityData.value || 0,
          probability: opportunityData.probability || 0,
          daysToClose,
          daysSinceActivity,
        },
      };

      // Use InsightService to analyze for risks with comprehensive prompt
      const riskCategories = catalog.map(c => c.category).join(', ');
      const insightRequest = {
        tenantId,
        userId,
        query: `Analyze this opportunity for potential risks. 

Key numerical data to consider:
- Deal Value: ${opportunityData.value || 0} ${opportunityData.currency || 'USD'}
- Expected Revenue: ${opportunityData.expectedRevenue || opportunityData.value || 0} ${opportunityData.currency || 'USD'}
- Win Probability: ${opportunityData.probability || 0}%
- Days to Close: ${daysToClose !== null ? daysToClose : 'unknown'}
- Days Since Last Activity: ${daysSinceActivity !== null ? daysSinceActivity : 'unknown'}

Consider:
1. Financial risks: deal value vs expected revenue, probability trends
2. Timeline risks: close date proximity, activity gaps
3. Stage risks: current stage progression, stagnation indicators
4. Related entity risks: account health, stakeholder changes
5. Historical patterns: similar opportunities that were lost

Identify specific risks from these categories: ${riskCategories}

For each risk identified, provide:
- Risk ID (from catalog if matching)
- Risk category
- Confidence level (0-1)
- Explanation with specific numerical evidence
- Recommended mitigation actions`,
        scope: {
          shardId: opportunity.id,
        },
        options: {
          format: 'structured' as const,
          includeReasoning: true,
        },
      };

      const response = await this.insightService.generate(
        tenantId,
        userId,
        insightRequest
      );

      // Parse AI response to extract risks
      const risks: DetectedRisk[] = [];
      
      // Check if response is InsightResponse (not ModelUnavailableResponse)
      if ('success' in response && !response.success) {
        // ModelUnavailableResponse - skip AI processing
        return { risks };
      }
      
      const insightResponse = response as InsightResponse;
      
      try {
        // Try to parse structured JSON response
        let parsedContent: any = null;
        let parsingError: Error | null = null;
        let parsingMethod: 'direct_json' | 'markdown_json' | 'regex_fallback' | 'failed' = 'failed';
        
        if (insightResponse.format === 'structured' && insightResponse.content) {
            try {
              // Try parsing as JSON first (most reliable)
              parsedContent = JSON.parse(insightResponse.content);
              parsingMethod = 'direct_json';
            } catch (parseError) {
              parsingError = parseError instanceof Error ? parseError : new Error(String(parseError));
              // If not JSON, try to extract JSON from markdown code blocks
              const jsonMatch = insightResponse.content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
            if (jsonMatch && jsonMatch[1]) {
              try {
                parsedContent = JSON.parse(jsonMatch[1]);
                parsingError = null; // Successfully parsed from markdown
                parsingMethod = 'markdown_json';
              } catch (extractError) {
                // If extraction also fails, log the error
                parsingError = extractError instanceof Error ? extractError : new Error(String(extractError));
                this.monitoring.trackException(parsingError, {
                  operation: 'risk-evaluation.parseStructuredContent',
                  tenantId,
                  opportunityId: opportunity.id,
                  contentPreview: insightResponse.content.substring(0, 200),
                });
              }
            } else {
              // No JSON found in content - will fall back to regex extraction later
              parsingMethod = 'regex_fallback';
              this.monitoring.trackException(parsingError, {
                operation: 'risk-evaluation.parseStructuredContent',
                tenantId,
                opportunityId: opportunity.id,
                reason: 'No JSON found in response, will attempt regex fallback',
                contentPreview: insightResponse.content.substring(0, 200),
              });
            }
          }
        }

        // If parsing failed completely, log and return empty risks with error context
        if (!parsedContent && parsingError) {
          this.monitoring.trackEvent('risk-evaluation.parsing-failed', {
            tenantId,
            opportunityId: opportunity.id,
            error: parsingError.message,
            hasContent: !!insightResponse.content,
            contentLength: insightResponse.content?.length || 0,
          });
          // Return empty risks array - parsing failed
          return { risks, contextInfo: (insightResponse as any).contextInfo };
        }

        // Extract risks from parsed content with validation
        if (parsedContent && Array.isArray(parsedContent.risks)) {
          // Validate that parsedContent.risks is actually an array
          if (!Array.isArray(parsedContent.risks)) {
            this.monitoring.trackEvent('risk-evaluation.parsing-failed', {
              tenantId,
              opportunityId: opportunity.id,
              error: 'parsedContent.risks is not an array',
              parsedContentType: typeof parsedContent.risks,
            });
            return { risks, contextInfo: (insightResponse as any).contextInfo };
          }

          for (const riskData of parsedContent.risks) {
            // Basic validation: ensure riskData is an object
            if (!riskData || typeof riskData !== 'object') {
              this.monitoring.trackEvent('risk-evaluation.invalid-risk-skipped', {
                tenantId,
                opportunityId: opportunity.id,
                reason: 'riskData is not an object',
                riskDataType: typeof riskData,
              });
              continue;
            }

            // Validate that risk has required fields for catalog matching
            if (!riskData.riskId && !riskData.riskName) {
              this.monitoring.trackEvent('risk-evaluation.invalid-risk-skipped', {
                tenantId,
                opportunityId: opportunity.id,
                reason: 'Missing riskId and riskName',
                riskData: JSON.stringify(riskData).substring(0, 200),
              });
              continue; // Skip risk without required identifiers
            }

            // Validate risk using multi-stage validation pipeline
            // Always attempt validation if service is available, but don't block if unavailable
            let validationPassed = true;
            let validationWarnings: string[] = [];

            if (this.riskAIValidationService && dataQuality) {
              try {
                const validation = this.riskAIValidationService.validateRisk(
                  riskData,
                  catalog,
                  dataQuality,
                  opportunity
                );

                if (!validation.valid) {
                  // Log and skip invalid risk
                  this.monitoring.trackEvent('risk-evaluation.invalid-risk-rejected', {
                    tenantId,
                    opportunityId: opportunity.id,
                    stage: validation.stage,
                    error: validation.error,
                    riskData: JSON.stringify(riskData).substring(0, 200),
                  });
                  validationPassed = false;
                } else {
                  // Collect warnings if any
                  if (validation.warnings && validation.warnings.length > 0) {
                    validationWarnings = validation.warnings;
                    this.monitoring.trackEvent('risk-evaluation.risk-validation-warnings', {
                      tenantId,
                      opportunityId: opportunity.id,
                      warnings: validation.warnings.join('; '),
                    });
                  }
                }
              } catch (validationError) {
                // Log validation service error but don't block risk processing
                this.monitoring.trackException(validationError instanceof Error ? validationError : new Error(String(validationError)), {
                  operation: 'risk-evaluation.validateRisk',
                  tenantId,
                  opportunityId: opportunity.id,
                });
                // Continue with risk processing but with lower confidence
                validationWarnings.push('Validation service error - using reduced confidence');
              }
            } else {
              // If validation service unavailable, log warning but continue
              if (!this.riskAIValidationService) {
                this.monitoring.trackEvent('risk-evaluation.validation-service-unavailable', {
                  tenantId,
                  opportunityId: opportunity.id,
                  reason: 'riskAIValidationService not initialized',
                });
              }
              if (!dataQuality) {
                this.monitoring.trackEvent('risk-evaluation.data-quality-unavailable', {
                  tenantId,
                  opportunityId: opportunity.id,
                  reason: 'dataQuality not provided',
                });
              }
            }

            // Skip risk if validation explicitly failed
            if (!validationPassed) {
              continue;
            }

            // Find matching risk in catalog with strict validation
            const riskDef = catalog.find(c => 
              c.riskId === riskData.riskId || 
              c.name.toLowerCase() === riskData.riskName?.toLowerCase()
            );

            if (!riskDef) {
              // Log risk not found in catalog with full context
              this.monitoring.trackEvent('risk-evaluation.risk-not-in-catalog', {
                tenantId,
                opportunityId: opportunity.id,
                riskId: riskData.riskId,
                riskName: riskData.riskName,
                reason: 'Risk not found in catalog',
                catalogSize: catalog.length,
                availableRiskIds: catalog.slice(0, 5).map(c => c.riskId), // Sample for debugging
              });
              continue; // Skip risks not in catalog - ensures only validated risks are included
            }

            // Validate that parsed risk matches catalog definition structure
            // Check that category matches if provided
            if (riskData.category && riskData.category !== riskDef.category) {
              this.monitoring.trackEvent('risk-evaluation.category-mismatch', {
                tenantId,
                opportunityId: opportunity.id,
                riskId: riskDef.riskId,
                parsedCategory: riskData.category,
                catalogCategory: riskDef.category,
              });
              // Use catalog category (authoritative source)
            }

            if (riskDef) {
              const ponderation = await this.riskCatalogService.getPonderation(
                riskDef.riskId,
                tenantId
              );

              // Calibrate confidence based on parsing success, validation, and parsing method
              let baseConfidence = Math.min(Math.max(riskData.confidence || 0.5, 0), 1);
              
              // Adjust confidence based on parsing method reliability
              // Direct JSON parsing is most reliable, markdown extraction is less reliable
              if (parsingMethod === 'markdown_json') {
                baseConfidence = Math.max(baseConfidence - 0.05, 0.1); // Reduce by 0.05 for markdown extraction
              } else if (parsingMethod === 'regex_fallback') {
                baseConfidence = Math.max(baseConfidence - 0.15, 0.1); // Reduce by 0.15 for regex fallback
              }
              
              // Reduce confidence if validation had warnings (from validation above)
              if (validationWarnings.length > 0) {
                baseConfidence = Math.max(baseConfidence - 0.1, 0.1); // Reduce by 0.1, minimum 0.1
              }
              
              // Reduce confidence if risk was matched by name only (not by ID)
              const matchedById = riskDef.riskId === riskData.riskId;
              if (!matchedById && riskData.riskName) {
                baseConfidence = Math.max(baseConfidence - 0.05, 0.1); // Reduce by 0.05 for name-only match
              }
              
              // Track confidence calibration for audit trail
              this.monitoring.trackEvent('risk-evaluation.confidence-calibrated', {
                tenantId,
                opportunityId: opportunity.id,
                riskId: riskDef.riskId,
                originalConfidence: riskData.confidence || 0.5,
                finalConfidence: baseConfidence,
                parsingMethod,
                matchedById,
                validationWarnings: validationWarnings.length,
              });
              
              const confidence = baseConfidence;
              
              // Generate structured explainability
              let explainability: RiskExplainability | string;
              if (this.riskExplainabilityService) {
                explainability = this.riskExplainabilityService.generateAIExplanation(
                  riskData.explanation || riskData.explainability || riskDef.explainabilityTemplate,
                  confidence,
                  [opportunity.id, ...relatedShards.map(s => s.id)],
                  riskDef
                );
              } else {
                // Fallback to string for backward compatibility
                explainability = riskData.explanation || riskData.explainability || riskDef.explainabilityTemplate;
              }

              risks.push({
                riskId: riskDef.riskId,
                riskName: riskDef.name,
                category: riskDef.category,
                ponderation,
                confidence,
                contribution: ponderation * confidence,
                explainability,
                sourceShards: [opportunity.id, ...relatedShards.map(s => s.id)],
                lifecycleState: 'identified',
              });
            }
          }
        } else if (insightResponse.content) {
          // Fallback: Try to extract risks from natural language response
          // Look for risk mentions in the content
          const riskMentions = this.extractRisksFromText(insightResponse.content, catalog);
          for (const mention of riskMentions) {
            const ponderation = await this.riskCatalogService.getPonderation(
              mention.riskId,
              tenantId
            );

            risks.push({
              riskId: mention.riskId,
              riskName: mention.riskName,
              category: mention.category as RiskCategory,
              ponderation,
              confidence: mention.confidence,
              contribution: ponderation * mention.confidence,
              explainability: mention.explanation || mention.riskDef.explainabilityTemplate,
              sourceShards: [opportunity.id],
              lifecycleState: 'identified',
            });
          }
        }
      } catch (parseError: any) {
        // Log parsing error with full context
        this.monitoring.trackException(parseError instanceof Error ? parseError : new Error(String(parseError)), {
          operation: 'risk-evaluation.parseAIResponse',
          tenantId,
          opportunityId: opportunity.id,
          hasContent: !!insightResponse.content,
          contentLength: insightResponse.content?.length || 0,
          format: insightResponse.format,
        });
      }

      // Track context info from response metadata if available
      const contextInfo = (insightResponse as any).metadata?.contextQuality ? {
        tokenCount: (insightResponse as any).metadata.contextQuality.totalTokens || 0,
        truncated: (insightResponse as any).metadata.contextQuality.truncated || false,
        modelVersion: (insightResponse as any).metadata?.modelVersion,
      } : undefined;

      return { risks, contextInfo };
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'risk-evaluation.detectRisksByAI',
        tenantId,
        opportunityId: opportunity.id,
      });
      return { risks: [] };
    }
  }

  /**
   * Extract risks from natural language text (fallback parser)
   */
  private extractRisksFromText(text: string, catalog: RiskCatalog[]): Array<{
    riskId: string;
    riskName: string;
    category: string;
    confidence: number;
    explanation: string;
    riskDef: RiskCatalog;
  }> {
    const extracted: Array<{
      riskId: string;
      riskName: string;
      category: string;
      confidence: number;
      explanation: string;
      riskDef: RiskCatalog;
    }> = [];

    const textLower = text.toLowerCase();

    // Look for risk mentions by name or category
    for (const riskDef of catalog) {
      const riskNameLower = riskDef.name.toLowerCase();
      const categoryLower = riskDef.category.toLowerCase();

      // Check if risk name or category is mentioned
      if (textLower.includes(riskNameLower) || textLower.includes(categoryLower)) {
        // Try to extract confidence from context (look for percentages or "high/medium/low")
        let confidence = 0.5; // Default
        const riskIndex = Math.max(
          textLower.indexOf(riskNameLower),
          textLower.indexOf(categoryLower)
        );
        const riskContext = textLower.substring(
          Math.max(0, riskIndex - 50),
          Math.min(textLower.length, riskIndex + Math.max(riskNameLower.length, categoryLower.length) + 200)
        );

        if (riskContext.includes('high') || riskContext.includes('significant') || riskContext.includes('critical')) {
          confidence = 0.8;
        } else if (riskContext.includes('medium') || riskContext.includes('moderate')) {
          confidence = 0.5;
        } else if (riskContext.includes('low') || riskContext.includes('minor')) {
          confidence = 0.3;
        }

        // Extract percentage if mentioned
        const percentMatch = riskContext.match(/(\d+)%/);
        if (percentMatch) {
          confidence = Math.min(Math.max(parseInt(percentMatch[1]) / 100, 0), 1);
        }

        extracted.push({
          riskId: riskDef.riskId,
          riskName: riskDef.name,
          category: riskDef.category,
          confidence,
          explanation: `AI detected ${riskDef.name} risk: ${typeof text === 'string' && text.length > 0 ? text.substring(0, 200) : 'N/A'}`,
          riskDef,
        });
      }
    }

    return extracted;
  }

  /**
   * Get historical patterns for similar opportunities
   */
  async getHistoricalPatterns(
    opportunity: Shard,
    tenantId: string,
    userId?: string
  ): Promise<HistoricalPattern[]> {
    if (!this.vectorSearchService) {
      return [];
    }

    try {
      // Build query from opportunity
      const opportunityData = opportunity.structuredData as any;
      const queryText = `${opportunityData.name || ''} ${opportunityData.description || ''}`;

      // Search for similar opportunities using semantic search
      const searchResponse = await this.vectorSearchService.semanticSearch(
        {
          query: queryText,
          filter: {
            tenantId,
            shardTypeId: opportunity.shardTypeId,
          },
          topK: 20,
        },
        userId || 'system' // Use system user if not provided
      );

      // Analyze results to build patterns
      const patterns: HistoricalPattern[] = [];

      for (const result of searchResponse.results.slice(0, 10)) {
        const similarShard = await this.shardRepository.findById(result.shard.id, tenantId);
        if (!similarShard) {continue;}

        const similarData = similarShard.structuredData as Record<string, unknown>;
        const outcome = similarData.stage === 'closed_won' ? 'won' : 
                       similarData.stage === 'closed_lost' ? 'lost' : null;

        if (outcome) {
          // Extract risk factors from similar opportunity's risk evaluation if available
          const similarRiskEval = similarData.riskEvaluation as { risks?: Array<{ riskId: string }> } | undefined;
          const riskFactors = similarRiskEval?.risks?.map((r) => r.riskId) || [];

          // Calculate average closing time from creation date to close date
          let avgClosingTime = 0;
          const closeDate = similarData.closeDate as string | Date | undefined;
          const createdDate = similarShard.createdAt || (similarData.createdDate as string | Date | undefined);
          
          if (closeDate && createdDate) {
            try {
              const closeDateObj = closeDate instanceof Date ? closeDate : new Date(closeDate);
              const createdDateObj = createdDate instanceof Date ? createdDate : new Date(createdDate);
              
              if (!isNaN(closeDateObj.getTime()) && !isNaN(createdDateObj.getTime())) {
                const daysDiff = Math.ceil(
                  (closeDateObj.getTime() - createdDateObj.getTime()) / (1000 * 60 * 60 * 24)
                );
                // Only use positive values (close date after creation)
                if (daysDiff > 0) {
                  avgClosingTime = daysDiff;
                }
              }
            } catch (dateError) {
              // If date parsing fails, log but don't break the flow
              this.monitoring.trackException(
                dateError instanceof Error ? dateError : new Error(String(dateError)),
                {
                  operation: 'risk-evaluation.calculateClosingTime',
                  tenantId,
                  opportunityId: similarShard.id,
                }
              );
            }
          }

          patterns.push({
            similarOpportunityId: similarShard.id,
            similarityScore: result.score || 0.5,
            outcome,
            riskFactors,
            winRate: outcome === 'won' ? 1 : 0,
            avgClosingTime,
          });
        }
      }

      return patterns;
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'risk-evaluation.getHistoricalPatterns',
        tenantId,
        opportunityId: opportunity.id,
      });
      return [];
    }
  }

  /**
   * Calculate aggregate risk score from detected risks
   * Returns both global score and category scores
   * Public method for use by other services (e.g., SimulationService)
   */
  /**
   * Get weights for opportunity context (adaptive or default)
   */
  private async getWeightsForOpportunity(
    tenantId: string,
    context: { industry?: string; dealSize?: string; stage?: string; dealValue?: number }
  ): Promise<{ ml: number; rules: number; llm: number; historical: number }> {
    // If adaptive weight service not available, use defaults
    if (!this.adaptiveWeightService) {
      return this.DEFAULT_WEIGHTS;
    }

    try {
      // Generate context key
      const contextKey = this.generateContextKey(context);

      // Get learned weights
      const learned = await this.adaptiveWeightService.getWeights(
        tenantId,
        contextKey,
        'risk'
      );

      return {
        ml: learned.ml || this.DEFAULT_WEIGHTS.ml,
        rules: learned.rules || this.DEFAULT_WEIGHTS.rules,
        llm: learned.llm || this.DEFAULT_WEIGHTS.llm,
        historical: learned.historical || this.DEFAULT_WEIGHTS.historical,
      };
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'risk-evaluation.getWeightsForOpportunity',
        tenantId,
      });
      return this.DEFAULT_WEIGHTS;
    }
  }

  /**
   * Generate context key for risk evaluation
   */
  private generateContextKey(context: { industry?: string; dealSize?: string; stage?: string; dealValue?: number }): string {
    const parts: string[] = [];
    if (context.industry) parts.push(context.industry);
    if (context.dealSize) {
      parts.push(context.dealSize);
    } else if (context.dealValue !== undefined) {
      parts.push(context.dealValue < 50000 ? 'small' : context.dealValue < 500000 ? 'medium' : 'large');
    }
    if (context.stage) parts.push(context.stage);
    return parts.join(':') || 'all';
  }

  /**
   * Track prediction for adaptive learning
   */
  private async trackPredictionForLearning(
    tenantId: string,
    opportunity: Shard,
    evaluation: RiskEvaluation,
    detectedRisks: DetectedRisk[]
  ): Promise<void> {
    if (!this.outcomeCollector) {
      return; // Service not available
    }

    try {
      const opportunityData = opportunity.structuredData as any;
      const context = {
        industry: opportunityData?.industry,
        dealSize: opportunityData?.amount
          ? opportunityData.amount < 50000
            ? 'small'
            : opportunityData.amount < 500000
            ? 'medium'
            : 'large'
          : undefined,
        stage: opportunityData?.stage,
        dealValue: opportunityData?.amount,
      };

      // Extract component scores from detection methods
      const componentScores: Record<string, number> = {};
      for (const risk of detectedRisks) {
        const method = typeof risk.explainability !== 'string'
          ? risk.explainability.detectionMethod
          : 'rule';
        
        if (!componentScores[method]) {
          componentScores[method] = 0;
        }
        componentScores[method] = Math.max(componentScores[method], risk.confidence);
      }

      // Get weights used (if adaptive weight service available)
      const weights = this.adaptiveWeightService
        ? await this.getWeightsForOpportunity(tenantId, context)
        : this.DEFAULT_WEIGHTS;

      await this.outcomeCollector.recordPrediction(
        tenantId,
        'risk',
        context,
        evaluation,
        componentScores,
        weights
      );
    } catch (error) {
      // Non-blocking, don't throw
      this.monitoring.trackException(error as Error, {
        operation: 'trackPredictionForLearning',
        tenantId,
      });
    }
  }

  /**
   * Record outcome when opportunity status changes
   */
  /**
   * Record conflict resolution outcome for learning
   */
  async recordConflictResolutionOutcome(
    tenantId: string,
    opportunity: Shard,
    method1: DetectionMethod,
    method2: DetectionMethod,
    strategy: 'highest_confidence' | 'rule_priority' | 'merged',
    outcome: number // 0-1: success/failure or performance metric
  ): Promise<void> {
    if (!this.conflictResolutionLearning) {
      return; // Service not available
    }

    try {
      const opportunityData = opportunity.structuredData as any;
      const context = {
        industry: opportunityData?.industry,
        dealSize: opportunityData?.amount ? (opportunityData.amount < 50000 ? 'small' : opportunityData.amount < 500000 ? 'medium' : 'large') : undefined,
        stage: opportunityData?.stage,
        dealValue: opportunityData?.amount,
      };

      await this.conflictResolutionLearning.learnFromResolution(
        tenantId,
        context,
        method1,
        method2,
        strategy,
        outcome
      );
    } catch (error) {
      this.monitoring.trackException(error as Error, {
        operation: 'recordConflictResolutionOutcome',
        tenantId,
      });
      // Don't throw - learning is non-critical
    }
  }

  async onOpportunityOutcome(
    tenantId: string,
    opportunityId: string,
    outcome: 'won' | 'lost' | 'cancelled'
  ): Promise<void> {
    if (!this.outcomeCollector) {
      return;
    }

    try {
      // Get evaluation to find prediction ID
      const evaluation = this.evaluationCache.get(`${tenantId}:${opportunityId}`)?.evaluation;
      if (!evaluation) {
        return; // No evaluation found
      }

      const outcomeValue = outcome === 'won' ? 1.0 : outcome === 'lost' ? 0.0 : 0.3;
      const outcomeType = outcome === 'won' ? 'success' : outcome === 'lost' ? 'failure' : 'partial';

      // Use opportunityId as prediction ID since each opportunity has one active evaluation
      // The evaluation is uniquely identified by the combination of tenantId and opportunityId
      const predictionId = opportunityId;

      await this.outcomeCollector.recordOutcome(
        predictionId,
        tenantId,
        outcomeValue,
        outcomeType
      );

      // Trigger learning update if adaptive weight service available
      if (this.adaptiveWeightService) {
        const opportunity = await this.shardRepository.findById(opportunityId, tenantId);
        if (opportunity) {
          const opportunityData = opportunity.structuredData as any;
          const context = {
            industry: opportunityData?.industry,
            dealSize: opportunityData?.amount
              ? opportunityData.amount < 50000
                ? 'small'
                : opportunityData.amount < 500000
                ? 'medium'
                : 'large'
              : undefined,
            stage: opportunityData?.stage,
            dealValue: opportunityData?.amount,
          };
          const contextKey = this.generateContextKey(context);

          // Learn from each component
          // TODO: Determine which component was most relevant
          await this.adaptiveWeightService.learnFromOutcome(
            tenantId,
            contextKey,
            'risk',
            'rules', // Simplified - would determine actual component
            outcomeValue
          );
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

  async calculateRiskScore(
    risks: DetectedRisk[],
    tenantId: string,
    opportunity: Shard
  ): Promise<{
    globalScore: number;
    categoryScores: Record<RiskCategory, number>;
  }> {
    if (risks.length === 0) {
      return {
        globalScore: 0,
        categoryScores: {
          Commercial: 0,
          Technical: 0,
          Legal: 0,
          Financial: 0,
          Competitive: 0,
          Operational: 0,
        },
      };
    }

    // Get adaptive weights for detection methods
    const opportunityData = opportunity.structuredData as any;
    const context = {
      industry: opportunityData?.industry,
      dealSize: opportunityData?.amount ? (opportunityData.amount < 50000 ? 'small' : opportunityData.amount < 500000 ? 'medium' : 'large') : undefined,
      stage: opportunityData?.stage,
      dealValue: opportunityData?.amount,
    };
    const weights = await this.getWeightsForOpportunity(tenantId, context);

    // Apply learned weights to confidence scores based on detection method
    const weightedRisks = risks.map(risk => {
      const detectionMethod = typeof risk.explainability !== 'string' 
        ? risk.explainability.detectionMethod 
        : 'rule'; // Default to rule if not specified
      
      // Map detection method to weight component
      let methodWeight = 1.0; // Default weight
      if (detectionMethod === 'rule') {
        methodWeight = weights.rules;
      } else if (detectionMethod === 'ai') {
        methodWeight = weights.llm;
      } else if (detectionMethod === 'historical') {
        methodWeight = weights.historical;
      } else if (detectionMethod === 'semantic') {
        // Use ML weight for semantic (vector-based)
        methodWeight = weights.ml;
      }

      // Apply weight to confidence
      const weightedConfidence = risk.confidence * methodWeight;

      return {
        ...risk,
        confidence: weightedConfidence,
      };
    });

    // Calculate global score with weighted risks
    const totalContribution = weightedRisks.reduce((sum, risk) => sum + risk.contribution, 0);
    const normalizedRisks = weightedRisks.map(risk => ({
      ...risk,
      contribution: risk.contribution / Math.max(totalContribution, 1),
    }));

    const globalScore = normalizedRisks.reduce((sum, risk) => {
      return sum + (risk.ponderation * risk.confidence * risk.contribution);
    }, 0);

    // Calculate category scores
    const categoryScores = await this.calculateCategoryScores(risks);

    return {
      globalScore: Math.min(Math.max(globalScore, 0), 1),
      categoryScores,
    };
  }

  /**
   * Calculate risk scores per category
   */
  private async calculateCategoryScores(
    risks: DetectedRisk[]
  ): Promise<Record<RiskCategory, number>> {
    const categoryRisks = new Map<RiskCategory, DetectedRisk[]>();

    // Group risks by category
    for (const risk of risks) {
      if (!categoryRisks.has(risk.category)) {
        categoryRisks.set(risk.category, []);
      }
      categoryRisks.get(risk.category)!.push(risk);
    }

    // Initialize all categories to 0
    const categoryScores: Record<RiskCategory, number> = {
      Commercial: 0,
      Technical: 0,
      Legal: 0,
      Financial: 0,
      Competitive: 0,
      Operational: 0,
    };

    // Calculate score per category
    for (const [category, categoryRiskList] of categoryRisks) {
      if (categoryRiskList.length === 0) {continue;}

      // Normalize contributions within category
      const totalContribution = categoryRiskList.reduce(
        (sum, r) => sum + r.contribution,
        0
      );
      const normalized = categoryRiskList.map(r => ({
        ...r,
        contribution: r.contribution / Math.max(totalContribution, 1),
      }));

      // Calculate category score: Σ(ponderation * confidence * normalizedContribution)
      const categoryScore = normalized.reduce((sum, risk) => {
        return sum + (risk.ponderation * risk.confidence * risk.contribution);
      }, 0);

      categoryScores[category] = Math.min(Math.max(categoryScore, 0), 1);
    }

    return categoryScores;
  }

  /**
   * Calculate revenue at risk (basic calculation)
   */
  private calculateRevenueAtRisk(opportunity: Shard, riskScore: number): number {
    // Validate inputs
    if (!opportunity || !opportunity.structuredData || typeof riskScore !== 'number' || !isFinite(riskScore)) {
      return 0;
    }

    const opportunityData = opportunity.structuredData as any;
    const dealValue = typeof opportunityData?.value === 'number' && isFinite(opportunityData.value) 
      ? opportunityData.value 
      : 0;
    const probability = typeof opportunityData?.probability === 'number' && isFinite(opportunityData.probability)
      ? Math.max(0, Math.min(100, opportunityData.probability)) / 100
      : 0.5; // Default 50%

    // Validate riskScore is between 0 and 1
    const safeRiskScore = Math.max(0, Math.min(1, riskScore));

    // Revenue at risk = dealValue * probability * riskScore
    // This represents the portion of expected revenue that's at risk
    const result = dealValue * probability * safeRiskScore;
    
    // Ensure result is finite
    return isFinite(result) ? result : 0;
  }

  /**
   * Evaluate a condition against data (simplified)
   */
  private evaluateCondition(data: any, condition: any): boolean {
    // Simplified condition evaluation
    // TODO: Implement proper condition evaluation engine
    if (typeof condition === 'object' && condition.field && condition.operator) {
      const value = this.getNestedValue(data, condition.field);
      const conditionValue = condition.value;
      
      // Handle null/undefined values safely
      if (value === null || value === undefined) {
        if (condition.operator === 'is_null' || condition.operator === 'not_exists') {
          return true;
        }
        if (condition.operator === 'is_not_null' || condition.operator === 'exists') {
          return false;
        }
        // For other operators, null/undefined comparisons return false
        return false;
      }
      
      switch (condition.operator) {
        case 'equals':
          return value === conditionValue;
        case 'not_equals':
          return value !== conditionValue;
        case 'greater_than':
          return typeof value === 'number' && typeof conditionValue === 'number' && value > conditionValue;
        case 'less_than':
          return typeof value === 'number' && typeof conditionValue === 'number' && value < conditionValue;
        case 'contains':
          return typeof value === 'string' && String(value).includes(String(conditionValue));
        case 'is_null':
          return value === null;
        case 'is_not_null':
          return value !== null;
        case 'exists':
          return value !== undefined && value !== null;
        case 'not_exists':
          return value === undefined || value === null;
        default:
          return false;
      }
    }
    return false;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    if (!obj || !path || typeof path !== 'string') {
      return undefined;
    }
    try {
      return path.split('.').reduce((current, key) => {
        if (current === null || current === undefined) {
          return undefined;
        }
        return current[key];
      }, obj);
    } catch {
      return undefined;
    }
  }

  /**
   * Discover risk-relevant shards using vector search
   * Uses risk catalog to build targeted queries and filter shard types
   */
  private async discoverRiskRelevantShards(
    opportunity: Shard,
    catalog: RiskCatalog[],
    tenantId: string,
    userId: string,
    options: {
      maxShards?: number;
      minScore?: number;
    } = {}
  ): Promise<Shard[]> {
    if (!this.vectorSearchService || catalog.length === 0) {
      return [];
    }

    const {
      maxShards = 20,
      minScore = 0.72,
    } = options;

    try {
      // Build semantic query from opportunity context AND risk catalog
      const query = this.buildRiskSearchQuery(opportunity, catalog);

      // Determine shard types from catalog (use sourceShardTypes from active risks)
      const catalogShardTypes = new Set<string>();
      for (const risk of catalog) {
        if (risk.isActive && risk.sourceShardTypes) {
          risk.sourceShardTypes.forEach(type => catalogShardTypes.add(type));
        }
      }

      // Fallback to default types if catalog doesn't specify
      const defaultShardTypes = [
        CORE_SHARD_TYPE_NAMES.EMAIL,
        CORE_SHARD_TYPE_NAMES.NOTE,
        CORE_SHARD_TYPE_NAMES.DOCUMENT,
        CORE_SHARD_TYPE_NAMES.TASK,
        CORE_SHARD_TYPE_NAMES.MEETING,
        CORE_SHARD_TYPE_NAMES.CALL,
        CORE_SHARD_TYPE_NAMES.MESSAGE,
      ];

      const shardTypes = catalogShardTypes.size > 0
        ? Array.from(catalogShardTypes)
        : defaultShardTypes;

      // Perform vector search
      const searchResponse = await this.vectorSearchService.semanticSearch(
        {
          query,
          filter: {
            tenantId,
            shardTypeIds: shardTypes, // Use plural for array
          },
          topK: maxShards,
          minScore,
          similarityMetric: SimilarityMetric.COSINE,
        },
        userId
      );

      // Extract shards from results (already full Shard objects)
      const shards: Shard[] = searchResponse.results
        .map(r => r.shard)
        .filter((shard): shard is Shard => shard !== undefined && shard !== null);

      this.monitoring.trackEvent('risk-evaluation.semantic-discovery', {
        tenantId,
        opportunityId: opportunity.id,
        queryLength: query.length,
        resultsFound: searchResponse.results.length,
        shardsLoaded: shards.length,
        shardTypes: shardTypes.join(','),
      });

      return shards;
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'risk-evaluation.discoverRiskRelevantShards',
        tenantId,
        opportunityId: opportunity.id,
      });
      return [];
    }
  }

  /**
   * Build semantic search query from opportunity context AND risk catalog
   * Uses risk catalog entries to build targeted queries
   */
  private buildRiskSearchQuery(
    opportunity: Shard,
    catalog: RiskCatalog[]
  ): string {
    // Validate inputs
    if (!opportunity || !opportunity.structuredData) {
      return '';
    }

    const data = opportunity.structuredData as any;

    // Core opportunity identifiers (high weight)
    const identifiers = [
      typeof data?.name === 'string' ? data.name : '',
      typeof data?.accountName === 'string' ? data.accountName : '',
      typeof data?.contactName === 'string' ? data.contactName : '',
      typeof data?.ownerName === 'string' ? data.ownerName : '',
    ].filter(Boolean);

    // Extract risk terms from catalog
    const riskTerms = this.extractRiskTermsFromCatalog(catalog);

    // Opportunity context (medium weight)
    const opportunityContext = [
      typeof data?.description === 'string' ? data.description.substring(0, 200) : '',
      typeof data?.nextStep === 'string' ? data.nextStep : '',
      typeof data?.stage === 'string' ? `stage ${data.stage}` : '',
    ].filter(Boolean);

    // Build query: identifiers + risk catalog terms + opportunity context
    const queryParts = [
      ...identifiers,
      ...riskTerms,
      ...opportunityContext,
    ].filter(Boolean);

    return queryParts.join(' ');
  }

  /**
   * Extract searchable terms from risk catalog
   * Combines risk names, descriptions, and categories into search terms
   */
  private extractRiskTermsFromCatalog(catalog: RiskCatalog[]): string[] {
    const terms = new Set<string>();

    for (const risk of catalog) {
      if (!risk.isActive) {continue;}

      // Add risk name (high relevance)
      if (risk.name) {
        risk.name.split(/\s+/).forEach(term => {
          const cleaned = term.toLowerCase().replace(/[^\w]/g, '');
          if (cleaned.length > 2) {terms.add(cleaned);}
        });
      }

      // Add key terms from description (medium relevance)
      if (risk.description) {
        const words = risk.description
          .split(/\s+/)
          .map(w => w.toLowerCase().replace(/[^\w]/g, ''))
          .filter(w => w.length >= 3 && !this.isStopWord(w));

        // Take top 3-5 most relevant words from description
        words.slice(0, 5).forEach(term => terms.add(term));
      }

      // Add category as context
      terms.add(risk.category.toLowerCase());
    }

    // Limit total terms to avoid query dilution
    return Array.from(terms).slice(0, 15);
  }

  /**
   * Check if word is a common stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that',
      'these', 'those', 'it', 'its', 'they', 'them', 'their', 'there',
    ]);
    return stopWords.has(word);
  }

  /**
   * Detect risks by matching semantic search results to catalog risks
   * Uses sophisticated NLP (embedding-based semantic similarity)
   */
  private async detectRisksBySemantic(
    opportunity: Shard,
    semanticShards: Shard[],
    catalog: RiskCatalog[],
    tenantId: string
  ): Promise<DetectedRisk[]> {
    if (!this.vectorSearchService || semanticShards.length === 0) {
      return [];
    }

    const detectedRisks: DetectedRisk[] = [];

    try {
      // For each semantic shard, try to match to catalog risks using NLP
      for (const shard of semanticShards) {
        const shardContent = this.extractShardContent(shard);

        // For each risk in catalog, check semantic similarity
        for (const riskDef of catalog) {
          if (!riskDef.isActive) {continue;}

          // Check if shard type matches risk's sourceShardTypes
          if (!riskDef.sourceShardTypes.includes(shard.shardTypeId)) {
            continue;
          }

          // Match shard content to risk using sophisticated NLP (embedding similarity)
          const matchScore = await this.matchShardToRiskNLP(
            shardContent,
            riskDef,
            tenantId
          );

          if (matchScore > 0.6) { // Semantic similarity threshold
            const ponderation = await this.riskCatalogService.getPonderation(
              riskDef.riskId,
              tenantId
            );

            const confidence = matchScore * 0.7; // Scale semantic match
            
            // Generate structured explainability
            let explainability: RiskExplainability | string;
            if (this.riskExplainabilityService) {
              explainability = this.riskExplainabilityService.generateSemanticExplanation(
                [{
                  shardId: shard.id,
                  shardType: shard.shardTypeId,
                  similarityScore: matchScore,
                }],
                riskDef
              );
            } else {
              // Fallback to string for backward compatibility
              explainability = `Semantic similarity match in ${shard.shardTypeId} (${shard.id}): ${riskDef.name} (similarity: ${(matchScore * 100).toFixed(1)}%)`;
            }

            detectedRisks.push({
              riskId: riskDef.riskId,
              riskName: riskDef.name,
              category: riskDef.category,
              ponderation,
              confidence,
              contribution: ponderation * confidence,
              explainability,
              sourceShards: [shard.id],
              lifecycleState: 'identified',
            });
          }
        }
      }

      return detectedRisks;
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'risk-evaluation.detectRisksBySemantic',
        tenantId,
        opportunityId: opportunity.id,
      });
      return [];
    }
  }

  /**
   * Match shard content to risk definition using sophisticated NLP
   * Uses semantic similarity via embeddings rather than simple keyword matching
   */
  private async matchShardToRiskNLP(
    shardContent: string,
    risk: RiskCatalog,
    tenantId: string
  ): Promise<number> {
    if (!this.vectorSearchService) {
      return 0;
    }

    try {
      // Build query from risk definition (name + description)
      const riskQuery = `${risk.name} ${risk.description}`;

      // Use vector search to find similarity
      // We'll use the semantic search with the risk query to find similar content
      // Then compare the shard content embedding with risk query embedding
      const searchResponse = await this.vectorSearchService.semanticSearch(
        {
          query: riskQuery,
          filter: {
            tenantId,
          },
          topK: 1,
          minScore: 0.5,
        },
        'system'
      );

      // If we find the shard in results, use its score
      // Otherwise, calculate similarity using embeddings
      // For now, use a simplified approach: if shard content contains risk terms, score based on that
      // TODO: Enhance with direct embedding comparison when AzureOpenAIService is available
      
      // Extract risk terms
      const riskTerms = this.extractRiskTermsFromCatalog([risk]);
      const shardLower = shardContent.toLowerCase();
      
      // Count matches (simple approach for now, can be enhanced with direct embedding comparison)
      let matchCount = 0;
      for (const term of riskTerms) {
        if (shardLower.includes(term.toLowerCase())) {
          matchCount++;
        }
      }

      // Calculate match score based on term overlap
      // This is a simplified NLP approach - can be enhanced with direct embedding similarity
      const baseScore = matchCount / Math.max(riskTerms.length, 1);
      
      // Boost score if risk name appears in shard
      const nameBoost = risk.name.toLowerCase().split(/\s+/).some(word => 
        shardLower.includes(word.toLowerCase())
      ) ? 0.2 : 0;

      return Math.min(baseScore + nameBoost, 1);
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'risk-evaluation.matchShardToRiskNLP',
        tenantId,
        riskId: risk.riskId,
      });
      return 0;
    }
  }

  /**
   * Extract content from shard for semantic matching
   */
  private extractShardContent(shard: Shard): string {
    const data = shard.structuredData as any;
    const contentParts: string[] = [];

    // Extract relevant fields based on shard type
    if (data.name) {contentParts.push(data.name);}
    if (data.description) {contentParts.push(data.description);}
    if (data.body) {contentParts.push(data.body);}
    if (data.content) {contentParts.push(data.content);}
    if (data.subject) {contentParts.push(data.subject);}
    if (data.text) {contentParts.push(data.text);}
    if (data.notes) {contentParts.push(data.notes);}

    // Include unstructured data if available
    if (data.unstructuredData && typeof data.unstructuredData === 'object') {
      contentParts.push(JSON.stringify(data.unstructuredData));
    }

    const joined = contentParts.join(' ');
    return typeof joined === 'string' && joined.length > 0 ? joined.substring(0, 2000) : ''; // Limit length
  }

  /**
   * Create risk snapshot for evolution tracking
   * Called on EVERY evaluation (not just significant changes)
   */
  private async createRiskSnapshot(
    opportunity: Shard,
    evaluation: RiskEvaluation,
    tenantId: string,
    userId: string
  ): Promise<void> {
    try {
      // Get risk snapshot shard type
      const snapshotShardType = await this.shardTypeRepository.findByName(
        CORE_SHARD_TYPE_NAMES.RISK_SNAPSHOT,
        'system'
      );

      if (!snapshotShardType) {
        this.monitoring.trackEvent('risk-evaluation.snapshot-skipped', {
          tenantId,
          opportunityId: opportunity.id,
          reason: 'shard-type-not-found',
        });
        return;
      }

      const opportunityData = opportunity.structuredData as any;

      // Create snapshot document
      const snapshot = {
        id: uuidv4(),
        tenantId,
        opportunityId: opportunity.id,
        snapshotDate: new Date(),
        riskScore: evaluation.riskScore,
        categoryScores: evaluation.categoryScores,
        revenueAtRisk: evaluation.revenueAtRisk,
        risks: evaluation.risks.map(r => ({
          riskId: r.riskId,
          riskName: r.riskName,
          category: r.category,
          ponderation: r.ponderation,
          confidence: r.confidence,
          contribution: r.contribution,
          explainability: r.explainability,
          sourceShards: r.sourceShards,
          lifecycleState: r.lifecycleState,
        })),
        metadata: {
          dealValue: opportunityData.value || 0,
          currency: opportunityData.currency || 'USD',
          stage: opportunityData.stage || '',
          probability: opportunityData.probability || 0,
          expectedCloseDate: opportunityData.closeDate || opportunityData.expectedCloseDate,
        },
        createdAt: new Date(),
      };

      // Store as c_risk_snapshot shard
      const opportunityName = (opportunity.structuredData as any)?.name || opportunity.id;
      await this.shardRepository.create({
        tenantId,
        shardTypeId: snapshotShardType.id,
        structuredData: {
          ...snapshot,
          name: `Risk Snapshot ${opportunityName} - ${new Date().toISOString()}`,
        },
        createdBy: userId,
      });

      this.monitoring.trackEvent('risk-evaluation.snapshot-created', {
        tenantId,
        opportunityId: opportunity.id,
        snapshotId: snapshot.id,
      });
    } catch (error: any) {
      // Don't fail evaluation if snapshot creation fails
      this.monitoring.trackException(error, {
        operation: 'risk-evaluation.createRiskSnapshot',
        tenantId,
        opportunityId: opportunity.id,
      });
    }
  }

  /**
   * Get risk score evolution over time (global and per category)
   */
  async getRiskEvolution(
    opportunityId: string,
    tenantId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      includeCategories?: boolean;
    }
  ): Promise<{
    snapshots: Array<{
      id: string;
      snapshotDate: Date;
      riskScore: number;
      categoryScores: Record<RiskCategory, number>;
      revenueAtRisk: number;
      risks: Array<{
        riskId: string;
        riskName: string;
        category: RiskCategory;
        confidence: number;
      }>;
    }>;
    evolution: {
      global: Array<{ date: Date; score: number }>;
      categories: Record<RiskCategory, Array<{ date: Date; score: number }>>;
    };
  }> {
    try {
      // Get risk snapshot shard type
      const snapshotShardType = await this.shardTypeRepository.findByName(
        CORE_SHARD_TYPE_NAMES.RISK_SNAPSHOT,
        'system'
      );

      if (!snapshotShardType) {
        return {
          snapshots: [],
          evolution: {
            global: [],
            categories: {
              Commercial: [],
              Technical: [],
              Legal: [],
              Financial: [],
              Competitive: [],
              Operational: [],
            },
          },
        };
      }

      // Build filter using structuredDataFilters
      const structuredDataFilters: Record<string, any> = {
        opportunityId,
      };

      // Date filtering using operator syntax
      if (options?.startDate || options?.endDate) {
        if (options.startDate && options.endDate) {
          structuredDataFilters.snapshotDate = {
            operator: 'gte',
            value: options.startDate,
          };
          // Note: Cosmos DB doesn't support multiple operators on same field easily
          // We'll filter in memory for endDate
        } else if (options.startDate) {
          structuredDataFilters.snapshotDate = {
            operator: 'gte',
            value: options.startDate,
          };
        }
        // endDate will be filtered in memory after query
      }

      // Get all snapshots for opportunity
      const snapshotsResult = await this.shardRepository.list({
        filter: {
          tenantId,
          shardTypeId: snapshotShardType.id,
          structuredDataFilters,
        },
        orderBy: 'createdAt', // Use createdAt as proxy for snapshotDate ordering
        orderDirection: 'asc',
        limit: 1000, // Reasonable limit for evolution tracking
      });

      // Filter by endDate in memory if specified
      let filteredSnapshots = snapshotsResult.shards;
      if (options?.endDate) {
        filteredSnapshots = filteredSnapshots.filter(s => {
          const data = s.structuredData as any;
          const snapshotDate = data.snapshotDate ? new Date(data.snapshotDate) : s.createdAt;
          return snapshotDate <= options.endDate!;
        });
      }

      // Sort by snapshotDate (not just createdAt)
      filteredSnapshots.sort((a, b) => {
        const dataA = a.structuredData as any;
        const dataB = b.structuredData as any;
        const dateA = dataA.snapshotDate ? new Date(dataA.snapshotDate) : a.createdAt;
        const dateB = dataB.snapshotDate ? new Date(dataB.snapshotDate) : b.createdAt;
        return dateA.getTime() - dateB.getTime();
      });

      const snapshots = filteredSnapshots.map(s => {
        const data = s.structuredData as any;
        return {
          id: s.id,
          snapshotDate: new Date(data.snapshotDate || s.createdAt),
          riskScore: data.riskScore || 0,
          categoryScores: data.categoryScores || {
            Commercial: 0,
            Technical: 0,
            Legal: 0,
            Financial: 0,
            Competitive: 0,
            Operational: 0,
          },
          revenueAtRisk: data.revenueAtRisk || 0,
          risks: (data.risks || []).map((r: any) => ({
            riskId: r.riskId,
            riskName: r.riskName,
            category: r.category,
            confidence: r.confidence,
          })),
        };
      });

      // Build evolution data
      const evolution = {
        global: snapshots.map(s => ({
          date: s.snapshotDate,
          score: s.riskScore,
        })),
        categories: {
          Commercial: [] as Array<{ date: Date; score: number }>,
          Technical: [] as Array<{ date: Date; score: number }>,
          Legal: [] as Array<{ date: Date; score: number }>,
          Financial: [] as Array<{ date: Date; score: number }>,
          Competitive: [] as Array<{ date: Date; score: number }>,
          Operational: [] as Array<{ date: Date; score: number }>,
        },
      };

      // Extract category scores from snapshots
      for (const snapshot of snapshots) {
        for (const category of Object.keys(evolution.categories) as RiskCategory[]) {
          evolution.categories[category].push({
            date: snapshot.snapshotDate,
            score: snapshot.categoryScores[category] || 0,
          });
        }
      }

      this.monitoring.trackEvent('risk-evaluation.evolution-retrieved', {
        tenantId,
        opportunityId,
        snapshotCount: snapshots.length,
      });

      return { snapshots, evolution };
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'risk-evaluation.getRiskEvolution',
        tenantId,
        opportunityId,
      });
      throw error;
    }
  }

  /**
   * Get current and historical identified risks
   */
  async getRisksWithHistory(
    opportunityId: string,
    tenantId: string
  ): Promise<{
    current: DetectedRisk[];
    historical: Array<{
      riskId: string;
      riskName: string;
      category: RiskCategory;
      firstIdentified: Date;
      lastSeen: Date;
      status: 'active' | 'resolved' | 'dismissed';
      occurrences: number;
    }>;
  }> {
    try {
      // Get current evaluation
      const opportunity = await this.shardRepository.findById(opportunityId, tenantId);
      const currentEvaluation = (opportunity?.structuredData as any)?.riskEvaluation;
      const currentRisks = currentEvaluation?.risks || [];

      // Get all historical snapshots
      const evolution = await this.getRiskEvolution(opportunityId, tenantId);

      // Build historical risk map
      const historicalMap = new Map<string, {
        riskId: string;
        riskName: string;
        category: RiskCategory;
        firstIdentified: Date;
        lastSeen: Date;
        occurrences: number;
      }>();

      for (const snapshot of evolution.snapshots) {
        for (const risk of snapshot.risks) {
          const existing = historicalMap.get(risk.riskId);
          if (!existing) {
            historicalMap.set(risk.riskId, {
              riskId: risk.riskId,
              riskName: risk.riskName,
              category: risk.category,
              firstIdentified: snapshot.snapshotDate,
              lastSeen: snapshot.snapshotDate,
              occurrences: 1,
            });
          } else {
            existing.occurrences++;
            if (snapshot.snapshotDate < existing.firstIdentified) {
              existing.firstIdentified = snapshot.snapshotDate;
            }
            if (snapshot.snapshotDate > existing.lastSeen) {
              existing.lastSeen = snapshot.snapshotDate;
            }
          }
        }
      }

      // Determine status
      const currentRiskIds = new Set(currentRisks.map((r: DetectedRisk) => r.riskId));
      const historical = Array.from(historicalMap.values()).map(h => ({
        ...h,
        status: currentRiskIds.has(h.riskId) ? 'active' : 'resolved' as 'active' | 'resolved' | 'dismissed',
      }));

      this.monitoring.trackEvent('risk-evaluation.risks-history-retrieved', {
        tenantId,
        opportunityId,
        currentCount: currentRisks.length,
        historicalCount: historical.length,
      });

      return {
        current: currentRisks,
        historical,
      };
    } catch (error: any) {
      this.monitoring.trackException(error, {
        operation: 'risk-evaluation.getRisksWithHistory',
        tenantId,
        opportunityId,
      });
      throw error;
    }
  }
}

