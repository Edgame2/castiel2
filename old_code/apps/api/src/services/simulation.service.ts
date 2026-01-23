/**
 * Simulation Service
 * Runs risk simulations with modified scenarios
 */

import { IMonitoringProvider } from '@castiel/monitoring';
import {
  ShardRepository,
  ShardTypeRepository,
  RiskEvaluationService,
  RiskCatalogService,
} from '@castiel/api-core';
import type {
  SimulationScenario,
  SimulationResults,
  RiskSimulation,
  ComparisonResult,
  DetectedRisk,
  RiskEvaluation,
} from '../types/risk-analysis.types.js';
import type { Shard } from '../types/shard.types.js';
import { CORE_SHARD_TYPE_NAMES } from '../types/core-shard-types.js';
import { v4 as uuidv4 } from 'uuid';

export class SimulationService {
  constructor(
    private monitoring: IMonitoringProvider,
    private shardRepository: ShardRepository,
    private shardTypeRepository: ShardTypeRepository,
    private riskEvaluationService: RiskEvaluationService,
    private riskCatalogService: RiskCatalogService
  ) {}

  /**
   * Run a risk simulation for an opportunity
   */
  async runSimulation(
    opportunityId: string,
    tenantId: string,
    userId: string,
    scenario: SimulationScenario
  ): Promise<RiskSimulation> {
    const startTime = Date.now();

    try {
      // Get opportunity
      const opportunity = await this.shardRepository.findById(opportunityId, tenantId);
      if (!opportunity) {
        throw new Error(`Opportunity not found: ${opportunityId}`);
      }

      // Create a modified copy of the opportunity for simulation
      const modifiedOpportunity = await this.applyModifications(
        opportunity,
        scenario.modifications,
        tenantId
      );

      // Re-evaluate risks with modifications
      // We need to temporarily evaluate with modified data
      const simulationResults = await this.evaluateWithModifications(
        modifiedOpportunity,
        scenario.modifications,
        tenantId,
        userId
      );

      // Get shard type for simulations
      const shardType = await this.shardTypeRepository.findByName(
        CORE_SHARD_TYPE_NAMES.RISK_SIMULATION,
        'system'
      );

      if (!shardType) {
        throw new Error('Risk simulation shard type not found');
      }

      // Store simulation as shard
      const simulationShard = await this.shardRepository.create({
        tenantId,
        userId,
        shardTypeId: shardType.id,
        structuredData: {
          opportunityId,
          scenarioName: scenario.scenarioName,
          modifications: scenario.modifications,
          results: simulationResults,
        },
      });

      const simulation: RiskSimulation = {
        id: simulationShard.id,
        tenantId,
        opportunityId,
        scenarioName: scenario.scenarioName,
        modifications: scenario.modifications,
        results: simulationResults,
        createdAt: simulationShard.createdAt,
        createdBy: userId,
      };

      this.monitoring.trackEvent('simulation.completed', {
        tenantId,
        opportunityId,
        scenarioName: scenario.scenarioName,
        riskScore: simulationResults.riskScore,
        revenueAtRisk: simulationResults.revenueAtRisk,
        durationMs: Date.now() - startTime,
      });

      return simulation;
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'simulation.runSimulation',
          tenantId,
          opportunityId,
          scenarioName: scenario.scenarioName,
        }
      );
      throw error;
    }
  }

  /**
   * Compare multiple scenarios
   */
  async compareScenarios(
    opportunityId: string,
    tenantId: string,
    userId: string,
    scenarios: SimulationScenario[]
  ): Promise<ComparisonResult> {
    const startTime = Date.now();

    try {
      // Run all simulations
      const simulationResults = await Promise.all(
        scenarios.map(scenario =>
          this.runSimulation(opportunityId, tenantId, userId, scenario)
        )
      );

      // Extract results for comparison
      const scenarioResults = simulationResults.map(sim => ({
        scenarioName: sim.scenarioName,
        results: sim.results,
      }));

      // Generate recommendations based on comparison
      const recommendations = this.generateRecommendations(scenarioResults);

      const comparison: ComparisonResult = {
        scenarios: scenarioResults,
        recommendations,
      };

      this.monitoring.trackEvent('simulation.comparison-completed', {
        tenantId,
        opportunityId,
        scenarioCount: scenarios.length,
        durationMs: Date.now() - startTime,
      });

      return comparison;
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'simulation.compareScenarios',
          tenantId,
          opportunityId,
        }
      );
      throw error;
    }
  }

  /**
   * Get a simulation by ID
   */
  async getSimulation(
    simulationId: string,
    tenantId: string
  ): Promise<RiskSimulation | null> {
    try {
      // Get simulation shard
      const simulationShard = await this.shardRepository.findById(simulationId, tenantId);
      if (!simulationShard) {
        return null;
      }

      // Verify it's a simulation shard
      const shardType = await this.shardTypeRepository.findById(simulationShard.shardTypeId, tenantId);
      if (shardType?.name !== CORE_SHARD_TYPE_NAMES.RISK_SIMULATION) {
        return null;
      }

      // Convert shard to RiskSimulation
      const data = simulationShard.structuredData as any;
      const simulation: RiskSimulation = {
        id: simulationShard.id,
        tenantId: simulationShard.tenantId,
        opportunityId: data.opportunityId,
        scenarioName: data.scenarioName,
        modifications: data.modifications,
        results: data.results,
        createdAt: simulationShard.createdAt,
        createdBy: simulationShard.userId,
      };

      return simulation;
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'simulation.getSimulation',
          tenantId,
          simulationId,
        }
      );
      throw error;
    }
  }

  /**
   * List all simulations for an opportunity
   */
  async listSimulations(
    opportunityId: string,
    tenantId: string
  ): Promise<RiskSimulation[]> {
    try {
      // Get shard type for simulations
      const shardType = await this.shardTypeRepository.findByName(
        CORE_SHARD_TYPE_NAMES.RISK_SIMULATION,
        'system'
      );

      if (!shardType) {
        // If simulation shard type doesn't exist, return empty array
        return [];
      }

      // Query all simulation shards for this opportunity
      const simulationsResult = await this.shardRepository.list({
        filter: {
          tenantId,
          shardTypeId: shardType.id,
        },
        limit: 1000,
      });

      // Filter by opportunityId in structuredData and convert to RiskSimulation
      const simulations: RiskSimulation[] = simulationsResult.shards
        .filter(shard => {
          const data = shard.structuredData as any;
          return data?.opportunityId === opportunityId;
        })
        .map(shard => {
          const data = shard.structuredData as any;
          return {
            id: shard.id,
            tenantId: shard.tenantId,
            opportunityId: data.opportunityId,
            scenarioName: data.scenarioName || 'Unnamed Scenario',
            modifications: data.modifications || {},
            results: data.results,
            createdAt: shard.createdAt,
            createdBy: shard.userId,
          };
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Sort by newest first

      return simulations;
    } catch (error: unknown) {
      this.monitoring.trackException(
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'simulation.listSimulations',
          tenantId,
          opportunityId,
        }
      );
      throw error;
    }
  }

  /**
   * Apply modifications to opportunity data
   */
  private async applyModifications(
    opportunity: Shard,
    modifications: SimulationScenario['modifications'],
    tenantId: string
  ): Promise<Shard> {
    const data = { ...opportunity.structuredData } as any;

    // Apply deal parameter modifications
    if (modifications.dealParameters) {
      if (modifications.dealParameters.value !== undefined) {
        data.value = modifications.dealParameters.value;
      }
      if (modifications.dealParameters.probability !== undefined) {
        data.probability = modifications.dealParameters.probability;
      }
      if (modifications.dealParameters.closeDate !== undefined) {
        data.expectedCloseDate = modifications.dealParameters.closeDate;
        data.closeDate = modifications.dealParameters.closeDate;
      }
    }

    return {
      ...opportunity,
      structuredData: data,
    };
  }

  /**
   * Evaluate opportunity with modifications applied
   */
  private async evaluateWithModifications(
    modifiedOpportunity: Shard,
    modifications: SimulationScenario['modifications'],
    tenantId: string,
    userId: string
  ): Promise<SimulationResults> {
    // Get current risk evaluation
    const currentData = modifiedOpportunity.structuredData as any;
    let riskEvaluation: RiskEvaluation | undefined = currentData.riskEvaluation;

    // If no evaluation exists, evaluate now
    if (!riskEvaluation) {
      riskEvaluation = await this.riskEvaluationService.evaluateOpportunity(
        modifiedOpportunity.id,
        tenantId,
        userId,
        { includeHistorical: true, includeAI: false }
      );
    }

    // Apply risk modifications
    let modifiedRisks = [...riskEvaluation.risks];

    if (modifications.risks) {
      for (const riskMod of modifications.risks) {
        if (riskMod.action === 'add') {
          // Add new risk
          const riskCatalog = await this.riskCatalogService.getCatalog(tenantId);
          const riskDef = riskCatalog.find(c => c.riskId === riskMod.riskId);
          if (riskDef) {
            const ponderation = riskMod.ponderation || riskDef.defaultPonderation;
            modifiedRisks.push({
              riskId: riskDef.riskId,
              riskName: riskDef.name,
              category: riskDef.category,
              ponderation,
              confidence: 0.7, // Default confidence for added risks
              contribution: ponderation * 0.7,
              explainability: `Simulated risk: ${riskDef.description}`,
              sourceShards: [],
              lifecycleState: 'identified',
            });
          }
        } else if (riskMod.action === 'remove') {
          // Remove risk
          modifiedRisks = modifiedRisks.filter(r => r.riskId !== riskMod.riskId);
        } else if (riskMod.action === 'modify') {
          // Modify risk ponderation
          const risk = modifiedRisks.find(r => r.riskId === riskMod.riskId);
          if (risk && riskMod.ponderation !== undefined) {
            risk.ponderation = riskMod.ponderation;
            risk.contribution = risk.ponderation * risk.confidence;
          }
        }
      }
    }

    // Apply weight overrides
    if (modifications.weights) {
      for (const risk of modifiedRisks) {
        if (modifications.weights[risk.riskId] !== undefined) {
          risk.ponderation = modifications.weights[risk.riskId];
          risk.contribution = risk.ponderation * risk.confidence;
        }
      }
    }

    // Recalculate risk score with modified risks (returns { globalScore, categoryScores })
    const { globalScore: riskScore } = await this.riskEvaluationService.calculateRiskScore(
      modifiedRisks,
      tenantId,
      modifiedOpportunity
    );

    // Calculate revenue at risk
    const dealValue = currentData.value || 0;
    const probability = (currentData.probability || 50) / 100;
    const revenueAtRisk = dealValue * probability * riskScore;

    // Get expected close date
    const expectedCloseDate = new Date(
      currentData.expectedCloseDate || currentData.closeDate || new Date()
    );

    // Calculate forecast scenarios
    const riskAdjustedValue = dealValue - revenueAtRisk;
    const forecastScenarios = {
      bestCase: dealValue * probability, // Full value at current probability
      baseCase: riskAdjustedValue * probability, // Risk-adjusted value
      worstCase: riskAdjustedValue * probability * 0.5, // Pessimistic scenario
    };

    return {
      riskScore,
      revenueAtRisk,
      expectedCloseDate,
      forecastScenarios,
    };
  }

  /**
   * Generate recommendations based on scenario comparison
   */
  private generateRecommendations(
    scenarioResults: Array<{ scenarioName: string; results: SimulationResults }>
  ): string[] {
    const recommendations: string[] = [];

    if (scenarioResults.length === 0) {
      return recommendations;
    }

    // Find best and worst scenarios
    const sortedByRisk = [...scenarioResults].sort(
      (a, b) => a.results.riskScore - b.results.riskScore
    );
    const bestScenario = sortedByRisk[0];
    const worstScenario = sortedByRisk[sortedByRisk.length - 1];

    // Find scenario with best revenue forecast
    const sortedByRevenue = [...scenarioResults].sort(
      (a, b) => b.results.forecastScenarios.baseCase - a.results.forecastScenarios.baseCase
    );
    const bestRevenueScenario = sortedByRevenue[0];

    // Generate recommendations
    if (bestScenario.results.riskScore < 0.3) {
      recommendations.push(
        `"${bestScenario.scenarioName}" has the lowest risk score (${(bestScenario.results.riskScore * 100).toFixed(1)}%). Consider implementing the modifications from this scenario.`
      );
    }

    if (bestRevenueScenario.results.forecastScenarios.baseCase > 0) {
      recommendations.push(
        `"${bestRevenueScenario.scenarioName}" shows the best revenue forecast (${bestRevenueScenario.results.forecastScenarios.baseCase.toLocaleString()}). This scenario may optimize deal value.`
      );
    }

    if (worstScenario.results.riskScore > 0.7) {
      recommendations.push(
        `Warning: "${worstScenario.scenarioName}" has a high risk score (${(worstScenario.results.riskScore * 100).toFixed(1)}%). Avoid modifications that lead to this scenario.`
      );
    }

    // Compare risk reduction
    if (scenarioResults.length > 1) {
      const riskReduction = worstScenario.results.riskScore - bestScenario.results.riskScore;
      if (riskReduction > 0.2) {
        recommendations.push(
          `Risk reduction potential: ${(riskReduction * 100).toFixed(1)}% between best and worst scenarios. Significant opportunity for risk mitigation.`
        );
      }
    }

    return recommendations;
  }
}


