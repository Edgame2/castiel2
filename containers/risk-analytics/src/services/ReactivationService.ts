/**
 * Reactivation Service (W9 Layer 6 – REQUIREMENTS_GAP_ANALYSIS FR-6.7).
 * Evaluates opportunities for reactivation: calls ml-service for dormant features and prediction,
 * optionally llm-service for strategy; publishes reactivation.opportunity.identified and reactivation.strategy.generated.
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import {
  publishReactivationOpportunityIdentified,
  publishReactivationStrategyGenerated,
} from '../events/publishers/RiskAnalyticsEventPublisher';

export interface EvaluateReactivationOptions {
  minProbability?: number;
  maxOpportunities?: number;
  includeStrategy?: boolean;
}

export interface ReactivationEvaluationItem {
  opportunityId: string;
  dormantFeatures: Record<string, unknown>;
  reactivationPrediction: Record<string, unknown>;
  reactivationStrategy?: Record<string, unknown>;
}

export class ReactivationService {
  private mlServiceClient: ServiceClient | null = null;
  private llmServiceClient: ServiceClient | null = null;
  private app: FastifyInstance | null = null;
  private config: ReturnType<typeof loadConfig>;

  constructor(app: FastifyInstance) {
    this.app = app;
    this.config = loadConfig();
    const mlUrl = this.config.services?.ml_service?.url;
    if (mlUrl) {
      this.mlServiceClient = new ServiceClient({
        baseURL: mlUrl,
        timeout: 15000,
        retries: 2,
      });
    }
    // Reactivation strategy: use ai-service (llm-service merged into ai-service)
    const aiServiceUrl = this.config.services?.ai_service?.url;
    if (aiServiceUrl) {
      this.llmServiceClient = new ServiceClient({
        baseURL: aiServiceUrl,
        timeout: 20000,
        retries: 2,
      });
    }
  }

  /**
   * Evaluate opportunities for reactivation: get dormant features and prediction from ml-service,
   * optionally strategy from llm-service; publish events for each identified opportunity.
   */
  async evaluateReactivationOpportunities(
    tenantId: string,
    opportunityIds: string[],
    options: EvaluateReactivationOptions = {}
  ): Promise<ReactivationEvaluationItem[]> {
    const minProbability = options.minProbability ?? 0.3;
    const maxOpportunities = Math.min(options.maxOpportunities ?? 20, opportunityIds.length);
    const includeStrategy = options.includeStrategy === true && !!this.llmServiceClient; // ai-service hosts LLM reactivation/strategy

    if (!this.mlServiceClient) {
      log.warn('ml_service.url not configured; skipping reactivation evaluation', { service: 'risk-analytics' });
      return [];
    }

    const token = this.getServiceToken(tenantId);
    const headers: Record<string, string> = { 'X-Tenant-ID': tenantId };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const results: ReactivationEvaluationItem[] = [];
    const ids = opportunityIds.slice(0, maxOpportunities);

    for (const opportunityId of ids) {
      try {
        const featuresRes = await this.mlServiceClient.get<Record<string, unknown>>(
          `/api/v1/ml/features/reactivation?opportunityId=${encodeURIComponent(opportunityId)}`,
          { headers }
        );
        if (!featuresRes) continue;

        const predictionRes = await this.mlServiceClient.get<Record<string, unknown> & { reactivationProbability?: number }>(
          `/api/v1/ml/reactivation/predict?opportunityId=${encodeURIComponent(opportunityId)}`,
          { headers }
        );
        if (!predictionRes || (typeof predictionRes.reactivationProbability === 'number' && predictionRes.reactivationProbability < minProbability)) {
          continue;
        }

        const item: ReactivationEvaluationItem = {
          opportunityId,
          dormantFeatures: featuresRes,
          reactivationPrediction: predictionRes,
        };

        await publishReactivationOpportunityIdentified(tenantId, {
          opportunityId,
          dormantFeatures: featuresRes,
          reactivationPrediction: predictionRes,
        });

        if (includeStrategy && this.llmServiceClient) {
          try {
            const strategyRes = await this.llmServiceClient.post<{ reactivationStrategy?: Record<string, unknown> }>(
              '/api/v1/llm/reactivation/strategy',
              { opportunityId, dormantFeatures: featuresRes, reactivationPrediction: predictionRes },
              { headers }
            );
            const strategy = strategyRes?.reactivationStrategy;
            if (strategy) {
              item.reactivationStrategy = strategy;
              await publishReactivationStrategyGenerated(tenantId, {
                opportunityId,
                reactivationStrategy: strategy,
              });
            }
          } catch (err) {
            log.warn('ai-service reactivation strategy failed', { error: err instanceof Error ? err.message : String(err), opportunityId, service: 'risk-analytics' });
          }
        }

        results.push(item);
      } catch (err) {
        log.warn('Reactivation evaluation failed for opportunity', { error: err instanceof Error ? err.message : String(err), opportunityId, service: 'risk-analytics' });
      }
    }

    return results;
  }

  private getServiceToken(tenantId: string): string {
    if (!this.app) return '';
    return generateServiceToken(this.app, {
      serviceId: 'risk-analytics',
      serviceName: 'risk-analytics',
      tenantId,
    });
  }
}
