/**
 * Forecasting Service
 * Forecast decomposition, consensus forecasting, and commitment analysis
 * Uses CAIS (adaptive-learning) for learned weights
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import {
  ForecastRequest,
  ForecastResult,
  ForecastDecomposition,
  ConsensusForecast,
  ForecastCommitment,
  PipelineHealth,
  LearnedWeights,
  ModelSelection,
  TeamForecastAggregateRequest,
  TeamForecastAggregateResult,
  TenantForecastAggregateRequest,
  TenantForecastAggregateResult,
} from '../types/forecasting.types';
import { publishForecastEvent } from '../events/publishers/ForecastingEventPublisher';
import { v4 as uuidv4 } from 'uuid';
import { ForecastAccuracyService } from './ForecastAccuracyService';

export class ForecastingService {
  private config: ReturnType<typeof loadConfig>;
  private adaptiveLearningClient: ServiceClient;
  private mlServiceClient: ServiceClient;
  private analyticsServiceClient: ServiceClient;
  private riskAnalyticsClient: ServiceClient;
  private shardManagerClient: ServiceClient;
  private accuracyService: ForecastAccuracyService;
  private app: FastifyInstance | null = null;

  constructor(app?: FastifyInstance) {
    this.app = app || null;
    this.config = loadConfig();
    this.accuracyService = new ForecastAccuracyService();
    
    // Initialize service clients
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

    this.analyticsServiceClient = new ServiceClient({
      baseURL: this.config.services.analytics_service?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.riskAnalyticsClient = new ServiceClient({
      baseURL: this.config.services.risk_analytics?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });
    
    // Note: risk_analytics service URL should be configured
    if (!this.config.services.risk_analytics?.url) {
      log.warn('Risk analytics service URL not configured', { service: 'forecasting' });
    }

    this.shardManagerClient = new ServiceClient({
      baseURL: this.config.services.shard_manager?.url || '',
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
      return '';
    }
    return generateServiceToken(this.app, {
      serviceId: 'forecasting',
      serviceName: 'forecasting',
      tenantId,
    });
  }

  /**
   * Get learned weights from adaptive-learning service
   */
  async getLearnedWeights(tenantId: string): Promise<LearnedWeights> {
    try {
      const token = this.getServiceToken(tenantId);
      const response = await this.adaptiveLearningClient.get<LearnedWeights>(
        `/api/v1/adaptive-learning/weights/${tenantId}?component=forecasting`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );
      return response || { decomposition: 0.3, consensus: 0.4, commitment: 0.3, ml: 0.2 };
    } catch (error: unknown) {
      log.warn('Failed to get learned weights, using defaults', {
        error: error instanceof Error ? error.message : String(error),
        tenantId,
        service: 'forecasting',
      });
      return { decomposition: 0.3, consensus: 0.4, commitment: 0.3, ml: 0.2 };
    }
  }

  /**
   * Get model selection from adaptive-learning service
   */
  async getModelSelection(tenantId: string): Promise<ModelSelection> {
    try {
      const token = this.getServiceToken(tenantId);
      const response = await this.adaptiveLearningClient.get<ModelSelection>(
        `/api/v1/adaptive-learning/model-selection/${tenantId}?context=forecasting`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );
      return response || { modelId: 'default-forecast-model', confidence: 0.8 };
    } catch (error: unknown) {
      log.warn('Failed to get model selection, using default', {
        error: error instanceof Error ? error.message : String(error),
        tenantId,
        service: 'forecasting',
      });
      return { modelId: 'default-forecast-model', confidence: 0.8 };
    }
  }

  /**
   * Generate forecast (async via events or synchronous)
   */
  async generateForecast(request: ForecastRequest): Promise<ForecastResult> {
    const startTime = Date.now();
    const forecastId = uuidv4();

    try {
      log.info('Starting forecast generation', {
        forecastId,
        opportunityId: request.opportunityId,
        tenantId: request.tenantId,
        service: 'forecasting',
      });

      // Publish started event
      await publishForecastEvent('forecast.decomposition.started', request.tenantId, {
        forecastId,
        opportunityId: request.opportunityId,
      });

      // Step 1: Get learned weights from adaptive-learning (REST)
      const weights = await this.getLearnedWeights(request.tenantId);
      log.debug('Retrieved learned weights', {
        weights,
        tenantId: request.tenantId,
        service: 'forecasting',
      });

      // Step 2: Get opportunity data
      const opportunityShard = await this.getOpportunityShard(request.opportunityId, request.tenantId);
      const opportunityValue = opportunityShard?.structuredData?.amount || 0;

      // Step 3: Perform forecast decomposition
      let decomposition: ForecastDecomposition | undefined;
      if (request.includeDecomposition !== false && weights.decomposition && weights.decomposition > 0) {
        decomposition = await this.decomposeForecast(request.opportunityId, request.tenantId, opportunityValue, opportunityShard);
      }

      // Step 4: Perform consensus forecasting
      let consensus: ConsensusForecast | undefined;
      if (request.includeConsensus !== false && weights.consensus && weights.consensus > 0) {
        consensus = await this.generateConsensus(request.opportunityId, request.tenantId, opportunityValue);
      }

      // Step 5: Perform forecast commitment analysis
      let commitment: ForecastCommitment | undefined;
      if (request.includeCommitment !== false && weights.commitment && weights.commitment > 0) {
        commitment = await this.analyzeCommitment(request.opportunityId, request.tenantId, opportunityValue);
      }

      // Step 6: Get ML-powered forecast with P10/P50/P90 and scenarios (MISSING_FEATURES 5.1)
      let mlForecast: any = null;
      if (weights.ml && weights.ml > 0 && this.config.services.ml_service?.url) {
        try {
          const modelSelection = await this.getModelSelection(request.tenantId);
          const token = this.getServiceToken(request.tenantId);
          const mlResponse = await this.mlServiceClient.post<any>(
            '/api/v1/ml/forecast/predict',
            {
              opportunityId: request.opportunityId,
              tenantId: request.tenantId,
              level: 'opportunity',
              modelId: modelSelection.modelId,
              features: {
                opportunityValue,
                probability: opportunityShard?.structuredData?.probability || 0.5,
                stage: opportunityShard?.structuredData?.stage || '',
                daysInStage: opportunityShard?.structuredData?.daysInStage || 0,
              },
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'X-Tenant-ID': request.tenantId,
              },
            }
          );

          mlForecast = mlResponse;
          log.debug('Retrieved ML-powered forecast', {
            opportunityId: request.opportunityId,
            mlForecast: mlForecast ? {
              pointForecast: mlForecast.pointForecast,
              uncertainty: mlForecast.uncertainty ? 'present' : 'missing',
            } : null,
            service: 'forecasting',
          });
        } catch (error: unknown) {
          log.warn('ML forecast failed, continuing without ML', {
            error: error instanceof Error ? error.message : String(error),
            opportunityId: request.opportunityId,
            tenantId: request.tenantId,
            service: 'forecasting',
          });
        }
      }

      // Step 7: Calculate final revenue forecast (combine ML + decomposition + consensus + commitment)
      const revenueForecast = this.calculateRevenueForecast(
        opportunityValue,
        decomposition,
        consensus,
        commitment,
        mlForecast,
        weights
      );

      const confidence = this.calculateConfidence(decomposition, consensus, commitment, mlForecast);

      // Step 6b: Risk-adjusted revenue (MISSING_FEATURES 5.1) when risk_analytics is configured
      let riskAdjustedRevenue: number | undefined;
      if (this.config.services.risk_analytics?.url) {
        try {
          const token = this.getServiceToken(request.tenantId);
          const evalRes = await this.riskAnalyticsClient.get<{ riskScore?: number }>(
            `/api/v1/risk/opportunities/${request.opportunityId}/latest-evaluation`,
            { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': request.tenantId } }
          );
          const rs = evalRes?.riskScore ?? 0;
          riskAdjustedRevenue = revenueForecast * (1 - rs);
        } catch {
          /* optional: skip when no evaluation or service down */
        }
      }

      // Step 7: Build forecast result (ML: P10/P50/P90, scenarios; riskAdjustedRevenue)
      const result: ForecastResult = {
        forecastId,
        opportunityId: request.opportunityId,
        revenueForecast,
        confidence,
        decomposition,
        consensus,
        commitment,
        ...(riskAdjustedRevenue != null && { riskAdjustedRevenue }),
        mlForecast: mlForecast ? {
          pointForecast: mlForecast.pointForecast,
          uncertainty: mlForecast.uncertainty,
          scenarios: mlForecast.scenarios,
          confidence: mlForecast.confidence,
        } : undefined,
        calculatedAt: new Date(),
      };

      // Step 8: Store in database
      await this.storeForecast(result, request.tenantId);

      // Step 8b: Store prediction for accuracy tracking (MISSING_FEATURES 5.4)
      try {
        await this.accuracyService.storePrediction({
          tenantId: request.tenantId,
          opportunityId: request.opportunityId,
          forecastId: result.forecastId,
          forecastType: 'revenue',
          predictedValue: revenueForecast,
          predictedAt: result.calculatedAt,
        });
      } catch (err: unknown) {
        log.warn('Failed to store forecast prediction for accuracy', { error: (err as Error).message, forecastId: result.forecastId, tenantId: request.tenantId, service: 'forecasting' });
      }

      // Step 9: Publish completion event
      await publishForecastEvent('forecast.completed', request.tenantId, {
        forecastId,
        opportunityId: request.opportunityId,
        revenueForecast,
        confidence,
        workflowId: request.workflowId, // Include workflowId for tracking
        timestamp: new Date().toISOString(),
      });

      // Step 10: recordPrediction (REST) and publish outcome to adaptive-learning (MISSING_FEATURES 3.2)
      if (this.config.services.adaptive_learning?.url) {
        try {
          const token = this.getServiceToken(request.tenantId);
          await this.adaptiveLearningClient.post(
            '/api/v1/adaptive-learning/outcomes/record-prediction',
            {
              component: 'forecasting',
              predictionId: result.forecastId,
              context: {
                opportunityId: request.opportunityId,
                opportunityValue,
                decomposition: decomposition ? 'yes' : 'no',
                consensus: consensus ? 'yes' : 'no',
                commitment: commitment ? 'yes' : 'no',
              },
              predictedValue: revenueForecast,
            },
            { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': request.tenantId } }
          );
        } catch (e: unknown) {
          log.warn('recordPrediction (adaptive-learning) failed', { error: (e as Error).message, forecastId: result.forecastId, service: 'forecasting' });
        }
      }
      await publishForecastEvent('adaptive.learning.outcome.recorded', request.tenantId, {
        component: 'forecasting',
        prediction: revenueForecast,
        context: {
          opportunityId: request.opportunityId,
          opportunityValue,
          decomposition: decomposition ? 'yes' : 'no',
          consensus: consensus ? 'yes' : 'no',
          commitment: commitment ? 'yes' : 'no',
        },
      });

      log.info('Forecast generation completed', {
        forecastId,
        opportunityId: request.opportunityId,
        revenueForecast,
        confidence,
        durationMs: Date.now() - startTime,
        service: 'forecasting',
      });

      return result;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      log.error('Forecast generation failed', error instanceof Error ? error : new Error(errMsg), {
        forecastId,
        opportunityId: request.opportunityId,
        tenantId: request.tenantId,
        service: 'forecasting',
      });

      await publishForecastEvent('forecast.decomposition.failed', request.tenantId, {
        forecastId,
        opportunityId: request.opportunityId,
        error: errMsg || 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Decompose forecast
   * @param opportunityShard - optional; fetched if not provided (needed for industryId, temporal/seasonality; MISSING_FEATURES 5.6)
   */
  async decomposeForecast(
    opportunityId: string,
    tenantId: string,
    opportunityValue: number,
    opportunityShard?: any
  ): Promise<ForecastDecomposition> {
    const decompositionId = uuidv4();
    const forecastId = `forecast_${Date.now()}`;

    try {
      const shard = opportunityShard ?? (await this.getOpportunityShard(opportunityId, tenantId));
      const data = shard?.structuredData || {};
      const probability = data.probability || 0.5;
      const stage = data.stage || '';
      const daysInStage = data.daysInStage || 0;

      // Temporal features and industry seasonality (MISSING_FEATURES 5.6)
      const now = new Date();
      const month = now.getMonth() + 1;
      const quarter = Math.ceil(month / 3) as 1 | 2 | 3 | 4;
      const isYearEnd = month >= 10;
      const industryId = data.industryId ?? (data.account as any)?.industryId ?? null;
      const industryMult = this.getIndustrySeasonalityMultiplier(industryId, quarter);

      // Publish started event
      await publishForecastEvent('forecast.decomposition.started', tenantId, {
        forecastId,
        opportunityId,
      });

      // Time decomposition: trend, industry- and year-end–adjusted seasonality, irregular
      const trendFactor = Math.min(1, probability * 1.2);
      let seasonalityFactor = 0.2 * industryMult;
      if (isYearEnd) seasonalityFactor *= 1.05;
      seasonalityFactor = Math.min(0.5, Math.max(0.05, seasonalityFactor));
      const irregularFactor = Math.max(0, 1 - trendFactor - seasonalityFactor);
      
      // Source decomposition based on opportunity type/stage
      const isPipeline = stage && ['prospecting', 'qualification', 'proposal'].includes(stage.toLowerCase());
      const isNewBusiness = !data.accountId || data.type === 'new';
      const isExpansion = data.type === 'expansion' || data.type === 'upsell';
      const isRenewal = data.type === 'renewal';
      
      let pipelinePct = 0.7;
      let newBusinessPct = 0.2;
      let expansionsPct = 0.08;
      let renewalsPct = 0.02;
      
      if (isNewBusiness) {
        newBusinessPct = 0.5;
        pipelinePct = 0.4;
      } else if (isExpansion) {
        expansionsPct = 0.6;
        pipelinePct = 0.3;
      } else if (isRenewal) {
        renewalsPct = 0.8;
        pipelinePct = 0.1;
      }
      
      // Confidence decomposition based on probability and stage
      const commitFactor = probability * 0.8; // Conservative commit
      const bestCaseFactor = Math.min(1, probability * 1.5); // Optimistic
      const upsideFactor = Math.max(0, (bestCaseFactor - commitFactor) * 0.5);
      const riskFactor = (1 - probability) * 0.3;
      
      // Driver decomposition based on opportunity metrics
      const dealQuality = Math.min(1, probability * 0.9 + (data.amount > 0 ? 0.1 : 0));
      const velocity = Math.min(1, daysInStage > 0 ? 1 / (1 + daysInStage / 30) : 0.5);
      const conversion = probability;
      const newBusinessScore = isNewBusiness ? 0.6 : 0.4;

      const driverDecomposition = {
        dealQuality,
        velocity,
        conversion,
        newBusiness: newBusinessScore,
      };
      const confidenceDecomposition = {
        commit: opportunityValue * commitFactor,
        bestCase: opportunityValue * bestCaseFactor,
        upside: opportunityValue * upsideFactor,
        risk: opportunityValue * riskFactor,
      };
      const decomposition: ForecastDecomposition = {
        decompositionId,
        forecastId,
        tenantId,
        timeDecomposition: {
          trend: opportunityValue * trendFactor,
          seasonality: opportunityValue * seasonalityFactor,
          irregular: opportunityValue * irregularFactor,
        },
        temporalFeatures: { month, quarter, isYearEnd },
        industrySeasonalityMultiplier: industryMult,
        ...(industryId != null && { industryId }),
        sourceDecomposition: {
          pipeline: opportunityValue * pipelinePct,
          newBusiness: opportunityValue * newBusinessPct,
          expansions: opportunityValue * expansionsPct,
          renewals: opportunityValue * renewalsPct,
        },
        confidenceDecomposition,
        driverDecomposition,
        recommendations: this.generateDecompositionRecommendations({
          driverDecomposition,
          confidenceDecomposition,
        } as ForecastDecomposition),
        createdAt: new Date(),
      };

      // Store in database
      const container = getContainer('forecast_decompositions');
      await container.items.create(
        {
          id: decompositionId,
          tenantId,
          ...decomposition,
          createdAt: new Date(),
        },
        { partitionKey: tenantId }
      );

      // Publish completion event
      await publishForecastEvent('forecast.decomposition.completed', tenantId, {
        forecastId,
        opportunityId,
        decomposedForecast: decomposition,
      });

      return decomposition;
    } catch (error: unknown) {
      log.error('Forecast decomposition failed', error instanceof Error ? error : new Error(String(error)), {
        decompositionId,
        opportunityId,
        tenantId,
        service: 'forecasting',
      });
      throw error;
    }
  }

  /**
   * Generate consensus forecast
   */
  async generateConsensus(
    opportunityId: string,
    tenantId: string,
    opportunityValue: number
  ): Promise<ConsensusForecast> {
    const consensusId = uuidv4();
    const forecastId = `forecast_${Date.now()}`;

    try {
      // Publish started event
      await publishForecastEvent('forecast.consensus.started', tenantId, {
        forecastId,
        opportunityId,
      });

      // Implement consensus forecasting
      // Get opportunity shard for data
      const opportunityShard = await this.getOpportunityShard(opportunityId, tenantId);
      
      // Aggregate multiple forecast sources
      const sources: Array<{ source: string; forecast: number; weight: number; confidence: number }> = [];
      
      // Get decomposition if available
      const decompositionContainer = getContainer('forecast_decompositions');
      const decompositionQuery = {
        query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.forecastId = @forecastId ORDER BY c.createdAt DESC OFFSET 0 LIMIT 1',
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@forecastId', value: forecastId },
        ],
      };
      
      const { resources: decompositions } = await decompositionContainer.items
        .query(decompositionQuery, { partitionKey: tenantId })
        .fetchAll();
      
      if (decompositions && decompositions.length > 0) {
        const decomp = decompositions[0];
        // Add decomposition-based forecasts
        sources.push({
          source: 'decomposition_commit',
          forecast: decomp.confidenceDecomposition?.commit || opportunityValue * 0.5,
          weight: 0.4,
          confidence: 0.8,
        });
        sources.push({
          source: 'decomposition_best_case',
          forecast: decomp.confidenceDecomposition?.bestCase || opportunityValue * 1.2,
          weight: 0.2,
          confidence: 0.6,
        });
      }
      
      // Add probability-based forecast
      const data = opportunityShard?.structuredData || {};
      const probability = data.probability || 0.5;
      sources.push({
        source: 'probability_based',
        forecast: opportunityValue * probability,
        weight: 0.3,
        confidence: probability,
      });
      
      // Add stage-based forecast
      const stageMultiplier = this.getStageMultiplier(data.stage || '');
      sources.push({
        source: 'stage_based',
        forecast: opportunityValue * stageMultiplier,
        weight: 0.1,
        confidence: 0.7,
      });
      
      // Calculate weighted consensus
      let totalWeight = 0;
      let weightedSum = 0;
      let totalConfidence = 0;
      
      for (const source of sources) {
        totalWeight += source.weight;
        weightedSum += source.forecast * source.weight;
        totalConfidence += source.confidence * source.weight;
      }
      
      const consensusRevenue = totalWeight > 0 ? weightedSum / totalWeight : opportunityValue * probability;
      const consensusConfidence = totalWeight > 0 ? totalConfidence / totalWeight : probability;
      
      // Calculate disagreement (standard deviation of forecasts)
      const forecasts = sources.map(s => s.forecast);
      const mean = forecasts.length > 0 ? forecasts.reduce((sum, f) => sum + f, 0) / forecasts.length : opportunityValue;
      const variance = forecasts.length > 0 ? forecasts.reduce((sum, f) => sum + Math.pow(f - mean, 2), 0) / forecasts.length : 0;
      const disagreement = mean > 0 ? Math.sqrt(variance) / mean : 0; // Coefficient of variation

      const consensus: ConsensusForecast = {
        consensusId,
        forecastId,
        tenantId,
        period: 'Q1',
        consensusRevenue,
        confidence: consensusConfidence,
        sources,
        disagreement,
        createdAt: new Date(),
      };

      // Store in database
      const container = getContainer('forecast_consensus');
      await container.items.create(
        {
          id: consensusId,
          tenantId,
          ...consensus,
          createdAt: new Date(),
        },
        { partitionKey: tenantId }
      );

      // Publish completion event
      await publishForecastEvent('forecast.consensus.completed', tenantId, {
        forecastId,
        opportunityId,
        consensusForecast: consensus,
        confidence: consensus.confidence,
      });

      return consensus;
    } catch (error: unknown) {
      log.error('Consensus forecast failed', error instanceof Error ? error : new Error(String(error)), {
        consensusId,
        opportunityId,
        tenantId,
        service: 'forecasting',
      });
      throw error;
    }
  }

  /**
   * Analyze forecast commitment
   */
  async analyzeCommitment(
    opportunityId: string,
    tenantId: string,
    opportunityValue: number
  ): Promise<ForecastCommitment> {
    const commitmentId = uuidv4();
    const forecastId = `forecast_${Date.now()}`;

    try {
      // Publish started event
      await publishForecastEvent('forecast.commitment.started', tenantId, {
        forecastId,
        opportunityId,
      });

      // Implement commitment analysis
      const opportunityShard = await this.getOpportunityShard(opportunityId, tenantId);
      const data = opportunityShard?.structuredData || {};
      const probability = data.probability || 0.5;
      const stage = data.stage || '';
      const daysInStage = data.daysInStage || 0;
      
      // Analyze commitment factors
      const factors: Array<{ factor: string; impact: number; confidence: number }> = [];
      
      // Probability factor
      factors.push({
        factor: 'probability',
        impact: probability * 0.3,
        confidence: probability,
      });
      
      // Stage maturity factor
      const stageMaturity = this.getStageMaturity(stage);
      factors.push({
        factor: 'stage_maturity',
        impact: stageMaturity * 0.25,
        confidence: stageMaturity,
      });
      
      // Velocity factor (faster = higher commitment)
      const velocityScore = daysInStage > 0 ? Math.min(1, 1 / (1 + daysInStage / 60)) : 0.5;
      factors.push({
        factor: 'velocity',
        impact: velocityScore * 0.2,
        confidence: velocityScore,
      });
      
      // Deal size factor (larger deals = higher commitment)
      const dealSizeScore = opportunityValue > 0 ? Math.min(1, Math.log10(opportunityValue / 10000) / 3) : 0.5;
      factors.push({
        factor: 'deal_size',
        impact: dealSizeScore * 0.15,
        confidence: dealSizeScore,
      });
      
      // Data quality factor
      const dataQuality = this.calculateDataQuality(opportunityShard);
      factors.push({
        factor: 'data_quality',
        impact: dataQuality * 0.1,
        confidence: dataQuality,
      });
      
      // Calculate overall commitment
      const totalImpact = factors.reduce((sum, f) => sum + f.impact, 0);
      const avgConfidence = factors.reduce((sum, f) => sum + f.confidence, 0) / factors.length;
      
      let commitmentLevel: 'high' | 'medium' | 'low';
      if (totalImpact > 0.7 && avgConfidence > 0.8) {
        commitmentLevel = 'high';
      } else if (totalImpact > 0.5 && avgConfidence > 0.6) {
        commitmentLevel = 'medium';
      } else {
        commitmentLevel = 'low';
      }

      const commitment: ForecastCommitment = {
        commitmentId,
        forecastId,
        tenantId,
        commitmentLevel,
        confidence: avgConfidence,
        factors,
        createdAt: new Date(),
      };

      // Store in database
      const container = getContainer('forecast_commitments');
      await container.items.create(
        {
          id: commitmentId,
          tenantId,
          ...commitment,
          createdAt: new Date(),
        },
        { partitionKey: tenantId }
      );

      // Publish completion event
      await publishForecastEvent('forecast.commitment.completed', tenantId, {
        forecastId,
        opportunityId,
        commitmentLevel: commitment.commitmentLevel,
      });

      return commitment;
    } catch (error: unknown) {
      log.error('Forecast commitment analysis failed', error instanceof Error ? error : new Error(String(error)), {
        commitmentId,
        opportunityId,
        tenantId,
        service: 'forecasting',
      });
      throw error;
    }
  }

  /**
   * Calculate pipeline health
   */
  async calculatePipelineHealth(opportunityId: string, tenantId: string): Promise<PipelineHealth> {
    const healthId = uuidv4();

    try {
      // Implement pipeline health calculation
      const opportunityShard = await this.getOpportunityShard(opportunityId, tenantId);
      const data = opportunityShard?.structuredData || {};
      const probability = data.probability || 0.5;
      const stage = data.stage || '';
      const daysInStage = data.daysInStage || 0;
      
      // Quality score: based on data completeness and probability
      const dataQuality = this.calculateDataQuality(opportunityShard);
      const qualityScore = (dataQuality * 0.6) + (probability * 0.4);
      
      // Velocity score: based on days in stage (faster = better)
      const velocityScore = daysInStage > 0 ? Math.min(1, 1 / (1 + daysInStage / 45)) : 0.5;
      
      // Coverage score: based on opportunity value relative to quota (if available)
      const coverageScore = 0.9; // Default - would need quota data for accurate calculation
      
      // Risk score: inverse of probability (higher probability = lower risk)
      const riskScore = 1 - probability;
      
      // Maturity score: based on stage progression
      const maturityScore = this.getStageMaturity(stage);
      
      // Composite score: weighted average
      const compositeScore = (
        qualityScore * 0.25 +
        velocityScore * 0.2 +
        coverageScore * 0.2 +
        (1 - riskScore) * 0.2 +
        maturityScore * 0.15
      );

      const health: PipelineHealth = {
        healthId,
        tenantId,
        opportunityId,
        qualityScore,
        velocityScore,
        coverageScore,
        riskScore,
        maturityScore,
        compositeScore,
        createdAt: new Date(),
      };

      // Store in database
      const container = getContainer('forecast_pipeline_health');
      await container.items.create(
        {
          id: healthId,
          tenantId,
          ...health,
          createdAt: new Date(),
        },
        { partitionKey: tenantId }
      );

      return health;
    } catch (error: unknown) {
      log.error('Pipeline health calculation failed', error instanceof Error ? error : new Error(String(error)), {
        healthId,
        opportunityId,
        tenantId,
        service: 'forecasting',
      });
      throw error;
    }
  }

  /**
   * Industry seasonality multiplier from config (MISSING_FEATURES 5.6). Q1–Q4 keys.
   */
  private getIndustrySeasonalityMultiplier(industryId: string | null, quarter: 1 | 2 | 3 | 4): number {
    const cfg = (this.config as any).industry_seasonality as Record<string, Record<string, number> & { default?: number }> | undefined;
    if (!cfg) return 1;
    const q = `Q${quarter}`;
    if (industryId && typeof cfg[industryId] === 'object' && typeof (cfg[industryId] as Record<string, number>)[q] === 'number') {
      return (cfg[industryId] as Record<string, number>)[q];
    }
    return (typeof cfg.default === 'number' ? cfg.default : 1);
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
        service: 'forecasting',
      });
      throw error;
    }
  }

  /**
   * Calculate revenue forecast from components
   */
  private calculateRevenueForecast(
    baseValue: number,
    decomposition?: ForecastDecomposition,
    consensus?: ConsensusForecast,
    commitment?: ForecastCommitment,
    mlForecast?: any,
    weights?: LearnedWeights
  ): number {
    // Use ML forecast if available and weight > 0
    if (mlForecast && mlForecast.pointForecast && weights?.ml && weights.ml > 0) {
      // Combine ML forecast with other methods based on weights
      const mlWeight = weights.ml;
      const otherWeight = 1 - mlWeight;
      
      let otherForecast = baseValue;
      if (consensus) {
        otherForecast = consensus.consensusRevenue;
      } else if (decomposition) {
        otherForecast = decomposition.confidenceDecomposition.commit;
      }
      
      // Weighted combination of ML and other methods
      return mlForecast.pointForecast * mlWeight + otherForecast * otherWeight;
    }
    
    // Fallback to non-ML methods
    if (consensus) {
      return consensus.consensusRevenue;
    }
    if (decomposition) {
      return decomposition.confidenceDecomposition.commit;
    }
    return baseValue;
  }

  /**
   * Calculate overall confidence
   */
  private calculateConfidence(
    decomposition?: ForecastDecomposition,
    consensus?: ConsensusForecast,
    commitment?: ForecastCommitment,
    mlForecast?: any
  ): number {
    if (consensus) return consensus.confidence;
    if (commitment) return commitment.confidence;
    return 0.7; // Default
  }

  /**
   * Store forecast in database
   */
  private async storeForecast(result: ForecastResult, tenantId: string): Promise<void> {
    try {
      const container = getContainer('forecast_decompositions');
      await container.items.create(
        {
          id: result.forecastId,
          tenantId,
          ...result,
          createdAt: new Date(),
        },
        { partitionKey: tenantId }
      );
    } catch (error: unknown) {
      log.error('Failed to store forecast', error instanceof Error ? error : new Error(String(error)), {
        forecastId: result.forecastId,
        tenantId,
        service: 'forecasting',
      });
    }
  }

  /**
   * Team-level forecast aggregation (MISSING_FEATURES 5.5).
   * Sums latest revenue forecasts per opportunity. opportunityIds is required; obtain from pipeline/shard/analytics.
   */
  async aggregateTeamForecast(
    tenantId: string,
    request: TeamForecastAggregateRequest
  ): Promise<TeamForecastAggregateResult> {
    const { teamId, opportunityIds, startDate, endDate } = request;
    if (!opportunityIds || opportunityIds.length === 0) {
      return {
        teamId,
        totalPipeline: 0,
        opportunityCount: 0,
        calculatedAt: new Date(),
        period: startDate || endDate ? { startDate, endDate } : undefined,
      };
    }

    const container = getContainer('forecast_decompositions');
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId AND ARRAY_CONTAINS(@opportunityIds, c.opportunityId)';
    const parameters: { name: string; value: unknown }[] = [
      { name: '@tenantId', value: tenantId },
      { name: '@opportunityIds', value: opportunityIds },
    ];
    if (startDate) {
      query += ' AND c.calculatedAt >= @startDate';
      parameters.push({ name: '@startDate', value: startDate });
    }
    if (endDate) {
      query += ' AND c.calculatedAt <= @endDate';
      parameters.push({ name: '@endDate', value: endDate });
    }
    query += ' ORDER BY c.calculatedAt DESC';

    const { resources } = await container.items
      .query<ForecastResult & { calculatedAt?: string }>({ query, parameters }, { partitionKey: tenantId })
      .fetchAll();

    const byOpp = new Map<string, { revenueForecast: number; riskAdjustedRevenue?: number }>();
    for (const r of resources || []) {
      if (!byOpp.has(r.opportunityId)) {
        byOpp.set(r.opportunityId, {
          revenueForecast: r.revenueForecast,
          riskAdjustedRevenue: r.riskAdjustedRevenue,
        });
      }
    }

    let totalPipeline = 0;
    let totalRiskAdjusted = 0;
    for (const v of byOpp.values()) {
      totalPipeline += v.revenueForecast;
      if (v.riskAdjustedRevenue != null) totalRiskAdjusted += v.riskAdjustedRevenue;
    }

    return {
      teamId,
      totalPipeline,
      totalRiskAdjusted: totalRiskAdjusted > 0 ? totalRiskAdjusted : undefined,
      opportunityCount: byOpp.size,
      winRate: undefined,
      quotaAttainment: undefined,
      period: startDate || endDate ? { startDate, endDate } : undefined,
      calculatedAt: new Date(),
    };
  }

  /**
   * Tenant-level forecast aggregation (MISSING_FEATURES 5.5).
   * Sums latest revenue forecasts per opportunity for the tenant.
   */
  async aggregateTenantForecast(
    tenantId: string,
    request: TenantForecastAggregateRequest
  ): Promise<TenantForecastAggregateResult> {
    const { startDate, endDate } = request;

    const container = getContainer('forecast_decompositions');
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: { name: string; value: unknown }[] = [{ name: '@tenantId', value: tenantId }];
    if (startDate) {
      query += ' AND c.calculatedAt >= @startDate';
      parameters.push({ name: '@startDate', value: startDate });
    }
    if (endDate) {
      query += ' AND c.calculatedAt <= @endDate';
      parameters.push({ name: '@endDate', value: endDate });
    }
    query += ' ORDER BY c.calculatedAt DESC';

    const { resources } = await container.items
      .query<ForecastResult & { calculatedAt?: string }>({ query, parameters }, { partitionKey: tenantId })
      .fetchAll();

    const byOpp = new Map<string, { revenueForecast: number; riskAdjustedRevenue?: number }>();
    for (const r of resources || []) {
      if (!byOpp.has(r.opportunityId)) {
        byOpp.set(r.opportunityId, {
          revenueForecast: r.revenueForecast,
          riskAdjustedRevenue: r.riskAdjustedRevenue,
        });
      }
    }

    let totalRevenue = 0;
    let totalRiskAdjusted = 0;
    for (const v of byOpp.values()) {
      totalRevenue += v.revenueForecast;
      if (v.riskAdjustedRevenue != null) totalRiskAdjusted += v.riskAdjustedRevenue;
    }

    return {
      totalRevenue,
      totalRiskAdjusted: totalRiskAdjusted > 0 ? totalRiskAdjusted : undefined,
      opportunityCount: byOpp.size,
      growthRate: undefined,
      period: startDate || endDate ? { startDate, endDate } : undefined,
      calculatedAt: new Date(),
    };
  }

  /**
   * Parse period string to startDate/endDate (YYYY-MM-DD). Supports YYYY, YYYY-MM, YYYY-Q1..Q4.
   * Falls back to current month when unparseable.
   */
  private periodToDateRange(period: string): { startDate: string; endDate: string } {
    const now = new Date();
    const qMatch = period.match(/^(\d{4})-Q([1-4])$/i);
    if (qMatch) {
      const y = parseInt(qMatch[1], 10);
      const q = parseInt(qMatch[2], 10);
      const start = new Date(y, (q - 1) * 3, 1);
      const end = new Date(y, q * 3, 0);
      return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
    }
    const mmMatch = period.match(/^(\d{4})-(\d{2})$/);
    if (mmMatch) {
      const y = parseInt(mmMatch[1], 10);
      const m = parseInt(mmMatch[2], 10) - 1;
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
    }
    const yMatch = period.match(/^(\d{4})$/);
    if (yMatch) {
      const y = parseInt(yMatch[1], 10);
      return { startDate: `${y}-01-01`, endDate: `${y}-12-31` };
    }
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
  }

  /**
   * Get risk-adjusted forecast for a period (Plan §4.3, FIRST_STEPS §8).
   * Uses aggregateTenantForecast; risk-adjusted from stored riskAdjustedRevenue (from risk-analytics when generateForecast ran).
   * When no risk data: riskAdjustedForecast = forecast (degraded).
   */
  async getRiskAdjustedForecast(
    tenantId: string,
    period: string
  ): Promise<{ period: string; forecast: number; riskAdjustedForecast: number; opportunityCount: number; startDate?: string; endDate?: string }> {
    const { startDate, endDate } = this.periodToDateRange(period);
    const agg = await this.aggregateTenantForecast(tenantId, { startDate, endDate });
    const forecast = agg.totalRevenue ?? 0;
    const riskAdjustedForecast = agg.totalRiskAdjusted ?? forecast;
    return { period, forecast, riskAdjustedForecast, opportunityCount: agg.opportunityCount, startDate, endDate };
  }

  /**
   * Get ML-only forecast for a period (Plan §4.3, §877, FIRST_STEPS §8).
   * When ml_service.url set and history.length >= 2: build history from last 12 months (aggregateTenantForecast
   * per month, chronological), POST /api/v1/ml/forecast/period { history, periods: 1 }; use ML p10/p50/p90.
   * On 503, missing URL, history < 2, or other failure: stub from tenant aggregate (Plan §5.7).
   */
  async getMLForecast(
    tenantId: string,
    period: string
  ): Promise<{
    period: string;
    pointForecast: number;
    uncertainty: { p10: number; p50: number; p90: number };
    modelId: string;
    scenarios: Array<{ scenario: string; forecast: number; probability: number }>;
  }> {
    const { startDate, endDate } = this.periodToDateRange(period);

    const runStub = async () => {
      const agg = await this.aggregateTenantForecast(tenantId, { startDate, endDate });
      const p50 = agg.totalRevenue ?? 0;
      const p10 = p50 * 0.7;
      const p90 = p50 * 1.3;
      return {
        period,
        pointForecast: p50,
        uncertainty: { p10, p50, p90 },
        modelId: 'stub',
        scenarios: [
          { scenario: 'worst', forecast: p10, probability: 0.1 },
          { scenario: 'base', forecast: p50, probability: 0.5 },
          { scenario: 'best', forecast: p90, probability: 0.4 },
        ],
      };
    };

    if (!this.config.services.ml_service?.url) {
      return runStub();
    }

    const history: Array<[string, number]> = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const s = d.toISOString().slice(0, 10);
      const e = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
      const agg = await this.aggregateTenantForecast(tenantId, { startDate: s, endDate: e });
      history.push([s, agg.totalRevenue ?? 0]);
    }
    if (history.length < 2) {
      return runStub();
    }

    try {
      const token = this.getServiceToken(tenantId);
      const res = await this.mlServiceClient.post<{ p10: number; p50: number; p90: number; modelId?: string }>(
        '/api/v1/ml/forecast/period',
        { history, periods: 1 },
        { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId } }
      );
      return {
        period,
        pointForecast: res.p50,
        uncertainty: { p10: res.p10, p50: res.p50, p90: res.p90 },
        modelId: res.modelId ?? 'revenue-forecasting-model',
        scenarios: [
          { scenario: 'worst', forecast: res.p10, probability: 0.1 },
          { scenario: 'base', forecast: res.p50, probability: 0.5 },
          { scenario: 'best', forecast: res.p90, probability: 0.4 },
        ],
      };
    } catch {
      return runStub();
    }
  }

  /**
   * Get P10/P50/P90 scenario forecast for a period (Plan §4.3, §877, FIRST_STEPS §8).
   * When ml_service.url set and history (12 months, chronological) has ≥2 points: POST /api/v1/ml/forecast/period,
   * use Prophet p10/p50/p90. On missing URL, history < 2, 503, or failure: stub from tenant aggregate (no date filter).
   */
  async getScenarioForecast(
    tenantId: string,
    period: string
  ): Promise<{ period: string; p10: number; p50: number; p90: number; scenarios: Array<{ scenario: string; forecast: number; probability: number }> }> {
    const runStub = async () => {
      const agg = await this.aggregateTenantForecast(tenantId, {});
      const p50 = agg.totalRevenue ?? 0;
      const p10 = p50 * 0.7;
      const p90 = p50 * 1.3;
      return {
        period,
        p10,
        p50,
        p90,
        scenarios: [
          { scenario: 'worst', forecast: p10, probability: 0.1 },
          { scenario: 'base', forecast: p50, probability: 0.5 },
          { scenario: 'best', forecast: p90, probability: 0.4 },
        ],
      };
    };

    if (!this.config.services.ml_service?.url) {
      return runStub();
    }

    const history: Array<[string, number]> = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const s = d.toISOString().slice(0, 10);
      const e = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
      const agg = await this.aggregateTenantForecast(tenantId, { startDate: s, endDate: e });
      history.push([s, agg.totalRevenue ?? 0]);
    }
    if (history.length < 2) {
      return runStub();
    }

    try {
      const token = this.getServiceToken(tenantId);
      const res = await this.mlServiceClient.post<{ p10: number; p50: number; p90: number }>(
        '/api/v1/ml/forecast/period',
        { history, periods: 1 },
        { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId } }
      );
      return {
        period,
        p10: res.p10,
        p50: res.p50,
        p90: res.p90,
        scenarios: [
          { scenario: 'worst', forecast: res.p10, probability: 0.1 },
          { scenario: 'base', forecast: res.p50, probability: 0.5 },
          { scenario: 'best', forecast: res.p90, probability: 0.4 },
        ],
      };
    } catch {
      return runStub();
    }
  }

  /**
   * Generate recommendations from decomposition
   */
  private generateDecompositionRecommendations(decomposition: ForecastDecomposition): string[] {
    const recommendations: string[] = [];
    
    // Check driver scores and provide recommendations
    if (decomposition.driverDecomposition.dealQuality < 0.7) {
      recommendations.push('Improve deal quality through better qualification and stakeholder alignment');
    }
    
    if (decomposition.driverDecomposition.velocity < 0.6) {
      recommendations.push('Accelerate deal velocity - opportunity has been in current stage too long');
    }
    
    if (decomposition.driverDecomposition.conversion < 0.5) {
      recommendations.push('Focus on conversion improvement - probability is below optimal threshold');
    }
    
    if (decomposition.confidenceDecomposition.risk > decomposition.confidenceDecomposition.commit * 0.5) {
      recommendations.push('High risk component detected - consider risk mitigation strategies');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Opportunity is on track - maintain current approach');
    }
    
    return recommendations;
  }

  /**
   * Get stage multiplier for forecasting
   */
  private getStageMultiplier(stage: string): number {
    const stageMultipliers: Record<string, number> = {
      'prospecting': 0.1,
      'qualification': 0.2,
      'proposal': 0.4,
      'negotiation': 0.6,
      'closed_won': 1.0,
      'closed_lost': 0.0,
    };
    
    return stageMultipliers[stage.toLowerCase()] || 0.3;
  }

  /**
   * Get stage maturity score
   */
  private getStageMaturity(stage: string): number {
    const stageMaturity: Record<string, number> = {
      'prospecting': 0.2,
      'qualification': 0.4,
      'proposal': 0.6,
      'negotiation': 0.8,
      'closed_won': 1.0,
      'closed_lost': 0.0,
    };
    
    return stageMaturity[stage.toLowerCase()] || 0.5;
  }

  /**
   * Calculate data quality score
   */
  private calculateDataQuality(opportunityShard: any): number {
    const data = opportunityShard?.structuredData || {};
    let score = 0;
    let maxScore = 0;

    // Required fields
    const requiredFields = ['amount', 'stage', 'probability'];
    for (const field of requiredFields) {
      maxScore += 1;
      if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
        score += 1;
      }
    }

    // Important fields
    const importantFields = ['description', 'closeDate', 'accountId'];
    for (const field of importantFields) {
      maxScore += 0.5;
      if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
        score += 0.5;
      }
    }

    return maxScore > 0 ? Math.min(1, score / maxScore) : 0.5;
  }
}
