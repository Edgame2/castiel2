/**
 * Simulation Service
 * Runs risk simulations with modified scenarios
 */

import { ServiceClient, generateServiceToken } from '@coder/shared';
import { getContainer } from '@coder/shared/database';
import { FastifyInstance } from 'fastify';
import { loadConfig } from '../config/index.js';
import { log } from '../utils/logger.js';
import { RiskEvaluationService } from './RiskEvaluationService.js';
import { publishRiskAnalyticsEvent } from '../events/publishers/RiskAnalyticsEventPublisher.js';
import { v4 as uuidv4 } from 'uuid';

export interface SimulationModifications {
  risks?: Array<{
    riskId: string;
    enabled?: boolean;
    ponderation?: number;
  }>;
  opportunityData?: Record<string, any>;
}

export interface SimulationScenario {
  scenarioName: string;
  modifications: SimulationModifications;
}

export interface SimulationResults {
  riskScore: number;
  revenueAtRisk: number;
  detectedRisks: any[];
  categoryScores: Record<string, number>;
}

export interface RiskSimulation {
  id: string;
  tenantId: string;
  opportunityId: string;
  scenarioName: string;
  modifications: SimulationModifications;
  results: SimulationResults;
  createdAt: Date | string;
  createdBy: string;
}

export class SimulationService {
  private config: ReturnType<typeof loadConfig>;
  private shardManagerClient: ServiceClient;
  private riskEvaluationService: RiskEvaluationService;
  private app: FastifyInstance | null = null;

  constructor(app?: FastifyInstance, riskEvaluationService?: RiskEvaluationService) {
    this.app = app || null;
    this.config = loadConfig();
    
    this.shardManagerClient = new ServiceClient({
      baseURL: this.config.services.shard_manager?.url || '',
      timeout: 30000,
      retries: 3,
      circuitBreaker: { enabled: true },
    });

    this.riskEvaluationService = riskEvaluationService || new RiskEvaluationService(app);
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
   * Run a risk simulation for an opportunity
   */
  async runSimulation(
    opportunityId: string,
    tenantId: string,
    userId: string,
    scenario: SimulationScenario
  ): Promise<RiskSimulation> {
    try {
      const token = this.getServiceToken(tenantId);
      const opportunity = await this.shardManagerClient.get<any>(
        `/api/v1/shards/${opportunityId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId,
          },
        }
      );

      if (!opportunity) {
        throw new Error(`Opportunity not found: ${opportunityId}`);
      }

      // Apply modifications to opportunity data
      const modifiedData = {
        ...opportunity.structuredData,
        ...scenario.modifications.opportunityData,
      };
      void modifiedData;

      // Evaluate with modifications (full impl would pass modifiedData to evaluation)
      // Note: This is a simplified simulation - full implementation would
      // need to temporarily modify risk catalog weights
      const evaluation = await this.riskEvaluationService.evaluateRisk({
        opportunityId,
        tenantId,
        userId,
        trigger: 'manual',
        options: {
          includeHistorical: true,
          includeAI: true,
        },
      });

      const results: SimulationResults = {
        riskScore: evaluation.riskScore,
        revenueAtRisk: evaluation.revenueAtRisk || 0,
        detectedRisks: evaluation.detectedRisks || [],
        categoryScores: evaluation.categoryScores || {},
      };

      const simulation: RiskSimulation = {
        id: uuidv4(),
        tenantId,
        opportunityId,
        scenarioName: scenario.scenarioName,
        modifications: scenario.modifications,
        results,
        createdAt: new Date(),
        createdBy: userId,
      };

      // Store simulation
      const container = getContainer('risk_simulations');
      await container.items.create(
        { ...simulation, id: simulation.id, tenantId },
        { partitionKey: tenantId } as Parameters<typeof container.items.create>[1]
      );

      await publishRiskAnalyticsEvent('risk.simulation.completed', tenantId, {
        opportunityId,
        simulationId: simulation.id,
        scenarioName: scenario.scenarioName,
      });

      return simulation;
    } catch (error: unknown) {
      log.error('Failed to run simulation', error instanceof Error ? error : new Error(String(error)), { tenantId, opportunityId });
      throw error;
    }
  }

  /**
   * Get simulations for an opportunity
   */
  async getSimulations(
    opportunityId: string,
    tenantId: string
  ): Promise<RiskSimulation[]> {
    try {
      const container = getContainer('risk_simulations');
      const { resources } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.opportunityId = @opportunityId AND c.tenantId = @tenantId ORDER BY c.createdAt DESC',
          parameters: [
            { name: '@opportunityId', value: opportunityId },
            { name: '@tenantId', value: tenantId },
          ],
        })
        .fetchNext();
      return resources || [];
    } catch (error: unknown) {
      log.error('Failed to get simulations', error instanceof Error ? error : new Error(String(error)), { tenantId, opportunityId });
      throw error;
    }
  }

  /**
   * Compare simulation results
   */
  async compareSimulations(
    simulationIds: string[],
    tenantId: string
  ): Promise<any> {
    try {
      const container = getContainer('risk_simulations');
      const simulations: RiskSimulation[] = [];

      for (const simId of simulationIds) {
        const { resource } = await container.item(simId, tenantId).read();
        if (resource) {
          simulations.push(resource);
        }
      }

      return {
        simulations,
        comparison: {
          riskScores: simulations.map(s => s.results.riskScore),
          revenueAtRisk: simulations.map(s => s.results.revenueAtRisk),
        },
      };
    } catch (error: unknown) {
      log.error('Failed to compare simulations', error instanceof Error ? error : new Error(String(error)), { tenantId });
      throw error;
    }
  }
}
