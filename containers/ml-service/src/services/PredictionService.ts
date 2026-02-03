/**
 * Prediction Service
 * Handles model predictions
 * Uses CAIS (adaptive-learning) for adaptive feature engineering and outcome collection
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { getRedisClient } from '@coder/shared/cache';
import { randomUUID } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { FastifyInstance } from 'fastify';
import { MLModelService } from './MLModelService';
import { FeatureService } from './FeatureService';
import { AzureMLClient } from '../clients/AzureMLClient';
import {
  Prediction,
  CreatePredictionInput,
  ModelStatus,
  ModelType,
} from '../types/ml.types';
import { loadConfig } from '../config';
import {
  publishMlPredictionCompleted,
  publishMlPredictionRequested,
  publishMlPredictionFailed,
} from '../events/publishers/MLServiceEventPublisher';

/** Model types that support prediction cache (W4 Layer 3). */
type CachedPredictionModelType = 'win_probability' | 'risk_scoring' | 'anomaly';

export class PredictionService {
  private containerName = 'ml_predictions';
  private modelService: MLModelService;
  private featureService: FeatureService;
  private azureMlClient: AzureMLClient;
  private adaptiveLearningClient: ServiceClient;
  private app: FastifyInstance | null = null;
  private config: ReturnType<typeof loadConfig>;
  private predictionCacheTtlSeconds: number = 0;

  constructor(
    modelService: MLModelService,
    featureService: FeatureService,
    azureMlClient: AzureMLClient,
    app?: FastifyInstance
  ) {
    this.modelService = modelService;
    this.featureService = featureService;
    this.azureMlClient = azureMlClient;
    this.app = app || null;
    this.config = loadConfig();
    if (this.config.cache?.redis?.enabled && this.config.cache.redis.url) {
      this.predictionCacheTtlSeconds = this.config.cache.redis.ttl_seconds ?? 3600;
    }
    this.adaptiveLearningClient = new ServiceClient({
      baseURL: this.config.services.adaptive_learning?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });
  }

  /** Cache key for prediction (W4 Layer 3: prediction cache; invalidation on opportunity.updated). */
  private predictionCacheKey(tenantId: string, opportunityId: string, modelType: CachedPredictionModelType): string {
    return `prediction:${tenantId}:${opportunityId}:${modelType}`;
  }

