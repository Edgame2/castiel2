/**
 * Risk AI Validation Service
 * Validates AI-generated risk evaluations
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config/index.js';
import { log } from '../utils/logger.js';
import { RiskEvaluationResult } from '../types/risk-analytics.types';

export interface AIValidationResult {
  evaluationId: string;
  tenantId: string;
  isValid: boolean;
  confidence: number;
  issues: ValidationIssue[];
  validatedAt: Date | string;
}

export interface ValidationIssue {
  type: 'hallucination' | 'contradiction' | 'insufficient_evidence' | 'bias';
  severity: 'low' | 'medium' | 'high';
  message: string;
  evidence?: any;
}

export class RiskAIValidationService {
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
   * Validate an AI-generated risk evaluation
   */
  async validateEvaluation(
    evaluation: RiskEvaluationResult,
    tenantId: string
  ): Promise<AIValidationResult> {
    try {
      void this._aiServiceClient;
      void this.getServiceToken(tenantId);
      const issues: ValidationIssue[] = [];
      let isValid = true;
      let confidence = 1.0;

      // Check for sufficient evidence
      if (!evaluation.detectedRisks || evaluation.detectedRisks.length === 0) {
        if (evaluation.riskScore > 0.5) {
          issues.push({
            type: 'insufficient_evidence',
            severity: 'high',
            message: 'High risk score but no detected risks',
          });
          isValid = false;
          confidence = 0.5;
        }
      }

      // Check for contradictions
      const categoryScores = evaluation.categoryScores || {};
      const hasHighScores = Object.values(categoryScores).some((score: any) => score > 0.7);
      const hasLowScores = Object.values(categoryScores).some((score: any) => score < 0.3);
      
      if (hasHighScores && hasLowScores && evaluation.riskScore < 0.4) {
        issues.push({
          type: 'contradiction',
          severity: 'medium',
          message: 'Contradiction between category scores and overall risk score',
        });
        confidence = 0.7;
      }

      // Check for bias (simplified)
      if (evaluation.detectedRisks) {
        const riskCategories = evaluation.detectedRisks.map((r: any) => r.category);
        const categoryCounts = riskCategories.reduce((acc: any, cat: string) => {
          acc[cat] = (acc[cat] || 0) + 1;
          return acc;
        }, {});
        
        const maxCount = Math.max(...Object.values(categoryCounts) as number[]);
        if (maxCount > riskCategories.length * 0.6) {
          issues.push({
            type: 'bias',
            severity: 'low',
            message: 'Potential bias towards a single risk category',
          });
        }
      }

      const result: AIValidationResult = {
        evaluationId: evaluation.evaluationId,
        tenantId,
        isValid,
        confidence,
        issues,
        validatedAt: new Date(),
      };

      return result;
    } catch (error: unknown) {
      log.error('Failed to validate AI evaluation', error instanceof Error ? error : new Error(String(error)), { tenantId, evaluationId: evaluation.evaluationId });
      throw error;
    }
  }
}
