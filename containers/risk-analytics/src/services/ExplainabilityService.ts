/**
 * Explainability Service (Plan W5 Layer 4)
 * Persists and caches Explanation and GlobalFeatureImportance; derives factors from evaluations.
 */

import { getContainer } from '@coder/shared/database';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import type {
  Explanation,
  Factor,
  GlobalFeatureImportance,
  FeatureImportanceItem,
  ExplainPredictionRequest,
  ExplainBatchRequest,
} from '../types/explanation.types';

const EXPLANATION_CACHE_TTL_MS = 3600 * 1000; // 1 hour

interface CachedExplanation {
  explanation: Explanation;
  expiresAt: number;
}

export class ExplainabilityService {
  private config: ReturnType<typeof loadConfig>;
  private explanationsContainerName: string;
  private globalImportanceContainerName: string;
  private cache: Map<string, CachedExplanation> = new Map();

  constructor() {
    this.config = loadConfig();
    this.explanationsContainerName = this.config.cosmos_db.containers.explanations ?? 'risk_explanations';
    this.globalImportanceContainerName = this.config.cosmos_db.containers.global_feature_importance ?? 'risk_global_feature_importance';
  }

  /**
   * Get explanation by predictionId (cache then Cosmos).
   */
  async getExplanationByPredictionId(predictionId: string, tenantId: string): Promise<Explanation | null> {
    const cacheKey = `${tenantId}:${predictionId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.explanation;
    }
    if (cached) this.cache.delete(cacheKey);

    const container = getContainer(this.explanationsContainerName);
    const id = `explanation_${predictionId}`;
    try {
      const { resource } = await container.item(id, tenantId).read();
      if (!resource) return null;
      const explanation = resource as Explanation;
      this.setCachedExplanation(tenantId, predictionId, explanation);
      return explanation;
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === 404) return null;
      throw err;
    }
  }

  /**
   * Get factors for a prediction (positive + negative).
   */
  async getFactorsByPredictionId(predictionId: string, tenantId: string): Promise<{ positiveFactors: Factor[]; negativeFactors: Factor[] } | null> {
    const explanation = await this.getExplanationByPredictionId(predictionId, tenantId);
    if (!explanation) return null;
    return {
      positiveFactors: explanation.positiveFactors ?? [],
      negativeFactors: explanation.negativeFactors ?? [],
    };
  }

  /**
   * Get global feature importance for a model. Tries tenantId first, then 'global' partition.
   */
  async getGlobalFeatureImportance(modelId: string, tenantId?: string): Promise<GlobalFeatureImportance | null> {
    const container = getContainer(this.globalImportanceContainerName);
    if (tenantId) {
      try {
        const { resource } = await container.item(modelId, tenantId).read();
        if (resource) return resource as GlobalFeatureImportance;
      } catch (err: unknown) {
        const code = (err as { code?: number })?.code;
        if (code !== 404) throw err;
      }
    }
    try {
      const { resource } = await container.item(modelId, 'global').read();
      return resource as GlobalFeatureImportance | null;
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === 404) return null;
      throw err;
    }
  }

  /**
   * Save explanation to Cosmos and cache.
   */
  async saveExplanation(explanation: Explanation): Promise<void> {
    const container = getContainer(this.explanationsContainerName);
    await container.items.upsert(explanation);
    this.setCachedExplanation(explanation.tenantId, explanation.predictionId, explanation);
  }

  /**
   * Save global feature importance (partition tenantId = 'global' for model-level).
   */
  async saveGlobalFeatureImportance(global: GlobalFeatureImportance): Promise<void> {
    const container = getContainer(this.globalImportanceContainerName);
    await container.items.upsert(global);
  }

  /**
   * Generate explanation from evaluation (derive factors from detectedRisks and categoryScores).
   */
  async explainFromEvaluation(
    evaluationId: string,
    opportunityId: string,
    tenantId: string,
    modelId: string
  ): Promise<Explanation> {
    const container = getContainer('risk_evaluations');
    const { resource: evaluation } = await container.item(evaluationId, tenantId).read();
    if (!evaluation) {
      throw new Error('Risk evaluation not found');
    }

    const ev = evaluation as {
      opportunityId?: string;
      riskScore?: number;
      detectedRisks?: Array<{ riskName?: string; contribution?: number; category?: string }>;
      categoryScores?: Record<string, number>;
    };
    const effectiveOpportunityId = (opportunityId || ev.opportunityId) ?? '';
    const riskScore = typeof ev.riskScore === 'number' ? ev.riskScore : 0;
    const risks = ev.detectedRisks ?? [];
    const categoryScores = ev.categoryScores ?? {};

    const positiveFactors: Factor[] = risks.slice(0, 5).map((r, _i) => ({
      feature: r.riskName ?? 'Risk',
      value: r.contribution,
      impact: typeof r.contribution === 'number' ? r.contribution : 0.1,
      importance: Math.abs(typeof r.contribution === 'number' ? r.contribution : 0.1),
      category: r.category ?? 'risk',
      description: `${r.riskName ?? 'Risk'} contributes to risk score`,
      unit: undefined,
    }));

    const negativeFactors: Factor[] = Object.entries(categoryScores)
      .filter(([, v]) => typeof v === 'number' && v < 0.3)
      .slice(0, 3)
      .map(([name, v], _i) => ({
        feature: name,
        value: v,
        impact: -(0.3 - (v as number)),
        importance: Math.abs(0.3 - (v as number)),
        category: 'category',
        description: `Lower ${name} score reduces risk`,
        unit: undefined,
      }));

    const shapValues: Record<string, number> = {};
    positiveFactors.forEach((f) => { shapValues[f.feature] = f.impact; });
    negativeFactors.forEach((f) => { shapValues[f.feature] = f.impact; });

    const now = new Date().toISOString();
    const explanation: Explanation = {
      id: `explanation_${evaluationId}`,
      tenantId,
      predictionId: evaluationId,
      opportunityId: effectiveOpportunityId,
      modelId,
      baseValue: 0,
      prediction: riskScore,
      positiveFactors,
      negativeFactors,
      shapValues,
      confidence: riskScore > 0.7 ? 'high' : riskScore > 0.4 ? 'medium' : 'low',
      detailLevel: 'standard',
      generatedAt: now,
      createdAt: now,
    };

    await this.saveExplanation(explanation);
    return explanation;
  }

  /**
   * Explain prediction: generate from evaluationId or return cached/stored by predictionId.
   */
  async explainPrediction(request: ExplainPredictionRequest, tenantId: string): Promise<Explanation> {
    const { predictionId, opportunityId, modelId, evaluationId } = request;
    const effectivePredictionId = predictionId ?? evaluationId;
    const effectiveModelId = modelId ?? 'risk_evaluation';

    if (evaluationId) {
      const existing = await this.getExplanationByPredictionId(evaluationId, tenantId);
      if (existing) return existing;
      const oppId = opportunityId ?? '';
      return this.explainFromEvaluation(evaluationId, oppId, tenantId, effectiveModelId);
    }

    if (effectivePredictionId) {
      const existing = await this.getExplanationByPredictionId(effectivePredictionId, tenantId);
      if (existing) return existing;
    }

    throw new Error('Either evaluationId or an existing predictionId is required to generate explanation');
  }

  /**
   * Batch explain: multiple predictionIds or evaluationIds.
   */
  async explainBatch(request: ExplainBatchRequest, tenantId: string): Promise<Explanation[]> {
    const results: Explanation[] = [];
    const evaluationIds = request.evaluationIds ?? [];
    const predictionIds = request.predictionIds ?? [];

    const container = getContainer('risk_evaluations');
    for (const evaluationId of evaluationIds) {
      try {
        const { resource: evaluation } = await container.item(evaluationId, tenantId).read();
        if (!evaluation) continue;
        const oppId = (evaluation as { opportunityId?: string }).opportunityId ?? '';
        const explanation = await this.explainFromEvaluation(evaluationId, oppId, tenantId, 'risk_evaluation');
        results.push(explanation);
      } catch (err) {
        log.warn('Batch explain skip evaluation', { evaluationId, tenantId, err });
      }
    }

    for (const predictionId of predictionIds) {
      try {
        const explanation = await this.getExplanationByPredictionId(predictionId, tenantId);
        if (explanation) results.push(explanation);
      } catch (err) {
        log.warn('Batch explain skip prediction', { predictionId, tenantId, err });
      }
    }

    return results;
  }

  /**
   * Invalidate explanation cache for a prediction (e.g. on model/feature version change).
   */
  invalidateCache(predictionId: string, tenantId: string): void {
    this.cache.delete(`${tenantId}:${predictionId}`);
  }

  private setCachedExplanation(tenantId: string, predictionId: string, explanation: Explanation): void {
    this.cache.set(`${tenantId}:${predictionId}`, {
      explanation,
      expiresAt: Date.now() + EXPLANATION_CACHE_TTL_MS,
    });
  }

  /**
   * Upsert global feature importance (e.g. from batch aggregation). Caller sets id = modelId, tenantId = 'global'.
   */
  async upsertGlobalFeatureImportance(
    modelId: string,
    featureImportance: FeatureImportanceItem[],
    sampleSize: number,
    tenantId: string = 'global'
  ): Promise<GlobalFeatureImportance> {
    const now = new Date().toISOString();
    const global: GlobalFeatureImportance = {
      id: modelId,
      tenantId,
      modelId,
      featureImportance: featureImportance.map((f, i) => ({ ...f, rank: i + 1 })),
      sampleSize,
      calculatedAt: now,
    };
    await this.saveGlobalFeatureImportance(global);
    return global;
  }
}
