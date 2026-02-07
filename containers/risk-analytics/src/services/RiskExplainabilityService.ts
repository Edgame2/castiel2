/**
 * Risk Explainability Service
 * Provides explainability for risk evaluations
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config';
import { log } from '../utils/logger';
import { RiskEvaluationResult, DetectedRisk } from '../types/risk-analytics.types';

export interface RiskExplainability {
  evaluationId: string;
  tenantId: string;
  summary: string;
  detailed: string;
  technical?: string;
  riskBreakdown: RiskBreakdown[];
  calculatedAt: Date | string;
}

export interface RiskBreakdown {
  riskId: string;
  riskName: string;
  category: string;
  contribution: number;
  explanation: string;
  evidence: string[];
}

export class RiskExplainabilityService {
  private config: ReturnType<typeof loadConfig>;
  private _aiServiceClient: ServiceClient;
  private app: FastifyInstance | null = null;

  constructor(app?: FastifyInstance) {
    this.app = app || null;
    this.config = loadConfig();
    
    this._aiServiceClient = new ServiceClient({
      baseURL: this.config.services.ai_service?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });
  }

  private getServiceToken(tenantId: string): string {
    if (!this.app) {
      return '';
    }
    return generateServiceToken(this.app as any, {
      serviceId: 'risk-analytics',
      serviceName: 'risk-analytics',
      tenantId,
    });
  }

  /**
   * Generate explainability for a risk evaluation
   */
  async generateExplainability(
    evaluation: RiskEvaluationResult,
    tenantId: string
  ): Promise<RiskExplainability> {
    try {
      void this._aiServiceClient;
      void this.getServiceToken(tenantId);
      // Generate summary
      const summary = this.generateSummary(evaluation);
      
      // Generate detailed explanation
      const detailed = this.generateDetailed(evaluation);
      
      // Generate risk breakdown
      const riskBreakdown = this.generateRiskBreakdown(evaluation.detectedRisks || []);

      const explainability: RiskExplainability = {
        evaluationId: evaluation.evaluationId,
        tenantId,
        summary,
        detailed,
        riskBreakdown,
        calculatedAt: new Date(),
      };

      return explainability;
    } catch (error: unknown) {
      log.error('Failed to generate explainability', error instanceof Error ? error : new Error(String(error)), { tenantId, evaluationId: evaluation.evaluationId });
      throw error;
    }
  }

  private generateSummary(evaluation: RiskEvaluationResult): string {
    const riskScore = evaluation.riskScore;
    const riskCount = evaluation.detectedRisks?.length || 0;
    const revenueAtRisk = evaluation.revenueAtRisk || 0;

    if (riskScore < 0.3) {
      return `Low risk (${(riskScore * 100).toFixed(0)}%) with ${riskCount} detected risks. Revenue at risk: $${revenueAtRisk.toLocaleString()}.`;
    } else if (riskScore < 0.6) {
      return `Medium risk (${(riskScore * 100).toFixed(0)}%) with ${riskCount} detected risks. Revenue at risk: $${revenueAtRisk.toLocaleString()}.`;
    } else {
      return `High risk (${(riskScore * 100).toFixed(0)}%) with ${riskCount} detected risks. Revenue at risk: $${revenueAtRisk.toLocaleString()}.`;
    }
  }

  private generateDetailed(evaluation: RiskEvaluationResult): string {
    const categoryScores = evaluation.categoryScores || {};
    const topCategories = Object.entries(categoryScores)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 3)
      .map(([cat, score]: any) => `${cat}: ${(score * 100).toFixed(0)}%`)
      .join(', ');

    return `Risk evaluation shows an overall risk score of ${(evaluation.riskScore * 100).toFixed(0)}%. ` +
      `Top risk categories: ${topCategories}. ` +
      `${evaluation.detectedRisks?.length || 0} specific risks were detected. ` +
      `Revenue at risk is estimated at $${(evaluation.revenueAtRisk || 0).toLocaleString()}.`;
  }

  private generateRiskBreakdown(risks: DetectedRisk[]): RiskBreakdown[] {
    return risks.map(risk => ({
      riskId: risk.riskId,
      riskName: risk.riskName,
      category: risk.category,
      contribution: risk.contribution || 0,
      explanation: typeof risk.explainability === 'string'
        ? risk.explainability
        : risk.explainability?.reasoning?.summary || 'No explanation available',
      evidence: risk.sourceShards || [],
    }));
  }
}
