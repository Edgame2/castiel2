/**
 * Simulation Hooks
 * React Query hooks for risk simulation and scenario analysis
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { simulationApi } from '@/lib/api/simulation';
import type {
  RiskSimulation,
  SimulationScenario,
  SimulationResults,
  ComparisonResult,
} from '@/types/risk-analysis';

/**
 * Query keys for simulations
 */
export const simulationKeys = {
  all: ['simulations'] as const,
  list: (opportunityId: string) => [...simulationKeys.all, 'list', opportunityId] as const,
  detail: (simulationId: string) => [...simulationKeys.all, 'detail', simulationId] as const,
};

/**
 * Hook to list simulations for opportunity
 */
export function useSimulations(opportunityId: string, enabled = true) {
  return useQuery({
    queryKey: simulationKeys.list(opportunityId),
    queryFn: () => simulationApi.listSimulations(opportunityId),
    enabled: enabled && !!opportunityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get simulation by ID
 */
export function useSimulation(simulationId: string, enabled = true) {
  return useQuery({
    queryKey: simulationKeys.detail(simulationId),
    queryFn: () => simulationApi.getSimulation(simulationId),
    enabled: enabled && !!simulationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Mutation to run simulation
 */
export function useRunSimulation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      opportunityId,
      scenario,
    }: {
      opportunityId: string;
      scenario: SimulationScenario;
    }) => simulationApi.runSimulation(opportunityId, scenario),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: simulationKeys.list(variables.opportunityId),
      });
    },
  });
}

/**
 * Mutation to compare scenarios
 */
export function useCompareScenarios() {
  return useMutation({
    mutationFn: ({
      opportunityId,
      scenarios,
    }: {
      opportunityId: string;
      scenarios: SimulationScenario[];
    }) => simulationApi.compareScenarios(opportunityId, scenarios),
  });
}


