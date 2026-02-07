/**
 * Risk Evaluation Service
 * Core service for evaluating opportunities and detecting risks
 * Combines rule-based, AI-powered, and historical pattern matching
 * Uses CAIS (adaptive-learning) for learned weights
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { FastifyInstance } from 'fastify';
import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config/index.js';
import { log } from '../utils/logger.js';
import {
  RiskEvaluationRequest,
  RiskEvaluationResult,
  RiskEvaluationAssumptions,
  EvaluationDataQuality,
  RiskScoringResult,
  LearnedWeights,
  ModelSelection,
  RevenueAtRiskCalculation,
} from '../types/risk-analytics.types';
import { RiskCatalog, DetectedRisk } from '../types/risk-catalog.types';
import { TenantMLConfigService } from './TenantMLConfigService.js';
import { trace } from '@opentelemetry/api';
import { publishRiskAnalyticsEvent, publishHitlApprovalRequested } from '../events/publishers/RiskAnalyticsEventPublisher.js';
import { riskEvaluationsTotal } from '../metrics.js';
import { v4 as uuidv4 } from 'uuid';
import { getSentimentTrends } from './SentimentTrendsService.js';

// Default weights for fallback
const DEFAULT_WEIGHTS: LearnedWeights = {
  ruleBased: 1.0,
  ml: 0.9,
  ai: 0.8,
  historical: 0.9,
};

export class RiskEvaluationService {
  private config: ReturnType<typeof loadConfig>;
  private _riskCatalogClient: ServiceClient;
  private riskCatalogService?: import('./RiskCatalogService').RiskCatalogService;
  private adaptiveLearningClient: ServiceClient;
  private mlServiceClient: ServiceClient;
  private aiInsightsClient: ServiceClient;
  private shardManagerClient: ServiceClient;
  private embeddingsClient: ServiceClient;
  private searchServiceClient: ServiceClient;
  private evaluationCache = new Map<string, { evaluation: RiskEvaluationResult; expiresAt: number }>();
  private readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutes
  private app: FastifyInstance | null = null;
  private tenantMLConfigService: TenantMLConfigService;
  private productFitService?: import('./ProductFitService').ProductFitService;

  constructor(
    app?: FastifyInstance,
    tenantMLConfigService?: TenantMLConfigService,
    riskCatalogService?: import('./RiskCatalogService').RiskCatalogService,
    productFitService?: import('./ProductFitService').ProductFitService
  ) {
    this.app = app || null;
    this.riskCatalogService = riskCatalogService;
    this.productFitService = productFitService;
    this.tenantMLConfigService = tenantMLConfigService ?? new TenantMLConfigService();
    this.config = loadConfig();
    
    // Initialize service clients
    this._riskCatalogClient = new ServiceClient({
      baseURL: this.config.services.risk_catalog?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.adaptiveLearningClient = new ServiceClient({
      baseURL: this.config.services.adaptive_learning?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.mlServiceClient = new ServiceClient({
      baseURL: this.config.services.ml_service?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.aiInsightsClient = new ServiceClient({
      baseURL: this.config.services.ai_insights?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.shardManagerClient = new ServiceClient({
      baseURL: this.config.services.shard_manager?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.embeddingsClient = new ServiceClient({
      baseURL: this.config.services.embeddings?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.searchServiceClient = new ServiceClient({
      baseURL: this.config.services.search_service?.url || '',
      timeout: 15000,
      retries: 2,
      circuitBreaker: { enabled: true },
    });
  }

  /**
   * Get service token for service-to-service authentication
   */
  private getServiceToken(tenantId: string): string {
    if (!this.app) {
      // If app not available, return empty - will be handled by gateway/service mesh
      return '';
    }
    return generateServiceToken(this.app as any, {
      serviceId: 'risk-analytics',
      serviceName: 'risk-analytics',
      tenantId,
    });
  }

  /**
   * Get learned weights from adaptive-learning service
   */
  private async getLearnedWeights(tenantId: string): Promise<LearnedWeights> {
    try {
      const token = this.getServiceToken(tenantId);
      const response = await this.adaptiveLearningClient.get<LearnedWeights>(
        `/api/v1/adaptive-learning/weights/${tenantId}?component=risk-evaluation`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );
      return response || DEFAULT_WEIGHTS;
    } catch (error: unknown) {
      log.warn('Failed to get learned weights, using defaults', {
        error: error instanceof Error ? error.message : String(error),
        tenantId,
        service: 'risk-analytics',
      });
      return DEFAULT_WEIGHTS;
    }
  }

  /**
   * Get model selection from adaptive-learning service
   */
  async getModelSelection(tenantId: string, context: string = 'risk-scoring'): Promise<ModelSelection> {
    try {
      const token = this.getServiceToken(tenantId);
      const response = await this.adaptiveLearningClient.get<ModelSelection>(
        `/api/v1/adaptive-learning/model-selection/${tenantId}?context=${context}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );
      return response || { modelId: 'default-risk-model', confidence: 0.8 };
    } catch (error: unknown) {
      log.warn('Failed to get model selection, using default', {
        error: error instanceof Error ? error.message : String(error),
        tenantId,
        service: 'risk-analytics',
      });
      return { modelId: 'default-risk-model', confidence: 0.8 };
    }
  }

  /**
   * Get risk catalog from local RiskCatalogService (merged from risk-catalog)
   */
  private async getRiskCatalog(tenantId: string, industryId?: string): Promise<RiskCatalog[]> {
    try {
      void this._riskCatalogClient;
      if (this.riskCatalogService) {
        const catalog = await this.riskCatalogService.getCatalog(tenantId, industryId);
        return Array.isArray(catalog) ? catalog : [];
      }
      return [];
    } catch (error: unknown) {
      log.error('Failed to get risk catalog', error instanceof Error ? error : new Error(String(error)), {
        tenantId,
        industryId,
        service: 'risk-analytics',
      });
      return [];
    }
  }

  /**
   * Get opportunity shard data
   */
  private async getOpportunityShard(opportunityId: string, tenantId: string): Promise<any> {
    try {
      const token = this.getServiceToken(tenantId);
      const shard = await this.shardManagerClient.get<any>(
        `/api/v1/shards/${opportunityId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );
      return shard;
    } catch (error: unknown) {
      log.error('Failed to get opportunity shard', error instanceof Error ? error : new Error(String(error)), {
        opportunityId,
        tenantId,
        service: 'risk-analytics',
      });
      throw error;
    }
  }

  /**
   * Perform risk evaluation
   * Main entry point for risk evaluation workflow
   */
  async evaluateRisk(request: RiskEvaluationRequest): Promise<RiskEvaluationResult> {
    const startTime = Date.now();
    const evaluationId = uuidv4();

    try {
      log.info('Starting risk evaluation', {
        evaluationId,
        opportunityId: request.opportunityId,
        tenantId: request.tenantId,
        trigger: request.trigger,
        service: 'risk-analytics',
      });

      // Check cache
      const cacheKey = `${request.tenantId}:${request.opportunityId}`;
      const cached = this.evaluationCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        log.debug('Returning cached risk evaluation', {
          evaluationId,
          opportunityId: request.opportunityId,
          service: 'risk-analytics',
        });
        return cached.evaluation;
      }

      // Publish started event
      await publishRiskAnalyticsEvent('risk.evaluation.started', request.tenantId, {
        evaluationId,
        opportunityId: request.opportunityId,
      });

      // Step 1: Get learned weights from adaptive-learning (REST)
      const weights = await this.getLearnedWeights(request.tenantId);
      log.debug('Retrieved learned weights', {
        weights,
        tenantId: request.tenantId,
        service: 'risk-analytics',
      });

      // Step 2: Get risk catalog from risk-catalog service (REST)
      const opportunityShard = await this.getOpportunityShard(request.opportunityId, request.tenantId);
      const industryId = opportunityShard?.structuredData?.industryId;
      const catalog = await this.getRiskCatalog(request.tenantId, industryId);
      log.debug('Retrieved risk catalog', {
        catalogSize: catalog.length,
        industryId,
        tenantId: request.tenantId,
        service: 'risk-analytics',
      });

      // Step 3: Perform risk evaluation using learned weights
      let detectedRisks = await this.detectRisks(
        opportunityShard,
        catalog,
        weights,
        request.options
      );

      // Step 3b. Optional: declining sentiment risk (Phase 2)
      if (this.config.feature_flags?.declining_sentiment_risk) {
        try {
          const trends = await getSentimentTrends(request.opportunityId, request.tenantId);
          if (trends.length >= 2 && typeof trends[0].score === 'number' && typeof trends[1].score === 'number') {
            const latest = trends[0].score;
            const previous = trends[1].score;
            if (latest < previous) {
              const opportunityId = request.opportunityId;
              detectedRisks = [
                ...detectedRisks,
                {
                  riskId: 'declining_sentiment',
                  riskName: 'Declining sentiment',
                  category: 'Operational' as const,
                  contribution: 0.05,
                  ponderation: 1,
                  confidence: 0.8,
                  explainability: {
                    detectionMethod: 'rule',
                    confidence: 0.8,
                    evidence: {
                      sourceShards: [opportunityId],
                      matchedRules: ['declining_sentiment'],
                    },
                  },
                  sourceShards: [opportunityId],
                  lifecycleState: 'identified' as const,
                } as DetectedRisk,
              ];
            }
          }
        } catch {
          // ignore
        }
      }

      // Step 3c. Optional: poor product fit risk (Phase 3)
      if (this.config.feature_flags?.poor_product_fit_risk && this.productFitService) {
        try {
          const assessments = await this.productFitService.getProductFit(request.tenantId, request.opportunityId);
          if (assessments.length > 0) {
            const maxScore = Math.max(...assessments.map((a) => a.score));
            const threshold = this.config.thresholds?.product_fit_risk_threshold ?? 0.4;
            if (maxScore < threshold) {
              detectedRisks = [
                ...detectedRisks,
                {
                  riskId: 'poor_product_fit',
                  riskName: 'Poor product fit',
                  category: 'Operational' as const,
                  contribution: 0.05,
                  ponderation: 1,
                  confidence: 0.8,
                  explainability: {
                    detectionMethod: 'rule',
                    confidence: 0.8,
                    evidence: {
                      sourceShards: [request.opportunityId],
                      matchedRules: ['poor_product_fit'],
                    },
                  },
                  sourceShards: [request.opportunityId],
                  lifecycleState: 'identified' as const,
                } as DetectedRisk,
              ];
            }
          }
        } catch {
          // ignore
        }
      }

      // Step 4: Calculate risk scores
      let riskScore = this.calculateRiskScore(detectedRisks, weights);
      const categoryScores = this.calculateCategoryScores(detectedRisks);

      // Step 5: Get ML risk score and merge when ML weight > 0 (MISSING_FEATURES 4.2)
      let mlRiskScore: number | undefined;
      if (weights.ml && weights.ml > 0) {
        try {
          const modelSelection = await this.getModelSelection(request.tenantId, 'risk-scoring');
          const mlResult = await this.performMLRiskScoring(request.opportunityId, request.tenantId, modelSelection);
          mlRiskScore = mlResult.mlRiskScore;
          const combinedScore = (riskScore * (1 - weights.ml!)) + (mlRiskScore * weights.ml!);
          if (weights.ml! > 0.3) {
            riskScore = combinedScore;
          }
        } catch (error: unknown) {
          log.warn('ML risk scoring failed, continuing without ML', {
            error: error instanceof Error ? error.message : String(error),
            opportunityId: request.opportunityId,
            service: 'risk-analytics',
          });
        }
      }

      // Step 6: Calculate revenue at risk (after riskScore is finalized, including ML when applied)
      const opportunityValue = opportunityShard?.structuredData?.amount || 0;
      const revenueAtRisk = this.revenueAtRiskFromScore(riskScore, opportunityValue);

      // Step 7: Build evaluation result (assumptions: data quality, staleness, missing data – MISSING_FEATURES 4.3; dataQuality Plan §11.6)
      const assumptions = this.buildAssumptions(opportunityShard);
      const qualityScore = this.calculateQualityScore(opportunityShard);
      const dataQuality: EvaluationDataQuality = {
        score: qualityScore,
        completenessPct: Math.round((assumptions.dataQuality?.completeness ?? 0) * 100),
        missingCritical: (assumptions.dataQuality?.issues ?? []).filter((i) => i.severity === 'high').map((i) => i.field || i.message || ''),
        stalenessDays: Math.floor(assumptions.staleness?.daysSinceUpdate ?? 0),
      };
      const atRiskReasons = [...new Set(detectedRisks.map((r) => r.riskName).filter(Boolean))];
      const evaluation: RiskEvaluationResult = {
        evaluationId,
        opportunityId: request.opportunityId,
        riskScore,
        categoryScores,
        detectedRisks,
        atRiskReasons,
        revenueAtRisk,
        calculatedAt: new Date(),
        trustLevel: this.calculateTrustLevel(detectedRisks, opportunityShard),
        qualityScore,
        dataQuality,
        assumptions,
        ...(mlRiskScore != null && { mlRiskScore }),
      };

      // Step 8: Store in database
      await this.storeEvaluation(evaluation, request.tenantId);

      // Step 9: Cache result
      this.evaluationCache.set(cacheKey, {
        evaluation,
        expiresAt: Date.now() + this.CACHE_TTL,
      });

      // Step 10: Publish completion event
      await publishRiskAnalyticsEvent('risk.evaluation.completed', request.tenantId, {
        evaluationId,
        opportunityId: request.opportunityId,
        riskScore,
        detectedRisks,
        workflowId: request.workflowId, // Include workflowId for tracking
        timestamp: new Date().toISOString(),
      });

      // Publish risk.evaluated for DataLakeCollector (logging) and RiskSnapshotService (Plan §9.1, §11.2)
      // topDrivers: { feature, contribution, direction }[] per plan Explainability / DATA_LAKE_LAYOUT
      await publishRiskAnalyticsEvent('risk.evaluated', request.tenantId, {
        opportunityId: request.opportunityId,
        evaluationId,
        riskScore,
        categoryScores,
        topDrivers: detectedRisks.slice(0, 5).map((r) => ({
          feature: r.riskName || 'Risk',
          contribution: typeof r.contribution === 'number' ? r.contribution : 0.1,
          direction: 'increases' as const,
        })),
        dataQuality: evaluation.dataQuality,
        atRiskReasons: evaluation.atRiskReasons,
        timestamp: new Date().toISOString(),
      });
      riskEvaluationsTotal.inc();
      trace.getTracer('risk-analytics').startSpan('risk.evaluated', {
        attributes: { tenantId: request.tenantId, opportunityId: request.opportunityId },
      }).end();

      // HITL (Plan §972): if hitl_approvals on and riskScore ≥ hitl_risk_min and amount ≥ hitl_deal_min, publish hitl.approval.requested.
      // W10: Tenant ML config overrides: riskTolerance.autoEscalationThreshold for hitl_risk_min; decisionPreferences.requireApprovalForActions gates publishing.
      let tenantMLConfig: Awaited<ReturnType<TenantMLConfigService['getByTenantId']>> = null;
      try {
        tenantMLConfig = await this.tenantMLConfigService.getByTenantId(request.tenantId);
      } catch {
        // use config defaults on error
      }
      const hitlOn = this.config.feature_flags?.hitl_approvals === true;
      const hitlRiskMin =
        typeof tenantMLConfig?.riskTolerance?.autoEscalationThreshold === 'number'
          ? tenantMLConfig.riskTolerance.autoEscalationThreshold
          : typeof this.config.thresholds?.hitl_risk_min === 'number'
            ? this.config.thresholds.hitl_risk_min
            : 0.8;
      const hitlDealMin = typeof this.config.thresholds?.hitl_deal_min === 'number' ? this.config.thresholds.hitl_deal_min : 1_000_000;
      const requireApproval = tenantMLConfig?.decisionPreferences?.requireApprovalForActions ?? true;
      const amount = Number(opportunityShard?.structuredData?.Amount ?? opportunityShard?.structuredData?.amount ?? 0);
      const ownerId = opportunityShard?.structuredData?.OwnerId ?? opportunityShard?.structuredData?.ownerId;
      if (hitlOn && requireApproval && riskScore >= hitlRiskMin && amount >= hitlDealMin) {
        await publishHitlApprovalRequested(request.tenantId, {
          opportunityId: request.opportunityId,
          riskScore,
          amount,
          requestedAt: new Date().toISOString(),
          ownerId: typeof ownerId === 'string' ? ownerId : undefined,
          correlationId: evaluationId,
        });
      }

      // Step 11: recordPrediction (REST) and publish outcome to adaptive-learning (MISSING_FEATURES 3.2)
      if (this.config.services.adaptive_learning?.url) {
        try {
          const token = this.getServiceToken(request.tenantId);
          await this.adaptiveLearningClient.post(
            '/api/v1/adaptive-learning/outcomes/record-prediction',
            {
              component: 'risk-evaluation',
              predictionId: evaluationId,
              context: { opportunityId: request.opportunityId, detectedRisks: detectedRisks.length, categoryScores },
              predictedValue: riskScore,
            },
            { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': request.tenantId } }
          );
        } catch (e: unknown) {
          log.warn('recordPrediction (adaptive-learning) failed', { error: (e as Error).message, evaluationId, service: 'risk-analytics' });
        }
      }
      await publishRiskAnalyticsEvent('adaptive.learning.outcome.recorded', request.tenantId, {
        component: 'risk-evaluation',
        prediction: riskScore,
        context: {
          opportunityId: request.opportunityId,
          detectedRisks: detectedRisks.length,
          categoryScores,
        },
      });

      log.info('Risk evaluation completed', {
        evaluationId,
        opportunityId: request.opportunityId,
        riskScore,
        detectedRisksCount: detectedRisks.length,
        durationMs: Date.now() - startTime,
        service: 'risk-analytics',
      });

      return evaluation;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      log.error('Risk evaluation failed', error instanceof Error ? error : new Error(errMsg), {
        evaluationId,
        opportunityId: request.opportunityId,
        tenantId: request.tenantId,
        service: 'risk-analytics',
      });

      await publishRiskAnalyticsEvent('risk.evaluation.failed', request.tenantId, {
        evaluationId,
        opportunityId: request.opportunityId,
        error: errMsg || 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Detect risks using multiple methods
   */
  private async detectRisks(
    opportunityShard: any,
    catalog: RiskCatalog[],
    weights: LearnedWeights,
    options?: RiskEvaluationRequest['options']
  ): Promise<DetectedRisk[]> {
    const detectedRisks: DetectedRisk[] = [];

    // Rule-based detection
    if (weights.ruleBased && weights.ruleBased > 0) {
      const ruleBasedRisks = await this.detectRisksRuleBased(opportunityShard, catalog);
      detectedRisks.push(...ruleBasedRisks);
    }

    // AI-powered detection
    if (weights.ai && weights.ai > 0 && options?.includeAI !== false) {
      const aiRisks = await this.detectRisksAI(opportunityShard, catalog);
      detectedRisks.push(...aiRisks);
    }

    // Historical pattern matching
    if (weights.historical && weights.historical > 0 && options?.includeHistorical !== false) {
      const historicalRisks = await this.detectRisksHistorical(opportunityShard, catalog);
      detectedRisks.push(...historicalRisks);
    }

    // Semantic discovery
    if (options?.includeSemanticDiscovery) {
      const semanticRisks = await this.detectRisksSemantic(opportunityShard, catalog);
      detectedRisks.push(...semanticRisks);
    }

    // Deduplicate and merge risks
    return this.deduplicateRisks(detectedRisks);
  }

  /**
   * Rule-based risk detection
   */
  private async detectRisksRuleBased(opportunityShard: any, catalog: RiskCatalog[]): Promise<DetectedRisk[]> {
    const risks: DetectedRisk[] = [];
    const data = opportunityShard?.structuredData || {};

    for (const riskDef of catalog) {
      if (!riskDef.isActive || !riskDef.detectionRules) continue;

      try {
        // Evaluate detection rules
        const matches = this.evaluateDetectionRules(riskDef.detectionRules, data);
        if (matches) {
          risks.push({
            riskId: riskDef.riskId,
            riskName: riskDef.name,
            category: riskDef.category,
            ponderation: riskDef.defaultPonderation,
            confidence: 0.8, // Rule-based confidence
            contribution: riskDef.defaultPonderation,
            explainability: {
              detectionMethod: 'rule',
              confidence: 0.8,
              evidence: {
                sourceShards: [opportunityShard.id],
                matchedRules: [riskDef.riskId],
              },
              reasoning: {
                summary: `Risk detected via rule-based matching: ${riskDef.name}`,
                standard: `The opportunity matches the detection rules for ${riskDef.name}.`,
              },
              assumptions: [],
              confidenceContributors: [],
            },
            sourceShards: [opportunityShard.id],
            lifecycleState: 'identified',
          });
        }
      } catch (error: unknown) {
        log.warn('Failed to evaluate risk rule', {
          error: error instanceof Error ? error.message : String(error),
          riskId: riskDef.riskId,
          service: 'risk-analytics',
        });
      }
    }

    return risks;
  }

  /**
   * AI-powered risk detection
   */
  private async detectRisksAI(opportunityShard: any, catalog: RiskCatalog[]): Promise<DetectedRisk[]> {
    try {
      const token = this.getServiceToken(opportunityShard.tenantId);
      const response = await this.aiInsightsClient.post<any>(
        '/api/v1/ai-insights/risk-detection',
        {
          opportunityData: opportunityShard.structuredData,
          riskCatalog: catalog.map(r => ({
            riskId: r.riskId,
            name: r.name,
            description: r.description,
            category: r.category,
          })),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': opportunityShard.tenantId,
          },
        }
      );

      // Transform AI response to DetectedRisk format
      const risks: DetectedRisk[] = (response.risks || []).map((aiRisk: any) => ({
        riskId: aiRisk.riskId,
        riskName: aiRisk.riskName || aiRisk.name,
        category: aiRisk.category,
        ponderation: aiRisk.ponderation || 0.5,
        confidence: aiRisk.confidence || 0.7,
        contribution: aiRisk.contribution || 0,
        explainability: aiRisk.explainability || {
          detectionMethod: 'ai',
          confidence: aiRisk.confidence || 0.7,
          evidence: {
            sourceShards: [opportunityShard.id],
            aiReasoning: aiRisk.reasoning,
          },
          reasoning: {
            summary: aiRisk.summary || `AI-detected risk: ${aiRisk.riskName}`,
            standard: aiRisk.reasoning || '',
          },
          assumptions: [],
          confidenceContributors: [],
        },
        sourceShards: [opportunityShard.id],
        lifecycleState: 'identified',
      }));

      return risks;
    } catch (error: unknown) {
      log.warn('AI risk detection failed', {
        error: error instanceof Error ? error.message : String(error),
        opportunityId: opportunityShard.id,
        service: 'risk-analytics',
      });
      return [];
    }
  }

  /**
   * Historical pattern matching (MISSING_FEATURES 4.5).
   * Uses vector search for similar opportunities when search_service is configured;
   * falls back to shard-manager attribute-based query (stage, amount) otherwise.
   */
  private async detectRisksHistorical(opportunityShard: any, catalog: RiskCatalog[]): Promise<DetectedRisk[]> {
    try {
      const token = this.getServiceToken(opportunityShard.tenantId);
      const data = opportunityShard?.structuredData || {};
      type SimilarItem = { id: string; structuredData?: Record<string, unknown> };
      let similarList: SimilarItem[] = [];

      // 1) Try vector search for similar opportunities when search_service is configured
      if (this.config.services.search_service?.url) {
        const queryText = [data.description, data.summary, data.stage, String(data.amount ?? '')]
          .filter(Boolean)
          .join(' ') || [data.stage, data.amount].filter(Boolean).join(' ') || 'opportunity';
        try {
          const res = await this.searchServiceClient.post<{ results?: Array<{ shardId: string; shard?: { id?: string; structuredData?: Record<string, unknown> } }> }>(
            '/api/v1/search/vector',
            {
              query: queryText,
              shardTypeIds: ['c_opportunity'],
              limit: 10,
              includeShard: true,
            },
            { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': opportunityShard.tenantId } }
          );
          const results = res?.results ?? [];
          for (const r of results) {
            if (r.shardId === opportunityShard.id) continue;
            let shard: { id?: string; structuredData?: Record<string, unknown> } | undefined = r.shard;
            if (!shard && r.shardId) {
              try {
                shard = await this.getOpportunityShard(r.shardId, opportunityShard.tenantId);
              } catch {
                /* skip */
              }
            }
            if (shard) {
              similarList.push({ id: shard.id ?? r.shardId, structuredData: shard.structuredData });
            }
          }
        } catch (e) {
          log.warn('Vector search for similar opportunities failed, using shard-manager fallback', {
            error: (e as Error).message,
            opportunityId: opportunityShard.id,
            service: 'risk-analytics',
          });
        }
      }

      // 2) Fallback: attribute-based query from shard-manager
      if (similarList.length === 0) {
        const smRes = await this.shardManagerClient.post<{ data?: Array<{ id: string; structuredData?: Record<string, unknown> }> }>(
          '/api/v1/shards/query',
          {
            shardType: 'opportunity',
            filters: {
              stage: data.stage,
              amount: { $gte: data.amount * 0.8, $lte: data.amount * 1.2 },
            },
            limit: 10,
          },
          { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': opportunityShard.tenantId } }
        );
        similarList = (smRes?.data ?? []).map((o: { id: string; structuredData?: Record<string, unknown> }) => ({
          id: o.id,
          structuredData: o.structuredData,
        }));
      }

      const risks: DetectedRisk[] = [];
      for (const similarOpp of similarList) {
        const outcome = similarOpp.structuredData?.outcome ?? similarOpp.structuredData?.status;
        if (outcome !== 'lost' && outcome !== 'cancelled') continue;

        const historicalEvaluation = await this.getHistoricalEvaluation(similarOpp.id, opportunityShard.tenantId);
        if (!historicalEvaluation?.detectedRisks) continue;

        for (const historicalRisk of historicalEvaluation.detectedRisks) {
          const catalogRisk = catalog.find((r) => r.riskId === historicalRisk.riskId);
          if (!catalogRisk?.isActive) continue;
          const prevExplain = historicalRisk.explainability;
          const evidenceBase: { sourceShards?: string[]; [k: string]: unknown } =
            typeof prevExplain === 'object' && prevExplain !== null && 'evidence' in prevExplain
              ? { ...(prevExplain as { evidence: Record<string, unknown> }).evidence }
              : {};
          risks.push({
            ...historicalRisk,
            confidence: historicalRisk.confidence * 0.7,
            explainability: {
              detectionMethod: 'historical',
              confidence: historicalRisk.confidence * 0.7,
              evidence: {
                ...evidenceBase,
                sourceShards: evidenceBase.sourceShards ?? historicalRisk.sourceShards,
                similarOpportunityId: similarOpp.id,
                historicalOutcome: outcome,
              } as { sourceShards: string[]; [k: string]: unknown },
              reasoning: {
                summary: `Risk detected based on historical pattern: similar opportunity ${outcome}`,
                standard: `A similar opportunity (${similarOpp.id}) had outcome "${outcome}" and was associated with risk: ${historicalRisk.riskName}`,
              },
              assumptions: [],
              confidenceContributors: [],
            },
          });
        }
      }

      return this.deduplicateRisks(risks);
    } catch (error: unknown) {
      log.warn('Historical risk detection failed', {
        error: error instanceof Error ? error.message : String(error),
        opportunityId: opportunityShard.id,
        service: 'risk-analytics',
      });
      return [];
    }
  }

  /**
   * Get historical evaluation for an opportunity
   */
  private async getHistoricalEvaluation(opportunityId: string, tenantId: string): Promise<RiskEvaluationResult | null> {
    try {
      const container = getContainer('risk_evaluations');
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.opportunityId = @opportunityId ORDER BY c.calculatedAt DESC OFFSET 0 LIMIT 1',
        parameters: [{ name: '@opportunityId', value: opportunityId }],
      };
      
      const { resources } = await container.items.query(querySpec, { partitionKey: tenantId }).fetchAll();
      return resources && resources.length > 0 ? resources[0] as any : null;
    } catch (error: unknown) {
      log.warn('Failed to get historical evaluation', {
        error: error instanceof Error ? error.message : String(error),
        opportunityId,
        service: 'risk-analytics',
      });
      return null;
    }
  }

  /**
   * Semantic risk discovery
   */
  private async detectRisksSemantic(opportunityShard: any, catalog: RiskCatalog[]): Promise<DetectedRisk[]> {
    try {
      const token = this.getServiceToken(opportunityShard.tenantId);
      const data = opportunityShard?.structuredData || {};
      
      // Use embeddings service for semantic search
      // First, get embeddings for opportunity description/summary
      const opportunityText = JSON.stringify({
        description: data.description || '',
        summary: data.summary || '',
        stage: data.stage || '',
        amount: data.amount || 0,
      });

      // Get embeddings for opportunity
      const embeddingResponse = await this.embeddingsClient.post<any>(
        '/api/v1/embeddings',
        {
          text: opportunityText,
          model: 'text-embedding-ada-002',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': opportunityShard.tenantId,
          },
        }
      );

      if (!embeddingResponse.embedding) {
        return [];
      }

      // Search for similar risk patterns using vector search
      // Query risk evaluations with similar embeddings
      const container = getContainer('risk_evaluations');
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.detectedRisks != null ORDER BY c.calculatedAt DESC',
        parameters: [{ name: '@tenantId', value: opportunityShard.tenantId }],
      };

      const { resources } = await container.items.query(querySpec, { partitionKey: opportunityShard.tenantId }).fetchAll();
      
      const risks: DetectedRisk[] = [];
      
      // For each historical evaluation, check if risks are semantically similar
      for (const evaluation of (resources || []).slice(0, 20)) {
        if (evaluation.detectedRisks && Array.isArray(evaluation.detectedRisks)) {
          for (const historicalRisk of evaluation.detectedRisks) {
            const catalogRisk = catalog.find(r => r.riskId === historicalRisk.riskId);
            if (catalogRisk && catalogRisk.isActive) {
              // Simple semantic matching - in production, use proper vector similarity
              const riskDescription = catalogRisk.description || '';
              const riskName = catalogRisk.name || '';
              
              // Check if opportunity text contains risk-related keywords
              const riskKeywords = [riskName, riskDescription].join(' ').toLowerCase();
              const opportunityTextLower = opportunityText.toLowerCase();
              
              if (riskKeywords.split(' ').some(keyword => 
                keyword.length > 3 && opportunityTextLower.includes(keyword)
              )) {
                risks.push({
                  riskId: historicalRisk.riskId,
                  riskName: catalogRisk.name,
                  category: catalogRisk.category,
                  ponderation: catalogRisk.defaultPonderation,
                  confidence: 0.6, // Lower confidence for semantic match
                  contribution: catalogRisk.defaultPonderation * 0.6,
                  explainability: {
                    detectionMethod: 'semantic',
                    confidence: 0.6,
                    evidence: {
                      sourceShards: [opportunityShard.id],
                      semanticMatches: [{ shardId: opportunityShard.id, shardType: 'c_opportunity', similarityScore: 0.6 }],
                    },
                    reasoning: {
                      summary: `Risk detected via semantic similarity: ${catalogRisk.name}`,
                      standard: `The opportunity content semantically matches patterns associated with risk: ${catalogRisk.name}`,
                    },
                    assumptions: [],
                    confidenceContributors: [],
                  },
                  sourceShards: [opportunityShard.id],
                  lifecycleState: 'identified',
                });
              }
            }
          }
        }
      }

      return this.deduplicateRisks(risks);
    } catch (error: unknown) {
      log.warn('Semantic risk detection failed', {
        error: error instanceof Error ? error.message : String(error),
        opportunityId: opportunityShard.id,
        service: 'risk-analytics',
      });
      return [];
    }
  }

  /**
   * Evaluate detection rules
   */
  private evaluateDetectionRules(rules: any, data: any): boolean {
    if (!rules || typeof rules !== 'object') {
      return false;
    }

    // Support simple rule structures
    // Format: { field: { operator: value } } or { $and: [...], $or: [...] }
    
    if (rules.$and) {
      // All conditions must match
      return rules.$and.every((condition: any) => this.evaluateDetectionRules(condition, data));
    }
    
    if (rules.$or) {
      // At least one condition must match
      return rules.$or.some((condition: any) => this.evaluateDetectionRules(condition, data));
    }

    // Evaluate field conditions
    for (const field in rules) {
      if (field.startsWith('$')) continue; // Skip operators
      
      const ruleValue = rules[field];
      const dataValue = this.getNestedValue(data, field);
      
      if (typeof ruleValue === 'object') {
        // Handle operators: { $eq, $ne, $gt, $gte, $lt, $lte, $in, $contains }
        if (ruleValue.$eq !== undefined) {
          if (dataValue !== ruleValue.$eq) return false;
        } else if (ruleValue.$ne !== undefined) {
          if (dataValue === ruleValue.$ne) return false;
        } else if (ruleValue.$gt !== undefined) {
          if (dataValue <= ruleValue.$gt) return false;
        } else if (ruleValue.$gte !== undefined) {
          if (dataValue < ruleValue.$gte) return false;
        } else if (ruleValue.$lt !== undefined) {
          if (dataValue >= ruleValue.$lt) return false;
        } else if (ruleValue.$lte !== undefined) {
          if (dataValue > ruleValue.$lte) return false;
        } else if (ruleValue.$in !== undefined) {
          if (!Array.isArray(ruleValue.$in) || !ruleValue.$in.includes(dataValue)) return false;
        } else if (ruleValue.$contains !== undefined) {
          const dataStr = String(dataValue || '').toLowerCase();
          const searchStr = String(ruleValue.$contains || '').toLowerCase();
          if (!dataStr.includes(searchStr)) return false;
        } else {
          // Nested object - recurse
          if (!this.evaluateDetectionRules(ruleValue, dataValue || {})) return false;
        }
      } else {
        // Direct value comparison
        if (dataValue !== ruleValue) return false;
      }
    }

    return true;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Deduplicate and merge risks
   */
  private deduplicateRisks(risks: DetectedRisk[]): DetectedRisk[] {
    const riskMap = new Map<string, DetectedRisk>();

    for (const risk of risks) {
      const key = risk.riskId;
      const existing = riskMap.get(key);

      if (existing) {
        // Merge risks - take higher confidence, combine source shards
        existing.confidence = Math.max(existing.confidence, risk.confidence);
        existing.sourceShards = [...new Set([...existing.sourceShards, ...risk.sourceShards])];
      } else {
        riskMap.set(key, { ...risk });
      }
    }

    return Array.from(riskMap.values());
  }

  /**
   * Calculate overall risk score
   */
  private calculateRiskScore(risks: DetectedRisk[], _weights: LearnedWeights): number {
    if (risks.length === 0) return 0;

    let totalContribution = 0;
    for (const risk of risks) {
      totalContribution += risk.contribution * risk.ponderation;
    }

    // Normalize to 0-1 range
    return Math.min(1, totalContribution);
  }

  /**
   * Calculate category scores
   */
  private calculateCategoryScores(risks: DetectedRisk[]): RiskEvaluationResult['categoryScores'] {
    const scores: RiskEvaluationResult['categoryScores'] = {
      Commercial: 0,
      Technical: 0,
      Legal: 0,
      Financial: 0,
      Competitive: 0,
      Operational: 0,
    };

    for (const risk of risks) {
      const category = risk.category;
      if (category in scores) {
        scores[category as keyof typeof scores] += risk.contribution * risk.ponderation;
      }
    }

    // Normalize each category to 0-1
    for (const key in scores) {
      scores[key as keyof typeof scores] = Math.min(1, scores[key as keyof typeof scores]);
    }

    return scores;
  }

  /**
   * Calculate revenue at risk from score and value (private helper)
   */
  private revenueAtRiskFromScore(riskScore: number, opportunityValue: number): number {
    return riskScore * opportunityValue;
  }

  /**
   * Calculate trust level
   */
  private calculateTrustLevel(risks: DetectedRisk[], opportunityShard: any): 'high' | 'medium' | 'low' | 'unreliable' {
    if (risks.length === 0) return 'high';
    
    const dataQuality = this.calculateQualityScore(opportunityShard);
    
    // Calculate average confidence
    const avgConfidence = risks.reduce((sum, r) => sum + r.confidence, 0) / risks.length;
    
    // Consider data quality in trust level
    const trustScore = (avgConfidence * 0.7) + (dataQuality * 0.3);
    
    if (trustScore > 0.8) return 'high';
    if (trustScore > 0.6) return 'medium';
    if (trustScore > 0.4) return 'low';
    return 'unreliable';
  }

  /**
   * Calculate quality score
   */
  private calculateQualityScore(opportunityShard: any): number {
    const data = opportunityShard?.structuredData || {};
    let score = 0;
    let maxScore = 0;

    // Check required fields completeness
    const requiredFields = ['amount', 'stage', 'probability'];
    for (const field of requiredFields) {
      maxScore += 1;
      if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
        score += 1;
      }
    }

    // Check optional but important fields
    const importantFields = ['description', 'summary', 'closeDate'];
    for (const field of importantFields) {
      maxScore += 0.5;
      if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
        score += 0.5;
      }
    }

    // Check data freshness (if updatedAt exists)
    if (opportunityShard.updatedAt) {
      maxScore += 1;
      const daysSinceUpdate = (Date.now() - new Date(opportunityShard.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate < 7) {
        score += 1; // Very fresh
      } else if (daysSinceUpdate < 30) {
        score += 0.7; // Recent
      } else if (daysSinceUpdate < 90) {
        score += 0.4; // Somewhat stale
      } else {
        score += 0.1; // Stale
      }
    }

    // Normalize to 0-1 range
    return maxScore > 0 ? Math.min(1, score / maxScore) : 0.5;
  }

  /**
   * Build assumptions for evaluation (data quality, staleness, missing data).
   * Populated consistently so UI can display to users (MISSING_FEATURES 4.3).
   */
  private buildAssumptions(opportunityShard: any): RiskEvaluationAssumptions {
    const data = opportunityShard?.structuredData || {};
    const hasValue = (data.amount != null && data.amount !== '') || (data.value != null && data.value !== '');
    const requiredFields = ['stage', 'probability', 'currency'];
    const missing: string[] = requiredFields.filter(
      (f) => data[f] === undefined || data[f] === null || data[f] === ''
    );
    if (!hasValue) missing.push('amount or value');
    const missingDataWarnings = missing.map((f) => `Missing required field: ${f}`);

    const issues: { type: string; field?: string; message: string; severity?: string }[] = requiredFields
      .filter((f) => data[f] === undefined || data[f] === null || data[f] === '')
      .map((f) => ({
        type: 'missing_field',
        field: f,
        message: `Required field ${f} is missing`,
        severity: 'high',
      }));
    if (!hasValue) {
      issues.push({
        type: 'missing_field',
        field: 'value',
        message: 'Amount or value is missing',
        severity: 'high',
      });
    }

    let lastUpdated: Date | null = null;
    if (opportunityShard?.updatedAt) {
      lastUpdated = new Date(opportunityShard.updatedAt);
    }
    const daysSinceUpdate = lastUpdated
      ? (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
      : 0;
    const isStale = daysSinceUpdate > 30;

    if (isStale) {
      issues.push({
        type: 'stale_data',
        message: `Data hasn't been updated in ${Math.floor(daysSinceUpdate)} days`,
        severity: 'medium',
      });
    }

    const totalRequired = 4; // stage, probability, currency, amount|value
    const completeness = Math.max(0, 1 - missing.length / totalRequired);

    return {
      dataQuality: { completeness, issues: issues.length > 0 ? issues : undefined },
      staleness: lastUpdated
        ? { lastUpdated: lastUpdated.toISOString(), daysSinceUpdate, isStale }
        : undefined,
      missingDataWarnings: missingDataWarnings.length > 0 ? missingDataWarnings : undefined,
    };
  }

  /**
   * Perform ML risk scoring
   */
  async performMLRiskScoring(
    opportunityId: string,
    tenantId: string,
    modelSelection: ModelSelection
  ): Promise<RiskScoringResult> {
    const scoringId = uuidv4();

    try {
      // Publish started event
      await publishRiskAnalyticsEvent('risk.scoring.started', tenantId, {
        scoringId,
        opportunityId,
        modelId: modelSelection.modelId,
      });

      // Get opportunity features
      const opportunityShard = await this.getOpportunityShard(opportunityId, tenantId);
      const features = this.extractFeatures(opportunityShard);

      // Call ML service
      const token = this.getServiceToken(tenantId);
      const mlResponse = await this.mlServiceClient.post<any>(
        `/api/v1/ml/risk-scoring/predict`,
        {
          opportunityId,
          modelId: modelSelection.modelId,
          features,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      const result: RiskScoringResult = {
        scoringId,
        opportunityId,
        mlRiskScore: mlResponse.riskScore || mlResponse.prediction || 0.5,
        modelId: modelSelection.modelId,
        confidence: mlResponse.confidence || modelSelection.confidence,
        features,
      };

      // Publish completion event
      await publishRiskAnalyticsEvent('risk.scoring.completed', tenantId, {
        scoringId,
        opportunityId,
        mlRiskScore: result.mlRiskScore,
        modelId: result.modelId,
        confidence: result.confidence,
        workflowId: (modelSelection as any).workflowId, // Include workflowId if available
      });

      // Publish outcome to adaptive-learning
      await publishRiskAnalyticsEvent('adaptive.learning.outcome.recorded', tenantId, {
        component: 'risk-scoring',
        modelId: result.modelId,
        prediction: result.mlRiskScore,
      });

      return result;
    } catch (error: unknown) {
      log.error('ML risk scoring failed', error instanceof Error ? error : new Error(String(error)), {
        scoringId,
        opportunityId,
        tenantId,
        service: 'risk-analytics',
      });
      throw error;
    }
  }

  /**
   * Extract features from opportunity shard for ML
   */
  private extractFeatures(opportunityShard: any): Record<string, any> {
    const data = opportunityShard?.structuredData || {};
    const createdAt = opportunityShard.createdAt ? new Date(opportunityShard.createdAt) : new Date();
    const updatedAt = opportunityShard.updatedAt ? new Date(opportunityShard.updatedAt) : new Date();
    const closeDate = data.closeDate ? new Date(data.closeDate) : null;
    
    return {
      amount: data.amount || 0,
      stage: data.stage || '',
      probability: data.probability || 0,
      daysInStage: data.daysInStage || 0,
      daysSinceCreated: Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      daysSinceUpdated: Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
      daysToClose: closeDate ? Math.floor((closeDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
      hasDescription: !!(data.description && data.description.length > 0),
      descriptionLength: (data.description || '').length,
      hasSummary: !!(data.summary && data.summary.length > 0),
      summaryLength: (data.summary || '').length,
      accountId: data.accountId || null,
      ownerId: data.ownerId || null,
      source: data.source || '',
      type: data.type || '',
    };
  }

  /**
   * Store evaluation in database
   */
  private async storeEvaluation(evaluation: RiskEvaluationResult, tenantId: string): Promise<void> {
    try {
      const container = getContainer('risk_evaluations');
      
      await container.items.create(
        {
          id: evaluation.evaluationId,
          tenantId,
          ...evaluation,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { partitionKey: tenantId } as Parameters<typeof container.items.create>[1]
      );
    } catch (error: unknown) {
      log.error('Failed to store evaluation', error instanceof Error ? error : new Error(String(error)), {
        evaluationId: evaluation.evaluationId,
        tenantId,
        service: 'risk-analytics',
      });
    }
  }

  /**
   * Calculate revenue at risk
   */
  async calculateRevenueAtRisk(
    opportunityId: string,
    tenantId: string,
    riskScore: number
  ): Promise<RevenueAtRiskCalculation> {
    try {
      const opportunityShard = await this.getOpportunityShard(opportunityId, tenantId);
      const opportunityValue = opportunityShard?.structuredData?.amount || 0;
      const revenueAtRisk = this.revenueAtRiskFromScore(riskScore, opportunityValue);

      const calculation: RevenueAtRiskCalculation = {
        opportunityId,
        revenueAtRisk,
        riskScore,
        opportunityValue,
        calculatedAt: new Date(),
      };

      // Store in database
      const container = getContainer('risk_revenue_at_risk');
      await container.items.create(
        {
          id: uuidv4(),
          tenantId,
          ...calculation,
          createdAt: new Date(),
        },
        { partitionKey: tenantId } as Parameters<typeof container.items.create>[1]
      );

      // Publish event
      await publishRiskAnalyticsEvent('revenue.at_risk.calculated', tenantId, {
        opportunityId,
        revenueAtRisk,
        riskScore,
      });

      return calculation;
    } catch (error: unknown) {
      log.error('Failed to calculate revenue at risk', error instanceof Error ? error : new Error(String(error)), {
        opportunityId,
        tenantId,
        service: 'risk-analytics',
      });
      throw error;
    }
  }
}
