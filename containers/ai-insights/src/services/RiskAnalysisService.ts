/**
 * Risk Analysis Service
 * Handles risk analysis and evaluation
 */

import { v4 as uuidv4 } from 'uuid';
import { getContainer } from '@coder/shared/database';
import { BadRequestError, NotFoundError } from '@coder/shared/utils/errors';
import { RiskAnalysis, CreateRiskAnalysisInput, RiskLevel } from '../types/insight.types';

export class RiskAnalysisService {
  private containerName = 'ai_risk_analysis';

  /**
   * Calculate risk score from factors
   */
  private calculateRiskScore(factors: RiskAnalysis['riskFactors']): number {
    if (factors.length === 0) return 0;

    const severityWeights: Record<RiskLevel, number> = {
      [RiskLevel.LOW]: 1,
      [RiskLevel.MEDIUM]: 3,
      [RiskLevel.HIGH]: 7,
      [RiskLevel.CRITICAL]: 10,
    };

    const totalWeight = factors.reduce(
      (sum, factor) => sum + (severityWeights[factor.severity] || 0),
      0
    );
    const maxPossibleWeight = factors.length * 10;
    return Math.min(100, Math.round((totalWeight / maxPossibleWeight) * 100));
  }

  /**
   * Determine risk level from score
   */
  private determineRiskLevel(score: number): RiskLevel {
    if (score >= 75) return RiskLevel.CRITICAL;
    if (score >= 50) return RiskLevel.HIGH;
    if (score >= 25) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  /**
   * Create a new risk analysis
   */
  async create(input: CreateRiskAnalysisInput): Promise<RiskAnalysis> {
    if (!input.tenantId) {
      throw new BadRequestError('tenantId is required');
    }
    if (!input.shardId) {
      throw new BadRequestError('shardId is required');
    }
    if (!input.riskFactors || input.riskFactors.length === 0) {
      throw new BadRequestError('riskFactors are required');
    }

    const riskScore = this.calculateRiskScore(input.riskFactors);
    const riskLevel = this.determineRiskLevel(riskScore);

    const analysis: RiskAnalysis = {
      id: uuidv4(),
      tenantId: input.tenantId,
      shardId: input.shardId,
      shardName: input.shardName,
      shardTypeId: input.shardTypeId,
      riskLevel,
      riskScore,
      riskFactors: input.riskFactors,
      revenueAtRisk: input.revenueAtRisk,
      probability: input.probability || 50,
      impact: input.impact || 50,
      mitigationStrategies: input.mitigationStrategies || [],
      earlyWarningIndicators: input.earlyWarningIndicators || [],
      metadata: input.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: input.userId,
    };

    try {
      const container = getContainer(this.containerName) as any;
      const { resource } = await container.items.create(analysis, {
        partitionKey: input.tenantId,
      } as any);

      if (!resource) {
        throw new Error('Failed to create risk analysis');
      }

      return resource as RiskAnalysis;
    } catch (error: any) {
      if (error.code === 409) {
        throw new BadRequestError('Risk analysis with this ID already exists');
      }
      throw error;
    }
  }

  /**
   * Get risk analysis by ID
   */
  async getById(analysisId: string, tenantId: string): Promise<RiskAnalysis> {
    if (!analysisId || !tenantId) {
      throw new BadRequestError('analysisId and tenantId are required');
    }

    try {
      const container = getContainer(this.containerName) as any;
      const item = container.item(analysisId, tenantId);
      const result = (await (item as any).read()) as any;
      const resource = (result as any).resource as RiskAnalysis | undefined;

      if (!resource) {
        throw new NotFoundError('Risk analysis', analysisId);
      }

      return resource;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error.code === 404) {
        throw new NotFoundError('Risk analysis', analysisId);
      }
      throw error;
    }
  }

  /**
   * Update risk analysis
   */
  async update(
    analysisId: string,
    tenantId: string,
    input: {
      riskFactors?: RiskAnalysis['riskFactors'];
      revenueAtRisk?: number;
      probability?: number;
      impact?: number;
      mitigationStrategies?: RiskAnalysis['mitigationStrategies'];
      earlyWarningIndicators?: RiskAnalysis['earlyWarningIndicators'];
      metadata?: Record<string, any>;
    }
  ): Promise<RiskAnalysis> {
    const existing = await this.getById(analysisId, tenantId);

    const riskFactors = input.riskFactors || existing.riskFactors;
    const riskScore = this.calculateRiskScore(riskFactors);
    const riskLevel = this.determineRiskLevel(riskScore);

    const updated: RiskAnalysis = {
      ...existing,
      ...input,
      riskFactors,
      riskScore,
      riskLevel,
      updatedAt: new Date(),
    };

    try {
      const container = getContainer(this.containerName) as any;
      const item = container.item(analysisId, tenantId);
      const result = (await (item as any).replace(updated)) as any;
      const resource = (result as any).resource as RiskAnalysis | undefined;

      if (!resource) {
        throw new Error('Failed to update risk analysis');
      }

      return resource as RiskAnalysis;
    } catch (error: any) {
      if (error.code === 404) {
        throw new NotFoundError('Risk analysis', analysisId);
      }
      throw error;
    }
  }

  /**
   * Delete risk analysis
   */
  async delete(analysisId: string, tenantId: string): Promise<void> {
    await this.getById(analysisId, tenantId);

    const container = getContainer(this.containerName) as any;
    await (container.item(analysisId, tenantId) as any).delete();
  }

  /**
   * List risk analyses
   */
  async list(
    tenantId: string,
    filters?: {
      shardId?: string;
      shardTypeId?: string;
      riskLevel?: RiskLevel;
      limit?: number;
    }
  ): Promise<RiskAnalysis[]> {
    if (!tenantId) {
      throw new BadRequestError('tenantId is required');
    }

    const container = getContainer(this.containerName) as any;
    let query = 'SELECT * FROM c WHERE c.tenantId = @tenantId';
    const parameters: any[] = [{ name: '@tenantId', value: tenantId }];

    if (filters?.shardId) {
      query += ' AND c.shardId = @shardId';
      parameters.push({ name: '@shardId', value: filters.shardId });
    }

    if (filters?.shardTypeId) {
      query += ' AND c.shardTypeId = @shardTypeId';
      parameters.push({ name: '@shardTypeId', value: filters.shardTypeId });
    }

    if (filters?.riskLevel) {
      query += ' AND c.riskLevel = @riskLevel';
      parameters.push({ name: '@riskLevel', value: filters.riskLevel });
    }

    query += ' ORDER BY c.riskScore DESC, c.createdAt DESC';

    const limit = filters?.limit || 100;

    try {
      const { resources } = await (container.items
        .query({
          query,
          parameters,
        }) as any).fetchNext();

      return resources.slice(0, limit);
    } catch (error: any) {
      throw new Error(`Failed to list risk analyses: ${error.message}`);
    }
  }
}

