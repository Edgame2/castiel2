/**
 * Risk Evaluation Service
 * Core service for evaluating opportunities and detecting risks
 * Combines rule-based, AI-powered, and historical pattern matching
 * Uses CAIS (adaptive-learning) for learned weights
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { FastifyInstance } from 'fastify';
import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import {
  RiskEvaluationRequest,
  RiskEvaluationResult,
  RiskScoringRequest,
  RiskScoringResult,
  LearnedWeights,
  ModelSelection,
  RevenueAtRiskCalculation,
} from '../types/risk-analytics.types';
import { RiskCatalog, DetectedRisk } from '../../risk-catalog/src/types/risk-catalog.types';
import { publishRiskAnalyticsEvent } from '../events/publishers/RiskAnalyticsEventPublisher';
import { v4 as uuidv4 } from 'uuid';

// Default weights for fallback
const DEFAULT_WEIGHTS: LearnedWeights = {
  ruleBased: 1.0,
  ml: 0.9,
  ai: 0.8,
  historical: 0.9,
};

export class RiskEvaluationService {
  private config: ReturnType<typeof loadConfig>;
  private riskCatalogClient: ServiceClient;
  private adaptiveLearningClient: ServiceClient;
  private mlServiceClient: ServiceClient;
  private aiInsightsClient: ServiceClient;
  private shardManagerClient: ServiceClient;
  private evaluationCache = new Map<string, { evaluation: RiskEvaluationResult; expiresAt: number }>();
  private readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutes
  private app: FastifyInstance | null = null;

  constructor(app?: FastifyInstance) {
    this.app = app || null;
    this.config = loadConfig();
    
    // Initialize service clients
    this.riskCatalogClient = new ServiceClient({
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
  }

  /**
   * Get service token for service-to-service authentication
   */
  private getServiceToken(tenantId: string): string {
    if (!this.app) {
      // If app not available, return empty - will be handled by gateway/service mesh
      return '';
    }
    return generateServiceToken(this.app, {
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
    } catch (error: any) {
      log.warn('Failed to get learned weights, using defaults', {
        error: error.message,
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
    } catch (error: any) {
      log.warn('Failed to get model selection, using default', {
        error: error.message,
        tenantId,
        service: 'risk-analytics',
      });
      return { modelId: 'default-risk-model', confidence: 0.8 };
    }
  }

  /**
   * Get risk catalog from risk-catalog service
   */
  private async getRiskCatalog(tenantId: string, industryId?: string): Promise<RiskCatalog[]> {
    try {
      const url = industryId
        ? `/api/v1/risk-catalog/catalog/${tenantId}?industryId=${industryId}`
        : `/api/v1/risk-catalog/catalog/${tenantId}`;
      
      const token = this.getServiceToken(tenantId);
      const catalog = await this.riskCatalogClient.get<RiskCatalog[]>(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Tenant-ID': tenantId,
        },
      });
        headers: {
          'X-Tenant-ID': tenantId,
        },
      });
      return Array.isArray(catalog) ? catalog : [];
    } catch (error: any) {
      log.error('Failed to get risk catalog', error, {
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
    } catch (error: any) {
      log.error('Failed to get opportunity shard', error, {
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
      const detectedRisks = await this.detectRisks(
        opportunityShard,
        catalog,
        weights,
        request.options
      );

      // Step 4: Calculate risk scores
      const riskScore = this.calculateRiskScore(detectedRisks, weights);
      const categoryScores = this.calculateCategoryScores(detectedRisks);

      // Step 5: Calculate revenue at risk
      const opportunityValue = opportunityShard?.structuredData?.amount || 0;
      const revenueAtRisk = this.calculateRevenueAtRisk(riskScore, opportunityValue);

      // Step 6: Get ML risk score (optional, if ML weight > 0)
      let mlRiskScore: number | undefined;
      if (weights.ml && weights.ml > 0) {
        try {
          const modelSelection = await this.getModelSelection(request.tenantId, 'risk-scoring');
          const mlResult = await this.performMLRiskScoring(request.opportunityId, request.tenantId, modelSelection);
          mlRiskScore = mlResult.mlRiskScore;
          
          // Combine ML score with rule-based score
          const combinedScore = (riskScore * (1 - weights.ml!)) + (mlRiskScore * weights.ml!);
          // Use combined score if ML is significant
          if (weights.ml! > 0.3) {
            // Update risk score with ML contribution
          }
        } catch (error: any) {
          log.warn('ML risk scoring failed, continuing without ML', {
            error: error.message,
            opportunityId: request.opportunityId,
            service: 'risk-analytics',
          });
        }
      }

      // Step 7: Build evaluation result
      const evaluation: RiskEvaluationResult = {
        evaluationId,
        opportunityId: request.opportunityId,
        riskScore,
        categoryScores,
        detectedRisks,
        revenueAtRisk,
        calculatedAt: new Date(),
        trustLevel: this.calculateTrustLevel(detectedRisks, opportunityShard),
        qualityScore: this.calculateQualityScore(opportunityShard),
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

      // Step 11: Publish outcome to adaptive-learning for learning
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
    } catch (error: any) {
      log.error('Risk evaluation failed', error, {
        evaluationId,
        opportunityId: request.opportunityId,
        tenantId: request.tenantId,
        service: 'risk-analytics',
      });

      // Publish failure event
      await publishRiskAnalyticsEvent('risk.evaluation.failed', request.tenantId, {
        evaluationId,
        opportunityId: request.opportunityId,
        error: error.message || 'Unknown error',
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
      } catch (error: any) {
        log.warn('Failed to evaluate risk rule', {
          error: error.message,
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
    } catch (error: any) {
      log.warn('AI risk detection failed', {
        error: error.message,
        opportunityId: opportunityShard.id,
        service: 'risk-analytics',
      });
      return [];
    }
  }

  /**
   * Historical pattern matching
   */
  private async detectRisksHistorical(opportunityShard: any, catalog: RiskCatalog[]): Promise<DetectedRisk[]> {
    try {
      const token = this.getServiceToken(opportunityShard.tenantId);
      const data = opportunityShard?.structuredData || {};
      
      // Query similar opportunities from shard-manager
      const similarOpportunities = await this.shardManagerClient.post<any>(
        '/api/v1/shards/query',
        {
          shardType: 'opportunity',
          filters: {
            stage: data.stage,
            amount: { $gte: data.amount * 0.8, $lte: data.amount * 1.2 },
          },
          limit: 10,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': opportunityShard.tenantId,
          },
        }
      );

      const risks: DetectedRisk[] = [];
      
      // Analyze historical outcomes
      for (const similarOpp of (similarOpportunities.data || [])) {
        const outcome = similarOpp.structuredData?.outcome || similarOpp.structuredData?.status;
        
        // If similar opportunity had negative outcome, check for matching risks
        if (outcome === 'lost' || outcome === 'cancelled') {
          // Get risks that were detected for this similar opportunity
          const historicalEvaluation = await this.getHistoricalEvaluation(similarOpp.id, opportunityShard.tenantId);
          
          if (historicalEvaluation && historicalEvaluation.detectedRisks) {
            // Match risks that are still in catalog
            for (const historicalRisk of historicalEvaluation.detectedRisks) {
              const catalogRisk = catalog.find(r => r.riskId === historicalRisk.riskId);
              if (catalogRisk && catalogRisk.isActive) {
                risks.push({
                  ...historicalRisk,
                  confidence: historicalRisk.confidence * 0.7, // Reduce confidence for historical match
                  explainability: {
                    ...historicalRisk.explainability,
                    detectionMethod: 'historical',
                    evidence: {
                      ...historicalRisk.explainability?.evidence,
                      similarOpportunityId: similarOpp.id,
                      historicalOutcome: outcome,
                    },
                    reasoning: {
                      summary: `Risk detected based on historical pattern: similar opportunity ${outcome}`,
                      standard: `A similar opportunity (${similarOpp.id}) had outcome "${outcome}" and was associated with risk: ${historicalRisk.riskName}`,
                    },
                  },
                });
              }
            }
          }
        }
      }

      return this.deduplicateRisks(risks);
    } catch (error: any) {
      log.warn('Historical risk detection failed', {
        error: error.message,
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
    } catch (error: any) {
      log.warn('Failed to get historical evaluation', {
        error: error.message,
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
                      semanticMatch: true,
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
    } catch (error: any) {
      log.warn('Semantic risk detection failed', {
        error: error.message,
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
  private calculateRiskScore(risks: DetectedRisk[], weights: LearnedWeights): number {
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
   * Calculate revenue at risk
   */
  private calculateRevenueAtRisk(riskScore: number, opportunityValue: number): number {
    return riskScore * opportunityValue;
  }

  /**
   * Calculate trust level
   */
  private calculateTrustLevel(risks: DetectedRisk[], opportunityShard: any): 'high' | 'medium' | 'low' | 'unreliable' {
    if (risks.length === 0) return 'high';
    
    const data = opportunityShard?.structuredData || {};
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
    } catch (error: any) {
      log.error('ML risk scoring failed', error, {
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
        { partitionKey: tenantId }
      );
    } catch (error: any) {
      log.error('Failed to store evaluation', error, {
        evaluationId: evaluation.evaluationId,
        tenantId,
        service: 'risk-analytics',
      });
      // Don't throw - evaluation can continue without storage
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
      const revenueAtRisk = this.calculateRevenueAtRisk(riskScore, opportunityValue);

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
        { partitionKey: tenantId }
      );

      // Publish event
      await publishRiskAnalyticsEvent('revenue.at_risk.calculated', tenantId, {
        opportunityId,
        revenueAtRisk,
        riskScore,
      });

      return calculation;
    } catch (error: any) {
      log.error('Failed to calculate revenue at risk', error, {
        opportunityId,
        tenantId,
        service: 'risk-analytics',
      });
      throw error;
    }
  }
}