  /** Get cached prediction if Redis configured. */
  private async getCachedPrediction<T>(tenantId: string, opportunityId: string, modelType: CachedPredictionModelType): Promise<T | null> {
    if (this.predictionCacheTtlSeconds <= 0) return null;
    try {
      const client = getRedisClient({ url: this.config.cache!.redis!.url });
      const redis = await client.getClient();
      const raw = await redis.get(this.predictionCacheKey(tenantId, opportunityId, modelType));
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  /** Set cached prediction if Redis configured. */
  private async setCachedPrediction(tenantId: string, opportunityId: string, modelType: CachedPredictionModelType, payload: Record<string, unknown>): Promise<void> {
    if (this.predictionCacheTtlSeconds <= 0) return;
    try {
      const client = getRedisClient({ url: this.config.cache!.redis!.url });
      const redis = await client.getClient();
      await redis.setex(
        this.predictionCacheKey(tenantId, opportunityId, modelType),
        this.predictionCacheTtlSeconds,
        JSON.stringify(payload)
      );
    } catch {
      // non-fatal
    }
  }

  /**
   * Invalidate prediction cache for an opportunity (W4 Layer 3; call on opportunity.updated).
   */
  async invalidatePredictionCache(tenantId: string, opportunityId: string): Promise<void> {
    if (this.predictionCacheTtlSeconds <= 0) return;
    try {
      const client = getRedisClient({ url: this.config.cache!.redis!.url });
      const redis = await client.getClient();
      const pattern = `prediction:${tenantId}:${opportunityId}:*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) await redis.del(...keys);
    } catch {
      // non-fatal
    }
  }

  /**
   * Get service token for service-to-service authentication
   */
  private getServiceToken(tenantId: string): string {
    if (!this.app) {
      return '';
    }
    return generateServiceToken(this.app as any, {
      serviceId: 'ml-service',
      serviceName: 'ml-service',
      tenantId,
    });
  }

  /** Model selection from CAIS (adaptive-learning). Defaults on failure. */
  private async getModelSelection(tenantId: string, context: string = 'risk-scoring'): Promise<{ modelId: string; confidence: number }> {
    if (!this.config.services.adaptive_learning?.url) {
      return { modelId: context === 'forecasting' ? 'revenue-forecasting-model' : 'default-risk-model', confidence: 0.8 };
    }
    try {
      const token = this.getServiceToken(tenantId);
      const response = await this.adaptiveLearningClient.get<{ modelId: string; confidence: number }>(
        `/api/v1/adaptive-learning/model-selection/${tenantId}?context=${encodeURIComponent(context)}`,
        { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId } }
      );
      if (response && typeof response.modelId === 'string') {
        return { modelId: response.modelId, confidence: typeof response.confidence === 'number' ? response.confidence : 0.8 };
      }
      return { modelId: context === 'forecasting' ? 'revenue-forecasting-model' : 'default-risk-model', confidence: 0.8 };
    } catch (e: unknown) {
      console.warn('getModelSelection failed, using default', {
        error: e instanceof Error ? e.message : String(e),
        tenantId,
        context,
        service: 'ml-service',
      });
      return { modelId: context === 'forecasting' ? 'revenue-forecasting-model' : 'default-risk-model', confidence: 0.8 };
    }
  }

  /** Map model type to Azure ML endpoint key when endpoint is configured. */
  private endpointKeyForModelType(modelType: string): string | null {
    const map: Record<string, string> = {
      'risk-scoring': 'risk-scoring-model',
      risk_scoring: 'risk-scoring-model',
      'win-probability': 'win-probability-model',
      win_probability: 'win-probability-model',
      anomaly: 'anomaly',
      forecasting: 'revenue_forecasting',
    };
    return map[modelType] ?? null;
  }

  /**
   * Create prediction.
   * Uses Azure ML when an endpoint is configured for the model type; otherwise placeholder.
   */
  async predict(input: CreatePredictionInput): Promise<Prediction> {
    if (!input.tenantId || !input.modelId || !input.input) {
      throw new BadRequestError('tenantId, modelId, and input are required');
    }

    // Get model
    const model = await this.modelService.getById(input.modelId, input.tenantId);

    if (model.status !== ModelStatus.DEPLOYED && model.status !== ModelStatus.READY) {
      throw new BadRequestError('Model must be deployed or ready to make predictions');
    }

    // Validate input features match model features
    const inputKeys = Object.keys(input.input);
    const missingFeatures = model.features.filter((f) => !inputKeys.includes(f));
    if (missingFeatures.length > 0) {
      throw new BadRequestError(`Missing required features: ${missingFeatures.join(', ')}`);
    }

    const endpointKey = this.endpointKeyForModelType(model.type);
    const feat = input.input as Record<string, unknown>;
    const toNumeric = (o: Record<string, unknown>): Record<string, number> => {
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(o)) {
        const n = typeof v === 'number' ? v : Number(v);
        if (!isNaN(n)) out[k] = n;
      }
      return out;
    };

    let output: any;
    let confidence: number;

    if (endpointKey && this.azureMlClient.hasEndpoint(endpointKey)) {
      const numFeat = toNumeric(feat);
      if (Object.keys(numFeat).length > 0) {
        try {
          const score = await this.azureMlClient.predict(endpointKey, numFeat);
          output = model.type === ModelType.RISK_SCORING
            ? { riskScore: score }
            : model.type === ModelType.WIN_PROBABILITY
              ? { probability: score }
              : { value: score };
          confidence = 0.85;
        } catch (e: unknown) {
          console.warn('Azure ML predict failed, using placeholder', {
            error: e instanceof Error ? e.message : String(e),
            modelType: model.type,
            endpointKey,
            service: 'ml-service',
          });
          output = this.generatePlaceholderPrediction(model.type, input.input);
          confidence = this.calculatePlaceholderConfidence(model.metrics);
        }
      } else {
        output = this.generatePlaceholderPrediction(model.type, input.input);
        confidence = this.calculatePlaceholderConfidence(model.metrics);
      }
    } else {
      output = this.generatePlaceholderPrediction(model.type, input.input);
      confidence = this.calculatePlaceholderConfidence(model.metrics);
    }

    const prediction: Prediction = {
      id: uuidv4(),
      tenantId: input.tenantId,
      modelId: input.modelId,
      modelVersion: input.modelVersion || model.version,
      input: input.input,
      output,
      confidence,
      metadata: input.metadata,
      createdAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.items.create(prediction, {
        partitionKey: input.tenantId,
      } as Parameters<typeof container.items.create>[1]);

      if (!resource) {
        throw new Error('Failed to create prediction');
      }

      const saved = resource as Prediction;

      // recordPrediction for CAIS outcome collection (MISSING_FEATURES 3.2)
      if (this.config.services.adaptive_learning?.url) {
        try {
          const token = this.getServiceToken(input.tenantId);
          await this.adaptiveLearningClient.post(
            '/api/v1/adaptive-learning/outcomes/record-prediction',
            {
              component: 'ml-prediction',
              predictionId: saved.id,
              context: { modelId: input.modelId, modelVersion: model.version },
              predictedValue: saved.confidence,
            },
            { headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': input.tenantId } }
          );
        } catch (e: unknown) {
          console.warn('recordPrediction (adaptive-learning) failed', { error: (e as Error).message, predictionId: saved.id, service: 'ml-service' });
        }
      }

      return saved;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Record outcome for a prediction (for CAIS learning)
   */
  async recordOutcome(
    predictionId: string,
    tenantId: string,
    outcome: any
  ): Promise<void> {
    try {
      const token = this.getServiceToken(tenantId);
      await this.adaptiveLearningClient.post<any>(
        `/api/v1/adaptive-learning/outcomes/record-outcome`,
        {
          component: 'ml-prediction',
          predictionId,
          outcome,
          tenantId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );
    } catch (error: unknown) {
      // CAIS unavailable, log and continue
      const msg = error instanceof Error ? error.message : String(error);
      console.warn('Failed to record outcome for CAIS learning', { error: msg, predictionId, tenantId, service: 'ml-service' });
    }
  }

  /**
   * Generate placeholder prediction (for demonstration)
   */
  private generatePlaceholderPrediction(modelType: string, _input: Record<string, any>): any {
    // Placeholder logic - would be replaced with actual model inference
    switch (modelType) {
      case 'classification':
        return { class: 'positive', probability: 0.85 };
      case 'regression':
        return { value: 42.5 };
      case 'forecasting':
        return { forecast: [10, 12, 15, 18] };
      case 'recommendation':
        return { recommendations: ['item1', 'item2', 'item3'] };
      default:
        return { result: 'prediction' };
    }
  }

  /**
   * Calculate placeholder confidence (for demonstration)
   */
  private calculatePlaceholderConfidence(metrics?: any): number {
    // Placeholder logic - would use actual model confidence
    if (metrics?.accuracy) {
      return metrics.accuracy;
    }
    return 0.8; // Default confidence
  }

  /**
   * Win-probability prediction (BI_SALES_RISK Plan §5.4, §5.7).
   * buildVector('win-probability') → AzureMLClient('win-probability-model'); on failure use heuristic (vector.probability or 0.5).
   * W10: when tenant ML config has minConfidenceThreshold, response includes confidenceMet.
   * When feature_flags.persist_win_probability, upserts to ml_win_probability_predictions for trend API (Gap 9).
   */
  async predictWinProbability(tenantId: string, opportunityId: string): Promise<{ probability: number; confidenceMet?: boolean }> {
    const cached = await this.getCachedPrediction<{ probability: number }>(tenantId, opportunityId, 'win_probability');
    if (cached != null) return this.enrichWinProbabilityWithTenantConfig(tenantId, cached);
    const requestId = randomUUID();
    publishMlPredictionRequested(tenantId, { requestId, opportunityId, modelId: 'win-probability' });
    const t0 = Date.now();
    let modelId = 'heuristic';
    let vec = await this.featureService.buildVectorForOpportunity(tenantId, opportunityId, 'win-probability');
    if (vec == null) {
      const out = { probability: 0.5 };
      publishMlPredictionCompleted(tenantId, { modelId, opportunityId, inferenceMs: Date.now() - t0, requestId });
      this.tryPersistWinProbability(tenantId, opportunityId, out.probability, modelId);
      return this.enrichWinProbabilityWithTenantConfig(tenantId, out);
    }
    if (this.azureMlClient.hasEndpoint('win-probability-model')) {
      try {
        const p = await this.azureMlClient.predict('win-probability-model', vec);
        modelId = 'win-probability-model';
        const out = { probability: Math.min(1, Math.max(0, p)) };
        publishMlPredictionCompleted(tenantId, { modelId, opportunityId, inferenceMs: Date.now() - t0, requestId });
        this.tryPersistWinProbability(tenantId, opportunityId, out.probability, modelId);
        await this.setCachedPrediction(tenantId, opportunityId, 'win_probability', out);
        return this.enrichWinProbabilityWithTenantConfig(tenantId, out);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn('Azure ML win-probability-model failed, using heuristic', { opportunityId, error: msg, service: 'ml-service' });
      }
    }
    const p = (vec.probability != null && !isNaN(vec.probability)) ? vec.probability : 0.5;
    const out = { probability: Math.min(1, Math.max(0, p)) };
    publishMlPredictionCompleted(tenantId, { modelId, opportunityId, inferenceMs: Date.now() - t0, requestId });
    this.tryPersistWinProbability(tenantId, opportunityId, out.probability, modelId);
    await this.setCachedPrediction(tenantId, opportunityId, 'win_probability', out);
    return this.enrichWinProbabilityWithTenantConfig(tenantId, out);
  }

  /** W10: add confidenceMet from tenant ML config minConfidenceThreshold when present. */
  private async enrichWinProbabilityWithTenantConfig(
    tenantId: string,
    out: { probability: number }
  ): Promise<{ probability: number; confidenceMet?: boolean }> {
    const config = await this.featureService.getTenantMLConfig(tenantId);
    const threshold = config?.modelPreferences?.minConfidenceThreshold;
    if (typeof threshold !== 'number') return out;
    return { ...out, confidenceMet: out.probability >= threshold };
  }

  /**
   * Persist win-probability to ml_win_probability_predictions when feature_flags.persist_win_probability (Gap 9).
   */
  private tryPersistWinProbability(tenantId: string, opportunityId: string, probability: number, modelId?: string): void {
    if (!this.config.feature_flags?.persist_win_probability) return;
    try {
      const name = this.config.cosmos_db?.containers?.win_probability ?? 'ml_win_probability_predictions';
      const container = getContainer(name);
      const id = `${tenantId}_${opportunityId}_${Date.now()}`;
      const doc = { id, tenantId, opportunityId, probability, modelId: modelId ?? 'heuristic', createdAt: new Date().toISOString() };
      container.items.upsert(doc).then(() => {}).catch(() => {});
    } catch {
      // container not registered or write error; ignore
    }
  }

  /**
   * Get win-probability trend for an opportunity (Gap 6, Plan §4.2). Reads from ml_win_probability_predictions.
   */
  async getProbabilityTrend(
    tenantId: string,
    opportunityId: string,
    from?: string,
    to?: string
  ): Promise<{ points: { date: string; probability: number; confidence?: number }[] }> {
    let container;
    try {
      const name = this.config.cosmos_db?.containers?.win_probability ?? 'ml_win_probability_predictions';
      container = getContainer(name);
    } catch {
      return { points: [] };
    }
    let query = 'SELECT c.createdAt, c.probability FROM c WHERE c.tenantId = @tenantId AND c.opportunityId = @opportunityId';
    const parameters: { name: string; value: string }[] = [
      { name: '@tenantId', value: tenantId },
      { name: '@opportunityId', value: opportunityId },
    ];
    if (from) {
      query += ' AND c.createdAt >= @from';
      parameters.push({ name: '@from', value: from });
    }
    if (to) {
      query += ' AND c.createdAt <= @to';
      parameters.push({ name: '@to', value: to });
    }
    query += ' ORDER BY c.createdAt ASC';
    try {
      const { resources } = await (container.items as any)
        .query({ query, parameters }, { partitionKey: tenantId })
        .fetchAll();
      const points = (resources ?? []).map((r: { createdAt?: string; probability?: number }) => ({
        date: (r.createdAt || '').slice(0, 10),
        probability: typeof r.probability === 'number' ? r.probability : 0.5,
      }));
      return { points };
    } catch {
      return { points: [] };
    }
  }

  /**
   * Win-probability explain (Plan §905, §11.2). Top drivers from feature vector.
   * Phase 1: top features by |value|; Phase 2: tree feature importance or SHAP when available.
   */
  async getWinProbabilityExplain(tenantId: string, opportunityId: string): Promise<{ topDrivers: { feature: string; contribution: number; direction: 'increases' | 'decreases' }[] }> {
    const vec = await this.featureService.buildVectorForOpportunity(tenantId, opportunityId, 'win-probability');
    if (vec == null || typeof vec !== 'object') {
      return { topDrivers: [] };
    }
    const entries = Object.entries(vec)
      .filter(([k, v]) => k !== 'probability' && typeof v === 'number' && !isNaN(v))
      .map(([k, v]) => ({ feature: k, v: v as number }))
      .sort((a, b) => Math.abs(b.v) - Math.abs(a.v))
      .slice(0, 5);
    const topDrivers = entries.map(({ feature, v }) => ({
      feature,
      contribution: Math.round(Math.abs(v) * 1000) / 1000,
      direction: (v >= 0 ? 'increases' : 'decreases') as 'increases' | 'decreases',
    }));
    return { topDrivers };
  }

  /**
   * LSTM risk-trajectory (Plan §5.5, §875). sequence from risk_snapshots [riskScore, activity_count_30d, days_since_last_activity].
   * Returns { risk_30, risk_60, risk_90, confidence }. Caller (risk-analytics) builds sequence; fallback to rules when endpoint unavailable.
   */
  async predictLstmTrajectory(sequence: number[][]): Promise<{ risk_30: number; risk_60: number; risk_90: number; confidence: number }> {
    if (!this.azureMlClient.hasEndpoint('risk_trajectory_lstm')) {
      throw new Error('risk_trajectory_lstm endpoint not configured');
    }
    return this.azureMlClient.predictLstmTrajectory('risk_trajectory_lstm', sequence);
  }

  /**
   * Anomaly prediction (Plan §5.5). buildVector('anomaly') → Azure ML anomaly endpoint.
   * Returns { isAnomaly, anomalyScore }. No heuristic in ml-service; fallback is statistical in risk-analytics.
   */
  async predictAnomaly(tenantId: string, opportunityId: string): Promise<{ isAnomaly: number; anomalyScore: number }> {
    const cached = await this.getCachedPrediction<{ isAnomaly: number; anomalyScore: number }>(tenantId, opportunityId, 'anomaly');
    if (cached != null) return cached;
    const requestId = randomUUID();
    publishMlPredictionRequested(tenantId, { requestId, opportunityId, modelId: 'anomaly' });
    const t0 = Date.now();
    try {
      const vec = await this.featureService.buildVectorForOpportunity(tenantId, opportunityId, 'anomaly');
      if (vec == null) {
        throw new NotFoundError('Opportunity', '');
      }
      if (!this.azureMlClient.hasEndpoint('anomaly')) {
        throw new Error('Anomaly endpoint not configured');
      }
      const numFeat: Record<string, number> = {};
      for (const [k, v] of Object.entries(vec)) {
        const n = typeof v === 'number' ? v : Number(v);
        if (!isNaN(n)) numFeat[k] = n;
      }
      const out = await this.azureMlClient.predictAnomaly('anomaly', numFeat);
      publishMlPredictionCompleted(tenantId, { modelId: 'anomaly', opportunityId, inferenceMs: Date.now() - t0, requestId });
      await this.setCachedPrediction(tenantId, opportunityId, 'anomaly', { isAnomaly: out.isAnomaly, anomalyScore: out.anomalyScore });
      return { isAnomaly: out.isAnomaly, anomalyScore: out.anomalyScore };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      publishMlPredictionFailed(tenantId, { requestId, opportunityId, modelId: 'anomaly', error: msg, durationMs: Date.now() - t0 });
      throw e;
    }
  }

  /**
   * Risk-scoring prediction (MISSING_FEATURES 4.2, BI_SALES_RISK Plan §5.4).
   * When body.features missing: buildVector('risk-scoring'). If azure_ml.endpoints['risk-scoring-model']: try Azure ML first.
   * Then Cosmos model or heuristic.
   */
  async predictRiskScore(
    tenantId: string,
    body: { opportunityId: string; modelId?: string; features?: Record<string, unknown> }
  ): Promise<{ riskScore: number; confidence?: number; modelId?: string }> {
    if (!body.features || Object.keys(body.features).length === 0) {
      const cached = await this.getCachedPrediction<{ riskScore: number; confidence?: number; modelId?: string }>(tenantId, body.opportunityId, 'risk_scoring');
      if (cached != null) return cached;
    }
    const requestId = randomUUID();
    publishMlPredictionRequested(tenantId, { requestId, opportunityId: body.opportunityId, modelId: 'risk-scoring' });
    const t0 = Date.now();
    let features = body.features && Object.keys(body.features).length > 0 ? body.features : undefined;
    if (features == null) {
      const vec = await this.featureService.buildVectorForOpportunity(tenantId, body.opportunityId, 'risk-scoring');
      if (vec) {
        features = { ...vec, daysSinceUpdated: vec.days_in_stage ?? vec.days_since_last_activity ?? 0 } as Record<string, unknown>;
      } else {
        features = {};
      }
    }
    const feat = features as Record<string, unknown>;

    const toNumeric = (o: Record<string, unknown>): Record<string, number> => {
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(o)) {
        const n = typeof v === 'number' ? v : Number(v);
        if (!isNaN(n)) out[k] = n;
      }
      return out;
    };

    const modelSelection = await this.getModelSelection(tenantId, 'risk-scoring');
    const preferredEndpoint = this.azureMlClient.hasEndpoint(modelSelection.modelId) ? modelSelection.modelId : 'risk-scoring-model';
    if (this.azureMlClient.hasEndpoint(preferredEndpoint)) {
      const numFeat = toNumeric(feat);
      if (Object.keys(numFeat).length > 0) {
        try {
          const riskScore = await this.azureMlClient.predict(preferredEndpoint, numFeat);
          const out = { riskScore, confidence: modelSelection.confidence, modelId: preferredEndpoint };
          publishMlPredictionCompleted(tenantId, { modelId: preferredEndpoint, opportunityId: body.opportunityId, inferenceMs: Date.now() - t0, requestId });
          await this.setCachedPrediction(tenantId, body.opportunityId, 'risk_scoring', out);
          return out;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn('Azure ML risk-scoring failed, falling through', { opportunityId: body.opportunityId, endpoint: preferredEndpoint, error: msg, service: 'ml-service' });
        }
      }
    }

    if (body.modelId) {
      try {
        const model = await this.modelService.getById(body.modelId, tenantId);
        if (model.status === ModelStatus.DEPLOYED || model.status === ModelStatus.READY) {
          const pred = await this.predict({
            tenantId,
            modelId: body.modelId,
            input: { ...feat, opportunityId: body.opportunityId },
          });
          const v = (pred.output as any)?.riskScore ?? (pred.output as any)?.value;
          const riskScore =
            typeof v === 'number' ? Math.min(1, Math.max(0, v <= 1 ? v : v / 100)) : 0.5;
          const out = { riskScore, confidence: pred.confidence, modelId: body.modelId };
          publishMlPredictionCompleted(tenantId, { modelId: body.modelId!, opportunityId: body.opportunityId, inferenceMs: Date.now() - t0, requestId });
          await this.setCachedPrediction(tenantId, body.opportunityId, 'risk_scoring', out);
          return out;
        }
      } catch {
        /* fallthrough to heuristic */
      }
    }

    // Heuristic when no deployed model or on failure
    const p = (feat.probability as number) ?? 0.5;
    const days = (feat.daysSinceUpdated as number) ?? 0;
    let s = 0.3 + (1 - p) * 0.4 + Math.min(0.3, (days / 90) * 0.3);
    const out = { riskScore: Math.min(1, Math.max(0, s)), confidence: 0.5, modelId: body.modelId };
    publishMlPredictionCompleted(tenantId, { modelId: body.modelId || 'heuristic', opportunityId: body.opportunityId, inferenceMs: Date.now() - t0, requestId });
    await this.setCachedPrediction(tenantId, body.opportunityId, 'risk_scoring', out);
    return out;
  }

  /**
   * Prophet revenue-forecast for one or more periods (Plan §877).
   * Uses AzureMLClient.predictRevenueForecast('revenue_forecasting', history, periods).
   * @throws When revenue_forecasting endpoint is not configured (caller returns 503).
   */
  async predictRevenueForecastPeriod(
    history: Array<[string, number]>,
    periods?: number
  ): Promise<{ p10: number; p50: number; p90: number; modelId: string }> {
    if (!this.azureMlClient.hasEndpoint('revenue_forecasting')) {
      throw new Error('revenue_forecasting endpoint not configured');
    }
    const { p10, p50, p90 } = await this.azureMlClient.predictRevenueForecast(
      'revenue_forecasting',
      history,
      periods ?? 1
    );
    return { p10, p50, p90, modelId: 'revenue-forecasting-model' };
  }

  /**
   * Forecast prediction (MISSING_FEATURES 5.1).
   * Returns pointForecast, P10/P50/P90, and scenario (best/base/worst). Uses deployed model when available.
   */
  async predictForecast(
    tenantId: string,
    body: {
      opportunityId: string;
      level?: string;
      modelId?: string;
      features?: { opportunityValue?: number; probability?: number; stage?: string; daysInStage?: number };
    }
  ): Promise<{
    pointForecast: number;
    uncertainty?: { p10: number; p50: number; p90: number };
    scenarios?: Array<{ scenario: string; probability: number; forecast: number }>;
    confidence?: number;
  }> {
    const t0 = Date.now();
    const feat = body.features || {};
    const oppVal = (feat.opportunityValue as number) ?? 0;
    const prob = (feat.probability as number) ?? 0.5;
    const modelSelection = await this.getModelSelection(tenantId, 'forecasting');
    const preferredModelId = body.modelId ?? (modelSelection.modelId || undefined);

    if (preferredModelId) {
      try {
        const model = await this.modelService.getById(preferredModelId, tenantId);
        if (model.status === ModelStatus.DEPLOYED || model.status === ModelStatus.READY) {
          const pred = await this.predict({
            tenantId,
            modelId: preferredModelId,
            input: { ...feat, opportunityId: body.opportunityId },
          });
          const out = (pred.output as any) || {};
          const pt = typeof out.pointForecast === 'number' ? out.pointForecast
            : (typeof out.forecast === 'number' ? out.forecast : (typeof out.value === 'number' ? out.value : oppVal * prob));
          const p50 = out.uncertainty?.p50 ?? out.p50 ?? pt;
          const p10 = out.uncertainty?.p10 ?? out.p10 ?? p50 * 0.7;
          const p90 = out.uncertainty?.p90 ?? out.p90 ?? p50 * 1.3;
          const sc = out.scenarios || [
            { scenario: 'worst', probability: 0.1, forecast: p10 },
            { scenario: 'base', probability: 0.5, forecast: p50 },
            { scenario: 'best', probability: 0.4, forecast: p90 },
          ];
          publishMlPredictionCompleted(tenantId, { modelId: preferredModelId, opportunityId: body.opportunityId, inferenceMs: Date.now() - t0 });
          return {
            pointForecast: pt,
            uncertainty: { p10, p50, p90 },
            scenarios: sc,
            confidence: pred.confidence ?? modelSelection.confidence,
          };
        }
      } catch {
        /* fallthrough */
      }
    }

    const pointForecast = oppVal * prob;
    const p10 = pointForecast * 0.7;
    const p90 = pointForecast * 1.3;
    publishMlPredictionCompleted(tenantId, { modelId: 'heuristic', opportunityId: body.opportunityId, inferenceMs: Date.now() - t0 });
    return {
      pointForecast,
      uncertainty: { p10, p50: pointForecast, p90 },
      scenarios: [
        { scenario: 'worst', probability: 0.1, forecast: p10 },
        { scenario: 'base', probability: 0.5, forecast: pointForecast },
        { scenario: 'best', probability: 0.4, forecast: p90 },
      ],
      confidence: 0.65,
    };
  }

  /**
   * Get prediction by ID
   */
  async getById(predictionId: string, tenantId: string): Promise<Prediction> {
    if (!predictionId || !tenantId) {
      throw new BadRequestError('predictionId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName);
      const { resource } = await container.item(predictionId, tenantId).read<Prediction>();

      if (!resource) {
        throw new NotFoundError('Prediction', predictionId);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError('Prediction', predictionId);
      }
      throw error;
    }
  }

  /**
   * List predictions
   */
  async list(
    tenantId: string,
    filters?: {
      modelId?: string;
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<{ items: Prediction[]; continuationToken?: string }> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName);
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.modelId) {
      query += ' AND c.modelId = @modelId';
      parameters.push({ name: '@modelId', value: filters.modelId });
    }

    query += ' ORDER BY c.createdAt DESC';

    const limit = filters?.limit || 100;

    try {
      const { resources, continuationToken } = await container.items
        .query<Prediction>({
          query,
          parameters,
        })
        .fetchNext();

      return {
        items: resources.slice(0, limit),
        continuationToken,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to list predictions: ${msg}`);
    }
  }
}

