/**
 * Project Analytics API Client
 * 
 * Client functions for fetching project analytics data
 */

import { apiClient, handleApiError } from './client';
import { ensureAuth } from './client';

/**
 * Project Health Score
 */
export interface ProjectHealthScore {
  projectId: string;
  tenantId: string;
  overallScore: number; // 0-100
  scoreBreakdown: {
    timeline: number;
    budget: number;
    milestones: number;
    activity: number;
    risk: number;
  };
  status: 'healthy' | 'at_risk' | 'critical' | 'unknown';
  factors: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    impact: number;
    recommendation?: string;
  }>;
  calculatedAt: string;
  trend?: 'improving' | 'stable' | 'declining';
  previousScore?: number;
}

/**
 * Predictive Completion
 */
export interface PredictiveCompletion {
  projectId: string;
  tenantId: string;
  predictedCompletionDate: string; // ISO date string
  confidence: number; // 0-1
  confidenceRange: {
    earliest: string;
    latest: string;
  };
  factors: Array<{
    type: string;
    weight: number;
    value: number;
    description: string;
    trend?: 'improving' | 'stable' | 'declining';
  }>;
  scenarios: Array<{
    name: string;
    completionDate: string; // ISO date string
    probability: number;
    assumptions: string[];
  }>;
  calculatedAt: string;
}

/**
 * Resource Optimization
 */
export interface ResourceOptimization {
  projectId: string;
  tenantId: string;
  recommendations: Array<{
    type: 'team' | 'budget' | 'timeline' | 'priority' | 'scope' | 'process';
    priority: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    impact: {
      healthScore?: number;
      completionDate?: number;
      cost?: number;
    };
    effort: 'low' | 'medium' | 'high';
    feasibility: 'high' | 'medium' | 'low';
    actionItems: string[];
  }>;
  currentState: {
    teamAllocation: Array<{
      userId: string;
      name: string;
      role: string;
      currentLoad: number;
      recommendedLoad: number;
      utilization: number;
      skills?: string[];
    }>;
    budgetAllocation: {
      allocated: number;
      spent: number;
      remaining: number;
      utilization: number;
      forecasted: number;
      variance: number;
    };
    timeline: {
      startDate: string | null;
      targetDate: string | null;
      predictedDate: string | null;
      buffer: number;
      criticalPath?: string[];
    };
    priority: string;
  };
  optimizedState?: {
    teamAllocation: Array<{
      userId: string;
      name: string;
      role: string;
      currentLoad: number;
      recommendedLoad: number;
      utilization: number;
    }>;
    budgetAllocation: {
      allocated: number;
      spent: number;
      remaining: number;
      utilization: number;
      forecasted: number;
      variance: number;
    };
    timeline: {
      startDate: string | null;
      targetDate: string | null;
      predictedDate: string | null;
      buffer: number;
    };
    priority: string;
  };
  potentialImprovement?: {
    healthScoreIncrease: number;
    completionDateImprovement: number;
    costSavings?: number;
  };
  calculatedAt: string;
}

/**
 * Project Analytics Summary
 */
export interface ProjectAnalyticsSummary {
  projectId: string;
  tenantId: string;
  healthScore?: ProjectHealthScore;
  predictiveCompletion?: PredictiveCompletion;
  resourceOptimization?: ResourceOptimization;
  generatedAt: string;
}

/**
 * Get comprehensive project analytics
 */
export async function getProjectAnalytics(
  projectId: string,
  options?: {
    includeHistory?: boolean;
    includePredictions?: boolean;
    includeOptimization?: boolean;
  }
): Promise<ProjectAnalyticsSummary> {
  await ensureAuth();
  try {
    const params = new URLSearchParams();
    if (options?.includeHistory !== undefined) {
      params.append('includeHistory', String(options.includeHistory));
    }
    if (options?.includePredictions !== undefined) {
      params.append('includePredictions', String(options.includePredictions));
    }
    if (options?.includeOptimization !== undefined) {
      params.append('includeOptimization', String(options.includeOptimization));
    }

    const { data } = await apiClient.get<ProjectAnalyticsSummary>(
      `/api/v1/projects/${projectId}/analytics${params.toString() ? `?${params.toString()}` : ''}`
    );
    return data;
  } catch (error) {
    const message = handleApiError(error);
    throw new Error(typeof message === 'string' ? message : message.message || 'An error occurred');
  }
}

/**
 * Get project health score
 */
export async function getProjectHealthScore(projectId: string): Promise<ProjectHealthScore> {
  await ensureAuth();
  try {
    const { data } = await apiClient.get<ProjectHealthScore>(
      `/api/v1/projects/${projectId}/analytics/health`
    );
    return data;
  } catch (error) {
    const message = handleApiError(error);
    throw new Error(typeof message === 'string' ? message : message.message || 'An error occurred');
  }
}

/**
 * Get predictive completion
 */
export async function getPredictiveCompletion(projectId: string): Promise<PredictiveCompletion> {
  await ensureAuth();
  try {
    const { data } = await apiClient.get<PredictiveCompletion>(
      `/api/v1/projects/${projectId}/analytics/completion`
    );
    return data;
  } catch (error) {
    const message = handleApiError(error);
    throw new Error(typeof message === 'string' ? message : message.message || 'An error occurred');
  }
}

/**
 * Get resource optimization
 */
export async function getResourceOptimization(projectId: string): Promise<ResourceOptimization> {
  await ensureAuth();
  try {
    const { data } = await apiClient.get<ResourceOptimization>(
      `/api/v1/projects/${projectId}/analytics/optimization`
    );
    return data;
  } catch (error) {
    const message = handleApiError(error);
    throw new Error(typeof message === 'string' ? message : message.message || 'An error occurred');
  }
}

