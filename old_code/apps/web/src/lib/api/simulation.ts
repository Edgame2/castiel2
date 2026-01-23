/**
 * Simulation API Client
 * API client for risk simulation and scenario analysis
 */

import apiClient from './client';
import type {
  RiskSimulation,
  SimulationScenario,
  SimulationResults,
  ComparisonResult,
} from '@/types/risk-analysis';

/**
 * Simulation API endpoints
 */
export const simulationApi = {
  /**
   * Run simulation for opportunity
   */
  runSimulation: async (
    opportunityId: string,
    scenario: SimulationScenario
  ): Promise<SimulationResults> => {
    const response = await apiClient.post<SimulationResults>(
      `/api/v1/simulations/opportunities/${opportunityId}/run`,
      scenario
    );
    return response.data;
  },

  /**
   * Compare multiple scenarios
   */
  compareScenarios: async (
    opportunityId: string,
    scenarios: SimulationScenario[]
  ): Promise<ComparisonResult> => {
    const response = await apiClient.post<ComparisonResult>(
      `/api/v1/simulations/opportunities/${opportunityId}/compare`,
      { scenarios }
    );
    return response.data;
  },

  /**
   * Get simulation by ID
   */
  getSimulation: async (simulationId: string): Promise<RiskSimulation> => {
    const response = await apiClient.get<RiskSimulation>(`/api/v1/simulations/${simulationId}`);
    return response.data;
  },

  /**
   * List simulations for opportunity
   */
  listSimulations: async (opportunityId: string): Promise<RiskSimulation[]> => {
    const response = await apiClient.get<RiskSimulation[]>(
      `/api/v1/simulations/opportunities/${opportunityId}`
    );
    return response.data;
  },
};


